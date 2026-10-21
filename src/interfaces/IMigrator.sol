// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface IMigrator {
    /// @notice Migrates `tokenAmount` of `token` (already transferred to the migrator) plus msg.value BNB
    ///         into a DEX pool and burns the LP. Returns the pair address.
    function migrate(address token, uint256 tokenAmount) external payable returns (address pair);
}
