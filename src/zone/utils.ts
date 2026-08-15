import type { Direction, Params, Zone, ZoneMeta } from './types';

/* ── 常量 ────────────────────────────────────────────── */

export const zoneMeta: ZoneMeta[] = [
  {key:'warning',name:'警告区',color:'#FF9F0A',description:'按0/400/600/800/1000/1200m设置标志，区域内不摆锥桶'},
  {key:'taper',name:'上游过渡区',color:'#0A84FF',description:'锥桶斜向渐变导流；50m处设置导向箭头'},
  {key:'buffer',name:'缓冲区',color:'#5AC8FA',description:'入口设置路栏及作业区长度标志，保留安全净空'},
  {key:'work',name:'作业区',color:'#FF3B30',description:'沿封闭车道连续摆放锥桶，设备与人员在内作业'},
  {key:'downstream',name:'下游过渡区',color:'#AF52DE',description:'锥桶斜向渐变撤除，引导车辆恢复行驶'},
  {key:'terminal',name:'终止区',color:'#30D158',description:'终点设置解除限速60及解除禁止超车标志'}
];

export const defaults: Params = {
  start:'K123+800', work:1000, direction:'up', workSide:'roadside', doubleSide:false,
  warning:1600, taper:200, buffer:150, downstream:30, terminal:30,
  speed:100, coneGap:4
};

/* 警告区标志设置偏移（距警告区起点，米）；超出警告区实际长度的标志不设置 */
export const warningSignOffsets = [0, 400, 600, 800, 1000, 1200] as const;

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

/* ── 上游过渡区与缓冲区联合对齐 ──────────────────────── */

export function alignedUpstreamZones(
  anchor: number,
  baseTaper: number,
  baseBuffer: number,
  direction: Direction,
): { taper: number; buffer: number } {
  let best: {
    taper: number;
    buffer: number;
    totalDelta: number;
    tenMeterPenalty: number;
    individualDelta: number;
  } | null = null;

  for (let taper = 120; taper <= 200; taper += 1) {
    for (let buffer = 100; buffer <= 150; buffer += 1) {
      const total = taper + buffer;
      const outerStake = direction === 'up' ? anchor - total : anchor + total;
      // 外端不能为负（负桩号无意义），且需对齐整百米
      if (outerStake < 0 || outerStake % 100 !== 0) continue;

      const taperRemainder = taper % 10;
      const bufferRemainder = buffer % 10;
      const candidate = {
        taper,
        buffer,
        totalDelta: Math.abs(total - (baseTaper + baseBuffer)),
        tenMeterPenalty:
          Math.min(taperRemainder, 10 - taperRemainder) +
          Math.min(bufferRemainder, 10 - bufferRemainder),
        individualDelta: (taper - baseTaper) ** 2 + (buffer - baseBuffer) ** 2,
      };
      if (
        !best ||
        candidate.totalDelta < best.totalDelta ||
        (candidate.totalDelta === best.totalDelta && candidate.tenMeterPenalty < best.tenMeterPenalty) ||
        (candidate.totalDelta === best.totalDelta &&
          candidate.tenMeterPenalty === best.tenMeterPenalty &&
          candidate.individualDelta < best.individualDelta)
      ) {
        best = candidate;
      }
    }
  }

  // 两个区间的合计范围为 220–350m，跨度超过 100m，锚点足够时必有整百米解。
  // 锚点过小（上行起点不足）时回退基准值，由 validate 负责拦截。
  if (!best) return { taper: baseTaper, buffer: baseBuffer };
  return { taper: best.taper, buffer: best.buffer };
}

/* ── 分区计算 ────────────────────────────────────────── */

export function buildZones(p: Params): Zone[] {
  const anchor = parseStake(p.start) ?? 123800;
  const actual = alignedUpstreamZones(anchor, Number(p.taper), Number(p.buffer), p.direction);
  const lens: number[] = [p.warning, actual.taper, actual.buffer, p.work, p.downstream, p.terminal].map(Number);
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
  const start = parseStake(p.start);
  if (!start) {
    errors.start = '桩号格式错误，示例：K123+800';
  } else if (p.direction === 'up' && start < p.warning + 350) {
    // 上行时各分区桩号递减，警告区起点 = 锚点 − 警告区 − (过渡区+缓冲区)最大 350m，
    // 锚点不足会出现负桩号，被 stake() 静默钳制为 K0+000。
    errors.start = `上行时起点桩号需 ≥ ${stake(p.warning + 350)}（警告区 + 上游区段上限），否则将出现负桩号`;
  }
  if (p.work < 10) errors.work = '作业区长度至少 10m';
  if (p.doubleSide && p.workSide !== 'median') errors.workSide = '双侧占路仅限中央分隔带施工';
  if (p.doubleSide && p.direction === 'down' && start != null && start < p.work + p.warning + 350) {
    // 双侧占路时镜像侧（上行）警告区外延：起点 − 作业区 − 警告区 − 上游区段上限
    errors.start = `双侧占路时下行起点桩号需 ≥ ${stake(p.work + p.warning + 350)}，否则上行侧将出现负桩号`;
  }
  if (p.warning < 50) errors.warning = '警告区长度至少 50m';
  if (p.taper < 120 || p.taper > 200) errors.taper = '上游过渡区长度应为 120-200m';
  if (p.buffer < 100 || p.buffer > 150) errors.buffer = '缓冲区长度应为 100-150m';
  if (p.downstream < 10) errors.downstream = '下游过渡区长度至少 10m';
  if (p.terminal < 10) errors.terminal = '终止区长度至少 10m';
  if (p.coneGap < 1) errors.coneGap = '锥桶间距至少 1m';
  if (p.speed < 20 || p.speed > 120) errors.speed = '设计速度应在 20-120 km/h';
  return errors;
}
