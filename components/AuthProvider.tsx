'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    isRecoveryMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [isRecoveryMode, setIsRecoveryMode] = useState(false);

    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Initialize state from storage to prevent flash
        const isRecoveryPending = typeof window !== 'undefined' && sessionStorage.getItem('supabase-auth-recovery') === 'true';
        setIsRecoveryMode(isRecoveryPending);

        // 1. Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // 2. Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth event:', event);

            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);

            if (event === 'PASSWORD_RECOVERY') {
                setIsRecoveryMode(true);
                sessionStorage.setItem('supabase-auth-recovery', 'true');
            } else if (event === 'SIGNED_OUT') {
                setIsRecoveryMode(false);
                sessionStorage.removeItem('supabase-auth-recovery');
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // 3. Route Protection Logic
    useEffect(() => {
        if (!loading && isRecoveryMode && session) {
            // Allow access only to reset-password page or public assets/api
            const isAllowedPath = pathname === '/auth/reset-password' || pathname?.startsWith('/api');

            if (!isAllowedPath) {
                console.log('Recovery mode active: redirecting to reset-password');
                router.replace('/auth/reset-password');
            }
        }
    }, [loading, isRecoveryMode, session, pathname, router]);

    return (
        <AuthContext.Provider value={{ user, session, loading, isRecoveryMode }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
