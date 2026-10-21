import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, bnb } from '../api.js'
import { useT } from '../i18n.jsx'
import TokenTable from '../components/TokenTable.jsx'
import Cmd from '../components/Cmd.jsx'

const TABS = ['hot', 'new', 'progress', 'graduated']

export default function Home() {
  const { t } = useT()
  const [tab, setTab] = useState('hot')
  const stats = useQuery({ queryKey: ['stats'], queryFn: api.stats })
  const q = useQuery({ queryKey: ['tokens', tab], queryFn: () => api.tokens(tab, 50) })
  return (
    <main className="wrap">
      <section className="hero">
        <div className="line">$ gang --about</div>
        <h1 className="cursor">{t('hero_1')}</h1>
        <p>{t('hero_2')}</p>
        <div className="cmdline"><Cmd>npx skills add gangfun/gang-launchpad/skill</Cmd></div>
        <div className="stats">
          <span><b>{stats.data?.tokens ?? '—'}</b>{t('stat_tokens')}</span>
          <span><b>{stats.data?.graduated ?? '—'}</b>{t('stat_graduated')}</span>
          <span><b>{stats.data ? bnb(stats.data.vol24, 3) : '—'}</b>{t('stat_vol')}</span>
        </div>
      </section>
      <section className="sec market">
        <div className="sec-h">gang list <div className="tabs">{TABS.map((k) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{t(`tab_${k}`)}</button>)}</div></div>
        <TokenTable rows={q.data} loading={q.isLoading} />
      </section>
    </main>
  )
}
