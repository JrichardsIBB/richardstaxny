-- Export Logs table for tracking all exports
CREATE TABLE IF NOT EXISTS export_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  export_type TEXT NOT NULL, -- clients_standard, clients_mytaxprepoffice, clients_extended, documents
  record_count INTEGER DEFAULT 0,
  exported_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for simplicity (admin-only table accessed via service role)
ALTER TABLE export_logs DISABLE ROW LEVEL SECURITY;
