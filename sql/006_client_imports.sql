-- ============================================================
-- Client Import Table — pre-registered clients from CSV
-- These are clients who haven't created accounts yet
-- ============================================================

CREATE TABLE IF NOT EXISTS client_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  client_type TEXT DEFAULT 'individual',
  invite_status TEXT DEFAULT 'not_invited' CHECK (invite_status IN ('not_invited', 'invited', 'registered')),
  invited_at TIMESTAMPTZ,
  matched_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_imports_email ON client_imports(email);
CREATE INDEX IF NOT EXISTS idx_client_imports_status ON client_imports(invite_status);

-- No RLS needed — only accessible via service role / admin
