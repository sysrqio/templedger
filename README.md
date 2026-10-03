# templedger

HACCP cold-chain audit CLI: validate temperature CSV exports, detect gaps and
excursions, and build a hash-chained ledger for tamper-evident logs.

## Quick start

```bash
npm install
node bin/templedger.js audit --input fixtures/sample.csv
```

Exit codes: `0` OK · `2` policy violation · `1` error.

## License

MIT
