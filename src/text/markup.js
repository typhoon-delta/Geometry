// VĂN BẢN trong khung chữ (bản 1.4): chữ thường + công thức LaTeX, chia BƯỚC để hiện dần khi trình bày.
// Thuần JS (dùng được trong Node để test / xuất tệp), chỉ phụ thuộc KaTeX.
//
// Cú pháp (gần với tệp .tex và markdown):
//   $...$ công thức trong dòng; $$...$$ hoặc \[...\] công thức riêng dòng (có thể nhiều dòng)
//   **đậm**, *nghiêng*; dòng bắt đầu "- " hoặc "* ": gạch đầu dòng; "1. ": đánh số; dòng trống: sang đoạn mới
//   ![](img:ID) ảnh đã dán vào hình (dữ liệu ảnh nằm trong doc.imageData)
//   dòng chỉ gồm --- (hoặc --- @k): ranh giới BƯỚC; @k = bước sau hiện cùng khung trình bày thứ k
import katex from 'katex';

const STEP_RE = /^\s*-{3,}\s*(?:@(\d+))?\s*$/;

/** Tách văn bản thành các bước: [{text, frame}] (frame: số khung 1-based nếu có @k, null nếu không). */
export function splitSteps(text) {
  const out = [{ text: '', frame: null }];
  for (const line of String(text ?? '').split('\n')) {
    const m = STEP_RE.exec(line);
    if (m) out.push({ text: '', frame: m[1] ? +m[1] : null });
    else out[out.length - 1].text += (out[out.length - 1].text ? '\n' : '') + line;
  }
  return out;
}

/**
 * Khung trình bày (0-based) mà từng bước bắt đầu hiện. Bước có @k: khung k−1; bước không ghi: ngay sau bước trước
 * (bước đầu: khung `from`). Vì vậy văn bản không có @k thì bước i hiện ở khung from + i.
 */
