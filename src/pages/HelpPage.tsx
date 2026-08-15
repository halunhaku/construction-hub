import { ChevronRight } from 'lucide-react'
import AppHeader from '../components/AppHeader'

const STEPS: { title: string; steps: string[]; note?: string }[] = [
  {
    title: '新建施工记录',
    steps: [
      '首页点进某个项目，进入「项目施工台账」；或直接点「新建记录」',
      '填写基本信息：项目名称会自动带入；填写高速公路、路段、起始桩号、作业区长度（m）、方向、施工内容与施工日期',
      '核对作业区布置：施工位置（路侧/中央分隔带），中央分隔带施工可选「双侧占路」（上、下行同时布控，180°对称）；过渡区与缓冲区基准长度可微调，需要时可展开「高级参数」',
      '点「保存，并拍摄三照」进入记录详情页',
      '按施工前、施工中、施工后三个阶段分别拍照上传',
    ],
    note: '起始桩号会自动作为布置图起点，作业区长度决定布置图总长（结束桩号自动计算），无需重复填写。',
  },
  {
    title: 'Excel 批量导入',
    steps: [
      '在项目台账页点「导入 Excel」，先下载「模板」',
      '按模板列填写：项目名称、高速公路、路段、起始桩号、结束桩号、方向、施工内容、施工日期等',
      '回到页面点「选择文件」选中填写好的 Excel，再点「导入 Excel」',
      '导入成功后会显示汇总：新增条数与记录明细',
    ],
    note: '单次最多导入 1000 条记录；模板中的必填列（项目名称、高速公路、路段、桩号、施工日期）不能为空。',
  },
  {
    title: '作业区布置图',
    steps: [
      '每条记录都会生成作业区布置图，参数在新建记录时填写',
      '各分区含义：警告区（前方预警标志）、上游过渡区（锥桶斜向导流）、缓冲区（安全净空）、作业区（施工区域）、下游过渡区（锥桶撤除）、终止区（解除限速标志）',
      '在记录详情页点「导出图纸」，可选择 PNG / JPG / PDF（A4 版面）保存或打印',
      '「编辑布置」可修改已保存记录的布置参数并重新导出',
    ],
    note: '上行时布置图从高桩号向低桩号延伸，下行反之；起点桩号过小时上行会提示修正，避免出现负桩号。',
  },
  {
    title: '三阶段照片',
    steps: [
      '施工前：作业区布置完成、施工开始前拍摄',
      '施工中：施工作业进行中拍摄',
      '施工后：施工完成、现场恢复后拍摄',
      '三个阶段各至少 1 张，三阶段齐全后记录标记为「资料完整」',
      '详情页可打包下载该记录的全部照片（ZIP，带拍摄时间水印）',
    ],
    note: '照片保存在云端对象存储，与记录绑定；删除记录会同时删除其照片。',
  },
  {
    title: '施工日历',
    steps: [
      '点顶部右上角日历图标进入「施工日历」',
      '有施工记录的日期带圆点标记：蓝色 = 有记录，绿色 = 当天三照全部完整',
      '点任意日期，下方列出当天的施工记录，可直接点进详情',
      '用左右箭头切换月份',
    ],
  },
]

const FAQS: { q: string; a: string }[] = [
  {
    q: '为什么保存时提示「作业区布置参数有误」？',
    a: '布置参数超出了规范范围，例如作业区长度至少 10m、限速 20-120km/h、过渡区 120-200m、缓冲区 100-150m。按红色提示修改即可。',
  },
  {
    q: '下拉列表里没有我想选的项目或高速，怎么办？',
    a: '选项列表每 24 小时自动刷新一次。可以直接输入新名称保存，保存后下次刷新就会出现在列表里。',
  },
  {
    q: '照片传不上去？',
    a: '请检查网络连接；支持常见图片格式（jpg/png）。单张照片较大时上传会稍慢，请耐心等待。',
  },
  {
    q: '「导出档案」下载的是什么？',
    a: '该记录的作业区布置图（A4 图纸）与三阶段照片的打包 ZIP，照片带施工桩号与拍摄时间水印，可用于归档报验。',
  },
  {
    q: '数据存在哪里？换手机还能看到吗？',
    a: '数据保存在云端（Cloudflare 边缘数据库与对象存储），任何设备打开本系统网址都能看到同一份数据。',
  },
]

export default function HelpPage() {
  return (
    <div className="app-frame">
      <AppHeader trail={['首页', '帮助']} />
      <div className="page help-page">
        <header className="topbar">
          <button className="btn" onClick={() => (window.location.hash = '#/')}>
            ← 返回
          </button>
          <h1>帮助中心</h1>
          <span className="topbar-spacer" />
        </header>

        <h2 className="form-section-title">使用指南</h2>
        {STEPS.map((s) => (
          <div className="card help-card" key={s.title}>
            <h3>{s.title}</h3>
            <ol className="help-steps">
              {s.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
            {s.note && <p className="help-note">{s.note}</p>}
          </div>
        ))}

        <h2 className="form-section-title">常见问题</h2>
        <div className="card help-card">
          {FAQS.map((f) => (
            <details className="help-faq" key={f.q}>
              <summary>
                <span>{f.q}</span>
                <ChevronRight aria-hidden="true" />
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>

        <p className="help-foot">
          仍无法解决？联系项目管理员，或检查系统是否已更新到最新版本。
        </p>
      </div>
    </div>
  )
}
