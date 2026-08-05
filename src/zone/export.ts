import type { Zone, TableConfig, Direction, Params } from './types';
import { stake, warningSignOffsets, xmlText } from './utils';

/* ── 标志牌时刻表 ────────────────────────────────────── */

const WARN_NAMES: Record<number, string> = {
  0: '前方施工 1600m', 400: '关闭智驾', 600: '限速 80', 800: '前方施工 800m',
  1000: '限速 60', 1200: '禁止超车 / 车道减少',
};
const WARN_DESCS: Record<number, string> = {
  0: '0m / 警告区起点', 400: '距警告区起点 400m', 600: '距警告区起点 600m',
  800: '距警告区起点 800m', 1000: '距警告区起点 1000m', 1200: '距警告区起点 1200m',
};

export function signSchedule(zones: Zone[], _direction: Direction): [number, string, string, string][] {
  const at = (zone: Zone, offset: number) => zone.start + Math.sign(zone.end - zone.start) * offset;
  const warnLen = zones[0]!.length;
  const items: [string, number, string][] = [
    // 偏移超出警告区实际长度的标志不设置，避免出现在不存在的位置
    ...warningSignOffsets
      .filter(offset => offset <= warnLen)
      .map(offset => [WARN_NAMES[offset], at(zones[0]!, offset), WARN_DESCS[offset]] as [string, number, string]),
    ['导向标志牌', at(zones[1]!, 50), '过渡区内 50m'],
    ['路栏 / 作业区长度', zones[2]!.start, '缓冲区入口'],
    ['解除限速 60 / 禁止超车', zones[5]!.end, '终止区终点'],
  ];
  return items.map((item, index) => [index + 1, item[0], stake(item[1]), item[2]]);
}

/* ── 导出表格生成 ────────────────────────────────────── */

