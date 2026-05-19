/**
 * In-memory JWT denylist for invalidating tokens on logout.
 *
 * Stores token JTI (JWT ID) with its expiry timestamp.
 * Expired entries are pruned automatically on each lookup.
 *
 * For multi-instance production: replace _denylist with a Redis SET
 * using SETEX so entries auto-expire: `redis.setex(jti, ttlSeconds, '1')`
 */

const _denylist = new Map<string, number>(); // jti → expiry epoch ms

/** Add a token's JTI to the denylist until it naturally expires. */
export function denyToken(jti: string, expiresAt: number): void {
  _denylist.set(jti, expiresAt);
  _prune();
}

/** Returns true if the JTI has been revoked. */
export function isDenied(jti: string): boolean {
  _prune();
  const expiry = _denylist.get(jti);
  if (expiry === undefined) return false;
  if (Date.now() > expiry) { _denylist.delete(jti); return false; }
  return true;
}

/** Remove expired entries to prevent unbounded memory growth. */
function _prune(): void {
  const now = Date.now();
  for (const [jti, expiry] of _denylist) {
    if (now > expiry) _denylist.delete(jti);
  }
}
