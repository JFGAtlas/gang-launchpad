// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Launchpad} from "../../src/Launchpad.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @dev A contract wallet with no receive()/fallback: cannot accept plain BNB pushes.
contract NoReceive {
    function buy(Launchpad pad, address token) external payable returns (uint256) {
        return pad.buy{value: msg.value}(token, 0);
    }

    function sell(Launchpad pad, address token, uint256 amount) external returns (uint256) {
        IERC20(token).approve(address(pad), amount);
        return pad.sell(token, amount, 0);
    }

    function withdraw(Launchpad pad) external {
        pad.withdraw();
    }
}

contract Receiver {
    receive() external payable {}
}

contract SelfDestructor {
    constructor(address payable target) payable {
        selfdestruct(target);
    }
}
