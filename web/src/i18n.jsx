import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const dict = {
  en: {
    search_ph: 'search address or symbol', stat_trades: 'curve trades', no_results: 'no match', col_mcap: 'mcap (BNB)', k_mcap: 'mcap', chart_mcap: 'mcap', chart_price: 'price',
    nav_markets: 'markets', nav_guide: 'guide', nav_github: 'github',
    hero_1: 'agent-only launchpad on BNB Chain.',
    hero_2: 'curve buys require a Binance Agentic Wallet with an Agent ID. 1% per wallet. 20 BNB graduates to PancakeSwap, LP burned, fees end.',
    stat_tokens: 'tokens', stat_graduated: 'graduated', stat_vol: '24h vol (BNB)',
    tab_hot: 'hot', tab_new: 'new', tab_progress: 'closest', tab_graduated: 'graduated',
    col_token: 'token', col_price: 'price (BNB)', col_fdv: 'fdv', col_vol: '24h vol', col_trades: '24h tx', col_holders: 'holders', col_curve: 'curve', col_age: 'age',
    empty: 'nothing here yet', loading: 'loading…', not_found: 'not found', graduated: 'graduated', curve: 'curve',
    k_price: 'price', k_fdv: 'fdv', k_raised: 'raised', k_progress: 'progress', k_vol: '24h vol', k_holders: 'holders', k_trades: 'trades', k_created: 'created',
    chart: 'price', trades: 'trades', side: 'side', agent: 'agent', bnb: 'BNB', tokens: 'tokens', price: 'price', age: 'age', ago: 'ago',
    buy_title: 'buy with your agent', sell_note: 'graduated. liquidity is on PancakeSwap, the curve is closed.', trade_on_pancake: 'trade on PancakeSwap',
    step_install: 'install the skill', step_preflight: 'check eligibility', step_buy: 'quote, then buy (max 1% per wallet, extra BNB refunded)', step_sell: 'sell any time before graduation (approve in Binance App)',
    holders: 'holders', holders_hint: 'max 1% each', no_holders: 'no holders yet', no_trades: 'no trades yet', copy: 'copy', copied: 'copied',
    footer: 'gang.fun · launchpad', lang: 'lang',
    // guide
    g_title: 'how agents trade on Gang',
    g_intro: 'Gang has no buy button. the internal market is a contract that only accepts buys from wallets holding a SPACE ID Agent ID — a soulbound .ai name only a Binance Agentic Wallet can claim. your agent talks to it through a CLI; you approve in the Binance App.',
    g_s1: '1. set up the wallet (once)',
    g_s1_1: 'Binance App → Wallet → Agentic Wallet → create.',
    g_s1_2: 'claim a .ai Agent ID from the Agent ID banner. this mints the NFT the contract checks.',
    g_s1_3: 'in Agentic Wallet settings enable Developer Mode (lets the agent sign contract calls) and Trade all tokens (otherwise selling is blocked by Binance risk control).',
    g_s1_4: 'fund it with a little BNB on BSC.',
    g_s2: '2. install the skill', g_s2_p: 'works with anything that runs shell commands and reads SKILL.md: Claude Code, Cursor, Codex, OpenClaw, Binance AI Pro.',
    g_s2_then: 'then tell your agent: "sign in to my Binance Agentic Wallet". confirm the pairing code in the App.',
    g_s3: '3. check eligibility', g_s3_p: 'four checks and a fix for each: signed in, Developer Mode, Trade all tokens, Agent ID.',
    g_s4: '4. buy on the curve', g_s4_p: 'the agent previews through Binance risk engine and shows expected tokens, fee and refund. you say yes, it executes. or just say: "buy 0.05 BNB of 0x… on Gang".',
    g_cap: '1% per wallet: a wallet holds at most 10,000,000 tokens from the curve. send more and the contract refunds the difference in the same tx. graduation needs at least 80 agents.',
    g_s5: '5. sell', g_s5_p: 'first time previews an approval, then the sell. Binance asks you to confirm sells in the App; the request expires in minutes.',
    g_s6: '6. launch a token', g_s6_p: 'no creation fee, only gas. fixed supply 1,000,000,000. the creator buys under the same 1% cap as everyone.',
    g_rules: 'rules',
    r_who: 'who can buy', r_who_v: 'wallets holding an Agent ID NFT, checked on-chain on every buy',
    r_sell: 'who can sell', r_sell_v: 'any holder, no gate',
    r_cap: 'per-wallet cap', r_cap_v: '1% of supply, excess BNB refunded',
    r_fee: 'fee', r_fee_v: '1% on curve buys and sells, 0 after graduation',
    r_lock: 'transfers', r_lock_v: 'locked until graduation',
    r_grad: 'graduation', r_grad_v: '20 BNB → 200,000,000 tokens + 20 BNB to PancakeSwap V2, LP burned',
    r_contract: 'contract',
  },
  'zh-CN': {
    search_ph: '搜索合约地址或代币', stat_trades: '内盘成交', no_results: '无匹配', col_mcap: '市值 (BNB)', k_mcap: '市值', chart_mcap: '市值', chart_price: '价格',
    nav_markets: '行情', nav_guide: '指南', nav_github: 'github',
    hero_1: 'BNB Chain 上只有 agent 能参与内盘的发射台。',
    hero_2: '内盘买入需要持有 Agent ID 的 Binance Agentic Wallet。每个钱包最多 1%。筹满 20 BNB 毕业到 PancakeSwap，LP 销毁，不再收费。',
    stat_tokens: '代币', stat_graduated: '已毕业', stat_vol: '24h 成交 (BNB)',
    tab_hot: '热门', tab_new: '最新', tab_progress: '临近毕业', tab_graduated: '已毕业',
    col_token: '代币', col_price: '价格 (BNB)', col_fdv: 'FDV', col_vol: '24h 量', col_trades: '24h 笔数', col_holders: '持有人', col_curve: '进度', col_age: '时间',
    empty: '暂无', loading: '加载中…', not_found: '未找到', graduated: '已毕业', curve: '内盘',
    k_price: '价格', k_fdv: 'FDV', k_raised: '已筹', k_progress: '进度', k_vol: '24h 量', k_holders: '持有人', k_trades: '成交', k_created: '创建',
    chart: '价格', trades: '成交', side: '方向', agent: 'agent', bnb: 'BNB', tokens: '数量', price: '价格', age: '时间', ago: '前',
    buy_title: '用你的 agent 买入', sell_note: '已毕业。流动性在 PancakeSwap，内盘已关闭。', trade_on_pancake: '去 PancakeSwap 交易',
    step_install: '安装 skill', step_preflight: '检查资格', step_buy: '先报价再买入（每钱包最多 1%，多余 BNB 退回）', step_sell: '毕业前随时卖出（在 Binance App 确认）',
    holders: '持有人', holders_hint: '每人最多 1%', no_holders: '暂无持有人', no_trades: '暂无成交', copy: '复制', copied: '已复制',
    footer: 'gang.fun · 发射台', lang: '语言',
    g_title: 'agent 如何在 Gang 交易',
    g_intro: 'Gang 没有买入按钮。内盘是一个合约，只接受持有 SPACE ID Agent ID 的钱包买入，这个 .ai 名字是灵魂绑定的，只有 Binance Agentic Wallet 能领取。你的 agent 通过 CLI 和它交互，你在 Binance App 里确认。',
    g_s1: '1. 设置钱包（一次性）',
    g_s1_1: 'Binance App → 钱包 → Agentic Wallet → 创建。',
    g_s1_2: '从 Agent ID 横幅领取一个 .ai 名字，这会 mint 合约要检查的 NFT。',
    g_s1_3: '在 Agentic Wallet 设置里打开 Developer Mode（允许 agent 签合约调用）和 Trade all tokens（否则卖出会被 Binance 风控拦截）。',
    g_s1_4: '在 BSC 上充一点 BNB。',
    g_s2: '2. 安装 skill', g_s2_p: '任何能执行 shell 命令并读 SKILL.md 的 agent 都可以：Claude Code、Cursor、Codex、OpenClaw、Binance AI Pro。',
    g_s2_then: '然后对 agent 说："登录我的 Binance Agentic Wallet"，在 App 里确认配对码。',
    g_s3: '3. 检查资格', g_s3_p: '四项检查，每项都附修复方法：已登录、Developer Mode、Trade all tokens、Agent ID。',
    g_s4: '4. 内盘买入', g_s4_p: 'agent 会先通过 Binance 风控预览，给你看预计到手数量、手续费和退款。你说确认，它再执行。也可以直接说："在 Gang 上买 0.05 BNB 的 0x…"。',
    g_cap: '每钱包 1%：一个钱包最多从内盘买到 10,000,000 枚。多付的 BNB 在同一笔交易里退回。毕业至少需要 80 个 agent。',
    g_s5: '5. 卖出', g_s5_p: '第一次会先预览授权，再预览卖出。Binance 会要求你在 App 里确认卖出，请求几分钟内过期。',
    g_s6: '6. 发行代币', g_s6_p: '没有创建费，只付 gas。固定供应 1,000,000,000。创建者和所有人一样受 1% 上限。',
    g_rules: '规则',
    r_who: '谁能买', r_who_v: '持有 Agent ID NFT 的钱包，每笔买入链上校验',
    r_sell: '谁能卖', r_sell_v: '任何持有人，无门槛',
    r_cap: '单钱包上限', r_cap_v: '总供应的 1%，多余 BNB 退回',
    r_fee: '手续费', r_fee_v: '内盘买卖各 1%，毕业后为 0',
    r_lock: '转账', r_lock_v: '毕业前锁定',
    r_grad: '毕业', r_grad_v: '20 BNB → 200,000,000 枚 + 20 BNB 进 PancakeSwap V2，LP 销毁',
    r_contract: '合约',
  },
  'zh-TW': {
    search_ph: '搜尋合約地址或代幣', stat_trades: '內盤成交', no_results: '無匹配', col_mcap: '市值 (BNB)', k_mcap: '市值', chart_mcap: '市值', chart_price: '價格',
    nav_markets: '行情', nav_guide: '指南', nav_github: 'github',
    hero_1: 'BNB Chain 上只有 agent 能參與內盤的發射台。',
    hero_2: '內盤買入需要持有 Agent ID 的 Binance Agentic Wallet。每個錢包最多 1%。籌滿 20 BNB 畢業到 PancakeSwap，LP 銷毀，不再收費。',
    stat_tokens: '代幣', stat_graduated: '已畢業', stat_vol: '24h 成交 (BNB)',
    tab_hot: '熱門', tab_new: '最新', tab_progress: '臨近畢業', tab_graduated: '已畢業',
    col_token: '代幣', col_price: '價格 (BNB)', col_fdv: 'FDV', col_vol: '24h 量', col_trades: '24h 筆數', col_holders: '持有人', col_curve: '進度', col_age: '時間',
    empty: '暫無', loading: '載入中…', not_found: '未找到', graduated: '已畢業', curve: '內盤',
    k_price: '價格', k_fdv: 'FDV', k_raised: '已籌', k_progress: '進度', k_vol: '24h 量', k_holders: '持有人', k_trades: '成交', k_created: '建立',
    chart: '價格', trades: '成交', side: '方向', agent: 'agent', bnb: 'BNB', tokens: '數量', price: '價格', age: '時間', ago: '前',
    buy_title: '用你的 agent 買入', sell_note: '已畢業。流動性在 PancakeSwap，內盤已關閉。', trade_on_pancake: '去 PancakeSwap 交易',
    step_install: '安裝 skill', step_preflight: '檢查資格', step_buy: '先報價再買入（每錢包最多 1%，多餘 BNB 退回）', step_sell: '畢業前隨時賣出（在 Binance App 確認）',
    holders: '持有人', holders_hint: '每人最多 1%', no_holders: '暫無持有人', no_trades: '暫無成交', copy: '複製', copied: '已複製',
    footer: 'gang.fun · 發射台', lang: '語言',
    g_title: 'agent 如何在 Gang 交易',
    g_intro: 'Gang 沒有買入按鈕。內盤是一個合約，只接受持有 SPACE ID Agent ID 的錢包買入，這個 .ai 名字是靈魂綁定的，只有 Binance Agentic Wallet 能領取。你的 agent 透過 CLI 和它互動，你在 Binance App 裡確認。',
    g_s1: '1. 設定錢包（一次性）',
    g_s1_1: 'Binance App → 錢包 → Agentic Wallet → 建立。',
    g_s1_2: '從 Agent ID 橫幅領取一個 .ai 名字，這會 mint 合約要檢查的 NFT。',
    g_s1_3: '在 Agentic Wallet 設定裡打開 Developer Mode（允許 agent 簽合約呼叫）和 Trade all tokens（否則賣出會被 Binance 風控攔截）。',
    g_s1_4: '在 BSC 上充一點 BNB。',
    g_s2: '2. 安裝 skill', g_s2_p: '任何能執行 shell 指令並讀 SKILL.md 的 agent 都可以：Claude Code、Cursor、Codex、OpenClaw、Binance AI Pro。',
    g_s2_then: '然後對 agent 說：「登入我的 Binance Agentic Wallet」，在 App 裡確認配對碼。',
    g_s3: '3. 檢查資格', g_s3_p: '四項檢查，每項都附修復方法：已登入、Developer Mode、Trade all tokens、Agent ID。',
    g_s4: '4. 內盤買入', g_s4_p: 'agent 會先透過 Binance 風控預覽，給你看預計到手數量、手續費和退款。你說確認，它再執行。也可以直接說：「在 Gang 上買 0.05 BNB 的 0x…」。',
    g_cap: '每錢包 1%：一個錢包最多從內盤買到 10,000,000 枚。多付的 BNB 在同一筆交易裡退回。畢業至少需要 80 個 agent。',
    g_s5: '5. 賣出', g_s5_p: '第一次會先預覽授權，再預覽賣出。Binance 會要求你在 App 裡確認賣出，請求幾分鐘內過期。',
    g_s6: '6. 發行代幣', g_s6_p: '沒有建立費，只付 gas。固定供應 1,000,000,000。建立者和所有人一樣受 1% 上限。',
    g_rules: '規則',
    r_who: '誰能買', r_who_v: '持有 Agent ID NFT 的錢包，每筆買入鏈上校驗',
    r_sell: '誰能賣', r_sell_v: '任何持有人，無門檻',
    r_cap: '單錢包上限', r_cap_v: '總供應的 1%，多餘 BNB 退回',
    r_fee: '手續費', r_fee_v: '內盤買賣各 1%，畢業後為 0',
    r_lock: '轉帳', r_lock_v: '畢業前鎖定',
    r_grad: '畢業', r_grad_v: '20 BNB → 200,000,000 枚 + 20 BNB 進 PancakeSwap V2，LP 銷毀',
    r_contract: '合約',
  },
}

export const LANGS = [['en', 'EN'], ['zh-CN', '简'], ['zh-TW', '繁']]

function detect() {
  const saved = localStorage.getItem('gang.lang')
  if (saved && dict[saved]) return saved
  for (const l of navigator.languages || [navigator.language || 'en']) {
    const x = l.toLowerCase()
    if (x.startsWith('zh')) return /tw|hk|mo|hant/.test(x) ? 'zh-TW' : 'zh-CN'
    if (x.startsWith('en')) return 'en'
  }
  return 'en'
}

const Ctx = createContext({ lang: 'en', t: (k) => k, setLang: () => {} })
export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(detect)
  useEffect(() => { document.documentElement.lang = lang }, [lang])
  const value = useMemo(() => ({
    lang,
    t: (k) => dict[lang][k] ?? dict.en[k] ?? k,
    setLang: (l) => { localStorage.setItem('gang.lang', l); setLangState(l) },
  }), [lang])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export const useT = () => useContext(Ctx)
