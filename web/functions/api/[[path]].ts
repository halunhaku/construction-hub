import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'

type Bindings = {
  DB: D1Database
  BUCKET: R2Bucket
}

const PHASES = ['before', 'during', 'after'] as const
type Phase = (typeof PHASES)[number]

const app = new Hono<{ Bindings: Bindings }>().basePath('/api')

interface PhotoRow {
  photo_id: string | null
  phase: Phase | null
  file_key: string | null
  taken_at: string | null
}
interface RecordRow {
  id: string
  project_name: string
  highway: string
  section: string
  stake: string
  direction: string
  content: string
  work_date: string
  created_at: string
  photo_id: string | null
  phase: Phase | null
  file_key: string | null
  taken_at: string | null
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
    stake: first.stake,
    direction: first.direction,
    content: first.content,
    work_date: first.work_date,
    created_at: first.created_at,
    photos,
  }
}

const RECORD_SELECT = `
  SELECT r.id, r.project_name, r.highway, r.section, r.stake, r.direction,
         r.content, r.work_date, r.created_at,
         p.id AS photo_id, p.phase, p.file_key, p.taken_at
  FROM records r
  LEFT JOIN photos p ON p.record_id = r.id
`

app.get('/health', (c) => c.json({ ok: true }))

// 已有项目名称 / 高速 / 路段 / 施工内容选项（供表单下拉选择）
app.get('/options', async (c) => {
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
  const stake = String(body.stake ?? '').trim()
  const direction = String(body.direction ?? '').trim()
  const content = String(body.content ?? '').trim()
  const work_date = String(body.work_date ?? '').trim()
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
    `INSERT INTO records (id, project_name, highway, section, stake, direction, content, work_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, project_name, highway, section, stake, direction, content, work_date)
    .run()
  return c.json({ id }, 201)
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

export const onRequest = handle(app)
