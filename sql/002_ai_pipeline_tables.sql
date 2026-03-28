-- ============================================================
-- Richards Tax NY — AI Document Pipeline Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Profiles table (admin vs client roles)
-- Roles:
--   owner      = Full access, site owners (Roy & you)
--   admin      = Full access to admin panel and all data
--   tax_agent  = Can view/process/review documents, limited settings
--   tax_filer  = Client who uploads documents and views their own data
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'tax_filer' CHECK (role IN ('owner', 'admin', 'tax_agent', 'tax_filer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    'tax_filer'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'tax_agent')
    )
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 2. Add AI pipeline columns to document_uploads
ALTER TABLE document_uploads
  ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending'
    CHECK (processing_status IN ('pending', 'processing', 'extracted', 'classified', 'review', 'approved', 'exported', 'error')),
  ADD COLUMN IF NOT EXISTS doc_category TEXT,
  ADD COLUMN IF NOT EXISTS doc_year INTEGER,
  ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- 3. Extraction results (AI-extracted fields from documents)
CREATE TABLE IF NOT EXISTS extraction_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES document_uploads(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_value TEXT,
  confidence NUMERIC(5,4),
  page_number INTEGER DEFAULT 1,
  bounding_box JSONB,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE extraction_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage extraction results"
  ON extraction_results FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'tax_agent')
    )
  );

CREATE POLICY "Users can read own extraction results"
  ON extraction_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM document_uploads
      WHERE document_uploads.id = extraction_results.document_id
      AND document_uploads.user_id = auth.uid()
    )
  );

-- 4. Processing jobs (pipeline tracking)
CREATE TABLE IF NOT EXISTS processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES document_uploads(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL CHECK (job_type IN ('ocr', 'classify', 'extract', 'normalize', 'export')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage processing jobs"
  ON processing_jobs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'tax_agent')
    )
  );

-- 5. Email intake log
CREATE TABLE IF NOT EXISTS email_intake_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_email TEXT NOT NULL,
  subject TEXT,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  attachment_count INTEGER DEFAULT 0,
  matched_user_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'received' CHECK (status IN ('received', 'processed', 'unmatched', 'error')),
  raw_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE email_intake_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email intake"
  ON email_intake_log FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'tax_agent')
    )
  );

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_uploads_processing_status
  ON document_uploads(processing_status);

CREATE INDEX IF NOT EXISTS idx_document_uploads_user_id
  ON document_uploads(user_id);

CREATE INDEX IF NOT EXISTS idx_extraction_results_document_id
  ON extraction_results(document_id);

CREATE INDEX IF NOT EXISTS idx_processing_jobs_document_id
  ON processing_jobs(document_id);

CREATE INDEX IF NOT EXISTS idx_processing_jobs_status
  ON processing_jobs(status);

CREATE INDEX IF NOT EXISTS idx_email_intake_sender
  ON email_intake_log(sender_email);

-- 7. Updated_at trigger for profiles
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Admin policy for document_uploads (so admins can see all docs)
CREATE POLICY "Admins can read all documents"
  ON document_uploads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'tax_agent')
    )
  );

CREATE POLICY "Admins can update all documents"
  ON document_uploads FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'tax_agent')
    )
  );
