export const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8787'
export const LAUNCHPAD = import.meta.env.VITE_LAUNCHPAD || '0x63ec44bC7CC8f3572AC3b3CC5fd4697C27bB55fd'
const get = (p) => fetch(`${API}${p}`).then((r) => { if (!r.ok) throw new Error(`${r.status}`); return r.json() })
export const api = {
  stats: () => get('/stats'),
  tokens: (sort, limit = 20) => get(`/tokens?sort=${sort}&limit=${limit}`),
  token: (a) => get(`/tokens/${a}`),
  trades: (a, limit = 50) => get(`/tokens/${a}/trades?limit=${limit}`),
  holders: (a, limit = 20) => get(`/tokens/${a}/holders?limit=${limit}`),
  candles: (a, res) => get(`/tokens/${a}/candles?res=${res}`),
}
export const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '')
export const ago = (ts) => { if (!ts) return '—'; const s = Math.max(1, Math.floor(Date.now() / 1000 - ts)); return s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m` : s < 86400 ? `${Math.floor(s / 3600)}h` : `${Math.floor(s / 86400)}d` }
export const bnb = (v, d = 4) => Number(v).toLocaleString('en-US', { maximumFractionDigits: d })
export const px = (v) => { const n = Number(v); return n === 0 ? '0' : n < 1e-6 ? n.toExponential(3) : n.toFixed(8) }
export const tok = (v) => Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })
