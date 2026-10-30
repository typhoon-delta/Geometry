// Xuất PHIẾU HỌC TẬP dạng LaTeX (bản 1.4): đề bài (chữ + ảnh), hình (TikZ), lời giải theo bước, ghi chú.
// Bản 1.5: phiếu cho cả BUỔI DẠY (nhiều bài một tệp, chỉ đề hoặc kèm lời giải).
// Ảnh trong khung chữ được trả về riêng (tên tệp + data URL) để tải kèm, vì tệp .tex không chứa được ảnh.
import { toTikZ } from './tikz.js';
import { splitSteps, toLatex, LATEX_PREAMBLE } from '../text/markup.js';

function imageNamer(files, imageSrc) {
  return (id) => {
    const src = imageSrc ? imageSrc(id) : null;
    const ext = /^data:image\/(png|jpe?g)/.exec(src || '')?.[1]?.replace('jpeg', 'jpg') || 'png';
    const name = `anh-${files.length + 1}.${ext}`;
    if (src) files.push({ name, dataURL: src });
    return name;
  };
}

/** Thân phiếu của một hình (không có lời mở đầu). opts.loiGiai = false: bỏ lời giải. */
function docBody(doc, opts, imageFile) {
  const boxes = doc.boxes || [];
  const of = (role) => boxes.filter((b) => (b.role || 'ghichu') === role && b.text && b.text.trim());
  const L = [];
  for (const b of of('de')) L.push(`\\noindent\\textbf{${esc(b.title || 'Đề bài')}.} ` + splitSteps(b.text).map((s) => toLatex(s.text, imageFile)).join('\n\n'), '');
  if (doc.steps.length) L.push('\\begin{center}', toTikZ(doc, { values: opts.values, theme: opts.theme, trimLines: opts.trimLines }).trim(), '\\end{center}', '');
  if (opts.loiGiai !== false) {
    for (const b of of('loigiai')) {
      const st = splitSteps(b.text).filter((s) => s.text.trim());
      L.push(`\\noindent\\textbf{${esc(b.title || 'Lời giải')}.}`);
      if (st.length > 1) L.push('\\begin{enumerate}', ...st.map((s) => `  \\item ${toLatex(s.text, imageFile)}`), '\\end{enumerate}');
      else if (st.length) L.push(toLatex(st[0].text, imageFile));
      L.push('');
    }
    for (const b of of('ghichu')) L.push(`\\noindent\\textbf{${esc(b.title || 'Ghi chú')}.} ` + splitSteps(b.text).map((s) => toLatex(s.text, imageFile)).join('\n\n'), '');
  }
  return L;
}

/**
 * doc: hình (kèm doc.boxes), opts: {values, theme, trimLines, imageSrc(id) → data URL}.
 * Trả về {tex, files: [{name, dataURL}]}.
 */
export function toLatexHandout(doc, opts = {}) {
  const files = [];
  const L = [LATEX_PREAMBLE, '', '\\begin{document}'];
  if (doc.title) L.push(`\\section*{${esc(doc.title)}}`);
  L.push(...docBody(doc, opts, imageNamer(files, opts.imageSrc)));
  L.push('\\end{document}', '');
  return { tex: L.join('\n'), files };
}

/**
 * Phiếu cho một buổi: items = [{title, docs: [doc có imageData]}] (một bài có thể nhiều hình).
 * opts: {title, subtitle, theme, trimLines, loiGiai}. Toạ độ tính lại cho từng hình.
 */
export function toLatexSet(items, opts = {}) {
  const files = [];
  const L = [LATEX_PREAMBLE, '', '\\begin{document}'];
  if (opts.title) L.push(`\\begin{center}{\\Large\\bfseries ${esc(opts.title)}}${opts.subtitle ? `\\\\[2pt]${esc(opts.subtitle)}` : ''}\\end{center}`, '');
  items.forEach((it, i) => {
    L.push(`\\subsection*{Bài ${i + 1}. ${esc(it.title || '')}}`);
    for (const doc of it.docs) {
      const name = imageNamer(files, (id) => (doc.imageData || {})[id] || null);
      L.push(...docBody(doc, { ...opts, values: undefined }, name));
    }
    if (i < items.length - 1) L.push('\\bigskip', '');
  });
  L.push('\\end{document}', '');
  return { tex: L.join('\n'), files };
}

const esc = (s) => String(s).replace(/[\\#%&_{}~^$]/g, (c) => '\\' + c);
