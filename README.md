<p align="center">
  <img src="https://img.shields.io/badge/BNB%20Chain-mainnet-F0B90B?style=flat-square&labelColor=181A20" />
  <img src="https://img.shields.io/badge/Binance-Agentic%20Wallet-F0B90B?style=flat-square&labelColor=181A20" />
  <img src="https://img.shields.io/badge/tests-40%20passing-0ECB81?style=flat-square&labelColor=181A20" />
  <img src="https://img.shields.io/badge/license-MIT-848E9C?style=flat-square&labelColor=181A20" />
</p>

<h1 align="center">Gang</h1>
<p align="center"><b>The launchpad where only agents get in early.</b><br/>
<a href="https://gang.fun">gang.fun</a> · BNB Chain · built for Binance Agentic Wallet</p>

---

Gang is a bonding-curve launchpad with one rule humans can't break: **the curve only sells to AI agents.**

A buy succeeds only if `msg.sender` holds a [SPACE ID Agent ID](https://bscscan.com/address/0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F) — a soulbound `.ai` name that can only be minted from a Binance Agentic Wallet. No allowlists, no backend, no signatures to forge. The check is one `balanceOf` on-chain.

```
┌─────────────────────────────────────────────────────────────────┐
│  create()          1,000,000,000 fixed supply, 0 creation fee    │
│  buy()             Agent ID holders only · 1% cap per wallet     │
│  sell()            open · 1% fee                                 │
│  ── 20 BNB ──▶     graduate: 200M tokens + 20 BNB → PancakeSwap  │
│                    LP burned · transfers unlocked · fees end     │
└─────────────────────────────────────────────────────────────────┘
```

| | |
|---|---|
| **Who can buy** | Wallets holding an Agent ID NFT. Checked on every buy. |
| **Per-wallet cap** | 1% of supply (10,000,000). Excess BNB refunded in the same tx. Graduation therefore needs ≥ 80 distinct agents. |
| **Fee** | 1% on curve buys and sells. 0 after graduation. |
| **Transfers** | Locked until graduation. Tokens move only between holder and curve. |
| **Curve** | `xy = k` with virtual reserves `20/3 BNB` and `16e9/15` tokens. Opens at 6.25 BNB FDV, graduates at 100 BNB FDV. The PancakeSwap pool opens at exactly the curve's last price. |
| **Graduation** | Direct pair mint (not the router), so a griefer donating WBNB + `sync()` cannot brick it. LP → `0x…dEaD`. |

## Mainnet

| Contract | Address |
|---|---|
| Launchpad | [`0x63ec44bC7CC8f3572AC3b3CC5fd4697C27bB55fd`](https://bscscan.com/address/0x63ec44bC7CC8f3572AC3b3CC5fd4697C27bB55fd) |
| Migrator | [`0x234070Fa42e6fb712b0aCC464Be22410b9a393f0`](https://bscscan.com/address/0x234070Fa42e6fb712b0aCC464Be22410b9a393f0) |
| Agent ID registry (SPACE ID) | [`0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`](https://bscscan.com/address/0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F) |

Source verified on [Sourcify](https://sourcify.dev).

## Trade with your agent

Gang has no buy button. Your agent trades through a CLI; you approve in the Binance App.

```bash
# 1. Binance Agentic Wallet skill (sign-in, signing, risk engine)
npx skills add binance/binance-skills-hub/skills/binance-web3/binance-agentic-wallet

# 2. Gang skill
npx skills add gangfun/gang-launchpad/skill
```

Then, in plain language: *"sign in to my Binance Agentic Wallet"*, *"what's hot on Gang?"*, *"buy 0.05 BNB of 0x… on Gang"*. Under the hood:

```bash
gang preflight                              # signed in · Developer Mode · Trade all tokens · Agent ID
gang list                                   # boards with price, progress, your balance
gang quote --token 0x… --bnb 0.05           # exact on-chain quote incl. fee, cap, refund
gang buy   --token 0x… --bnb 0.05           # preview through Binance risk engine → requestId
gang execute --request-id <id>              # broadcast
gang sell  --token 0x… --all                # approve, then sell (Binance asks you to confirm in-App)
gang create --name "My Agent Coin" --symbol MAC
```

The CLI holds no keys. It reads the chain with viem, builds calldata, and hands every signature to `baw`, Binance's Agentic Wallet CLI. One-time wallet setup: create an Agentic Wallet, claim a `.ai` Agent ID, enable **Developer Mode** and **Trade all tokens**.

## Repository

```
src/        Launchpad · LaunchToken · Migrator · VoucherVerifier   (Solidity 0.8.28, Foundry)
test/       unit + invariant fuzz + BSC mainnet fork (real PancakeSwap, real Agent ID registry)
skill/      SKILL.md + references + gang CLI (@gangfun/cli)
backend/    indexer: events → SQLite → JSON API (boards, trades, holders, candles)
web/        gang.fun — React + Vite, read-only, Binance design language
docs/       SPEC.md (curve math, invariants) · DESIGN.md
```

```bash
forge test                                                      # 40 tests
BSC_RPC_URL=https://bsc-rpc.publicnode.com forge test --match-path 'test/fork/*'
cd skill/gang-cli && npm i && npm link                         # gang
cd backend/indexer && GANG_START_BLOCK=128853456 npm start     # :8787
cd web && npm i && npm run dev                                  # :5173
```

## Security model, briefly

- **Gate is on-chain and soulbound.** Agent ID can't be transferred (`transferFrom` reverts) and can't be minted without a Binance-side signature. The contract owner can swap the registry address or disable it in favour of an EIP-712 voucher path; both are events.
- **Rounding always favours the protocol.** Reserves are computed with `ceilDiv`; the invariant `(vB + realBnb)(vT − sold) ≥ k` is fuzzed over 500k calls.
- **Fees are pull-only.** Accrued in the contract, collected by anyone to the vault address; a misbehaving vault can't block trades.
- **Not audited yet.** Use at your own risk.

## License

MIT
