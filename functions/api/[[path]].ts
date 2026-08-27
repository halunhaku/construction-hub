import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'
import type { Params as ZoneParams } from '../../src/zone/types'
import { validateZone } from '../../src/zone/validation.ts'
import { verifyPassword } from './password.ts'
import {
  clearSessionCookie,
  findSessionUser,
  readSessionId,
  sessionCookie,
  type AuthUser,
} from './session.ts'

type Bindings = {
  DB: D1Database
  BUCKET: R2Bucket
}

type Variables = {
  user: AuthUser
}

const PHASES = ['before', 'during', 'after'] as const
type Phase = (typeof PHASES)[number]

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>().basePath('/api')

function isHttps(url: string): boolean {
  return new URL(url).protocol === 'https:'
}

interface RecordRow {
  id: string
  project_name: string
  highway: string
  section: string
  work_location: string
  stake: string
  end_stake: string
  direction: string
  content: string
  work_date: string
  zone_params: string | null
  created_at: string
  photo_id: string | null
  phase: Phase | null
  file_key: string | null
  taken_at: string | null
}

interface ZoneRow {
  id: string
  project_name: string
  highway: string
  section: string
  stake: string
  length: number
  direction: string
  work_location: string
  zone_params: string
  record_id: string | null
  created_at: string
  updated_at: string
}

/**
 * 校验作业区布置参数对象，返回 JSON 字符串；非法时返回错误信息。
 * 供记录布置图（PUT /records/:id/zone）与独立布控区域（zones CRUD）共用。
 */
export function validateZoneObject(zone: unknown): { ok: true; params: string } | { ok: false; error: string } {
  if (typeof zone !== 'object' || zone === null || Array.isArray(zone)) {
    return { ok: false, error: 'zone 必须是对象' }
  }
  const z = zone as Record<string, unknown>
  const required: [string, string][] = [
    ['start', 'string'], ['work', 'number'], ['direction', 'string'],
    ['workSide', 'string'], ['warning', 'number'], ['taper', 'number'],
    ['buffer', 'number'], ['downstream', 'number'], ['terminal', 'number'],
    ['speed', 'number'], ['coneGap', 'number'],
  ]
  for (const [key, type] of required) {
    if (typeof z[key] !== type) return { ok: false, error: `zone.${key} 必须是 ${type}` }
  }
  if (z.doubleSide !== undefined && typeof z.doubleSide !== 'boolean') {
    return { ok: false, error: 'zone.doubleSide 必须是 boolean' }
  }
  if (z.direction !== 'up' && z.direction !== 'down') {
    return { ok: false, error: 'zone.direction 必须是 up / down' }
  }
  if (z.workSide !== 'roadside' && z.workSide !== 'median') {
    return { ok: false, error: 'zone.workSide 必须是 roadside / median' }
  }
  const normalized: ZoneParams = {
    start: z.start as string,
    work: z.work as number,
    direction: z.direction,
    workSide: z.workSide,
    doubleSide: z.doubleSide === true,
    warning: z.warning as number,
    taper: z.taper as number,
    buffer: z.buffer as number,
    downstream: z.downstream as number,
    terminal: z.terminal as number,
    speed: z.speed as number,
    coneGap: z.coneGap as number,
  }
  const errors = validateZone(normalized)
  const firstError = Object.entries(errors)[0]
  if (firstError) return { ok: false, error: `zone.${firstError[0]}: ${firstError[1]}` }
  return { ok: true, params: JSON.stringify(normalized) }
}

/** 记录接口使用 JSON 字符串传递 zone_params，解析后复用同一校验器。 */
export function validateZoneParamsText(value: unknown): { ok: true; params: string | null } | { ok: false; error: string } {
  if (value == null) return { ok: true, params: null }
  if (typeof value !== 'string') return { ok: false, error: 'zone_params 必须是 JSON 字符串或 null' }
  let zone: unknown
  try {
    zone = JSON.parse(value)
  } catch {
    return { ok: false, error: 'zone_params 不是有效的 JSON' }
  }
  return validateZoneObject(zone)
}

