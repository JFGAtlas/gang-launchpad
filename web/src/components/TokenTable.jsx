import { useNavigate } from 'react-router-dom'
import { ago, bnb, px, short } from '../api.js'
import { useT } from '../i18n.jsx'
import Bar from './Bar.jsx'

export default function TokenTable({ rows, loading }) {
  const nav = useNavigate()
  const { t } = useT()
  if (loading) return <div className="empty">{t('loading')}</div>
  if (!rows?.length) return <div className="empty">{t('empty')}</div>
  return (
    <table>
      <thead><tr>
        <th>{t('col_token')}</th><th className="r">{t('col_price')}</th><th className="r">{t('col_fdv')}</th><th className="r">{t('col_vol')}</th><th className="r">{t('col_trades')}</th><th className="r">{t('col_holders')}</th><th>{t('col_curve')}</th><th className="r">{t('col_age')}</th>
      </tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.address} onClick={() => nav(`/token/${r.address}`)} style={{ cursor: 'pointer' }}>
            <td className="tok"><span className="sym">{r.symbol}</span> <span className="name">{r.name} · {short(r.address)}</span></td>
            <td className="r">{px(r.priceBnb)}</td>
            <td className="r">{bnb(r.fdvBnb, 2)}</td>
            <td className="r">{bnb(r.volume24hBnb || 0, 3)}</td>
            <td className="r">{r.trades24h ?? 0}</td>
            <td className="r">{r.holders}</td>
            <td>{r.graduated ? <span className="tag grad">{t('graduated')}</span> : <><Bar pct={r.progressPct} /> <span style={{ color: 'var(--text-3)' }}>{r.progressPct}%</span></>}</td>
            <td className="r" style={{ color: 'var(--text-3)' }}>{ago(r.lastTradeAt || r.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
