import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { toAsymptote } from '../src/export/asy.js';
import { EXAMPLES } from '../src/core/examples.js';
import { THU_VIEN } from '../src/core/thu-vien.js';

const hasAsy = (() => { try { execFileSync('asy', ['-version'], { stdio: 'ignore' }); return true; } catch { return false; } })();

test('Asymptote: biến pair theo nhãn, đoạn dùng tên điểm, nhãn là công thức', () => {
  const doc = EXAMPLES.euler_line.build();
  const code = toAsymptote(doc);
  assert.match(code, /^unitsize\(/m);
  assert.match(code, /^pair A = \(/m);
  assert.match(code, /draw\(A--B\);/);
  assert.match(code, /dot\("\$A\$", A, dir\(/);
  assert.match(code, /draw\(circle\(/);
  assert.doesNotMatch(code, /\$\$/);
});

test('Asymptote: mọi hình mẫu biên dịch được bằng asy', { skip: !hasAsy && 'máy không có asy' }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'asy-'));
  const docs = [...Object.entries(EXAMPLES).map(([k, e]) => [k, e.build()]), ...THU_VIEN.slice(0, 12).map((x) => [x.id, x.doc])];
  for (const [k, d] of docs) {
    const f = join(dir, k + '.asy');
    writeFileSync(f, toAsymptote(d, { trimLines: true }));
    execFileSync('asy', ['-f', 'pdf', '-noV', '-o', join(dir, k), f], { cwd: dir, stdio: 'ignore', timeout: 60000 });
    assert.ok(existsSync(join(dir, k + '.pdf')), k);
  }
});
