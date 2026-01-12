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
    transition={{ duration: 0.5, delay, ease: "easeOut" }}
  >
    {children}
  </motion.div>
);

export default function Home() {
  return (
    <Layout bgClass="bg-[#030014]" headerVariant="dark">
      <Head>
        <title>GapGens - Turn Content into High-Impact Scripts</title>
        <meta name="description" content="GapGens analyzes your content, identifies what’s missing, and produces grounded derivative scripts — without hallucination or fluff." />
      </Head>

      {/* 1. HERO SECTION */}
      <section className="relative pt-32 pb-24 overflow-hidden flex flex-col justify-center">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-[#030014] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[url('/assets/network-bg.png')] bg-cover bg-center opacity-30 mix-blend-screen pointer-events-none"></div>
        <div className="absolute top-0 left-0 w-full h-[800px] bg-gradient-to-b from-indigo-950/50 via-[#030014]/80 to-[#030014] pointer-events-none"></div>
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center z-10">

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-indigo-300 text-xs font-medium mb-8 backdrop-blur-md animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            <span className="tracking-wide uppercase">Analysis-First Content Engine</span>
          </div>

          <h1 className="font-display text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight text-white mb-6 max-w-4xl leading-[1.1] animate-slide-up">
            Turn Existing Content into <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-white to-indigo-300">
              Platform-Ready, High-Impact Scripts
            </span>
          </h1>

          <p className="font-display text-xl md:text-2xl font-medium text-white mb-6 tracking-tight animate-slide-up" style={{ animationDelay: '0.05s' }}>
            1 script → YouTube + Blog + LinkedIn + Twitter
          </p>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed animate-slide-up font-light" style={{ animationDelay: '0.1s' }}>
            Analyze once. Adapt everywhere.<br className="hidden md:block" />
            GapGens identifies what your content is missing — then generates transcript-grounded scripts tailored for YouTube, Blogs, LinkedIn, or X.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 w-full justify-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <Link href="/dashboard">
              <Button size="xl" variant="gradient" className="w-full sm:w-auto shadow-xl shadow-indigo-900/20 hover:shadow-indigo-500/30 transition-all font-semibold min-w-[200px]">
                Get Started Free – Analyze a URL
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button variant="outline" size="xl" className="w-full sm:w-auto bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm min-w-[180px]">
                Watch Product Demo
              </Button>
            </Link>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="flex -space-x-2">
              <div className="w-6 h-6 rounded-full bg-indigo-500 border-2 border-[#030014]"></div>
              <div className="w-6 h-6 rounded-full bg-violet-500 border-2 border-[#030014]"></div>
              <div className="w-6 h-6 rounded-full bg-white border-2 border-[#030014]"></div>
            </div>
            <span className="text-sm font-medium text-white">50+ creators generating daily</span>
          </div>

          <p className="mt-4 text-xs text-slate-500 font-medium tracking-wide animate-fade-in" style={{ animationDelay: '0.4s' }}>
            No hallucinations. Transcript-grounded. Platform-aware.
          </p>

          {/* Hero Visual: Transcript -> Gaps -> Script */}
          {/* Hero Visual: Video Demo */}
          <div className="mt-16 w-full max-w-[900px] mx-auto animate-scale-in perspective-1000">
            <div className="relative rounded-2xl border border-white/10 bg-[#0f172a]/40 backdrop-blur-md shadow-2xl shadow-indigo-500/10 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 via-transparent to-violet-500/5 opacity-50 pointer-events-none z-10"></div>

              <video
                className="w-full h-auto object-cover relative z-0 scale-[1.03]"
                autoPlay
                muted
                loop
                playsInline
                poster="/assets/hero-process.png"
              >
                <source src="/videos/gapgens-demo.webm" type="video/webm" />
                <source src="/videos/gapgens-demo.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </div>
      </section>

      {/* 1.5. FEATURE PREVIEW SECTION */}
      <section className="py-20 bg-[#030014] border-t border-white/5 relative z-20">
        <ScrollReveal>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl bg-gradient-to-br from-indigo-900/20 to-violet-900/10 border border-indigo-500/20 p-8 md:p-12 flex flex-col md:flex-row items-center gap-10 md:gap-16">

              {/* Text Side */}
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-6">
                  One Analysis. Multiple Platforms.
                </h2>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3 text-slate-300">
                    <span className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0 mt-0.5">✓</span>
                    <span>Analyze your content once</span>
                  </li>
                  <li className="flex items-start gap-3 text-slate-300">
                    <span className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0 mt-0.5">✓</span>
                    <span>Choose where you’ll publish: <strong>YouTube, Blog, LinkedIn, or X</strong></span>
                  </li>
                  <li className="flex items-start gap-3 text-slate-300">
                    <span className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0 mt-0.5">✓</span>
                    <span>Instantly regenerate scripts per platform — no re-analysis required</span>
                  </li>
                </ul>
                <div className="inline-block px-4 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium">
                  Same insights. Different delivery.
                </div>
              </div>

              {/* Visual Side (Mockup) */}
              <div className="flex-1 w-full max-w-sm">
                <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-[#0b0c15] border border-white/10 shadow-2xl skew-y-[-2deg] hover:skew-y-0 transition-transform duration-500">
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex flex-col items-center gap-2">
                    <div className="w-8 h-8 rounded bg-red-500 flex items-center justify-center text-white text-xs font-bold">YT</div>
                    <div className="h-1.5 w-12 bg-white/10 rounded-full"></div>
                  </div>
                  <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex flex-col items-center gap-2">
                    <div className="w-8 h-8 rounded bg-emerald-500 flex items-center justify-center text-white text-xs font-bold">Web</div>
                    <div className="h-1.5 w-12 bg-white/10 rounded-full"></div>
                  </div>
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 flex flex-col items-center gap-2">
                    <div className="w-8 h-8 rounded bg-blue-500 flex items-center justify-center text-white text-xs font-bold">in</div>
                    <div className="h-1.5 w-12 bg-white/10 rounded-full"></div>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-500/10 border border-slate-500/20 flex flex-col items-center gap-2">
                    <div className="w-8 h-8 rounded bg-slate-500 flex items-center justify-center text-white text-xs font-bold">X</div>
                    <div className="h-1.5 w-12 bg-white/10 rounded-full"></div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* 2. WHO GAPGENS IS FOR */}
      <section className="py-24 bg-[#05051a] border-y border-white/5">
        <ScrollReveal>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <WhoForCard
                icon="🎥"
                title="Creators & Podcasters"
                problem="Struggling to turn long videos into more content?"
                solution="Turn long-form audio or video into platform-specific scripts — without rewriting from scratch."
              />
              <WhoForCard
                icon="🧠"
                title="Founders & Leaders"
                problem="Have great ideas but no time to structure them?"
                solution="Adapt one idea into YouTube talks, LinkedIn posts, or insight threads."
              />
              <WhoForCard
                icon="📚"
                title="Educators"
                problem="Need to update course material quickly?"
                solution="Preserve accuracy while reshaping explanations for different audiences."
              />
              <WhoForCard
                icon="✍️"
                title="Writers"
                problem="Boring blank page syndrome?"
                solution="Extract deeper structure, then repurpose it cleanly across formats."
              />
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* 3. DIFFERENTIATION */}
      <section className="py-24 bg-[#030014] relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[600px] bg-gradient-to-r from-indigo-900/10 via-violet-900/10 to-indigo-900/10 blur-[100px] pointer-events-none"></div>

        <ScrollReveal>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-12">Analysis First. Writing Second.</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-8 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Most AI Tools</span>
                <p className="text-lg text-slate-400 mb-2">"Write me a viral post about X"</p>
                <p className="text-sm text-slate-500 mt-2 italic">Write content from prompts.</p>
                <div className="w-8 h-px bg-slate-700 my-4"></div>
                <p className="text-red-400 font-medium text-sm">🚫 Generic, Hallucinated, Fluff</p>
              </div>

              <div className="p-8 rounded-2xl bg-indigo-900/10 border border-indigo-500/20 flex flex-col items-center shadow-2xl shadow-indigo-500/5">
                <span className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-4">GapGens</span>
                <p className="text-lg text-white mb-2">"Here is my content. Evolve it."</p>
                <p className="text-sm text-indigo-300/80 mt-2 italic text-center">Analyze actual content, find what’s missing, adapt per platform — without changing truth.</p>
                <div className="w-8 h-px bg-indigo-500/50 my-4"></div>
                <p className="text-indigo-300 font-medium text-sm">✅ Grounded, Deep, Human</p>
              </div>
            </div>

            <p className="mt-10 text-slate-400 text-lg">
              Same analysis. Multiple outputs. Zero hallucinations. <span className="text-white font-medium">GapGens evolves your existing content.</span>
            </p>
          </div>
        </ScrollReveal>
      </section>

      {/* 4. HOW IT WORKS */}
      <section id="how-it-works" className="py-32 bg-[#05051a] relative border-t border-white/5">
        <ScrollReveal>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <h2 className="font-display text-3xl md:text-5xl font-bold text-white mb-6">How It Works</h2>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto">Three steps from raw input to polished output.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <StepCard
                number="1"
                title="Add Your Content"
                desc="Paste a YouTube URL, Blog post, or raw text."
              />
              <StepCard
                number="2"
                title="Gap Analysis"
                desc="GapGens identifies missing explanations, assumptions, and under-developed ideas — grounded strictly in your transcript."
                highlight
              />
              <StepCard
                number="3"
                title="Platform-Specific Derivative Scripts"
                desc="Generate and regenerate scripts tailored for YouTube, Blogs, LinkedIn, or X — without re-analyzing your content."
              />
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* 5. CORE FEATURES */}
      <section className="py-32 bg-[#030014]">
        <ScrollReveal>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-display text-3xl font-bold text-white mb-12">Built for Depth</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <FeatureCard
                title="Transcript Analysis"
                desc="We process the actual words spoken, not just metadata or summaries."
              />
              <FeatureCard
                title="Content Gap Detection"
                desc="Finds exactly where your content drops the ball or leaves viewers hanging."
              />
              <FeatureCard
                title="Faithful Derivatives"
                desc="The output adheres strictly to your tone and facts. No inventions."
              />
              <FeatureCard
                title="Interview → Monologue"
                desc="Convert messy interviews into clean, single-speaker narratives."
              />
              <FeatureCard
                title="Platform-Aware Regeneration"
                desc="Regenerate derivative scripts per platform using the same transcript and gaps — no repeated analysis."
              />
              <FeatureCard
                title="No Hallucinations"
                desc="Strict grounding constraints prevent the AI from making things up."
              />
              <FeatureCard
                title="Titles & Keywords"
                desc="Get SEO-optimized metadata based on the newly improved content."
              />
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* 6. TRUST & CREDIBILITY */}
      <section className="py-24 bg-[#05051a] border-y border-white/5">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-indigo-300 font-medium tracking-wide uppercase text-sm mb-6">Our Promise</p>
          <h2 className="text-2xl md:text-3xl font-display font-medium text-white mb-8 leading-snug">
            Designed for serious creators who value <span className="text-slate-400">accuracy over speed</span>.
          </h2>
          <div className="flex flex-col sm:flex-row justify-center gap-8 text-slate-500 text-sm">
            <span className="flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              No training on your data
            </span>
            <span className="flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Real transcript processing
            </span>
            <span className="flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Secure & Private
            </span>
          </div>
        </div>
      </section>

      {/* 7. FINAL CTA */}
      <section className="py-32 relative overflow-hidden bg-[#030014]">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none"></div>

        <ScrollReveal>
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-8 tracking-tight">Analyze Once. Publish Everywhere.</h2>
            <p className="text-lg text-slate-400 mb-8 max-w-2xl mx-auto">
              Generate YouTube scripts, blog posts, LinkedIn insights, or X threads — all grounded in the same analysis.
            </p>
            <div className="flex flex-col sm:flex-row gap-5 justify-center mt-10">
              <Link href="/dashboard">
                <Button variant="white" size="xl" className="shadow-2xl shadow-indigo-500/20 bg-white text-slate-900 hover:bg-indigo-50 transition-all font-bold px-10 py-4 text-lg">
                  Get Started Free
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" size="xl" className="border-white/10 text-white hover:bg-white/5 px-10 py-4 text-lg">
                  View Dashboard
                </Button>
              </Link>
            </div>
            <p className="mt-8 text-sm text-slate-500">No credit card required for standard analysis.</p>
          </div>
        </ScrollReveal>
      </section>
    </Layout >
  );
}

