/** ASCII progress bar: ████░░░░ 42% */
export default function Bar({ pct, done, width = 16 }) {
  const n = done ? width : Math.round((Math.min(100, Math.max(0, pct)) / 100) * width)
  return <span className={`bar-ascii${done ? ' done' : ''}`}><i>{'█'.repeat(n)}</i>{'░'.repeat(width - n)}</span>
}
