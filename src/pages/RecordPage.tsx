import { useEffect, useMemo, useRef, useState } from 'react'
import JSZip from 'jszip'
import { CalendarDays, ChevronLeft, ChevronRight, Download, Edit3, ImagePlus, MapPin, Pencil, Trash2 } from 'lucide-react'
import {
  deletePhoto,
  deleteRecord,
  getRecord,
  listRecords,
  photoUrl,
  saveZone,
  uploadPhoto,
} from '../api'
import AppHeader from '../components/AppHeader'
import ExcelImportButton from '../components/ExcelImportButton'
import PhaseCard, { type PendingItem } from '../components/PhaseCard'
import ZoneCard from '../components/ZoneCard'
import { compressImage, photoTakenAtUtc, watermarkImage } from '../image'
import { buildExportPages, renderPageToBlob, signSchedule, signScheduleDouble, snapshotDiagram } from '../zone/export'
import { buildZones, mirrorZones, parseZoneParams, stake, zoneExtent } from '../zone/utils'
import {
  directionLabel,
  photoCountsOf,
  PHASE_COLORS,
  PHASE_SHORT,
  PHASES,
  recordStateFromCounts,
  type Phase,
  type Photo,
  type RecordItem,
  type RecordSummary,
} from '../types'
import { formatTime, uid } from '../util'

function recordState(record: RecordItem): { label: string; className: string } {
  return recordStateFromCounts(photoCountsOf(record), record.zone_params)
}

/**
 * 照片唯一编号：路线号-桩号数字-拍摄日期(月日)-序号，如 S50-96350-0808-003。
 * 序号为记录内照片按拍摄时间排序的稳定序号（导出不随机变化）。
 */
function photoNoOf(record: RecordItem, photo: Photo, seq: number): string {
  const route = (record.highway.match(/^[A-Za-z]+\d+/) ?? [''])[0]
  const stakeDigits = record.stake.replace(/\D/g, '')
  const local = formatTime(photo.taken_at) // YYYY-MM-DD HH:MM:SS（本地时间）
  const mmdd = local.slice(5, 7) + local.slice(8, 10)
  return `${route}-${stakeDigits}-${mmdd}-${String(seq).padStart(3, '0')}`
}

