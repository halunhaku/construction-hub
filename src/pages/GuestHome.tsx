import { LogIn, Signpost, TrafficCone } from 'lucide-react'
import AppHeader from '../components/AppHeader'
import { safeReturnHash, setLoginIntent } from '../guestZone'

export default function GuestHome() {
  return (
    <div className="app-frame">
      <AppHeader />
      <main className="dashboard-page">
        <section className="dashboard-heading">
          <div>
            <p className="eyebrow">路安施工管理</p>
            <h1>作业区布置</h1>
            <p>不用登录即可填写参数、预览并导出图纸。项目台账和现场照片需登录后使用。</p>
          </div>
        </section>
        <section className="guest-actions">
          <a className="btn btn-primary" href="#/layout">
            <TrafficCone />
            开始布置
          </a>
          <a className="btn btn-secondary" href="#/signs">
            <Signpost />
            标志牌 SVG
          </a>
          <a
            className="btn"
            href="#/login"
            onClick={() => setLoginIntent({ returnHash: safeReturnHash(window.location.hash || '#/'), save: false })}
          >
            <LogIn />
            登录
          </a>
        </section>
      </main>
    </div>
  )
}
