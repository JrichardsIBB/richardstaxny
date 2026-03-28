import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Verify caller is an owner
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) throw new Error('Missing authorization');
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error('Invalid token');

    const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!callerProfile || callerProfile.role !== 'owner') {
      return res.status(403).json({ error: 'Only owners can delete users' });
    }

    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });

    // Prevent deleting yourself
    if (user_id === user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Prevent deleting other owners
    const { data: targetProfile } = await supabase.from('profiles').select('role, full_name').eq('id', user_id).single();
    if (targetProfile?.role === 'owner') {
      return res.status(400).json({ error: 'Cannot delete another owner' });
    }

    // Delete the user from auth (cascades to profiles via FK)
    const { error: deleteErr } = await supabase.auth.admin.deleteUser(user_id);
    if (deleteErr) throw deleteErr;

    return res.status(200).json({ success: true, message: `User ${targetProfile?.full_name || user_id} deleted` });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
