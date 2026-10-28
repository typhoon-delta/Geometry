import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { toTikZ, texLabel } from '../src/export/tikz.js';
import { EXAMPLES } from '../src/core/examples.js';

function decorated(doc) {
  const [A, B, C] = doc.steps.filter((s) => s.type === 'free_point').map((s) => s.id);
  doc.steps.push({ id: 'm1', type: 'angle_mark', args: [A, B, C], style: { arcs: 2, color: '#15803d' } });
  doc.steps.push({ id: 'm2', type: 'segment_mark', args: [A, B], style: { ticks: 3 } });
  doc.steps.push({ id: 'm3', type: 'polygon', args: [A, B, C], style: { color: '#ea580c', fill: 0.15, border: true } });
  doc.steps.push({ id: 'm4', type: 'angle_mark', args: [A, B, C], style: { color: '#123456' } });
  return doc;
}

test('nhãn LaTeX', () => {
  assert.equal(texLabel('A1'), '$A_{1}$');
  assert.equal(texLabel("A'"), "$A'$");
  assert.equal(texLabel('ω2'), '$\\omega_{2}$');
});

test('mã TikZ giữ màu, đánh dấu, nét đứt; đường thẳng bị cắt theo khung', () => {
  const doc = decorated(EXAMPLES.simson.build());
  doc.steps.find((s) => s.type === 'line').style = { dash: true, color: '#dc2626' };
  const t = toTikZ(doc);
  assert.match(t, /\\begin\{tikzpicture\}/);
  assert.match(t, /\\coordinate \(A\) at \(-0\.6, 3\.4\);/);
  assert.match(t, /\\definecolor\{xanhla\}\{HTML\}\{15803D\}/);
  assert.match(t, /\\definecolor\{c123456\}\{HTML\}\{123456\}/);
  assert.match(t, /\\draw\[do, dashed\] \(-?\d/);
  assert.equal((t.match(/arc\[start angle/g) || []).length, 3, 'hai cung + một cung');
  assert.equal((t.match(/\\draw\[\w*\] \(-?[\d.]+, -?[\d.]+\) -- \(-?[\d.]+, -?[\d.]+\);\n/g) || []).length >= 3, true, 'ba vạch đoạn');
  assert.match(t, /\\fill\[cam, fill opacity=0\.15\] \(A\) -- \(B\) -- \(C\) -- cycle;/);
  // không có NaN / undefined
  assert.doesNotMatch(t, /NaN|undefined|Infinity/);
});

const hasLatex = (() => {
  try { execFileSync('pdflatex', ['--version'], { stdio: 'ignore' }); return true; } catch { return false; }
})();

test('mã TikZ biên dịch được bằng pdflatex', { skip: !hasLatex && 'không có pdflatex' }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'tikz-'));
  const pics = Object.values(EXAMPLES).map((ex) => toTikZ(decorated(ex.build()))).join('\n\\bigskip\n\n');
  const tex = `\\documentclass{article}\n\\usepackage[utf8]{inputenc}\n\\usepackage{tikz}\n\\begin{document}\n${pics}\n\\end{document}\n`;
  writeFileSync(join(dir, 'hinh.tex'), tex);
  execFileSync('pdflatex', ['-interaction=nonstopmode', '-halt-on-error', 'hinh.tex'], { cwd: dir, stdio: 'pipe' });
  assert.ok(existsSync(join(dir, 'hinh.pdf')));
  if (process.env.TIKZ_OUT) copyFileSync(join(dir, 'hinh.pdf'), process.env.TIKZ_OUT);
});
