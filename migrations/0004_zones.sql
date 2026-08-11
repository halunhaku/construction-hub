-- 独立布控区域表（不依赖施工记录）
-- record_id 预留：将来布控区域可关联到施工记录（可空，本次不做关联 UI）
CREATE TABLE IF NOT EXISTS zones (
  id TEXT PRIMARY KEY,
  project_name TEXT NOT NULL DEFAULT '',
  highway TEXT NOT NULL DEFAULT '',
  section TEXT NOT NULL DEFAULT '',
  stake TEXT NOT NULL DEFAULT '',
  length REAL NOT NULL DEFAULT 0,
  direction TEXT NOT NULL DEFAULT 'up',
  work_location TEXT NOT NULL DEFAULT 'roadside',
  zone_params TEXT NOT NULL,
  record_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_zones_project_name ON zones (project_name);
CREATE INDEX IF NOT EXISTS idx_zones_updated_at ON zones (updated_at);
