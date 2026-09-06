import { ArrowRight, CalendarDays, FileDown, Layers, LogIn, ShieldCheck, Signpost, Sparkles, TrafficCone } from 'lucide-react'
import AppHeader from '../components/AppHeader'
import { safeReturnHash, setLoginIntent } from '../guestZone'

export default function GuestHome() {
  return (
    <div className="app-frame">
      <AppHeader />
      <main className="guest-home-page">
        <section className="guest-hero">
          <div className="eyebrow-badge">
            <Sparkles style={{ width: 12, height: 12 }} />
            <span>JTG H30 规程标准 · 3D 数字孪生</span>
          </div>
          <h1>高速公路作业区 3D 孪生与施工协同平台</h1>
          <p className="guest-hero-sub">
            一体化融合三维空间仿真、标牌锥桶智能放样、标准 A4 规程图纸导出与现场施工影像台账。
            免登录即可即时体验 3D 空间布控与图纸生成。
          </p>
          <div className="guest-hero-actions">
            <a className="btn btn-primary guest-cta-btn" href="#/layout">
              <TrafficCone />
              进入 3D 布置工作台
              <ArrowRight style={{ width: 14, height: 14 }} />
            </a>
            <a className="btn btn-secondary" href="#/signs">
              <Signpost />
              标志牌矢量库
            </a>
            <a
              className="btn"
              href="#/login"
              onClick={() => setLoginIntent({ returnHash: safeReturnHash(window.location.hash || '#/'), save: false })}
            >
              <LogIn />
              台账系统登录
            </a>
          </div>
        </section>

        <section className="guest-features">
          <a className="card guest-feature-card" href="#/layout">
            <div className="guest-card-icon" style={{ background: 'rgba(0, 113, 227, 0.1)', color: 'var(--accent)' }}>
              <Layers />
            </div>
            <h2>高精 3D 数字孪生</h2>
            <p>基于 Three.js 构建公路作业区三维视口。警告区、过渡区、缓冲区与作业区参数联动，车流实时避险动画，支持多角度漫游与高分辨率截图。</p>
            <span className="guest-card-link">进入工作台 →</span>
          </a>

          <a className="card guest-feature-card" href="#/layout">
            <div className="guest-card-icon" style={{ background: 'rgba(52, 199, 89, 0.12)', color: 'var(--green)' }}>
              <FileDown />
            </div>
            <h2>A4 规程图纸导出</h2>
            <p>严格对齐《公路养护安全作业规程》JTG H30—2015 格式。支持单侧、双侧占路矢量布置图与安全标志设置时刻表自动生成，支持 PDF/PNG/JPG。</p>
            <span className="guest-card-link">预览图纸导出 →</span>
          </a>

          <a className="card guest-feature-card" href="#/signs">
            <div className="guest-card-icon" style={{ background: 'rgba(245, 99, 0, 0.1)', color: 'var(--orange)' }}>
              <Signpost />
            </div>
            <h2>标准标志牌矢量库</h2>
            <p>全套规程安全标志牌 SVG 源码库，已完整赋能 3D 视口贴图模型。支持按类型分类检索、一键复制 SVG 源码与下载标准矢量文件。</p>
            <span className="guest-card-link">查看标志牌库 →</span>
          </a>

          <a
            className="card guest-feature-card"
            href="#/login"
            onClick={() => setLoginIntent({ returnHash: safeReturnHash('#/calendar'), save: false })}
          >
            <div className="guest-card-icon" style={{ background: 'rgba(175, 82, 222, 0.12)', color: '#af52de' }}>
              <CalendarDays />
            </div>
            <h2>三阶段影像存证台账</h2>
            <p>现场施工前、施工中、施工后全流程影像防伪打卡与桩号记录。提供项目进度监控、施工日历、缺失资料预警与 Excel 批量管理。</p>
            <span className="guest-card-link">登录项目台账 →</span>
          </a>
        </section>

        <section className="guest-footer-note">
          <ShieldCheck style={{ width: 16, height: 16, color: 'var(--accent)' }} />
          <span>遵循交通运输行业标准 JTG H30—2015 · 安全规范 · 责任溯源</span>
        </section>
      </main>
    </div>
  )
}
