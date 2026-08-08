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

export interface RecordItem {
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
  zone_params: string | null // JSON.stringify(ZoneParams)，null = 未设置
  created_at: string
  photos: Record<Phase, Photo[]>
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

export function directionLabel(d: string): string {
  return d === 'up' ? '上行' : d === 'down' ? '下行' : ''
}
