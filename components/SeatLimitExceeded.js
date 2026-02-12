'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button'; // Assuming you have a Button component
import Link from 'next/link';

export default function SeatLimitExceeded() {
    const router = useRouter();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check for ?error=seat-limit
        if (router.isReady && router.query.error === 'seat-limit') {
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    }, [router.isReady, router.query]);

    const handleClose = () => {
        // Clear the error param
        const { pathname, query } = router;
        const { error, ...restQuery } = query;

        setIsVisible(false);

        router.replace(
            { pathname, query: restQuery },
            undefined,
            { shallow: true }
        );
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-[#030014]/90 backdrop-blur-md p-4"
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="w-full max-w-md bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                    >
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto mb-6">
                                <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>

                            <h2 className="text-2xl font-display font-bold text-white mb-3">Seat limit reached</h2>

                            <p className="text-slate-300 mb-6 leading-relaxed">
                                This account is currently active on the maximum number of devices.
                            </p>

                            <div className="bg-white/5 rounded-lg p-4 mb-8 border border-white/5">
                                <p className="text-sm text-slate-400">
                                    To continue, sign out from another device or use a different account.
                                </p>
                            </div>

                            <div className="flex flex-col gap-3">
                                <Button
                                    onClick={handleClose}
                                    variant="white"
                                    className="w-full justify-center"
                                >
                                    Go back to home
                                </Button>

                                {/* Optional: Add a sign-in with another account if needed, 
                    but "Go back to home" is usually enough as it lets them use the normal login flow */}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
