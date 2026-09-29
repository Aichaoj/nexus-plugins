/**
 * selfcheck.mjs —— 插件自检（模板）
 * 规矩：① 只用 node 内置模块；② 跑真实样例；③ 断言出件物存在且非空；
 *       ④ 成功 exit 0 / 失败 exit 2；⑤ 结束时必须 server.close/进程正常返回（Windows 上不要硬 process.exit）。
 * 用法：node check\selfcheck.mjs
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..')
/** 自检产物一律写系统临时目录，**绝不写进包内**（否则污染发布包） */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-selfcheck-'))

let pass = 0
let fail = 0
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('PASS | ' + name) } else { fail++; console.log('FAIL | ' + name + '  ' + extra) }
}

// ① 样例文件齐备
const sampleIn = path.join(ROOT, 'samples', '{{样例输入}}')
ok('样例输入存在', fs.existsSync(sampleIn), sampleIn)

// ② 跑主脚本（把 {{脚本名}} 换成实际脚本）
const outFile = path.join(TMP, 'out.md')
const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', '{{脚本名}}.mjs'), '--in', sampleIn, '--out', outFile], { encoding: 'utf8' })
ok('主脚本退出码 0', r.status === 0, `status=${r.status} stderr=${(r.stderr || '').slice(0, 300)}`)

// ③ 出件物存在且非空
const exists = fs.existsSync(outFile)
const body = exists ? fs.readFileSync(outFile, 'utf8') : ''
ok('出件物已生成', exists, outFile)
ok('出件物非空（> 50 字符）', body.length > 50, `len=${body.length}`)

// ④ 出件物含关键字段（按插件实际改）
for (const key of ['{{关键字段1}}', '{{关键字段2}}']) {
  ok(`出件物含「${key}」`, body.includes(key))
}

// ⑤ 合规声明（必须带"需持证人复核"或等价免责）
ok('出件物含合规提示', /复核|免责|不替代/.test(body), body.slice(0, 120))

console.log(`\n==== selfcheck: ${pass}/${pass + fail} PASS ====`)
fs.rmSync(TMP, { recursive: true, force: true })
if (fail > 0) process.exitCode = 2
