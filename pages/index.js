import Head from 'next/head';
import Link from 'next/link';
import Layout from '../components/Layout';
import SeatLimitExceeded from '../components/SeatLimitExceeded';
import FeedbackBox from '../components/FeedbackBox';
import { motion } from 'framer-motion';

const ScrollReveal = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ duration: 0.5, delay, ease: "easeOut" }}
  >
    {children}
  </motion.div>
);

export default function Home() {
  return (
    <Layout bgClass="bg-[#080809]" headerVariant="dark">
      <SeatLimitExceeded />
      <Head>
        <title>GapGens - The Sovereign Architect</title>
        <meta name="description" content="Logical Authority In One Click." />
      </Head>

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-24 flex flex-col justify-center min-h-[90vh]">
        {/* Ambient Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#10B981]/5 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center z-10 w-full">
          
          <div className="font-mono text-[10px] text-slate-500 uppercase tracking-[0.2em] mb-6 border border-white/10 px-3 py-1 bg-[#111827]/50 lg:-mt-10">
            Now in Beta
          </div>

          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter text-white mb-4 leading-[0.9]">
            Logical Authority<br/>
            <span className="text-[#10B981]">In One Click.</span>
          </h1>

          <p className="font-sans text-lg md:text-xl text-slate-400 max-w-2xl mb-8 tracking-tight">
            Paste any script, video URL, or article. GapGens identifies every gap in your content and rewrites it — platform-ready, in your chosen tone, in seconds.
          </p>

          <Link href="/dashboard">
            <button className="bg-[#10B981] text-[#080809] font-bold font-mono text-sm tracking-[0.15em] px-10 py-4 uppercase shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_40px_rgba(16,185,129,0.4)] transition-all mb-20">
              Start Free Audit
            </button>
          </Link>

          {/* GAP ANALYSIS WIDGET */}
          <div className="w-full max-w-4xl bg-[#111827]/80 backdrop-blur-xl border border-white/5 p-8 text-left grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-8 relative mt-10">
            {/* Top Stitch line */}
            <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-[#10B981]/20 to-transparent"></div>
            
            {/* GAP DETECTED CARD */}
            <div className="col-span-full space-y-2">
              <div className="flex justify-between items-baseline border-b border-dashed border-white/10 pb-4 mb-6">
                <h2 className="font-display text-2xl font-bold text-white tracking-tight">GAP ANALYSIS</h2>
                <span className="font-mono text-xs text-[#10B981]">REAL_TIME // ACTIVE</span>
              </div>
              <div className="bg-[#080809] border border-white/5 p-6 flex gap-5 items-start relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#10B981]"></div>
                <div className="text-[#10B981] text-xl mt-0.5">▹</div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-mono text-[10px] text-white tracking-widest uppercase">GAP DETECTED</span>
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 border border-[#10B981]/40 text-[#10B981] bg-[#10B981]/10 uppercase tracking-widest">CRITICAL</span>
                  </div>
                  <h4 className="font-sans font-bold text-white text-base mb-2">Missing specificity on timeline</h4>
                  <p className="font-sans text-sm text-slate-400 leading-relaxed">The speaker claims results happened quickly but provides no timeframe, making the claim unverifiable and unpersuasive to the audience.</p>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* THE INTELLIGENCE ENGINE */}
      <section className="py-32 relative border-t border-dashed border-white/10 bg-[#080809]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <ScrollReveal>
             <div className="mb-16">
               <h2 className="font-display text-4xl font-bold text-white tracking-tighter">The Intelligence Engine</h2>
               <div className="font-mono text-[10px] text-slate-500 uppercase tracking-[0.2em] mt-2">SYSTEM PROCESSING ARCHITECTURE</div>
             </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
               {/* Horizontal connection line */}
               <div className="absolute top-1/2 left-0 right-0 h-[1px] border-t border-dashed border-white/10 hidden md:block z-0"></div>
               
               {/* Cards */}
               <div className="bg-[#111827] border border-white/5 p-8 shadow-xl relative z-10 w-full">
                 <div className="absolute -top-3 -left-3 w-6 h-6 bg-[#080809] border border-white/10 flex items-center justify-center font-mono text-[10px] text-slate-500">01</div>
                 <h3 className="font-bold text-white mb-6 uppercase tracking-wider text-sm">INPUT</h3>
                  <div className="bg-[#080809] border border-white/5 p-5 font-mono text-xs text-slate-400 space-y-3 h-48 overflow-hidden relative">
                    <span className="text-slate-600 block">// RAW TRANSCRIPT BLOCK 34</span>
                    <p className="leading-relaxed">"...it seems that the market direction is unclear but we might see growth in Q3 if the variables align with our internal models or..."</p>
                    <div className="text-[#0D9488] animate-pulse absolute bottom-5 left-5">_PROCESSING_CYPHER</div>
                  </div>
                  <p className="mt-5 text-sm text-slate-300 font-sans">Paste a raw transcript, drop a YouTube URL, or link a blog post. GapGens accepts any format and extracts the full content automatically.</p>
               </div>
   
               <div className="bg-[#111827] border border-white/5 p-8 shadow-xl relative z-10 w-full">
                 <div className="absolute -top-3 -left-3 w-6 h-6 bg-[#080809] border border-[#10B981]/30 text-[#10B981] flex items-center justify-center font-mono text-[10px]">02</div>
                 <h3 className="font-bold text-white mb-6 uppercase tracking-wider text-sm">AUDIT</h3>
                 <div className="space-y-3 h-48">
                   <div className="bg-[#080809] border border-white/5 p-4 flex gap-4 items-center">
                     <div className="text-[#10B981] text-xl">▹</div>
                     <div>
                       <div className="font-mono text-[10px] text-white tracking-widest mb-1">GAP DETECTED [v3]</div>
                       <div className="font-sans text-[10px] text-slate-500 leading-snug">Logical discontinuity found in Q3 growth projection.</div>
                     </div>
                   </div>
                   <div className="bg-[#080809] border border-white/5 p-4 flex gap-4 items-center opacity-70">
                     <div className="text-[#0D9488] text-xl">▹</div>
                     <div>
                       <div className="font-mono text-[10px] text-white tracking-widest mb-1">MAPPING CONTEXT</div>
                       <div className="font-sans text-[10px] text-slate-500 leading-snug">Aligning input to executive authority rules.</div>
                     </div>
                   </div>
                 </div>
                  <p className="mt-5 text-sm text-slate-300 font-sans">Every gap is identified, categorised by severity — Critical, Medium, or Minor — and described with exactly what is missing and why it matters.</p>
               </div>
   
               <div className="bg-[#111827] border border-[#10B981]/20 p-8 shadow-xl relative shadow-[#10B981]/5 z-10 w-full">
                 <div className="absolute -top-3 -left-3 w-6 h-6 bg-[#10B981] text-[#080809] flex items-center justify-center font-mono text-[10px] font-bold">03</div>
                 <h3 className="font-bold text-[#10B981] mb-6 uppercase tracking-wider text-sm">OUTPUT</h3>
                  <div className="bg-[#080809] border border-white/5 p-5 h-48 relative flex flex-col justify-between">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#10B981]"></div>
                    <div className="opacity-50">
                      <div className="font-mono text-[9px] text-slate-500 uppercase tracking-widest mb-1">ORIGINAL</div>
                      <p className="font-sans text-xs text-slate-400 leading-relaxed italic">"I niched down and income went up pretty fast."</p>
                    </div>
                    <div>
                      <div className="font-mono text-[9px] text-[#10B981] uppercase tracking-widest mb-1">GAPGENS OUTPUT</div>
                      <p className="font-sans text-xs text-white leading-relaxed">"I stopped taking every client and committed to one specific type. The income didn&apos;t creep — it moved quickly once that focus was locked in."</p>
                    </div>
                  </div>
                  <p className="mt-5 text-sm text-slate-300 font-sans">Derivative scripts generated in your chosen voice using the <span className="text-[#10B981] font-semibold">Custom Tone Selector</span> — Conversational, Authoritative, Storytelling, and more.</p>
               </div>
   
             </div>
          </ScrollReveal>

        </div>
      </section>

      {/* GLOBAL INFLUENCE */}
      <section className="py-32 relative border-t border-dashed border-white/10 bg-[#080809] overflow-hidden">
        <ScrollReveal>
          <div className="text-center mb-24">
            <h2 className="font-display text-4xl font-bold text-white tracking-tighter uppercase">Works Across Every Platform</h2>
          </div>
          
          <div className="relative w-full max-w-4xl mx-auto h-[400px] flex items-center justify-center">
            {/* Grid background */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5"></div>
            
            {/* Center Node */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
               <div className="w-40 h-40 bg-[#111827] border-[2px] border-[#10B981] shadow-[0_0_40px_rgba(16,185,129,0.15)] flex items-center justify-center font-display font-bold text-2xl tracking-widest text-white relative">
                 GAPGENS
                 <div className="absolute -bottom-6 font-mono text-[10px] text-[#10B981] tracking-[0.2em]">CORE_HUB</div>
               </div>
            </div>

            {/* Connecting Lines */}
            <div className="absolute top-1/2 left-0 right-0 h-[1px] border-t border-dashed border-white/10 z-10"></div>
            <div className="absolute top-0 bottom-0 left-1/2 w-[1px] border-l border-dashed border-white/10 z-10 -translate-x-1/2"></div>
            
            {/* Top Node */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-3">
              <div className="w-14 h-14 bg-[#080809] border border-[#10B981]/50 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.05)]">
                 <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              </div>
              <span className="font-mono text-[10px] text-[#10B981] tracking-[0.2em]">LINKEDIN</span>
            </div>

            {/* Bottom Node */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-3">
              <span className="font-mono text-[10px] text-[#10B981] tracking-[0.2em]">BLOG / WEB</span>
              <div className="w-14 h-14 bg-[#080809] border border-white/20 flex items-center justify-center">
                 <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
              </div>
            </div>

            {/* Left Node */}
            <div className="absolute top-1/2 left-8 -translate-y-1/2 z-20 flex items-center gap-4">
              <div className="w-14 h-14 bg-[#080809] border border-white/20 flex items-center justify-center">
                 <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
              </div>
              <span className="font-mono text-[10px] text-[#10B981] tracking-[0.2em] -ml-2">TWITTER</span>
            </div>

            {/* Right Node */}
            <div className="absolute top-1/2 right-8 -translate-y-1/2 z-20 flex items-center gap-4">
              <span className="font-mono text-[10px] text-[#10B981] tracking-[0.2em] -mr-2">YOUTUBE</span>
              <div className="w-14 h-14 bg-[#080809] border border-white/20 flex items-center justify-center">
                 <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </div>
            </div>
            
          </div>
          <p className="text-center font-sans text-sm text-slate-500 mt-10">
            YouTube · LinkedIn · X · Instagram · Blog — one analysis, every format, your chosen tone.
          </p>
        </ScrollReveal>
      </section>

      {/* FINAL CTA */}
      <section className="py-32 bg-[#080809] border-t border-[#10B981]/20 relative">
        <ScrollReveal>
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="border border-white/10 bg-gradient-to-b from-[#111827] to-[#080809] p-16 text-center relative overflow-hidden">
               {/* Top stitch line effect */}
               <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#10B981]/60 to-transparent"></div>
               
               <div className="font-mono text-[10px] text-[#10B981] mb-8 tracking-[0.3em]">READY FOR DEPLOYMENT</div>
               
               <h2 className="font-display text-4xl md:text-6xl font-bold text-white mb-12 tracking-tighter">
                 Analyse Your First Script Free.
               </h2>

               <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                 <Link href="/dashboard">
                   <button className="bg-[#10B981] text-[#080809] font-bold font-mono text-sm tracking-[0.15em] px-10 py-5 uppercase shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_40px_rgba(16,185,129,0.4)] transition-all">
                     Start Free Audit
                   </button>
                 </Link>
                 <Link href="/dashboard">
                   <button className="bg-transparent border border-white/20 text-white font-bold font-mono text-sm tracking-[0.15em] px-10 py-5 uppercase hover:bg-white/5 transition-all">
                     See a Sample Analysis
                   </button>
                 </Link>
               </div>

               <div className="mt-12 font-mono text-[10px] text-slate-500 uppercase flex items-center justify-center gap-3">
                 <span className="w-1.5 h-1.5 bg-[#10B981] rounded-none animate-pulse-soft"></span>
                 No account needed to start. First analysis is free.
               </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

    </Layout>
  );
}