export function stepFrames(steps, from = 0) {
  const out = [];
  let prev = from - 1;
  steps.forEach((s, i) => {
    const f = s.frame != null ? s.frame - 1 : i === 0 ? from : prev + 1;
    out.push(f);
    prev = f;
  });
  return out;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Macro tiếng Việt cho hình học (dùng được trong công thức). */
export const MACROS = {
  '\\goc': '\\angle',
  '\\tamgiac': '\\triangle',
  '\\ssong': '\\parallel',
  '\\vgoc': '\\perp',
  '\\cung': '\\overset{\\frown}{#1}',
  '\\vecto': '\\overrightarrow{#1}',
};

/**
 * Tách một đoạn văn bản thành các mẩu: {t:'text'|'math'|'dmath'|'img', v}. Công thức được nhận trước nên dấu * trong
 * công thức không bị hiểu là chữ nghiêng.
 */
export function tokenize(src) {
  const out = [];
  let i = 0, buf = '', raw = '';
  const flush = () => { if (raw) { out.push({ t: 'text', v: buf, raw }); buf = raw = ''; } };
  while (i < src.length) {
    const c = src[i];
    if (c === '\\' && src[i + 1] === '$') { buf += '$'; raw += '\\$'; i += 2; continue; }
    if (c === '\\' && src[i + 1] === '[') {
      const j = src.indexOf('\\]', i + 2);
      if (j >= 0) { flush(); out.push({ t: 'dmath', v: src.slice(i + 2, j), o: '\\[', c: '\\]' }); i = j + 2; continue; }
    }
    if (c === '$' && src[i + 1] === '$') {
      const j = src.indexOf('$$', i + 2);
      if (j >= 0) { flush(); out.push({ t: 'dmath', v: src.slice(i + 2, j), o: '$$', c: '$$' }); i = j + 2; continue; }
    }
    if (c === '$') {
      let j = i + 1;
      while (j < src.length && !(src[j] === '$' && src[j - 1] !== '\\')) j++;
      if (j < src.length) { flush(); out.push({ t: 'math', v: src.slice(i + 1, j), o: '$', c: '$' }); i = j + 1; continue; }
    }
    if (c === '!' && src.startsWith('![](img:', i)) {
      const j = src.indexOf(')', i);
      if (j > 0) { flush(); out.push({ t: 'img', v: src.slice(i + 8, j), o: '![](img:', c: ')' }); i = j + 1; continue; }
    }
    buf += c;
    raw += c;
    i++;
  }
  flush();
  return out;
}

/** **đậm**, *nghiêng* trong chữ thường (đã thoát HTML). */
function inlineText(s) {
  return esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>');
}

/**
 * Gắn tên điểm trong công thức với đối tượng trên hình: tên khớp (dài nhất trước) được bọc \htmlData{p=id}{…} để khi
 * rê chuột vào thì tô sáng đối tượng. names: [{name, id}]. Bỏ qua tên lệnh (\angle…) và nội dung \text{…}.
 */
export function linkNames(tex, names) {
  return mapNames(tex, names, (f, id) => `\\htmlData{p=${id}}{${f}}`);
}

/** Các dạng viết của tên điểm (in hoa): A, I_A và I_{A}, B'… → [[dạng, id]] xếp dài trước. */
function nameForms(names) {
  const forms = [];
  for (const { name, id } of names || []) {
    if (!name || !/^[A-Z]/.test(name)) continue; // chỉ điểm đặt tên bằng chữ in hoa (A, I_A, M_{BC}, B')
    forms.push([name, id]);
    const m = /^(.+?)_([^{}])('*)$/.exec(name);
    if (m) forms.push([`${m[1]}_{${m[2]}}${m[3]}`, id]);
  }
  return forms.sort((a, b) => b[0].length - a[0].length);
}

/** Tên điểm khớp tại vị trí i (dài nhất trước, không cắt giữa chỉ số dưới / dấu phẩy) → [dạng, id] hoặc null. */
function nameAt(tex, i, forms) {
  if (!/[A-Z]/.test(tex[i])) return null;
  for (const [f, id] of forms) if (tex.startsWith(f, i)) {
    // sau tên mà còn "_" hay "'" thì tên dài hơn mới đúng (vd I_A chứ không phải I)
    const nx = tex[i + f.length];
    if (nx === '_' || nx === "'") continue;
    return [f, id];
  }
  return null;
}

/** Duyệt công thức, thay mỗi tên điểm bằng fn(dạng, id). Bỏ qua tên lệnh (\\angle…) và nội dung \\text{…}. */
function mapNames(tex, names, fn) {
  const forms = nameForms(names);
  if (!forms.length) return tex;
  let out = '', i = 0;
  while (i < tex.length) {
    if (tex[i] === '\\') {
      const m = /^\\([A-Za-z]+|.)/.exec(tex.slice(i));
      const cmd = m ? m[0] : '\\';
      if (cmd === '\\text' || cmd === '\\mathrm' || cmd === '\\textbf') {
        const j = matchBrace(tex, i + cmd.length);
        out += tex.slice(i, j);
        i = j;
        continue;
      }
      out += cmd;
      i += cmd.length;
      continue;
    }
    const hit = nameAt(tex, i, forms);
    if (hit) {
      out += fn(hit[0], hit[1]);
      i += hit[0].length;
    } else {
      out += tex[i];
      i++;
    }
  }
  return out;
}

/**
 * Đổi tên điểm trong văn bản khung chữ (khi đổi tên điểm trên hình). names: tên CŨ của mọi điểm [{name, id}];
 * renames: Map id → tên mới (đổi nhiều tên cùng lúc, vd đổi chỗ hai tên). Đổi trong công thức, và trong chữ thường chỉ
 * ở những "từ" ghép hoàn toàn từ tên điểm (vd "tam giác ABC") – không đụng tới "Ta", "Gọi"…
 */
export function renameInText(text, names, renames) {
  if (!text || !renames || !renames.size) return text;
  const forms = nameForms(names);
  const sub = (f, id) => (renames.has(id) ? renames.get(id) : f);
  return tokenize(text).map((tk) => {
    if (tk.t === 'math' || tk.t === 'dmath') return tk.o + mapNames(tk.v, names, sub) + tk.c;
    if (tk.t === 'img') return tk.o + tk.v + tk.c;
    return tk.raw.replace(/(^|[^\\\p{L}\d_])([A-Z][A-Za-z0-9_'{}]*)(?![\p{L}\d_'{}])/gu, (all, pre, word) => {
      // từ phải tách hết thành tên điểm, mới đổi
      const parts = [];
      for (let i = 0; i < word.length;) {
        const hit = nameAt(word, i, forms);
        if (!hit) return all;
        parts.push(hit);
        i += hit[0].length;
      }
      if (!parts.some(([, id]) => renames.has(id))) return all;
      const w = parts.map(([f, id]) => sub(f, id)).join('');
      // tên mới có chỉ số/phẩy mà nằm ngoài công thức thì bọc $…$ để hiện đúng (H → $H_1$)
      return pre + (/[_'{}]/.test(w) ? `$${w}$` : w);
    });
  }).join('');
}

function matchBrace(s, i) {
  if (s[i] !== '{') return i;
  let d = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === '{') d++;
    else if (s[j] === '}' && --d === 0) return j + 1;
  }
  return s.length;
}

const KATEX_OPTS = { throwOnError: false, strict: false, macros: MACROS, trust: (ctx) => ctx.command === '\\htmlData' };

export function renderMath(tex, display, names) {
  try {
    return katex.renderToString(linkNames(tex, names), { ...KATEX_OPTS, displayMode: display, macros: { ...MACROS } });
  } catch (e) {
    return `<span class="tex-err" title="${esc(e.message)}">${esc(tex)}</span>`;
  }
}

/**
 * Văn bản một bước → HTML. opts.names: tên điểm để liên kết; opts.image(id) → data URL (hoặc null).
 */
export function renderStep(text, opts = {}) {
  const blocks = [];
  // gom dòng thành khối: đoạn văn / danh sách; công thức riêng dòng có thể trải nhiều dòng nên tách mẩu trên cả đoạn
  const paras = String(text ?? '').split(/\n\s*\n/);
  for (const para of paras) {
    if (!para.trim()) continue;
    const lines = para.split('\n');
    if (lines.every((l) => /^\s*([-*]|\d+\.)\s+/.test(l) || !l.trim())) {
      const ordered = /^\s*\d+\./.test(lines[0]);
      const items = lines.filter((l) => l.trim()).map((l) => `<li>${renderInline(l.replace(/^\s*([-*]|\d+\.)\s+/, ''), opts)}</li>`);
      blocks.push(ordered ? `<ol>${items.join('')}</ol>` : `<ul>${items.join('')}</ul>`);
    } else {
      blocks.push(`<p>${renderInline(para, opts).replace(/\n/g, '<br>')}</p>`);
    }
  }
  return blocks.join('');
}

function renderInline(src, opts) {
  return tokenize(src).map((tk) => {
    if (tk.t === 'text') return inlineText(tk.v);
    if (tk.t === 'math') return renderMath(tk.v, false, opts.names);
    if (tk.t === 'dmath') return `<div class="dmath">${renderMath(tk.v, true, opts.names)}</div>`;
    const url = opts.image ? opts.image(tk.v) : null;
    return url ? `<img class="tb-img" src="${esc(url)}" alt="ảnh">` : '<span class="tb-noimg">[ảnh không có trong link chia sẻ – mở tệp .json để xem]</span>';
  }).join('');
}

// ======================= xuất LaTeX =======================
/** Văn bản (một bước) → mã LaTeX. imageFile(id) → tên tệp ảnh để \includegraphics. */
export function toLatex(text, imageFile = (id) => id + '.png') {
  const out = [];
  for (const para of String(text ?? '').split(/\n\s*\n/)) {
    if (!para.trim()) continue;
    const lines = para.split('\n');
    if (lines.every((l) => /^\s*([-*]|\d+\.)\s+/.test(l) || !l.trim())) {
      const env = /^\s*\d+\./.test(lines[0]) ? 'enumerate' : 'itemize';
      out.push([`\\begin{${env}}`, ...lines.filter((l) => l.trim()).map((l) => `  \\item ${latexInline(l.replace(/^\s*([-*]|\d+\.)\s+/, ''), imageFile)}`), `\\end{${env}}`].join('\n'));
    } else out.push(latexInline(para, imageFile).replace(/\n/g, '\\\\\n'));
  }
  return out.join('\n\n');
}

const TEXT_ESC = { '\\': '\\textbackslash{}', '#': '\\#', '%': '\\%', '&': '\\&', _: '\\_', '{': '\\{', '}': '\\}', '~': '\\textasciitilde{}', '^': '\\textasciicircum{}' };

function latexInline(src, imageFile) {
  return tokenize(src).map((tk) => {
    if (tk.t === 'math') return `$${tk.v}$`;
    if (tk.t === 'dmath') return `\\[${tk.v}\\]`;
    if (tk.t === 'img') return `\n\n\\begin{center}\\includegraphics[width=0.9\\linewidth]{${imageFile(tk.v)}}\\end{center}\n\n`;
    return tk.v.replace(/[\\#%&_{}~^]/g, (c) => TEXT_ESC[c])
      .replace(/\*\*([^*]+)\*\*/g, '\\textbf{$1}').replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1\\emph{$2}');
  }).join('');
}

/** Lời mở đầu của phiếu LaTeX (tiếng Việt: gói vietnam của vntex; TikZ cho hình). */
export const LATEX_PREAMBLE = String.raw`\documentclass[12pt,a4paper]{article}
\usepackage[utf8]{vietnam}
\usepackage{amsmath,amssymb,graphicx,tikz}
\usepackage[margin=2cm]{geometry}
\newcommand{\goc}{\angle}
\newcommand{\tamgiac}{\triangle}
\newcommand{\cung}[1]{\overset{\frown}{#1}}
\newcommand{\vecto}[1]{\overrightarrow{#1}}
\setlength{\parindent}{0pt}
\setlength{\parskip}{6pt}`;
