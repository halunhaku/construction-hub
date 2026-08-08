import type { ImportRecordForm, Phase, RecordForm, RecordItem, ZoneParams } from './types'

const BASE = '/api'

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, init)
  if (!res.ok) {
    let message = `请求失败 (${res.status})`
    try {
      const data = await res.json()
      if (data?.error) message = data.error
    } catch {
      /* ignore */
    }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

export interface ListQuery {
  project?: string
  highway?: string
  section?: string
  stake?: string
  direction?: string
  content?: string
  from?: string
  to?: string
  photo?: string // all | complete | incomplete（前端过滤）
}

export function listRecords(q: ListQuery = {}): Promise<RecordItem[]> {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(q)) {
    if (v) params.set(k, v)
  }
  const qs = params.toString()
  return request<RecordItem[]>(`/records${qs ? '?' + qs : ''}`)
}

export function getRecord(id: string): Promise<RecordItem> {
  return request<RecordItem>(`/records/${encodeURIComponent(id)}`)
}

export interface Options {
  projects: string[]
  highways: string[]
  sections: string[]
  contents: string[]
}

export interface ProjectSummary {
  name: string
  count: number
}

/** 项目列表（顶部项目切换器用） */
export function listProjects(): Promise<ProjectSummary[]> {
  return request<ProjectSummary[]>('/projects')
}

export interface DailyStat {
  work_date: string
  total: number
  complete: number
}

/** 日历聚合：某日期范围内每天的记录数与三照完整数 */
export function fetchDaily(from: string, to: string): Promise<DailyStat[]> {
  return request<DailyStat[]>(`/records/daily?from=${from}&to=${to}`)
}

const OPTIONS_CACHE_KEY = 'opts-cache-v1'
const OPTIONS_TTL = 24 * 60 * 60 * 1000

/** 选项数据缓存 24h：命中后立即返回（不阻塞页面），并在后台静默刷新 */
export async function getOptions(): Promise<Options> {
  try {
    const raw = localStorage.getItem(OPTIONS_CACHE_KEY)
    if (raw) {
      const cached = JSON.parse(raw) as { t: number; v: Options }
      if (Date.now() - cached.t < OPTIONS_TTL) {
        void request<Options>('/options')
          .then((fresh) => {
            localStorage.setItem(OPTIONS_CACHE_KEY, JSON.stringify({ t: Date.now(), v: fresh }))
          })
          .catch(() => undefined)
        return cached.v
      }
    }
  } catch {
    /* 缓存损坏则忽略，重新请求 */
  }
  const fresh = await request<Options>('/options')
  try {
    localStorage.setItem(OPTIONS_CACHE_KEY, JSON.stringify({ t: Date.now(), v: fresh }))
  } catch {
    /* 存储失败不影响使用 */
  }
  return fresh
}

export function createRecord(data: RecordForm): Promise<{ id: string }> {
  return request<{ id: string }>('/records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export function updateRecord(id: string, data: RecordForm): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/records/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export function importRecords(
  records: ImportRecordForm[],
): Promise<{ count: number; ids: string[] }> {
  return request<{ count: number; ids: string[] }>('/records/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records }),
  })
}

export function deleteRecord(id: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/records/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

/** 保存（zone 非 null）或清除（zone 为 null）记录的作业区布置参数 */
export function saveZone(
  id: string,
  zone: ZoneParams | null,
): Promise<{ ok: boolean; zone_params: string | null }> {
  return request<{ ok: boolean; zone_params: string | null }>(
    `/records/${encodeURIComponent(id)}/zone`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zone }),
    },
  )
}

export async function uploadPhoto(
  recordId: string,
  phase: Phase,
  file: Blob,
): Promise<{ photoId: string }> {
  const form = new FormData()
  form.append('phase', phase)
  form.append('file', file, 'photo.jpg')
  return request<{ photoId: string }>(`/records/${encodeURIComponent(recordId)}/photos`, {
    method: 'POST',
    body: form,
  })
}

export function deletePhoto(photoId: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/photos/${encodeURIComponent(photoId)}`, { method: 'DELETE' })
}

export function photoUrl(photoId: string): string {
  return `${BASE}/photos/${encodeURIComponent(photoId)}`
}
