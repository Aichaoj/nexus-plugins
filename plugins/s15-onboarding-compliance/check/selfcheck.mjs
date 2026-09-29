/**
 * selfcheck.mjs —— S-15 入职合规核验 自检
 * 跑真实样例 → 断言出件物生成、非空、含规则编号与行号追溯、含合规提示 → 退出码 0/2
 * 用法：node check\selfcheck.mjs
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..')
/** 自检产物一律写系统临时目录，**绝不写进包内**（否则污染发布包，2026-09-28 实测踩到） */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 's15-selfcheck-'))

let pass = 0
let fail = 0
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('PASS | ' + name) } else { fail++; console.log('FAIL | ' + name + '  ' + extra) }
}

const sampleIn = path.join(ROOT, 'samples', 'in-onboarding-6p.csv')
ok('样例输入存在', fs.existsSync(sampleIn), sampleIn)

const outMd = path.join(TMP, 'out.md')
const outCsv = path.join(TMP, 'out.csv')
const r = spawnSync(process.execPath, [
  path.join(ROOT, 'tools', 'check-inbound.mjs'),
  '--in', sampleIn, '--out', outMd, '--ledger', outCsv,
], { encoding: 'utf8' })
ok('主脚本退出码 0', r.status === 0, `status=${r.status} stderr=${(r.stderr || '').slice(0, 300)}`)

const mdExists = fs.existsSync(outMd)
const md = mdExists ? fs.readFileSync(outMd, 'utf8') : ''
ok('出件物（Markdown）已生成', mdExists, outMd)
ok('出件物非空（> 500 字符）', md.length > 500, `len=${md.length}`)

const csvExists = fs.existsSync(outCsv)
const csv = csvExists ? fs.readFileSync(outCsv, 'utf8') : ''
ok('台账 CSV 已生成', csvExists, outCsv)
ok('CSV 表头正确', csv.split(/\r?\n/)[0] === '姓名,岗位类别,入职日期,风险等级,问题数,规则命中,问题摘要', csv.split(/\r?\n/)[0])

// 追溯性：每条结论都带规则编号与行号
ok('出件物含规则编号 R01/R05/R10', ['R01', 'R05', 'R10'].every((k) => md.includes(k)))
ok('出件物含登记表行号追溯', /第 \d+ 行/.test(md))
// 覆盖判定：样例里应出现高风险与无异常两类结论
ok('出件物含高风险结论', md.includes('高风险'))
ok('出件物含无异常结论', md.includes('无异常'))
// 合规提示
ok('出件物含合规提示（需复核/不替代）', /需 HR 负责人 \/ 合规持证人复核后采用/.test(md) && md.includes('辅助不决策'))
// 六人全核验
ok('核验人数=6', md.includes('核验人数：6'))
// 负向：输入缺失时脚本应报错退出（不静默成功）
const bad = spawnSync(process.execPath, [
  path.join(ROOT, 'tools', 'check-inbound.mjs'),
  '--in', path.join(TMP, 'nope.csv'), '--out', path.join(TMP, 'x.md'),
], { encoding: 'utf8' })
ok('输入不存在时退出码非 0（不静默成功）', bad.status !== 0, `status=${bad.status}`)

console.log(`\n==== selfcheck: ${pass}/${pass + fail} PASS ====`)
fs.rmSync(TMP, { recursive: true, force: true })
if (fail > 0) process.exitCode = 2
