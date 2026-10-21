import puppeteer from 'puppeteer-core'
import { readFileSync } from 'node:fs'
const [file, out, w = '1400', h = '700'] = process.argv.slice(2)
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--proxy-server=direct://', '--proxy-bypass-list=*'] })
const page = await browser.newPage(); await page.setViewport({ width: +w, height: +h })
await page.setContent(readFileSync(file, 'utf8')); await page.screenshot({ path: out }); await browser.close()
