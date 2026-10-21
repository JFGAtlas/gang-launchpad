// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {LaunchToken} from "./LaunchToken.sol";
import {VoucherVerifier} from "./VoucherVerifier.sol";
import {IMigrator} from "./interfaces/IMigrator.sol";

/// @title Gang Launchpad
/// @notice Agent-only bonding curve on BNB Chain. Buys require an EIP-712 voucher issued to Binance Agentic
///         Wallets; sells are open. 1% fee on both sides goes to the platform vault. At 20 BNB raised the
///         remaining supply and all BNB migrate to PancakeSwap V2 with LP burned, and the platform exits.
contract Launchpad is Ownable2Step, ReentrancyGuard, VoucherVerifier {
    using SafeERC20 for IERC20;
    using SafeCast for uint256;

    // ---------------------------------------------------------------- constants
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 ether;
    uint256 public constant CURVE_SUPPLY = 800_000_000 ether;
    uint256 public constant GRADUATION_BNB = 20 ether;
    /// @dev 20/3 BNB, rounded up to the wei.
    uint256 public constant VIRTUAL_BNB = 6_666_666_666_666_666_667;
    /// @dev 16e9/15 tokens, rounded up to the smallest unit.
    uint256 public constant VIRTUAL_TOKEN = 1_066_666_666_666_666_666_666_666_667;
    uint256 public constant K = VIRTUAL_BNB * VIRTUAL_TOKEN;
    /// @dev Per-wallet cap on curve holdings: 1% of total supply. Excess BNB is refunded.
    uint256 public constant MAX_PER_WALLET = 10_000_000 ether;
    uint256 public constant FEE_BPS = 100;
    uint256 public constant BPS = 10_000;

    // ---------------------------------------------------------------- storage
    struct Curve {
        address creator;
        uint128 realBnb; // BNB held for this token (excludes fees)
        uint128 sold; // tokens sold out of CURVE_SUPPLY
        bool graduated;
        address pair;
    }

    mapping(address token => Curve) public curves;
    address[] public allTokens;

    address public feeVault;
    IMigrator public migrator;
    /// @notice SPACE ID "Agent ID" soulbound ERC-721 (.ai names), mintable only from a Binance Agentic Wallet.
    ///         Holding one is the on-chain proof of being an agent. address(0) disables this path.
    IERC721 public agentIdRegistry;
    uint256 public accruedFees;

    // ---------------------------------------------------------------- events
    event Created(address indexed token, address indexed creator, string name, string symbol);
    event Buy(
        address indexed token, address indexed buyer, uint256 bnbIn, uint256 fee, uint256 tokensOut, uint256 realBnb
    );
    event Sell(
        address indexed token, address indexed seller, uint256 tokensIn, uint256 fee, uint256 bnbOut, uint256 realBnb
    );
    event Graduated(address indexed token, address indexed pair, uint256 tokenAmount, uint256 bnbAmount);
    event FeesCollected(address indexed vault, uint256 amount);
    event FeeVaultUpdated(address indexed vault);
    event MigratorUpdated(address indexed migrator);
    event AgentIdRegistryUpdated(address indexed registry);

    // ---------------------------------------------------------------- errors
    error UnknownToken();
    error AlreadyGraduated();
    error ZeroAmount();
    error Slippage();
    error RefundFailed();
    error PayoutFailed();
    error MigratorNotSet();
    error ZeroAddress();
    error NotAgent();
    error WalletCapReached();

    constructor(address owner_, address voucherSigner_, address feeVault_, address agentIdRegistry_)
        Ownable(owner_)
        VoucherVerifier(voucherSigner_)
    {
        if (feeVault_ == address(0)) revert ZeroAddress();
        feeVault = feeVault_;
        agentIdRegistry = IERC721(agentIdRegistry_);
        emit FeeVaultUpdated(feeVault_);
        emit AgentIdRegistryUpdated(agentIdRegistry_);
    }

    // ---------------------------------------------------------------- create
    /// @notice Deploys a new LaunchToken and opens its bonding curve. No creation fee.
    function create(string calldata name, string calldata symbol) external returns (address token) {
        token = address(new LaunchToken(name, symbol));
        curves[token] = Curve({creator: msg.sender, realBnb: 0, sold: 0, graduated: false, pair: address(0)});
        allTokens.push(token);
        emit Created(token, msg.sender, name, symbol);
    }

    // ---------------------------------------------------------------- buy
    /// @notice Buy on the curve. Gate: either msg.sender holds an Agent ID (.ai) NFT and passes an empty
    ///         `sig`, or presents a backend-signed voucher. Each wallet may hold at most MAX_PER_WALLET
    ///         (1% of supply) from the curve. BNB beyond the wallet cap or past graduation is refunded; the
    ///         buy that reaches 20 BNB triggers migration in the same tx.
    function buy(address token, uint256 minTokensOut, uint256 nonce, uint256 deadline, bytes calldata sig)
        external
        payable
        nonReentrant
        returns (uint256 tokensOut)
    {
        Curve storage c = _live(token);
        if (msg.value == 0) revert ZeroAmount();
        if (sig.length == 0) {
            if (!isAgent(msg.sender)) revert NotAgent();
        } else {
            _consumeVoucher(msg.sender, token, nonce, deadline, sig);
        }

        uint256 room = walletRoom(token, msg.sender);
        if (room == 0) revert WalletCapReached();

        uint256 fee;
        uint256 bnbIn;
        uint256 refund;
        (tokensOut, bnbIn, fee, refund) = _quote(c, msg.value, room);
        if (tokensOut < minTokensOut) revert Slippage();

        c.realBnb += bnbIn.toUint128();
        c.sold += tokensOut.toUint128();
        accruedFees += fee;

        IERC20(token).safeTransfer(msg.sender, tokensOut);
        emit Buy(token, msg.sender, bnbIn, fee, tokensOut, c.realBnb);

        if (refund > 0) {
            (bool ok,) = msg.sender.call{value: refund}("");
            if (!ok) revert RefundFailed();
        }

        if (c.realBnb == GRADUATION_BNB) _graduate(token, c);
    }

    // ---------------------------------------------------------------- sell
    /// @notice Sell on the curve. No voucher required.
    function sell(address token, uint256 tokensIn, uint256 minBnbOut)
        external
        nonReentrant
        returns (uint256 bnbToUser)
    {
        Curve storage c = _live(token);
        if (tokensIn == 0) revert ZeroAmount();

        uint256 bnbOut = _bnbOut(c, tokensIn);
        uint256 fee = (bnbOut * FEE_BPS) / BPS;
        bnbToUser = bnbOut - fee;
        if (bnbToUser < minBnbOut) revert Slippage();

        c.realBnb -= bnbOut.toUint128();
        c.sold -= tokensIn.toUint128();
        accruedFees += fee;

        IERC20(token).safeTransferFrom(msg.sender, address(this), tokensIn);
        (bool ok,) = msg.sender.call{value: bnbToUser}("");
        if (!ok) revert PayoutFailed();
        emit Sell(token, msg.sender, tokensIn, fee, bnbToUser, c.realBnb);
    }

    // ---------------------------------------------------------------- graduation
    function _graduate(address token, Curve storage c) internal {
        if (address(migrator) == address(0)) revert MigratorNotSet();
        c.graduated = true;

        LaunchToken(token).unlock();
        uint256 tokenAmount = IERC20(token).balanceOf(address(this)); // CURVE_SUPPLY - sold + LP share
        uint256 bnbAmount = c.realBnb;
        c.realBnb = 0;

        IERC20(token).safeTransfer(address(migrator), tokenAmount);
        address pair = migrator.migrate{value: bnbAmount}(token, tokenAmount);
        c.pair = pair;
        emit Graduated(token, pair, tokenAmount, bnbAmount);
    }

    // ---------------------------------------------------------------- quotes
    /// @notice Quote a buy for `buyer` sending `bnbGross` wei. Accounts for fee, graduation cap and wallet cap.
    function quoteBuy(address token, address buyer, uint256 bnbGross)
        external
        view
        returns (uint256 tokensOut, uint256 bnbIn, uint256 fee, uint256 refund)
    {
        Curve storage c = curves[token];
        uint256 room = walletRoom(token, buyer);
        if (room == 0) return (0, 0, 0, bnbGross);
        return _quote(c, bnbGross, room);
    }

    /// @notice How many more tokens `buyer` may still buy from the curve (wallet cap minus current balance).
    function walletRoom(address token, address buyer) public view returns (uint256) {
        uint256 bal = IERC20(token).balanceOf(buyer);
        return bal >= MAX_PER_WALLET ? 0 : MAX_PER_WALLET - bal;
    }

    function quoteSell(address token, uint256 tokensIn) external view returns (uint256 bnbToUser, uint256 fee) {
        Curve storage c = curves[token];
        uint256 bnbOut = _bnbOut(c, tokensIn);
        fee = (bnbOut * FEE_BPS) / BPS;
        bnbToUser = bnbOut - fee;
    }

    /// @notice Spot price in wei per whole token (1e18 units).
    function spotPrice(address token) external view returns (uint256) {
        Curve storage c = curves[token];
        return ((VIRTUAL_BNB + c.realBnb) * 1 ether) / (VIRTUAL_TOKEN - c.sold);
    }

    /// @notice True if `account` holds an Agent ID NFT (on-chain proof of a Binance Agentic Wallet).
    function isAgent(address account) public view returns (bool) {
        return address(agentIdRegistry) != address(0) && agentIdRegistry.balanceOf(account) > 0;
    }

    function tokenCount() external view returns (uint256) {
        return allTokens.length;
    }

    /// @dev Applies, in order: 1% fee, graduation cap on BNB, wallet cap on tokens. When a cap binds, the
    ///      BNB actually spent shrinks, the fee is recomputed on it, and the rest is refunded.
    function _quote(Curve storage c, uint256 bnbGross, uint256 room)
        internal
        view
        returns (uint256 tokensOut, uint256 bnbIn, uint256 fee, uint256 refund)
    {
        fee = (bnbGross * FEE_BPS) / BPS;
        bnbIn = bnbGross - fee;
        bool capped;

        uint256 remaining = GRADUATION_BNB - c.realBnb;
        if (bnbIn > remaining) {
            bnbIn = remaining;
            capped = true;
        }

        tokensOut = _tokensOut(c, bnbIn);
        if (tokensOut > room) {
            tokensOut = room;
            bnbIn = _bnbInFor(c, room);
            capped = true;
        }

        if (capped) {
            fee = Math.min(Math.ceilDiv(bnbIn * FEE_BPS, BPS - FEE_BPS), bnbGross - bnbIn);
            refund = bnbGross - bnbIn - fee;
        }
    }

    /// @dev BNB needed to take exactly `tokensOut` from the curve (rounded up in the protocol's favour).
    function _bnbInFor(Curve storage c, uint256 tokensOut) internal view returns (uint256) {
        uint256 bnbReserve = VIRTUAL_BNB + c.realBnb;
        uint256 tokenReserve = VIRTUAL_TOKEN - c.sold;
        return Math.ceilDiv(K, tokenReserve - tokensOut) - bnbReserve;
    }

    function _tokensOut(Curve storage c, uint256 bnbIn) internal view returns (uint256) {
        uint256 bnbReserve = VIRTUAL_BNB + c.realBnb;
        uint256 tokenReserve = VIRTUAL_TOKEN - c.sold;
        uint256 newTokenReserve = Math.ceilDiv(K, bnbReserve + bnbIn);
        return tokenReserve - newTokenReserve;
    }

    function _bnbOut(Curve storage c, uint256 tokensIn) internal view returns (uint256) {
        uint256 bnbReserve = VIRTUAL_BNB + c.realBnb;
        uint256 tokenReserve = VIRTUAL_TOKEN - c.sold;
        uint256 newBnbReserve = Math.ceilDiv(K, tokenReserve + tokensIn);
        return bnbReserve - newBnbReserve;
    }

    function _live(address token) internal view returns (Curve storage c) {
        c = curves[token];
        if (c.creator == address(0)) revert UnknownToken();
        if (c.graduated) revert AlreadyGraduated();
    }

    // ---------------------------------------------------------------- admin
    function collectFees() external {
        uint256 amount = accruedFees;
        accruedFees = 0;
        (bool ok,) = feeVault.call{value: amount}("");
        if (!ok) revert PayoutFailed();
        emit FeesCollected(feeVault, amount);
    }

    function setFeeVault(address vault) external onlyOwner {
        if (vault == address(0)) revert ZeroAddress();
        feeVault = vault;
        emit FeeVaultUpdated(vault);
    }

    function setMigrator(address migrator_) external onlyOwner {
        if (migrator_ == address(0)) revert ZeroAddress();
        migrator = IMigrator(migrator_);
        emit MigratorUpdated(migrator_);
    }

    /// @notice Set to address(0) to force the voucher path only.
    function setAgentIdRegistry(address registry) external onlyOwner {
        agentIdRegistry = IERC721(registry);
        emit AgentIdRegistryUpdated(registry);
    }

    function setVoucherSigner(address signer) external onlyOwner {
        if (signer == address(0)) revert ZeroAddress();
        _setVoucherSigner(signer);
    }
}
