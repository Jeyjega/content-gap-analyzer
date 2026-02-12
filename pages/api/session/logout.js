import { supabaseAdmin } from '../../../lib/supabaseServer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: 'Missing user_id' });
  }

  try {
    // Revoke all active sessions for this user
    const { error } = await supabaseAdmin
      .from('user_sessions')
      .update({ revoked: true })
      .eq('user_id', user_id)
      .eq('revoked', false);

    if (error) throw error;

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Logout cleanup failed', err);
    return res.status(500).json({ error: 'Failed to logout user' });
  }
}