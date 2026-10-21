import puppeteer from 'puppeteer-core'
import { readFileSync } from 'node:fs'
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--proxy-server=direct://', '--proxy-bypass-list=*'] })
const page = await browser.newPage()
for (const [name, w, h] of [['avatar', 512, 512], ['og', 1200, 630], ['lockup', 704, 160]]) {
  const svg = readFileSync(`/Users/lazy/gang/web/public/brand/${name}.svg`, 'utf8')
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 })
  await page.setContent(`<html><head><style>@font-face{font-family:"FP Latin";src:url("file:///Users/lazy/gang/web/public/fonts/fp-latin.woff2") format("woff2")}</style></head><body style="margin:0;background:#080808">${svg.replace('<svg ', `<svg width="${w}" height="${h}" `)}</body></html>`)
  await page.evaluate(() => document.fonts.ready)
  await new Promise((r) => setTimeout(r, 300))
  await page.screenshot({ path: `/Users/lazy/gang/web/public/brand/${name}.png`, clip: { x: 0, y: 0, width: w, height: h } })
}
await browser.close()
console.log('png ok')
