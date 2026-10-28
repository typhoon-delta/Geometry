// Đóng gói giao diện (src/ui/main.js → dist/app.js) rồi gắn mã phiên bản vào index.html
// (css/style.css?v=…, dist/app.js?v=…) để trình duyệt không dùng bản CSS/JS cũ trong bộ nhớ đệm
// sau mỗi lần cập nhật trên GitHub Pages (Pages cho phép trình duyệt giữ tệp 10 phút).
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

await build({ entryPoints: ['src/ui/main.js'], bundle: true, format: 'iife', target: 'es2020', outfile: 'dist/app.js', logLevel: 'info' });

const hash = (f) => createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 10);
let html = readFileSync('index.html', 'utf8');
const before = html;
html = html.replace(/href="css\/style\.css(\?v=[^"]*)?"/, `href="css/style.css?v=${hash('css/style.css')}"`);
html = html.replace(/src="dist\/app\.js(\?v=[^"]*)?"/, `src="dist/app.js?v=${hash('dist/app.js')}"`);
if (!html.includes('style.css?v=') || !html.includes('app.js?v=')) throw new Error('Không tìm thấy thẻ CSS/JS trong index.html');
if (html !== before) writeFileSync('index.html', html);
console.log('index.html: đã gắn mã phiên bản cho CSS và JS');
