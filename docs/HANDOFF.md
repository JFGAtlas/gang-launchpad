# Gang 项目交接（2026-10-21）

给下一个 agent 的进度说明。读完这份就能继续干活。

## 1. 项目是什么

**Gang（gang.fun）**：BNB Chain 上的 bonding curve 发射台，内盘只允许 **Binance Agentic Wallet** 买入。模式对标 flap.sh / pump.fun，差别是门禁和分配规则。

| 规则 | 值 |
|---|---|
| 谁能买 | 持有 SPACE ID Agent ID（.ai 名字，soulbound ERC-721，只有 Binance Agentic Wallet 能领）的钱包，合约对 `msg.sender` 做 `balanceOf > 0` 校验 |
| 谁能卖 | 任何持有人 |
| 单钱包上限 | 总供应 1%（1000 万枚），超出的 BNB 同笔退回 |
| 手续费 | 内盘买卖各 1%（BNB），进平台金库；毕业后 0 |
| 创建费 | 0 |
| 供应 | 10 亿固定，8 亿内盘，2 亿留给池子 |
| 毕业 | 筹满 20 BNB → 2 亿代币 + 20 BNB 进 PancakeSwap V2，LP 打黑洞，曲线关闭 |
| 转账 | 毕业前锁定 |
| 曲线 | xy=k，虚拟储备 20/3 BNB 与 16e9/15 枚，开盘 FDV 6.25 BNB，毕业 FDV 100 BNB，池子开盘价等于曲线终点价 |

推论：毕业至少需要 80 个不同的 Agentic Wallet。

## 2. 仓库与目录

| 仓库 | 用途 | 本地 |
|---|---|---|
| `github.com/gangfun/gang-core` | 内部版：全部代码 + 探针记录 + 运维脚本 | `~/gang` |
| `github.com/gangfun/gang-launchpad` | 公开版：合约、Skill、CLI、索引器、网站、英文 README，CI 绿 | `~/gang-launchpad` |

两者代码一致，改动在 `~/gang` 做，再 `rsync` 到 `~/gang-launchpad` 推送（排除 `docs/PROBE-*`、`script/probe.sh`、`.env`、`node_modules`、`gang.db*`）。

`gang-core` 目前是 **public**（转移后我没有 admin 改不了），需要组织 owner（annata / ismyname）设为 private 并给 00xLazy admin。旧仓库 `gangfun/gang`、`gang-web`、`gangfun` 是 9 月的旧模式，不复用，建议 owner 改名 `*-legacy`。

```
src/        Launchpad.sol · LaunchToken.sol · Migrator.sol · interfaces/
test/       Launchpad.t.sol · EdgeCases.t.sol · Invariants.t.sol · fork/Migration.t.sol · mocks/
script/     Deploy.s.sol · probe.sh（内部）
skill/      SKILL.md · references/ · gang-cli/（npm 包 @gangfun/cli，bin: gang）
backend/indexer/   事件 → SQLite → JSON API（:8787）
web/        React + Vite 网站（:5173）
docs/       SPEC.md（曲线数学）· SECURITY.md（审计与加固）· DESIGN.md · PROBE-2026-10-21.md（主网探针记录，内部）
```

## 3. 主网状态（BSC，v3 = 审计加固版，当前生效）

| 合约 | 地址 |
|---|---|
| Launchpad v3 | `0xBfBB10db587DdFDF38c888cB80C5124f1Aa3C0Eb` |
| Migrator v3 | `0x4b1E5a7602c7f7964c08364241c1FE59CB4095C8` |
| Agent ID 注册表（SPACE ID） | `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F` |
| PancakeSwap V2 Factory / WBNB | `0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73` / `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c` |
| 部署区块 | 128858413 |
| 测试代币 GP3 | `0x84961588dc13455f08c444d28517eb918e5cec06` |

Sourcify 已验证（exact match）。v1 `0x6202…4D68`、v2 `0x63ec…55fd` 作废。

| 角色 | 地址 | 说明 |
|---|---|---|
| 手续费金库 | `0x3464aa1097Aa46502Db847E4c6d0A2D52a871Af4` | 用户给的地址，已 `setFeeVault`，已收到第一笔 0.0000398 BNB |

**主网已验证**：用 `gang` CLI 走完 preflight → buy → approve → sell（sell 需用户在 Binance App 确认）；门禁对非持有者 revert；转账锁生效；`setMigrator` 二次调用 revert；`collectFees` 到金库。毕业迁移只在 BSC fork 测试里验证过（需要 80 个钱包 20 BNB），主网未跑。

## 4. 安全状态

