import { useState } from 'react'
import { useT } from '../i18n.jsx'
export default function Cmd({ children, block }) {
  const { t } = useT()
  const [ok, setOk] = useState(false)
  const copy = () => navigator.clipboard?.writeText(children).then(() => { setOk(true); setTimeout(() => setOk(false), 1200) })
  return (
    <div className={`cmd${block ? ' block' : ''}`}>
      <code>{children}</code>
      <button onClick={copy} aria-label="copy">[{ok ? t('copied') : t('copy')}]</button>
    </div>
  )
}
