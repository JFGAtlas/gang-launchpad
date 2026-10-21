// usage: node scripts/shot.mjs <url> <out.png> [width] [height]  — screenshots + reports elements wider than the viewport
import puppeteer from 'puppeteer-core'
const [url, out, w = '1440', h = '1000'] = process.argv.slice(2)
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--proxy-server=direct://', '--proxy-bypass-list=*'] })
const page = await browser.newPage()
await page.setViewport({ width: +w, height: +h, deviceScaleFactor: 1, isMobile: +w < 500, hasTouch: +w < 500 })
await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 })
await new Promise((r) => setTimeout(r, 800))
const report = await page.evaluate(() => {
  const vw = document.documentElement.clientWidth
  const wide = [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().right > vw + 1).slice(0, 12)
    .map((e) => `${e.tagName.toLowerCase()}.${[...e.classList].join('.')} right=${Math.round(e.getBoundingClientRect().right)} w=${Math.round(e.getBoundingClientRect().width)}`)
  return { vw, scrollWidth: document.documentElement.scrollWidth, wide }
})
console.log(JSON.stringify(report, null, 1))
await page.screenshot({ path: out, fullPage: false })
await browser.close()
