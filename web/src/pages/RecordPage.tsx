import { useEffect, useMemo, useRef, useState } from 'react'
import JSZip from 'jszip'
import { deletePhoto, deleteRecord, getRecord, photoUrl, saveZone, uploadPhoto } from '../api'
import PhaseCard, { type PendingItem } from '../components/PhaseCard'
import ZoneCard from '../components/ZoneCard'
import { compressImage, watermarkImage } from '../image'
import { parseZoneParams } from '../zone/utils'
import { directionLabel, PHASES, type Phase, type Photo, type RecordItem } from '../types'
import { uid } from '../util'

export default function RecordPage({ id }: { id: string }) {
  const [record, setRecord] = useState<RecordItem | null>(null)
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

  function showFlash(msg: string) {
    setFlash(msg)
    if (flashTimer.current) window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlash(''), 4000)
  }

  const addPendingRef = useRef(addPending)
  addPendingRef.current = addPending

  // 文件选择统一在这里用 document 级捕获监听处理：
  // 捕获阶段在事件到达目标之前，即使 React 重建了组件内部的 input DOM，
  // document 级监听也一定能收到 change 事件。
  useEffect(() => {
    const handler = (ev: Event) => {
      const el = ev.target
      if (!(el instanceof HTMLInputElement) || el.type !== 'file') return
      const phase = el.dataset.phase as Phase | undefined
      // FileList 在部分移动浏览器中是实时对象；必须先复制，再清空 input。
      const files = Array.from(el.files ?? [])
      el.value = ''
      if (phase && files.length) {
        showFlash(`已选择 ${files.length} 张照片，点击下方「上传」按钮提交`)
        addPendingRef.current(phase, files)
      }
    }
    document.addEventListener('change', handler, true)
    return () => document.removeEventListener('change', handler, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load() {
    try {
      setRecord(await getRecord(id))
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function addPending(phase: Phase, files: File[]) {
    try {
      const items: PendingItem[] = files.map((f) => ({
        id: uid(),
        phase,
        file: f,
        preview: URL.createObjectURL(f),
      }))
      setPending((p) => [...p, ...items])
      setError('')
    } catch (e) {
      setError('添加照片失败：' + (e instanceof Error ? e.message : String(e)))
    }
  }

  function removePending(itemId: string) {
    setPending((p) => {
      const item = p.find((x) => x.id === itemId)
      if (item) URL.revokeObjectURL(item.preview)
      return p.filter((x) => x.id !== itemId)
    })
  }

  // 按阶段上传：只上传该阶段的待传照片
  async function uploadPhase(phase: Phase) {
    const items = pending.filter((p) => p.phase === phase)
    if (!record || items.length === 0 || uploadingPhase) return
    setUploadingPhase(phase)
    setError('')
    const total = items.length
    let ok = 0
    let fail = 0
    for (let i = 0; i < total; i++) {
      const item = items[i]
      try {
        const blob = await compressImage(item.file)
        await uploadPhoto(record.id, item.phase, blob)
        ok++
      } catch {
        fail++
      }
      setProgress({ done: i + 1, total })
    }
    items.forEach((item) => URL.revokeObjectURL(item.preview))
    setPending((p) => p.filter((x) => x.phase !== phase))
    setUploadingPhase(null)
    await load()
    if (fail > 0) setError(`上传完成：成功 ${ok} 张，失败 ${fail} 张`)
  }

  async function removePhoto(photoId: string) {
    if (!window.confirm('确定删除这张照片吗？')) return
    try {
      await deletePhoto(photoId)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败')
    }
  }

  // 打包下载全部照片（带水印）
  async function downloadAll() {
    if (!record || downloading) return
    const all = PHASES.flatMap((p) =>
      record.photos[p.key].map((ph) => ({ phase: p.key, photo: ph })),
    )
    if (all.length === 0) {
      showFlash('暂无照片可下载')
      return
    }
    setDownloading(true)
    setError('')
    try {
      const zip = new JSZip()
      const base = [
        record.project_name,
        `${record.highway} ${record.section} ${record.stake}${record.direction ? `（${directionLabel(record.direction)}）` : ''}`,
        `施工日期：${record.work_date}`,
      ]
      for (const { phase, photo } of all) {
        const phaseLabel = PHASES.find((p) => p.key === phase)?.label ?? phase
        const blob = await watermarkImage(photoUrl(photo.id), [
          ...base,
          `阶段：${phaseLabel}`,
          `拍摄：${photo.taken_at}`,
        ])
        zip.file(`${phaseLabel}/${photo.id}.jpg`, blob)
      }
      const content = await zip.generateAsync({ type: 'blob' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(content)
      a.download = `${record.highway}_${record.stake}_三照照片.zip`
      a.click()
      URL.revokeObjectURL(a.href)
      showFlash(`已打包下载 ${all.length} 张照片（带水印）`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '打包下载失败')
    } finally {
      setDownloading(false)
    }
  }

  async function remove() {
    if (!window.confirm('确定删除这条记录吗？所有照片将一并删除。')) return
    try {
      await deleteRecord(id)
      window.location.hash = '#/'
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败')
    }
  }

  async function clearZone() {
    if (!window.confirm('确定清除这条记录的作业区布置图吗？')) return
    try {
      await saveZone(id, null)
      await load()
      showFlash('已清除作业区布置图')
    } catch (e) {
      setError(e instanceof Error ? e.message : '清除失败')
    }
  }

  if (error && !record) return <div className="page notice error">{error}</div>

  return (
    <div className="page">
      <header className="topbar">
        <button className="btn" onClick={() => (window.location.hash = '#/')}>
          ← 返回
        </button>
        <h1>三照详情</h1>
        <button className="btn btn-danger" onClick={remove}>
          删除
        </button>
      </header>

      {record && (
        <>
          <div className="card record-info">
            <div className="info-row">
              <span className="info-label">项目名称</span>
              <span className="info-value">{record.project_name}</span>
            </div>
            <div className="info-row">
              <span className="info-label">高速公路</span>
              <span className="info-value">{record.highway}</span>
            </div>
            <div className="info-row">
              <span className="info-label">路段</span>
              <span className="info-value">{record.section}</span>
            </div>
            <div className="info-row">
              <span className="info-label">桩号</span>
              <span className="info-value">
                {record.stake}
                {record.direction && `（${directionLabel(record.direction)}）`}
              </span>
            </div>
            {record.content && (
              <div className="info-row">
                <span className="info-label">施工内容</span>
                <span className="info-value">{record.content}</span>
              </div>
            )}
            <div className="info-row">
              <span className="info-label">施工日期</span>
              <span className="info-value">{record.work_date}</span>
            </div>
          </div>

          {zoneParams ? (
            <ZoneCard
              params={zoneParams}
              onEdit={() => (window.location.hash = `#/record/${id}/zone`)}
              onClear={clearZone}
            />
          ) : (
            <div className="card zone-entry">
              <h2>作业区布置图</h2>
              <p className="zone-entry-hint">
                尚未设置。可为这条施工记录生成并保存作业区布置图（含各分区桩号与标志牌位置），并导出 A4 图纸。
              </p>
              <button
                className="btn btn-primary btn-block"
                onClick={() => (window.location.hash = `#/record/${id}/zone`)}
              >
                ＋ 设置作业区布置
              </button>
            </div>
          )}

          {error && <div className="notice error">{error}</div>}
          {flash && <div className="flash">{flash}</div>}

          <div className="card record-actions">
            <button
              className="btn btn-primary btn-block"
              onClick={downloadAll}
              disabled={downloading}
            >
              {downloading ? '⏳ 打包下载中…' : '⬇ 下载全部照片（带水印）'}
            </button>
          </div>

          {PHASES.map((p) => (
            <PhaseCard
              key={p.key}
              phase={p.key}
              label={p.label}
              hint={p.hint}
              photos={record.photos[p.key]}
              pending={pending}
              uploading={uploadingPhase === p.key}
              progress={uploadingPhase === p.key ? progress : null}
              onUpload={() => uploadPhase(p.key)}
              onRemovePending={removePending}
              onRemovePhoto={removePhoto}
              onViewPhoto={setViewer}
            />
          ))}
          <p className="tip">每个阶段分别上传，每阶段不限张数。</p>
        </>
      )}

      {viewer && (
        <div className="photo-viewer" onClick={() => setViewer(null)}>
          <img src={photoUrl(viewer.id)} alt="照片预览" />
          <span className="photo-viewer-close">点击任意处关闭</span>
        </div>
      )}
    </div>
  )
}
