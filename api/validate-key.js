import { hashKey, generateHWID } from './lib/crypto.js';
import { getSupabaseAdmin } from './lib/db.js';
import { checkRateLimit } from './lib/ratelimit.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || '127.0.0.1';

  // Rate limit - key doğrulama çok önemliydi
  const allowed = await checkRateLimit(clientIp, 'validate-key', 20);
  if (!allowed) {
    return res.status(429).json({ error: 'Too many requests', retry_after: 60 });
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
    const { data: keyData, error: keyError } = await supabase
      .from('keys')
      .select('*')
      .eq('key_hash', keyHash)
      .single();

    if (keyError || !keyData) {
      // Analytics
      await supabase.from('analytics').insert({
        action: 'validate_failed',
        ip_address: clientIp,
        hwid: hwid.slice(0, 16),
        status: 'not_found',
      });

      return res.status(404).json({ valid: false, reason: 'Key not found' });
    }

    // Key yasaklanmış mı?
    if (keyData.is_banned) {
      return res.status(403).json({ valid: false, reason: 'Key is banned' });
    }

    // Süresi geçti mi?
    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      return res.status(403).json({ valid: false, reason: 'Key expired' });
    }

    // One-time key zaten kullanılmış mı?
    if (keyData.key_type === 'one-time' && keyData.is_used) {
      return res.status(403).json({ valid: false, reason: 'Key already used' });
    }

    // HWID kontrol et
    const { data: hwidData } = await supabase
      .from('hwid_bindings')
      .select('*')
      .eq('key_id', keyData.id)
      .single();

    if (hwidData) {
      // HWID bağlı ve mismatch
      if (hwidData.hwid !== hwid) {
        return res.status(403).json({ 
          valid: false, 
          reason: 'HWID mismatch',
          hwid_bound: true 
        });
      }

      // Update last seen
      await supabase
        .from('hwid_bindings')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', hwidData.id);
    }

    // Başarılı doğrulama
    const { data: updatedKey } = await supabase
      .from('keys')
      .update({
        usage_count: keyData.usage_count + 1,
        last_used: new Date().toISOString(),
      })
      .eq('id', keyData.id)
      .select()
      .single();

    // Analytics
    await supabase.from('analytics').insert({
      key_id: keyData.id,
      action: 'validated',
      ip_address: clientIp,
      hwid: hwid.slice(0, 16),
      status: 'success',
    });

    return res.status(200).json({
      valid: true,
      key_type: keyData.key_type,
      expires_at: keyData.expires_at,
      usage_count: updatedKey.usage_count,
    });
  } catch (error) {
    console.error('Validate key error:', error);
    return res.status(500).json({ error: error.message });
  }
}
