-- Migration: Add system_logs table and reconciled_post_call column
-- Run this on your D1 database to add the defensive reliability features

-- 1. Add reconciled_post_call column to phone_calls table
ALTER TABLE phone_calls ADD COLUMN reconciled_post_call INTEGER DEFAULT 0;

-- 2. Create system_logs table for webhook error logging
CREATE TABLE IF NOT EXISTS system_logs (
  id TEXT PRIMARY KEY,
  level TEXT NOT NULL,
  source TEXT NOT NULL,
  message TEXT NOT NULL,
  payload TEXT,
  stack_trace TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create indexes for system_logs
CREATE INDEX IF NOT EXISTS idx_system_logs_source ON system_logs(source);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_created ON system_logs(created_at);
