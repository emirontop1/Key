import { getSupabaseAdmin } from './db.js';

export async function checkRateLimit(ipAddress, endpoint, limit = 10) {
  const supabase = await getSupabaseAdmin();
  
  const { data, error } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('ip_address', ipAddress)
    .eq('endpoint', endpoint)
    .gt('reset_at', new Date().toISOString())
    .single();

  if (!data) {
    // İlk istek
    await supabase.from('rate_limits').insert({
      ip_address: ipAddress,
      endpoint,
      attempts: 1,
    });
    return true;
  }

  if (data.attempts >= limit) {
    return false;
  }

  // Artır
  await supabase
    .from('rate_limits')
    .update({ attempts: data.attempts + 1 })
    .eq('id', data.id);

  return true;
}
