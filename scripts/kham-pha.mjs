#!/usr/bin/env node
// Chạy bộ khám phá trên một tệp hình JSON từ dòng lệnh, in kết quả dạng JSON.
// Dùng làm cầu nối cho các công cụ khác (vd vòng lặp khám phá bằng Python gọi qua subprocess).
//   node scripts/kham-pha.mjs hinh.json [--samples 20] [--seed 7] [--text]
import { readFileSync } from 'node:fs';
import { parseDocJSON } from '../src/io/codec.js';
import { explore } from '../src/explore/explorer.js';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--') && !/^\d+$/.test(a));
if (!file) {
  console.error('Cách dùng: node scripts/kham-pha.mjs <hinh.json> [--samples N] [--seed S] [--text]');
  process.exit(2);
}
const opt = (name) => { const i = args.indexOf('--' + name); return i >= 0 ? Number(args[i + 1]) : undefined; };
const doc = parseDocJSON(readFileSync(file, 'utf8'));
const res = explore(doc, { ...(opt('samples') ? { samples: opt('samples') } : {}), ...(opt('seed') ? { seed: opt('seed') } : {}) });
if (args.includes('--text')) {
  for (const r of res.relations) console.log(`${r.score}\t${r.type}\t${r.text}${r.note ? '\t(' + r.note + ')' : ''}`);
  console.error(JSON.stringify(res.stats));
} else {
  console.log(JSON.stringify(res, null, 1));
}
