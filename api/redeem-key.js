import { hashKey, generateHWID } from './lib/crypto.js';
import { getSupabaseAdmin } from './lib/db.js';
import { checkRateLimit } from './lib/ratelimit.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || '127.0.0.1';

  // Rate limit
  const allowed = await checkRateLimit(clientIp, 'redeem-key', 15);
  if (!allowed) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const { key, hwid_data } = req.body;

  if (!key || !hwid_data) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  try {
    const supabase = await getSupabaseAdmin();
    const keyHash = hashKey(key);
    const hwid = generateHWID(hwid_data);

    // Key ara
    const { data: keyData } = await supabase
      .from('keys')
      .select('*')
      .eq('key_hash', keyHash)
      .single();

    if (!keyData) {
      return res.status(404).json({ success: false, reason: 'Key not found' });
    }

    if (keyData.is_banned) {
      return res.status(403).json({ success: false, reason: 'Key is banned' });
    }

    // One-time ve zaten kullanılmış
    if (keyData.key_type === 'one-time' && keyData.is_used) {
      return res.status(403).json({ 
        success: false, 
        reason: 'Key already redeemed' 
      });
    }

    // HWID bağla
    const { error: bindError } = await supabase
      .from('hwid_bindings')
      .insert({
        key_id: keyData.id,
        hwid,
        ip_address: clientIp,
      });

    if (bindError && !bindError.message.includes('duplicate')) {
      throw bindError;
    }

    // Update key status
    await supabase
      .from('keys')
      .update({
        is_used: true,
        redeemed_at: new Date().toISOString(),
        redeemed_by_hwid: hwid.slice(0, 16),
      })
      .eq('id', keyData.id);

    // Analytics
    await supabase.from('analytics').insert({
      key_id: keyData.id,
      action: 'redeemed',
      ip_address: clientIp,
      hwid: hwid.slice(0, 16),
      status: 'success',
    });

    return res.status(200).json({
      success: true,
      message: 'Key redeemed successfully',
      key_type: keyData.key_type,
    });
  } catch (error) {
    console.error('Redeem key error:', error);
    return res.status(500).json({ error: error.message });
  }
      }
