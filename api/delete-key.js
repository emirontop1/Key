import { getSupabaseAdmin } from './lib/db.js';
import { checkRateLimit } from './lib/ratelimit.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || '127.0.0.1';

  const allowed = await checkRateLimit(clientIp, 'delete-key', 30);
  if (!allowed) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const { api_key, key_id, soft_delete = false } = req.body;

  if (api_key !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  if (!key_id) {
    return res.status(400).json({ error: 'Missing key_id' });
  }

  try {
    const supabase = await getSupabaseAdmin();

    if (soft_delete) {
      // Ban instead of delete
      await supabase
        .from('keys')
        .update({ is_banned: true })
        .eq('id', key_id);
    } else {
      // Hard delete
      await supabase
        .from('keys')
        .delete()
        .eq('id', key_id);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Delete key error:', error);
    return res.status(500).json({ error: error.message });
  }
}
