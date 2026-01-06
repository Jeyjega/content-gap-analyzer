import '@/styles/globals.css';
import { AuthProvider } from '@/components/AuthProvider';

export const metadata = {
    title: 'GapGens Analyzer',
    description: 'Identify content gaps and generate optimized scripts.',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className="bg-slate-50 text-slate-900 antialiased">
                <AuthProvider>{children}</AuthProvider>
            </body>
        </html>
    );
}
