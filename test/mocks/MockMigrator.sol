// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IMigrator} from "../../src/interfaces/IMigrator.sol";

contract MockMigrator is IMigrator {
    address public lastToken;
    uint256 public lastTokenAmount;
    uint256 public lastBnb;
    uint256 public calls;

    function migrate(address token, uint256 tokenAmount) external payable returns (address) {
        lastToken = token;
        lastTokenAmount = tokenAmount;
        lastBnb = msg.value;
        calls++;
        return address(0xBEEF);
    }
}
