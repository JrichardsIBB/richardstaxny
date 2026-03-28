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
    const { user, role } = await verifyAdmin(req.headers.authorization);

    if (req.method === 'GET') {
      // List all documents with filters
      const { status, category, page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      let query = supabase
        .from('document_uploads')
        .select('*, profiles!document_uploads_user_id_fkey(full_name, email)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + parseInt(limit) - 1);

      if (status) query = query.eq('processing_status', status);
      if (category) query = query.eq('doc_category', category);

      const { data, error, count } = await query;
      if (error) throw error;

      return res.status(200).json({
        documents: data,
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      });
    }

    if (req.method === 'PATCH') {
      // Update document (review, approve, etc.)
      const { document_id, processing_status, doc_category, doc_year } = req.body;

      if (!document_id) {
        return res.status(400).json({ error: 'document_id required' });
      }

      const updates = {};
      if (processing_status) updates.processing_status = processing_status;
      if (doc_category) updates.doc_category = doc_category;
      if (doc_year) updates.doc_year = doc_year;

      if (processing_status === 'approved') {
        updates.reviewed_by = user.id;
        updates.reviewed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('document_uploads')
        .update(updates)
        .eq('id', document_id)
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({ document: data });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    const status = error.message.includes('permission') || error.message.includes('authorization')
      ? 403
      : 500;
    return res.status(status).json({ error: error.message });
  }
}
