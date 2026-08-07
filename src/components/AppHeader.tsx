import { CalendarDays, ChevronDown, ChevronRight, CircleHelp, ShieldCheck } from 'lucide-react'

export default function AppHeader({
  trail,
  project,
}: {
  trail: string[]
  project?: string
}) {
  return (
    <header className="app-header">
      <button className="app-brand" onClick={() => (window.location.hash = '#/')}>
        <ShieldCheck aria-hidden="true" />
        <span>路安施工管理</span>
      </button>
      <nav className="breadcrumbs" aria-label="面包屑">
        {trail.map((item, index) => (
          <span key={item}>
            {index > 0 ? <ChevronRight aria-hidden="true" /> : null}
            {item}
          </span>
        ))}
      </nav>
      <div className="app-header-tools">
        {project ? (
          <button className="project-switcher" title={project}>
            <span className="project-switcher-label">项目：{project}</span>
            <ChevronDown aria-hidden="true" />
          </button>
        ) : null}
        <button className="icon-btn" aria-label="日历"><CalendarDays /></button>
        <button className="icon-btn" aria-label="帮助"><CircleHelp /></button>
        <button className="user-button" aria-label="用户菜单">张工</button>
      </div>
    </header>
  )
}
