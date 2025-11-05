import dotenv from 'dotenv';
dotenv.config();

export interface SizPayConfig {
  merchantId: string;
  terminalId: string;
  usernameBase64: string;
  passwordBase64: string;
  signKey: string;
}

export const sizpayConfig: SizPayConfig = {
  merchantId: process.env.SIZPAY_MERCHANT_ID || '',
  terminalId: process.env.SIZPAY_TERMINAL_ID || '',
  usernameBase64: process.env.SIZPAY_USERNAME_B64 || '',
  passwordBase64: process.env.SIZPAY_PASSWORD_B64 || '',
  signKey: process.env.SIZPAY_SIGN_KEY || ''
};

export const returnUrl = process.env.RETURN_URL || 'http://localhost:3000/sizpay/callback';
export const redisUrl = process.env.REDIS_URL || '';