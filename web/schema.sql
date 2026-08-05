-- 三照系统数据库表结构
-- 施工位置四级：高速公路 → 路段 → 桩号 → 方向（上行/下行）
CREATE TABLE IF NOT EXISTS records (
  id           TEXT PRIMARY KEY,
  project_name TEXT NOT NULL,             -- 项目名称
  highway      TEXT NOT NULL,             -- 高速公路（如 S50太临高速）
  section      TEXT NOT NULL,             -- 路段（如 太佳西段）
  stake        TEXT NOT NULL,             -- 桩号（如 K12+345）
  direction    TEXT NOT NULL DEFAULT '',  -- 方向：'' / up(上行) / down(下行)
  content      TEXT NOT NULL DEFAULT '',  -- 施工内容
  work_date    TEXT NOT NULL,             -- 施工日期 YYYY-MM-DD
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 每个阶段可传多张照片（施工前/施工过程中/施工后 不限张数）
CREATE TABLE IF NOT EXISTS photos (
  id        TEXT PRIMARY KEY,
  record_id TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  phase     TEXT NOT NULL CHECK (phase IN ('before', 'during', 'after')),
  file_key  TEXT NOT NULL,                -- R2 对象 key
  taken_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_records_work_date ON records(work_date);
CREATE INDEX IF NOT EXISTS idx_records_highway ON records(highway);
CREATE INDEX IF NOT EXISTS idx_photos_record ON photos(record_id);
