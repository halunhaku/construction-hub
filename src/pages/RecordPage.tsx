import { useEffect, useMemo, useRef, useState } from 'react'
import JSZip from 'jszip'
import { CalendarDays, CloudSun, Download, Edit3, ImagePlus, MapPin, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
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
import { compressImage, watermarkImage } from '../image'
import { buildExportPage, renderPageToBlob, signSchedule, signScheduleDouble, snapshotDiagram } from '../zone/export'
import { buildZones, parseZoneParams, stake } from '../zone/utils'
import { directionLabel, PHASE_COLORS, PHASE_SHORT, PHASES, type Phase, type Photo, type RecordItem } from '../types'
import { formatTime, uid } from '../util'

function recordState(record: RecordItem): { label: string; className: string } {
  const beforeReady = record.photos.before.length > 0
  const duringReady = record.photos.during.length > 0
  const afterReady = record.photos.after.length > 0
  if (beforeReady && duringReady && !afterReady) return { label: '施工中', className: 'progress' }
  if (!record.zone_params || !beforeReady || !duringReady || !afterReady) return { label: '资料待补充', className: 'incomplete' }
  return { label: '已完整', className: 'complete' }
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
  const [records, setRecords] = useState<RecordItem[]>([])
  const [error, setError] = useState('')
  const [pending, setPending] = useState<PendingItem[]>([])
  const [uploadingPhase, setUploadingPhase] = useState<Phase | null>(null)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [viewer, setViewer] = useState<Photo | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [flash, setFlash] = useState('')
  const flashTimer = useRef<number | null>(null)

  const zoneParams = useMemo(
    () => (record?.zone_params ? parseZoneParams(record.zone_params) : null),
    [record],
  )
  const zoneSummary = useMemo(() => {
    if (!zoneParams) return null
    const zones = buildZones(zoneParams)
    const allStakes = zones.flatMap((zone) => [zone.start, zone.end])
    return {
      total: zones.reduce((sum, zone) => sum + zone.length, 0),
      from: stake(Math.min(...allStakes)),
      to: stake(Math.max(...allStakes)),
    }
  }, [zoneParams])

  function showFlash(message: string) {
    setFlash(message)
    if (flashTimer.current) window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlash(''), 4000)
  }

  function addPending(phase: Phase, files: File[]) {
    try {
      const items = files.map((file) => ({ id: uid(), phase, file, preview: URL.createObjectURL(file) }))
      setPending((current) => [...current, ...items])
      setError('')
    } catch (reason) {
      setError('添加照片失败：' + (reason instanceof Error ? reason.message : String(reason)))
    }
  }

  const addPendingRef = useRef(addPending)
  addPendingRef.current = addPending

  useEffect(() => {
    const handler = (event: Event) => {
      const input = event.target
      if (!(input instanceof HTMLInputElement) || input.type !== 'file' || !input.dataset.phase) return
      const phase = input.dataset.phase as Phase
      const files = Array.from(input.files ?? [])
      input.value = ''
      if (files.length > 0) {
        showFlash(`已选择 ${files.length} 张照片，请点击上传`)
        addPendingRef.current(phase, files)
      }
    }
    document.addEventListener('change', handler, true)
    return () => document.removeEventListener('change', handler, true)
  }, [])

  async function load() {
    setError('')
    try {
      const [current, all] = await Promise.all([getRecord(id), listRecords()])
      setRecord(current)
      setRecords(all)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '加载失败')
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function removePending(itemId: string) {
    setPending((current) => {
      const item = current.find((candidate) => candidate.id === itemId)
      if (item) URL.revokeObjectURL(item.preview)
      return current.filter((candidate) => candidate.id !== itemId)
    })
  }

  async function uploadPhase(phase: Phase) {
    const items = pending.filter((item) => item.phase === phase)
    if (!record || items.length === 0 || uploadingPhase) return
    setUploadingPhase(phase)
    setError('')
    let succeeded = 0
    let failed = 0
    for (let index = 0; index < items.length; index++) {
      try {
        const blob = await compressImage(items[index]!.file)
        await uploadPhoto(record.id, phase, blob)
        succeeded++
      } catch {
        failed++
      }
      setProgress({ done: index + 1, total: items.length })
    }
    items.forEach((item) => URL.revokeObjectURL(item.preview))
    setPending((current) => current.filter((item) => item.phase !== phase))
    setUploadingPhase(null)
    await load()
    showFlash(failed ? `上传完成：成功 ${succeeded} 张，失败 ${failed} 张` : `已上传 ${succeeded} 张照片`)
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

  /** 把当前作业区布置图渲染成 A4 横向 JPG（3508×2480，与「导出图纸 JPG」一致） */
  async function buildDiagramBlob(): Promise<Blob | null> {
    if (!zoneParams) return null
    const svg = document.querySelector<SVGSVGElement>('.diagram-stage .roadSvg')
    if (!svg) return null
    const zones = buildZones(zoneParams)
    const page = buildExportPage({
      ...snapshotDiagram(svg),
      params: zoneParams,
      zones,
      signRows: zoneParams.doubleSide
        ? signScheduleDouble(zones, zoneParams.direction)
        : signSchedule(zones, zoneParams.direction),
      total: zones.reduce((sum, zone) => sum + zone.length, 0),
      doubleSide: zoneParams.doubleSide,
    })
    return renderPageToBlob(page, 3508, 2480)
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
      // 先放作业区布置图，再放三阶段照片
      if (zoneParams) {
        try {
          const diagram = await buildDiagramBlob()
          if (diagram) {
            zip.file('作业区布置图.jpg', diagram)
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
      anchor.href = URL.createObjectURL(content)
      anchor.download = `${record.highway}_${record.stake}_施工档案.zip`
      anchor.click()
      URL.revokeObjectURL(anchor.href)
      const parts = [
        all.length ? `${all.length} 张照片` : '',
        diagramIncluded ? '作业区布置图' : '',
      ].filter(Boolean)
      showFlash(`已打包下载 ${parts.join('和')}`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '打包下载失败')
    } finally {
      setDownloading(false)
    }
  }

  async function remove() {
    if (!window.confirm('确定删除这条记录和全部照片吗？')) return
    await deleteRecord(id)
    window.location.hash = '#/'
  }

  async function clearZone() {
    if (!window.confirm('确定清除作业区布置图吗？')) return
    await saveZone(id, null)
    await load()
  }

  if (!record) {
    return <div className="app-frame"><AppHeader trail={['项目', '记录管理', '记录详情']} /><div className="page-loading">{error || '正在加载记录…'}</div></div>
  }

  const status = recordState(record)
  const projectRecords = records.filter((item) => item.project_name === record.project_name)

  return (
    <div className="app-frame detail-frame">
      <AppHeader trail={['项目', '记录管理', '记录详情']} project={`${record.project_name} · ${record.section}`} />
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
              const itemStatus = recordState(item)
              return (
                <button
                  className={`sidebar-record${item.id === id ? ' active' : ''}`}
                  key={item.id}
                  onClick={() => (window.location.hash = `#/record/${item.id}`)}
                >
                  <span className="sidebar-record-title">
                    <strong>{item.stake} {directionLabel(item.direction)}</strong>
                    <i className={itemStatus.className}>{itemStatus.label}</i>
                  </span>
                  <span>{item.content || item.work_location || '未填写施工内容'}</span>
                  <small>{item.work_date}</small>
                </button>
              )
            })}
          </div>
        </aside>

        <main className="drawing-workspace">
          <header className="workspace-heading">
            <div>
              <h1>{record.stake} {directionLabel(record.direction)} · {record.content || '施工记录'}</h1>
              <p><CalendarDays /> {record.work_date}<CloudSun /> 晴 28℃</p>
            </div>
            <div className="workspace-actions">
              <button className="btn btn-secondary" onClick={() => void downloadAll()} disabled={downloading}>
                <Download /> {downloading ? '打包中…' : '导出档案'}
              </button>
              <button className="btn" onClick={() => (window.location.hash = `#/record/${id}/edit`)}>
                <Pencil /> 编辑
              </button>
              <button className="btn btn-primary" onClick={() => (window.location.hash = `#/record/${id}/zone`)}>
                <Edit3 /> {zoneParams ? '编辑布置' : '创建布置'}
              </button>
            </div>
          </header>
          {error ? <div className="notice error">{error}</div> : null}
          {flash ? <div className="flash">{flash}</div> : null}

          {zoneParams ? (
            <ZoneCard params={zoneParams} onEdit={() => (window.location.hash = `#/record/${id}/zone`)} onClear={clearZone} workspace />
          ) : (
            <section className="drawing-empty">
              <MapPin />
              <h2>还没有作业区布置图</h2>
              <p>根据导入的起始桩号和方向生成分区、标志牌与锥桶布置。</p>
              <button className="btn btn-primary" onClick={() => (window.location.hash = `#/record/${id}/zone`)}>
                <Edit3 /> 创建布置
              </button>
            </section>
          )}

          <section className="photo-workspace">
            <div className="section-heading">
              <div><p className="eyebrow">影像证据</p><h2>三阶段照片管理</h2></div>
              <button className="icon-btn" aria-label="更多照片操作"><MoreHorizontal /></button>
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
                  onUpload={() => void uploadPhase(phase.key)}
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
                <div><dt>限速值</dt><dd>{zoneParams.speed}km/h</dd></div>
                <div><dt>布置总长</dt><dd>{zoneSummary.total}m</dd></div>
                <div><dt>影响范围</dt><dd className="numeric">{zoneSummary.from} — {zoneSummary.to}</dd></div>
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
        <button className="photo-viewer" onClick={() => setViewer(null)} aria-label="关闭照片预览">
          <img src={photoUrl(viewer.id)} alt="照片预览" />
          <span>点击任意处关闭</span>
        </button>
      ) : null}
    </div>
  )
}
