import type { Direction, Params, Zone, ZoneMeta } from './types';

/* ── 常量 ────────────────────────────────────────────── */

export const zoneMeta: ZoneMeta[] = [
  {key:'warning',name:'警告区',color:'#FF9F0A',description:'按0/400/600/800/1000/1200m设置标志，区域内不摆锥桶'},
  {key:'taper',name:'上游过渡区',color:'#0A84FF',description:'锥桶斜向渐变导流；50m处设置导向箭头'},
  {key:'buffer',name:'缓冲区',color:'#5AC8FA',description:'入口设置路栏及作业区长度标志，保留安全净空'},
  {key:'work',name:'作业区',color:'#FF3B30',description:'沿封闭车道连续摆放锥桶，设备与人员在内作业'},
  {key:'downstream',name:'下游过渡区',color:'#AF52DE',description:'锥桶斜向渐变撤除，引导车辆恢复行驶'},
  {key:'terminal',name:'终止区',color:'#30D158',description:'终点设置解除最终限速及解除禁止超车标志'}
];

export const defaults: Params = {
  start:'K123+800', work:1000, direction:'up', workSide:'roadside', doubleSide:false,
  warning:1600, taper:200, buffer:150, downstream:30, terminal:30,
  speed:100, coneGap:4
};

/* 警告区标志设置偏移（距警告区起点，米）；超出警告区实际长度的标志不设置 */
export const warningSignOffsets = [0, 400, 600, 800, 1000, 1200] as const;

/** 本项目的高速公路逐级限速口径。 */
export function speedLimits(speed: number): { first: 60 | 80; final: 40 | 60 } {
  return speed === 80 ? { first: 60, final: 40 } : { first: 80, final: 60 };
}

/* ── 桩号工具 ────────────────────────────────────────── */

export function parseStake(v: string): number | null {
  const s = String(v).trim().replace(/＋/g, '+').replace(/\s+/g, '');
  // 带分隔符：K123+800 / 100+800 / K0+050
  const split = s.match(/^(?:K)?(\d+)\+(\d{1,3})$/i);
  if (split) return Number(split[1]) * 1000 + Number(split[2]);
  // 无分隔符：100800 / K100800 / 800（视为总米数）
  const plain = s.match(/^(?:K)?(\d+)$/i);
  return plain ? Number(plain[1]) : null;
}

export function stake(m: number): string {
  const n = Math.max(0, Math.round(m));
  return `K${Math.floor(n / 1000)}+${String(n % 1000).padStart(3, '0')}`;
}

/* ── 分区计算 ────────────────────────────────────────── */

export function buildZones(p: Params): Zone[] {
  const anchor = parseStake(p.start) ?? 123800;
  const lens: number[] = [p.warning, p.taper, p.buffer, p.work, p.downstream, p.terminal].map(Number);
  const before = lens[0]! + lens[1]! + lens[2]!;
  let cursor = p.direction === 'up' ? anchor - before : anchor + before;
  const sign = p.direction === 'up' ? 1 : -1;
  return zoneMeta.map((z, i) => {
    const a = cursor;
    const b = cursor + sign * lens[i]!;
    cursor = b;
    return { ...z, length: lens[i]!, start: a, end: b };
  });
}

/* ── 双侧占路镜像 ────────────────────────────────────── */

/**
 * 生成对向车道的镜像分区：与主方向长度完全一致（上下游一致），
 * 以作业区终点为锚点反方向延伸，使两侧作业区桩号范围重合。
 * 主方向为上行时作业区 [start, start+work]，镜像锚点取作业区终点；
 * 主方向为下行时作业区 [start-work, start]，同样取终点（即低桩号端）。
 * 不对镜像侧做整百米对齐，保证两侧参数一致（180°对称）。
 */
export function mirrorZones(zones: Zone[], direction: Direction): Zone[] {
  const work = zones[3]!;
  const opposite: Direction = direction === 'up' ? 'down' : 'up';
  const anchor = work.end;
  const before = zones[0]!.length + zones[1]!.length + zones[2]!.length;
  let cursor = opposite === 'up' ? anchor - before : anchor + before;
  const sign = opposite === 'up' ? 1 : -1;
  return zones.map((z) => {
    const a = cursor;
    const b = cursor + sign * z.length;
    cursor = b;
    return { ...z, start: a, end: b };
  });
}

/** 计算单侧或双侧布置在桩号轴上的整体影响范围。 */
export function zoneExtent(zones: Zone[], mirrored?: Zone[]): { min: number; max: number; span: number } {
  const stakes = [...zones, ...(mirrored ?? [])].flatMap((zone) => [zone.start, zone.end]);
  const min = Math.min(...stakes);
  const max = Math.max(...stakes);
  return { min, max, span: max - min };
}

