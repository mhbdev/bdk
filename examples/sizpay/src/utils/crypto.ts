import { createCipheriv, randomBytes, createHmac } from 'crypto';

export function aesEncryptBase64(data: string, keyBase64: string, ivBase64: string): string {
  const key = Buffer.from(keyBase64, 'base64');
  const iv = Buffer.from(ivBase64, 'base64');
  if (key.length !== 32) {
    throw new Error('SizPay AES key must be 32 bytes (base64 input).');
  }
  if (iv.length !== 16) {
    throw new Error('SizPay AES IV must be 16 bytes (base64 input).');
  }
  const cipher = createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
  return encrypted.toString('base64');
}

export function sha256SignBase64(data: string, signKey: string): string {
  const h = createHmac('sha256', signKey);
  h.update(data, 'utf8');
  return h.digest('base64');
}