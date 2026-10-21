import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, ago, bnb, px, tok, short } from '../api.js'
import Chart from '../components/Chart.jsx'
import Cmd from '../components/Cmd.jsx'

export default function Token() {
  const { address } = useParams()
  const [res, setRes] = useState('5m')
  const t = useQuery({ queryKey: ['token', address], queryFn: () => api.token(address) })
  const trades = useQuery({ queryKey: ['trades', address], queryFn: () => api.trades(address, 60) })
  const holders = useQuery({ queryKey: ['holders', address], queryFn: () => api.holders(address, 20) })
  const candles = useQuery({ queryKey: ['candles', address, res], queryFn: () => api.candles(address, res) })
  if (t.isLoading) return <main className="wrap"><div className="empty">Loading</div></main>
  if (t.isError) return <main className="wrap"><div className="empty">Token not found on Gang</div></main>
  const d = t.data
  return (
    <main className="wrap">
      <div className="ident">
        <h1>{d.symbol}</h1>
        <span className="name">{d.name}</span>
        <a className="addr" href={`https://bscscan.com/token/${d.address}`} target="_blank" rel="noreferrer">{d.address}</a>
        {d.graduated ? <span className="tag grad">Graduated</span> : <span className="tag yellow">Bonding curve</span>}
        <div className="spacer" />
        {d.graduated && <a className="btn primary" href={`https://pancakeswap.finance/swap?outputCurrency=${d.address}&chain=bsc`} target="_blank" rel="noreferrer">Trade on PancakeSwap</a>}
      </div>
      <div className="kpis">
        <div className="kpi"><span>Price</span><b>{px(d.priceBnb)}</b></div>
        <div className="kpi"><span>FDV</span><b>{bnb(d.fdvBnb, 2)} BNB</b></div>
        <div className="kpi"><span>Raised</span><b>{bnb(d.raisedBnb, 4)} / 20</b></div>
        <div className="kpi"><span>Progress</span><b>{d.graduated ? '100' : d.progressPct}%</b></div>
        <div className="kpi"><span>24h volume</span><b>{bnb(d.volume24hBnb || 0, 3)}</b></div>
        <div className="kpi"><span>Holders</span><b>{d.holders}</b></div>
        <div className="kpi"><span>Trades</span><b>{d.trades}</b></div>
        <div className="kpi"><span>Created</span><b>{ago(d.createdAt)} ago</b></div>
      </div>
      <div className={`progress-wide${d.graduated ? ' done' : ''}`}><i style={{ width: `${d.graduated ? 100 : Math.max(1, d.progressPct)}%` }} /></div>

      <div className="work">
        <div>
          <div className="panel">
            <h3>Price <span className="seg">{['1m', '5m', '15m', '1h', '4h', '1d'].map((r) => <button key={r} className={r === res ? 'on' : ''} onClick={() => setRes(r)}>{r}</button>)}</span></h3>
            <Chart candles={candles.data} />
          </div>
          <div className="panel">
            <h3>Trades</h3>
            {trades.data?.length === 0 && <div className="empty">No trades yet</div>}
            {trades.data?.length > 0 && (
              <table>
                <thead><tr><th>Side</th><th>Agent</th><th className="r">BNB</th><th className="r">Tokens</th><th className="r">Price</th><th className="r">Age</th></tr></thead>
                <tbody>{trades.data.map((x) => (
                  <tr key={x.tx + x.side}>
                    <td className={x.side === 'buy' ? 'up' : 'down'}>{x.side}</td>
                    <td><a href={`https://bscscan.com/tx/${x.tx}`} target="_blank" rel="noreferrer">{short(x.trader)}</a></td>
                    <td className="r num">{bnb(x.bnb, 5)}</td><td className="r num">{tok(x.tokens)}</td><td className="r num">{px(x.price)}</td><td className="r" style={{ color: 'var(--text-3)' }}>{ago(x.ts)}</td>
                  </tr>))}</tbody>
              </table>
            )}
          </div>
        </div>
        <aside>
          <div className="panel howto">
            <h3>{d.graduated ? 'Trade' : 'Buy with your agent'}</h3>
            {d.graduated ? (
              <p style={{ color: 'var(--text-2)' }}>This token graduated. Liquidity is on PancakeSwap and burned; the curve is closed. Any wallet can trade it now.</p>
            ) : (
              <ol>
                <li><b>Install the skill</b> in your agent (Claude Code, Cursor, OpenClaw…)<Cmd block>npx skills add gangfun/gang-launchpad/skill</Cmd></li>
                <li><b>Check you're eligible</b> — signed in, Developer Mode on, Trade all tokens on, holding a .ai Agent ID<Cmd block>gang preflight</Cmd></li>
                <li><b>Quote, then buy.</b> Max 1% of supply per wallet; extra BNB is refunded<Cmd block>{`gang buy --token ${d.address} --bnb 0.05`}</Cmd></li>
                <li><b>Sell any time</b> before graduation (Binance asks you to approve sells in the App)<Cmd block>{`gang sell --token ${d.address} --all`}</Cmd></li>
              </ol>
            )}
          </div>
          <div className="panel">
            <h3>Holders <small>max 1% each</small></h3>
            {holders.data?.length === 0 && <div className="empty">No holders yet</div>}
            {holders.data?.length > 0 && (
              <table><thead><tr><th>Agent</th><th className="r">Tokens</th><th className="r">%</th></tr></thead>
                <tbody>{holders.data.map((h) => <tr key={h.holder}><td><a href={`https://bscscan.com/address/${h.holder}`} target="_blank" rel="noreferrer">{short(h.holder)}</a></td><td className="r num">{tok(h.balance)}</td><td className="r num">{h.pct}</td></tr>)}</tbody></table>
            )}
          </div>
        </aside>
      </div>
    </main>
  )
}
