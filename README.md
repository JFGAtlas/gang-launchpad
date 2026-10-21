<p align="center">
  <img src="web/public/brand/lockup.png" alt="GANG" height="42" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/BNB%20Chain-BSC%20·%20v3-FCD535?style=flat-square&labelColor=0E0E0E" alt="BNB Chain" />
  <img src="https://img.shields.io/badge/gate-Agent%20ID%20only-FCD535?style=flat-square&labelColor=0E0E0E" alt="Agent ID gate" />
  <img src="https://img.shields.io/badge/audit-none-848E9C?style=flat-square&labelColor=0E0E0E" alt="No audit" />
  <img src="https://img.shields.io/badge/multisig-none-848E9C?style=flat-square&labelColor=0E0E0E" alt="No multisig" />
  <img src="https://img.shields.io/badge/license-MIT-848E9C?style=flat-square&labelColor=0E0E0E" alt="MIT" />
</p>

<pre align="center">
╔══════════════════════════════════════════════════════════╗
║  GANG · agent-only launchpad on BNB Chain                ║
║  gang.fun · Binance Agentic Wallet · SPACE ID Agent ID   ║
╚══════════════════════════════════════════════════════════╝
</pre>

**The curve only sells to AI agents.** A buy succeeds only if `msg.sender` holds a [SPACE ID Agent ID](https://bscscan.com/address/0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F) — a soulbound `.ai` name minted from a Binance Agentic Wallet. No allowlists, no backend signatures. One on-chain `balanceOf`.

```
┌─────────────────────────────────────────────────────────────┐
│  create()        1,000,000,000 fixed supply · 0 creation fee│
│  buy()           Agent ID holders only · 1% cap / wallet    │
│  sell()          open · 1% fee                              │
│  ── 20 BNB ──▶   graduate → PancakeSwap V2                  │
│                  200M tokens + 20 BNB · LP → 0x…dEaD        │
│                  transfers unlock · curve fees end          │
└─────────────────────────────────────────────────────────────┘

  graduation progress (concept)
  [████████████████░░░░░░░░░░░░░░░░░░░░░░░░]  20 BNB trigger
```

| | |
|---|---|
| **Who can buy** | Wallets holding an Agent ID NFT. Checked on every buy. |
| **Who can sell** | Any holder. |
| **Per-wallet cap** | 1% of supply (10,000,000). Excess BNB refunded in the same tx. Needs ≥ ~80 distinct agents to graduate. |
| **Fee** | 1% on curve buys and sells (BNB → fee vault). **0 after graduation.** |
| **Transfers** | Locked until graduation. Tokens move only between holder and curve. |
| **Curve** | `xy = k` with virtual reserves `20/3 BNB` and `16e9/15` tokens. Opens ~6.25 BNB FDV, graduates ~100 BNB FDV. Pool opens at the curve's last price. |
| **Graduation** | Direct pair mint (not the router). LP → `0x…dEaD`. |

## Contracts · BSC mainnet · v3

| Contract | Version | Deploy block | Address |
|---|---|---|---|
| Launchpad | **v3** | **128858413** | [`0xBfBB10db587DdFDF38c888cB80C5124f1Aa3C0Eb`](https://bscscan.com/address/0xBfBB10db587DdFDF38c888cB80C5124f1Aa3C0Eb) |
| Migrator | **v3** | **128858413** | [`0x4b1E5a7602c7f7964c08364241c1FE59CB4095C8`](https://bscscan.com/address/0x4b1E5a7602c7f7964c08364241c1FE59CB4095C8) |
| Agent ID (SPACE ID) | — | — | [`0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`](https://bscscan.com/address/0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F) |

- Chain: **BNB Chain (BSC)** · use **v3 only** (v1/v2 retired)
- Source: Sourcify exact match (check the explorer / Sourcify page)

## Status (honest)

| Check | Status |
|---|---|
| Foundry unit / invariant / edge + CI | Pass (see Actions) |
| BSC fork: graduation → Pancake V2 LP burn | **Fork verified** |
| Agentic Wallet testnet | **None** (AW is mainnet-only) |
| Mainnet: full graduation (20 BNB → LP dead) | **Not verified** |
| Third-party audit report | **None** |
| Owner behind multisig | **Not done** |

Do not read this README as “audited”, “multisig-secured”, or “mainnet graduation proven”.

## Trade with your agent

Gang has no buy button. Your agent trades through a CLI; you approve in the Binance App.

```bash
# 1. Binance Agentic Wallet skill
npx skills add binance/binance-skills-hub/skills/binance-web3/binance-agentic-wallet

# 2. Gang skill
npx skills add gangfun/gang-launchpad/skill

# 3. Until @gangfun/cli is on npm:
cd skill/gang-cli && npm i && npm link   # bin: gang
```

```bash
gang preflight                              # signed in · Developer Mode · Trade all tokens · Agent ID
gang list                                   # boards: price, progress, your balance
gang quote --token 0x… --bnb 0.05           # on-chain quote incl. fee, cap, refund
gang buy   --token 0x… --bnb 0.05           # preview → requestId
gang execute --request-id <id>              # broadcast
gang sell  --token 0x… --all                # approve, then sell (Binance may ask in-App confirm)
gang create --name "My Agent Coin" --symbol MAC
```

The CLI holds **no keys**. It reads the chain with viem, builds calldata, and hands every signature to `baw` (Binance Agentic Wallet CLI). One-time setup: Agentic Wallet → claim `.ai` Agent ID → enable **Developer Mode** and **Trade all tokens**.

## Repository

```
src/        Launchpad · LaunchToken · Migrator · interfaces/   (Solidity 0.8.28, Foundry)
test/       unit + invariant fuzz + BSC mainnet fork
skill/      SKILL.md + references + gang CLI (@gangfun/cli)
backend/    indexer: events → SQLite → JSON API
web/        gang.fun UI — pixel terminal + Blur-clean (React + Vite)
docs/       SPEC.md (curve math) · DESIGN.md (visual system)
```

```bash
forge test
BSC_RPC_URL=https://bsc-rpc.publicnode.com forge test --match-path 'test/fork/*'
cd skill/gang-cli && npm i && npm link
cd backend/indexer && GANG_START_BLOCK=128858413 npm start   # :8787
cd web && npm i && npm run dev                                # :5173
```

## How the gate works (brief)

- **Gate is on-chain and soulbound.** Agent ID cannot be transferred (`transferFrom` reverts) and minting requires Binance-side issuance. The launchpad checks `balanceOf` on every `buy`.
- **Rounding favours the protocol.** Reserves use `ceilDiv`; invariant `(vB + realBnb)(vT − sold) ≥ k` is fuzzed in Foundry.
- **Fees are pull-only.** Accrued in-contract; anyone can `collectFees` to the vault; a broken vault cannot block trades.
- **No third-party audit. No multisig. Mainnet full graduation path not verified.** Use at your own risk.

## Docs

| Doc | What |
|---|---|
| [`docs/SPEC.md`](docs/SPEC.md) | Curve math, buy/sell/graduate invariants |
| [`docs/DESIGN.md`](docs/DESIGN.md) | Pixel terminal visual system (Fusion Pixel / Geist Mono / `#FCD535`) |
| [`docs/STATUS.md`](docs/STATUS.md) | Honest verification status (short) |

## License

MIT
