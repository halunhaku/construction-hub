import { useMemo, useState } from 'react'
import { Check, Copy, Download, Search } from 'lucide-react'
import AppHeader from '../components/AppHeader'
import { SIGNS, type SignItem } from '../signs'

type Category = '全部' | '限速与解除' | '前方施工' | '车道导向' | '路栏与禁令'

function categoryOf(title: string): Category {
  if (title.includes('限速') || title.includes('解除')) return '限速与解除'
  if (title.includes('施工') || title.includes('智驾') || title.includes('长度')) return '前方施工'
  if (title.includes('导向') || title.includes('车道')) return '车道导向'
  return '路栏与禁令'
}

export default function SignsPage() {
  const [copied, setCopied] = useState<string | null>(null)
  const [category, setCategory] = useState<Category>('全部')
  const [search, setSearch] = useState('')

  const categories: Category[] = ['全部', '限速与解除', '前方施工', '车道导向', '路栏与禁令']

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return SIGNS.filter((sign) => {
      const matchCat = category === '全部' || categoryOf(sign.title) === category
      const matchSearch = !q || sign.title.toLowerCase().includes(q)
      return matchCat && matchSearch
    })
  }, [category, search])

  async function copySign(title: string, svg: string) {
    try {
      await navigator.clipboard.writeText(svg)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = svg
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(title)
    window.setTimeout(() => setCopied((cur) => (cur === title ? null : cur)), 1600)
  }

  function downloadSign(sign: SignItem) {
    const blob = new Blob([sign.svg], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${sign.title}.svg`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="app-frame">
      <AppHeader trail={[{ label: '首页', href: '#/' }, { label: '标志牌库' }]} />
      <div className="page signs-page">
        <h1>养护安全标志牌库</h1>


        <p className="signs-intro">
          严格遵循《公路养护安全作业规程》JTG H30—2015 规程标准制作的高精度矢量 SVG 标牌，已同步作为 3D 数字孪生贴图底模。支持一键复制 SVG 源码或下载矢量图。
        </p>

        <div className="signs-filter-bar">
          <div className="seg" role="tablist" aria-label="标志牌分类">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={category === cat}
                className={category === cat ? 'on' : ''}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="dashboard-search signs-search">
            <Search aria-hidden="true" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索标志牌名称（如限速、导向、施工）"
            />
          </div>
        </div>

        <div className="signs-grid">
          {filtered.map((sign) => (
            <div className="card sign-gallery-card" key={sign.title}>
              <div className="sign-gallery-badge">{categoryOf(sign.title)}</div>
              <div
                className="sign-preview"
                dangerouslySetInnerHTML={{ __html: sign.svg }}
              />
              <div className="sign-foot">
                <strong title={sign.title}>{sign.title}</strong>
                <div className="sign-actions">
                  <button
                    type="button"
                    title="下载 SVG 矢量图"
                    className="icon-btn sign-download-btn"
                    onClick={() => downloadSign(sign)}
                  >
                    <Download />
                  </button>
                  <button
                    type="button"
                    className={`btn sign-copy${copied === sign.title ? ' is-copied' : ''}`}
                    onClick={() => void copySign(sign.title, sign.svg)}
                  >
                    {copied === sign.title ? <Check /> : <Copy />}
                    {copied === sign.title ? '已复制' : '复制 SVG'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="table-empty">
            没有找到匹配「{search}」的标志牌
          </div>
        )}
      </div>
    </div>
  )
}
