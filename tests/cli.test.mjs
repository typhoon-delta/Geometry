import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('dòng lệnh: khám phá tệp JSON và xuất TikZ', () => {
  const out = JSON.parse(execFileSync('node', ['scripts/kham-pha.mjs', 'examples/euler_line.json'], { encoding: 'utf8' }));
  assert.equal(out.relations[0].type, 'collinear');
  assert.match(out.relations[0].text, /O, G, H thẳng hàng/);
  const tex = execFileSync('node', ['scripts/tikz.mjs', 'examples/simson.json', '--width', '8'], { encoding: 'utf8' });
  assert.match(tex, /\\begin\{tikzpicture\}\[x=[\d.]+cm/);
});
