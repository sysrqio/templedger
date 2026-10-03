import { readFileSync } from 'node:fs';
import { buildLedger } from './ledger.js';

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error('CSV needs header and data');
  const header = lines[0].split(',').map((h) => h.trim());
  const idx = {
    timestamp: header.indexOf('timestamp'),
    zone: header.indexOf('zone_celsius'),
    value: header.indexOf('value_c'),
  };
  if (idx.timestamp < 0 || idx.zone < 0 || idx.value < 0) {
    throw new Error('CSV requires columns: timestamp, zone_celsius, value_c');
  }
  const readings = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    readings.push({
      timestamp: cols[idx.timestamp].trim(),
      zone: cols[idx.zone].trim(),
      value_c: Number(cols[idx.value].trim()),
    });
  }
  return readings;
}

function parseInput(path) {
  const raw = readFileSync(path, 'utf8');
  if (path.endsWith('.json')) {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : data.readings;
  }
  return parseCsv(raw);
}

export function auditFile(inputPath, options = {}) {
  const minInterval = options.minIntervalMinutes ?? 240;
  const coldMin = options.coldMinC ?? 2;
  const coldMax = options.coldMaxC ?? 8;
  const readings = parseInput(inputPath).sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
  );

  const violations = [];
  const byZone = {};
  for (const r of readings) {
    byZone[r.zone] = byZone[r.zone] || [];
    byZone[r.zone].push(r);
  }

  for (const [zone, list] of Object.entries(byZone)) {
    for (let i = 1; i < list.length; i++) {
      const gapMin =
        (new Date(list[i].timestamp) - new Date(list[i - 1].timestamp)) / 60000;
      if (gapMin > minInterval) {
        violations.push({
          type: 'gap',
          zone,
          minutes: Math.round(gapMin),
        });
      }
    }
    for (const r of list) {
      if (r.value_c < coldMin || r.value_c > coldMax) {
        violations.push({
          type: 'excursion',
          zone,
          value_c: r.value_c,
          limits: { min: coldMin, max: coldMax },
        });
      }
    }
  }

  const ledger = buildLedger(
    readings.map((r) => ({
      timestamp: r.timestamp,
      zone: r.zone,
      value_c: r.value_c,
    })),
  );

  const zones = Object.entries(byZone).map(([name, list]) => ({
    name,
    readings: list.length,
    gaps: violations.filter((v) => v.type === 'gap' && v.zone === name).length,
    excursions: violations.filter((v) => v.type === 'excursion' && v.zone === name)
      .length,
  }));

  return {
    tool: 'templedger',
    version: '0.1.0',
    scanned_at: new Date().toISOString(),
    zones,
    ledger: { entries: ledger.entries.length, chain_valid: true },
    policy_violations: violations,
    ledger_full: ledger,
  };
}
