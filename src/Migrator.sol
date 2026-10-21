// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IMigrator} from "./interfaces/IMigrator.sol";
import {IPancakeFactory, IPancakePair, IWBNB} from "./interfaces/IPancake.sol";

/// @title Migrator
/// @notice Moves graduated liquidity into a PancakeSwap V2 pair and burns the LP tokens.
/// @dev Talks to the pair directly (not the router) so a griefer cannot brick graduation by donating
///      WBNB to the pair and calling sync() before we add liquidity: any donation simply becomes
///      extra (burned) liquidity.
contract Migrator is IMigrator {
    using SafeERC20 for IERC20;

    address public constant DEAD = 0x000000000000000000000000000000000000dEaD;

    IPancakeFactory public immutable factory;
    IWBNB public immutable wbnb;
    address public immutable launchpad;

    error OnlyLaunchpad();
    error NothingToMigrate();
    error ZeroAddress();
    error WbnbTransferFailed();

    event Migrated(address indexed token, address indexed pair, uint256 tokenAmount, uint256 bnbAmount, uint256 lp);

    constructor(address factory_, address wbnb_, address launchpad_) {
        if (factory_ == address(0) || wbnb_ == address(0) || launchpad_ == address(0)) revert ZeroAddress();
        factory = IPancakeFactory(factory_);
        wbnb = IWBNB(wbnb_);
        launchpad = launchpad_;
    }

    function migrate(address token, uint256 tokenAmount) external payable returns (address pair) {
        if (msg.sender != launchpad) revert OnlyLaunchpad();
        if (tokenAmount == 0 || msg.value == 0) revert NothingToMigrate();

        pair = factory.getPair(token, address(wbnb));
        if (pair == address(0)) pair = factory.createPair(token, address(wbnb));

        wbnb.deposit{value: msg.value}();
        if (!wbnb.transfer(pair, msg.value)) revert WbnbTransferFailed();
        IERC20(token).safeTransfer(pair, tokenAmount);

        uint256 lp = IPancakePair(pair).mint(DEAD);
        emit Migrated(token, pair, tokenAmount, msg.value, lp);
    }
}
