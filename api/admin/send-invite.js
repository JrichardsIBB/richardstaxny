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
    const { client_id, email } = req.body;

    if (!client_id || !email) {
      return res.status(400).json({ error: 'client_id and email required' });
    }

    // Send magic link invite via Supabase Auth
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { invited_from: 'client_import' },
      redirectTo: `${process.env.VITE_SITE_URL || 'https://www.richardstaxny.com'}/profile`,
    });

    if (error) throw error;

    // Update client import status
    await supabase
      .from('client_imports')
      .update({
        invite_status: 'invited',
        invited_at: new Date().toISOString(),
        email: email,
      })
      .eq('id', client_id);

    return res.status(200).json({ success: true, message: `Invite sent to ${email}` });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
