'use client';

import { supabase, deviceId } from '@/lib/supabaseClient';

export default function LogoutButton() {
  const handleLogout = async () => {
    try {
      // 1️⃣ Revoke THIS device session in DB (best-effort)
      if (deviceId) {
        await fetch('/api/session/revoke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ device_id: deviceId }),
        });
      }

      // 2️⃣ GLOBAL Supabase logout (IMPORTANT for Safari)
      await supabase.auth.signOut({ scope: 'global' });

    } catch (err) {
      console.error('Logout error (ignored)', err);
    } finally {
      // 3️⃣ HARD RESET — Safari requires this
      localStorage.clear();
      sessionStorage.clear();

      // 4️⃣ FORCE full reload (NOT router)
      window.location.replace('/');
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="text-gray-400 hover:text-white transition-colors text-sm font-medium"
    >
      Sign Out
    </button>
  );
}