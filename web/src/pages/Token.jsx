import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, ago, bnb, px, tok, short, usd } from '../api.js'
import { useT } from '../i18n.jsx'
import Chart from '../components/Chart.jsx'
import Cmd from '../components/Cmd.jsx'
import Win from '../components/Win.jsx'

export default function Token() {
  const { t } = useT()
  const { address } = useParams()
  const [res, setRes] = useState('5m')
  const [mode, setMode] = useState('mcap')
  const q = useQuery({ queryKey: ['token', address], queryFn: () => api.token(address) })
  const trades = useQuery({ queryKey: ['trades', address], queryFn: () => api.trades(address, 60) })
  const holders = useQuery({ queryKey: ['holders', address], queryFn: () => api.holders(address, 20) })
  const candles = useQuery({ queryKey: ['candles', address, res], queryFn: () => api.candles(address, res) })
  const rate = useQuery({ queryKey: ['stats'], queryFn: api.stats }).data?.bnbUsd || 0
  if (q.isLoading) return <main className="wrap"><div className="empty">{t('loading')}</div></main>
  if (q.isError) return <main className="wrap"><div className="empty">{t('not_found')}</div></main>
  const d = q.data
  const pct = d.graduated ? 100 : d.progressPct
  return (
    <main className="wrap">
      <div className="ident">
        <h1>{d.symbol}</h1><span className="name">{d.name}</span>
        <a className="addr" href={`https://bscscan.com/token/${d.address}`} target="_blank" rel="noreferrer">{d.address}</a>
        <span className={`badge ${d.graduated ? 'grad' : 'yellow'}`}>{d.graduated ? t('graduated') : t('curve')}</span>
        <div className="spacer" />
        {d.graduated && <a className="btn" href={`https://pancakeswap.finance/swap?outputCurrency=${d.address}&chain=bsc`} target="_blank" rel="noreferrer">{t('trade_on_pancake')} →</a>}
      </div>
      <div className="kv">
        <div><span>{t('k_mcap')}</span><b>{usd(d.fdvBnb * rate)}</b><small>{bnb(d.fdvBnb, 2)} BNB</small></div>
        <div><span>{t('k_price')}</span><b>{px(d.priceBnb)} BNB</b><small>{usd(d.priceBnb * rate)}</small></div>
        <div><span>{t('k_raised')}</span><b>{bnb(d.raisedBnb, 4)} / 20 BNB</b><small>{usd(d.raisedBnb * rate)}</small></div>
        <div><span>{t('k_vol')}</span><b>{usd((d.volume24hBnb || 0) * rate)}</b><small>{bnb(d.volume24hBnb || 0, 4)} BNB</small></div>
        <div><span>{t('k_holders')}</span><b>{d.holders}</b></div>
        <div><span>{t('k_trades')}</span><b>{d.trades}</b></div>
        <div><span>{t('k_created')}</span><b>{ago(d.createdAt)}</b></div>
      </div>
      <div className={`pwide${d.graduated ? ' done' : ''}`}><i style={{ width: `${Math.max(1, pct)}%` }} /><span>{t('k_progress')} {pct}%</span></div>

      <div className="work">
          <Win title={mode === 'mcap' ? t('k_mcap') : t('k_price')} flush bodyClass="chart-body" right={<>
            <div className="seg">{['mcap', 'price'].map((m) => <button key={m} className={m === mode ? 'on' : ''} onClick={() => setMode(m)}>{t(`chart_${m}`)}</button>)}</div>
            <div className="seg">{['1m', '5m', '15m', '1h', '4h', '1d'].map((r) => <button key={r} className={r === res ? 'on' : ''} onClick={() => setRes(r)}>{r}</button>)}</div>
          </>}>
            <Chart candles={candles.data} mode={mode} rate={rate} />
          </Win>
          <Win title={t('buy_title')}>
            {d.graduated ? <p className="muted">{t('sell_note')}</p> : (
              <div className="howto"><ol>
                <li><b>{t('step_install')}</b><Cmd block>npx skills add gangfun/gang-launchpad/skill</Cmd></li>
                <li><b>{t('step_preflight')}</b><Cmd block>gang preflight</Cmd></li>
                <li><b>{t('step_buy')}</b><Cmd block>{`gang buy --token ${d.address} --bnb 0.05`}</Cmd></li>
                <li><b>{t('step_sell')}</b><Cmd block>{`gang sell --token ${d.address} --all`}</Cmd></li>
              </ol></div>
            )}
          </Win>
          <Win title={t('trades')} flush>
            {trades.data?.length === 0 && <div className="empty">{t('no_trades')}</div>}
            {trades.data?.length > 0 && (
              <table>
                <thead><tr><th>{t('side')}</th><th>{t('agent')}</th><th className="r">{t('bnb')}</th><th className="r">{t('tokens')}</th><th className="r">{t('k_mcap')}</th><th className="r">{t('age')}</th></tr></thead>
                <tbody>{trades.data.map((x) => (
                  <tr key={x.tx + x.side}>
                    <td className={x.side === 'buy' ? 'up' : 'down'}>{x.side}</td>
                    <td><a href={`https://bscscan.com/tx/${x.tx}`} target="_blank" rel="noreferrer">{short(x.trader)}</a></td>
                    <td className="r num">{bnb(x.bnb, 5)}</td><td className="r num">{tok(x.tokens)}</td><td className="r num">{usd(Number(x.price) * 1e9 * rate)}</td><td className="r dim">{ago(x.ts)}</td>
                  </tr>))}</tbody>
              </table>
            )}
          </Win>
          <Win title={t('holders')} flush right={<span className="dim">{t('holders_hint')}</span>}>
            {holders.data?.length === 0 && <div className="empty">{t('no_holders')}</div>}
            {holders.data?.length > 0 && (
              <table><thead><tr><th>{t('agent')}</th><th className="r">{t('tokens')}</th><th className="r">%</th></tr></thead>
                <tbody>{holders.data.map((h) => <tr key={h.holder}><td><a href={`https://bscscan.com/address/${h.holder}`} target="_blank" rel="noreferrer">{short(h.holder)}</a></td><td className="r num">{tok(h.balance)}</td><td className="r num">{h.pct}</td></tr>)}</tbody></table>
            )}
          </Win>
      </div>
    </main>
  )
}
