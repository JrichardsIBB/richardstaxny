-- ============================================================
-- Earnings & Service Fees for Richards Tax NY
-- Run this in Supabase SQL Editor
-- ============================================================

-- Service fee presets
CREATE TABLE IF NOT EXISTS service_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  default_amount NUMERIC(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-populate common tax service fees
INSERT INTO service_fees (name, default_amount) VALUES
  ('Individual Tax Return (Simple)', 150.00),
  ('Individual Tax Return (Standard)', 250.00),
  ('Individual Tax Return (Complex)', 400.00),
  ('Business Tax Return (LLC/S-Corp)', 500.00),
  ('Business Tax Return (C-Corp)', 750.00),
  ('Partnership Return (Form 1065)', 600.00),
  ('Amended Return (Form 1040-X)', 175.00),
  ('Tax Extension Filing', 75.00),
  ('Bookkeeping (Monthly)', 150.00),
  ('Bookkeeping (Quarterly)', 400.00),
  ('Tax Planning & Advisory', 300.00),
  ('IRS Representation', 500.00),
  ('Payroll Services (Monthly)', 200.00),
  ('Quarterly Estimated Tax Prep', 100.00),
  ('State Tax Return (Additional)', 75.00),
  ('Financial Consultation (1 Hour)', 150.00)
ON CONFLICT DO NOTHING;

-- Earnings table
CREATE TABLE IF NOT EXISTS earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  client_email TEXT,
  service_fee_id UUID REFERENCES service_fees(id),
  service_type TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(10,2) NOT NULL,
  fee_type TEXT DEFAULT 'service_fee' CHECK (fee_type IN ('service_fee', 'manual', 'adjustment')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_earnings_status ON earnings(status);
CREATE INDEX IF NOT EXISTS idx_earnings_created ON earnings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_earnings_created_by ON earnings(created_by);
