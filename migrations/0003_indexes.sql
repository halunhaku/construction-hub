-- 数据量增长后的查询优化索引（幂等，可重复执行）
CREATE INDEX IF NOT EXISTS idx_records_work_date ON records(work_date);
CREATE INDEX IF NOT EXISTS idx_records_project_name ON records(project_name);
CREATE INDEX IF NOT EXISTS idx_records_created_at ON records(created_at);
CREATE INDEX IF NOT EXISTS idx_photos_record_id ON photos(record_id);
