import type { Params as ZoneParams } from './zone/types'

export type { ZoneParams }

export type Phase = 'before' | 'during' | 'after'

export const PHASES: { key: Phase; label: string; hint: string }[] = [
  { key: 'before', label: '施工前', hint: '施工开始前拍摄' },
  { key: 'during', label: '施工过程中', hint: '施工进行中拍摄' },
  { key: 'after', label: '施工后', hint: '施工完成后拍摄' },
]

/** 三阶段徽章颜色（水印/证据标记用） */
export const PHASE_COLORS: Record<Phase, string> = {
  before: '#007aff',
  during: '#ff9f0a',
  after: '#34c759',
}

/** 三阶段短标签（水印/导出用）：施工前 / 施工中 / 施工后 */
export const PHASE_SHORT: Record<Phase, string> = {
  before: '施工前',
  during: '施工中',
  after: '施工后',
}

export interface Photo {
  id: string
  file_key: string
  taken_at: string
}

export interface PhotoCounts {
  before: number
  during: number
  after: number
}

export interface RecordSummary {
  id: string
  project_name: string
  highway: string
  section: string
  work_location: string
  stake: string
  end_stake: string
  direction: string // '' | 'up' | 'down'
  content: string
  work_date: string
  zone_params: string | null
  created_at: string
  updated_at: string
  photo_counts: PhotoCounts
}

export interface RecordItem extends Omit<RecordSummary, 'photo_counts'> {
  photos: Record<Phase, Photo[]>
}

export function photoCountsOf(record: RecordItem): PhotoCounts {
  return {
    before: record.photos.before.length,
    during: record.photos.during.length,
    after: record.photos.after.length,
  }
}

export function isPhotoComplete(counts: PhotoCounts): boolean {
  return counts.before > 0 && counts.during > 0 && counts.after > 0
}

export function photoTotal(counts: PhotoCounts): number {
  return counts.before + counts.during + counts.after
}

export function recordStateFromCounts(counts: PhotoCounts): { label: string; className: string } {
  if (counts.before > 0 && counts.during > 0 && counts.after === 0) return { label: '施工中', className: 'progress' }
  if (!isPhotoComplete(counts)) return { label: '资料待补充', className: 'incomplete' }
  return { label: '已完整', className: 'complete' }
}

export interface RecordForm {
  project_name: string
  highway: string
  section: string
  work_location: string
  stake: string
  end_stake: string
  direction: string
  content: string
  work_date: string
  zone_params: string | null // JSON.stringify(ZoneParams)，null = 不设置
}

export interface ImportRecordForm extends RecordForm {
  source_row: number
}

/** 独立布控区域（不依赖施工记录，首页单独入口管理） */
export interface ZoneItem {
  id: string
  project_name: string
  highway: string
  section: string
  stake: string
  length: number
  direction: string
  work_location: string
  zone_params: string // JSON.stringify(ZoneParams)
  record_id: string | null // 预留：将来关联施工记录
  created_at: string
  updated_at: string
}

/** 新建/编辑布控区域的提交表单（独立页面只做布置图，不含项目信息） */
export interface ZoneFormData {
  zone: ZoneParams
}

export function directionLabel(d: string): string {
  return d === 'up' ? '上行' : d === 'down' ? '下行' : ''
}