export function exportTable({
  x, y, width, title, headers, rows, columnWidths,
  titleHeight = 28, rowHeight = 28, headerHeight = 30,
  fontSize = 10, titleFontSize = 12,
}: TableConfig): string {
  const offsets = columnWidths.reduce<number[]>((list, value, index) => {
    list.push((list[index] ?? 0) + value);
    return list;
  }, [0]);
  const height = titleHeight + headerHeight + rows.length * rowHeight;

  const verticals = offsets.slice(1, -1).map(offset =>
    `<line x1="${x + offset}" y1="${y + titleHeight}" x2="${x + offset}" y2="${y + height}"/>`
  ).join('');

  const horizontals = Array.from({ length: rows.length + 1 }, (_, index) =>
    `<line x1="${x}" y1="${y + titleHeight + headerHeight + index * rowHeight}" x2="${x + width}" y2="${y + titleHeight + headerHeight + index * rowHeight}"/>`
  ).join('');

  const cellBaseline = (h: number, s: number) => Math.round((h - s) / 2 + s * 0.82);
  const cellText = (cells: string[], rowY: number, fontWeight = '400', fill = '#1d1d1f') =>
    cells.map((cell, index) =>
      `<text x="${x + offsets[index]! + columnWidths[index]! / 2}" y="${rowY}" text-anchor="middle" font-size="${fontSize}" font-weight="${fontWeight}" fill="${fill}">${xmlText(cell)}</text>`
    ).join('');

  return [
    `<g stroke="#d1d1d6" stroke-width="1">`,
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="4" fill="#fff"/>`,
    `<rect x="${x}" y="${y}" width="${width}" height="${titleHeight}" rx="4" fill="#eaf2ff"/>`,
    `<rect x="${x}" y="${y + titleHeight}" width="${width}" height="${headerHeight}" fill="#f5f5f7"/>`,
    verticals,
    horizontals,
    `</g>`,
    `<text x="${x + 12}" y="${y + cellBaseline(titleHeight, titleFontSize)}" font-size="${titleFontSize}" font-weight="700" fill="#007aff">${xmlText(title)}</text>`,
    cellText(headers, y + titleHeight + cellBaseline(headerHeight, fontSize), '700', '#6e6e73'),
    rows.map((row, index) =>
      cellText(row, y + titleHeight + headerHeight + index * rowHeight + cellBaseline(rowHeight, fontSize))
    ).join(''),
  ].join('');
}

/* ── 通用 SVG→Canvas 渲染 ────────────────────────────── */

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

/* ── PDF 下载 ────────────────────────────────────────── */

function buildPdf(jpeg: Uint8Array, imgW: number, imgH: number, pageW: number, pageH: number): Uint8Array {
  const enc = (s: string) => new TextEncoder().encode(s);
  const nl = '\n';

  const obj1  = `1 0 obj${nl}<< /Type /Catalog /Pages 2 0 R >>${nl}endobj${nl}`;
  const obj2  = `2 0 obj${nl}<< /Type /Pages /Kids [3 0 R] /Count 1 >>${nl}endobj${nl}`;
  const obj3  = `3 0 obj${nl}<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Contents 4 0 R /Resources << /XObject << /Im0 5 0 R >> >> >>${nl}endobj${nl}`;
  const stream = `q ${pageW} 0 0 ${pageH} 0 0 cm /Im0 Do Q`;
  const obj4  = `4 0 obj${nl}<< /Length ${stream.length} >>${nl}stream${nl}${stream}${nl}endstream${nl}endobj${nl}`;
  const obj5h = `5 0 obj${nl}<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>${nl}stream${nl}`;
  const obj5f = `${nl}endstream${nl}endobj${nl}`;
  const header = `%PDF-1.4${nl}`;

  const objects = [obj1, obj2, obj3, obj4];
  const offsets: number[] = [];
  let pos = enc(header).length;
  for (const o of objects) { offsets.push(pos); pos += enc(o).length; }
  offsets.push(pos);
  pos += enc(obj5h).length;
  pos += jpeg.length;
  pos += enc(obj5f).length;

  const entries = [
    '0000000000 65535 f ' + nl,
    ...offsets.map(o => String(o).padStart(10, '0') + ' 00000 n ' + nl),
  ];
  const xref = 'xref' + nl + '0 6' + nl + entries.join('');
  const xrefOff = pos;
  pos += enc(xref).length;
  const trailer = `trailer${nl}<< /Size 6 /Root 1 0 R >>${nl}startxref${nl}${xrefOff}${nl}%%EOF${nl}`;

  const result = new Uint8Array(pos + enc(trailer).length);
  let offset = 0;
  const put = (part: string) => { const b = enc(part); result.set(b, offset); offset += b.length; };
  put(header);
  objects.forEach(put);
  put(obj5h);
  result.set(jpeg, offset); offset += jpeg.length;
  put(obj5f);
  put(xref);
  put(trailer);

  return result;
}

export function downloadPdf(
  page: string,
  imgW: number,
  imgH: number,
  pageW: number,
  pageH: number,
  filename: string,
  onComplete?: () => void,
): void {
  const cleanup = () => onComplete?.();
  renderSvg(page, imgW, imgH, canvas => {
    canvas.toBlob(jpegBlob => {
      if (!jpegBlob) { cleanup(); return; }
      const reader = new FileReader();
      reader.onload = () => {
        const pdfBytes = buildPdf(new Uint8Array(reader.result as ArrayBuffer), imgW, imgH, pageW, pageH);
        const a = document.createElement('a');
        const url = URL.createObjectURL(new Blob([pdfBytes as BlobPart], { type: 'application/pdf' }));
        a.href = url;
        a.download = filename;
        a.click();
        setTimeout(() => { URL.revokeObjectURL(url); cleanup(); }, 1000);
      };
      reader.onerror = cleanup;
      reader.readAsArrayBuffer(jpegBlob);
    }, 'image/jpeg', 0.92);
  }, cleanup);
}

/* ── A4 横向图纸组装（纯函数，供台账内嵌导出） ────────── */

export interface ExportPageInput {
  /** 道路图的 viewBox（字符串） */
  svgViewBox: string
  /** 道路图的内部 XML（svg.innerHTML，含全部分区/标志/锥桶） */
  svgInner: string
  /** 生成布置图时使用的参数 */
  params: Params
  zones: Zone[]
  signRows: [number, string, string, string][]
  /** 布置总长度（米） */
  total: number
}

/** 组装 A4 横向（297×210mm）图纸页：标题 + 道路图 + 两张明细表 + 页脚 */
export function buildExportPage({ svgViewBox, svgInner, params, zones, signRows, total }: ExportPageInput): string {
  const zoneRows: string[][] = zones.map((z, i) => [
    String(i + 1), z.name, `${z.length}m`, stake(z.start), stake(z.end),
  ])
  const exportSignRows: string[][] = signRows.map(r => [
    String(r[0]), r[1], r[2], r[3],
  ])

  const zoneTable = exportTable({
    x: 30, y: 438, width: 500,
    title: '1. 各区域起止点',
    headers: ['序号', '分区名称', '长度', '起点桩号', '终点桩号'],
    rows: zoneRows,
    columnWidths: [44, 116, 76, 132, 132],
  })

  const signTable = exportTable({
    x: 548, y: 438, width: 545,
    title: '2. 各标志牌位置',
    headers: ['序号', '标志牌名称', '设置桩号', '位置说明'],
    rows: exportSignRows,
    columnWidths: [44, 190, 112, 199],
  })

  return `<svg xmlns="http://www.w3.org/2000/svg" width="297mm" height="210mm" viewBox="0 0 1123 794"><rect width="1123" height="794" fill="#fff"/><rect x="30" y="21" width="4" height="17" fill="#ff9f0a"/><text x="40" y="34" font-family="PingFang SC,Microsoft YaHei,sans-serif" font-size="20" font-weight="700" fill="#1d1d1f">高速公路作业区布置图</text><text x="40" y="55" font-family="PingFang SC,Microsoft YaHei,sans-serif" font-size="10" fill="#6e6e73">作业区起点：${xmlText(params.start)}　方向：${params.direction === 'up' ? '上行' : '下行'}　施工位置：${params.workSide === 'median' ? '中央分隔带' : '路侧'}　布置总长度：${total}m</text><rect x="30" y="68" width="1063" height="350" rx="5" fill="#f8fafc" stroke="#9fb0bf"/><svg x="36" y="74" width="1051" height="338" viewBox="${xmlText(svgViewBox)}" preserveAspectRatio="xMidYMid meet">${svgInner}</svg><g font-family="PingFang SC,Microsoft YaHei,sans-serif">${zoneTable}${signTable}</g><line x1="30" y1="764" x2="1093" y2="764" stroke="#9fb0bf"/><text x="30" y="781" font-family="PingFang SC,Microsoft YaHei,sans-serif" font-size="9" fill="#7b8995">正式实施前，请依据道路等级、设计速度、施工类型及当地现行规范复核。</text><text x="1093" y="781" text-anchor="end" font-family="PingFang SC,Microsoft YaHei,sans-serif" font-size="9" fill="#7b8995">A4 横向 · 比例示意</text></svg>`
}
