import crypto from 'crypto';
import { supabaseAdmin } from '../../../lib/supabaseServer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user_id, device_id } = req.body;

  if (!user_id || !device_id) {
    return res.status(400).json({ error: 'Missing user_id or device_id' });
  }

  try {
    // 1️⃣ Fetch active sessions
    const { data: sessions, error } = await supabaseAdmin
      .from('user_sessions')
      .select('id, device_id')
      .eq('user_id', user_id)
      .eq('revoked', false)
      .gt('expires_at', new Date().toISOString());

    if (error) throw error;

    // 2️⃣ Normalize device list
    const activeDevices = new Set(
      sessions.map(s => s.device_id).filter(Boolean)
    );

    const deviceAlreadyActive = activeDevices.has(device_id);

    // ✅ CASE 1: Device already registered → allow silently
    if (deviceAlreadyActive) {
      return res.status(200).json({ success: true, reused: true });
    }

    // ❌ CASE 2: New device but limit reached
    if (activeDevices.size >= 3) {
      return res.status(403).json({
        error: 'Seat limit reached (3 devices maximum)',
      });
    }

    // ✅ CASE 3: New device + under limit → insert
    const sessionToken = crypto.randomUUID();

    const { error: insertError } = await supabaseAdmin
      .from('user_sessions')
      .insert({
        user_id,
        device_id,
        session_token: sessionToken,
        last_seen_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        revoked: false,
      });

    if (insertError) throw insertError;

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Session insert failed', err);
    return res.status(500).json({ error: 'Failed to register session' });
  }
}