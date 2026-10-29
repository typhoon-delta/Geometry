// Xuất PHIẾU HỌC TẬP dạng LaTeX (bản 1.4): đề bài (chữ + ảnh), hình (TikZ), lời giải theo bước, ghi chú.
// Ảnh trong khung chữ được trả về riêng (tên tệp + data URL) để tải kèm, vì tệp .tex không chứa được ảnh.
import { toTikZ } from './tikz.js';
import { splitSteps, toLatex, LATEX_PREAMBLE } from '../text/markup.js';

/**
 * doc: hình (kèm doc.boxes), opts: {values, theme, trimLines, imageSrc(id) → data URL}.
 * Trả về {tex, files: [{name, dataURL}]}.
 */
export function toLatexHandout(doc, opts = {}) {
  const files = [];
  const imageFile = (id) => {
    const src = opts.imageSrc ? opts.imageSrc(id) : null;
    const ext = /^data:image\/(png|jpe?g)/.exec(src || '')?.[1]?.replace('jpeg', 'jpg') || 'png';
    const name = `anh-${files.length + 1}.${ext}`;
    if (src) files.push({ name, dataURL: src });
    return name;
  };
  const boxes = doc.boxes || [];
  const of = (role) => boxes.filter((b) => (b.role || 'ghichu') === role && b.text && b.text.trim());
  const L = [LATEX_PREAMBLE, '', '\\begin{document}'];
  if (doc.title) L.push(`\\section*{${esc(doc.title)}}`);
  for (const b of of('de')) L.push(`\\noindent\\textbf{${esc(b.title || 'Đề bài')}.} ` + splitSteps(b.text).map((s) => toLatex(s.text, imageFile)).join('\n\n'), '');
  const tikz = toTikZ(doc, { values: opts.values, theme: opts.theme, trimLines: opts.trimLines });
  if (doc.steps.length) L.push('\\begin{center}', tikz.trim(), '\\end{center}', '');
  for (const b of of('loigiai')) {
    const st = splitSteps(b.text).filter((s) => s.text.trim());
    L.push(`\\noindent\\textbf{${esc(b.title || 'Lời giải')}.}`);
    if (st.length > 1) L.push('\\begin{enumerate}', ...st.map((s) => `  \\item ${toLatex(s.text, imageFile)}`), '\\end{enumerate}');
    else if (st.length) L.push(toLatex(st[0].text, imageFile));
    L.push('');
  }
  for (const b of of('ghichu')) L.push(`\\noindent\\textbf{${esc(b.title || 'Ghi chú')}.} ` + splitSteps(b.text).map((s) => toLatex(s.text, imageFile)).join('\n\n'), '');
  L.push('\\end{document}', '');
  return { tex: L.join('\n'), files };
}

const esc = (s) => String(s).replace(/[\\#%&_{}~^$]/g, (c) => '\\' + c);
