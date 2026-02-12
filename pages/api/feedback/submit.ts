import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { message } = req.body;

    // Validation
    if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message is required' });
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length < 5) {
        return res.status(400).json({ error: 'Message must be at least 5 characters' });
    }
    if (trimmedMessage.length > 1000) {
        return res.status(400).json({ error: 'Message must be less than 1000 characters' });
    }

    try {
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
            }
        );

        let userId: string | null = null;
        let email: string | null = null;

        // Check auth
        const authHeader = req.headers.authorization;
        if (authHeader) {
            const token = authHeader.replace('Bearer ', '');
            const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

            if (!error && user) {
                userId = user.id;
                email = user.email || null;
            }
        }

        // Insert
        const { error: insertError } = await supabaseAdmin
            .from('user_feedback')
            .insert({
                message: trimmedMessage,
                user_id: userId,
                email: email,
            });

        if (insertError) {
            console.error('Feedback insert error:', insertError);
            return res.status(500).json({ error: 'Failed to save feedback' });
        }

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('Feedback API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
