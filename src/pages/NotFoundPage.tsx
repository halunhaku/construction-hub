import AppHeader from '../components/AppHeader'

export default function NotFoundPage() {
  return (
    <div className="app-frame">
      <AppHeader trail={[{ label: '页面不存在' }]} />
      <main className="dashboard-page">
        <div className="dashboard-empty">
          <strong>没有这个页面</strong>
          <span>地址可能打错了，或这一页已经挪走。</span>
          <a className="btn btn-primary" href="#/">
            回到首页
          </a>
        </div>
      </main>
    </div>
  )
}
