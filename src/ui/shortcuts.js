// PHÍM TẮT CÔNG CỤ (bản 1.6): Ctrl + chữ gọi thẳng công cụ (không phải mở menu 2–3 lần), sửa được, lưu trong trình
// duyệt. Có đối tượng đang chọn thì công cụ DỰNG NGAY trên chúng ("chọn trước, dựng sau" như Sketchpad): chọn hai đường
// rồi Ctrl+G là có giao điểm; chọn điểm và đường rồi Ctrl+U là có đường vuông góc.
// BẢNG LỆNH (Space): gõ vài chữ không dấu để tìm mọi công cụ, kể cả công cụ trong menu Công cụ và công cụ tự tạo.
import { TOOL_BY_ID } from './tools.js';
import { modal } from './dialog.js';

const KEY = 'hinh-hoc-dong:phim-tat';

// mặc định: chữ gợi nhớ (P point, G giao, M midpoint, D đoạn, L line, Q / Shift+O hình tròn, U ⊥, I ∥, J chân đường
// vuông góc, B bisector, E đối xứng). Tránh các tổ hợp trình duyệt không cho trang chặn (Ctrl+N/T/W, Ctrl+Shift+Q…).
export const DEFAULT_KEYS = {
  'Ctrl+P': 'point',
  'Ctrl+G': 'intersect',
  'Ctrl+M': 'midpoint',
  'Ctrl+D': 'segment',
  'Ctrl+L': 'line',
  'Ctrl+Shift+L': 'ray',
  'Ctrl+Q': 'circle',
  'Ctrl+Shift+O': 'circle_3pts',
  'Ctrl+U': 'perpendicular',
  'Ctrl+I': 'parallel',
  'Ctrl+J': 'projection',
  'Ctrl+B': 'angle_bisector',
  'Ctrl+Shift+M': 'perp_bisector',
  'Ctrl+E': 'reflect',
};

// tổ hợp không gán được: trình duyệt giữ, hoặc chương trình đã dùng
export const RESERVED = {
  'Ctrl+N': 'trình duyệt: cửa sổ mới', 'Ctrl+T': 'trình duyệt: tab mới', 'Ctrl+W': 'trình duyệt: đóng tab', 'Ctrl+Shift+N': 'trình duyệt',
  'Ctrl+Shift+T': 'trình duyệt', 'Ctrl+Shift+W': 'trình duyệt', 'Ctrl+Shift+Q': 'trình duyệt: thoát Chrome', 'Ctrl+Tab': 'trình duyệt', 'Ctrl+R': 'tải lại trang', 'Ctrl+Shift+R': 'tải lại trang',
  'Ctrl+Shift+I': 'công cụ nhà phát triển', 'Ctrl+Shift+J': 'công cụ nhà phát triển', 'Ctrl+Shift+C': 'công cụ nhà phát triển',
  'Ctrl+C': 'sao chép', 'Ctrl+V': 'dán', 'Ctrl+X': 'cắt', 'Ctrl+A': 'chọn tất cả',
  'Ctrl+Z': 'hoàn tác', 'Ctrl+Y': 'làm lại', 'Ctrl+Shift+Z': 'làm lại', 'Ctrl+S': 'lưu', 'Ctrl+Shift+S': 'lưu tất cả các tab',
  'Ctrl+O': 'mở tệp', 'Ctrl+K': 'mở kho bài', 'Ctrl+H': 'ẩn', 'Ctrl+Shift+H': 'hiện lại', 'Ctrl+Enter': 'soạn lời giải', 'Ctrl+/': 'bảng phím tắt',
};

let keymap = null; // {tổ hợp: id công cụ}

export function loadKeymap() {
  try {
    const k = JSON.parse(localStorage.getItem(KEY) || 'null');
    keymap = k && typeof k === 'object' ? k : { ...DEFAULT_KEYS };
  } catch { keymap = { ...DEFAULT_KEYS }; }
  return keymap;
}
function saveKeymap() {
  try { localStorage.setItem(KEY, JSON.stringify(keymap)); } catch { /* bỏ qua */ }
}
export const getKeymap = () => keymap || loadKeymap();

/** Phím tắt của công cụ (để hiện trên thanh công cụ), hoặc ''. */
export function keyOf(id) {
  for (const [k, v] of Object.entries(getKeymap())) if (v === id) return k;
  return '';
}

/** Sự kiện bàn phím → chuỗi tổ hợp "Ctrl+Shift+L". null nếu chỉ là phím bổ trợ. */
export function comboOf(e) {
  let k;
  if (/^Key[A-Z]$/.test(e.code)) k = e.code.slice(3);
  else if (/^Digit\d$/.test(e.code)) k = e.code.slice(5);
  else if (e.code === 'Slash') k = '/';
  else if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return null;
  else k = e.key.length === 1 ? e.key.toUpperCase() : e.key;
  return `${e.ctrlKey || e.metaKey ? 'Ctrl+' : ''}${e.altKey ? 'Alt+' : ''}${e.shiftKey ? 'Shift+' : ''}${k}`;
}

