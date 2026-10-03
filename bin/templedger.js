#!/usr/bin/env node
import { Command } from 'commander';
import { writeFileSync, readFileSync } from 'node:fs';
import { auditFile } from '../lib/audit.js';
import { verifyLedger } from '../lib/ledger.js';

const program = new Command();
program.name('templedger').description('HACCP cold-chain audit CLI').version('0.1.0');

program
  .command('audit')
  .requiredOption('--input <path>', 'CSV or JSON readings')
  .option('--min-interval-minutes <n>', 'max gap minutes', '240')
  .option('--cold-min-c <n>', 'cold min °C', '2')
  .option('--cold-max-c <n>', 'cold max °C', '8')
  .option('--output <fmt>', 'text|json|markdown', 'text')
  .option('--out-file <path>', 'write report')
  .option('--ledger-out <path>', 'write ledger.json')
  .action((opts) => {
    try {
      const report = auditFile(opts.input, {
        minIntervalMinutes: Number(opts.minIntervalMinutes),
        coldMinC: Number(opts.coldMinC),
        coldMaxC: Number(opts.coldMaxC),
      });
      if (opts.ledgerOut) {
        writeFileSync(opts.ledgerOut, JSON.stringify(report.ledger_full, null, 2));
      }
      const { ledger_full, ...publicReport } = report;
      let out;
      if (opts.output === 'json') {
        out = JSON.stringify(publicReport, null, 2);
      } else if (opts.output === 'markdown') {
        out = `# TempLedger audit\n\nViolations: ${publicReport.policy_violations.length}\n`;
        for (const v of publicReport.policy_violations) {
          out += `- ${v.type} ${v.zone}\n`;
        }
      } else {
        out = `templedger: ${publicReport.policy_violations.length} violation(s)\n`;
      }
      if (opts.outFile) writeFileSync(opts.outFile, out);
      else console.log(out);
      process.exit(publicReport.policy_violations.length ? 2 : 0);
    } catch (e) {
      console.error(`templedger: ${e.message}`);
      process.exit(1);
    }
  });

program
  .command('verify')
  .argument('<ledger>', 'ledger.json path')
  .action((ledgerPath) => {
    try {
      const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'));
      const result = verifyLedger(ledger);
      if (!result.valid) {
        console.error(`templedger verify: ${result.reason}`);
        process.exit(2);
      }
      console.log('templedger verify: OK');
      process.exit(0);
    } catch (e) {
      console.error(`templedger: ${e.message}`);
      process.exit(1);
    }
  });

program.parse();
