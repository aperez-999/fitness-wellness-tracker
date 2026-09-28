import assert from 'node:assert/strict';
import { test } from 'node:test';
import { estimateFood, createEstimateLimiter } from '../src/services/mealEstimate.js';
import { signEstimate, verifyEstimate } from '../src/utils/estimateReceipt.js';
import { validateNutrition } from '../src/utils/nutritionValidation.js';
import { verifyToken } from '../src/utils/jwt.js';

const values = { calories: 300, protein: 12, carbohydrates: 45, fat: 8 };
const answer = { isFood: true, portion: 'One bowl of oats with berries', ...values };
const provider = (result = answer, finishReason = 'STOP') => ({ ok: true, status: 200, json: async () => ({ candidates: [{ finishReason, content: { parts: [{ text: JSON.stringify(result) }] } }] }) });

test('Gemini sends only meal text to the fixed Google endpoint, returns bounded numbers', async () => {
  let calls = 0;
  const result = await estimateFood(' oats ', { apiKey: 'test-secret', fetchImpl: async (url, options) => {
    calls++;
    assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');
    assert.equal(options.headers['x-goog-api-key'], 'test-secret');
    assert.equal(url.includes('test-secret'), false);
    const body = JSON.parse(options.body);
    assert.deepEqual(body.contents, [{ role: 'user', parts: [{ text: 'oats' }] }]);
    assert.equal(body.generationConfig.responseMimeType, 'application/json');
    return provider();
  } });
  assert.equal(calls, 1);
  assert.deepEqual(result.values, values);
  assert.equal(result.provider, 'gemini');
});

test('invalid input or missing configuration never calls Google', async () => {
  const fetchImpl = async () => assert.fail('Unexpected outbound request');
  for (const input of [undefined, null, {}, [], '', ' ', 'a'.repeat(121)]) {
    await assert.rejects(estimateFood(input, { apiKey: 'test', fetchImpl }), { status: 400 });
  }
  await assert.rejects(estimateFood('oats', { apiKey: '', fetchImpl }), { status: 503 });
  await assert.rejects(estimateFood('oats', { apiKey: 'test', model: '../elsewhere', fetchImpl }), { status: 503 });
});

test('quota, unavailable, timeout and malformed responses fail safely without provider details', async () => {
  for (const [status, expected] of [[429,429],[400,503],[403,503],[500,503]]) {
    let calls = 0;
    await assert.rejects(estimateFood('oats', { apiKey: 'secret', fetchImpl: async () => { calls++; return { ok: false, status }; } }), { status: expected });
    assert.equal(calls, 1);
  }
  await assert.rejects(estimateFood('oats', { apiKey: 'secret', fetchImpl: async () => { throw new Error('secret'); } }), error => error.status === 503 && !error.message.includes('secret'));
  for (const invalid of [null, {}, {...answer, calories: -1}, {...answer, fat: '8'}, {...answer, protein: 2001}, {...answer, portion: ''}, {...answer, portion: 'x'.repeat(301)}]) {
    await assert.rejects(estimateFood('oats', { apiKey: 'test', fetchImpl: async () => provider(invalid) }), { status: 502 });
  }
  await assert.rejects(estimateFood('oats', { apiKey: 'test', fetchImpl: async () => provider(answer, 'MAX_TOKENS') }), { status: 502 });
  await assert.rejects(estimateFood('nonsense', { apiKey: 'test', fetchImpl: async () => provider({ ...answer, isFood: false }) }), { status: 422 });
});

test('estimate receipts bind the user, food and provider values and cannot become auth tokens', () => {
  process.env.JWT_SECRET = 'unit-test-secret-for-estimate-receipts-only';
  const estimate = { provider: 'gemini', model: 'gemini-3.5-flash-lite', portion: answer.portion, values };
  const receipt = signEstimate(estimate, 'oats', 'user-one');
  assert.ok(verifyEstimate(receipt, 'oats', 'user-one'));
  assert.equal(verifyEstimate(receipt, 'oats', 'user-two'), null);
  assert.equal(verifyEstimate(receipt, 'different food', 'user-one'), null);
  assert.equal(verifyEstimate(receipt + 'x', 'oats', 'user-one'), null);
  assert.throws(() => verifyToken(receipt));
  const body = { date: '2026-09-28', foodName: 'oats', ...values, estimate: { receipt, provider: 'fake' } };
  assert.equal(validateNutrition(body, { userId: 'user-one' }).entry.estimate.edited, false);
  assert.equal(validateNutrition({ ...body, fat: 9 }, { userId: 'user-one' }).entry.estimate.edited, true);
  assert.ok(validateNutrition(body, { userId: 'user-two' }).errors.estimate);
});

test('per-user and global limits reset after a minute', () => {
  let clock = 0;
  const allow = createEstimateLimiter({ now: () => clock, perUser: 2, total: 3 });
  assert.equal(allow('one'), true);
  assert.equal(allow('one'), true);
  assert.equal(allow('one'), false);
  assert.equal(allow('two'), true);
  assert.equal(allow('three'), false);
  clock = 60000;
  assert.equal(allow('one'), true);
});