const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

/** Danh sách công cụ cho bảng lệnh / bảng phím tắt: [{id, label, group}]. */
function allTools(app) {
  const out = [];
  const seen = new Set();
  for (const g of app.toolbarGroups || []) {
    for (const id of g.tools) {
      const t = TOOL_BY_ID[id];
      if (!t || seen.has(id) || id === 'move') continue;
      seen.add(id);
      out.push({ id, label: t.label, group: t.menu ? t.menu.replace(/^\d+\.\s*/, '') : g.label });
    }
  }
  return out;
}

/** Lọc công cụ theo chữ gõ (không dấu, mọi từ đều phải có; từ viết tắt khớp chữ đầu: "dtnt" → đường tròn nội tiếp). */
export function searchTools(list, q, recent = []) {
  const words = fold(q).split(/\s+/).filter(Boolean);
  const score = (t) => {
    const name = fold(t.label), hay = name + ' ' + fold(t.group) + ' ' + t.id.replace(/_/g, ' ');
    if (!words.length) return recent.includes(t.id) ? 100 - recent.indexOf(t.id) : 0;
    const initials = name.split(/[^a-z0-9]+/).filter(Boolean).map((w) => w[0]).join('');
    let s = 0;
    for (const w of words) {
      if (name.startsWith(w)) s += 30;
      else if (new RegExp(`(^|[^a-z])${w}`).test(name)) s += 20;
      else if (hay.includes(w)) s += 8;
      else if (w.length >= 2 && initials.includes(w)) s += 12;
      else return -1;
    }
    return s + (recent.includes(t.id) ? 5 : 0) - name.length / 100;
  };
  return list.map((t) => [score(t), t]).filter(([s]) => s >= 0).sort((a, b) => b[0] - a[0]).map(([, t]) => t);
}

