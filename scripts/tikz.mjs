#!/usr/bin/env node
// Xuất một tệp hình JSON ra mã TikZ:  node scripts/tikz.mjs hinh.json [--width 10] > hinh.tex
import { readFileSync } from 'node:fs';
import { parseDocJSON } from '../src/io/codec.js';
import { toTikZ } from '../src/export/tikz.js';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--') && !/^[\d.]+$/.test(a));
if (!file) {
  console.error('Cách dùng: node scripts/tikz.mjs <hinh.json> [--width cm]');
  process.exit(2);
}
const i = args.indexOf('--width');
process.stdout.write(toTikZ(parseDocJSON(readFileSync(file, 'utf8')), { width: i >= 0 ? Number(args[i + 1]) : 12 }));
