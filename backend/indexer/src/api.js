import http from 'node:http'
import { formatEther } from 'viem'

const GRAD = 20n * 10n ** 18n
const fmtTok = (s) => formatEther(BigInt(s))
const tokRow = (r) => ({
  address: r.address, name: r.name, symbol: r.symbol, creator: r.creator,
  createdAt: r.created_ts, createdTx: r.created_tx,
  graduated: !!r.graduated, pair: r.pair, graduatedAt: r.graduated_ts,
  raisedBnb: formatEther(BigInt(r.real_bnb)), progressPct: Number((BigInt(r.real_bnb) * 10000n) / GRAD) / 100,
  soldTokens: fmtTok(r.sold), priceBnb: formatEther(BigInt(r.last_price)), fdvBnb: formatEther(BigInt(r.last_price) * 1000000000n),
  trades: r.trades, lastTradeAt: r.last_trade_ts,
  volume24hBnb: r.vol24 != null ? formatEther(BigInt(r.vol24)) : undefined,
  trades24h: r.n24, holders: r.holders,
})

export function startApi(db, { port = 8787, launchpad }) {
  const q = {
    list: (order, where = '1=1') => db.prepare(`
      SELECT t.*, (SELECT SUM(CAST(bnb AS REAL)) FROM trades WHERE token=t.address AND ts>?) AS vol24,
             (SELECT COUNT(*) FROM trades WHERE token=t.address AND ts>?) AS n24,
             (SELECT COUNT(*) FROM holders WHERE token=t.address AND balance!='0') AS holders
      FROM tokens t WHERE ${where} ORDER BY ${order} LIMIT ?`),
    one: db.prepare(`SELECT t.*, (SELECT COUNT(*) FROM holders WHERE token=t.address AND balance!='0') AS holders,
             (SELECT SUM(CAST(bnb AS REAL)) FROM trades WHERE token=t.address AND ts>?) AS vol24,
             (SELECT COUNT(*) FROM trades WHERE token=t.address AND ts>?) AS n24 FROM tokens t WHERE address=?`),
    trades: db.prepare('SELECT side,trader,bnb,fee,tokens,price,block,ts,tx FROM trades WHERE token=? ORDER BY ts DESC, id DESC LIMIT ?'),
    candles: db.prepare(`SELECT (CAST(ts AS INTEGER) / CAST(? AS INTEGER)) * CAST(? AS INTEGER) AS t, price, bnb, id FROM trades WHERE token=? AND ts>=? ORDER BY id`),
    holders: db.prepare("SELECT holder, balance FROM holders WHERE token=? AND balance!='0' ORDER BY CAST(balance AS REAL) DESC LIMIT ?"),
    stats: db.prepare(`SELECT (SELECT COUNT(*) FROM tokens) AS tokens, (SELECT COUNT(*) FROM tokens WHERE graduated=1) AS graduated,
             (SELECT COUNT(*) FROM trades) AS trades, (SELECT SUM(CAST(bnb AS REAL)) FROM trades WHERE ts>?) AS vol24,
             (SELECT SUM(CAST(fee AS REAL)) FROM trades) AS fees`),
  }
  const json = (res, code, body) => { res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*' }); res.end(JSON.stringify(body)) }
  const day = () => Math.floor(Date.now() / 1000) - 86400

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x'); const p = url.pathname.split('/').filter(Boolean)
    const limit = Math.min(Number(url.searchParams.get('limit') || 50), 200)
    try {
      if (p[0] === 'stats') { const s = q.stats.get(day()); return json(res, 200, { launchpad, ...s, vol24: s.vol24 ? formatEther(BigInt(Math.round(s.vol24))) : '0', fees: s.fees ? formatEther(BigInt(Math.round(s.fees))) : '0' }) }
      if (p[0] === 'tokens' && !p[1]) {
        const sort = url.searchParams.get('sort') || 'new'
        const orders = { new: 'created_ts DESC', hot: 'vol24 DESC, n24 DESC, created_ts DESC', graduated: 'graduated_ts DESC', progress: 'CAST(real_bnb AS REAL) DESC' }
        const where = sort === 'graduated' ? 'graduated=1' : sort === 'hot' || sort === 'progress' ? 'graduated=0' : '1=1'
        const rows = q.list(orders[sort] || orders.new, where).all(day(), day(), limit)
        return json(res, 200, rows.map((r) => ({ ...tokRow(r), volume24hBnb: r.vol24 ? formatEther(BigInt(Math.round(r.vol24))) : '0' })))
      }
      if (p[0] === 'tokens' && p[1]) {
        const addr = p[1].toLowerCase(); const t = q.one.get(day(), day(), addr)
        if (!t) return json(res, 404, { error: 'not found' })
        if (!p[2]) return json(res, 200, { ...tokRow(t), volume24hBnb: t.vol24 ? formatEther(BigInt(Math.round(t.vol24))) : '0' })
        if (p[2] === 'trades') return json(res, 200, q.trades.all(addr, limit).map((r) => ({ ...r, bnb: formatEther(BigInt(r.bnb)), fee: formatEther(BigInt(r.fee)), tokens: fmtTok(r.tokens), price: formatEther(BigInt(r.price)) })))
        if (p[2] === 'holders') return json(res, 200, q.holders.all(addr, limit).map((r) => ({ holder: r.holder, balance: fmtTok(r.balance), pct: Number(BigInt(r.balance) * 10000n / 10n ** 27n) / 100 })))
        if (p[2] === 'candles') {
          const res_ = { '1m': 60, '5m': 300, '15m': 900, '1h': 3600, '4h': 14400, '1d': 86400 }[url.searchParams.get('res') || '5m'] || 300
          const since = Number(url.searchParams.get('since') || 0)
          const out = []; let cur = null
          for (const r of q.candles.all(res_, res_, addr, since)) {
            const px = Number(formatEther(BigInt(r.price))); const v = Number(formatEther(BigInt(r.bnb)))
            if (!cur || cur.t !== r.t) { if (cur) out.push(cur); cur = { t: r.t, o: px, h: px, l: px, c: px, v } }
            else { cur.h = Math.max(cur.h, px); cur.l = Math.min(cur.l, px); cur.c = px; cur.v += v }
          }
          if (cur) out.push(cur)
          return json(res, 200, out)
        }
      }
      json(res, 404, { error: 'unknown route' })
    } catch (e) { json(res, 500, { error: e.message }) }
  })
  server.listen(port, () => console.log(`api on :${port}`))
  return server
}
