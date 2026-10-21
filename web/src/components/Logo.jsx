const G = ['..#####.', '.##...##', '##......', '##......', '##..####', '##....##', '.##..##.', '..####..']
/** 8×8 pixel G. size = px per pixel. */
export function Mark({ size = 2.5, color = 'var(--yellow)' }) {
  const s = 8 * size
  return (
    <svg width={s} height={s} viewBox="0 0 8 8" shapeRendering="crispEdges" fill={color} aria-hidden="true">
      {G.flatMap((row, y) => [...row].map((c, x) => (c === '#' ? <rect key={`${x}${y}`} x={x} y={y} width="1" height="1" /> : null)))}
    </svg>
  )
}
export default function Logo() {
  return (
    <span className="logo-lock"><Mark /><span className="logo-word">GANG</span></span>
  )
}
