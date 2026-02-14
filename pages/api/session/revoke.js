import { supabaseAdmin } from '../../../lib/supabaseServer';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { device_id } = req.body;

  if (!device_id) {
    return res.status(400).json({ error: 'Missing device_id' });
  }

  try {
    await supabaseAdmin
      .from('user_sessions')
      .update({ revoked: true })
      .eq('device_id', device_id)
      .eq('revoked', false);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Session revoke failed', err);
    return res.status(500).json({ error: 'Failed to revoke session' });
  }
}