import { createHmac } from 'node:crypto';
import jwt from 'jsonwebtoken';

function key() {
  if (!process.env.JWT_SECRET) throw new Error('Missing signing secret');
  // Separate signing key prevents an estimate receipt being used as a login token.
  return createHmac('sha256', process.env.JWT_SECRET).update('nutrition-estimate-receipt-v1').digest('hex');
}
export function signEstimate(estimate, foodName, userId) {
  return jwt.sign({ ...estimate, foodName }, key(), { algorithm: 'HS256', audience: 'nutrition-estimate', subject: userId, expiresIn: '7d' });
}
export function verifyEstimate(receipt, foodName, userId) {
  if (typeof receipt !== 'string' || receipt.length > 4096 || !userId) return null;
  try {
    const result = jwt.verify(receipt, key(), { algorithms: ['HS256'], audience: 'nutrition-estimate', subject: userId });
    return result.foodName === foodName && result.provider === 'gemini' ? result : null;
  } catch { return null; }
}
