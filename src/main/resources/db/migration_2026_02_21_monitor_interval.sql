ALTER TABLE servers
    ADD COLUMN IF NOT EXISTS monitor_interval_minutes INT NOT NULL DEFAULT 30;

UPDATE servers
SET monitor_interval_minutes = 30
WHERE monitor_interval_minutes IS NULL OR monitor_interval_minutes < 1 OR monitor_interval_minutes > 1440;
