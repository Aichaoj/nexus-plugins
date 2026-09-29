# 星枢 NEXUS ·「后 AI 时代插件」仓库（本地待发布源）

**NEXUS post-AI plugin shelf** — specs, templates and downloadable plugins that solve real industry workflows (HR, legal, finance, healthcare, manufacturing…). Each plugin ships with a runnable tool, an output template, a self-check and a **real sample deliverable**.
Keywords: `ai` `plugin` `automation` `workflow` `llm` `compliance` `industry` `toolkit`

> 📌 **本仓库已公开（通道 A 承载）**：`https://github.com/Aichaoj/nexus-plugins`
> 定价口径：**国内 99 元 / 国外 99 美元**（技能库条目 `price` / `priceUsd`）；上架与推广按师父口径安排在**国庆节后**支付通道打通时开始。
> 许可：见 `LICENSE`（**专有**：可查看、可下载、可自用；禁止再分发与转售）。

---

## 一、这是什么

把「后 AI 时代插件清单 v1」里的 112 条候选（重量级 12 / 普通级 40 / 轻量级 60），逐条做成**下载即可解决问题**的插件包：

```
插件包 = SKILL.md（AI 可加载的技能说明）
       + README.md（人看的：能解决什么、怎么装、怎么跑）
       + tools/（可执行脚本）
       + templates/（出件模板：表格/文书/清单）
       + check/selfcheck.mjs（自检：跑样例、断言输出非空、退出码 0/2）
       + samples/（一份真实样例输入 + 一份样例出件物）
       + CHANGELOG.md（版本留痕）
```

- **署名与分账**：所有条目**统一以 `daai` 署名**（师父 2026-09-28 口径），分账对象也是 daai。
- **定价**：国内 **99 元** / 国外 **99 美元**（技能库 `price` / `priceUsd` 两字段，双币种已上线）。
- **合规**：只出「提示 / 清单 / 底稿」，不出最终结论；医疗、法律、财务等场景一律标注**需持证人复核**。

## 二、目录

| 路径 | 用途 |
|---|---|
| `specs/plugin-spec.md` | **插件包规范**（结构、验收标准、口径与红线）——做任何一条都先读它 |
| `specs/naming.md` | 编号↔目录名↔版本 对照约定 |
| `templates/` | 新插件模板（复制即可开工） |
| `plugins/<编号>-<英文名>/` | 插件本体（按清单编号：H-xx / S-xx / L-xx） |

## 三、怎么用（做一条新插件）

```powershell
# 1) 复制模板
Copy-Item -Recurse templates plugins\s16-xxx
# 2) 改 SKILL.md / README.md 里的占位符（编号、名称、行业、输入输出）
# 3) 写 tools\ 里的脚本，放一份真实样例到 samples\
# 4) 自测（必须退出码 0）
node plugins\s16-xxx\check\selfcheck.mjs
```

## 四、验收三条（缺一不算完成）

1. `node check/selfcheck.mjs` **退出码 0**；
2. `samples/` 里能看到**真实样例出件物**（用户下单前能看效果）；
3. **不打包任何第三方源码**（只做自有实现 + 官方仓库调用说明）。

## 五、许可与使用（**务必先读**）

- © NEXUS（星枢）· **保留所有权利（All rights reserved）**。
- 允许：**查看、下载、在本机使用**本仓库中的插件包。
- 不允许：**再分发、转售、作为服务对外提供、移除署名**（商业授权请通过星枢 NEXUS 联系）。
- 插件包**不含任何第三方源码**；文中提及的开源项目仅作官方链接引用，其许可归原作者。
- 各插件出件物均为「提示 / 清单 / 底稿」，**辅助不决策**，需持证人复核后采用。

*本仓库由 daai 在星枢 NEXUS 名下发布；改动需师父批准。*
