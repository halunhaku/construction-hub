/** 校验失败后按字段名顺序滚到并聚焦第一个问题项；若在折叠的高级参数里会先展开。 */
export const ZONE_ERROR_ORDER = ['start', 'work', 'workSide', 'taper', 'buffer', 'downstream', 'terminal', 'coneGap', 'speed', 'warning']

export function focusFirstIssue(root: ParentNode | null, names: string[]) {
  if (!root) return
  for (const name of names) {
    const el = root.querySelector(`[name="${name}"]`)
    if (!(el instanceof HTMLElement)) continue
    const details = el.closest('details')
    if (details && !details.open) details.open = true
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    el.focus()
    return
  }
}
