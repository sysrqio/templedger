import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditFile } from '../lib/audit.js';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

test('T1 valid interval exits policy clean', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tl-'));
  const p = join(dir, 'ok.csv');
  writeFileSync(
    p,
    `timestamp,zone_celsius,value_c
2026-10-03T08:00:00+02:00,walk_in,4.2
2026-10-03T11:00:00+02:00,walk_in,4.0`,
  );
  const r = auditFile(p, { minIntervalMinutes: 240 });
  assert.equal(r.policy_violations.length, 0);
});

test('T2 gap detected', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tl-'));
  const p = join(dir, 'gap.csv');
  writeFileSync(
    p,
    `timestamp,zone_celsius,value_c
2026-10-03T08:00:00+02:00,walk_in,4.2
2026-10-03T20:00:00+02:00,walk_in,4.0`,
  );
  const r = auditFile(p, { minIntervalMinutes: 240 });
  assert.ok(r.policy_violations.some((v) => v.type === 'gap'));
});

test('T3 excursion detected', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tl-'));
  const p = join(dir, 'hot.csv');
  writeFileSync(
    p,
    `timestamp,zone_celsius,value_c
2026-10-03T08:00:00+02:00,walk_in,10.0`,
  );
  const r = auditFile(p);
  assert.ok(r.policy_violations.some((v) => v.type === 'excursion'));
});
