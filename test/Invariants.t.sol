// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {BaseTest} from "./Base.t.sol";
import {Launchpad} from "../src/Launchpad.sol";
import {LaunchToken} from "../src/LaunchToken.sol";

contract Handler is Test {
    Launchpad public pad;
    LaunchToken public tok;
    uint256 internal signerPk;
    uint256 internal nonce = 1;
    address[] public actors;

    uint256 public ghostFeesPaid;
    uint256 public ghostBnbIn;
    uint256 public ghostBnbOut;

    constructor(Launchpad _pad, LaunchToken _tok, uint256 _signerPk) {
        pad = _pad;
        tok = _tok;
        signerPk = _signerPk;
        for (uint256 i; i < 5; i++) {
            address a = address(uint160(0x1000 + i));
            actors.push(a);
            vm.deal(a, 100 ether);
        }
    }

    function buy(uint256 actorSeed, uint256 value) external {
        (,,, bool graduated,) = pad.curves(address(tok));
        if (graduated) return;
        address a = actors[actorSeed % actors.length];
        value = bound(value, 1, 5 ether);
        if (a.balance < value) return;
        if (pad.walletRoom(address(tok), a) == 0) return;
        uint256 n = nonce++;
        bytes32 digest = pad.voucherDigest(a, address(tok), n, block.timestamp + 1);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, digest);
        (,, uint256 fee,) = pad.quoteBuy(address(tok), a, value);
        uint256 before = a.balance;
        vm.prank(a);
        pad.buy{value: value}(address(tok), 0, n, block.timestamp + 1, abi.encodePacked(r, s, v));
        ghostFeesPaid += fee;
        ghostBnbIn += (before - a.balance) - fee;
    }

    function sell(uint256 actorSeed, uint256 frac) external {
        (,,, bool graduated,) = pad.curves(address(tok));
        if (graduated) return;
        address a = actors[actorSeed % actors.length];
        uint256 bal = tok.balanceOf(a);
        if (bal == 0) return;
        uint256 amount = bound(frac, 1, bal);
        (uint256 toUser, uint256 fee) = pad.quoteSell(address(tok), amount);
        vm.startPrank(a);
        tok.approve(address(pad), amount);
        pad.sell(address(tok), amount, 0);
        vm.stopPrank();
        ghostFeesPaid += fee;
        ghostBnbOut += toUser + fee;
    }
}

contract InvariantTest is BaseTest {
    Handler internal h;

    function setUp() public override {
        super.setUp();
        h = new Handler(pad, tok, signerPk);
        targetContract(address(h));
    }

    function invariant_bnbAccounting() public view {
        (, uint256 realBnb,, bool graduated,) = pad.curves(address(tok));
        if (!graduated) {
            assertEq(address(pad).balance, realBnb + pad.accruedFees());
            assertEq(realBnb, h.ghostBnbIn() - h.ghostBnbOut());
        } else {
            assertEq(address(pad).balance, pad.accruedFees());
        }
        assertEq(pad.accruedFees(), h.ghostFeesPaid());
    }

    function invariant_walletCap() public view {
        for (uint256 i; i < 5; i++) {
            assertLe(tok.balanceOf(h.actors(i)), pad.MAX_PER_WALLET());
        }
    }

    function invariant_curveBounds() public view {
        (, uint256 realBnb, uint256 sold, bool graduated,) = pad.curves(address(tok));
        assertLe(realBnb, pad.GRADUATION_BNB());
        assertLe(sold, pad.CURVE_SUPPLY());
        if (!graduated) {
            // rounding always favours the protocol: product never drops below K
            assertGe((pad.VIRTUAL_BNB() + realBnb) * (pad.VIRTUAL_TOKEN() - sold), pad.K());
            // tokens out in the wild == sold
            assertEq(tok.totalSupply() - tok.balanceOf(address(pad)), sold);
        }
    }
}
