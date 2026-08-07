import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, CircleAlert, CircleCheck } from 'lucide-react'
import AppHeader from '../components/AppHeader'
import { fetchDaily, listRecords } from '../api'
import { directionLabel, PHASES, type RecordItem } from '../types'
import { today } from '../util'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function isComplete(record: RecordItem): boolean {
  return PHASES.every((phase) => record.photos[phase.key].length > 0)
}

function monthCells(year: number, month: number): (number | null)[] {
  const first = new Date(year, month, 1)
  const start = (first.getDay() + 6) % 7 // 周一起始
  const days = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < start; i++) cells.push(null)
  for (let d = 1; d <= days; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export default function CalendarPage() {
  const t = today()
  const [year, setYear] = useState(Number(t.slice(0, 4)))
  const [month, setMonth] = useState(Number(t.slice(5, 7)) - 1)
  const [selected, setSelected] = useState(t)
  const [daily, setDaily] = useState<Record<string, { total: number; complete: number }>>({})
  const [records, setRecords] = useState<RecordItem[]>([])
  const [loadingDay, setLoadingDay] = useState(false)

  const monthKey = `${year}-${pad(month + 1)}`
  const from = `${monthKey}-01`
  const to = `${monthKey}-${pad(new Date(year, month + 1, 0).getDate())}`

  // 月份变化时加载当月聚合数据
  useEffect(() => {
    let cancelled = false
    fetchDaily(from, to)
      .then((list) => {
        if (cancelled) return
        const map: Record<string, { total: number; complete: number }> = {}
        for (const d of list) map[d.work_date] = { total: d.total, complete: d.complete }
        setDaily(map)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [from, to])

  // 选中日期变化时加载当天记录
  useEffect(() => {
    let cancelled = false
    setLoadingDay(true)
    listRecords({ from: selected, to: selected })
      .then((list) => {
        if (!cancelled) setRecords(list)
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoadingDay(false)
      })
    return () => {
      cancelled = true
    }
  }, [selected])

  const cells = useMemo(() => monthCells(year, month), [year, month])
  const todayStr = today()
  const selectedStat = daily[selected]

  function shiftMonth(delta: number) {
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
  }

  return (
    <div className="app-frame">
      <AppHeader trail={['首页', '施工日历']} />
      <div className="page">
        <header className="topbar">
          <button className="btn" onClick={() => (window.location.hash = '#/')}>
            ← 返回
          </button>
          <h1>施工日历</h1>
          <span className="topbar-spacer" />
        </header>

        <div className="calendar-card">
          <div className="calendar-head">
            <button className="icon-btn calendar-nav" aria-label="上个月" onClick={() => shiftMonth(-1)}>
              <ChevronLeft />
            </button>
            <h2>{year}年{month + 1}月</h2>
            <button className="icon-btn calendar-nav" aria-label="下个月" onClick={() => shiftMonth(1)}>
              <ChevronRight />
            </button>
          </div>

          <div className="calendar-weekdays">
            {WEEKDAYS.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>

          <div className="calendar-grid" role="grid" aria-label="日历">
            {cells.map((day, i) => {
              if (day === null) return <div key={`e${i}`} className="calendar-cell empty" />
              const date = `${monthKey}-${pad(day)}`
              const stat = daily[date]
              const isToday = date === todayStr
              const isSelected = date === selected
              return (
                <button
                  key={date}
                  role="gridcell"
                  aria-selected={isSelected}
                  className={`calendar-cell${isSelected ? ' selected' : ''}${isToday ? ' today' : ''}`}
                  onClick={() => setSelected(date)}
                >
                  <span className="calendar-day">{day}</span>
                  {stat && (
                    <span
                      className={`calendar-dot${stat.complete >= stat.total ? ' done' : ''}`}
                      title={`${stat.total} 条记录${stat.complete < stat.total ? `，${stat.complete} 条三照完整` : '，三照完整'}`}
                    />
                  )}
                </button>
              )
            })}
          </div>

          <div className="calendar-legend">
            <span><i className="calendar-dot" />有施工记录</span>
            <span><i className="calendar-dot done" />三照完整</span>
            <span><i className="calendar-today-mark" />今天</span>
          </div>
        </div>

        <section className="calendar-day-section">
          <h3>
            {selected.slice(5)} 的施工记录
            {selectedStat ? <small>（{selectedStat.total} 条，{selectedStat.complete} 条三照完整）</small> : null}
          </h3>

          {loadingDay ? (
            <p className="calendar-empty">加载中…</p>
          ) : records.length === 0 ? (
            <p className="calendar-empty">当天没有施工记录</p>
          ) : (
            <div className="calendar-day-list">
              {records.map((r) => (
                <button key={r.id} className="calendar-day-item" onClick={() => (window.location.hash = `#/record/${r.id}`)}>
                  <div className="calendar-day-item-main">
                    <strong>{r.stake}</strong>
                    <span>{directionLabel(r.direction)}</span>
                    <span className="calendar-day-item-content">{r.content || r.project_name}</span>
                  </div>
                  {isComplete(r) ? (
                    <span className="status-chip complete"><CircleCheck />资料完整</span>
                  ) : (
                    <span className="status-chip incomplete"><CircleAlert />资料待补充</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
