// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ILaunchToken is IERC20 {
    function unlock() external;
    function locked() external view returns (bool);
}
