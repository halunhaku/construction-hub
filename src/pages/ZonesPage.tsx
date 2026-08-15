import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, ChevronRight, Plus, Search, TrafficCone } from 'lucide-react'
import { listZones } from '../api'
import AppHeader from '../components/AppHeader'
import { directionLabel, type ZoneItem } from '../types'
import { parseStake, stake } from '../zone/utils'
import { formatTime } from '../util'

/** 结束桩号 = 起始桩号 + 作业区长度（自动派生，与记录端一致） */
function rangeLabel(z: ZoneItem): string {
  const start = parseStake(z.stake)
  if (start == null || z.length < 10) return z.stake
  return `${stake(start)} — ${stake(start + (z.direction === 'down' ? -z.length : z.length))}`
}

export default function ZonesPage() {
  const [zones, setZones] = useState<ZoneItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    listZones()
      .then(setZones)
      .catch((reason) => setError(reason instanceof Error ? reason.message : '布控区域加载失败'))
      .finally(() => setLoading(false))
  }, [])

  const visible = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return zones
    return zones.filter((z) => `${z.stake} ${rangeLabel(z)}`.toLowerCase().includes(keyword))
  }, [zones, search])

  return (
    <div className="app-frame">
      <AppHeader trail={['首页', '布控区域']} />
      <main className="registry-page">
        <section className="registry-heading">
          <div>
            <p className="eyebrow">作业区布置</p>
            <h1>布控区域</h1>
            <p>独立设置与管理作业区布置图，不依赖施工记录，可随时打印或发群确认。</p>
          </div>
          <div className="heading-actions">
            <button className="btn btn-primary" onClick={() => (window.location.hash = '#/zones/new')}>
              <Plus />
              新建布控
            </button>
          </div>
        </section>

        {error ? <div className="notice error">{error}</div> : null}

        <section className="dashboard-controls" aria-label="布控区域筛选">
          <label className="dashboard-search">
            <Search aria-hidden="true" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="搜索桩号"
            />
          </label>
        </section>

        {loading ? <div className="table-empty">正在加载布控区域…</div> : null}
        {!loading && visible.length === 0 ? (
          <div className="table-empty">
            {zones.length ? '没有匹配的布控区域。' : '还没有布控区域，点击「新建布控」设置第一个作业区布置图。'}
          </div>
        ) : null}

        {!loading && visible.length ? (
          <section className="zone-list" aria-label="布控区域列表">
            {visible.map((zone) => (
              <button
                key={zone.id}
                className="zone-list-item"
                onClick={() => (window.location.hash = `#/zones/${zone.id}`)}
              >
                <span className="zone-list-icon">
                  <TrafficCone aria-hidden="true" />
                </span>
                <span className="zone-list-main">
                  <strong>{rangeLabel(zone)}</strong>
                  <span className="zone-list-range">
                    {directionLabel(zone.direction) || '方向未指定'} · 作业区 {zone.length.toLocaleString()}m
                  </span>
                </span>
                <span className="zone-list-foot">
                  <em>
                    <CalendarClock aria-hidden="true" />
                    {formatTime(zone.updated_at)}
                  </em>
                  <ChevronRight aria-hidden="true" />
                </span>
              </button>
            ))}
          </section>
        ) : null}
      </main>
    </div>
  )
}
