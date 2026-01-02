import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function HeroVisual() {
    const [step, setStep] = useState(0);

    // Cycle through steps to simulate the process
    useEffect(() => {
        const interval = setInterval(() => {
            setStep((prev) => (prev + 1) % 4);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative w-full max-w-6xl mx-auto h-[500px] flex items-center justify-center perspective-1000">
            {/* Ambient Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 blur-[100px] rounded-full pointer-events-none" />

            {/* Main Container */}
            <div className="relative w-full h-full flex items-center justify-between px-4 md:px-12">

                {/* LEFT: Source (Video) */}
                <SourceCard />

                {/* CENTER: AI Processing Core */}
                <AICore />

                {/* RIGHT: Output (Script) */}
                <OutputCard />

            </div>

            {/* Connecting Beams */}
            <ConnectionBeams />
        </div>
    );
}

function SourceCard() {
    return (
        <motion.div
            initial={{ opacity: 0, x: -50, rotateY: -15 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            whileHover={{ scale: 1.02, rotateY: 5, rotateX: 5 }}
            className="relative w-[300px] h-[220px] bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden z-10"
        >
            {/* Browser Header */}
            <div className="h-8 bg-black/5 border-b border-white/10 flex items-center px-3 gap-2">
                <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-400/80" />
                    <div className="w-2 h-2 rounded-full bg-amber-400/80" />
                    <div className="w-2 h-2 rounded-full bg-green-400/80" />
                </div>
                <div className="flex-1 h-4 bg-white/10 rounded-full ml-2" />
            </div>

            {/* Video Content */}
            <div className="relative p-4 flex flex-col items-center justify-center h-[calc(100%-32px)]">
                <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="w-12 h-12 rounded-full bg-red-500/80 flex items-center justify-center shadow-lg shadow-red-500/30"
                >
                    <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                </motion.div>

                {/* Floating Elements */}
                <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                    className="absolute top-12 right-8 w-16 h-2 bg-white/20 rounded-full"
                />
                <motion.div
                    animate={{ y: [0, 5, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, delay: 0.2 }}
                    className="absolute bottom-12 left-8 w-20 h-2 bg-white/20 rounded-full"
                />
            </div>

            {/* Scan Line */}
            <motion.div
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute left-0 right-0 h-[1px] bg-indigo-400/50 shadow-[0_0_15px_rgba(99,102,241,0.8)] z-20"
            />
        </motion.div>
    );
}

function AICore() {
    return (
        <div className="relative w-32 h-32 flex items-center justify-center z-20">
            {/* Outer Rings */}
            {[1, 2, 3].map((i) => (
                <motion.div
                    key={i}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10 + i * 5, repeat: Infinity, ease: "linear" }}
                    className={`absolute inset-0 border border-indigo-500/${30 - i * 5} rounded-full`}
                    style={{ padding: i * 8 }}
                />
            ))}

            {/* Core Orb */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    boxShadow: [
                        "0 0 20px rgba(99, 102, 241, 0.3)",
                        "0 0 50px rgba(99, 102, 241, 0.6)",
                        "0 0 20px rgba(99, 102, 241, 0.3)"
                    ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center z-10"
            >
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            </motion.div>
        </div>
    );
}

function OutputCard() {
    const lines = [
        { width: "80%", color: "bg-slate-800" },
        { width: "100%", color: "bg-slate-200" },
        { width: "90%", color: "bg-slate-200" },
        { width: "70%", color: "bg-slate-200" },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, x: 50, rotateY: 15 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            whileHover={{ scale: 1.02, rotateY: -5, rotateX: 5 }}
            className="relative w-[300px] h-[380px] bg-white/90 backdrop-blur-xl border border-white/50 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden z-10 flex flex-col"
        >
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white/50">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center text-white">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </div>
                    <span className="text-xs font-bold text-slate-700">Generated Script</span>
                </div>
                <div className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">AI</div>
            </div>

            {/* Content */}
            <div className="p-5 space-y-6 flex-1">
                {[0, 1, 2].map((groupIndex) => (
                    <motion.div
                        key={groupIndex}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + groupIndex * 0.3 }}
                        className="space-y-2"
                    >
                        <div className="flex gap-2 mb-1">
                            <div className="w-8 text-[10px] font-mono text-slate-400">00:{groupIndex * 15}</div>
                        </div>
                        {lines.map((line, i) => (
                            <motion.div
                                key={i}
                                initial={{ width: 0 }}
                                animate={{ width: line.width }}
                                transition={{ duration: 0.5, delay: 0.8 + groupIndex * 0.3 + i * 0.1 }}
                                className={`h-2 rounded ${line.color} ${i === 0 ? 'opacity-80' : 'opacity-40'}`}
                            />
                        ))}
                    </motion.div>
                ))}
            </div>

            {/* Floating Badge */}
            <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-4 right-4 bg-green-50 text-green-600 px-3 py-1 rounded-full text-xs font-bold border border-green-100 shadow-sm"
            >
                Optimized
            </motion.div>
        </motion.div>
    );
}

function ConnectionBeams() {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Left to Center */}
            <svg className="absolute top-0 left-0 w-full h-full">
                <motion.path
                    d="M 120 200 Q 160 200 200 200"
                    stroke="url(#gradient-left)"
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray="4 4"
                    animate={{ strokeDashoffset: [0, -20] }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <defs>
                    <linearGradient id="gradient-left" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="1" />
                    </linearGradient>
                </defs>
            </svg>

            {/* Center to Right */}
            <svg className="absolute top-0 left-0 w-full h-full">
                <motion.path
                    d="M 200 200 Q 240 200 280 200"
                    stroke="url(#gradient-right)"
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray="4 4"
                    animate={{ strokeDashoffset: [0, -20] }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <defs>
                    <linearGradient id="gradient-right" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="1" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                    </linearGradient>
                </defs>
            </svg>
        </div>
    );
}
