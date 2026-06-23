import { getSupabaseAdmin } from './lib/db.js';
import { checkRateLimit } from './lib/ratelimit.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || '127.0.0.1';

  const allowed = await checkRateLimit(clientIp, 'keys-list', 100);
  if (!allowed) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const { api_key, limit = 50, offset = 0 } = req.query;

  if (api_key !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  try {
    const supabase = await getSupabaseAdmin();

    const { data, error, count } = await supabase
      .from('keys')
      .select('id, key_display, key_type, is_used, is_banned, created_at, expires_at, usage_count, notes', 
             { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      keys: data,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('List keys error:', error);
    return res.status(500).json({ error: error.message });
  }
}
