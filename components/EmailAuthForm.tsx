'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function EmailAuthForm() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (isForgotPassword) {
                const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                    redirectTo: `${window.location.origin}/auth/callback`,
                });
                if (error) throw error;
                setMessage('Check your email for the password reset link.');
            } else if (isSignUp) {
                const { data, error } = await supabase.auth.signUp({
                    email: email.trim(),
                    password: password.trim(),
                });
                if (error) throw error;

                if (data.session) {
                    // User is logged in immediately
                    console.log('SignUp: Session found immediately, redirecting');
                    router.push('/');
                    router.refresh();
                } else if (data.user && data.user.identities && data.user.identities.length === 0) {
                    // User already exists, try signing in
                    console.log('SignUp: User exists, attempting login');
                    const { error: signInError, data: signInData } = await supabase.auth.signInWithPassword({
                        email: email.trim(),
                        password: password.trim(),
                    });
                    if (signInError) throw signInError;
                    console.log('SignUp: Login successful', signInData);
                    router.push('/');
                    router.refresh();
                } else {
                    // If no session, try signing in manually just in case (for some Supabase configs)
                    console.log('SignUp: No session, attempting manual login');
                    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                        email: email.trim(),
                        password: password.trim(),
                    });
                    if (!signInError && signInData.session) {
                        console.log('SignUp: Manual login successful');
                        router.push('/');
                        router.refresh();
                    } else {
                        console.log('SignUp: Manual login failed or no session', signInError);
                        setMessage('Check your email to confirm your account.');
                    }
                }
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email: email.trim(),
                    password: password.trim(),
                });
                if (error) throw error;
                router.push('/');
                router.refresh();
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full space-y-4">
            {isForgotPassword ? (
                // --- FORGOT PASSWORD FORM ---
                <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
                            Email address
                        </label>
                        <input
                            id="email"
                            type="email"
                            name="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                            className="w-full px-4 py-3 rounded-none bg-[#080809] border border-white/10 text-white font-mono text-sm placeholder-slate-500 focus:outline-none focus:border-[#10B981] focus:ring-0 transition-all shadow-inner"
                            placeholder="name@company.com"
                        />
                    </div>
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-none text-xs font-mono text-red-400 uppercase tracking-widest">
                            {error}
                        </div>
                    )}
                    {message && (
                        <div className="p-3 bg-green-500/10 border border-green-500/50 rounded-none text-xs font-mono text-green-400 uppercase tracking-widest">
                            {message}
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-[#10B981] text-[#080809] hover:bg-[#059669] font-mono text-xs uppercase tracking-widest py-3 px-6 rounded-none transition-all duration-200 shadow-none border border-[#10B981] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-[#080809]/30 border-t-[#080809] rounded-none animate-spin" />
                        ) : (
                            'Send Reset Instructions'
                        )}
                    </button>
                    <div className="text-center pt-2">
                        <button
                            type="button"
                            onClick={() => {
                                setIsForgotPassword(false);
                                setError(null);
                                setMessage(null);
                            }}
                            className="text-sm text-slate-400 hover:text-white transition-colors"
                        >
                            Back to Sign In
                        </button>
                    </div>
                </form>
            ) : (
                // --- LOGIN / SIGNUP FORM ---
                <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">
                            Email address
                        </label>
                        <input
                            id="email"
                            type="email"
                            name="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                            className="w-full px-4 py-3 rounded-none bg-[#080809] border border-white/10 text-white font-mono text-sm placeholder-slate-500 focus:outline-none focus:border-[#10B981] focus:ring-0 transition-all shadow-inner"
                            placeholder="name@company.com"
                        />
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                                Password
                            </label>
                            {!isSignUp && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsForgotPassword(true);
                                        setError(null);
                                        setMessage(null);
                                    }}
                                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                                >
                                    Forgot password?
                                </button>
                            )}
                        </div>
                        <input
                            id="password"
                            type="password"
                            name="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            autoComplete={isSignUp ? "new-password" : "current-password"}
                            className="w-full px-4 py-3 rounded-none bg-[#080809] border border-white/10 text-white font-mono text-sm placeholder-slate-500 focus:outline-none focus:border-[#10B981] focus:ring-0 transition-all shadow-inner"
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-none text-xs font-mono text-red-400 uppercase tracking-widest">
                            {error}
                        </div>
                    )}

                    {message && (
                        <div className="p-3 bg-green-500/10 border border-green-500/50 rounded-none text-xs font-mono text-green-400 uppercase tracking-widest">
                            {message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-[#10B981] text-[#080809] hover:bg-[#059669] font-mono text-xs uppercase tracking-widest py-3 px-6 rounded-none transition-all duration-200 shadow-none border border-[#10B981] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-[#080809]/30 border-t-[#080809] rounded-none animate-spin" />
                        ) : (
                            isSignUp ? 'Create Account' : 'Sign In'
                        )}
                    </button>
                    <div className="text-center pt-2">
                        <button
                            type="button"
                            onClick={() => {
                                setIsSignUp(!isSignUp);
                                setError(null);
                                setMessage(null);
                            }}
                            className="text-sm text-slate-400 hover:text-white transition-colors"
                        >
                            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
