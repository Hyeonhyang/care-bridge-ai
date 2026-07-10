-- EMR 테이블 추가 마이그레이션
-- Supabase SQL Editor에서 실행하세요.

-- patients 테이블에 인적사항 컬럼 추가
ALTER TABLE patients ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS gender TEXT;

-- 의사 처방 테이블
CREATE TABLE IF NOT EXISTS doctor_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  order_type TEXT NOT NULL,
  order_content TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  ordered_at TIMESTAMPTZ DEFAULT NOW(),
  ordered_by TEXT
);

-- 간호 기록 테이블
CREATE TABLE IF NOT EXISTS nursing_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  nurse_id UUID,
  note_content TEXT NOT NULL,
  note_type TEXT DEFAULT 'observation',
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 진단/영상 기록 테이블
CREATE TABLE IF NOT EXISTS diagnostic_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL,
  title TEXT NOT NULL,
  result_text TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_orders_patient ON doctor_orders(patient_id, ordered_at DESC);
CREATE INDEX IF NOT EXISTS idx_nursing_patient ON nursing_notes(patient_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_diagnostic_patient ON diagnostic_records(patient_id, recorded_at DESC);

-- RLS
ALTER TABLE doctor_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE nursing_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access doctor_orders" ON doctor_orders FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access nursing_notes" ON nursing_notes FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access diagnostic_records" ON diagnostic_records FOR ALL TO service_role USING (true);
CREATE POLICY "Auth read doctor_orders" ON doctor_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth read nursing_notes" ON nursing_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth insert nursing_notes" ON nursing_notes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth read diagnostic_records" ON diagnostic_records FOR SELECT TO authenticated USING (true);
