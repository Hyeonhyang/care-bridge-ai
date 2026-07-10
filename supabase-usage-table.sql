-- API 사용량 로그 테이블
-- Supabase SQL Editor에서 실행하세요.

CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  audio_seconds NUMERIC DEFAULT 0,
  cost_usd NUMERIC(10,6) DEFAULT 0,
  user_id TEXT,
  endpoint TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_created ON api_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_service ON api_usage_logs(service, created_at DESC);

ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access api_usage_logs" ON api_usage_logs FOR ALL TO service_role USING (true);
CREATE POLICY "Auth read api_usage_logs" ON api_usage_logs FOR SELECT TO authenticated USING (true);
