import { createHash } from 'node:crypto';

export function hashEntry(prevHash, record) {
  const payload = JSON.stringify({ prev: prevHash, record });
  return createHash('sha256').update(payload).digest('hex');
}

export function buildLedger(readings) {
  let prev = '0';
  const entries = readings.map((record) => {
    const hash = hashEntry(prev, record);
    const entry = { prev_hash: prev, hash, record };
    prev = hash;
    return entry;
  });
  return { entries, tip_hash: prev };
}

export function verifyLedger(ledger) {
  if (!ledger?.entries?.length) return { valid: false, reason: 'empty' };
  let prev = '0';
  for (const entry of ledger.entries) {
    if (entry.prev_hash !== prev) {
      return { valid: false, reason: 'prev_hash_mismatch', index: entry };
    }
    const expected = hashEntry(prev, entry.record);
    if (entry.hash !== expected) {
      return { valid: false, reason: 'hash_mismatch', index: entry };
    }
    prev = entry.hash;
  }
  return { valid: true };
}
