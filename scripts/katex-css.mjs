#!/usr/bin/env node
// Sinh css/katex.css: CSS của KaTeX với phông woff2 NHÚNG SẴN (data URI). Chrome chặn nạp phông từ file:// nên
// không thể để phông thành tệp riêng nếu muốn mở index.html trực tiếp từ ổ đĩa. Chạy trong `npm run build`.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const dir = join(dirname(require.resolve('katex/package.json')), 'dist');
let css = readFileSync(join(dir, 'katex.min.css'), 'utf8');
css = css.replace(/src:url\(fonts\/([A-Za-z0-9_-]+)\.woff2\) format\("woff2"\)(,url\([^)]*\) format\("[a-z]+"\))*/g, (_, name) => {
  const b64 = readFileSync(join(dir, 'fonts', name + '.woff2')).toString('base64');
  return `src:url(data:font/woff2;base64,${b64}) format("woff2")`;
});
if (/url\(fonts\//.test(css)) throw new Error('Còn phông chưa nhúng');
const ver = JSON.parse(readFileSync(join(dir, '..', 'package.json'), 'utf8')).version;
writeFileSync(new URL('../css/katex.css', import.meta.url), `/* KaTeX ${ver} (MIT) – phông nhúng sẵn, sinh bởi scripts/katex-css.mjs */\n${css}\n`);
