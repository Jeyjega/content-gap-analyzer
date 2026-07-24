import { supabaseAdmin } from '../../../lib/supabaseServer';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password, device_id } = req.body;

  if (!email || !password || !device_id) {
    return res.status(400).json({ error: 'Missing email, password, or device_id' });
  }

  try {
    // 1️⃣ Check if the device_id has already claimed a free account
    const { data: existingUsers, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('device_id', device_id);

    if (usersError) {
      console.error('[signup] Error checking device users:', usersError);
      throw usersError;
    }

    if (existingUsers && existingUsers.length > 0) {
      const userIds = existingUsers.map(u => u.id);

      // Check active subscriptions for these users
      const { data: subscriptions, error: subError } = await supabaseAdmin
        .from('subscriptions')
        .select('user_id, plan, status')
        .in('user_id', userIds)
        .in('status', ['active', 'trialing']);

      if (subError) {
        console.error('[signup] Error checking active subscriptions:', subError);
        throw subError;
      }

      const paidUserIds = new Set((subscriptions || []).map(s => s.user_id));

      // If any of the existing users on this device doesn't have a paid subscription,
      // then a free account has already been claimed on this device.
      const hasFreeAccount = userIds.some(id => !paidUserIds.has(id));

      if (hasFreeAccount) {
        return res.status(400).json({
          error: 'This device has already claimed a free account. Please log in or upgrade to a paid plan.'
        });
      }
    }

    // 2️⃣ Create the user in Supabase Auth via the admin client
    // Passing email_confirm: true allows direct/automatic login without OTP verification.
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password: password.trim(),
      email_confirm: true,
      user_metadata: { device_id }
    });

    if (authError) {
      console.error('[signup] Auth creation error:', authError);
      return res.status(400).json({ error: authError.message });
    }

    const newUser = authData.user;

    // 3️⃣ Upsert the user profile in public.users to bind the device_id
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: newUser.id,
        email: newUser.email,
        device_id: device_id,
        created_at: new Date().toISOString()
      });

    if (dbError) {
      console.error('[signup] Failed to bind device_id in public.users:', dbError);
    }

    return res.status(200).json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email
      }
    });

  } catch (err) {
    console.error('[signup] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error during registration' });
  }
}
