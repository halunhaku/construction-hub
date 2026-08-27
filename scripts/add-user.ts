import { spawnSync } from 'node:child_process'
import { hashPassword } from '../functions/api/password.ts'

const DB = 'three-photos-db'

function usage(): never {
  console.error(`用法:
  npm run user:add -- --username 张三 --password '口令' --remote
  npm run user:add -- --username 张三 --password '口令' --local
  npm run user:add -- --username 张三 --password '新口令' --remote --update

必须带 --local 或 --remote。--update 表示用户已存在时只改密码。`)
  process.exit(1)
}

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`
}

function parseArgs(argv: string[]) {
  let username = ''
  let password = ''
  let remote = false
  let local = false
  let update = false
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!
    if (arg === '--username' || arg === '-u') username = argv[++i] ?? ''
    else if (arg === '--password' || arg === '-p') password = argv[++i] ?? ''
    else if (arg === '--remote') remote = true
    else if (arg === '--local') local = true
    else if (arg === '--update') update = true
    else if (arg === '--help' || arg === '-h') usage()
  }
  return { username: username.trim(), password, remote, local, update }
}

function runSql(sql: string, remote: boolean): { ok: boolean; stdout: string; stderr: string } {
  const result = spawnSync(
    'npx',
    ['wrangler', 'd1', 'execute', DB, '--command', sql, '--json', remote ? '--remote' : '--local'],
    { encoding: 'utf8' },
  )
  return {
    ok: result.status === 0,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  }
}

function existingUsername(stdout: string): boolean {
  try {
    const parsed = JSON.parse(stdout) as unknown
    const rows = Array.isArray(parsed)
      ? parsed.flatMap((item) => {
          if (item && typeof item === 'object' && 'results' in item && Array.isArray((item as { results: unknown }).results)) {
            return (item as { results: unknown[] }).results
          }
          return []
        })
      : []
    return rows.length > 0
  } catch {
    return stdout.includes('"username"')
  }
}

const args = parseArgs(process.argv.slice(2))
if (!args.username || !args.password) usage()
if (args.remote === args.local) {
  console.error('请只指定一个目标：--local 或 --remote')
  usage()
}

const hash = await hashPassword(args.password)
const lookup = runSql(`SELECT username FROM users WHERE username = ${sqlString(args.username)} LIMIT 1`, args.remote)
if (!lookup.ok) {
  console.error(lookup.stderr || lookup.stdout || '查询用户失败')
  console.error('若提示没有 users 表，先执行: npx wrangler d1 execute three-photos-db --file=migrations/0005_users.sql')
  process.exit(1)
}

const exists = existingUsername(lookup.stdout)
if (exists && !args.update) {
  console.error(`用户「${args.username}」已存在。改密码请加 --update`)
  process.exit(1)
}

const sql = exists
  ? `UPDATE users SET password_hash = ${sqlString(hash)} WHERE username = ${sqlString(args.username)}`
  : `INSERT INTO users (id, username, password_hash) VALUES (${sqlString(crypto.randomUUID())}, ${sqlString(args.username)}, ${sqlString(hash)})`

const written = runSql(sql, args.remote)
if (!written.ok) {
  console.error(written.stderr || written.stdout || '写入失败')
  process.exit(1)
}

console.log(
  exists
    ? `已更新密码：${args.username}（${args.remote ? '线上' : '本地'}）`
    : `已添加账号：${args.username}（${args.remote ? '线上' : '本地'}）`,
)
