import { base64Url, hmacSha256, utf8Bytes } from '../../core/hmacSha256';
import { AppError } from '../../core/errors';
import type { ProviderCredentials } from '../../core/types';

/** Builds a short-lived Kling API JWT (HS256) from access + secret keys. */
export function buildKlingToken(creds: ProviderCredentials, nowSec = Math.floor(Date.now() / 1000)): string {
  const accessKey = creds.accessKey?.trim();
  const secretKey = creds.secretKey?.trim();
  if (!accessKey || !secretKey) throw new AppError('MISSING_KEY');

  const enc = (obj: object) => base64Url(utf8Bytes(JSON.stringify(obj)));
  const head = enc({ alg: 'HS256', typ: 'JWT' });
  const payload = enc({ iss: accessKey, exp: nowSec + 1800, nbf: nowSec - 5 });
  const signingInput = `${head}.${payload}`;
  const sig = base64Url(hmacSha256(utf8Bytes(secretKey), utf8Bytes(signingInput)));
  return `${signingInput}.${sig}`;
}
