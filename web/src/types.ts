import type { Params as ZoneParams } from './zone/types'

export type { ZoneParams }

export type Phase = 'before' | 'during' | 'after'

export const PHASES: { key: Phase; label: string; hint: string }[] = [
  { key: 'before', label: '施工前', hint: '施工开始前拍摄' },
  { key: 'during', label: '施工过程中', hint: '施工进行中拍摄' },
  { key: 'after', label: '施工后', hint: '施工完成后拍摄' },
]

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
  stake: string
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
  stake: string
  direction: string
  content: string
  work_date: string
}

export function directionLabel(d: string): string {
  return d === 'up' ? '上行' : d === 'down' ? '下行' : ''
}
