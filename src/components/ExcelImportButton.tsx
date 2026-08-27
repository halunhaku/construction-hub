import { useRef, useState } from 'react'
import { Download, FileSpreadsheet, LoaderCircle } from 'lucide-react'
import { importRecords } from '../api'
import type { ImportRecordForm } from '../types'
import { isValidWorkDate } from '../util'

type ImportSummary = {
  filename: string
  count: number
  ids: string[]
}

const HEADERS = [
  '项目名称', '道路', '路段', '方向', '施工位置',
  '起始桩号', '结束桩号', '施工内容', '施工日期',
]

const HEADER_ALIASES: Record<string, string[]> = {
  project_name: ['项目名称', '项目'],
  highway: ['道路', '高速公路', '公路名称'],
  section: ['路段', '所属路段'],
  direction: ['方向', '行车方向'],
  work_location: ['施工位置', '作业位置', '位置'],
  stake: ['起始桩号', '作业桩号', '桩号'],
  end_stake: ['结束桩号', '终止桩号'],
  content: ['施工内容', '作业内容'],
  work_date: ['施工日期', '作业日期', '日期'],
}

function pick(row: Record<string, unknown>, aliases: string[]): unknown {
  for (const key of aliases) {
    if (key in row && row[key] !== '') return row[key]
  }
  return ''
}

function normalizeDirection(value: unknown): string {
  const text = String(value ?? '').trim().toLowerCase()
  if (text === '上行' || text === 'up') return 'up'
  if (text === '下行' || text === 'down') return 'down'
  return ''
}

function normalizeDate(value: unknown, parseSerial: (n: number) => string): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
  }
  if (typeof value === 'number') return parseSerial(value)
  const text = String(value ?? '').trim().replace(/[./年月]/g, '-').replace(/日$/, '')
  const match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  return match ? `${match[1]}-${match[2]!.padStart(2, '0')}-${match[3]!.padStart(2, '0')}` : text
}

export default function ExcelImportButton({
  compact = false,
  onImported,
}: {
  compact?: boolean
  onImported?: (summary: ImportSummary) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function readFile(file: File) {
    setBusy(true)
    setError('')
    try {
      const XLSX = await import('xlsx')
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
      const sheet = workbook.Sheets[workbook.SheetNames[0] ?? '']
      if (!sheet) throw new Error('Excel 中没有可读取的工作表')
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: true })
      const parseSerial = (serial: number) => {
        const date = XLSX.SSF.parse_date_code(serial)
        return date ? `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}` : ''
      }
      const records: ImportRecordForm[] = rawRows
        .map((row, index) => ({
          project_name: String(pick(row, HEADER_ALIASES.project_name!)).trim(),
          highway: String(pick(row, HEADER_ALIASES.highway!)).trim(),
          section: String(pick(row, HEADER_ALIASES.section!)).trim(),
          direction: normalizeDirection(pick(row, HEADER_ALIASES.direction!)),
          work_location: String(pick(row, HEADER_ALIASES.work_location!)).trim(),
          stake: String(pick(row, HEADER_ALIASES.stake!)).trim(),
          end_stake: String(pick(row, HEADER_ALIASES.end_stake!)).trim(),
          content: String(pick(row, HEADER_ALIASES.content!)).trim(),
          work_date: normalizeDate(pick(row, HEADER_ALIASES.work_date!), parseSerial),
          zone_params: null,
          source_row: index + 2,
        }))
        .filter((row) =>
          row.project_name ||
          row.highway ||
          row.section ||
          row.stake ||
          row.work_date ||
          row.content ||
          row.work_location ||
          row.end_stake ||
          row.direction,
        )
      if (records.length === 0) throw new Error('Excel 中没有数据行')
      const required = records.find((row) => !row.project_name || !row.highway || !row.section || !row.stake || !row.work_date)
      if (required) throw new Error(`Excel 第 ${required.source_row} 行缺少项目、道路、路段、起始桩号或施工日期`)
      const badDate = records.find((row) => !isValidWorkDate(row.work_date))
      if (badDate) throw new Error(`Excel 第 ${badDate.source_row} 行施工日期不是真实日期（应为 YYYY-MM-DD）`)
      const result = await importRecords(records)
      onImported?.({ filename: file.name, count: result.count, ids: result.ids })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '导入失败')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function downloadTemplate() {
    setBusy(true)
    setError('')
    try {
      const XLSX = await import('xlsx')
      const example = [
        HEADERS,
        ['宁波绕城高速养护项目', 'G15 沈海高速', '北仑段', '上行', '右侧路肩', 'K128+600', 'K128+700', '路面坑槽修复', '2026-08-05'],
      ]
      const workbook = XLSX.utils.book_new()
      const sheet = XLSX.utils.aoa_to_sheet(example)
      sheet['!cols'] = [22, 18, 12, 10, 16, 14, 14, 20, 14].map((wch) => ({ wch }))
      XLSX.utils.book_append_sheet(workbook, sheet, '施工位置')
      XLSX.writeFile(workbook, '施工位置导入模板.xlsx')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '模板下载失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`excel-tools${compact ? ' compact' : ''}`}>
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept=".xlsx,.xls"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void readFile(file)
        }}
      />
      <button className="btn btn-secondary" disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? <LoaderCircle className="spin" /> : <FileSpreadsheet />}
        导入 Excel
      </button>
      <button className="btn btn-secondary" disabled={busy} onClick={() => void downloadTemplate()}>
        <Download />
        模板
      </button>
      {error ? <div className="excel-error" role="alert">{error}</div> : null}
    </div>
  )
}
