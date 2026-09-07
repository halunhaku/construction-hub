import { useState, type RefObject } from 'react'
import { Download, Images } from 'lucide-react'
import { ZoneDiagrams } from '../../RoadDiagram'
import { buildExportPages, downloadPdf, renderPageToBlob, signSchedule, signScheduleDouble, snapshotDiagram } from '../../export'
import { buildZones } from '../../utils'
import { validateZone } from '../../validation'
import type { Params } from '../../types'
import type { RoadLayout } from '../layout/buildLayout'


export function PlanPanel({
  params,
  layout,
  folded,
  onToggleFold,
  hostRef,
}: {
  params: Params
  layout: RoadLayout
  folded: boolean
  onToggleFold: () => void
  hostRef: RefObject<HTMLDivElement | null>
}) {
  const [exporting, setExporting] = useState<'pdf' | 'album' | null>(null)
  const [flash, setFlash] = useState('')

  function collectPages(): string[] | null {
    const errors = validateZone(params)
    const first = Object.entries(errors)[0]
    if (first) {
      setFlash(`${first[0] === 'start' ? '起始桩号' : first[0] === 'work' ? '作业区长度' : '布置参数'}：${first[1]}`)
      return null
    }
    const svgs = [...(hostRef.current?.querySelectorAll<SVGSVGElement>('.roadSvg') ?? [])]

    if (svgs.length === 0) {
      setFlash('布置图未就绪，请稍后重试')
      return null
    }
    setFlash('')
    const zones = buildZones(params)
    const total = zones.reduce((sum, zone) => sum + zone.length, 0)
    const signRows = params.doubleSide
      ? signScheduleDouble(zones, params.direction, params.speed)
      : signSchedule(zones, params.direction, params.speed)
    const { diagramPages, tablePage } = buildExportPages({
      diagrams: svgs.map((svg) => ({
        ...snapshotDiagram(svg),
        caption: !params.doubleSide ? '' : svg.getAttribute('data-direction') === 'down' ? '下行' : '上行',
      })),
      params,
      zones,
      signRows,
      total,
      doubleSide: params.doubleSide,
      orientation: 'portrait',
    })
    return [...diagramPages, tablePage]
  }

  function exportA4() {
    const pages = collectPages()
    if (!pages) return
    setExporting('pdf')
    downloadPdf(pages, 2480, 3508, 210, 297, `A4纵向-作业区布置-${params.start}.pdf`, () => setExporting(null))
  }

  async function saveAlbum() {
    const pages = collectPages()
    if (!pages) return
    setExporting('album')
    try {
      const files: File[] = []
      for (const [index, page] of pages.entries()) {
        const blob = await renderPageToBlob(page, 2480, 3508, 'image/jpeg', 0.92)
        files.push(new File([blob], `A4布置图-${index + 1}-${params.start}.jpg`, { type: 'image/jpeg' }))
      }
      const mobile = window.matchMedia('(pointer: coarse)').matches || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      try {
        if (mobile && navigator.canShare?.({ files })) {
          await navigator.share({ files, title: 'A4 布置图' })
          return
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
      }
      files.forEach((file, index) => {
        window.setTimeout(() => {
          const a = document.createElement('a')
          const url = URL.createObjectURL(file)
          a.href = url
          a.download = file.name
          a.click()
          window.setTimeout(() => URL.revokeObjectURL(url), 2000)
        }, index * 450)
      })
    } catch (err) {
      setFlash(err instanceof Error ? err.message : '保存失败')
    } finally {
      setExporting(null)
    }
  }



  return (
    <aside className={folded ? 'plan-panel panel-folded' : 'plan-panel'}>
      {folded ? (
        <button
          type="button"
          className="fold-tab"
          aria-expanded={false}
          aria-label="展开布置图栏"
          title="展开布置图栏"
          onClick={onToggleFold}
        >
          <div className="fold-tab-icon">
            <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="2" y="2.5" width="12" height="11" rx="2" />
              <path d="M10 2.5v11" />
            </svg>
          </div>
          <span className="fold-tab-title">布置图</span>
          <svg className="fold-tab-arrow" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M10 3.5L5.5 8l4.5 4.5" />
          </svg>
        </button>
      ) : (
        <>
          <div className="panel-header">
            <div className="eyebrow-badge">
              <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
                <path d="M2 6h12M6 6v7.5" />
              </svg>
              <span>JTG H30 · 规程图式</span>
            </div>
            <button
              type="button"
              className="fold-btn"
              aria-expanded={true}
              title="收起布置图栏"
              aria-label="收起布置图栏"
              onClick={onToggleFold}
            >
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="2" y="2.5" width="12" height="11" rx="2" />
                <path d="M10 2.5v11" />
              </svg>
              <span>收起</span>
            </button>
          </div>
          <header className="panel-brand">
            <h1>2D 布置图</h1>
            <p className="sub">与 3D 同步联动 · 导出同源</p>
          </header>
        </>
      )}

      <div className="panel-body plan-body" ref={hostRef}>
        <ZoneDiagrams
          zones={layout.zones}
          direction={params.direction}
          workSide={params.workSide}
          doubleSide={params.doubleSide}
          zoom={1}
          coneGap={params.coneGap}
          speed={params.speed}
          vertical
        />
      </div>
      {folded ? null : (
        <div className="plan-export">
          {flash ? <div className="notice error">{flash}</div> : null}
          <button type="button" className="btn btn-primary" disabled={Boolean(exporting)} onClick={exportA4}>
            <Download />
            {exporting === 'pdf' ? '正在生成 A4…' : '导出 A4 布置图'}
          </button>
          <button type="button" className="btn" disabled={Boolean(exporting)} onClick={() => void saveAlbum()}>
            <Images />
            {exporting === 'album' ? '正在生成图片…' : (
              <>
                <span className="plan-export-desktop-label">下载图片</span>
                <span className="plan-export-mobile-label">保存到相册</span>
              </>
            )}
          </button>


        </div>
      )}

    </aside>
  )
}

