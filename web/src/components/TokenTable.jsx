import { useNavigate } from 'react-router-dom'
import { ago, bnb, px, short } from '../api.js'

export default function TokenTable({ rows, loading }) {
  const nav = useNavigate()
  if (loading) return <div className="empty">Loading</div>
  if (!rows?.length) return <div className="empty">Nothing here yet</div>
  return (
    <table>
      <thead><tr>
        <th>Token</th><th className="r">Price (BNB)</th><th className="r">FDV</th><th className="r">24h Vol</th><th className="r">24h Trades</th><th className="r">Holders</th><th>Curve</th><th className="r">Age</th>
      </tr></thead>
      <tbody>
        {rows.map((t) => (
          <tr key={t.address} onClick={() => nav(`/token/${t.address}`)} style={{ cursor: 'pointer' }}>
            <td><div className="tok"><span className="avatar">{t.symbol.slice(0, 2)}</span><div><div className="sym">{t.symbol}</div><div className="name">{t.name} · {short(t.address)}</div></div></div></td>
            <td className="r num">{px(t.priceBnb)}</td>
            <td className="r num">{bnb(t.fdvBnb, 2)}</td>
            <td className="r num">{bnb(t.volume24hBnb || 0, 3)}</td>
            <td className="r num">{t.trades24h ?? 0}</td>
            <td className="r num">{t.holders}</td>
            <td>{t.graduated ? <span className="tag grad">Graduated</span> : <><span className="bar"><i style={{ width: `${Math.max(1, t.progressPct)}%` }} /></span><span className="num" style={{ fontSize: 12, color: 'var(--text-2)' }}>{t.progressPct}%</span></>}</td>
            <td className="r" style={{ color: 'var(--text-3)' }}>{ago(t.lastTradeAt || t.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
