// Văn bản trong khung chữ (bản 1.4): chia bước, công thức KaTeX, liên kết tên điểm, xuất LaTeX.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { splitSteps, stepFrames, tokenize, linkNames, renderStep, toLatex, renameInText } from '../src/text/markup.js';
import { toLatexHandout, toLatexSet } from '../src/export/latex.js';

test('chia bước bằng ---, @k gắn khung trình bày', () => {
  const st = splitSteps('Gọi $M$ là trung điểm.\n---\nTa có $MB=MC$.\n--- @5\nVậy …');
  assert.equal(st.length, 3);
  assert.deepEqual(st.map((s) => s.frame), [null, null, 5]);
  assert.deepEqual(stepFrames(st, 2), [2, 3, 4]);
  assert.deepEqual(stepFrames(splitSteps('a\n---\nb\n---\nc'), 0), [0, 1, 2]);
});

test('tách mẩu: công thức trước, \\$ là đô-la thường, ảnh', () => {
  const t = tokenize('Giá \\$5, $a*b$ và **đậm** $$x^2$$ \\[y\\] ![](img:abc)');
  assert.deepEqual(t.map((x) => x.t), ['text', 'math', 'text', 'dmath', 'text', 'dmath', 'text', 'img']);
  assert.equal(t[0].v, 'Giá $5, ');
  assert.equal(t[7].v, 'abc');
});

