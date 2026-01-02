'use client';

import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
    const router = useRouter();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.refresh();
        router.push('/');
    };

    return (
        <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-white transition-colors text-sm font-medium"
            aria-label="Sign out"
        >
            Sign Out
        </button>
    );
}
