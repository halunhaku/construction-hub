import { photoUrl } from '../api'
import type { Phase, Photo } from '../types'
import { formatTime } from '../util'

export interface PendingItem {
  id: string
  phase: Phase
  file: File
  preview: string
}

interface Props {
  phase: Phase
  label: string
  hint: string
  photos: Photo[]
  pending: PendingItem[]
  uploading: boolean
  progress: { done: number; total: number } | null
  onUpload: () => void
  onRemovePending: (id: string) => void
  onRemovePhoto: (photoId: string) => void
}

export default function PhaseCard({
  phase,
  label,
  hint,
  photos,
  pending,
  uploading,
  progress,
  onUpload,
  onRemovePending,
  onRemovePhoto,
}: Props) {
  const myPending = pending.filter((p) => p.phase === phase)

  return (
    <div className="card phase-card">
      <div className="slot-head">
        <span className="slot-label">{label}</span>
        <span className="slot-hint">{hint}</span>
      </div>

      <div className="phase-photos">
        {photos.map((p) => (
          <div className="thumb" key={p.id}>
            <img src={photoUrl(p.id)} alt={label} loading="lazy" />
            <button
              className="thumb-del"
              title="删除这张照片"
              onClick={() => onRemovePhoto(p.id)}
            >
              ×
            </button>
            <div className="thumb-time">{formatTime(p.taken_at)}</div>
          </div>
        ))}
        {myPending.map((item) => (
          <div className="thumb thumb-pending" key={item.id}>
            <img src={item.preview} alt="待上传" />
            <button className="thumb-del" title="移除" onClick={() => onRemovePending(item.id)}>
              ×
            </button>
            <div className="thumb-time">待上传</div>
          </div>
        ))}
        {photos.length === 0 && myPending.length === 0 && (
          <div className="phase-empty">暂无照片</div>
        )}
      </div>

      {/* label 原生关联 file input：点击打开相机/相册。
          文件选择的 change 事件由 RecordPage 里的 document 级捕获监听统一处理，
          不依赖本组件的监听器，杜绝 React 重建 DOM 导致监听失效的问题。 */}
      <div className="phase-actions">
        <label className={`btn phase-capture${uploading ? ' is-disabled' : ''}`}>
          {uploading ? '⏳ 上传中…' : '📷 拍照'}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            data-phase={phase}
            disabled={uploading}
          />
        </label>
        <label className={`btn${uploading ? ' is-disabled' : ''}`}>
          {uploading ? '稍候…' : '🖼 从相册选择'}
          <input type="file" accept="image/*" multiple data-phase={phase} disabled={uploading} />
        </label>
      </div>

      {/* 本阶段的上传按钮：有待传照片时出现 */}
      {myPending.length > 0 && (
        <button
          className="btn btn-primary btn-block phase-upload"
          onClick={onUpload}
          disabled={uploading}
        >
          {uploading
            ? `上传中… ${progress?.done ?? 0}/${progress?.total ?? myPending.length}`
            : `上传 ${myPending.length} 张照片`}
        </button>
      )}
    </div>
  )
}
