// Văn bản trong khung chữ (bản 1.4): chia bước, công thức KaTeX, liên kết tên điểm, xuất LaTeX.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitSteps, stepFrames, tokenize, linkNames, renderStep, toLatex, renameInText } from '../src/text/markup.js';

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