/* ── XML 转义 ────────────────────────────────────────── */

export function xmlText(value: string | number): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };
  return String(value).replace(/[&<>"']/g, char => map[char]!);
}

/* ── 输入校验 ────────────────────────────────────────── */

/** 解析 RoadZone 布置参数 JSON（宽容模式：未知/缺失字段回退，方向与施工位置枚举收紧） */
export function parseZoneParams(json: string): Params | null {
  try {
    const obj: unknown = JSON.parse(json)
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null
    const z = obj as Record<string, unknown>
    const required: (keyof Params)[] = [
      'start', 'work', 'direction', 'workSide', 'warning', 'taper',
      'buffer', 'downstream', 'terminal', 'speed', 'coneGap',
    ]
    if (!required.every((k) => k in z)) return null
    return {
      start: String(z.start),
      work: Number(z.work),
      direction: z.direction === 'down' ? 'down' : 'up',
      workSide: z.workSide === 'median' ? 'median' : 'roadside',
      doubleSide: z.doubleSide === true,
      warning: Number(z.warning),
      taper: Number(z.taper),
      buffer: Number(z.buffer),
      downstream: Number(z.downstream),
      terminal: Number(z.terminal),
      speed: Number(z.speed),
      coneGap: Number(z.coneGap),
    }
  } catch {
    return null
  }
}

export function validate(p: Params): Record<string, string> {
  const errors: Record<string, string> = {};
  // 数值字段必须为有限数：输入框清空或输入非法字符会得到 0/NaN，
  // NaN 会通过后续 `< min` 比较（NaN < 10 为 false），最终被 JSON 序列化成 null。
  for (const [key, label] of [
    ['work', '作业区长度'], ['warning', '警告区长度'], ['taper', '上游过渡区长度'],
    ['buffer', '缓冲区长度'], ['downstream', '下游过渡区长度'], ['terminal', '终止区长度'],
    ['speed', '设计速度'], ['coneGap', '锥桶间距'],
  ] as const) {
    if (!Number.isFinite(p[key])) errors[key] = `${label}必须是有效数字`;
  }
  const start = parseStake(p.start);
  if (start == null) {
    errors.start = '桩号格式错误，示例：K123+800';
  } else if (p.direction === 'up' && start < p.warning + p.taper + p.buffer) {
    // 上行时各分区桩号递减，警告区起点 = 锚点 − 警告区 − 过渡区 − 缓冲区。
    // 锚点不足会出现负桩号，被 stake() 静默钳制为 K0+000。
    errors.start = `上行时起点桩号需 ≥ ${stake(p.warning + p.taper + p.buffer)}（警告区 + 过渡区 + 缓冲区），否则将出现负桩号`;
  } else if (p.direction === 'down' && start < p.work + p.downstream + p.terminal) {
    errors.start = `下行时起点桩号需 ≥ ${stake(p.work + p.downstream + p.terminal)}（作业区 + 下游过渡区 + 终止区），否则将出现负桩号`;
  }
  if (p.work < 10 || p.work > 4000) errors.work = '作业区长度应为 10-4000m';
  if (p.doubleSide && p.workSide !== 'median') errors.workSide = '双侧占路仅限中央分隔带施工';
  if (p.doubleSide && p.direction === 'down' && start != null && start < p.work + p.warning + p.taper + p.buffer) {
    // 双侧占路时镜像侧（上行）警告区外延：起点 − 作业区 − 警告区 − 过渡区 − 缓冲区。
    errors.start = `双侧占路时下行起点桩号需 ≥ ${stake(p.work + p.warning + p.taper + p.buffer)}，否则上行侧将出现负桩号`;
  }
  if (p.warning !== 1600) errors.warning = '警告区长度固定为 1600m';
  if (p.taper < 120 || p.taper > 200) errors.taper = '上游过渡区长度应为 120-200m';
  if (p.buffer < 100 || p.buffer > 150) errors.buffer = '缓冲区长度应为 100-150m';
  if (p.downstream < 30) errors.downstream = '下游过渡区长度至少 30m';
  if (p.terminal < 30) errors.terminal = '终止区长度至少 30m';
  if (p.coneGap < 1 || p.coneGap > 4) errors.coneGap = '锥桶间距应为 1-4m';
  if (p.speed !== 80 && p.speed !== 100) errors.speed = '设计速度仅支持 80 或 100 km/h';
  return errors;
}
