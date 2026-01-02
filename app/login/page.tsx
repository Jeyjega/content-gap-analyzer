import LoginButton from '@/components/LoginButton';
import EmailAuthForm from '@/components/EmailAuthForm';

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#030014] relative overflow-hidden selection:bg-indigo-500/30">

            {/* Dynamic Background Elements */}
            <div className="absolute inset-0 w-full h-full pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse-soft opacity-60"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-[120px] animate-pulse-soft delay-1000 opacity-60"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('/grid.svg')] opacity-[0.03]"></div>
            </div>

            <div className="w-full max-w-[420px] mx-4 relative z-10 animate-scale-in py-10">
                {/* Main Card */}
                <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/40 ring-1 ring-white/5">

                    {/* Header Section */}
                    <div className="text-center mb-8">
                        <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-indigo-500/25 mx-auto mb-6 transform group-hover:scale-105 transition-transform duration-300">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-display font-medium text-white mb-2 tracking-tight">
                            Welcome back
                        </h1>
                        <p className="text-slate-400 text-[15px] leading-relaxed max-w-[280px] mx-auto">
                            Sign in to your account
                        </p>
                    </div>

                    {/* Action Section */}
                    <div className="space-y-6">
                        <LoginButton />

                        <div className="relative flex items-center py-2">
                            <div className="flex-grow border-t border-white/10"></div>
                            <span className="flex-shrink-0 mx-4 text-xs text-slate-500 font-medium uppercase tracking-wider">Or continue with</span>
                            <div className="flex-grow border-t border-white/10"></div>
                        </div>

                        <EmailAuthForm />

                        {/* Security Note */}
                        <div className="flex items-center justify-center gap-2 text-xs text-slate-500 pt-4">
                            <svg className="w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <span>Bank-level encryption. Your data is private.</span>
                        </div>
                    </div>

                    {/* Footer Terms */}
                    <div className="mt-8 pt-6 border-t border-white/5 text-center">
                        <p className="text-xs text-slate-500 leading-normal">
                            By continuing, you acknowledge that you have read and understood our{' '}
                            <a href="#" className="text-slate-400 hover:text-white hover:underline transition-colors">Terms of Service</a>
                            {' '}and{' '}
                            <a href="#" className="text-slate-400 hover:text-white hover:underline transition-colors">Privacy Policy</a>.
                        </p>
                    </div>
                </div>

                {/* Floating Brand Label */}
                <div className="mt-8 text-center">
                    <p className="text-sm font-medium text-white/20 tracking-widest uppercase text-[10px]">
                        Powered by ContentGap AI
                    </p>
                </div>
            </div>
        </div>
    );
}
