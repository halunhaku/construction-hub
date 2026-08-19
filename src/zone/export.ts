import type { Zone, TableConfig, Direction, Params } from './types';
import { mirrorZones, speedLimits, stake, warningSignOffsets, xmlText, zoneExtent } from './utils.ts';

/* ── 标志牌时刻表 ────────────────────────────────────── */

function warningNames(speed: number): Record<number, string> {
  const limits = speedLimits(speed)
  return {
    0: '前方施工 1600m', 400: '关闭智驾', 600: `限速 ${limits.first}`, 800: '前方施工 800m',
    1000: `限速 ${limits.final}`, 1200: '禁止超车 / 车道减少',
  }
}
const WARN_DESCS: Record<number, string> = {
  0: '0m / 警告区起点', 400: '距警告区起点 400m', 600: '距警告区起点 600m',
  800: '距警告区起点 800m', 1000: '距警告区起点 1000m', 1200: '距警告区起点 1200m',
};

/** 标志项目：名称 + 桩号（数字）+ 位置说明；双侧导出一行并排两车道桩号 */
function signRowsOf(zones: Zone[], speed: number): [string, number, string][] {
  const at = (zone: Zone, offset: number) => zone.start + Math.sign(zone.end - zone.start) * offset;
  const warnLen = zones[0]!.length;
  const names = warningNames(speed)
  const limits = speedLimits(speed)
  return [
    // 偏移超出警告区实际长度的标志不设置，避免出现在不存在的位置
    ...warningSignOffsets
      .filter(offset => offset <= warnLen)
      .map(offset => [names[offset], at(zones[0]!, offset), WARN_DESCS[offset]] as [string, number, string]),
    ['导向标志牌', at(zones[1]!, 50), '过渡区内 50m'],
    ['路栏 / 作业区长度', zones[2]!.start, '缓冲区入口'],
    [`解除限速 ${limits.final} / 禁止超车`, zones[5]!.end, '终止区终点'],
  ];
}

export function signSchedule(zones: Zone[], _direction: Direction, speed: number): [number, string, string, string][] {
  return signRowsOf(zones, speed).map((item, index) => [index + 1, item[0], stake(item[1]), item[2]]);
}

/** 双侧占路：主方向 + 镜像对向车道的标志时刻表（位置说明前缀上行/下行，序号连续） */
export function signScheduleDouble(zones: Zone[], direction: Direction, speed: number): [number, string, string, string][] {
  const primaryDir = direction === 'down' ? '下行' : '上行'
  const mirrorDir = primaryDir === '上行' ? '下行' : '上行'
  const merged = [
    ...signSchedule(zones, direction, speed).map((r) => [r[1], r[2], `${primaryDir} · ${r[3]}`] as [string, string, string]),
    ...signSchedule(mirrorZones(zones, direction), direction, speed).map((r) => [r[1], r[2], `${mirrorDir} · ${r[3]}`] as [string, string, string]),
  ]
  return merged.map((r, i) => [i + 1, r[0], r[1], r[2]])
}

/* ── 导出表格生成 ────────────────────────────────────── */

