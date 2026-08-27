import { useEffect, useMemo, useState } from 'react'
import { deleteZone, getZone } from '../api'
import AppHeader from '../components/AppHeader'
import QrPanel from '../components/QrPanel'
import ZoneCard from '../components/ZoneCard'
import type { ZoneItem } from '../types'
import { parseStake, parseZoneParams, stake } from '../zone/utils'
import { formatTime } from '../util'

export default function ZoneDetailPage({ id }: { id: string }) {
  const [item, setItem] = useState<ZoneItem | null>(null)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')

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
    const length = item?.length ?? 0
    return start != null && length >= 10 ? stake(start + (item?.direction === 'down' ? -length : length)) : ''
  }, [item])

  async function handleDelete() {
    if (!item) return
    const ok = window.confirm(`确定删除布控区域（${item.stake}）吗？此操作不可恢复。`)
    if (!ok) return
    setActionError('')
    try {
      await deleteZone(item.id)
      window.location.hash = '#/zones'
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : '删除失败')
    }
  }

  if (error) return <div className="app-frame"><AppHeader trail={['首页', '布控区域', '详情']} /><div className="page notice error">{error}</div></div>
  if (!item || !params) return <div className="app-frame"><AppHeader trail={['首页', '布控区域', '详情']} /><div className="table-empty">正在加载布控区域…</div></div>

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
            <strong>
              {item.stake}
              {endStake ? ` — ${endStake}` : ''}
            </strong>
            <p>作业区 {item.length.toLocaleString()}m · 更新于 {formatTime(item.updated_at)}</p>
          </div>
        </div>

        <QrPanel
          hash={`#/zones/${item.id}`}
          title="扫码查看这张布置图"
          subtitle="发给现场或群里，扫开即可看图并导出。"
          caption={endStake ? `${item.stake} — ${endStake}` : item.stake}
          filename={`布控二维码-${item.stake}.png`}
          size="compact"
        />

        {actionError ? <div className="notice error">{actionError}</div> : null}
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
