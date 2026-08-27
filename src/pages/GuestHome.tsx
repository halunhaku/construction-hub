import { LogIn, Signpost, TrafficCone } from 'lucide-react'
import AppHeader from '../components/AppHeader'
import { goToLogin } from '../guestZone'

export default function GuestHome() {
  return (
    <div className="app-frame">
      <AppHeader trail={['布置图']} />
      <main className="dashboard-page">
        <section className="dashboard-heading">
          <div>
            <p className="eyebrow">路安施工管理</p>
            <h1>作业区布置</h1>
            <p>不用登录即可填写参数、预览并导出图纸。项目台账和现场照片需登录后使用。</p>
          </div>
        </section>
        <section className="guest-actions">
          <button className="btn btn-primary" onClick={() => (window.location.hash = '#/layout')}>
            <TrafficCone />
            开始布置
          </button>
          <button className="btn btn-secondary" onClick={() => (window.location.hash = '#/signs')}>
            <Signpost />
            标志牌 SVG
          </button>
          <button className="btn" onClick={() => goToLogin()}>
            <LogIn />
            登录
          </button>
        </section>
      </main>
    </div>
  )
}
