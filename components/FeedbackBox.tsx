import { useState } from 'react';

export default function FeedbackBox() {
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState('idle'); // idle, submitting, success, error
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async () => {
        if (message.trim().length < 5) return;

        setStatus('submitting');
        setErrorMsg('');

        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('supabase.auth.token') : null;
            // Note: Supabase auth token is usually complex object in local storage, 
            // but standard approach is to let the browser handle cookies or explicit header if we had the session object.
            // However, constraint says "No auth dependencies". 
            // If we are in restricted component, we might not have 'session' prop.
            // We can try to grab the session from localStorage if it exists, or just send without if not easily accessible.
            // Actually, standard `fetch` from client side won't automatically attach Supabase auth headers unless we explicitly do so.
            // But the requirement says "If user is authenticated: store user_id".
            // `dashboard.js` uses `useAuth`. `FeedbackBox` is used in `Home` (public) and `Dashboard` (auth).
            // I should try to read the token from localStorage if possible, to support the dashboard case without prop drilling.
            // The `supabase-js` client stores session in `supabase.auth.token` (as configured in `lib/supabaseClient.ts`).
            // It's a JSON string.

            let headers = { 'Content-Type': 'application/json' };

            try {
                const sessionStr = localStorage.getItem('supabase.auth.token');
                if (sessionStr) {
                    const session = JSON.parse(sessionStr);
                    if (session?.access_token) {
                        headers['Authorization'] = `Bearer ${session.access_token}`;
                    }
                }
            } catch (e) {
                // ignore auth parsing error
            }

            const res = await fetch('/api/feedback/submit', {
                method: 'POST',
                headers,
                body: JSON.stringify({ message }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Something went wrong');
            }

            setStatus('success');
            setMessage('');

            // Reset success message after 3 seconds to allow new feedback? 
            // Requirement says "clear textarea, show text". 
            // It doesn't say "hide text". I'll leave it.
            setTimeout(() => setStatus('idle'), 3000);

        } catch (err) {
            setStatus('error');
            setErrorMsg(err.message || 'Failed to submit');
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto mt-12 pt-8 border-t border-white/5">
            <div className="flex flex-col gap-4">
                <div className="mb-2">
                    <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-white to-indigo-300 inline-block">
                        Help Us Improve GapGens
                    </h3>
                    <p className="text-slate-500 text-xs mt-1">
                        Your feedback shapes the future of this tool.
                    </p>
                </div>
                <textarea
                    value={message}
                    onChange={(e) => {
                        setMessage(e.target.value);
                        if (status === 'error') setStatus('idle');
                    }}
                    disabled={status === 'submitting'}
                    placeholder="Share your feedback…"
                    maxLength={1000}
                    className="w-full h-24 bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-slate-300 placeholder:text-slate-600 focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all resize-none disabled:opacity-50"
                />

                <div className="flex items-center justify-between">
                    <div className="text-xs min-h-[1.5em]">
                        {status === 'error' && (
                            <span className="text-red-400 animate-pulse">{errorMsg}</span>
                        )}
                        {status === 'success' && (
                            <span className="text-emerald-400 font-medium">Thanks for the feedback 🙌</span>
                        )}
                        {status === 'idle' && message.length > 0 && (
                            <span className="text-slate-600">{message.length}/1000</span>
                        )}
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={status === 'submitting' || message.trim().length < 5}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {status === 'submitting' ? 'Sending...' : 'Submit Feedback'}
                    </button>
                </div>
            </div>
        </div>
    );
}
