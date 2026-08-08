/** SQLite datetime('now') 是 UTC 的 "YYYY-MM-DD HH:MM:SS"，转本地时间显示（24 小时制，带秒） */
export function formatTime(s: string): string {
  const d = new Date(s.replace(' ', 'T') + 'Z')
  if (Number.isNaN(d.getTime())) return s
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export function today(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * 生成前端临时 id。
 * 优先用 crypto.randomUUID；部分旧版浏览器 / 微信 X5 内核 WebView 未实现该 API，
 * 直接调用会抛异常导致事件回调中断，这里做降级处理。
 */
export function uid(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
  } catch {
    /* 继续走降级 */
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
