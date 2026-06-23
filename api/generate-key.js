import { generateKey, hashKey } from './lib/crypto.js';
import { getSupabaseAdmin } from './lib/db.js';
import { checkRateLimit } from './lib/ratelimit.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || '127.0.0.1';

  // Rate limit
  const allowed = await checkRateLimit(clientIp, 'generate-key', 50);
  if (!allowed) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const { api_key, key_type = 'permanent', expires_in_days = null, notes = '' } = req.body;

  // API Key doğrula
  if (api_key !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  try {
    const supabase = await getSupabaseAdmin();

    // Key oluştur
    const newKey = generateKey();
    const keyHash = hashKey(newKey);

    let expiresAt = null;
    if (expires_in_days) {
      const date = new Date();
      date.setDate(date.getDate() + expires_in_days);
      expiresAt = date.toISOString();
    }

    const { data, error } = await supabase
      .from('keys')
      .insert({
        key_hash: keyHash,
        key_display: newKey.slice(-8),
        key_type,
        expires_at: expiresAt,
        notes,
        created_by: api_key, // Basit için API key kullan
      })
      .select()
      .single();

    if (error) throw error;

    // Analytics
    await supabase.from('analytics').insert({
      key_id: data.id,
      action: 'created',
      ip_address: clientIp,
      status: 'success',
    });

    return res.status(200).json({
      success: true,
      key: newKey,
      key_id: data.id,
      type: key_type,
      expires_at: expiresAt,
      created_at: data.created_at,
    });
  } catch (error) {
    console.error('Generate key error:', error);
    return res.status(500).json({ error: error.message });
  }
      }
