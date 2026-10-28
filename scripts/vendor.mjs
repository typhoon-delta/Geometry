// Sao chép thư viện JSXGraph từ node_modules vào vendor/ để trang chạy offline, không cần CDN.
import { copyFileSync, mkdirSync } from 'node:fs';
const src = 'node_modules/jsxgraph/distrib/';
const dst = 'vendor/jsxgraph/';
mkdirSync(dst, { recursive: true });
for (const f of ['jsxgraphcore.js', 'jsxgraph.css', 'LICENSE.MIT', 'LICENSE.LGPL', 'jsxgraphcore.js.LICENSE.txt']) {
  copyFileSync(src + f, dst + f);
}
console.log('Đã chép JSXGraph vào', dst);
