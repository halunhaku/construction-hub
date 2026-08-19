import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import AppHeader from '../components/AppHeader'
import { SIGNS } from '../signs'

export default function SignsPage() {
  const [copied, setCopied] = useState<string | null>(null)

  async function copySign(title: string, svg: string) {
    try {
      await navigator.clipboard.writeText(svg)
    } catch {
      // 剪贴板不可用时退化为文本域复制
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

  return (
    <div className="app-frame">
      <AppHeader trail={['首页', '标志牌']} />
      <div className="page signs-page">
        <header className="topbar">
          <button className="btn" onClick={() => (window.location.hash = '#/')}>
            ← 返回
          </button>
          <h1>标志牌 SVG</h1>
          <span className="topbar-spacer" />
        </header>

        <p className="signs-intro">
          高速公路养护作业区标志牌，共 {SIGNS.length} 个。点击「复制 SVG」即可复制对应标志牌的完整代码。
        </p>

        <div className="signs-grid">
          {SIGNS.map((sign) => (
            <div className="card sign-card" key={sign.title}>
              <div
                className="sign-preview"
                // 直接渲染 SVG，来源为本项目固定数据文件（无用户输入）
                dangerouslySetInnerHTML={{ __html: sign.svg }}
              />
              <div className="sign-foot">
                <strong>{sign.title}</strong>
                <button
                  className={`btn sign-copy${copied === sign.title ? ' is-copied' : ''}`}
                  onClick={() => copySign(sign.title, sign.svg)}
                >
                  {copied === sign.title ? <Check /> : <Copy />}
                  {copied === sign.title ? '已复制' : '复制 SVG'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
