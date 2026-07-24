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
// DEVICE FINGERPRINT (FRAUD PREVENTION)
// -----------------------------
export function getDeviceFingerprint(): string {
  if (typeof window === 'undefined') return '';

  const KEY = 'gapgens_device_fp';
  const cached = localStorage.getItem(KEY);
  if (cached) return cached;

  let canvasData = '';
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.width = 200;
      canvas.height = 30;
      ctx.textBaseline = 'top';
      ctx.font = "14px 'Arial'";
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('GapGensDeviceFp', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('GapGensDeviceFp', 4, 17);
      canvasData = canvas.toDataURL();
    }
  } catch (e) {
    // Canvas reading might be blocked/restricted
  }

  const components = [
    navigator.userAgent,
    navigator.language,
    screen.colorDepth,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || '',
    (navigator as any).deviceMemory || '',
    canvasData
  ].join('|');

  // Simple and fast string hashing
  let hash = 0;
  for (let i = 0; i < components.length; i++) {
    const char = components.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }

  const fingerprint = 'fp-' + Math.abs(hash).toString(16);
  localStorage.setItem(KEY, fingerprint);
  return fingerprint;
}


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