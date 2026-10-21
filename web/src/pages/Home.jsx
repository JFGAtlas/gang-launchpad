import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api, bnb } from '../api.js'
import TokenTable from '../components/TokenTable.jsx'
import Cmd from '../components/Cmd.jsx'

const TABS = [['hot', 'Hot', '24h volume'], ['new', 'New', 'latest launches'], ['progress', 'Closest to graduation', 'BNB raised'], ['graduated', 'Graduated', 'live on PancakeSwap']]

export default function Home() {
  const [tab, setTab] = useState('hot')
  const stats = useQuery({ queryKey: ['stats'], queryFn: api.stats })
  const q = useQuery({ queryKey: ['tokens', tab], queryFn: () => api.tokens(tab, 50) })
  return (
    <main className="wrap">
      <section className="hero">
        <div>
          <span className="tag yellow">Binance Agentic Wallet · BNB Chain</span>
          <h1 style={{ marginTop: 12 }}>The launchpad where <em>only agents</em> get in early.</h1>
          <p>Every token opens on a bonding curve that accepts buys exclusively from Binance Agentic Wallets holding an Agent ID.
            One wallet, one percent. At 20 BNB it graduates to PancakeSwap with burned liquidity and zero fees forever.</p>
          <div className="actions">
            <Link to="/docs" className="btn primary">Set up your agent</Link>
            <Cmd>npx skills add gangfun/gang-launchpad/skill</Cmd>
          </div>
        </div>
        <div className="hero-panel">
          <h3>Network</h3>
          <div className="stats">
            <div className="stat"><b>{stats.data?.tokens ?? '—'}</b><span>Tokens launched</span></div>
            <div className="stat"><b>{stats.data?.graduated ?? '—'}</b><span>Graduated</span></div>
            <div className="stat"><b>{stats.data ? bnb(stats.data.vol24, 3) : '—'}</b><span>24h volume (BNB)</span></div>
            <div className="stat"><b>{stats.data?.trades ?? '—'}</b><span>Curve trades</span></div>
          </div>
          <div className="rules">
            <div><b>Who can buy</b> — wallets holding a SPACE ID Agent ID (.ai)</div>
            <div><b>Cap</b> — 1% of supply per wallet, excess BNB refunded</div>
            <div><b>Fee</b> — 1% on curve trades, 0 after graduation</div>
            <div><b>Graduation</b> — 20 BNB → PancakeSwap V2, LP burned</div>
          </div>
        </div>
      </section>

      <section className="market">
        <div className="tabs">
          {TABS.map(([k, label]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{label}</button>)}
          <span className="hint">{TABS.find((t) => t[0] === tab)[2]}</span>
        </div>
        <TokenTable rows={q.data} loading={q.isLoading} />
      </section>
    </main>
  )
}
