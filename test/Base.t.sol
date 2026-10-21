// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {Launchpad} from "../src/Launchpad.sol";
import {LaunchToken} from "../src/LaunchToken.sol";
import {MockMigrator} from "./mocks/MockMigrator.sol";
import {MockAgentId} from "./mocks/MockAgentId.sol";

abstract contract BaseTest is Test {
    Launchpad internal pad;
    MockMigrator internal mockMigrator;
    MockAgentId internal agentId;
    LaunchToken internal tok;

    address internal owner = makeAddr("owner");
    address internal vault = makeAddr("vault");
    uint256 internal signerPk = 0xA11CE;
    address internal signer = vm.addr(signerPk);
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal agent = makeAddr("agent");

    uint256 internal nextNonce = 1;

    function setUp() public virtual {
        agentId = new MockAgentId();
        agentId.mint(agent, 1);
        pad = new Launchpad(owner, signer, vault, address(agentId));
        mockMigrator = new MockMigrator();
        vm.prank(owner);
        pad.setMigrator(address(mockMigrator));
        tok = LaunchToken(pad.create("Gang Test", "CTT"));
        vm.deal(alice, 1000 ether);
        vm.deal(bob, 1000 ether);
        vm.deal(agent, 1000 ether);
    }

    function _voucher(address buyer, address token, uint256 nonce, uint256 deadline)
        internal
        view
        returns (bytes memory)
    {
        bytes32 digest = pad.voucherDigest(buyer, token, nonce, deadline);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, digest);
        return abi.encodePacked(r, s, v);
    }

    function _buy(address buyer, uint256 value) internal returns (uint256 out) {
        uint256 nonce = nextNonce++;
        bytes memory sig = _voucher(buyer, address(tok), nonce, block.timestamp + 1 hours);
        vm.prank(buyer);
        out = pad.buy{value: value}(address(tok), 0, nonce, block.timestamp + 1 hours, sig);
    }

    /// @dev Agent path: empty signature, gate is the Agent ID NFT.
    function _buyAsAgent(address buyer, uint256 value) internal returns (uint256 out) {
        vm.prank(buyer);
        out = pad.buy{value: value}(address(tok), 0, 0, 0, "");
    }

    /// @dev Fills the curve to graduation with fresh agent wallets (each capped at 1%). Returns wallets used.
    function _fillCurve() internal returns (uint256 n) {
        for (n = 0; n < 200 && !_graduated(); n++) {
            address w = address(uint160(0xA0000 + n));
            agentId.mint(w, 1000 + n);
            vm.deal(w, 10 ether);
            vm.prank(w);
            pad.buy{value: 2 ether}(address(tok), 0, 0, 0, "");
        }
    }

    function _sell(address seller, uint256 amount) internal returns (uint256 out) {
        vm.startPrank(seller);
        tok.approve(address(pad), amount);
        out = pad.sell(address(tok), amount, 0);
        vm.stopPrank();
    }

    function _realBnb() internal view returns (uint256 r) {
        (, r,,,) = pad.curves(address(tok));
    }

    function _sold() internal view returns (uint256 s) {
        (,, s,,) = pad.curves(address(tok));
    }

    function _graduated() internal view returns (bool g) {
        (,,, g,) = pad.curves(address(tok));
    }
}
