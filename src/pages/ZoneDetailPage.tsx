import { useEffect, useMemo, useState } from 'react'
import { deleteZone, getZone } from '../api'
import AppHeader from '../components/AppHeader'
import ZoneCard from '../components/ZoneCard'
import type { ZoneItem } from '../types'
import { parseStake, parseZoneParams, stake } from '../zone/utils'
import { formatTime } from '../util'

export default function ZoneDetailPage({ id }: { id: string }) {
  const [item, setItem] = useState<ZoneItem | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    getZone(id)
      .then((zone) => {
        if (!cancelled) setItem(zone)
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : '布控区域加载失败')
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const params = useMemo(() => (item ? parseZoneParams(item.zone_params) : null), [item])

  // 结束桩号 = 起始桩号 + 作业区长度（自动派生，只读展示）
  const endStake = useMemo(() => {
    const start = parseStake(item?.stake ?? '')
    return start != null && (item?.length ?? 0) >= 10 ? stake(start + (item?.length ?? 0)) : ''
  }, [item])

  function handleDelete() {
    if (!item) return
    const ok = window.confirm(`确定删除「${item.project_name}」的布控区域（${item.stake}）吗？此操作不可恢复。`)
    if (!ok) return
    deleteZone(item.id)
      .then(() => {
        window.location.hash = '#/zones'
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : '删除失败'))
  }

  if (error) return <div className="app-frame"><AppHeader trail={['首页', '布控区域', '详情']} /><div className="page notice error">{error}</div></div>
  if (!item || !params) return <div className="app-frame"><AppHeader trail={['首页', '布控区域', '详情']} /><div className="table-empty">正在加载布控区域…</div></div>

  const location = [item.highway, item.section].filter(Boolean).join(' · ') || '未填写道路与路段'

  return (
    <div className="app-frame">
      <AppHeader trail={['首页', '布控区域', '详情']} />
      <div className="page">
        <header className="topbar">
          <button className="btn" onClick={() => (window.location.hash = '#/zones')}>
            ← 返回
          </button>
          <h1>布控区域</h1>
          <span className="topbar-spacer" />
        </header>

        <div className="card form-card zone-detail-head">
          <div>
            <strong>{item.project_name}</strong>
            <p>
              {item.stake}
              {endStake ? ` — ${endStake}` : ''} · 总长 {item.length.toLocaleString()}m · 更新于 {formatTime(item.updated_at)}
            </p>
            <small>{location}</small>
          </div>
        </div>

        {error ? <div className="notice error">{error}</div> : null}
        <ZoneCard
          params={params}
          onEdit={() => (window.location.hash = `#/zones/${item.id}/edit`)}
          onClear={handleDelete}
          clearLabel="删除布控"
        />
      </div>
    </div>
  )
}