export function exportTable({
  x, y, width, title, headers, rows, columnWidths,
  titleHeight = 32, rowHeight = 28, headerHeight = 30,
  fontSize, titleFontSize, height,
}: TableConfig): string {
  if (height && height > 0 && rows.length > 0) {
    const base = titleHeight + headerHeight + rows.length * rowHeight;
    const scale = height / base;
    const cap = Math.min(Math.max(scale, 0.9), 1.45);
    titleHeight = Math.round(titleHeight * cap);
    headerHeight = Math.round(headerHeight * cap);
    rowHeight = (height - titleHeight - headerHeight) / rows.length;
  }

  const fs = fontSize ?? Math.max(11, Math.min(14.5, rowHeight * 0.36));
  const tfs = titleFontSize ?? Math.max(13, Math.min(16, titleHeight * 0.42));
  const offsets = columnWidths.reduce<number[]>((list, value) => {
    list.push((list[list.length - 1] ?? 0) + value);
    return list;
  }, [0]);
  const tableH = titleHeight + headerHeight + rows.length * rowHeight;

  const verticals = offsets.slice(1, -1).map(offset =>
    `<line x1="${x + offset}" y1="${y + titleHeight}" x2="${x + offset}" y2="${y + tableH}"/>`
  ).join('');
  const titleRule = `<line x1="${x}" y1="${y + titleHeight}" x2="${x + width}" y2="${y + titleHeight}"/>`;
  const horizontals = Array.from({ length: rows.length + 1 }, (_, index) =>
    `<line x1="${x}" y1="${y + titleHeight + headerHeight + index * rowHeight}" x2="${x + width}" y2="${y + titleHeight + headerHeight + index * rowHeight}"/>`
  ).join('');

  const cellBaseline = (h: number, s: number) => (h - s) / 2 + s * 0.82;
  const cellText = (cells: string[], rowY: number, fontWeight = '400', fill = '#1d1d1f') =>
    cells.map((cell, index) =>
      `<text x="${x + offsets[index]! + columnWidths[index]! / 2}" y="${rowY}" text-anchor="middle" font-size="${fs}" font-weight="${fontWeight}" fill="${fill}">${xmlText(cell)}</text>`
    ).join('');
  const zebra = rows.map((_, index) =>
    index % 2 === 1
      ? `<rect x="${x}" y="${y + titleHeight + headerHeight + index * rowHeight}" width="${width}" height="${rowHeight}" fill="#f7f7f8"/>`
      : '',
  ).join('');

  return [
    `<rect x="${x}" y="${y}" width="${width}" height="${tableH}" fill="#fff"/>`,
    `<rect x="${x}" y="${y}" width="${width}" height="${titleHeight}" fill="#eef1f4"/>`,
    `<rect x="${x}" y="${y + titleHeight}" width="${width}" height="${headerHeight}" fill="#f3f4f6"/>`,
    zebra,
    `<g stroke="#1d1d1f" stroke-width="0.7" fill="none">`,
    titleRule,
    verticals,
    horizontals,
    `</g>`,
    `<rect x="${x}" y="${y}" width="${width}" height="${tableH}" fill="none" stroke="#1d1d1f" stroke-width="1.1"/>`,
    `<text x="${x + 12}" y="${y + cellBaseline(titleHeight, tfs)}" font-size="${tfs}" font-weight="700" fill="#1d1d1f">${xmlText(title)}</text>`,
    cellText(headers, y + titleHeight + cellBaseline(headerHeight, fs), '700', '#3a3a3c'),
    rows.map((row, index) =>
      cellText(row, y + titleHeight + headerHeight + index * rowHeight + cellBaseline(rowHeight, fs))
    ).join(''),
  ].join('');
}

/* ── 通用 SVG→Canvas 渲染 ────────────────────────────── */

/**
 * 提取布置图 SVG 快照用于导出：剥离布局样式（min-width）。
 * roadSvg 为横向滚动带内联 min-width，直接序列化 innerHTML 会把
 * `style="min-width:1902px"` 带进 A4 图纸，CSS min-width 覆盖嵌套 SVG
 * 的 width 属性后视口被撑破，图纸右侧大段被裁切（单侧/双侧均受影响）。
 */
export function snapshotDiagram(svg: SVGSVGElement): { svgViewBox: string; svgInner: string } {
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.removeAttribute('style')
  return { svgViewBox: clone.getAttribute('viewBox') ?? '', svgInner: clone.innerHTML }
}

function renderSvg(
  page: string,
  width: number,
  height: number,
  onReady: (canvas: HTMLCanvasElement) => void,
  onError: () => void,
): void {
  const sourceBlob = new Blob([page], { type: 'image/svg+xml;charset=utf-8' });
  const sourceUrl = URL.createObjectURL(sourceBlob);
  const image = new Image();

  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) { URL.revokeObjectURL(sourceUrl); onError(); return; }
    context.fillStyle = '#fff';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    URL.revokeObjectURL(sourceUrl);
    onReady(canvas);
  };

  image.onerror = () => { URL.revokeObjectURL(sourceUrl); onError(); };
  image.src = sourceUrl;
}

/* ── PNG 下载 ────────────────────────────────────────── */

/** 将组装好的图纸页渲染为图片 Blob（供档案打包等场景复用） */
export function renderPageToBlob(
  page: string,
  width: number,
  height: number,
  type: 'image/jpeg' | 'image/png' = 'image/jpeg',
  quality = 0.92,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    renderSvg(
      page,
      width,
      height,
      canvas => {
        canvas.toBlob(
          blob => (blob ? resolve(blob) : reject(new Error('图纸渲染失败'))),
          type,
          quality,
        )
      },
      () => reject(new Error('图纸渲染失败')),
    )
  })
}

