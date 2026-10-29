// GÕ NHANH trong khung chữ (bản 1.4): hai loại quy tắc, thầy/cô sửa được (lưu trong trình duyệt).
//   TỰ ĐỔI  – chỉ trong công thức, đổi ngay khi gõ xong chuỗi (không cần Tab): <= → \le, ff → \frac{}{}…
//   GÕ TẮT  – bắt đầu bằng ";" rồi nhấn Tab (ở đâu cũng được): ;g → \angle, ;cm → **Chứng minh.**…
// Tiền tố ";" để không đụng bộ gõ tiếng Việt (Telex/VNI dùng các chữ s f r x j w z, dd, các số).
// Thay thế có thể chứa ô nhảy ${} (Tab để sang ô tiếp theo), theo cú pháp snippet của CodeMirror.

export const DEFAULT_AUTO = [
  ['iff', '\\Leftrightarrow '], ['<->', '\\leftrightarrow '], ['=>', '\\Rightarrow '], ['->', '\\to '],
  ['<=', '\\le '], ['>=', '\\ge '], ['!=', '\\ne '], ['~=', '\\cong '], ['~~', '\\sim '], ['+-', '\\pm '],
  ['^o', '^\\circ'], ['//', '\\parallel '], ['_|_', '\\perp '], ['...', '\\dots '], ['xx', '\\times '], ['**', '\\cdot '],
  ['ff', '\\frac{${}}{${}}'], ['sqrt', '\\sqrt{${}}'], ['vec', '\\overrightarrow{${}}'], ['bar', '\\overline{${}}'], ['hat', '\\widehat{${}}'],
  ['goc', '\\angle '], ['tgiac', '\\triangle '], ['inf', '\\infty '], ['sum', '\\sum_{${}}^{${}}'],
  ['al', '\\alpha '], ['be', '\\beta '], ['ga', '\\gamma '], ['de', '\\delta '], ['ph', '\\varphi '], ['om', '\\omega '], ['pi', '\\pi '],
];

export const DEFAULT_SHORT = [
  [';g', '\\angle '], [';tg', '\\triangle '], [';ss', '\\parallel '], [';vg', '\\perp '], [';bn', '\\cong '], [';dd', '\\sim '],
  [';fr', '\\frac{${}}{${}}'], [';gh', '\\widehat{${}}'], [';vt', '\\overrightarrow{${}}'], [';cung', '\\overset{\\frown}{${}}'],
  [';dt', '$$\n${}\n$$'], [';he', '\\begin{cases} ${} \\\\ ${} \\end{cases}'], [';ho', '\\left[\\begin{array}{l} ${} \\\\ ${} \\end{array}\\right.'],
  [';cm', '**Chứng minh.** '], [';dpcm', '(đpcm)'], [';gs', 'Giả sử '], [';ta', 'Ta có '], [';suyra', 'Suy ra '], [';vay', 'Vậy '],
  [';tgnt', 'tứ giác nội tiếp'], [';dtnt', 'đường tròn ngoại tiếp'], [';buoc', '\n---\n'],
];

/** Văn bản sửa được của bộ quy tắc. */
export function serializeRules(r) {
  return ['# Tự đổi trong công thức (gõ xong là đổi)', '[tự đổi]', ...r.auto.map(([a, b]) => `${a} => ${esc(b)}`), '',
    '# Gõ tắt: gõ rồi nhấn Tab', '[gõ tắt]', ...r.short.map(([a, b]) => `${a} => ${esc(b)}`)].join('\n');
}
const esc = (s) => s.replace(/\n/g, '\\n');

export function parseRules(text) {
  const r = { auto: [], short: [] };
  let cur = null;
  for (const raw of String(text).split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (/^\[tự đổi\]$/i.test(line)) { cur = r.auto; continue; }
    if (/^\[gõ tắt\]$/i.test(line)) { cur = r.short; continue; }
    const i = line.indexOf(' => ');
    if (i <= 0 || !cur) continue;
    cur.push([line.slice(0, i).trim(), raw.slice(raw.indexOf(' => ') + 4).replace(/\\n/g, '\n')]);
  }
  return r;
}

export const defaultRules = () => ({ auto: DEFAULT_AUTO.map((x) => [...x]), short: DEFAULT_SHORT.map((x) => [...x]) });

/** Con trỏ (văn bản phía trước là `before`) có đang ở trong công thức không: $…$, $$…$$, \[…\]. */
export function inMath(before) {
  let inline = false, display = false;
  for (let i = 0; i < before.length; i++) {
    const c = before[i];
    if (c === '\\') {
      const n = before[i + 1];
      if (n === '[' && !inline) display = true;
      else if (n === ']') display = false;
      i++;
      continue;
    }
    if (c === '$') {
      if (before[i + 1] === '$') { if (!inline) display = !display; i++; }
      else if (!display) inline = !inline;
    }
  }
  return inline || display;
}

/**
 * Quy tắc TỰ ĐỔI nào khớp ngay trước con trỏ? Ưu tiên chuỗi dài nhất. Quy tắc toàn chữ (ff, goc, sqrt) chỉ khớp khi
 * đứng trước nó không phải chữ cái hay "\" – để không đổi nhầm giữa một lệnh hay một từ (vd \diff, \text{off}).
 * Trả về {len, rep} hoặc null.
 */
export function matchAuto(before, rules) {
  let best = null;
  for (const [t, rep] of rules) {
    if (!t || !before.endsWith(t)) continue;
    if (/^[A-Za-z]+$/.test(t) && /[A-Za-z\\]/.test(before[before.length - t.length - 1] || '')) continue;
    if (!best || t.length > best.len) best = { len: t.length, rep };
  }
  return best;
}

/** Gõ tắt ";…" ngay trước con trỏ (khi nhấn Tab). */
export function matchShort(before, rules) {
  const m = /;[^\s;$\\{}]+$/.exec(before);
  if (!m) return null;
  const r = rules.find(([t]) => t === m[0]);
  return r ? { len: m[0].length, rep: r[1] } : null;
}