function toRecord(rows: RecordRow[]) {
  if (rows.length === 0) return null
  const photos: Record<Phase, { id: string; file_key: string; taken_at: string }[]> = {
    before: [],
    during: [],
    after: [],
  }
  for (const r of rows) {
    if (r.photo_id && r.phase && r.file_key && r.taken_at) {
      photos[r.phase].push({ id: r.photo_id, file_key: r.file_key, taken_at: r.taken_at })
    }
  }
  const first = rows[0]
  return {
    id: first.id,
    project_name: first.project_name,
    highway: first.highway,
    section: first.section,
    work_location: first.work_location,
    stake: first.stake,
    end_stake: first.end_stake,
    direction: first.direction,
    content: first.content,
    work_date: first.work_date,
    zone_params: first.zone_params,
    created_at: first.created_at,
    photos,
  }
}

const RECORD_SELECT = `
  SELECT r.id, r.project_name, r.highway, r.section, r.work_location,
         r.stake, r.end_stake, r.direction,
         r.content, r.work_date, r.zone_params, r.created_at,
         p.id AS photo_id, p.phase, p.file_key, p.taken_at
  FROM records r
  LEFT JOIN photos p ON p.record_id = r.id
`

app.get('/health', (c) => c.json({ ok: true }))

app.post('/auth/login', async (c) => {
  const body = await c.req.json().catch(() => null)
  const username = String(body?.username ?? '').trim()
  const password = String(body?.password ?? '')
  if (!username || !password) return c.json({ error: '请输入用户名和密码' }, 400)
  const user = await c.env.DB.prepare('SELECT id, username, password_hash FROM users WHERE username = ?')
    .bind(username)
    .first<{ id: string; username: string; password_hash: string }>()
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return c.json({ error: '用户名或密码不对' }, 401)
  }
  const sessionId = crypto.randomUUID()
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19)
  await c.env.DB.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').bind(sessionId, user.id, expires).run()
  c.header('Set-Cookie', sessionCookie(sessionId, isHttps(c.req.url)))
  return c.json({ user: { id: user.id, username: user.username } })
})

app.post('/auth/logout', async (c) => {
  const sessionId = readSessionId(c.req.header('Cookie'))
  if (sessionId) {
    await c.env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run()
  }
  c.header('Set-Cookie', clearSessionCookie(isHttps(c.req.url)))
  return c.json({ ok: true })
})

app.get('/auth/me', async (c) => {
  const user = await findSessionUser(c.env.DB, readSessionId(c.req.header('Cookie')))
  return c.json({ user })
})

app.use('*', async (c, next) => {
  const path = new URL(c.req.url).pathname
  if (path === '/api/health' || path.startsWith('/api/auth/')) return next()
  const user = await findSessionUser(c.env.DB, readSessionId(c.req.header('Cookie')))
  if (!user) return c.json({ error: '请先登录' }, 401)
  c.set('user', user)
  await next()
})

// 项目列表（供顶部项目切换器）
app.get('/projects', async (c) => {
  c.header('CDN-Cache-Control', 'max-age=120')
  c.header('Cache-Control', 'public, s-maxage=120')
  const { results } = await c.env.DB.prepare(
    `SELECT project_name AS name, COUNT(*) AS count
     FROM records
     WHERE project_name != ''
     GROUP BY project_name
     ORDER BY count DESC`,
  ).all<{ name: string; count: number }>()
  return c.json(results)
})

// 已有项目名称 / 高速 / 路段 / 施工内容选项（供表单下拉选择）
app.get('/options', async (c) => {
  // 数据变化不频繁，允许 Cloudflare 边缘缓存 5 分钟，减少重复查询
  c.header('CDN-Cache-Control', 'max-age=300')
  c.header('Cache-Control', 'public, s-maxage=300')
  const projects = await c.env.DB.prepare(
    "SELECT DISTINCT project_name FROM records WHERE project_name != '' ORDER BY project_name",
  ).all<{ project_name: string }>()
  const highways = await c.env.DB.prepare(
    "SELECT DISTINCT highway FROM records WHERE highway != '' ORDER BY highway",
  ).all<{ highway: string }>()
  const sections = await c.env.DB.prepare(
    "SELECT DISTINCT section FROM records WHERE section != '' ORDER BY section",
  ).all<{ section: string }>()
  const contents = await c.env.DB.prepare(
    "SELECT DISTINCT content FROM records WHERE content != '' ORDER BY content",
  ).all<{ content: string }>()
  return c.json({
    projects: projects.results.map((r) => r.project_name),
    highways: highways.results.map((r) => r.highway),
    sections: sections.results.map((r) => r.section),
    contents: contents.results.map((r) => r.content),
  })
})

