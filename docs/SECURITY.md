# Gang 安全与产品逻辑审查（2026-10-21）

本文是上线前的自审结论。方法：人工逐行审查、Slither 静态分析、独立对抗式审计 agent、48 个 Foundry 测试（单元 + 不变量 fuzz + 边界 + 主网 fork）、两轮主网真实 Agentic Wallet 探针。

## 1. 产品逻辑

| 规则 | 实现位置 | 结论 |
|---|---|---|
| 只有 agent 能买 | `Launchpad.buy` → `isAgent(msg.sender)` → Agent ID `balanceOf > 0` | 链上校验，每笔买入都查。Agent ID soulbound、mint 需 SPACE ID 签名。 |
| 每钱包最多 1% | `walletRoom = MAX_PER_WALLET − balanceOf`；超出部分反算 BNB 并退回 | 内盘期间转账锁定，余额即净持仓，无法通过转移绕过。 |
| 买卖各 1% | `_quote` / `sell` 中按 BPS 计算，累计到 `accruedFees` | 毕业后无任何费用：合约对已毕业代币的所有函数 revert。 |
| 20 BNB 毕业 | `realBnb == 20 ether` 触发 `_graduate` | 最后一笔只吃到 20 BNB，多余退回；需要 ≥ 80 个不同 agent。 |
| 毕业迁移 | `Migrator.migrate`：WBNB + 代币直接转入 pair → `mint(0xdEaD)` | LP 永久销毁；绕过 Router 避免捐赠 + `sync()` 卡死毕业。 |
| 创建零费用 | `create()` 无 `payable` | 任何人可创建；创建者无任何特权和免费份额。 |
| 转账锁 | `LaunchToken._update`：locked 时只允许与 Launchpad 之间转账 | `approve` 不受影响（卖出需要）；毕业时 Launchpad 调 `unlock()`，不可逆。 |

**产品层面的已知约束（不是漏洞）**

- 毕业门槛 80 个 agent 是硬约束。早期 agent 数量不足时代币可能长期停在内盘，但持有者随时可以卖回曲线，资金不会被锁。
- 卖出非白名单代币需要用户在 Binance App 确认，且确认请求几分钟内过期。这是 Binance 侧策略，Skill 已处理。
- 一个 Binance 账户只能有一个 Agentic Wallet，Sybil 需要多个 KYC 账户。1% 上限是"每钱包"而非"每人"，这是可接受的边界。
- 代币名称和符号不做唯一性校验，可能有仿冒名字；网站应展示完整地址和创建者。

## 2. 代币安全（LaunchToken）

- OpenZeppelin ERC20 v5.1，固定 10 亿供应在构造函数一次 mint 给 Launchpad。
- 没有 owner、mint、burn、pause、黑名单、税、费率、代理、升级。
- 唯一的特殊逻辑是转账锁，只有 Launchpad 能解锁，且只在毕业时解锁一次。
- 毕业后就是一个纯 ERC20，LP 在黑洞地址。不存在毕业后 honeypot 的可能。
- Binance 代币审计 API 对探针代币评级 LOW（1 级），27 项检查仅提示"源码未验证"（现已在 Sourcify 验证）。

## 3. 合约安全（Launchpad / Migrator）

| 风险类别 | 结论 |
|---|---|
| 重入 | `buy` / `sell` 带 `nonReentrant`；状态更新在外部调用之前；`collectFees` 先清零再转账。 |
| 取整 | 新储备用 `ceilDiv`，不变量 `(vB+realBnb)(vT−sold) ≥ k` 在 500k 次随机调用下成立；卖光所有代币的支付总额 ≤ 真实储备（1000 轮 fuzz）。 |
| 资金记账 | `address(this).balance == Σ realBnb + accruedFees`，不变量测试覆盖买、卖、毕业。 |
| 毕业 DoS | pair 预创建 + WBNB 捐赠 + sync 的场景 fork 测试通过；代币在毕业前无法进入 pair，所以 pair 不可能有代币储备或 LP。 |
| 退款 / 付款失败 | 调用者合约拒收 BNB 时整笔 revert，不影响他人。 |
| 费用金库异常 | 费用 pull 模式，金库合约异常只影响 `collectFees`，不影响交易。 |
| 外部依赖 | PancakeSwap V2 Factory / WBNB 为不可升级合约；Agent ID 合约非代理，但其 owner 可改 mint 签名人（见信任模型）。 |

## 4. 信任模型与管理员权限

