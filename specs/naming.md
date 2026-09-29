# 编号与命名约定（`plugins-src`）

## 1. 编号 ↔ 目录名 ↔ 条目标题

| 编号 | 目录名 | 行业（群键） |
|---|---|---|
| `H-01` | `h01-gov-subsidy-evidence` | 政务 gov |
| `S-15` | `s15-onboarding-compliance` | 人力 hr |
| `L-55` | `l55-audiobook-prooflisten` | 文化 culture |

规则：**编号小写 + 英文短横线名**（全小写、不含空格与中文）；编号必须与 `docs/plugins/清单-后AI时代插件-v1.csv` 一致，改名前先查清单。

## 2. 版本

- 目录名**不带版本**；版本写在 `SKILL.md` 头部与 `CHANGELOG.md`。
- `vMAJOR.MINOR`：行为变化升 MINOR；输入/输出契约变化升 MAJOR。

## 3. 内部文件命名

| 用途 | 约定 | 例 |
|---|---|---|
| 主脚本 | `tools/<动作>.mjs` | `tools/check-inbound.mjs` |
| 出件模板 | `templates/<出件物名>.csv` | `templates/入职合规核验台账.csv` |
| 样例输入 | `samples/in-<场景>.csv` | `samples/in-onboarding-6p.csv` |
| 样例出件物 | `samples/out-<场景>.md` | `samples/out-onboarding-6p.md` |
| 自检 | `check/selfcheck.mjs` | 固定名，不许改 |

## 4. 上架字段对照（节后提交技能库时照填）

| 技能库字段 | 取值 |
|---|---|
| `name` | 插件中文名（如「入职合规核验机器人」） |
| `descZh` / `desc` | 一句话（中 / 英） |
| `g` / `sub` | 行业群键 / 子类键（见 15 群 TAXONOMY） |
| `price` / `priceUsd` | `99` / `99` |
| `url` | 通道 A 的公开仓库地址（`https://gitee.com/<owner>/nexus-plugins`） |
| `detailZh/detailEn/planZh/planEn` | 四段付费内容（各 ≤4000 字），`planZh/planEn` 里写下**下载页地址与口令** |
| 署名 | **daai**（`submitterName=daai`，分账对象同） |

*本约定由艾小宝 2026-09-28 建立；改动需师父批准。*
