import crypto from 'crypto';

export function generateKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = '';
  for (let i = 0; i < 20; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Format: XXXX-XXXX-XXXX-XXXX-XXXX
  return key.match(/.{1,4}/g).join('-');
}

export function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export function generateHWID(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function signResponse(data, secret) {
  const signature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(data))
    .digest('hex');
  return { data, signature };
}

export function verifySignature(data, signature, secret) {
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(data))
    .digest('hex');
  return signature === expectedSig;
}
