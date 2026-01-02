const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Manually parse .env.local
try {
    const envConfig = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
} catch (e) {
    console.error('Error loading .env.local', e);
}

async function test() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('URL:', url);
    // masking key for security in logs, just showing first 5 chars
    console.log('Key prefix:', key ? key.substring(0, 5) + '...' : 'MISSING');

    if (!url || !key) {
        console.error('Missing credentials');
        return;
    }

    try {
        const supabase = createClient(url, key);
        const { data, error } = await supabase.from('analyses').select('id, title').limit(1);

        if (error) {
            console.error('Supabase Error:', error);
        } else {
            console.log('Success! Found analyses:', data);
        }
    } catch (err) {
        console.error("Client creation or request failed:", err);
    }
}

test();
