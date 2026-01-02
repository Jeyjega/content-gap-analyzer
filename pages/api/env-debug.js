// pages/api/env-debug.js
export default function handler(req, res) {
  try {
    const serverSupabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
    const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
    const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;
    const openai = process.env.OPENAI_API_KEY ?? null;

    // return boolean + lengths so keys are not printed fully
    return res.status(200).json({
      serverSupabaseUrlPresent: !!serverSupabaseUrl,
      serverSupabaseUrlValue: serverSupabaseUrl ? String(serverSupabaseUrl) : null,
      next_public_supabase_present: !!publicUrl,
      next_public_supabase_value: publicUrl ? String(publicUrl) : null,
      supabase_service_role_key_present: !!svcKey,
      supabase_service_role_key_len: svcKey ? svcKey.length : 0,
      openai_present: !!openai,
      openai_len: openai ? openai.length : 0,
      node_env: process.env.NODE_ENV ?? null
    });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
