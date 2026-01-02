import Head from 'next/head';
import Link from 'next/link';
import Layout from '../components/Layout';
import Button from '../components/Button';
import Card from '../components/Card';
import HeroVisual from '../components/HeroVisual';
import { motion } from 'framer-motion';

const ScrollReveal = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ duration: 0.25, delay, ease: "easeOut" }}
  >
    {children}
  </motion.div>
);

export default function Home() {
  return (
    <Layout bgClass="bg-[#030014]" headerVariant="dark">
      <Head>
        <title>ContentGap Analyzer - Optimize Your Content Strategy</title>
        <meta name="description" content="Analyze YouTube videos to find content gaps and generate optimized scripts." />
      </Head>

      {/* Hero Section */}
      <section className="relative pt-32 pb-32 overflow-hidden min-h-screen flex flex-col justify-center">
        {/* Deep Dark Background Elements */}
        <div className="absolute inset-0 bg-[#030014] pointer-events-none"></div>
        <div className="absolute top-0 left-0 w-full h-[800px] bg-gradient-to-b from-indigo-900/20 via-[#030014] to-[#030014] pointer-events-none"></div>
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-indigo-600/20 blur-[150px] rounded-full pointer-events-none mix-blend-screen opacity-60"></div>
        <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] bg-violet-600/10 blur-[120px] rounded-full pointer-events-none mix-blend-screen"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center z-10">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-indigo-300 text-xs font-medium mb-10 backdrop-blur-md shadow-lg shadow-indigo-500/10 animate-fade-in hover:border-white/20 transition-colors cursor-default">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
            </span>
            <span className="tracking-wide uppercase">AI-Powered Analysis v2.0</span>
          </div>

          {/* Headline */}
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white mb-8 max-w-5xl leading-[1.05] animate-slide-up drop-shadow-2xl">
            Turn YouTube Videos into <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-400 animate-shimmer bg-[length:200%_auto]">
              Content Gold
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed animate-slide-up font-light" style={{ animationDelay: '0.1s' }}>
            Data-driven content strategy. Analyze any video to reveal missing topics, unanswered questions, and high-value opportunities.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center gap-4 w-full animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex flex-col sm:flex-row gap-5 w-full justify-center">
              <Link href="/dashboard">
                <Button size="xl" variant="gradient" className="w-full sm:w-auto shadow-2xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:-translate-y-0.5 transition-all duration-300 border border-white/10 font-bold min-w-[200px]">
                  Start Analyzing Free
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="outline" size="xl" className="w-full sm:w-auto bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white hover:border-white/20 backdrop-blur-sm min-w-[200px]">
                  How It Works
                </Button>
              </Link>
            </div>
            <p className="text-xs text-slate-500 font-medium tracking-wide uppercase opacity-70">
              No credit card required · Instant results
            </p>
          </div>

          {/* Hero Visual Card */}
          <div className="mt-24 w-full animate-scale-in perspective-1000" style={{ animationDelay: '0.3s' }}>
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl shadow-indigo-500/10 group">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 via-transparent to-violet-500/10 opacity-50 pointer-events-none"></div>
              <div className="p-4 md:p-6 lg:p-10">
                <HeroVisual />
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* How It Works Section */}
      <section className="py-32 relative overflow-hidden bg-[#030014]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/10 via-[#030014] to-[#030014] pointer-events-none"></div>

        <ScrollReveal>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-20">
              <h2 className="font-display text-3xl md:text-5xl font-bold text-white mb-6">Master Your Strategy</h2>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto">From raw video URL to actionable content plan in three steps.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* Connecting line for desktop */}
              <div className="hidden md:block absolute top-16 left-[16%] right-[16%] h-px bg-gradient-to-r from-indigo-500/0 via-indigo-500/30 to-indigo-500/0 z-0"></div>

              {/* Step 1 */}
              <div className="relative z-10 group">
                <div className="bg-white/5 p-8 rounded-3xl border border-white/5 shadow-2xl shadow-black/20 hover:shadow-indigo-500/10 hover:border-indigo-500/30 hover:-translate-y-2 transition-all duration-500 text-center h-full backdrop-blur-lg overflow-hidden">
                  <div className="w-20 h-20 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-8 text-indigo-400 shadow-inner border border-white/5 group-hover:scale-110 group-hover:from-indigo-900 group-hover:to-slate-900 transition-all duration-500">
                    <span className="text-3xl filter drop-shadow-lg">🔗</span>
                  </div>
                  <h3 className="text-xl font-display font-bold text-white mb-3">1. Add video URL</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">Paste the link of any high-performing YouTube video in your niche.</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative z-10 group">
                <div className="bg-white/5 p-8 rounded-3xl border border-white/5 shadow-2xl shadow-black/20 hover:shadow-indigo-500/10 hover:border-indigo-500/30 hover:-translate-y-2 transition-all duration-500 text-center h-full backdrop-blur-lg overflow-hidden">
                  <div className="w-20 h-20 bg-gradient-to-br from-indigo-900/50 to-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-8 text-indigo-400 shadow-inner border border-indigo-500/20 group-hover:scale-110 group-hover:border-indigo-500/40 transition-all duration-500 relative overflow-hidden">
                    <div className="absolute inset-0 bg-indigo-500/20 animate-pulse-soft"></div>
                    <span className="text-3xl filter drop-shadow-lg relative z-10">⚡️</span>
                  </div>
                  <h3 className="text-xl font-display font-bold text-white mb-3">2. Instant Analysis</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">AI dissects the visual and verbal content to find what's missing.</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative z-10 group">
                <div className="bg-white/5 p-8 rounded-3xl border border-white/5 shadow-2xl shadow-black/20 hover:shadow-indigo-500/10 hover:border-indigo-500/30 hover:-translate-y-2 transition-all duration-500 text-center h-full backdrop-blur-lg overflow-hidden">
                  <div className="w-20 h-20 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-8 text-indigo-400 shadow-inner border border-white/5 group-hover:scale-110 group-hover:from-indigo-900 group-hover:to-slate-900 transition-all duration-500">
                    <span className="text-3xl filter drop-shadow-lg">🎯</span>
                  </div>
                  <h3 className="text-xl font-display font-bold text-white mb-3">3. Generate Script</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">Get a perfectly structured script that fills the gaps and outperforms.</p>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 bg-[#030014] relative border-t border-white/5">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/5 blur-[100px] rounded-full pointer-events-none"></div>

        <ScrollReveal>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-20">
              <h2 className="font-display text-3xl md:text-5xl font-bold text-white mb-6">Everything included</h2>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
                Professional tools designed for serious content creators.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FeatureCard
                icon={<BoltIcon />}
                title="Instant Transcription"
                description="Get accurate transcripts from any YouTube video in seconds. No more manual typing or expensive services."
                delay="0s"
              />
              <FeatureCard
                icon={<ChartIcon />}
                title="Gap Analysis"
                description="Identify missing topics, unanswered questions, and opportunities to provide more value than your competitors."
                delay="0.1s"
              />
              <FeatureCard
                icon={<SparklesIcon />}
                title="AI Script Gen"
                description="Automatically generate optimized video scripts based on identified gaps and best practices."
                delay="0.2s"
              />
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* Proof & Preview Section */}
      <section className="py-32 bg-[#05051a] relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/10 blur-[100px] rounded-full"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-violet-600/10 blur-[100px] rounded-full"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

          {/* Early Access Proof */}
          <ScrollReveal>
            <div className="text-center mb-16">
              <div className="inline-flex flex-col items-center gap-4 mb-4">
                <div className="flex items-center gap-6 text-slate-500 text-2xl opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                  <span title="Video Creators">🎥</span>
                  <span title="Bloggers">📝</span>
                  <span title="Growth Hackers">🚀</span>
                </div>
                <p className="text-indigo-200/80 font-medium text-xl tracking-tight">
                  Trusted by creators in education, tech, and business.
                </p>
              </div>
            </div>
          </ScrollReveal>

          {/* Dashboard Preview */}
          <ScrollReveal delay={0.2}>
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                Powerful Analytics
              </h2>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                A clean, distraction-free environment for deep content work.
              </p>
            </div>

            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-[#0f172a]/80 backdrop-blur-sm group hover:border-indigo-500/30 transition-all duration-700">
              {/* Improved Product Mockup */}
              <div className="w-full bg-[#0f172a] flex items-center justify-center relative overflow-hidden">
                <div className="w-full aspect-video p-4 md:p-8 flex items-center justify-center">
                  <div className="w-full h-full max-w-5xl bg-[#030014] rounded-xl border border-white/10 shadow-2xl flex overflow-hidden">
                    {/* Sidebar Mock */}
                    <div className="w-64 bg-slate-900/50 border-r border-white/5 p-4 hidden md:flex flex-col gap-4">
                      <div className="h-6 w-32 bg-slate-800/50 rounded mb-4"></div>
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-10 w-full bg-slate-800/30 rounded flex items-center px-3 gap-3">
                          <div className="w-6 h-6 rounded bg-slate-700/50"></div>
                          <div className="w-16 h-2 rounded bg-slate-700/50"></div>
                        </div>
                      ))}
                    </div>

                    {/* Main Content Mock */}
                    <div className="flex-1 p-6 flex flex-col gap-6">
                      {/* Video Bar */}
                      <div className="flex items-center gap-4 bg-slate-900/80 p-3 rounded-lg border border-white/5">
                        <div className="w-16 h-9 bg-indigo-500/20 rounded flex items-center justify-center text-indigo-400">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                        </div>
                        <div className="flex-1 hidden sm:block">
                          <div className="h-2.5 w-48 bg-slate-700/50 rounded mb-2"></div>
                          <div className="h-2 w-24 bg-slate-800 rounded"></div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
                        {/* Transcription snippet */}
                        <div className="space-y-3">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Transcript Analysis</div>
                          {[1, 2, 3].map(i => (
                            <div key={i} className="flex gap-3">
                              <span className="text-[10px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded h-fit font-mono shrink-0">0{i}:2{i}</span>
                              <div className={`h-2 bg-slate-700/30 rounded w-${i === 1 ? 'full' : i === 2 ? '4/5' : '3/4'}`}></div>
                            </div>
                          ))}
                        </div>

                        {/* Gap Cards */}
                        <div className="space-y-3">
                          <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider mb-1">Identified Gaps</div>
                          {/* Gap Card 1 */}
                          <div className="bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 border border-indigo-500/20 p-3 rounded-lg shadow-sm">
                            <div className="flex justify-between items-start mb-1.5">
                              <span className="text-[11px] font-bold text-indigo-200">Gap #1: Structure</span>
                              <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-200 text-[9px] rounded font-medium shadow-sm border border-indigo-500/20">Critical</span>
                            </div>
                            <p className="text-[10px] text-indigo-200/60 leading-relaxed mb-2">Add a clearer framework to guide viewers.</p>
                            <div className="h-1.5 w-11/12 bg-indigo-500/20 rounded mb-1"></div>
                          </div>

                          {/* Gap Card 2 */}
                          <div className="bg-slate-800/40 border border-white/5 p-3 rounded-lg opacity-60">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-[11px] font-bold text-slate-400">Gap #2: Detail</span>
                            </div>
                            <div className="h-1.5 w-5/6 bg-slate-700/50 rounded"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent pointer-events-none opacity-40"></div>
              </div>
            </div>
          </ScrollReveal>

        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-[#030014]"></div>
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full"></div>

        <ScrollReveal>
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="font-display text-4xl md:text-6xl font-bold text-white mb-8 tracking-tight">Ready to start?</h2>
            <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto">
              Join thousands of creators who are using data to build their audience faster.
            </p>
            <Link href="/dashboard">
              <Button variant="white" size="xl" className="shadow-2xl shadow-indigo-500/20 bg-white text-slate-900 hover:bg-indigo-50 transition-all duration-300 font-bold px-10 py-5 text-lg">
                Get Started for Free
              </Button>
            </Link>
          </div>
        </ScrollReveal>
      </section>
    </Layout >
  );
}

function FeatureCard({ icon, title, description, delay }) {
  return (
    <Card
      className="p-8 h-full flex flex-col items-start text-left bg-white/5 border-white/5 hover:border-indigo-500/30 hover:bg-white/10 backdrop-blur-lg group transition-all duration-300"
      style={{ animationDelay: delay }}
    >
      <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300 shadow-inner border border-white/5">
        {icon}
      </div>
      <h3 className="text-xl font-display font-bold text-white mb-3 tracking-tight">{title}</h3>
      <p className="text-slate-400 leading-relaxed font-light">{description}</p>
    </Card>
  );
}

function BoltIcon() {
  return (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}
