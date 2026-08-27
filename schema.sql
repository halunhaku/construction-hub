-- 三照系统数据库表结构
-- 施工位置四级：高速公路 → 路段 → 桩号 → 方向（上行/下行）
CREATE TABLE IF NOT EXISTS records (
  id           TEXT PRIMARY KEY,
  project_name TEXT NOT NULL,             -- 项目名称
  highway      TEXT NOT NULL,             -- 高速公路（如 S50太临高速）
  section      TEXT NOT NULL,             -- 路段（如 太佳西段）
  work_location TEXT NOT NULL DEFAULT '', -- 施工位置（如 右侧路肩）
  stake        TEXT NOT NULL,             -- 桩号（如 K12+345）
  end_stake    TEXT NOT NULL DEFAULT '',  -- 结束桩号（可选）
  direction    TEXT NOT NULL DEFAULT '',  -- 方向：'' / up(上行) / down(下行)
  content      TEXT NOT NULL DEFAULT '',  -- 施工内容
  work_date    TEXT NOT NULL,             -- 施工日期 YYYY-MM-DD
  zone_params  TEXT,                      -- 作业区布置参数（JSON：RoadZone Params），NULL = 未设置
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
CREATE INDEX IF NOT EXISTS idx_records_project_name ON records(project_name);
CREATE INDEX IF NOT EXISTS idx_records_created_at ON records(created_at);
CREATE INDEX IF NOT EXISTS idx_photos_record ON photos(record_id);

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

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);

CREATE TABLE IF NOT EXISTS login_attempts (
  username TEXT NOT NULL,
  ip TEXT NOT NULL,
  attempted_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts (ip, attempted_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_user ON login_attempts (username, attempted_at);

-- 已有库的增量迁移见 migrations/