test('liên kết tên điểm: dài nhất trước, bỏ qua lệnh và \\text', () => {
  const names = [{ name: 'A', id: 's1' }, { name: 'I', id: 's2' }, { name: 'I_A', id: 's3' }, { name: "B'", id: 's4' }, { name: 'B', id: 's5' }, { name: 'C', id: 's6' }];
  const r = linkNames("\\angle BAC + I_A I + B' \\text{AB}", names);
  assert.match(r, /\\angle \\htmlData\{p=s5\}\{B\}\\htmlData\{p=s1\}\{A\}\\htmlData\{p=s6\}\{C\}/);
  assert.match(r, /\\htmlData\{p=s3\}\{I_A\} \\htmlData\{p=s2\}\{I\}/);
  assert.match(r, /\\htmlData\{p=s4\}\{B'\}/);
  assert.match(r, /\\text\{AB\}/);
  assert.match(linkNames('I_{A}', names), /\\htmlData\{p=s3\}\{I_\{A\}\}/);
});

test('hiển thị: đoạn, danh sách, công thức KaTeX (cả macro \\goc), gắn data-p', () => {
  const html = renderStep('Chứng minh **đẹp**: $\\goc BAC = 90^\\circ$\n\n- ý một\n- ý hai\n\n$$\\frac{AB}{AC}$$', { names: [{ name: 'A', id: 's1' }] });
  assert.match(html, /<b>đẹp<\/b>/);
  assert.match(html, /<ul><li>ý một<\/li><li>ý hai<\/li><\/ul>/);
  assert.match(html, /class="katex"/);
  assert.match(html, /katex-display/);
  assert.match(html, /data-p="s1"/);
  assert.doesNotMatch(html, /tex-err|katex-error/);
});

test('công thức sai không làm hỏng cả khung', () => {
  const html = renderStep('Trước $\\frac{a$ sau');
  assert.match(html, /Trước/);
  assert.match(html, /sau/);
});

test('xuất LaTeX: thoát ký tự đặc biệt ngoài công thức, giữ công thức, danh sách, ảnh', () => {
  const t = toLatex('Lãi 50% & **đậm** $a_1$\n\n1. một\n2. hai\n\n![](img:x1)', (id) => `de-${id}.png`);
  assert.match(t, /Lãi 50\\% \\& \\textbf\{đậm\} \$a_1\$/);
  assert.match(t, /\\begin\{enumerate\}\n  \\item một\n  \\item hai\n\\end\{enumerate\}/);
  assert.match(t, /\\includegraphics\[width=0\.9\\linewidth\]\{de-x1\.png\}/);
});

test('đổi tên điểm: chữ trong khung đổi theo (công thức, từ toàn tên điểm), không đụng chữ thường', () => {
  const names = [['A', 'a'], ['B', 'b'], ['C', 'c'], ['A_1', 'a1'], ['H', 'h'], ['T', 't'], ['G', 'g']].map(([name, id]) => ({ name, id }));
  const t = 'Cho tam giác ABC, trực tâm H. Ta có $\\angle BAC = \\angle BHC$, $A_1A$, $A_{1}$, \\$A\n---\nGọi $$\\frac{AB}{AC}\\text{ A}$$ ![](img:Ab)';
  const r = renameInText(t, names, new Map([['a', 'D'], ['h', 'H_1'], ['t', 'X'], ['g', 'K']]));
  assert.equal(r, 'Cho tam giác DBC, trực tâm $H_1$. Ta có $\\angle BDC = \\angle BH_1C$, $A_1D$, $A_{1}$, \\$D\n---\nGọi $$\\frac{DB}{DC}\\text{ A}$$ ![](img:Ab)');
  // đổi chỗ hai tên cùng lúc
  assert.equal(renameInText('$AB$ và AB', names, new Map([['a', 'B'], ['b', 'A']])), '$BA$ và BA');
  // không có gì đổi thì giữ nguyên từng ký tự
  assert.equal(renameInText(t, names, new Map([['c', 'C']])), t);
});

test('lệnh LaTeX ngoài công thức: \\textbf, \\(..\\), align*, itemize, \\\\, ~, --', () => {
  const html = renderStep('\\textbf{Lời giải.} Ta có \\(AB = AC\\) và \\emph{do đó}~xong -- hết.\\\\Dòng mới\n\\begin{align*} a &= b \\\\ c &= d \\end{align*}\n\n\\begin{enumerate}\n\\item Ý một\n\\item Ý \\textbf{hai}\n\\end{enumerate}');
  assert.match(html, /<b>Lời giải\.<\/b>/);
  assert.match(html, /<i>do đó<\/i>&nbsp;xong – hết\.<br>Dòng mới/);
  assert.match(html, /katex-display/);
  assert.match(html, /<ol><li>Ý một<\/li><li>Ý <b>hai<\/b><\/li><\/ol>/);
  assert.doesNotMatch(html.replace(/<annotation[\s\S]*?<\/annotation>/g, ''), /\\textbf|\\begin|\\item|tex-err|katex-error/);
});

test('\\widehat, \\overrightarrow: không chèn <br> vào hình SVG của KaTeX', () => {
  const html = renderStep('$\\widehat{ABC}$ và\n$\\overrightarrow{AB}$', { names: [{ name: 'A', id: 's1' }] });
  const svgs = html.match(/<svg[\s\S]*?<\/svg>/g) || [];
  assert.ok(svgs.length >= 2);
  for (const s of svgs) assert.doesNotMatch(s, /<br>/);
  assert.match(html, /và<br>/, 'xuống dòng trong chữ vẫn là <br>');
});

test('xuất LaTeX: giữ nguyên lệnh LaTeX, thoát %, không chèn \\\\ vào công thức', () => {
  const tex = toLatex('\\textbf{Lời giải.} Ta có $\\widehat{ABC}=90^\\circ$ và 50% số điểm\n$$\na = b\n$$\nVì vậy\n\\begin{itemize}\n\\item một\n\\end{itemize}');
  assert.match(tex, /^\\textbf\{Lời giải\.\} Ta có \$\\widehat\{ABC\}=90\^\\circ\$ và 50\\% số điểm/);
  assert.match(tex, /\\\[\na = b\n\\\]/, 'công thức riêng dòng giữ nguyên, không có \\\\ bên trong');
  assert.match(tex, /\nVì vậy\n\\begin\{itemize\}\n\\item một\n\\end\{itemize\}/, 'không ngắt dòng quanh \\begin, \\item');
  assert.equal(toLatex('Dòng 1\nDòng 2'), 'Dòng 1 \\\\\nDòng 2');
  assert.equal(toLatex('a\\%b 5% x_1'), 'a\\%b 5\\% x\\_1');
});

const hasLatex = (() => {
  try { execFileSync('pdflatex', ['--version'], { stdio: 'ignore' }); return true; } catch { return false; }
})();

test('phiếu LaTeX (một bài và cả buổi) biên dịch được bằng pdflatex', { skip: !hasLatex && 'không có pdflatex' }, () => {
  const lib = JSON.parse(readFileSync(new URL('../examples/thu-vien/imo2008-1.json', import.meta.url), 'utf8'));
  const doc = { ...lib, boxes: [
    { id: 'a', role: 'de', text: 'Chứng minh $\\widehat{BHC} = 180^\\circ - \\widehat{A}$, $\\overrightarrow{HA} \\ne \\vec{0}$, cung $\\wideparen{BC}$, 50% số điểm, $AB \\ssong CD$, $\\cung{AB}$.' },
    { id: 'b', role: 'loigiai', text: '\\textbf{Ý a.} Ta có\n\\begin{align*}\n\\widehat{BHC} &= 180^\\circ - \\widehat{HBC} \\\\\n&= 180^\\circ - \\widehat{A}.\n\\end{align*}\nDo đó\n$$\nM_aA_1 = M_aA_2\n$$\n---\n\\begin{itemize}\n\\item $\\triangle ABC \\backsim \\triangle A\'B\'C\'$;\n\\item $\\measuredangle (AB, CD) = 90^\\circ$, \\(AB \\nparallel CD\\).\n\\end{itemize}\nVậy **sáu điểm** đồng viên. (đpcm)\n\n- ý một\n- ý hai' },
  ] };
  const dir = mkdtempSync(join(tmpdir(), 'phieu-'));
  writeFileSync(join(dir, 'phieu.tex'), toLatexHandout(doc, {}).tex);
  writeFileSync(join(dir, 'buoi.tex'), toLatexSet([{ title: 'IMO 2008 – Bài 1', docs: [doc] }, { title: 'Bài 2', docs: [doc] }], { title: 'Buổi 5', subtitle: '11 Toán', loiGiai: true }).tex);
  for (const f of ['phieu', 'buoi']) {
    execFileSync('pdflatex', ['-interaction=nonstopmode', '-halt-on-error', f + '.tex'], { cwd: dir, stdio: 'pipe' });
    assert.ok(existsSync(join(dir, f + '.pdf')));
  }
});