// Compact Sub-components for Cleaner Code

function WhoForCard({ icon, title, problem, solution }) {
  return (
    <div className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-indigo-500/20 transition-colors group">
      <div className="text-3xl mb-4 grayscale group-hover:grayscale-0 transition-all">{icon}</div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-slate-500 text-sm mb-3 min-h-[40px]">"{problem}"</p>
      <p className="text-indigo-300 text-sm font-medium border-t border-white/5 pt-3 group-hover:text-indigo-200">{solution}</p>
    </div>
  )
}

function StepCard({ number, title, desc, highlight }) {
  return (
    <div className={`p-8 rounded-3xl border ${highlight ? 'bg-indigo-900/10 border-indigo-500/30' : 'bg-white/5 border-white/5'} flex flex-col items-center text-center relative overflow-hidden`}>
      {highlight && <div className="absolute inset-0 bg-indigo-500/5 animate-pulse-soft pointer-events-none"></div>}
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold mb-6 ${highlight ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-800 text-slate-400'}`}>
        {number}
      </div>
      <h3 className="text-xl font-display font-bold text-white mb-3">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
    </div>
  )
}

function FeatureCard({ title, desc }) {
  return (
    <div className="p-6 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-slate-400 text-sm">{desc}</p>
    </div>
  )
}
