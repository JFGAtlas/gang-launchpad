/** Pixel window frame: title bar with a yellow square, optional right-side controls, body. */
export default function Win({ title, right, flush, children, style, bodyClass }) {
  return (
    <section className="win" style={style}>
      <div className="t"><span className="sq" /><span className="name">{title}</span>{right && <div className="right">{right}</div>}</div>
      <div className={`b${flush ? ' flush' : ''}${bodyClass ? ' ' + bodyClass : ''}`}>{children}</div>
    </section>
  )
}
