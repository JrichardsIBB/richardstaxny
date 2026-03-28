import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyAdmin(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing authorization');
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) throw new Error('Invalid token');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['owner', 'admin', 'tax_agent'].includes(profile.role)) {
    throw new Error('Insufficient permissions');
  }

  return { user, role: profile.role };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await verifyAdmin(req.headers.authorization);

    if (req.method === 'GET') {
      const { document_id } = req.query;

      if (!document_id) {
        return res.status(400).json({ error: 'document_id required' });
      }

      const { data, error } = await supabase
        .from('extraction_results')
        .select('*')
        .eq('document_id', document_id)
        .order('field_name');

      if (error) throw error;

      return res.status(200).json({ extractions: data });
    }

    if (req.method === 'PATCH') {
      // Verify/correct an extraction
      const { extraction_id, verified_value } = req.body;

      if (!extraction_id) {
        return res.status(400).json({ error: 'extraction_id required' });
      }

      const { data, error } = await supabase
        .from('extraction_results')
        .update({
          is_verified: true,
          verified_value: verified_value || null,
        })
        .eq('id', extraction_id)
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({ extraction: data });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    const status = error.message.includes('permission') ? 403 : 500;
    return res.status(status).json({ error: error.message });
  }
}