// 新建台账记录
app.post('/records', async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: '无效的请求体' }, 400)
  const project_name = String(body.project_name ?? '').trim()
  const highway = String(body.highway ?? '').trim()
  const section = String(body.section ?? '').trim()
  const work_location = String(body.work_location ?? '').trim()
  const stake = String(body.stake ?? '').trim()
  const end_stake = String(body.end_stake ?? '').trim()
  const direction = String(body.direction ?? '').trim()
  const content = String(body.content ?? '').trim()
  const work_date = String(body.work_date ?? '').trim()
  const zoneResult = validateZoneParamsText(body.zone_params)
  if (!zoneResult.ok) return c.json({ error: zoneResult.error }, 400)
  const zone_params = zoneResult.params
  if (!project_name || !highway || !section || !stake || !work_date) {
    return c.json({ error: '项目名称、高速公路、路段、桩号、施工日期为必填项' }, 400)
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(work_date)) {
    return c.json({ error: '施工日期格式应为 YYYY-MM-DD' }, 400)
  }
  if (direction !== '' && direction !== 'up' && direction !== 'down') {
    return c.json({ error: '方向只能是 up（上行）/ down（下行）' }, 400)
  }
  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    `INSERT INTO records (id, project_name, highway, section, work_location, stake, end_stake, direction, content, work_date, zone_params)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, project_name, highway, section, work_location, stake, end_stake, direction, content, work_date, zone_params)
    .run()
  return c.json({ id }, 201)
})

// 更新台账记录基本信息（含布置参数，编辑页提交时一并联动）
app.put('/records/:id', async (c) => {
  const id = c.req.param('id')
  const existing = await c.env.DB.prepare('SELECT id FROM records WHERE id = ?').bind(id).first()
  if (!existing) return c.json({ error: '记录不存在' }, 404)
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: '无效的请求体' }, 400)
  const project_name = String(body.project_name ?? '').trim()
  const highway = String(body.highway ?? '').trim()
  const section = String(body.section ?? '').trim()
  const work_location = String(body.work_location ?? '').trim()
  const stake = String(body.stake ?? '').trim()
  const end_stake = String(body.end_stake ?? '').trim()
  const direction = String(body.direction ?? '').trim()
  const content = String(body.content ?? '').trim()
  const work_date = String(body.work_date ?? '').trim()
  const zoneResult = validateZoneParamsText(body.zone_params)
  if (!zoneResult.ok) return c.json({ error: zoneResult.error }, 400)
  const zone_params = zoneResult.params
  if (!project_name || !highway || !section || !stake || !work_date) {
    return c.json({ error: '项目名称、高速公路、路段、桩号、施工日期为必填项' }, 400)
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(work_date)) {
    return c.json({ error: '施工日期格式应为 YYYY-MM-DD' }, 400)
  }
  if (direction !== '' && direction !== 'up' && direction !== 'down') {
    return c.json({ error: '方向只能是 up（上行）/ down（下行）' }, 400)
  }
  await c.env.DB.prepare(
    `UPDATE records
     SET project_name = ?, highway = ?, section = ?, work_location = ?, stake = ?, end_stake = ?,
         direction = ?, content = ?, work_date = ?, zone_params = ?
     WHERE id = ?`,
  )
    .bind(project_name, highway, section, work_location, stake, end_stake, direction, content, work_date, zone_params, id)
    .run()
  return c.json({ ok: true })
})

// Excel 批量导入。先完整校验，再用 D1 batch 一次性写入。
app.post('/records/import', async (c) => {
  const body = await c.req.json().catch(() => null)
  const rows = Array.isArray(body?.records) ? body.records : null
  if (!rows || rows.length === 0) return c.json({ error: '导入文件中没有可用记录' }, 400)
  if (rows.length > 1000) return c.json({ error: '单次最多导入 1000 条记录' }, 400)

  const ids: string[] = []
  const statements: D1PreparedStatement[] = []
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index] as Record<string, unknown>
    const sourceRow = Number(row.source_row) || index + 2
    const projectName = String(row.project_name ?? '').trim()
    const highway = String(row.highway ?? '').trim()
    const section = String(row.section ?? '').trim()
    const workLocation = String(row.work_location ?? '').trim()
    const stake = String(row.stake ?? '').trim()
    const endStake = String(row.end_stake ?? '').trim()
    const direction = String(row.direction ?? '').trim()
    const content = String(row.content ?? '').trim()
    const workDate = String(row.work_date ?? '').trim()
    if (!projectName || !highway || !section || !stake || !workDate) {
      return c.json({ error: `Excel 第 ${sourceRow} 行缺少必填字段` }, 400)
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate)) {
      return c.json({ error: `Excel 第 ${sourceRow} 行施工日期应为 YYYY-MM-DD` }, 400)
    }
    if (direction !== '' && direction !== 'up' && direction !== 'down') {
      return c.json({ error: `Excel 第 ${sourceRow} 行方向应为上行或下行` }, 400)
    }
    const id = crypto.randomUUID()
    ids.push(id)
    statements.push(
      c.env.DB.prepare(
        `INSERT INTO records (id, project_name, highway, section, work_location, stake, end_stake, direction, content, work_date, zone_params)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      ).bind(id, projectName, highway, section, workLocation, stake, endStake, direction, content, workDate),
    )
  }
  await c.env.DB.batch(statements)
  return c.json({ count: ids.length, ids }, 201)
})

