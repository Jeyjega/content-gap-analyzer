'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallbackPage() {
    const router = useRouter();
    const [errorObj, setErrorObj] = useState<{ message: string; description?: string } | null>(null);

    useEffect(() => {
        // 1. Check for errors in the URL (search OR hash) immediately
        const params = new URLSearchParams(window.location.search);
        let errorParam = params.get('error');
        let errorDesc = params.get('error_description');

        // Also check hash params if not found in search (Supabase often returns errors in hash)
        if (!errorParam && window.location.hash) {
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            errorParam = hashParams.get('error');
            errorDesc = hashParams.get('error_description');
        }

        if (errorParam) {
            console.error('Auth Error from URL:', errorParam, errorDesc);
            setErrorObj({ message: errorParam, description: errorDesc?.replace(/\+/g, ' ') || undefined });
            const timer = setTimeout(() => router.replace('/login'), 4000);
            return () => clearTimeout(timer);
        }

        // 2. Handle session confirmation
        let mounted = true;

        async function handleAuth() {
            // First, check if we already have a session
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError) {
                if (mounted) {
                    console.error('Session retrieval error:', sessionError);
                    setErrorObj({ message: 'Session Error', description: sessionError.message });
                    setTimeout(() => router.replace('/login'), 3000);
                }
                return;
            }

            // Helper to get redirect URL
            const getRedirectUrl = () => {
                const params = new URLSearchParams(window.location.search);

                // Explicitly check for recovery flow type
                const type = params.get('type');
                if (type === 'recovery') {
                    console.log('Recovery flow detected via URL params');
                    return '/auth/reset-password';
                }

                const nextParam = params.get('next');
                if (nextParam) return nextParam;

                // Check hash if needed (though usually next is a query param)
                if (window.location.hash) {
                    const hashParams = new URLSearchParams(window.location.hash.substring(1));
                    const nextHash = hashParams.get('next');
                    if (nextHash) return nextHash;

                    // Also check type in hash
                    const typeHash = hashParams.get('type');
                    if (typeHash === 'recovery') {
                        console.log('Recovery flow detected via Hash params');
                        return '/auth/reset-password';
                    }
                }

                return '/dashboard';
            };

            const targetUrl = getRedirectUrl();

            if (session) {
                if (mounted) {
                    // Check for recovery type in session context too
                    const params = new URLSearchParams(window.location.search);
                    if (params.get('type') === 'recovery') {
                        console.log('Session found with recovery type, forcing reset page');
                        router.replace('/auth/reset-password');
                        return;
                    }

                    console.log(`Session found, redirecting to ${targetUrl}`);
                    router.replace(targetUrl);
                }
                return;
            }

            // If no session yet, listen mainly for the SIGNED_IN event which usually fires after token exchange
            const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                console.log('Auth state change:', event);
                if (event === 'SIGNED_IN' && session) {
                    if (mounted) router.replace(targetUrl);
                } else if (event === 'SIGNED_OUT') {
                    if (mounted) router.replace('/login');
                } else if (event === 'PASSWORD_RECOVERY') {
                    // Special event for password reset - FORCE reset password page
                    console.log('PASSWORD_RECOVERY event detected in callback');
                    if (mounted) router.replace('/auth/reset-password');
                }
            });

            return () => {
                subscription.unsubscribe();
            };
        }

        handleAuth();

        return () => {
            mounted = false;
        };
    }, [router]);

    if (errorObj) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#030014]">
                <div className="text-center max-w-md px-4">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Authentication Failed</h2>
                    <p className="text-red-300 mb-1">{errorObj.message}</p>
                    {errorObj.description && <p className="text-slate-500 text-sm mb-6">{errorObj.description}</p>}
                    <p className="text-slate-500 text-sm animate-pulse">Redirecting to login...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#030014]">
            <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-400 text-lg animate-pulse">
                    Finalizing authentication...
                </p>
            </div>
        </div>
    );
}