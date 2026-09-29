/**
 * check-inbound.mjs —— 入职合规核验（S-15 打样件）
 * ------------------------------------------------------------------
 * 干什么：把「入职材料登记表」逐项对照合规规则，输出**缺失项与风险清单**（底稿），
 *         每条结论都带规则编号与行号，便于 HR 复核与追溯。
 * 不干什么：不判定材料真伪、不替代 HR 负责人或合规持证人的最终判断。
 *
 * 用法：
 *   node tools\check-inbound.mjs --in samples\in-onboarding-6p.csv --out out\台账.md [--ledger out\台账.csv] [--dry-run]
 * 依赖：仅 Node 内置模块（≥18）。
 */
import fs from 'node:fs'
import path from 'node:path'

const RULE_VERSION = 'v1.0'

/* ---------------- 参数 ---------------- */
function parseArgs(argv) {
  const a = { in: '', out: '', ledger: '', dryRun: false }
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i]
    if (k === '--in') a.in = argv[++i] || ''
    else if (k === '--out') a.out = argv[++i] || ''
    else if (k === '--ledger') a.ledger = argv[++i] || ''
    else if (k === '--dry-run') a.dryRun = true
    else if (k === '--help' || k === '-h') {
      console.log('用法: node check-inbound.mjs --in <登记表.csv> --out <台账.md> [--ledger <台账.csv>] [--dry-run]')
      process.exit(0)
    }
  }
  if (!a.in || !a.out) {
    console.error('缺少参数：--in 与 --out 必填（--help 看用法）')
    process.exit(2)
  }
  if (!a.ledger) a.ledger = a.out.replace(/\.md$/i, '') + '.csv'
  return a
}

/* ---------------- CSV 读写（容错、够用即可） ---------------- */
function splitCsvLine(line) {
  const out = []
  let cur = ''
  let q = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++ }
      else if (c === '"') q = false
      else cur += c
    } else if (c === '"') q = true
    else if (c === ',') { out.push(cur); cur = '' }
    else cur += c
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

function readCsv(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')
  if (lines.length < 2) throw new Error('CSV 至少需要表头 + 1 行数据')
  const header = splitCsvLine(lines[0])
  const rows = lines.slice(1).map((l, idx) => ({ lineNo: idx + 2, data: Object.fromEntries(header.map((h, i) => [h, splitCsvLine(l)[i] ?? ''])) }))
  return { header, rows }
}

