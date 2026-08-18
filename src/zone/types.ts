/* ── Types ───────────────────────────────────────────── */

export type Direction = 'up' | 'down';
export type WorkSide = 'roadside' | 'median';
export type SignType = 'construction1600' | 'construction800' | 'length' | 'smart' | 'limit80' | 'limit60' | 'limit40' | 'laneLeft' | 'laneRight' | 'noOvertake' | 'arrowLeft' | 'arrowRight' | 'end60' | 'end40' | 'endOvertake';
export type ExportFileType = 'png' | 'jpg' | 'pdf';

export interface Params {
  start: string;
  work: number;
  direction: Direction;
  workSide: WorkSide;
  /** 双侧占路：仅中央分隔带施工可用，上/下行同时布控（180°对称） */
  doubleSide: boolean;
  warning: number;
  taper: number;
  buffer: number;
  downstream: number;
  terminal: number;
  speed: number;
  coneGap: number;
}

export interface ZoneMeta {
  key: string;
  name: string;
  color: string;
  description: string;
}

export interface Zone extends ZoneMeta {
  length: number;
  start: number;
  end: number;
}

export interface ZoneBlock extends Zone {
  x: number;
  w: number;
}

export interface TableConfig {
  x: number;
  y: number;
  width: number;
  title: string;
  headers: string[];
  rows: string[][];
  columnWidths: number[];
  titleHeight?: number;
  rowHeight?: number;
  headerHeight?: number;
  fontSize?: number;
  titleFontSize?: number;
}