// 保存 / 清除作业区布置参数（zone 为 Params 对象或 null）
app.put('/records/:id/zone', async (c) => {
  const id = c.req.param('id')
  const record = await c.env.DB.prepare('SELECT id FROM records WHERE id = ?').bind(id).first()
  if (!record) return c.json({ error: '记录不存在' }, 404)

  const body = await c.req.json().catch(() => null)
  if (!body || !('zone' in body)) return c.json({ error: '请求体需包含 zone 字段' }, 400)

  let zone_params: string | null = null
  if (body.zone != null) {
    const result = validateZoneObject(body.zone)
    if (!result.ok) return c.json({ error: result.error }, 400)
    zone_params = result.params
  }

  await c.env.DB.prepare('UPDATE records SET zone_params = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .bind(zone_params, id)
    .run()
  return c.json({ ok: true, zone_params })
})

// 日历聚合：按施工日期统计记录数与三照完整数（用于月历标记）
app.get('/records/daily', async (c) => {
  const from = c.req.query('from') ?? ''
  const to = c.req.query('to') ?? ''
  const { results } = await c.env.DB.prepare(
    `SELECT r.work_date,
            COUNT(DISTINCT r.id) AS total,
            COUNT(DISTINCT CASE WHEN ph.cnt >= 3 THEN r.id END) AS complete
     FROM records r
     LEFT JOIN (
       SELECT record_id, COUNT(DISTINCT phase) AS cnt
       FROM photos GROUP BY record_id
     ) ph ON ph.record_id = r.id
     WHERE r.work_date BETWEEN ?1 AND ?2
     GROUP BY r.work_date
     ORDER BY r.work_date`,
  )
    .bind(from, to)
    .all<{ work_date: string; total: number; complete: number }>()
  return c.json(results)
})

// 列表（支持按项目/高速/路段/桩号/方向/施工内容/日期范围筛选），带每张照片状态
app.get('/records', async (c) => {
  const project = c.req.query('project') ?? ''
  const highway = c.req.query('highway') ?? ''
  const section = c.req.query('section') ?? ''
  const stake = c.req.query('stake') ?? ''
  const direction = c.req.query('direction') ?? ''
  const content = c.req.query('content') ?? ''
  const from = c.req.query('from') ?? ''
  const to = c.req.query('to') ?? ''
  const { results } = await c.env.DB.prepare(
    `${RECORD_SELECT}
     WHERE (?1 = '' OR instr(r.project_name, ?1) > 0)
       AND (?2 = '' OR instr(r.highway, ?2) > 0)
       AND (?3 = '' OR instr(r.section, ?3) > 0)
       AND (?4 = '' OR instr(r.stake, ?4) > 0)
       AND (?5 = '' OR r.direction = ?5)
       AND (?6 = '' OR instr(r.content, ?6) > 0)
       AND (?7 = '' OR r.work_date >= ?7)
       AND (?8 = '' OR r.work_date <= ?8)
     ORDER BY r.work_date DESC, r.created_at DESC`,
  )
    .bind(project, highway, section, stake, direction, content, from, to)
    .all<RecordRow>()

  const map = new Map<string, RecordRow[]>()
  for (const row of results) {
    const arr = map.get(row.id) ?? []
    arr.push(row)
    map.set(row.id, arr)
  }
  const records = [...map.values()].map(toRecord).filter(Boolean)
  return c.json(records)
})

// 单条详情
app.get('/records/:id', async (c) => {
  const id = c.req.param('id')
  const { results } = await c.env.DB.prepare(`${RECORD_SELECT} WHERE r.id = ?`).bind(id).all<RecordRow>()
  const record = toRecord(results)
  if (!record) return c.json({ error: '记录不存在' }, 404)
  return c.json(record)
})

// 删除记录（连带删照片）
app.delete('/records/:id', async (c) => {
  const id = c.req.param('id')
  const { results } = await c.env.DB.prepare('SELECT file_key FROM photos WHERE record_id = ?')
    .bind(id)
    .all<{ file_key: string }>()
  for (const p of results) {
    await c.env.BUCKET.delete(p.file_key)
  }
  await c.env.DB.prepare('DELETE FROM records WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})

// 上传照片（multipart: file + phase）。每阶段不限张数，每张独立记录
app.post('/records/:id/photos', async (c) => {
  const id = c.req.param('id')
  const record = await c.env.DB.prepare('SELECT id FROM records WHERE id = ?').bind(id).first()
  if (!record) return c.json({ error: '记录不存在' }, 404)

  const form = await c.req.formData()
  const phase = String(form.get('phase') ?? '')
  if (!PHASES.includes(phase as Phase)) {
    return c.json({ error: 'phase 必须是 before / during / after' }, 400)
  }
  const file = form.get('file')
  if (!(file instanceof File)) return c.json({ error: '缺少图片文件（字段名 file）' }, 400)
  if (!file.type.startsWith('image/')) return c.json({ error: '只支持图片文件' }, 400)
  if (file.size > 20 * 1024 * 1024) return c.json({ error: '图片不能超过 20MB' }, 400)

  const key = `records/${id}/${phase}/${crypto.randomUUID()}.jpg`
  const data = await file.arrayBuffer()
  await c.env.BUCKET.put(key, data, { httpMetadata: { contentType: 'image/jpeg' } })

  const photoId = crypto.randomUUID()
  await c.env.DB.prepare('INSERT INTO photos (id, record_id, phase, file_key) VALUES (?, ?, ?, ?)')
    .bind(photoId, id, phase, key)
    .run()
  return c.json({ ok: true, photoId }, 201)
})

// 删除单张照片
app.delete('/photos/:photoId', async (c) => {
  const photoId = c.req.param('photoId')
  const photo = await c.env.DB.prepare('SELECT file_key FROM photos WHERE id = ?')
    .bind(photoId)
    .first<{ file_key: string }>()
  if (!photo) return c.json({ error: '照片不存在' }, 404)
  await c.env.BUCKET.delete(photo.file_key)
  await c.env.DB.prepare('DELETE FROM photos WHERE id = ?').bind(photoId).run()
  return c.json({ ok: true })
})

// 照片代理访问（从 R2 读取，按照片 id）
app.get('/photos/:photoId', async (c) => {
  const photoId = c.req.param('photoId')
  const photo = await c.env.DB.prepare('SELECT file_key FROM photos WHERE id = ?')
    .bind(photoId)
    .first<{ file_key: string }>()
  if (!photo) return c.json({ error: 'not found' }, 404)

  const obj = await c.env.BUCKET.get(photo.file_key)
  if (!obj) return c.json({ error: 'not found' }, 404)
  const headers = new Headers()
  obj.writeHttpMetadata(headers)
  headers.set('etag', obj.httpEtag)
  headers.set('Cache-Control', 'public, max-age=86400')
  return new Response(obj.body, { headers })
})

// ─────────────────────────────────────────────
// 独立布控区域（zones）：不依赖施工记录，首页单独入口
// 列表列 stake/length/direction/work_location 由 zone_params 同步派生，供列表展示与筛选
// ─────────────────────────────────────────────

const ZONE_SELECT = `
  SELECT id, project_name, highway, section, stake, length, direction, work_location,
         zone_params, record_id, created_at, updated_at
  FROM zones
`

// 列表（按更新时间倒序）
app.get('/zones', async (c) => {
  const { results } = await c.env.DB.prepare(`${ZONE_SELECT} ORDER BY updated_at DESC, created_at DESC`).all<ZoneRow>()
  return c.json(results)
})

// 单条详情
app.get('/zones/:id', async (c) => {
  const id = c.req.param('id')
  const zone = await c.env.DB.prepare(`${ZONE_SELECT} WHERE id = ?`).bind(id).first<ZoneRow>()
  if (!zone) return c.json({ error: '布控区域不存在' }, 404)
  return c.json(zone)
})

// 新建布控区域（独立页面只做布置图：桩号/长度/方向/参数，不要求项目信息）
app.post('/zones', async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: '无效的请求体' }, 400)
  const project_name = String(body.project_name ?? '').trim()
  const highway = String(body.highway ?? '').trim()
  const section = String(body.section ?? '').trim()
  const result = validateZoneObject(body.zone)
  if (!result.ok) return c.json({ error: result.error }, 400)
  const z = JSON.parse(result.params) as { start: string; work: number; direction: string; workSide: string }
  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    `INSERT INTO zones (id, project_name, highway, section, stake, length, direction, work_location, zone_params)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, project_name, highway, section, z.start, z.work, z.direction, z.workSide, result.params)
    .run()
  return c.json({ id }, 201)
})

// 更新布控区域
app.put('/zones/:id', async (c) => {
  const id = c.req.param('id')
  const existing = await c.env.DB.prepare('SELECT id FROM zones WHERE id = ?').bind(id).first()
  if (!existing) return c.json({ error: '布控区域不存在' }, 404)
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: '无效的请求体' }, 400)
  const project_name = String(body.project_name ?? '').trim()
  const highway = String(body.highway ?? '').trim()
  const section = String(body.section ?? '').trim()
  const result = validateZoneObject(body.zone)
  if (!result.ok) return c.json({ error: result.error }, 400)
  const z = JSON.parse(result.params) as { start: string; work: number; direction: string; workSide: string }
  await c.env.DB.prepare(
    `UPDATE zones
     SET project_name = ?, highway = ?, section = ?, stake = ?, length = ?, direction = ?,
         work_location = ?, zone_params = ?, updated_at = datetime('now')
     WHERE id = ?`,
  )
    .bind(project_name, highway, section, z.start, z.work, z.direction, z.workSide, result.params, id)
    .run()
  return c.json({ ok: true })
})

// 删除布控区域
app.delete('/zones/:id', async (c) => {
  const id = c.req.param('id')
  const existing = await c.env.DB.prepare('SELECT id FROM zones WHERE id = ?').bind(id).first()
  if (!existing) return c.json({ error: '布控区域不存在' }, 404)
  await c.env.DB.prepare('DELETE FROM zones WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})

export const onRequest = handle(app)