const esc = (v) => {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

/* ---------------- 工具 ---------------- */
const today = () => new Date().toISOString().slice(0, 10)

/** 本地时间戳（对外出件物用本地时间，不用 UTC，避免使用者误读） */
function localNow() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/** 身份证号校验（GB 11643-1999 校验位）；只判格式，不判真伪 */
function idCheck(id) {
  const s = String(id || '').trim().toUpperCase()
  if (!/^\d{17}[\dX]$/.test(s)) return { ok: false, why: '位数或字符不符合 18 位格式' }
  const w = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
  const codes = '10X98765432'
  let sum = 0
  for (let i = 0; i < 17; i++) sum += Number(s[i]) * w[i]
  if (codes[sum % 11] !== s[17]) return { ok: false, why: '校验位不匹配（可能是录入错误）' }
  return { ok: true, birth: `${s.slice(6, 10)}-${s.slice(10, 12)}-${s.slice(12, 14)}` }
}

function monthsBetween(fromYmd, toYmd) {
  const a = new Date(fromYmd + 'T00:00:00Z')
  const b = new Date(toYmd + 'T00:00:00Z')
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
}

const has = (v) => ['有', '已签', '是', 'Y', 'y', '✓'].includes(String(v || '').trim())
const hasNo = (v) => ['无', '未签', '否', 'N', 'n', '—', '-', ''].includes(String(v || '').trim())

/* ---------------- 规则（R01–R10） ---------------- */
const RULES = {
  R01: '劳动合同必须已签（未签 = 高风险，且不得安排上岗）',
  R02: '身份证复印件必须留存',
  R03: '管理岗 / 技术岗 / 职能岗须留存学历证明（操作岗不作要求）',
  R04: '非应届生须有离职证明；应届生须有三方协议',
  R05: '体检报告须在入职前 6 个月内出具，且不得晚于入职日',
  R06: '银行卡信息须留存（影响发薪）',
  R07: '紧急联系人须填写',
  R08: '合同签订日期不得晚于入职日期（先上岗后签约 = 高风险）',
  R09: '身份证号为 18 位且校验位正确（仅格式校验，不判真伪）',
  R10: '不得使用未满 16 周岁人员；16–18 周岁须做未成年工登记',
}

function checkPerson(row, lineNo) {
  const g = (k) => String(row[k] ?? '').trim()
  const f = []
  const add = (rule, level, msg) => f.push({ rule, level, msg })

  const post = g('岗位类别')
  const hire = g('入职日期')
  const sign = g('合同签订日期')
  const fresh = g('应届生') === '是'

  // R01
  if (!has(g('劳动合同'))) add('R01', '高', `劳动合同为「${g('劳动合同') || '空'}」，须先签约后上岗`)
  // R02
  if (!has(g('身份证复印件'))) add('R02', '中', '身份证复印件未留存')
  // R03
  if (['管理岗', '技术岗', '职能岗'].includes(post) && !has(g('学历证明'))) add('R03', '中', `${post}未留存学历证明`)
  // R04
  if (fresh) { if (!has(g('三方协议'))) add('R04', '中', '应届生未留存三方协议') }
  else if (!has(g('离职证明'))) add('R04', '中', '非应届生未留存离职证明（须排查双重劳动关系）')
  // R05
  const phy = g('体检日期')
  if (!phy) add('R05', '中', '体检报告未登记')
  else if (hire && phy > hire) add('R05', '高', `体检日期(${phy})晚于入职日期(${hire})，属先上岗后体检`)
  else {
    const m = hire ? monthsBetween(phy, hire) : null
    if (m !== null && m > 6) add('R05', '中', `体检报告出具于入职前 ${m} 个月（超 6 个月）`)
  }
  // R06
  if (!has(g('银行卡'))) add('R06', '低', '银行卡信息未留存（影响发薪）')
  // R07
  if (!g('紧急联系人')) add('R07', '低', '紧急联系人未填写')
  // R08
  if (sign && hire && sign > hire) add('R08', '高', `合同签订日期(${sign})晚于入职日期(${hire})`)
  // R09 + R10
  const idr = idCheck(g('身份证号'))
  if (!idr.ok) add('R09', '低', `身份证号格式异常：${idr.why}`)
  else if (hire) {
    const age = Math.floor((monthsBetween(idr.birth, hire) ?? 0) / 12)
    if (age < 16) add('R10', '高', `入职时年龄约 ${age} 周岁，低于 16 周岁（禁用童工）`)
    else if (age < 18) add('R10', '中', `入职时年龄约 ${age} 周岁，须做未成年工登记`)
  }
  const top = f.some((x) => x.level === '高') ? '高' : f.some((x) => x.level === '中') ? '中' : f.some((x) => x.level === '低') ? '低' : '无异常'
  return { lineNo, name: g('姓名'), post, hire, fresh, findings: f, level: top }
}

/* ---------------- 出件物 ---------------- */
function buildMarkdown(results, meta) {
  const stat = { 高: 0, 中: 0, 低: 0 }
  results.forEach((r) => r.findings.forEach((f) => { stat[f.level]++ }))
  const highPeople = results.filter((r) => r.level === '高').length
  const cleanPeople = results.filter((r) => r.level === '无异常').length

  const L = []
  L.push('# 入职合规核验台账（AI 预检底稿）')
  L.push('')
  L.push('> ⚠️ **需 HR 负责人 / 合规持证人复核后采用**：本台账只列提示与缺失项，不替代最终判断，也不判定材料真伪。')
  L.push(`> 输入：\`${meta.input}\` ｜ 生成：${meta.generatedAt} ｜ 规则版本：${RULE_VERSION}（R01–R10） ｜ 核验人数：${results.length}`)
  L.push('')
  L.push('## 一、汇总')
  L.push(`- 高风险 **${highPeople}** 人 ｜ 无异常 **${cleanPeople}** 人`)
  L.push(`- 风险项合计 **${stat.高 + stat.中 + stat.低}** 条：高风险 ${stat.高} / 中风险 ${stat.中} / 低风险 ${stat.低}`)
  L.push('')
  L.push('## 二、逐人明细')
  results.forEach((r, i) => {
    L.push('')
    L.push(`### ${i + 1}. ${r.name || '(未填姓名)'}（${r.post || '—'} / 入职 ${r.hire || '—'}${r.fresh ? ' / 应届生' : ''}）— **${r.level}**`)
    if (!r.findings.length) { L.push('无异常项。'); return }
    L.push('')
    L.push('| 规则 | 等级 | 结论 | 登记表行号 |')
    L.push('|---|---|---|---|')
    r.findings.forEach((f) => L.push(`| ${f.rule} | ${f.level} | ${f.msg} | 第 ${r.lineNo} 行 |`))
  })
  L.push('')
  L.push('## 三、待补/整改清单（按人聚合，便于一次催办）')
  const todo = results.filter((r) => r.findings.length)
  if (!todo.length) L.push('无需补件。')
  else todo.forEach((r) => L.push(`- **${r.name || '(未填姓名)'}**：` + r.findings.map((f) => f.msg).join('；')))
  L.push('')
  L.push('## 四、规则清单（口径依据）')
  Object.entries(RULES).forEach(([k, v]) => L.push(`- **${k}**：${v}`))
  L.push('')
  L.push('## 五、免责')
  L.push('- 本工具**辅助不决策**：结论须由 HR 负责人或合规持证人复核后采用。')
  L.push('- **数据不出本机**：全部在本地运行，不上传任何数据。')
  L.push('- **不承诺效果**：不保证审核通过；身份证号仅做格式校验，不代表真伪结论。')
  L.push('')
  return L.join('\n')
}

function buildLedgerCsv(results) {
  const head = ['姓名', '岗位类别', '入职日期', '风险等级', '问题数', '规则命中', '问题摘要']
  const lines = [head.join(',')]
  results.forEach((r) => {
    lines.push([
      r.name, r.post, r.hire, r.level, r.findings.length,
      r.findings.map((f) => f.rule).join(' '),
      r.findings.map((f) => f.msg).join('；'),
    ].map(esc).join(','))
  })
  return lines.join('\r\n') + '\r\n'
}

/* ---------------- 主流程 ---------------- */
function main() {
  const args = parseArgs(process.argv)
  if (!fs.existsSync(args.in)) { console.error('输入文件不存在：' + args.in); process.exit(2) }
  const { rows } = readCsv(args.in)
  const results = rows.map((r, i) => checkPerson(r.data, r.lineNo ?? i + 2))

  const md = buildMarkdown(results, { input: args.in, generatedAt: localNow() })
  const csv = buildLedgerCsv(results)

  if (args.dryRun) {
    console.log('[dry-run] 不写盘。核验人数=' + results.length)
    console.log(md.split('\n').slice(0, 8).join('\n'))
    return
  }
  fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true })
  fs.writeFileSync(args.out, md, 'utf8')
  fs.mkdirSync(path.dirname(path.resolve(args.ledger)), { recursive: true })
  fs.writeFileSync(args.ledger, csv, 'utf8')

  const stat = { 高: 0, 中: 0, 低: 0 }
  results.forEach((r) => r.findings.forEach((f) => { stat[f.level]++ }))
  console.log(`核验完成：${results.length} 人 ｜ 高风险 ${results.filter((r) => r.level === '高').length} 人 ｜ 风险项 ${stat.高 + stat.中 + stat.低} 条（高 ${stat.高} / 中 ${stat.中} / 低 ${stat.低}）`)
  console.log('出件物：' + path.resolve(args.out))
  console.log('台账 CSV：' + path.resolve(args.ledger))
}

main()
