import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, ago, bnb, px, tok, short } from '../api.js'
import { useT } from '../i18n.jsx'
import Chart from '../components/Chart.jsx'
import Cmd from '../components/Cmd.jsx'

export default function Token() {
  const { t } = useT()
  const { address } = useParams()
  const [res, setRes] = useState('5m')
  const q = useQuery({ queryKey: ['token', address], queryFn: () => api.token(address) })
  const trades = useQuery({ queryKey: ['trades', address], queryFn: () => api.trades(address, 60) })
  const holders = useQuery({ queryKey: ['holders', address], queryFn: () => api.holders(address, 20) })
  const candles = useQuery({ queryKey: ['candles', address, res], queryFn: () => api.candles(address, res) })
  if (q.isLoading) return <main className="wrap"><div className="empty">{t('loading')}</div></main>
  if (q.isError) return <main className="wrap"><div className="empty">{t('not_found')}</div></main>
  const d = q.data
  const W = 48, n = d.graduated ? W : Math.round((d.progressPct / 100) * W)
  return (
    <main className="wrap">
      <div className="ident">
        <h1>{d.symbol}</h1><span className="name">{d.name}</span>
        <a className="addr" href={`https://bscscan.com/token/${d.address}`} target="_blank" rel="noreferrer">{d.address}</a>
        <span className={`tag ${d.graduated ? 'grad' : 'yellow'}`}>{d.graduated ? t('graduated') : t('curve')}</span>
        <div className="spacer" />
        {d.graduated && <a className="btn" href={`https://pancakeswap.finance/swap?outputCurrency=${d.address}&chain=bsc`} target="_blank" rel="noreferrer">{t('trade_on_pancake')} →</a>}
      </div>
      <div className="kv">
        <div><span>{t('k_price')}</span><b>{px(d.priceBnb)}</b></div>
        <div><span>{t('k_fdv')}</span><b>{bnb(d.fdvBnb, 2)} BNB</b></div>
        <div><span>{t('k_raised')}</span><b>{bnb(d.raisedBnb, 4)} / 20</b></div>
        <div><span>{t('k_vol')}</span><b>{bnb(d.volume24hBnb || 0, 3)}</b></div>
        <div><span>{t('k_holders')}</span><b>{d.holders}</b></div>
        <div><span>{t('k_trades')}</span><b>{d.trades}</b></div>
        <div><span>{t('k_created')}</span><b>{ago(d.createdAt)}</b></div>
      </div>
      <div className={`progress${d.graduated ? ' done' : ''}`}>[<i>{'█'.repeat(n)}</i>{'░'.repeat(W - n)}] {d.graduated ? 100 : d.progressPct}%</div>

      <div className="work">
        <div>
          <div className="sec-h">{t('chart')} <div className="seg">{['1m', '5m', '15m', '1h', '4h', '1d'].map((r) => <button key={r} className={r === res ? 'on' : ''} onClick={() => setRes(r)}>{r}</button>)}</div></div>
          <Chart candles={candles.data} />
          <div className="sec-h" style={{ marginTop: 24 }}>{t('trades')}</div>
          {trades.data?.length === 0 && <div className="empty">{t('no_trades')}</div>}
          {trades.data?.length > 0 && (
            <table>
              <thead><tr><th>{t('side')}</th><th>{t('agent')}</th><th className="r">{t('bnb')}</th><th className="r">{t('tokens')}</th><th className="r">{t('price')}</th><th className="r">{t('age')}</th></tr></thead>
              <tbody>{trades.data.map((x) => (
                <tr key={x.tx + x.side}>
                  <td className={x.side === 'buy' ? 'up' : 'down'}>{x.side}</td>
                  <td><a href={`https://bscscan.com/tx/${x.tx}`} target="_blank" rel="noreferrer">{short(x.trader)}</a></td>
                  <td className="r">{bnb(x.bnb, 5)}</td><td className="r">{tok(x.tokens)}</td><td className="r">{px(x.price)}</td><td className="r" style={{ color: 'var(--text-3)' }}>{ago(x.ts)}</td>
                </tr>))}</tbody>
            </table>
          )}
        </div>
        <aside>
          <div className="sec-h">{t('buy_title')}</div>
          {d.graduated ? <p style={{ color: 'var(--text-2)', marginTop: 10 }}>{t('sell_note')}</p> : (
            <div className="howto"><ol>
              <li><b>{t('step_install')}</b><Cmd block>npx skills add gangfun/gang-launchpad/skill</Cmd></li>
              <li><b>{t('step_preflight')}</b><Cmd block>gang preflight</Cmd></li>
              <li><b>{t('step_buy')}</b><Cmd block>{`gang buy --token ${d.address} --bnb 0.05`}</Cmd></li>
              <li><b>{t('step_sell')}</b><Cmd block>{`gang sell --token ${d.address} --all`}</Cmd></li>
            </ol></div>
          )}
          <div className="sec-h" style={{ marginTop: 24 }}>{t('holders')} <span style={{ marginLeft: 'auto', color: 'var(--text-3)' }}>{t('holders_hint')}</span></div>
          {holders.data?.length === 0 && <div className="empty">{t('no_holders')}</div>}
          {holders.data?.length > 0 && (
            <table><thead><tr><th>{t('agent')}</th><th className="r">{t('tokens')}</th><th className="r">%</th></tr></thead>
              <tbody>{holders.data.map((h) => <tr key={h.holder}><td><a href={`https://bscscan.com/address/${h.holder}`} target="_blank" rel="noreferrer">{short(h.holder)}</a></td><td className="r">{tok(h.balance)}</td><td className="r">{h.pct}</td></tr>)}</tbody></table>
          )}
        </aside>
      </div>
    </main>
  )
}