export default function RecordPage({ id }: { id: string }) {
  const [record, setRecord] = useState<RecordItem | null>(null)
  const [records, setRecords] = useState<RecordSummary[]>([])
  const [error, setError] = useState('')
  const [pending, setPending] = useState<PendingItem[]>([])
  const [uploadingPhase, setUploadingPhase] = useState<Phase | null>(null)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [viewer, setViewer] = useState<Photo | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [flash, setFlash] = useState('')
  const flashTimer = useRef<number | null>(null)

  const gallery = useMemo(
    () => (record ? PHASES.flatMap((phase) => record.photos[phase.key]) : []),
    [record],
  )
  const viewerIndex = viewer ? gallery.findIndex((photo) => photo.id === viewer.id) : -1

  const zoneParams = useMemo(
    () => (record?.zone_params ? parseZoneParams(record.zone_params) : null),
    [record],
  )
  const zoneSummary = useMemo(() => {
    if (!zoneParams) return null
    const zones = buildZones(zoneParams)
    const mirrored = zoneParams.doubleSide ? mirrorZones(zones, zoneParams.direction) : undefined
    const extent = zoneExtent(zones, mirrored)
    return {
      total: zones.reduce((sum, zone) => sum + zone.length, 0),
      from: stake(extent.min),
      to: stake(extent.max),
      span: extent.span,
    }
  }, [zoneParams])

  function showFlash(message: string) {
    setFlash(message)
    if (flashTimer.current) window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlash(''), 4000)
  }

  const recordRef = useRef(record)
  recordRef.current = record
  const pendingRef = useRef<PendingItem[]>([])
  pendingRef.current = pending
  const uploadingRef = useRef<Phase | null>(null)

  const uploadItemsRef = useRef<(phase: Phase, items: PendingItem[]) => Promise<void>>(async () => undefined)

  async function uploadItems(phase: Phase, items: PendingItem[]) {
    const currentRecord = recordRef.current
    if (!currentRecord || items.length === 0 || uploadingRef.current) return
    uploadingRef.current = phase
    setUploadingPhase(phase)
    setError('')
    let succeeded = 0
    let failed = 0
    const succeededIds = new Set<string>()
    for (let index = 0; index < items.length; index++) {
      const item = items[index]!
      try {
        const [blob, takenAt] = await Promise.all([compressImage(item.file), photoTakenAtUtc(item.file)])
        await uploadPhoto(currentRecord.id, phase, blob, takenAt)
        succeeded++
        succeededIds.add(item.id)
        URL.revokeObjectURL(item.preview)
      } catch {
        failed++
      }
      setProgress({ done: index + 1, total: items.length })
    }
    setPending((current) => current.filter((item) => !succeededIds.has(item.id)))
    uploadingRef.current = null
    setUploadingPhase(null)
    await load()
    if (failed && succeeded) showFlash(`上传完成：成功 ${succeeded} 张，失败 ${failed} 张，可点重新上传`)
    else if (failed) showFlash(`上传失败 ${failed} 张，可点重新上传`)
    else showFlash(`已上传 ${succeeded} 张照片`)
  }
  uploadItemsRef.current = uploadItems

  useEffect(() => {
    const handler = (event: Event) => {
      const input = event.target
      if (!(input instanceof HTMLInputElement) || input.type !== 'file' || !input.dataset.phase) return
      const phase = input.dataset.phase as Phase
      const files = Array.from(input.files ?? [])
      input.value = ''
      if (files.length === 0) return
      try {
        const items = files.map((file) => ({ id: uid(), phase, file, preview: URL.createObjectURL(file) }))
        setPending((current) => [...current, ...items])
        setError('')
        void uploadItemsRef.current(phase, items)
      } catch (reason) {
        setError('添加照片失败：' + (reason instanceof Error ? reason.message : String(reason)))
      }
    }
    document.addEventListener('change', handler, true)
    return () => document.removeEventListener('change', handler, true)
  }, [])

  // 卸载时释放所有待上传照片的 objectURL
  useEffect(() => {
    return () => {
      pendingRef.current.forEach((item) => URL.revokeObjectURL(item.preview))
    }
  }, [])

  async function load() {
    setError('')
    try {
      const current = await getRecord(id)
      setRecord(current)
      setRecords(await listRecords({ project: current.project_name }))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '加载失败')
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (!viewer) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setViewer(null)
        return
      }
      if (event.key === 'ArrowLeft' && viewerIndex > 0) {
        event.preventDefault()
        setViewer(gallery[viewerIndex - 1]!)
      }
      if (event.key === 'ArrowRight' && viewerIndex >= 0 && viewerIndex < gallery.length - 1) {
        event.preventDefault()
        setViewer(gallery[viewerIndex + 1]!)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [gallery, viewer, viewerIndex])

  function removePending(itemId: string) {
    setPending((current) => {
      const item = current.find((candidate) => candidate.id === itemId)
      if (item) URL.revokeObjectURL(item.preview)
      return current.filter((candidate) => candidate.id !== itemId)
    })
  }

  function retryPhase(phase: Phase) {
    const items = pending.filter((item) => item.phase === phase)
    void uploadItems(phase, items)
  }

  async function removePhoto(photoId: string) {
    if (!window.confirm('确定删除这张照片吗？')) return
    try {
      await deletePhoto(photoId)
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '删除失败')
    }
  }

  /** 把当前作业区布置渲染成 A4 纵向 JPG（布置图 1～2 张 + 一览表，与「导出 JPG」一致） */
  async function buildExportBlobs(): Promise<{ diagrams: { name: string; blob: Blob }[]; table: Blob } | null> {
    if (!zoneParams) return null
    const svgs = [...document.querySelectorAll<SVGSVGElement>('.diagram-stage .roadSvg')]
    if (svgs.length === 0) return null
    const zones = buildZones(zoneParams)
    const pages = buildExportPages({
      diagrams: svgs.map((svg) => ({
        ...snapshotDiagram(svg),
        caption: !zoneParams.doubleSide ? '' : svg.getAttribute('data-direction') === 'down' ? '下行' : '上行',
      })),
      params: zoneParams,
      zones,
      signRows: zoneParams.doubleSide
        ? signScheduleDouble(zones, zoneParams.direction, zoneParams.speed)
        : signSchedule(zones, zoneParams.direction, zoneParams.speed),
      total: zones.reduce((sum, zone) => sum + zone.length, 0),
      doubleSide: zoneParams.doubleSide,
      orientation: 'portrait',
    })
    const [diagramBlobs, table] = await Promise.all([
      Promise.all(pages.diagramPages.map((page) => renderPageToBlob(page, 2480, 3508))),
      renderPageToBlob(pages.tablePage, 2480, 3508),
    ])
    const diagrams = diagramBlobs.map((blob, index) => ({
      name: zoneParams.doubleSide
        ? (index === 0 ? '作业区布置图-上行.jpg' : '作业区布置图-下行.jpg')
        : '作业区布置图.jpg',
      blob,
    }))
    return { diagrams, table }
  }

  async function downloadAll() {
    if (!record || downloading) return
    const all = PHASES.flatMap((phase) => record.photos[phase.key].map((photo) => ({ phase, photo })))
    if (all.length === 0 && !zoneParams) return showFlash('暂无照片可下载')
    // 方向文本：数据库仅存 up/down（无「佳县方向」等命名），显示标准方向
    const dirText = directionLabel(record.direction)
    // 照片序号：记录内照片按拍摄时间排序，稳定不随机
    const photoSeq = new Map<string, number>()
    all
      .slice()
      .sort((a, b) => a.photo.taken_at.localeCompare(b.photo.taken_at))
      .forEach((item, index) => photoSeq.set(item.photo.id, index + 1))
    setDownloading(true)
    try {
      const zip = new JSZip()
      let diagramIncluded = false
      // 先放作业区布置图与一览表，再放三阶段照片
      if (zoneParams) {
        try {
          const exported = await buildExportBlobs()
          if (exported) {
            for (const item of exported.diagrams) zip.file(item.name, item.blob)
            zip.file('作业区布置表.jpg', exported.table)
            diagramIncluded = true
          }
        } catch {
          // 图纸生成失败不影响照片打包
        }
      }
      for (const { phase, photo } of all) {
        const phaseLabel = phase.label
        const blob = await watermarkImage(photoUrl(photo.id), {
          main: dirText ? `${record.stake} ｜ ${dirText}` : record.stake,
          content: record.content || record.work_location || '施工记录',
          route: `${record.highway}${record.section} · ${record.work_date}`,
          unit: record.project_name,
          phase: PHASE_SHORT[phase.key],
          phaseColor: PHASE_COLORS[phase.key],
          takenAt: formatTime(photo.taken_at),
          photoNo: photoNoOf(record, photo, photoSeq.get(photo.id) ?? 0),
        })
        zip.file(`${phaseLabel}/${photo.id}.jpg`, blob)
      }
      const content = await zip.generateAsync({ type: 'blob' })
      const anchor = document.createElement('a')
      const url = URL.createObjectURL(content)
      anchor.href = url
      anchor.download = `${record.highway}_${record.stake}_施工档案.zip`
      anchor.click()
      // 延迟释放对象 URL，避免下载尚未开始就被回收（与 PNG/JPG/PDF 导出保持一致）
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      const parts = [
        all.length ? `${all.length} 张照片` : '',
        diagramIncluded ? '作业区布置图与一览表' : '',
      ].filter(Boolean)
      showFlash(`已打包下载 ${parts.join('和')}`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '打包下载失败')
    } finally {
      setDownloading(false)
    }
  }

  async function remove() {
    if (!record || !window.confirm('确定删除这条记录和全部照片吗？')) return
    const projectName = record.project_name
    try {
      await deleteRecord(id)
      window.location.hash = projectName ? `#/project/${encodeURIComponent(projectName)}` : '#/'
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '删除失败')
    }
  }

  async function clearZone() {
    if (!window.confirm('确定清除作业区布置图吗？')) return
    try {
      await saveZone(id, null)
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '清除布置图失败')
    }
  }

  if (!record) {
    return <div className="app-frame"><AppHeader trail={[{ label: '首页', href: '#/' }, { label: '记录详情' }]} /><div className="page-loading">{error || '正在加载记录…'}</div></div>
  }

  const status = recordState(record)
  const projectRecords = records.filter((item) => item.project_name === record.project_name)

  return (
    <div className="app-frame detail-frame">
      <AppHeader
        trail={[
          { label: '首页', href: '#/' },
          { label: record.project_name, href: `#/project/${encodeURIComponent(record.project_name)}` },
          { label: '记录详情' },
        ]}
        project={`${record.project_name} · ${record.section}`}
        projectKey={record.project_name}
      />
      <div className="detail-shell">
        <aside className="record-sidebar">
          <div className="sidebar-project">
            <strong>{record.project_name}</strong>
            <span>{record.section} · {record.highway}</span>
          </div>
          <div className="sidebar-list-head">
            <span>施工位置清单 <small>({projectRecords.length} 条)</small></span>
          </div>
          <ExcelImportButton compact onImported={() => void load()} />
          <div className="sidebar-records">
            {projectRecords.map((item) => {
              const itemStatus = recordStateFromCounts(item.photo_counts, item.zone_params)
              return (
                <a
                  className={`sidebar-record${item.id === id ? ' active' : ''}`}
                  key={item.id}
                  href={`#/record/${item.id}`}
                  aria-current={item.id === id ? 'page' : undefined}
                >
                  <span className="sidebar-record-title">
                    <strong>{item.stake} {directionLabel(item.direction)}</strong>
                    <i className={itemStatus.className}>{itemStatus.label}</i>
                  </span>
                  <span>{item.content || item.work_location || '未填写施工内容'}</span>
                  <small>{item.work_date}</small>
                </a>
              )
            })}
          </div>
        </aside>

        <main className="drawing-workspace">
          <header className="workspace-heading">
            <div>
              <h1>{record.stake} {directionLabel(record.direction)} · {record.content || '施工记录'}</h1>
              <p><CalendarDays /> {record.work_date}</p>
            </div>
            <div className="workspace-actions">
              <button className="btn btn-secondary" onClick={() => void downloadAll()} disabled={downloading}>
                <Download /> {downloading ? '打包中…' : '导出档案'}
              </button>
              <a className="btn" href={`#/record/${id}/edit`}>
                <Pencil /> 编辑
              </a>
              <a className="btn btn-primary" href={`#/record/${id}/zone`}>
                <Edit3 /> {zoneParams ? '编辑布置' : '创建布置'}
              </a>
              {zoneParams ? (
                <button className="btn btn-danger" onClick={() => void clearZone()}>
                  <Trash2 /> 清除布置
                </button>
              ) : null}
            </div>
          </header>
          {error ? <div className="notice error">{error}</div> : null}
          {flash ? <div className="flash" role="status" aria-live="polite">{flash}</div> : null}

          {zoneParams ? (
            <ZoneCard params={zoneParams} editHref={`#/record/${id}/zone`} onClear={clearZone} workspace />
          ) : (
            <section className="drawing-empty">
              <MapPin />
              <h2>还没有作业区布置图</h2>
              <p>有起始和结束桩号的导入会自动出图。其余请在这里按桩号生成分区、标志牌与锥桶布置。</p>
              <a className="btn btn-primary" href={`#/record/${id}/zone`}>
                <Edit3 /> 创建布置
              </a>
            </section>
          )}

          <section className="photo-workspace">
            <div className="section-heading">
              <div><p className="eyebrow">影像证据</p><h2>三阶段照片管理</h2></div>
            </div>
            <div className="phase-workspace-grid">
              {PHASES.map((phase) => (
                <PhaseCard
                  key={phase.key}
                  phase={phase.key}
                  label={phase.label}
                  hint={phase.hint}
                  photos={record.photos[phase.key]}
                  pending={pending}
                  uploading={uploadingPhase === phase.key}
                  progress={uploadingPhase === phase.key ? progress : null}
                  onUpload={() => retryPhase(phase.key)}
                  onRemovePending={removePending}
                  onRemovePhoto={(photoId) => void removePhoto(photoId)}
                  onViewPhoto={setViewer}
                />
              ))}
            </div>
          </section>
        </main>

        <aside className="record-inspector">
          <section>
            <h2>记录信息</h2>
            <dl>
              <div><dt>项目名称</dt><dd>{record.project_name}</dd></div>
              <div><dt>路段</dt><dd>{record.section} · {record.highway}</dd></div>
              <div><dt>施工位置</dt><dd>{record.work_location || '—'}</dd></div>
              <div><dt>桩号</dt><dd className="numeric">{record.stake}{record.end_stake ? ` — ${record.end_stake}` : ''}</dd></div>
              <div><dt>记录状态</dt><dd><span className={`status-dot ${status.className}`} />{status.label}</dd></div>
              <div><dt>施工日期</dt><dd>{record.work_date}</dd></div>
            </dl>
          </section>
          <section>
            <h2>布置参数</h2>
            {zoneParams && zoneSummary ? (
              <dl>
                <div><dt>作业区长度</dt><dd>{zoneParams.work}m</dd></div>
                <div><dt>缓冲区长度</dt><dd>{zoneParams.buffer}m</dd></div>
                <div><dt>设计速度</dt><dd>{zoneParams.speed}km/h</dd></div>
                <div><dt>逐级限速</dt><dd>{zoneParams.speed === 80 ? '60 → 40' : '80 → 60'}km/h</dd></div>
                <div><dt>{zoneParams.doubleSide ? '单侧布置长度' : '布置总长'}</dt><dd>{zoneSummary.total}m</dd></div>
                <div><dt>{zoneParams.doubleSide ? '整体影响范围' : '影响范围'}</dt><dd className="numeric">{zoneSummary.from} — {zoneSummary.to}</dd></div>
                {zoneParams.doubleSide ? <div><dt>整体影响跨度</dt><dd>{zoneSummary.span.toLocaleString()}m</dd></div> : null}
              </dl>
            ) : <p className="inspector-empty">尚未生成布置参数。</p>}
          </section>
          <section className="evidence-summary">
            <h2>三阶段照片证据</h2>
            {PHASES.map((phase) => {
              const photos = record.photos[phase.key]
              return (
                <div className={`evidence-phase${photos.length === 0 ? ' missing' : ''}`} key={phase.key}>
                  <div><strong>{phase.label}</strong><span>{photos.length} 张</span></div>
                  {photos.length ? (
                    <div className="evidence-thumbs">
                      {photos.slice(0, 4).map((photo) => <button key={photo.id} onClick={() => setViewer(photo)}><img src={photoUrl(photo.id)} alt={phase.label} /></button>)}
                    </div>
                  ) : (
                    <button className="missing-evidence" onClick={() => document.querySelector('.photo-workspace')?.scrollIntoView({ behavior: 'smooth' })}>
                      <ImagePlus /> 资料待补充
                    </button>
                  )}
                </div>
              )
            })}
          </section>
          <button className="danger-link" onClick={() => void remove()}><Trash2 /> 删除本条记录</button>
        </aside>
      </div>

      {viewer ? (
        <div
          className="photo-viewer"
          role="dialog"
          aria-modal="true"
          aria-label="照片预览"
          onClick={() => setViewer(null)}
        >
          {viewerIndex > 0 ? (
            <button
              type="button"
              className="photo-viewer-nav prev"
              aria-label="上一张"
              onClick={(event) => {
                event.stopPropagation()
                setViewer(gallery[viewerIndex - 1]!)
              }}
            >
              <ChevronLeft />
            </button>
          ) : null}
          {viewerIndex >= 0 && viewerIndex < gallery.length - 1 ? (
            <button
              type="button"
              className="photo-viewer-nav next"
              aria-label="下一张"
              onClick={(event) => {
                event.stopPropagation()
                setViewer(gallery[viewerIndex + 1]!)
              }}
            >
              <ChevronRight />
            </button>
          ) : null}
          <img src={photoUrl(viewer.id)} alt="照片预览" />
          <span className="photo-viewer-caption">
            {gallery.length > 1 ? `${viewerIndex + 1} / ${gallery.length} · ` : ''}
            Esc 关闭{gallery.length > 1 ? ' · 左右键切换' : ''}
          </span>
        </div>
      ) : null}
    </div>
  )
}
