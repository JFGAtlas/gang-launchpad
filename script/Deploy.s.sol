// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {Launchpad} from "../src/Launchpad.sol";
import {Migrator} from "../src/Migrator.sol";

/// forge script script/Deploy.s.sol --rpc-url bsc --broadcast --verify
contract Deploy is Script {
    address constant PANCAKE_V2_FACTORY = 0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73;
    address constant WBNB = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;
    address constant AGENT_ID = 0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F; // SPACE ID Agent ID (.ai)

    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address vault = vm.envAddress("FEE_VAULT");
        address owner = vm.envOr("OWNER", vm.addr(pk));

        vm.startBroadcast(pk);
        Launchpad pad = new Launchpad(owner, vault, AGENT_ID);
        Migrator migrator = new Migrator(PANCAKE_V2_FACTORY, WBNB, address(pad));
        pad.setMigrator(address(migrator));
        vm.stopBroadcast();

        console.log("Launchpad:", address(pad));
        console.log("Migrator: ", address(migrator));
    }
}
