// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title VoucherVerifier
/// @notice EIP-712 voucher gate for bonding-curve buys. The backend signs a voucher for an address only after
///         verifying it is a Binance Agentic Wallet. One nonce per (buyer, nonce) pair; vouchers are single-use.
abstract contract VoucherVerifier is EIP712 {
    bytes32 public constant VOUCHER_TYPEHASH =
        keccak256("Voucher(address buyer,address token,uint256 nonce,uint256 deadline)");

    address public voucherSigner;
    mapping(address buyer => mapping(uint256 nonce => bool used)) public nonceUsed;

    error VoucherExpired();
    error VoucherNonceUsed();
    error VoucherBadSigner();

    event VoucherSignerUpdated(address indexed signer);

    constructor(address signer_) EIP712("Gang", "1") {
        voucherSigner = signer_;
        emit VoucherSignerUpdated(signer_);
    }

    function _setVoucherSigner(address signer_) internal {
        voucherSigner = signer_;
        emit VoucherSignerUpdated(signer_);
    }

    function voucherDigest(address buyer, address token, uint256 nonce, uint256 deadline)
        public
        view
        returns (bytes32)
    {
        return _hashTypedDataV4(keccak256(abi.encode(VOUCHER_TYPEHASH, buyer, token, nonce, deadline)));
    }

    function _consumeVoucher(address buyer, address token, uint256 nonce, uint256 deadline, bytes calldata sig)
        internal
    {
        if (block.timestamp > deadline) revert VoucherExpired();
        if (nonceUsed[buyer][nonce]) revert VoucherNonceUsed();
        address recovered = ECDSA.recover(voucherDigest(buyer, token, nonce, deadline), sig);
        if (recovered != voucherSigner) revert VoucherBadSigner();
        nonceUsed[buyer][nonce] = true;
    }
}
