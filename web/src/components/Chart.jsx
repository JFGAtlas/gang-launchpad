import { useEffect, useRef } from 'react'
import { createChart, CandlestickSeries, HistogramSeries } from 'lightweight-charts'

const SUPPLY = 1e9
// lightweight-charts renders UTC; shift timestamps so the axis reads in the viewer's local time.
const TZ = -new Date().getTimezoneOffset() * 60
const fmt = (v) => (v >= 1000 ? v.toFixed(0) : v >= 10 ? v.toFixed(2) : v >= 0.01 ? v.toFixed(4) : v.toExponential(3))

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
      timeScale: { borderColor: '#1F1F1F', timeVisible: true, secondsVisible: false, barSpacing: 10, minBarSpacing: 4, rightOffset: 6 },
      localization: { priceFormatter: fmt },
      autoSize: true, crosshair: { mode: 0 },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
    })
    chart.current._s = {
      c: chart.current.addSeries(CandlestickSeries, {
        upColor: '#0ECB81', downColor: '#F6465D', borderVisible: false, wickUpColor: '#0ECB81', wickDownColor: '#F6465D',
        priceFormat: { type: 'custom', formatter: fmt, minMove: 1e-12 },
        // never let a near-flat series fill the whole height: pad the range to at least ±1.5% around the middle
        autoscaleInfoProvider: (orig) => {
          const r = orig(); if (!r?.priceRange) return r
          const { minValue, maxValue } = r.priceRange; const mid = (minValue + maxValue) / 2; const half = Math.max((maxValue - minValue) / 2, mid * 0.015)
          return { ...r, priceRange: { minValue: mid - half, maxValue: mid + half } }
        },
      }),
      v: chart.current.addSeries(HistogramSeries, { priceScaleId: 'vol', color: '#303030', priceFormat: { type: 'volume' }, lastValueVisible: false, priceLineVisible: false }),
    }
    chart.current.priceScale('vol').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } })
    return () => chart.current?.remove()
  }, [])
  useEffect(() => {
    const ch = chart.current, s = ch?._s; if (!s || !candles) return
    const k = mode === 'mcap' ? SUPPLY : 1
    s.c.setData(candles.map((x) => ({ time: x.t + TZ, open: x.o * k, high: x.h * k, low: x.l * k, close: x.c * k })))
    s.v.setData(candles.map((x) => ({ time: x.t + TZ, value: x.v, color: x.c >= x.o ? 'rgba(14,203,129,.35)' : 'rgba(246,70,93,.35)' })))
    ch.timeScale().applyOptions({ barSpacing: 10, rightOffset: 6 })
    ch.timeScale().scrollToRealTime()
  }, [candles, mode])
  return <div className="chart" ref={ref} />
}
