import { useState } from 'react'
export default function Cmd({ children, block }) {
  const [ok, setOk] = useState(false)
  const copy = () => navigator.clipboard?.writeText(children).then(() => { setOk(true); setTimeout(() => setOk(false), 1200) })
  return (
    <div className={`cmd${block ? ' block' : ''}`}>
      <code>{children}</code>
      <button onClick={copy} aria-label="copy">{ok ? 'copied' : 'copy'}</button>
    </div>
  )
}
