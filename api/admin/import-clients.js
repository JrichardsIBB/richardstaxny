import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyOwner(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Missing authorization');
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error('Invalid token');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['owner', 'admin'].includes(profile.role)) throw new Error('Insufficient permissions');
  return user;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await verifyOwner(req.headers.authorization);
    const { clients } = req.body;

    if (!Array.isArray(clients) || clients.length === 0) {
      return res.status(400).json({ error: 'clients array required' });
    }

    let imported = 0;
    let skipped = 0;

    for (const client of clients) {
      // Skip if no name
      if (!client.full_name?.trim()) { skipped++; continue; }

      // Check if already imported
      const { data: existing } = await supabase
        .from('client_imports')
        .select('id')
        .eq('full_name', client.full_name.trim())
        .maybeSingle();

      if (existing) { skipped++; continue; }

      await supabase.from('client_imports').insert({
        full_name: client.full_name.trim(),
        email: client.email?.trim() || null,
        phone: client.phone?.trim() || null,
        client_type: client.client_type || 'individual',
        invite_status: 'not_invited',
      });

      imported++;
    }

    return res.status(200).json({ imported, skipped, total: clients.length });
  } catch (error) {
    return res.status(error.message.includes('permission') ? 403 : 500).json({ error: error.message });
  }
}
