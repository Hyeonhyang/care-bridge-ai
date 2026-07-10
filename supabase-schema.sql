-- Care-Bridge AI - Supabase DB 스키마
-- Supabase SQL Editor에서 실행하세요.

-- 환자 테이블
CREATE TABLE IF NOT EXISTS patients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  room_number TEXT,
  diagnosis TEXT,
  ward_id TEXT,
  admitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 활력징후 테이블
CREATE TABLE IF NOT EXISTS vital_signs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  heart_rate INTEGER,
  systolic_bp INTEGER,
  diastolic_bp INTEGER,
  temperature NUMERIC(4,1),
  spo2 NUMERIC(4,1),
  respiratory_rate INTEGER,
  consciousness TEXT DEFAULT 'alert',
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 검사결과 테이블
CREATE TABLE IF NOT EXISTS lab_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  result_value TEXT,
  reference_range TEXT,
  is_abnormal BOOLEAN DEFAULT FALSE,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인수인계 기록 테이블
CREATE TABLE IF NOT EXISTS handoff_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  nurse_id UUID NOT NULL,
  audio_url TEXT,
  stt_text TEXT,
  emr_text TEXT,
  sbar_summary JSONB,
  risk_score INTEGER DEFAULT 0,
  risk_level TEXT DEFAULT 'low',
  actions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 감사 로그 테이블
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_vital_signs_patient
  ON vital_signs(patient_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_handoff_patient
  ON handoff_records(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user
  ON audit_logs(user_id, created_at DESC);

-- Row Level Security 활성화
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE vital_signs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE handoff_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 인증된 사용자 접근 허용
CREATE POLICY "Authenticated users can read patients"
  ON patients FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert patients"
  ON patients FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can read vital_signs"
  ON vital_signs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert vital_signs"
  ON vital_signs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can read lab_results"
  ON lab_results FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read handoff_records"
  ON handoff_records FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert handoff_records"
  ON handoff_records FOR INSERT TO authenticated WITH CHECK (true);

-- Service role은 모든 테이블에 전체 접근 (백엔드용)
CREATE POLICY "Service role full access patients"
  ON patients FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access vital_signs"
  ON vital_signs FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access lab_results"
  ON lab_results FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access handoff_records"
  ON handoff_records FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access audit_logs"
  ON audit_logs FOR ALL TO service_role USING (true);

-- Storage 버킷 (음성 파일용)
INSERT INTO storage.buckets (id, name, public)
VALUES ('handoff-audio', 'handoff-audio', false)
ON CONFLICT (id) DO NOTHING;
