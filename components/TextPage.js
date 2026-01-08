import Head from 'next/head';
import Layout from './Layout';
import Link from 'next/link';

export default function TextPage({ title, description, children }) {
    const metaTitle = title ? `${title} | GapGens` : 'GapGens';

    return (
        <Layout headerVariant="dark" bgClass="bg-[#030014]">
            <Head>
                <title>{metaTitle}</title>
                {description && <meta name="description" content={description} />}
                {/* Prevent indexing of these pages initially if needed, but requests asked for SEO-optimized so we allow indexing */}
                <meta name="robots" content="index, follow" />
            </Head>

            <div className="bg-[#030014] min-h-screen text-slate-300">
                {/* Content Container */}
                <article className="max-w-3xl mx-auto px-6 py-20 lg:py-28">

                    {/* Header Section */}
                    <div className="mb-16 border-b border-white/5 pb-10">
                        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-6 leading-tight">
                            {title}
                        </h1>
                        {description && (
                            <p className="text-xl text-slate-400 leading-relaxed">
                                {description}
                            </p>
                        )}
                    </div>

                    {/* Main Content Styling (Prose) */}
                    <div className="prose prose-lg prose-invert prose-p:text-slate-400 prose-headings:text-white prose-a:text-indigo-400 hover:prose-a:text-indigo-300 prose-strong:text-slate-200">
                        {children}
                    </div>

                    {/* Global CTA for every page */}
                    <div className="mt-20 pt-10 border-t border-white/5">
                        <h2 className="text-2xl font-bold text-white mb-4">Ready to close your content gaps?</h2>
                        <p className="text-slate-400 mb-8">
                            Join expert creators using GapGens to turn one-time content into a comprehensive library.
                        </p>
                        <Link
                            href="/"
                            className="inline-flex items-center justify-center px-8 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/25"
                        >
                            Analyze Your Content Free
                        </Link>
                    </div>

                </article>
            </div>
        </Layout>
    );
}
