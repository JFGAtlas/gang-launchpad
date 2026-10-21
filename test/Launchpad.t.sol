// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {BaseTest} from "./Base.t.sol";
import {Launchpad} from "../src/Launchpad.sol";
import {LaunchToken} from "../src/LaunchToken.sol";
import {VoucherVerifier} from "../src/VoucherVerifier.sol";

contract LaunchpadTest is BaseTest {
    // ------------------------------------------------------------ create
    function test_create_mintsSupplyToLaunchpad() public view {
        assertEq(tok.totalSupply(), 1_000_000_000 ether);
        assertEq(tok.balanceOf(address(pad)), 1_000_000_000 ether);
        assertTrue(tok.locked());
        assertEq(pad.tokenCount(), 1);
    }

    function test_create_noFee() public {
        uint256 before = address(this).balance;
        pad.create("B", "B");
        assertEq(address(this).balance, before);
    }

    // ------------------------------------------------------------ curve math
    function test_firstBuy_pointZeroOneBnb() public {
        uint256 out = _buy(alice, 0.01 ether);
        // 0.0099 BNB net -> ~1.5814M tokens at opening prices
        assertApproxEqRel(out, 1_581_651.25 ether, 1e12);
        assertEq(_realBnb(), 0.0099 ether);
        assertEq(pad.accruedFees(), 0.0001 ether);
        assertEq(tok.balanceOf(alice), out);
    }

    function test_openingPrice() public view {
        // 6.25e-9 BNB per token
        assertApproxEqAbs(pad.spotPrice(address(tok)), 6.25e9, 1);
    }

    function test_priceMonotonic() public {
        uint256 p0 = pad.spotPrice(address(tok));
        _buy(alice, 0.01 ether);
        uint256 p1 = pad.spotPrice(address(tok));
        _buy(alice, 0.01 ether);
        uint256 p2 = pad.spotPrice(address(tok));
        assertGt(p1, p0);
        assertGt(p2, p1);
    }

    function test_buyThenSell_notProfitable() public {
        uint256 out = _buy(alice, 0.05 ether);
        uint256 before = alice.balance;
        _sell(alice, out);
        // Got back less than the 0.05 BNB paid (two 1% fees + rounding)
        assertLt(alice.balance - before, 0.05 ether);
        assertApproxEqRel(alice.balance - before, 0.05 ether * 99 * 99 / 10_000, 1e14);
        assertEq(_sold(), 0);
    }

    function test_sell_feeAccrues() public {
        uint256 out = _buy(alice, 2 ether);
        uint256 feesBefore = pad.accruedFees();
        _sell(alice, out / 2);
        assertGt(pad.accruedFees(), feesBefore);
    }

    function test_quoteMatchesExecution() public {
        (uint256 qOut, uint256 qIn, uint256 qFee, uint256 qRefund) = pad.quoteBuy(address(tok), alice, 0.03 ether);
        uint256 out = _buy(alice, 0.03 ether);
        assertEq(out, qOut);
        assertEq(qIn, 0.0297 ether);
        assertEq(qFee, 0.0003 ether);
        assertEq(qRefund, 0);
        (uint256 qBnb,) = pad.quoteSell(address(tok), out);
        uint256 before = alice.balance;
        _sell(alice, out);
        assertEq(alice.balance - before, qBnb);
    }

    // ------------------------------------------------------------ wallet cap (1% of supply)
    function test_walletCap_singleHugeBuyCappedAndRefunded() public {
        uint256 before = alice.balance;
        uint256 out = _buy(alice, 100 ether);
        assertEq(out, pad.MAX_PER_WALLET());
        assertEq(tok.balanceOf(alice), 10_000_000 ether);
        assertFalse(_graduated());
        // paid = bnb for 10M tokens + fee, everything else refunded
        uint256 paid = before - alice.balance;
        uint256 bnbIn = _realBnb();
        uint256 fee = (bnbIn * 100 + 9899) / 9900;
        assertEq(paid, bnbIn + fee);
        assertEq(pad.accruedFees(), fee);
        assertLt(paid, 0.07 ether); // ~0.0625 BNB at opening prices
        assertEq(pad.walletRoom(address(tok), alice), 0);
    }

    function test_walletCap_partialFillsToExactCap() public {
        _buy(alice, 0.03 ether);
        uint256 first = tok.balanceOf(alice);
        assertLt(first, 10_000_000 ether);
        _buy(alice, 5 ether);
        assertEq(tok.balanceOf(alice), 10_000_000 ether);
    }

    function test_walletCap_fullWalletReverts() public {
        _buy(alice, 100 ether);
        uint256 nonce = nextNonce++;
        bytes memory sig = _voucher(alice, address(tok), nonce, block.timestamp + 1);
        vm.prank(alice);
        vm.expectRevert(Launchpad.WalletCapReached.selector);
        pad.buy{value: 0.01 ether}(address(tok), 0, nonce, block.timestamp + 1, sig);
    }

    function test_walletCap_sellFreesRoom() public {
        _buy(alice, 100 ether);
        _sell(alice, 4_000_000 ether);
        assertEq(pad.walletRoom(address(tok), alice), 4_000_000 ether);
        _buy(alice, 100 ether);
        assertEq(tok.balanceOf(alice), 10_000_000 ether);
    }

    function test_walletCap_quoteMatches() public {
        (uint256 qOut, uint256 qIn, uint256 qFee, uint256 qRefund) = pad.quoteBuy(address(tok), alice, 100 ether);
        assertEq(qOut, 10_000_000 ether);
        assertEq(qIn + qFee + qRefund, 100 ether);
        uint256 before = alice.balance;
        uint256 out = _buy(alice, 100 ether);
        assertEq(out, qOut);
        assertEq(before - alice.balance, qIn + qFee);
    }

    function test_walletCap_quoteForFullWallet() public {
        _buy(alice, 100 ether);
        (uint256 qOut,,, uint256 qRefund) = pad.quoteBuy(address(tok), alice, 1 ether);
        assertEq(qOut, 0);
        assertEq(qRefund, 1 ether);
    }

    // ------------------------------------------------------------ graduation
    function test_graduation_needs80Wallets() public {
        uint256 n = _fillCurve();
        assertEq(n, 80); // 80 x 1% = 80% of supply
        assertTrue(_graduated());
        assertEq(mockMigrator.calls(), 1);
        assertEq(mockMigrator.lastBnb(), 20 ether);
        assertApproxEqAbs(mockMigrator.lastTokenAmount(), 200_000_000 ether, 1e9);
        assertEq(tok.balanceOf(address(pad)), 0);
        assertFalse(tok.locked());
        assertEq(_realBnb(), 0);
        // contract holds only fees now; last wallet got slightly less than 1% (graduation cap bound first)
        assertEq(address(pad).balance, pad.accruedFees());
        address last = address(uint160(0xA0000 + 79));
        assertLe(tok.balanceOf(last), 10_000_000 ether);
        assertGt(tok.balanceOf(last), 9_999_999 ether);
    }

    function test_graduation_lastBuyRefundsExcess() public {
        // fill 79 wallets, then the 80th sends far more than needed
        for (uint256 i; i < 79; i++) {
            address w = address(uint160(0xB0000 + i));
            agentId.mint(w, 2000 + i);
            vm.deal(w, 10 ether);
            vm.prank(w);
            pad.buy{value: 2 ether}(address(tok), 0, 0, 0, "");
        }
        assertFalse(_graduated());
        uint256 remaining = 20 ether - _realBnb();
        uint256 before = agent.balance;
        _buyAsAgent(agent, 50 ether);
        assertTrue(_graduated());
        uint256 fee = (remaining * 100 + 9899) / 9900;
        assertEq(before - agent.balance, remaining + fee);
    }

    function test_graduated_curveClosed() public {
        _fillCurve();
        uint256 nonce = nextNonce++;
        bytes memory sig = _voucher(alice, address(tok), nonce, block.timestamp + 1);
        vm.prank(alice);
        vm.expectRevert(Launchpad.AlreadyGraduated.selector);
        pad.buy{value: 1 ether}(address(tok), 0, nonce, block.timestamp + 1, sig);

        vm.startPrank(alice);
        tok.approve(address(pad), 1 ether);
        vm.expectRevert(Launchpad.AlreadyGraduated.selector);
        pad.sell(address(tok), 1 ether, 0);
        vm.stopPrank();
    }

    function test_graduation_requiresMigrator() public {
        Launchpad p2 = new Launchpad(owner, signer, vault, address(agentId));
        address t2 = p2.create("X", "X");
        for (uint256 i; i < 80; i++) {
            address w = address(uint160(0xC0000 + i));
            agentId.mint(w, 3000 + i);
            vm.deal(w, 10 ether);
            vm.prank(w);
            if (i == 79) vm.expectRevert(Launchpad.MigratorNotSet.selector);
            p2.buy{value: 2 ether}(t2, 0, 0, 0, "");
        }
    }

    // ------------------------------------------------------------ transfer lock
    function test_lock_blocksTransfersBeforeGraduation() public {
        uint256 out = _buy(alice, 1 ether);
        vm.prank(alice);
        vm.expectRevert(LaunchToken.TransfersLocked.selector);
        tok.transfer(bob, out);
    }

    function test_lock_liftedAfterGraduation() public {
        uint256 out = _buy(alice, 1 ether);
        _fillCurve();
        vm.prank(alice);
        tok.transfer(bob, out);
        assertEq(tok.balanceOf(bob), out);
    }

    function test_unlock_onlyLaunchpad() public {
        vm.expectRevert(LaunchToken.OnlyLaunchpad.selector);
        tok.unlock();
    }

    // ------------------------------------------------------------ voucher gate
    function test_voucher_wrongSigner() public {
        bytes32 digest = pad.voucherDigest(alice, address(tok), 7, block.timestamp + 1);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(0xBAD, digest);
        vm.prank(alice);
        vm.expectRevert(VoucherVerifier.VoucherBadSigner.selector);
        pad.buy{value: 1 ether}(address(tok), 0, 7, block.timestamp + 1, abi.encodePacked(r, s, v));
    }

    function test_voucher_wrongBuyer() public {
        bytes memory sig = _voucher(alice, address(tok), 7, block.timestamp + 1);
        vm.prank(bob);
        vm.expectRevert(VoucherVerifier.VoucherBadSigner.selector);
        pad.buy{value: 1 ether}(address(tok), 0, 7, block.timestamp + 1, sig);
    }

    function test_voucher_wrongToken() public {
        address other = pad.create("O", "O");
        bytes memory sig = _voucher(alice, other, 7, block.timestamp + 1);
        vm.prank(alice);
        vm.expectRevert(VoucherVerifier.VoucherBadSigner.selector);
        pad.buy{value: 1 ether}(address(tok), 0, 7, block.timestamp + 1, sig);
    }

    function test_voucher_expired() public {
        bytes memory sig = _voucher(alice, address(tok), 7, block.timestamp);
        vm.warp(block.timestamp + 1);
        vm.prank(alice);
        vm.expectRevert(VoucherVerifier.VoucherExpired.selector);
        pad.buy{value: 1 ether}(address(tok), 0, 7, block.timestamp - 1, sig);
    }

    function test_voucher_replay() public {
        bytes memory sig = _voucher(alice, address(tok), 7, block.timestamp + 1);
        vm.prank(alice);
        pad.buy{value: 1 ether}(address(tok), 0, 7, block.timestamp + 1, sig);
        vm.prank(alice);
        vm.expectRevert(VoucherVerifier.VoucherNonceUsed.selector);
        pad.buy{value: 1 ether}(address(tok), 0, 7, block.timestamp + 1, sig);
    }

    function test_voucher_rotateSigner() public {
        vm.prank(owner);
        pad.setVoucherSigner(vm.addr(0xB0B));
        bytes memory sig = _voucher(alice, address(tok), 7, block.timestamp + 1);
        vm.prank(alice);
        vm.expectRevert(VoucherVerifier.VoucherBadSigner.selector);
        pad.buy{value: 1 ether}(address(tok), 0, 7, block.timestamp + 1, sig);
    }

    // ------------------------------------------------------------ agent id gate (on-chain)
    function test_agentGate_holderBuysWithoutVoucher() public {
        uint256 out = _buyAsAgent(agent, 1 ether);
        assertGt(out, 0);
        assertEq(tok.balanceOf(agent), out);
    }

    function test_agentGate_nonHolderRejected() public {
        vm.prank(alice);
        vm.expectRevert(Launchpad.NotAgent.selector);
        pad.buy{value: 1 ether}(address(tok), 0, 0, 0, "");
    }

    function test_agentGate_disabledForcesVoucher() public {
        vm.prank(owner);
        pad.setAgentIdRegistry(address(0));
        vm.prank(agent);
        vm.expectRevert(Launchpad.NotAgent.selector);
        pad.buy{value: 1 ether}(address(tok), 0, 0, 0, "");
        // voucher path still works for the same agent
        _buy(agent, 1 ether);
    }

    function test_agentGate_soulbound() public {
        vm.prank(agent);
        vm.expectRevert();
        agentId.transferFrom(agent, alice, 1);
    }

    function test_isAgent() public view {
        assertTrue(pad.isAgent(agent));
        assertFalse(pad.isAgent(alice));
    }

    function test_sell_noVoucherNeeded() public {
        uint256 out = _buy(alice, 1 ether);
        _sell(alice, out); // no voucher involved
        assertEq(tok.balanceOf(alice), 0);
    }

    // ------------------------------------------------------------ fees & admin
    function test_collectFees() public {
        _buy(alice, 10 ether);
        uint256 fees = pad.accruedFees();
        pad.collectFees();
        assertEq(vault.balance, fees);
        assertEq(pad.accruedFees(), 0);
        assertEq(address(pad).balance, _realBnb());
    }

    function test_slippage() public {
        uint256 nonce = nextNonce++;
        bytes memory sig = _voucher(alice, address(tok), nonce, block.timestamp + 1);
        vm.prank(alice);
        vm.expectRevert(Launchpad.Slippage.selector);
        pad.buy{value: 1 ether}(address(tok), type(uint256).max, nonce, block.timestamp + 1, sig);
    }

    function test_unknownToken() public {
        vm.expectRevert(Launchpad.UnknownToken.selector);
        pad.sell(address(0x1234), 1, 0);
    }

    function test_onlyOwnerAdmin() public {
        vm.expectRevert();
        pad.setFeeVault(alice);
        vm.expectRevert();
        pad.setMigrator(alice);
        vm.expectRevert();
        pad.setVoucherSigner(alice);
        vm.expectRevert();
        pad.setAgentIdRegistry(alice);
    }

    receive() external payable {}
}