export function downloadPng(
  page: string,
  width: number,
  height: number,
  filename: string,
  onComplete?: () => void,
): void {
  const cleanup = () => onComplete?.();
  renderSvg(page, width, height, canvas => {
    canvas.toBlob(blob => {
      if (!blob) { cleanup(); return; }
      const a = document.createElement('a');
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = filename;
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); cleanup(); }, 1000);
    }, 'image/png');
  }, cleanup);
}

/* ── JPG 下载 ────────────────────────────────────────── */

export function downloadJpg(
  page: string,
  width: number,
  height: number,
  filename: string,
  onComplete?: () => void,
): void {
  const cleanup = () => onComplete?.();
  renderSvg(page, width, height, canvas => {
    canvas.toBlob(blob => {
      if (!blob) { cleanup(); return; }
      const a = document.createElement('a');
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = filename;
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); cleanup(); }, 1000);
    }, 'image/jpeg', 0.92);
  }, cleanup);
}

/** 连续下载多张图纸（PNG/JPG）。稍后触发第二张，避免浏览器拦截。 */
export function downloadImages(
  pages: { page: string; filename: string }[],
  width: number,
  height: number,
  type: 'image/png' | 'image/jpeg',
  onComplete?: () => void,
): void {
  const cleanup = () => onComplete?.();
  Promise.all(pages.map((item) => renderPageToBlob(item.page, width, height, type)))
    .then((blobs) => {
      blobs.forEach((blob, index) => {
        window.setTimeout(() => {
          const a = document.createElement('a');
          const url = URL.createObjectURL(blob);
          a.href = url;
          a.download = pages[index]!.filename;
          a.click();
          window.setTimeout(() => URL.revokeObjectURL(url), 2000);
        }, index * 450);
      });
      window.setTimeout(cleanup, pages.length * 450 + 200);
    })
    .catch(cleanup);
}

/* ── PDF 下载（支持多页） ─────────────────────────────── */

