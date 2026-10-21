const CREW = ["....#......#......#....", "...#.......#.......#...", ".#####...#####...#####.", ".#####...#####...#####.", ".#.#.#...#.#.#...#.#.#.", ".#####...#####...#####.", "..###.....###.....###..", "#.###.#..#####...#####.", ".#####..#..#..#...###.#", "..###...#.###.#...###..", "..#.#.....#.#.....#.#..", ".##.##...##.##...##.##."]
const AGENT = ["...#...", "...#...", ".#####.", ".#####.", ".#.#.#.", ".#####.", "..###..", ".#####.", "#..#..#", "#.###.#", "..#.#..", ".##.##."]
const Px = ({ rows, size, color = 'var(--yellow)' }) => (
  <svg width={rows[0].length * size} height={rows.length * size} viewBox={`0 0 ${rows[0].length} ${rows.length}`} shapeRendering="crispEdges" fill={color} aria-hidden="true">
    {rows.flatMap((row, y) => [...row].map((c, x) => (c === '#' ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" /> : null)))}
  </svg>
)
/** three pixel agents — the gang */
export const Crew = ({ size = 2 }) => <Px rows={CREW} size={size} />
/** one pixel agent */
export const Agent = ({ size = 2 }) => <Px rows={AGENT} size={size} />
export default function Logo() {
  return <span className="logo-lock"><Crew size={2} /><span className="logo-word">GANG</span></span>
}
