import { openDb } from './db.js'
import { Indexer } from './indexer.js'
import { startApi } from './api.js'

const cfg = {
  rpc: process.env.GANG_RPC_URL || 'https://bsc-dataseed.binance.org',
  launchpad: process.env.GANG_LAUNCHPAD || '0x63ec44bC7CC8f3572AC3b3CC5fd4697C27bB55fd',
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
