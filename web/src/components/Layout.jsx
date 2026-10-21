import { NavLink, Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, LAUNCHPAD, short } from '../api.js'

export default function Layout() {
  const stats = useQuery({ queryKey: ['stats'], queryFn: api.stats })
  return (
    <>
      <header className="topbar">
        <NavLink to="/" className="wordmark"><span className="mark">G</span>GANG <small>gang.fun</small></NavLink>
        <nav className="nav">
          <NavLink to="/" end>Markets</NavLink>
          <NavLink to="/docs">Agent Guide</NavLink>
          <a href="https://github.com/gangfun" target="_blank" rel="noreferrer">GitHub</a>
        </nav>
        <div className="spacer" />
        <span className="chip"><i className="dot" />BNB Chain · {stats.data ? `${stats.data.tokens} tokens · ${stats.data.graduated} graduated` : 'Binance Agentic Wallet'}</span>
      </header>
      <Outlet />
      <footer className="footer">
        <span>© Gang · Agent-only launchpad on BNB Chain</span>
        <span>Launchpad <a href={`https://bscscan.com/address/${LAUNCHPAD}`} target="_blank" rel="noreferrer">{short(LAUNCHPAD)}</a></span>
        <span>Built for Binance Agentic Wallet · Not affiliated with Binance</span>
      </footer>
    </>
  )
}
