import { createClient } from '@supabase/supabase-js';

// -----------------------------
// ENV
// -----------------------------
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// -----------------------------
// DEVICE ID (PERSISTENT)
// -----------------------------
export function getDeviceId() {
  if (typeof window === 'undefined') return null;

  const KEY = 'gapgens_device_id';
  let deviceId = localStorage.getItem(KEY);

  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(KEY, deviceId);
  }

  return deviceId;
}

// 👇 THIS EXPORT WAS MISSING BEFORE
export const deviceId = getDeviceId();

// -----------------------------
// SUPABASE CLIENT
// -----------------------------
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'supabase.auth.token',
  },
});

// -----------------------------
// SESSION REGISTRATION
// -----------------------------
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session?.user && deviceId) {
    try {
      const res = await fetch('/api/session/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: session.user.id,
          device_id: deviceId,
        }),
      });

      // 🚨 Seat limit hit → FORCE LOGOUT
      if (res.status === 403) {
        console.warn('Seat limit reached. Forcing logout.');

        await supabase.auth.signOut({ scope: 'local' });

        localStorage.removeItem('supabase.auth.token');
        sessionStorage.clear();

        window.location.href = '/?error=seat-limit';
      }

    } catch (err) {
      console.error('Session registration failed', err);
    }
  }
});