export function setupShortcuts(app) {
  loadKeymap();

  document.addEventListener('keydown', (e) => {
    if (document.querySelector('.modal-back')) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
    if (app.mode !== 'edit') return;
    // Space: bảng lệnh
    if (e.key === ' ' && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); palette(); return; }
    const c = comboOf(e);
    if (c === 'Ctrl+/' || c === 'Ctrl+Shift+/') { e.preventDefault(); keysDialog(); return; }
    const id = c && getKeymap()[c];
    if (id && TOOL_BY_ID[id]) { e.preventDefault(); e.stopPropagation(); app.activateTool(id); }
  }, true);

  // ---------- bảng lệnh ----------
  async function palette() {
    const list = allTools(app);
    const recent = app.recentTools || [];
    const id = await modal((box, close) => {
      box.classList.add('palette');
      box.innerHTML = `<input type="text" class="pal-q" placeholder="Gõ tên công cụ (không cần dấu): giao, vuong goc, ngoai tiep, dtnt…" spellcheck="false" autocomplete="off"><div class="pal-list"></div>
        <div class="pal-foot">↑↓ chọn · Enter dùng · Esc đóng · <kbd>Ctrl+/</kbd> xem và sửa phím tắt${app.selection.size ? ` · đang chọn ${app.selection.size} đối tượng: dựng ngay trên chúng nếu hợp` : ''}</div>`;
      const inp = box.querySelector('.pal-q'), host = box.querySelector('.pal-list');
      let rows = [], cur = 0;
      const paint = () => {
        rows = searchTools(list, inp.value, recent).slice(0, 12);
        cur = Math.min(cur, Math.max(0, rows.length - 1));
        host.innerHTML = rows.length ? rows.map((t, i) => `<button class="pal-row ${i === cur ? 'on' : ''}" data-i="${i}"><span class="pal-ti">${TOOL_BY_ID[t.id].icon || ''}</span><span class="pal-l">${t.label}</span><span class="pal-g">${t.group}</span>${keyOf(t.id) ? `<kbd>${keyOf(t.id)}</kbd>` : ''}</button>`).join('') : '<div class="note">Không có công cụ nào khớp.</div>';
      };
      inp.oninput = () => { cur = 0; paint(); };
      inp.onkeydown = (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); cur = Math.min(rows.length - 1, cur + 1); paint(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); cur = Math.max(0, cur - 1); paint(); }
        else if (e.key === 'Enter') { e.preventDefault(); if (rows[cur]) close(rows[cur].id); }
      };
      host.onclick = (e) => { const b = e.target.closest('[data-i]'); if (b) close(rows[+b.dataset.i].id); };
      paint();
    });
    if (id) app.activateTool(id);
  }

  // ---------- bảng phím tắt (xem + sửa) ----------
  async function keysDialog() {
    const list = allTools(app);
    await modal((box, close) => {
      box.classList.add('wide', 'keys-win');
      box.innerHTML = `<h3>Phím tắt</h3>
        <div class="modal-body">Bấm vào ô phím của một công cụ rồi nhấn tổ hợp muốn dùng (nên dùng <kbd>Ctrl</kbd> + chữ, hoặc <kbd>Ctrl+Shift</kbd> + chữ); <kbd>Backspace</kbd> để bỏ phím. Đang chọn sẵn đối tượng thì phím tắt dựng ngay trên chúng. <kbd>Space</kbd>: tìm công cụ theo tên.</div>
        <input type="text" class="keys-q" placeholder="Lọc công cụ…" spellcheck="false">
        <div class="keys-list"></div>
        <details class="keys-fixed"><summary>Các phím cố định khác</summary><div class="keys-grid">${Object.entries({
          'Space': 'tìm công cụ theo tên', 'Esc': 'huỷ / về công cụ Chọn', 'Ctrl+Z / Ctrl+Y': 'hoàn tác / làm lại', 'Delete': 'xoá đối tượng đang chọn',
          'Ctrl+H / Ctrl+Shift+H': 'ẩn đối tượng đang chọn / hiện lại tất cả', 'Alt + bấm': 'ẩn ngay đối tượng được bấm', 'gõ chữ / F2': 'đặt tên điểm đang chọn',
          'Shift + bấm/kéo': 'căn hướng ngang, dọc, bước 15°', 'Home': 'thu phóng vừa hình', 'Ctrl+S': 'lưu (vào kho nếu đã kết nối)', 'Ctrl+Shift+S': 'lưu tất cả các tab ra tệp',
          'Ctrl+O': 'mở tệp', 'Ctrl+K': 'mở kho bài', 'Ctrl+Enter': 'soạn lời giải', 'Alt+1…9': 'sang tab thứ n', 'Ctrl+/': 'bảng này',
        }).map(([k, v]) => `<kbd>${k}</kbd><span>${v}</span>`).join('')}</div></details>
        <div class="k-msg note"></div>
        <div class="modal-actions"><button class="k-reset" style="margin-right:auto">Về mặc định</button><button class="primary">Xong</button></div>`;
      const host = box.querySelector('.keys-list'), q = box.querySelector('.keys-q'), msg = box.querySelector('.k-msg');
      let waiting = null;
      const paint = () => {
        const rows = q.value.trim() ? searchTools(list, q.value) : list;
        host.innerHTML = rows.map((t) => `<div class="key-row"><span class="kr-l">${t.label}</span><span class="kr-g">${t.group}</span><button class="kr-k ${waiting === t.id ? 'wait' : ''}" data-id="${t.id}">${waiting === t.id ? 'nhấn phím…' : keyOf(t.id) || '<i>—</i>'}</button></div>`).join('');
      };
      host.onclick = (e) => { const b = e.target.closest('[data-id]'); if (!b) return; waiting = b.dataset.id; msg.textContent = ''; paint(); host.querySelector('.kr-k.wait')?.focus(); };
      // nghe ở cấp trang: vẽ lại danh sách làm nút đang bấm mất tiêu điểm
      const onKey = (e) => {
        if (!waiting || e.target === q || !box.isConnected) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.key === 'Escape') { waiting = null; paint(); return; }
        if (e.key === 'Backspace' || e.key === 'Delete') { for (const [k, v] of Object.entries(keymap)) if (v === waiting) delete keymap[k]; saveKeymap(); waiting = null; app.buildToolbar(); paint(); return; }
        const c = comboOf(e);
        if (!c) return;
        msg.classList.remove('ok');
        if (!/^Ctrl\+|^Alt\+/.test(c) || /^Alt\+\d$/.test(c)) { msg.textContent = 'Hãy dùng Ctrl + chữ (hoặc Ctrl+Shift + chữ): chữ đơn đang dùng để gõ tên điểm, Alt+số để chuyển tab.'; return; }
        if (RESERVED[c]) { msg.textContent = `${c} đã dùng cho ${RESERVED[c]} – chọn tổ hợp khác.`; return; }
        const old = keymap[c];
        for (const [k, v] of Object.entries(keymap)) if (v === waiting) delete keymap[k];
        keymap[c] = waiting;
        saveKeymap();
        msg.textContent = old && old !== waiting && TOOL_BY_ID[old] ? `${c} trước đây là của "${TOOL_BY_ID[old].label}" – đã chuyển sang công cụ này.` : `Đã gán ${c}.`;
        msg.classList.add('ok');
        waiting = null;
        app.buildToolbar();
        paint();
      };
      document.addEventListener('keydown', onKey, true);
      const done = (v) => { document.removeEventListener('keydown', onKey, true); close(v); };
      q.oninput = paint;
      box.querySelector('.k-reset').onclick = () => { keymap = { ...DEFAULT_KEYS }; saveKeymap(); app.buildToolbar(); msg.textContent = 'Đã đặt lại phím tắt mặc định.'; paint(); };
      box.querySelector('.primary').onclick = () => done(true);
      paint();
    });
  }

  const b = document.getElementById('btn-keys');
  if (b) b.onclick = () => keysDialog();
  const p = document.getElementById('btn-palette');
  if (p) p.onclick = () => palette();
  app.buildToolbar();
  return { palette, keysDialog };
}

