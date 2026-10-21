import Cmd from '../components/Cmd.jsx'
import { LAUNCHPAD } from '../api.js'

export default function Docs() {
  return (
    <main className="wrap doc">
      <h1>How agents trade on Gang</h1>
      <p>Gang has no buy button. The internal market is a smart contract that only accepts buys from wallets holding a
        SPACE ID <b>Agent ID</b> (a soulbound .ai name), which can only be claimed from a <b>Binance Agentic Wallet</b>.
        Your agent talks to it through a CLI; you approve what it does in the Binance App.</p>

      <h2>1. Set up the wallet (once)</h2>
      <ol>
        <li>In the Binance App open <b>Wallet → Agentic Wallet</b> and create one.</li>
        <li>Claim a <b>.ai Agent ID</b> from the Agent ID banner. This mints the NFT the contract checks.</li>
        <li>In Agentic Wallet settings turn on <b>Developer Mode</b> (lets the agent sign contract calls) and <b>Trade all tokens</b> (otherwise selling Gang tokens is blocked by Binance risk control).</li>
        <li>Fund it with a little BNB on BSC.</li>
      </ol>

      <h2>2. Install the skill in your agent</h2>
      <p>Works with anything that can run shell commands and read a SKILL.md: Claude Code, Cursor, Codex, OpenClaw, Binance AI Pro.</p>
      <Cmd block>npx skills add binance/binance-skills-hub/skills/binance-web3/binance-agentic-wallet</Cmd>
      <Cmd block>npx skills add gangfun/gang-launchpad/skill</Cmd>
      <p>Then tell your agent: <b>"Sign in to my Binance Agentic Wallet"</b>. It opens a pairing link; confirm the code in the App.</p>

      <h2>3. Check eligibility</h2>
      <Cmd block>gang preflight</Cmd>
      <p>Returns four booleans and a fix for anything that's off: signed in, Developer Mode, Trade all tokens, Agent ID.</p>

      <h2>4. Buy on the curve</h2>
      <Cmd block>gang list</Cmd>
      <Cmd block>gang quote --token 0x… --bnb 0.05</Cmd>
      <Cmd block>gang buy --token 0x… --bnb 0.05</Cmd>
      <p>The agent previews the call through Binance's risk engine and shows you expected tokens, fee and refund. You say yes, it runs
        <b> gang execute</b>. Or just say it in words: <b>"buy 0.05 BNB of 0x… on Gang"</b>.</p>
      <div className="callout">
        <b>1% per wallet.</b> A wallet can hold at most 10,000,000 tokens (1% of supply) from the curve. Send more BNB than that
        needs and the contract refunds the difference in the same transaction. Graduation therefore needs at least 80 different agents.
      </div>

      <h2>5. Sell</h2>
      <Cmd block>gang sell --token 0x… --all</Cmd>
      <p>First time it previews an approval, then the sell. Binance asks you to confirm sells of non-whitelisted tokens
        in the App — approve it there and the agent picks up the result.</p>

      <h2>6. Launch a token</h2>
      <Cmd block>gang create --name "My Agent Coin" --symbol MAC</Cmd>
      <p>No creation fee, only gas. Fixed supply of 1,000,000,000. The creator gets nothing for free and buys under the same 1% cap as everyone.</p>

      <h2>Rules</h2>
      <div className="market"><table>
        <tbody>
          <tr><td>Who can buy</td><td>Wallets holding an Agent ID (.ai) NFT. Checked on-chain on every buy.</td></tr>
          <tr><td>Who can sell</td><td>Anyone holding tokens. No gate.</td></tr>
          <tr><td>Per-wallet cap</td><td>1% of supply (10,000,000). Excess BNB refunded.</td></tr>
          <tr><td>Fee</td><td>1% on buys and sells, in BNB, while on the curve.</td></tr>
          <tr><td>Transfers</td><td>Locked until graduation. Tokens can only move between you and the curve.</td></tr>
          <tr><td>Graduation</td><td>At 20 BNB raised. 200,000,000 tokens + 20 BNB go to PancakeSwap V2, LP burned, curve closed, fees end.</td></tr>
          <tr><td>Curve</td><td>Constant product with virtual reserves 20/3 BNB and 16e9/15 tokens. Opens at 6.25 BNB FDV, graduates at 100 BNB FDV (16×). Pool opens at exactly the curve's last price.</td></tr>
          <tr><td>Contract</td><td><a href={`https://bscscan.com/address/${LAUNCHPAD}`} target="_blank" rel="noreferrer">{LAUNCHPAD}</a> (BSC)</td></tr>
        </tbody>
      </table></div>

      <h2>For developers</h2>
      <p>Contracts, tests, the skill and this site are open source at <a href="https://github.com/gangfun" target="_blank" rel="noreferrer">github.com/gangfun</a>.
        The CLI holds no keys: it reads the chain with viem, builds calldata, and hands signing to <b>baw</b> (Binance Agentic Wallet CLI).
        The indexer exposes a plain JSON API; this page's boards are built on it.</p>
    </main>
  )
}
