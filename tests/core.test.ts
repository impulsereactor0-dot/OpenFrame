// Run: npx tsx tests/core.test.ts
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { base64Url, hmacSha256, utf8Bytes } from '../src/core/hmacSha256';
import { pollUntil } from '../src/core/polling';
import { AppError, toAppError, errorFromHttpStatus } from '../src/core/errors';
import { assertHttps, resolveBaseUrl } from '../src/core/http';
import { buildKlingToken } from '../src/providers/kling/auth';
import { errorFromKlingCode, mapKlingStatus } from '../src/providers/kling/mapper';
import { errorFromBaseResp, mapStatus } from '../src/providers/minimax/mapper';
import {
  errorFromCustomBody,
  extractStatusUrl,
  extractTaskId,
  extractVideoUrl,
  mapCustomStatus,
} from '../src/providers/custom/mapper';

const hex = (b: Uint8Array) => Buffer.from(b).toString('hex');
const tests: [string, () => void | Promise<void>][] = [];
const test = (n: string, f: () => void | Promise<void>) => tests.push([n, f]);

test('hmac RFC4231 case 2', () => {
  assert.equal(hex(hmacSha256(utf8Bytes('Jefe'), utf8Bytes('what do ya want for nothing?'))),
    '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843');
});
test('hmac matches node for long keys / unicode / many lengths', () => {
  for (const kl of [0, 1, 63, 64, 65, 131, 200]) {
    for (const ml of [0, 1, 55, 56, 63, 64, 65, 119, 1000]) {
      const k = Buffer.alloc(kl, 7), m = Buffer.alloc(ml, 9);
      assert.equal(hex(hmacSha256(k, m)), createHmac('sha256', k).update(m).digest('hex'), `${kl}/${ml}`);
    }
  }
  const s = 'ключ-🔑', msg = 'привет';
  assert.equal(hex(hmacSha256(utf8Bytes(s), utf8Bytes(msg))), createHmac('sha256', s).update(msg).digest('hex'));
});
test('base64url', () => {
  for (let n = 0; n < 10; n++) {
    const b = Buffer.from(Array.from({ length: n }, (_, i) => 250 - i * 7));
    assert.equal(base64Url(b), b.toString('base64url'));
  }
});
test('kling jwt valid + whitespace trimmed + missing keys', () => {
  const tok = buildKlingToken({ accessKey: ' AK\n', secretKey: ' SK ' }, 1000);
  const [h, p, s] = tok.split('.');
  assert.deepEqual(JSON.parse(Buffer.from(h, 'base64url').toString()), { alg: 'HS256', typ: 'JWT' });
  assert.deepEqual(JSON.parse(Buffer.from(p, 'base64url').toString()), { iss: 'AK', exp: 2800, nbf: 995 });
  assert.equal(s, createHmac('sha256', 'SK').update(`${h}.${p}`).digest('base64url'));
  assert.throws(() => buildKlingToken({ accessKey: 'a' }), (e: any) => e.code === 'MISSING_KEY');
  assert.throws(() => buildKlingToken({ accessKey: '  ', secretKey: 'x' }), (e: any) => e.code === 'MISSING_KEY');
});
test('mappers', () => {
  assert.equal(errorFromKlingCode(0), undefined);
  assert.equal(errorFromKlingCode(undefined), undefined);
  assert.equal(errorFromKlingCode(1102)?.code, 'NO_BALANCE');
  assert.equal(errorFromKlingCode(9999)?.code, 'UNKNOWN');
  assert.equal(errorFromBaseResp(1008)?.code, 'NO_BALANCE');
  assert.equal(errorFromBaseResp(2049)?.code, 'INVALID_KEY');
  assert.equal(mapStatus(undefined), 'processing');
  assert.equal(mapStatus('Success'), 'succeeded');
  assert.equal(mapKlingStatus(undefined as any), 'processing');
  assert.equal(mapKlingStatus('succeed'), 'succeeded');
  assert.equal(mapKlingStatus('failed'), 'failed');
  assert.equal(errorFromHttpStatus(402).code, 'NO_BALANCE');
  assert.equal(toAppError(Object.assign(new Error('x'), { name: 'AbortError' })).code, 'CANCELLED');
  assert.equal(toAppError(null).code, 'UNKNOWN');
});
test('poll: done, transient retry, fatal, cancel, timeout', async () => {
  let n = 0;
  const r = await pollUntil(async () => { if (++n < 3) throw new AppError('NO_NETWORK'); return n; },
    { isDone: (v) => v >= 3, intervalMs: 1, maxIntervalMs: 2 });
  assert.equal(r, 3);
  await assert.rejects(pollUntil(async () => { throw new AppError('INVALID_KEY'); }, { isDone: () => true, intervalMs: 1 }),
    (e: any) => e.code === 'INVALID_KEY');
  await assert.rejects(pollUntil(async () => { throw new AppError('SERVER'); }, { isDone: () => true, intervalMs: 1, maxTransientErrors: 2 }),
    (e: any) => e.code === 'SERVER');
  const ac = new AbortController();
  setTimeout(() => ac.abort(), 20);
  await assert.rejects(pollUntil(async () => 0, { isDone: () => false, intervalMs: 5000, signal: ac.signal }),
    (e: any) => e.code === 'CANCELLED');
  await assert.rejects(pollUntil(async () => 0, { isDone: () => false, intervalMs: 1, timeoutMs: 10 }),
    (e: any) => e.code === 'TIMEOUT');
  const pre = new AbortController(); pre.abort();
  await assert.rejects(pollUntil(async () => 0, { isDone: () => true, signal: pre.signal }), (e: any) => e.code === 'CANCELLED');
});
test('https url validation + resolveBaseUrl', () => {
  assert.doesNotThrow(() => assertHttps('https://api.example.com/v1/videos'));
  assert.throws(() => assertHttps('http://api.example.com/v1'), (e: any) => e.code === 'INVALID_URL');
  assert.throws(() => assertHttps('not-a-url'), (e: any) => e.code === 'INVALID_URL');
  assert.throws(() => assertHttps('https:///bad'), (e: any) => e.code === 'INVALID_URL');
  assert.equal(resolveBaseUrl(undefined, 'https://api.minimax.io/v1'), 'https://api.minimax.io/v1');
  assert.equal(resolveBaseUrl('  https://api.minimaxi.com/v1/// ', 'https://api.minimax.io/v1'), 'https://api.minimaxi.com/v1');
});
test('custom provider mappers', () => {
  assert.equal(mapCustomStatus('completed'), 'succeeded');
  assert.equal(mapCustomStatus('done'), 'succeeded');
  assert.equal(mapCustomStatus('pending'), 'queued');
  assert.equal(mapCustomStatus('canceled'), 'failed');
  assert.equal(mapCustomStatus(undefined, true), 'succeeded');
  assert.equal(mapCustomStatus(undefined, false), 'processing');

  assert.equal(extractTaskId({ task_id: 't1' }), 't1');
  assert.equal(extractTaskId({ data: { id: 42 } }), '42');
  assert.equal(extractStatusUrl({ urls: { get: 'https://api.example.com/jobs/1' } }), 'https://api.example.com/jobs/1');
  assert.equal(extractVideoUrl({ output: { url: 'https://cdn.example.com/v.mp4' } }), 'https://cdn.example.com/v.mp4');
  assert.equal(extractVideoUrl({ data: { task_result: { videos: [{ url: 'https://cdn.example.com/k.mp4' }] } } }), 'https://cdn.example.com/k.mp4');

  assert.equal(errorFromCustomBody({ code: 200, data: { task_id: '1' } }), undefined);
  assert.equal(errorFromCustomBody({ base_resp: { status_code: 1008 } })?.code, 'NO_BALANCE');
  assert.equal(errorFromCustomBody({ code: 1102 })?.code, 'NO_BALANCE');
  assert.equal(errorFromCustomBody({ error: { message: 'Invalid API key provided' } })?.code, 'INVALID_KEY');
  assert.equal(errorFromCustomBody({ error: 'Insufficient quota' })?.code, 'NO_BALANCE');
  assert.equal(errorFromCustomBody({ error: { type: 'rate_limit_exceeded' } })?.code, 'RATE_LIMIT');
  assert.equal(errorFromCustomBody({ error: 'Content moderation failed' })?.code, 'CONTENT_BLOCKED');
  assert.equal(errorFromCustomBody({ error: 'Bad parameter' })?.code, 'BAD_REQUEST');

  // GenAPI response payloads
  assert.equal(extractTaskId({ request_id: 1234567, status: 'starting' }), '1234567');
  assert.equal(mapCustomStatus('starting'), 'queued');
  assert.equal(mapCustomStatus('success'), 'succeeded');
  assert.equal(
    extractVideoUrl({ request_id: 1234567, status: 'success', output: ['https://api.gen-api.ru/storage/results/v.mp4'] }),
    'https://api.gen-api.ru/storage/results/v.mp4',
  );
});

(async () => {
  let failed = 0;
  for (const [name, fn] of tests) {
    try { await fn(); console.log('ok  ', name); } catch (e) { failed++; console.log('FAIL', name, e); }
  }
  process.exit(failed ? 1 : 0);
})();