function buildPdf(
  images: { jpeg: Uint8Array; imgW: number; imgH: number }[],
  pageW: number,
  pageH: number,
): Uint8Array {
  const enc = (s: string) => new TextEncoder().encode(s);
  const nl = '\n';
  const chunks: Uint8Array[] = [];
  let pos = 0;
  const write = (data: string | Uint8Array) => {
    const bytes = typeof data === 'string' ? enc(data) : data;
    chunks.push(bytes);
    pos += bytes.length;
  };
  const offsets: number[] = [];
  const beginObj = () => { offsets.push(pos); };

  write(`%PDF-1.4${nl}`);
  beginObj();
  write(`1 0 obj${nl}<< /Type /Catalog /Pages 2 0 R >>${nl}endobj${nl}`);
  const pageIds = images.map((_, index) => 3 + index * 3);
  beginObj();
  write(`2 0 obj${nl}<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${images.length} >>${nl}endobj${nl}`);

  images.forEach((image, index) => {
    const pageId = 3 + index * 3;
    const contentId = pageId + 1;
    const imageId = pageId + 2;
    const stream = `q ${pageW} 0 0 ${pageH} 0 0 cm /Im${index} Do Q`;
    beginObj();
    write(`${pageId} 0 obj${nl}<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Contents ${contentId} 0 R /Resources << /XObject << /Im${index} ${imageId} 0 R >> >> >>${nl}endobj${nl}`);
    beginObj();
    write(`${contentId} 0 obj${nl}<< /Length ${stream.length} >>${nl}stream${nl}${stream}${nl}endstream${nl}endobj${nl}`);
    beginObj();
    write(`${imageId} 0 obj${nl}<< /Type /XObject /Subtype /Image /Width ${image.imgW} /Height ${image.imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.jpeg.length} >>${nl}stream${nl}`);
    write(image.jpeg);
    write(`${nl}endstream${nl}endobj${nl}`);
  });

  const xrefOff = pos;
  const entries = [
    `0000000000 65535 f ${nl}`,
    ...offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n ${nl}`),
  ];
  write(`xref${nl}0 ${offsets.length + 1}${nl}${entries.join('')}`);
  write(`trailer${nl}<< /Size ${offsets.length + 1} /Root 1 0 R >>${nl}startxref${nl}${xrefOff}${nl}%%EOF${nl}`);

  const result = new Uint8Array(pos);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

export function downloadPdf(
  pages: string | string[],
  imgW: number,
  imgH: number,
  pageW: number,
  pageH: number,
  filename: string,
  onComplete?: () => void,
): void {
  const list = Array.isArray(pages) ? pages : [pages];
  const cleanup = () => onComplete?.();
  Promise.all(list.map((page) => renderPageToBlob(page, imgW, imgH, 'image/jpeg')))
    .then(async (blobs) => {
      const images = await Promise.all(blobs.map(async (blob) => ({
        jpeg: new Uint8Array(await blob.arrayBuffer()),
        imgW,
        imgH,
      })));
      const pdfBytes = buildPdf(images, pageW, pageH);
      const a = document.createElement('a');
      const url = URL.createObjectURL(new Blob([pdfBytes as BlobPart], { type: 'application/pdf' }));
      a.href = url;
      a.download = filename;
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); cleanup(); }, 1000);
    })
    .catch(cleanup);
}

/* ── A4 图纸组装（布置图 1～2 页 + 一览表） ─────────── */

export interface ExportDiagram {
  svgViewBox: string
  svgInner: string
  /** 双侧占路时为「上行」或「下行」；单侧可空 */
  caption?: string
}

export interface ExportPageInput {
  /** 道路图的 viewBox（字符串）；无 diagrams 时使用 */
  svgViewBox?: string
  /** 道路图的内部 XML（svg.innerHTML）；无 diagrams 时使用 */
  svgInner?: string
  /** 多张布置图（双侧占路：上行、下行各一张） */
  diagrams?: ExportDiagram[]
  /** 生成布置图时使用的参数 */
  params: Params
  zones: Zone[]
  signRows: [number, string, string, string][]
  /** 布置总长度（米） */
  total: number
  /** 双侧占路：分区表/时刻表改双列（上行/下行桩号并排） */
  doubleSide?: boolean
  /** 页面方向：portrait=A4 纵向（默认），landscape=A4 横向 */
  orientation?: 'landscape' | 'portrait'
}

function resolveDiagrams(input: ExportPageInput): ExportDiagram[] {
  if (input.diagrams && input.diagrams.length > 0) return input.diagrams
  return [{ svgViewBox: input.svgViewBox ?? '', svgInner: input.svgInner ?? '', caption: '' }]
}

const A4 = {
  portrait: { w: 794, h: 1123 },
  landscape: { w: 1123, h: 794 },
} as const

function scaleColumns(weights: number[], width: number): number[] {
  const sum = weights.reduce((acc, value) => acc + value, 0)
  const cols = weights.map((weight) => Math.floor((width * weight) / sum * 10) / 10)
  cols[cols.length - 1] = (cols[cols.length - 1] ?? 0) + width - cols.reduce((acc, value) => acc + value, 0)
  return cols
}

function pageMetrics(orientation: 'landscape' | 'portrait') {
  const { w: pageW, h: pageH } = A4[orientation]
  const inner = 22
  const titleH = 68
  const footerH = 38
  const pad = 12
  return {
    pageW,
    pageH,
    inner,
    titleH,
    footerH,
    contentX: inner + pad,
    contentY: inner + titleH + pad,
    contentW: pageW - (inner + pad) * 2,
    contentH: pageH - inner - titleH - pad - footerH - inner - 6,
  }
}

function wrapPage(orientation: 'landscape' | 'portrait', body: string): string {
  const { w, h } = A4[orientation]
  const mmW = orientation === 'portrait' ? 210 : 297
  const mmH = orientation === 'portrait' ? 297 : 210
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${mmW}mm" height="${mmH}mm" viewBox="0 0 ${w} ${h}">${body}</svg>`
}

function drawingChrome(
  m: ReturnType<typeof pageMetrics>,
  title: string,
  subtitle: string,
  pageNo: number,
  pageCount: number,
): string {
  const { pageW, pageH, inner, titleH, footerH } = m
  const outer = 16
  const footerY = pageH - inner - footerH
  return [
    `<rect width="${pageW}" height="${pageH}" fill="#fff"/>`,
    `<rect x="${outer}" y="${outer}" width="${pageW - outer * 2}" height="${pageH - outer * 2}" fill="none" stroke="#1d1d1f" stroke-width="1.8"/>`,
    `<rect x="${inner}" y="${inner}" width="${pageW - inner * 2}" height="${pageH - inner * 2}" fill="none" stroke="#1d1d1f" stroke-width="0.7"/>`,
    `<line x1="${inner}" y1="${inner + titleH}" x2="${pageW - inner}" y2="${inner + titleH}" stroke="#1d1d1f" stroke-width="0.7"/>`,
    `<line x1="${inner}" y1="${footerY}" x2="${pageW - inner}" y2="${footerY}" stroke="#1d1d1f" stroke-width="0.7"/>`,
    `<text x="${inner + 14}" y="${inner + 26}" font-family="PingFang SC,Microsoft YaHei,sans-serif" font-size="20" font-weight="700" fill="#1d1d1f">${xmlText(title)}</text>`,
    ...subtitle.split('\n').map((line, index) =>
      `<text x="${inner + 14}" y="${inner + 44 + index * 14}" font-family="PingFang SC,Microsoft YaHei,sans-serif" font-size="10" fill="#4a4a4f">${xmlText(line)}</text>`
    ),
    `<text x="${pageW - inner - 12}" y="${inner + 28}" text-anchor="end" font-family="PingFang SC,Microsoft YaHei,sans-serif" font-size="11" fill="#6e6e73">图 ${pageNo}　共 ${pageCount} 页</text>`,
    `<text x="${inner + 12}" y="${footerY + 16}" font-family="PingFang SC,Microsoft YaHei,sans-serif" font-size="8.5" fill="#6e6e73">锥桶数量仅表示布置走向，现场按设定的 1-4m 间距放样。</text>`,
    `<text x="${inner + 12}" y="${footerY + 28}" font-family="PingFang SC,Microsoft YaHei,sans-serif" font-size="8.5" fill="#6e6e73">正式实施前，请依据道路等级、设计速度、施工类型及当地现行规范复核。</text>`,
    `<text x="${pageW - inner - 12}" y="${footerY + 22}" text-anchor="end" font-family="PingFang SC,Microsoft YaHei,sans-serif" font-size="9" fill="#6e6e73">A4 ${pageW > pageH ? '横向' : '纵向'} · 比例示意</text>`,
  ].join('')
}

interface ExportModel {
  primaryDir: string
  mirrorDir: string
  mirrored: Zone[] | null
  zoneRows: string[][]
  exportSignRows: string[][]
  subtitle: string
  orientation: 'landscape' | 'portrait'
}

function buildExportModel({
  params, zones, signRows, total, doubleSide = false, orientation = 'portrait',
}: ExportPageInput): ExportModel {
  const primaryDir = params.direction === 'down' ? '下行' : '上行'
  const mirrorDir = primaryDir === '上行' ? '下行' : '上行'
  const mirrored = doubleSide ? mirrorZones(zones, params.direction) : null
  const extent = zoneExtent(zones, mirrored ?? undefined)
  const lengthSummary = doubleSide
    ? `单侧长度：${total}m　整体影响：${stake(extent.min)}—${stake(extent.max)}（${extent.span}m）`
    : `布置总长度：${total}m`
  const zoneRows = mirrored
    ? zones.map((zone, index) => [
        String(index + 1), zone.name, `${zone.length}m`,
        stake(zone.start), stake(zone.end),
        stake(mirrored[index]!.start), stake(mirrored[index]!.end),
      ])
    : zones.map((zone, index) => [String(index + 1), zone.name, `${zone.length}m`, stake(zone.start), stake(zone.end)])
  const primaryItems = signRowsOf(zones, params.speed)
  const mirrorItems = mirrored ? signRowsOf(mirrored, params.speed) : null
  const exportSignRows = mirrored
    ? primaryItems.map((item, index) => [
        String(index + 1), item[0], stake(item[1]), stake(mirrorItems![index]![1]), item[2],
      ])
    : signRows.map((row) => [String(row[0]), row[1], row[2], row[3]])
  const subtitle = `作业区起点：${params.start}　方向：${doubleSide ? '上/下行' : primaryDir}　施工位置：${params.workSide === 'median' ? '中央分隔带' : '路侧'}${doubleSide ? '（双侧占路）' : ''}\n${lengthSummary}`
  return { primaryDir, mirrorDir, mirrored, zoneRows, exportSignRows, subtitle, orientation }
}

/** 布置图页：道路图铺满 A4 图框 */
export function buildDiagramPage(
  input: ExportPageInput,
  diagram: ExportDiagram,
  pageNo: number,
  pageCount: number,
): string {
  const model = buildExportModel(input)
  const m = pageMetrics(model.orientation)
  const title = diagram.caption
    ? `高速公路作业区布置图（${diagram.caption}）`
    : '高速公路作业区布置图'
  return wrapPage(model.orientation, [
    drawingChrome(m, title, model.subtitle, pageNo, pageCount),
    `<rect x="${m.contentX}" y="${m.contentY}" width="${m.contentW}" height="${m.contentH}" fill="#f8fafc"/>`,
    `<svg x="${m.contentX}" y="${m.contentY}" width="${m.contentW}" height="${m.contentH}" viewBox="${xmlText(diagram.svgViewBox)}" preserveAspectRatio="xMidYMid meet">${diagram.svgInner}</svg>`,
  ].join(''))
}

/** 第 2 页：两张明细表按行数比例铺满 A4 */
export function buildTablePage(input: ExportPageInput): string {
  const model = buildExportModel(input)
  const m = pageMetrics(model.orientation)
  const zoneHeaders = model.mirrored
    ? ['序号', '分区名称', '长度', `${model.primaryDir}起点`, `${model.primaryDir}终点`, `${model.mirrorDir}起点`, `${model.mirrorDir}终点`]
    : ['序号', '分区名称', '长度', '起点桩号', '终点桩号']
  const signHeaders = model.mirrored
    ? ['序号', '标志牌名称', `${model.primaryDir}桩号`, `${model.mirrorDir}桩号`, '位置说明']
    : ['序号', '标志牌名称', '设置桩号', '位置说明']
  const zoneWeights = model.mirrored ? [40, 90, 56, 86, 86, 86, 86] : [48, 140, 80, 180, 180]
  const signWeights = model.mirrored ? [40, 160, 90, 90, 180] : [48, 220, 140, 240]
  const gap = 16

  let tables: string
  if (model.orientation === 'landscape') {
    const colW = (m.contentW - gap) / 2
    tables = [
      exportTable({
        x: m.contentX, y: m.contentY, width: colW, height: m.contentH,
        title: '表 1　各区域起止点',
        headers: zoneHeaders,
        rows: model.zoneRows,
        columnWidths: scaleColumns(zoneWeights, colW),
      }),
      exportTable({
        x: m.contentX + colW + gap, y: m.contentY, width: colW, height: m.contentH,
        title: '表 2　各标志牌位置',
        headers: signHeaders,
        rows: model.exportSignRows,
        columnWidths: scaleColumns(signWeights, colW),
      }),
    ].join('')
  } else {
    const zoneWeight = model.zoneRows.length + 2.4
    const signWeight = model.exportSignRows.length + 2.4
    const zoneH = (m.contentH - gap) * zoneWeight / (zoneWeight + signWeight)
    const signH = m.contentH - gap - zoneH
    tables = [
      exportTable({
        x: m.contentX, y: m.contentY, width: m.contentW, height: zoneH,
        title: '表 1　各区域起止点',
        headers: zoneHeaders,
        rows: model.zoneRows,
        columnWidths: scaleColumns(zoneWeights, m.contentW),
      }),
      exportTable({
        x: m.contentX, y: m.contentY + zoneH + gap, width: m.contentW, height: signH,
        title: '表 2　各标志牌位置',
        headers: signHeaders,
        rows: model.exportSignRows,
        columnWidths: scaleColumns(signWeights, m.contentW),
      }),
    ].join('')
  }

  const diagrams = resolveDiagrams(input)
  const pageCount = diagrams.length + 1
  return wrapPage(model.orientation, [
    drawingChrome(m, '高速公路作业区一览表', model.subtitle, pageCount, pageCount),
    `<g font-family="PingFang SC,Microsoft YaHei,sans-serif">${tables}</g>`,
  ].join(''))
}

export function buildExportPages(input: ExportPageInput): { diagramPages: string[]; tablePage: string } {
  const diagrams = resolveDiagrams(input)
  const pageCount = diagrams.length + 1
  return {
    diagramPages: diagrams.map((diagram, index) => buildDiagramPage(input, diagram, index + 1, pageCount)),
    tablePage: buildTablePage(input),
  }
}
