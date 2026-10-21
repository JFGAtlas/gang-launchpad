import { useEffect, useRef } from 'react'
import { createChart, CandlestickSeries, HistogramSeries } from 'lightweight-charts'

export default function Chart({ candles }) {
  const ref = useRef(null)
  const chart = useRef(null)
  useEffect(() => {
    if (!ref.current) return
    chart.current = createChart(ref.current, {
      layout: { background: { color: '#181A20' }, textColor: '#848E9C', fontFamily: 'IBM Plex Sans' },
      grid: { vertLines: { color: '#2B3139' }, horzLines: { color: '#2B3139' } },
      rightPriceScale: { borderColor: '#2B3139' }, timeScale: { borderColor: '#2B3139', timeVisible: true },
      autoSize: true, crosshair: { mode: 0 },
    })
    const c = chart.current.addSeries(CandlestickSeries, { upColor: '#0ECB81', downColor: '#F6465D', borderVisible: false, wickUpColor: '#0ECB81', wickDownColor: '#F6465D', priceFormat: { type: 'price', precision: 10, minMove: 1e-10 } })
    const v = chart.current.addSeries(HistogramSeries, { priceScaleId: 'vol', color: 'rgba(132,142,156,.35)', priceFormat: { type: 'volume' } })
    chart.current.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } })
    chart.current._s = { c, v }
    return () => chart.current?.remove()
  }, [])
  useEffect(() => {
    const s = chart.current?._s; if (!s || !candles) return
    s.c.setData(candles.map((k) => ({ time: k.t, open: k.o, high: k.h, low: k.l, close: k.c })))
    s.v.setData(candles.map((k) => ({ time: k.t, value: k.v, color: k.c >= k.o ? 'rgba(14,203,129,.35)' : 'rgba(246,70,93,.35)' })))
    chart.current.timeScale().fitContent()
  }, [candles])
  return <div className="chart" ref={ref} />
}
