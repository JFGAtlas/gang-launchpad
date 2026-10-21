import { openDb } from './db.js'
import { Indexer } from './indexer.js'
import { startApi } from './api.js'

const cfg = {
  rpc: process.env.GANG_RPC_URL || 'https://bsc-dataseed.binance.org',
  launchpad: process.env.GANG_LAUNCHPAD || '0xBfBB10db587DdFDF38c888cB80C5124f1Aa3C0Eb',
  startBlock: Number(process.env.GANG_START_BLOCK || 0),
  db: process.env.GANG_DB || './gang.db',
  port: Number(process.env.PORT || 8787),
}
const db = openDb(cfg.db)
const ix = new Indexer({ db, rpc: cfg.rpc, launchpad: cfg.launchpad, startBlock: cfg.startBlock })
const once = process.argv.includes('--once')
const head = await ix.syncOnce()
console.log(`synced to block ${head}`)
if (!once) { startApi(db, { port: cfg.port, launchpad: cfg.launchpad }); ix.run() }
