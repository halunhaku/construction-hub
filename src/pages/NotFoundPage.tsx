import AppHeader from '../components/AppHeader'

export default function NotFoundPage() {
  return (
    <div className="app-frame">
      <AppHeader trail={['页面不存在']} />
      <main className="dashboard-page">
        <div className="dashboard-empty">
          <strong>没有这个页面</strong>
          <span>地址可能打错了，或这一页已经挪走。</span>
          <button className="btn btn-primary" onClick={() => (window.location.hash = '#/')}>
            回到首页
          </button>
        </div>
      </main>
    </div>
  )
}