- 审查方式：人工 + Slither + 独立对抗式审计 agent（7 个 PoC）+ 51 个 Foundry 测试（单元、边界、不变量 fuzz 50 万次调用、主网 fork）。
- 结论：无非特权方可偷资金 / 绕门禁 / 超 1% / 卡死毕业 / honeypot 的路径。
- 已加固：Migrator 只能设一次；删除凭证路径；注册表变更 24h 时间锁；退款/付款失败转 `pendingWithdrawals` 可提取；`sweepExcess` 清扫强塞 BNB；禁止向 Launchpad 转入代币；view 对已毕业代币 revert。
- 未消除的外部信任：SPACE ID 的 Agent ID 合约 owner 有 `adminRegister` 后门和 `setSigner`。处理是监控 + 时间锁。
- 详见 `docs/SECURITY.md`。

## 5. Binance Agentic Wallet 的实测约束（产品必须知道）

- 它是 MPC 控制的普通 EOA，链上无标记；只有 Agent ID NFT 能证明身份。
- 调合约需要 App 里开 **Developer Mode**（有日限额和到期时间）。
- 卖出非白名单代币需要 App 里开 **Trade all tokens**，否则风控 351803 拦截；开了之后每笔卖出仍要在 App **点确认**，待确认订单几分钟内过期。Skill 已处理（`tx-lock` 轮询）。
- 买入不需要确认。毕业 gas 由触发毕业的买家出，约 260 万到 300 万 gas。
- Agent ID 反查：注册表 `handleOf(address)` 返回名字（如 "lazy"），网站可用来显示 agent 名。
- 没有测试网，Agentic Wallet 只支持主网链。

## 6. 本地运行

```bash
# 合约
cd ~/gang && forge test                                  # 单元 + 不变量
BSC_RPC_URL=https://bsc-dataseed1.bnbchain.org forge test --match-path 'test/fork/*'
# 索引器（v3 从 128858413 回填；publicnode 对 getLogs 友好，dataseed 会限流）
cd ~/gang/backend/indexer && GANG_RPC_URL=https://bsc-rpc.publicnode.com GANG_START_BLOCK=128858413 node --no-warnings src/index.js
# 网站
cd ~/gang/web && npm run dev          # http://localhost:5173，.env 指向 :8787 和 v3 地址
# CLI
node ~/gang/skill/gang-cli/src/index.js preflight | list | quote | buy | sell | create | execute | tx
# 截图验收（本机 Chrome 无头，绕过 Surge 代理）
export no_proxy=127.0.0.1,localhost; node ~/gang/web/scripts/shot.mjs http://localhost:5173/ /tmp/a.png 1440 900
```

注意：本机有 Surge 代理，访问 127.0.0.1 要设 `no_proxy`；Google Fonts 不可达，字体全部自托管。

## 7. 网站现状

- 风格：像素终端 + Blur 的清爽。标题/数字/区块标题用 Fusion Pixel（OFL，按语言加载 latin/hans/hant），正文 Geist Mono；2px 直角框、硬阴影、块状进度条；强调色币安黄 `#FCD535`。
- Logo：自绘 6×7 格粗像素字母 GANG（`web/public/brand/`，含头像、OG 图、favicon）。
- i18n：en / zh-CN / zh-TW，按设备语言自动匹配，右上角可切。
- 页面：行情（Hot/New/Closest/Graduated 表格）、代币页（2×2 卡片：市值/价格 K 线、agent 交易指引、成交、持有人）、指南。顶栏搜索支持合约地址和符号。
- 数字：市值和成交额按 Binance BNB/USDT 现价换算成美元；小数用 `0.0₈625` 写法；K 线有 OHLC legend，纵轴最小区间 ±1.5%，按浏览器时区。
- 未上线：没有托管。方案是前端 Vercel + 一台小 VPS 跑索引器，域名 gang.fun。

## 8. 待办（按优先级）

1. **owner 换多签**，金库已独立。
2. **第三方审计**（三个合约约 400 行）。
3. **组织权限**：gang-core 设私有、给 admin；旧仓库改名。
4. **托管上线**：索引器 VPS + 前端 + 域名；索引器加 Agent ID 合约 mint 监控告警。
5. **Binance BD**：把 Gang 代币加入 Agentic Wallet 允许列表（免 Trade all tokens 和每笔确认）；提交 Skill 到 Binance Skills Hub。
6. **npm 发布** `@gangfun/cli`，让 `npx skills add gangfun/gang-launchpad/skill` 安装后 `gang` 命令可用（现在要 `npm link`）。
7. 网站细节：代币页显示 agent 名字（`handleOf`）；创建者展示；毕业后 PancakeSwap 数据接入。
8. 增收模块（创建者分成、税币）明确放到 v2，第一版不做。