| 权限 | 最坏情况 | 处理 |
|---|---|---|
| `setMigrator` | 恶意 Migrator 在毕业时拿走 20 BNB + 2 亿代币 | **加固为只能设置一次**（部署时设好后不可更改）。 |
| `setAgentIdRegistry` | 换成任意合约可放开门禁（但 1% 上限仍在） | 保留，用于 SPACE ID 合约迁移；每次变更发事件。 |
| 凭证签发（voucher 路径） | 平台方可给任意地址发凭证绕过 Agent ID 门禁 | **删除 voucher 路径**，门禁只认链上 Agent ID，减少信任面。 |
| `setFeeVault` | 只影响平台自己的手续费去向 | 保留。 |
| SPACE ID 的 Agent ID owner | 可改 mint 签名人、理论上可放开 mint | 外部依赖，无法在我们合约内消除；如发生，owner 可切换注册表。 |

## 5. 独立审计发现与处理（2026-10-21）

审计方式：独立 agent 对 `src/` 做对抗式审查，自行编写 7 个 PoC 测试验证，并在主网核对 Agent ID 合约。结论：**未发现非特权方可以偷取资金、绕过门禁、超出 1%、卡死毕业或使代币成为 honeypot 的路径。** 以下为发现与处理：

| 编号 | 严重度 | 发现 | 处理 |
|---|---|---|---|
| H-1 | 高（信任） | `setMigrator` 可随时换成恶意合约，在毕业时拿走 20 BNB + 2 亿代币 | **已修复**：只能设置一次，之后永久不可变；未设置前 `create()` 拒绝。 |
| H-2 | 高（运维） | owner、凭证签发、金库是同一个热钱包 | **凭证路径已删除**，签发私钥这一风险面不复存在。owner 上线前换成多签（见第 6 节）。 |
| M-1 | 中（外部信任） | 门禁依赖 SPACE ID 的 Agent ID 合约：其 owner 有 `adminRegister` 可给任意地址发名字，`signer == owner` | 合约内无法消除。处理：注册表变更改为 24 小时时间锁，变更前链上可见；索引器监控注册表的非 `register` 来源 mint。 |
| L-1 | 低 | 持有人可把代币直接转回 Launchpad，静默并入 LP 并重开自己的 1% 额度 | **已修复**：转账锁改为只允许 `from == Launchpad` 或 `msg.sender == Launchpad`；毕业时用 `TOTAL_SUPPLY − sold` 而非 `balanceOf`。 |
| L-2 | 低 | 收不到 BNB 的合约钱包在退款 / 卖出时整笔 revert，可能卡住触发毕业的最后一笔 | **已修复**：`_pay` 推送失败时记入 `pendingWithdrawals`，由对方 `withdraw()`。 |
| L-3 | 低 | `spotPrice` / `quoteBuy` / `quoteSell` 对已毕业或未知代币返回脏数据 | **已修复**：统一走 `_live`，直接 revert。 |
| L-4 | 低 | `selfdestruct` 强塞进来的 BNB 永久滞留 | **已修复**：新增 `totalRealBnb` 记账与 `sweepExcess()`，只能清扫超出 `totalRealBnb + accruedFees + totalPending` 的部分。 |
| L-5 | 低 | `setAgentIdRegistry` 可立即换成任意合约 | **已修复**：改为 propose / 24h / apply，可 cancel。 |
| Info | — | `collectFees` 无重入锁；WBNB `transfer` 返回值未检查；Migrator 构造函数无零地址检查 | **已修复**。 |

审计确认安全的部分：曲线取整严格偏向协议（`K = vB·vT` 无松弛，`_bnbOut` 永远不超过 `realBnb`，`_bnbInFor(room) ≤ bnbIn`，退款永不为负）；uint128 / uint256 无溢出；重入全部阻断；Pancake 直接 mint 对代币顺序无关，毕业前 pair 不可能有代币或 LP；毕业 gas 约 260 万到 300 万，由触发毕业的买家支付，BSC 上约 0.0002 到 0.003 BNB。

## 6. 上线前仍需人工完成的事项

1. **owner 换成多签**（建议 2/3，含时间锁更好）。现在 owner 是部署热钱包 `0x4EEd…19d3`。加固后 owner 剩余的权限只有：提议 / 应用注册表变更（24h 时间锁）、改金库地址。
2. **金库地址**独立于 owner。
3. **第三方审计**：本审查是自审加独立 agent 审计，不能替代专业审计公司。合约体量小（三个合约，约 400 行），审计成本低。
4. **监控**：索引器增加对 Agent ID 合约 `Transfer(0x0 → x)` 事件的监听，mint 速率异常即告警。

## 7. 毕业 gas 说明

毕业在触发它的那笔 `buy()` 里原子完成，gas 由该买家的 Agentic Wallet 支付（Binance 预览会预估）。平台不需要预留 gas。若该买家是收不到 BNB 的合约钱包，退款转入 `pendingWithdrawals`，毕业照常完成。
