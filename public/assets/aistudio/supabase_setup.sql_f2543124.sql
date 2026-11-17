-- ============================================================
-- MULIABARA PLANT & MAINTENANCE - SUPABASE SCHEMA SETUP
-- ============================================================

CREATE TABLE IF NOT EXISTS public.app_users (
  id TEXT PRIMARY KEY,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.units (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Genset', 'Alat Berat')),
  status TEXT NOT NULL CHECK (status IN ('Ready', 'Tidak Ready')),
  current_hm NUMERIC DEFAULT 0,
  last_service TEXT NOT NULL,
  next_service TEXT NOT NULL,
  remarks TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mekanik_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  operator_name TEXT NOT NULL,
  unit_id TEXT,
  unit_category TEXT NOT NULL,
  unit_name TEXT NOT NULL,
  jenis TEXT NOT NULL,
  hm NUMERIC NOT NULL,
  kwh NUMERIC NULL,
  fuel NUMERIC NOT NULL,
  detail TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.elektrik_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  operator_name TEXT NOT NULL,
  category TEXT NOT NULL,
  target_name TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.logistic_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  petugas TEXT NOT NULL,
  type TEXT NOT NULL,
  person TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  photo TEXT DEFAULT ''
);

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mekanik_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elektrik_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logistic_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow app access app_users" ON public.app_users;
CREATE POLICY "Allow app access app_users" ON public.app_users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow app access units" ON public.units;
CREATE POLICY "Allow app access units" ON public.units FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow app access mekanik_logs" ON public.mekanik_logs;
CREATE POLICY "Allow app access mekanik_logs" ON public.mekanik_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow app access elektrik_logs" ON public.elektrik_logs;
CREATE POLICY "Allow app access elektrik_logs" ON public.elektrik_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow app access logistic_logs" ON public.logistic_logs;
CREATE POLICY "Allow app access logistic_logs" ON public.logistic_logs FOR ALL USING (true) WITH CHECK (true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('logistic-photos', 'logistic-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read logistic-photos" ON storage.objects;
CREATE POLICY "Public read logistic-photos" ON storage.objects FOR SELECT USING (bucket_id = 'logistic-photos');

DROP POLICY IF EXISTS "Public upload logistic-photos" ON storage.objects;
CREATE POLICY "Public upload logistic-photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'logistic-photos');

INSERT INTO public.app_users (id, password, name, role) VALUES
  ('PGW01', '123', 'Pak Hendra (Pengawas)', 'Pengawas'),
  ('MEK01', '123', 'Budi (Mekanik)', 'Operator Mekanik'),
  ('ELK01', '123', 'Rizal (Elektrik)', 'Operator Elektrik'),
  ('LOG01', '123', 'Sari (Logistic)', 'Logistic')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.units (id, name, category, status, current_hm, last_service, next_service, remarks) VALUES
  ('U1', 'Genset Perkins 500 kVA #01', 'Genset', 'Ready', 2475, 'HM 2250', 'HM 2500', 'Operasional normal, cek filter berkala'),
  ('U2', 'Genset CAT 350 kVA #02', 'Genset', 'Ready', 1840, 'HM 1750', 'HM 2000', 'Standby unit plant utama'),
  ('U3', 'Excavator Komatsu PC200 #03', 'Alat Berat', 'Ready', 4180, 'HM 4000', 'HM 4250', 'Siap operasi di area pit'),
  ('U4', 'Dump Truck Hino 500 #02', 'Alat Berat', 'Tidak Ready', 6995, 'HM 6750', 'HM 7000', 'Perbaikan hose hidrolik dump & jadwal service')
ON CONFLICT (id) DO NOTHING;