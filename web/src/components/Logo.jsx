const WORD = [".####...####..##..##..####.", "##..##.##..##.###.##.##..##", "##.....##..##.######.##....", "##.###.######.##.###.##.###", "##..##.##..##.##..##.##..##", "##..##.##..##.##..##.##..##", ".####..##..##.##..##..####."]
const G = [".####.", "##..##", "##....", "##.###", "##..##", "##..##", ".####."]
const Px = ({ rows, size, color = 'var(--yellow)', className }) => (
  <svg className={className} width={rows[0].length * size} height={rows.length * size} viewBox={`0 0 ${rows[0].length} ${rows.length}`} shapeRendering="crispEdges" fill={color} aria-hidden="true">
    {rows.flatMap((row, y) => [...row].map((c, x) => (c === '#' ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" /> : null)))}
  </svg>
)
/** GANG pixel wordmark. size = px per grid cell. */
export const Word = ({ size = 3, color }) => <Px rows={WORD} size={size} color={color} />
/** single pixel G */
export const Mark = ({ size = 3, color }) => <Px rows={G} size={size} color={color} />
export default function Logo() {
  return <span className="logo-lock" aria-label="GANG"><Word size={3} /><i className="logo-cursor" /></span>
}
