import { useEffect, useRef } from 'react'
import { createChart, CandlestickSeries, HistogramSeries } from 'lightweight-charts'

const SUPPLY = 1e9
/** mode: 'mcap' (BNB FDV = price × 1e9) or 'price' (BNB per token) */
export default function Chart({ candles, mode = 'mcap' }) {
  const ref = useRef(null)
  const chart = useRef(null)
  useEffect(() => {
    if (!ref.current) return
    chart.current = createChart(ref.current, {
      layout: { background: { color: '#0E0E0E' }, textColor: '#5C5C5C', fontFamily: 'Geist Mono, monospace', fontSize: 11, attributionLogo: false },
      grid: { vertLines: { color: '#1A1A1A' }, horzLines: { color: '#1A1A1A' } },
      rightPriceScale: { borderColor: '#1F1F1F', scaleMargins: { top: 0.08, bottom: 0.22 } },
      timeScale: { borderColor: '#1F1F1F', timeVisible: true, barSpacing: 10, minBarSpacing: 4, rightOffset: 6, fixLeftEdge: false },
      autoSize: true, crosshair: { mode: 0 },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
    })
    chart.current._s = {
      c: chart.current.addSeries(CandlestickSeries, { upColor: '#0ECB81', downColor: '#F6465D', borderVisible: false, wickUpColor: '#0ECB81', wickDownColor: '#F6465D' }),
      v: chart.current.addSeries(HistogramSeries, { priceScaleId: 'vol', color: '#303030', priceFormat: { type: 'volume' }, lastValueVisible: false, priceLineVisible: false }),
    }
    chart.current.priceScale('vol').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } })
    return () => chart.current?.remove()
  }, [])
  useEffect(() => {
    const ch = chart.current, s = ch?._s; if (!s || !candles) return
    const k = mode === 'mcap' ? SUPPLY : 1
    s.c.applyOptions({ priceFormat: mode === 'mcap' ? { type: 'price', precision: 2, minMove: 0.01 } : { type: 'price', precision: 10, minMove: 1e-10 } })
    s.c.setData(candles.map((x) => ({ time: x.t, open: x.o * k, high: x.h * k, low: x.l * k, close: x.c * k })))
    s.v.setData(candles.map((x) => ({ time: x.t, value: x.v, color: x.c >= x.o ? 'rgba(14,203,129,.35)' : 'rgba(246,70,93,.35)' })))
    // keep a sane zoom: never stretch a handful of candles across the whole width
    ch.timeScale().applyOptions({ barSpacing: 10, rightOffset: 6 })
    ch.timeScale().scrollToRealTime()
  }, [candles, mode])
  return <div className="chart" ref={ref} />
}
