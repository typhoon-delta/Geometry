// Chia sẻ (link), lưu/mở tệp JSON, lưu nháp tự động trong trình duyệt.
// Bản 1.5: lưu tất cả các tab vào MỘT tệp (định dạng "hinh-hoc-dong-bo"), mở nhiều tệp một lúc, kéo thả tệp .json,
// bản nháp ghi cả vào IndexedDB (chứa được ảnh lớn) kèm LỊCH SỬ bản nháp để khôi phục khi lỡ tay.

import { encodeDoc, decodeDoc, parseDocJSON, compactDoc } from '../io/codec.js';
import { idbGet, idbSet } from '../io/idb.js';
import { textDialog, toast, confirmDialog, promptDialog, modal } from './dialog.js';
import { downloadFile } from './download.js';

const DRAFT_KEY = 'hinh-hoc-dong:nhap'; // bản 1.0–1.2: một hình
const TABS_KEY = 'hinh-hoc-dong:nhap-tab'; // bản 1.3: mọi tab {t, active, tabs: [doc], meta: [{kho, savedSig}]}
const IDB_DRAFT = 'nhap'; // bản 1.5: như TABS_KEY, trong IndexedDB
const IDB_HIST = 'lich-su-nhap'; // bản 1.5: các bản chụp cũ [{t, active, tabs, meta}], mới nhất trước
const HIST_EVERY = 5 * 60e3;
const HIST_MAX = 12;
export const BUNDLE = 'hinh-hoc-dong-bo';

const roundBox = (bb) => bb.map((v) => Math.round(v * 1000) / 1000);

/** Tài liệu của tab i kèm khung nhìn (để mở lại đúng chỗ) và dữ liệu ảnh (nếu withImages). */
export function tabDoc(app, i, withImages = true) {
  const cur = i === app.tabIdx;
  const t = app.tabs[i];
  const bb = cur ? app.view.getBoundingBox() : t.bbox;
  const base = cur ? app.doc : t.doc;
  const doc = { ...base, ...(bb ? { view: { bbox: roundBox(bb) } } : {}) };
  return withImages ? app.withImageData(doc) : doc;
}

/** Tài liệu kèm khung nhìn hiện tại và dữ liệu ảnh. */
function docWithView(app, withImages = true) {
  return tabDoc(app, app.tabIdx, withImages);
}

/** Chữ ký nội dung (không tính khung nhìn): để biết tab đã đổi gì kể từ lần lưu cuối chưa. */
export function docSig(doc) {
  const s = JSON.stringify([doc.title || '', doc.steps, doc.boxes || null, doc.images || null]);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return s.length.toString(36) + '.' + h.toString(36);
}

export const isEmptyDoc = (d) => !d.steps.length && !(d.images || []).length && !(d.boxes || []).length;
const sameContent = (a, b) => JSON.stringify([a.steps, a.boxes || null]) === JSON.stringify([b.steps, b.boxes || null]);

/** Tab i có thay đổi chưa lưu ra tệp/kho không. */
export function tabDirty(app, i) {
  const d = i === app.tabIdx ? app.doc : app.tabs[i].doc;
  return !isEmptyDoc(d) && docSig(d) !== app.tabs[i].savedSig;
}

// ======================= bản nháp =======================
let draftWarned = false;
let lastHist = 0;

function draftPayload(app) {
  app.stashTab();
  return {
    t: Date.now(),
    active: app.tabIdx,
    tabs: app.tabs.map((_, i) => tabDoc(app, i)),
    meta: app.tabs.map((t) => ({ kho: t.kho || null, savedSig: t.savedSig || null })),
  };
}

/** Lưu nháp: localStorage (đồng bộ, kịp lúc đóng trang) + IndexedDB (chứa được ảnh lớn) + lịch sử 5 phút một lần. */
async function saveDraft(app, { unloading = false } = {}) {
  let d;
  try { d = draftPayload(app); } catch { return; }
  let lsOK = false;
  try {
    localStorage.setItem(TABS_KEY, JSON.stringify(d));
    lsOK = true;
  } catch {
    // quá dung lượng (ảnh lớn): để dấu, bản đầy đủ nằm trong IndexedDB
    try { localStorage.setItem(TABS_KEY, JSON.stringify({ t: d.t, inIdb: true })); } catch { /* bị chặn */ }
  }
  if (unloading) return;
  const ok = await idbSet(IDB_DRAFT, d);
  if (!lsOK && !ok && !draftWarned) {
    draftWarned = true;
    toast('Không lưu nháp được trong trình duyệt (trình duyệt chặn lưu hoặc hết chỗ) – hãy lưu tệp (Ctrl+S)', 6000);
  }
  if (ok && Date.now() - lastHist > HIST_EVERY && d.tabs.some((x) => !isEmptyDoc(x))) {
    const h = (await idbGet(IDB_HIST)) || [];
    const sig = d.tabs.map(docSig).join();
    if (!h[0] || h[0].tabs.map(docSig).join() !== sig) {
      h.unshift(d);
      await idbSet(IDB_HIST, h.slice(0, HIST_MAX));
    }
    lastHist = Date.now();
  }
}

function normalizeDraft(d) {
  if (!d || !Array.isArray(d.tabs)) return null;
  const tabs = [], meta = [];
  d.tabs.forEach((x, i) => {
    try { tabs.push(parseDocJSON(JSON.stringify(x))); meta.push((d.meta && d.meta[i]) || {}); } catch { /* bỏ tab hỏng */ }
  });
  return tabs.length ? { tabs, meta, active: Math.min(Math.max(0, d.active | 0), tabs.length - 1), t: d.t || 0 } : null;
}

async function loadDraft() {
  let a = null;
  try { const t = localStorage.getItem(TABS_KEY); if (t) a = JSON.parse(t); } catch { /* bỏ qua */ }
  const b = await idbGet(IDB_DRAFT);
  let d = a && Array.isArray(a.tabs) ? a : null;
  if (b && Array.isArray(b.tabs) && (!d || (b.t || 0) > (d.t || 0))) d = b;
  const n = normalizeDraft(d);
  if (n) return n;
  try {
    const old = localStorage.getItem(DRAFT_KEY);
    return old ? { tabs: [parseDocJSON(old)], meta: [{}], active: 0 } : null;
  } catch {
    return null;
  }
}

// ======================= chia sẻ, tệp =======================
export async function shareLink(app) {
  // ảnh dán vào không đưa vào link (link sẽ dài hàng trăm nghìn ký tự) – gửi tệp .json nếu cần cả ảnh
  const code = await encodeDoc(docWithView(app, false));
  if ((app.doc.images || []).length) toast('Link không chứa ảnh đã dán vào hình – muốn gửi cả ảnh thì lưu tệp (Ctrl+S)', 6000);
  const base = location.href.split('#')[0];
  const url = `${base}#h=${code}`;
  try { history.replaceState(null, '', '#h=' + code); } catch { /* file:// có thể chặn */ }
  const warn = location.protocol === 'file:' ? '<div class="modal-body">⚠ Trang đang mở từ tệp trên máy (file://). Link chỉ dùng được trên máy này; hãy dùng bản trên GitHub Pages để gửi cho người khác.</div>' : '';
  await textDialog('Link chia sẻ hình', url, `<div class="modal-body">Gửi link này: người nhận mở ra sẽ thấy đúng hình (toàn bộ hình nằm trong link, không cần máy chủ). Độ dài: ${url.length} ký tự.</div>${warn}`);
}

/** Hình chưa đặt tên thì hỏi tên (dùng làm tên tệp, tên tab). Trả về false nếu huỷ. */
export async function ensureTitle(app, what = 'tên tệp') {
  if (app.doc.title) return true;
  const v = await promptDialog('Đặt tên hình', '', `Tên dùng làm ${what} và tên tab, vd "VMO 2016 – Bài 4".`);
  if (v == null) return false;
  if (v.trim()) app.commit((doc) => { doc.title = v.trim(); });
  return true;
}

const pad = (n) => String(n).padStart(2, '0');
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

/** Ctrl+S: lưu tab đang mở thành tệp .json. */
export async function saveFile(app) {
  if (!(await ensureTitle(app))) return;
  const doc = compactDoc(docWithView(app));
  const name = `${fileSafeName(app.doc.title || 'hinh')}.json`;
  if (await downloadFile(name, JSON.stringify(doc, null, 1), 'application/json')) {
    app.tabs[app.tabIdx].savedSig = docSig(app.doc);
    app.emit('saved');
  }
}

/** Ctrl+Shift+S: lưu MỌI tab vào một tệp (giữ thứ tự tab, tab đang mở, khung nhìn, khung chữ, ảnh). */
export async function saveAllFiles(app) {
  app.stashTab();
  const idx = app.tabs.map((_, i) => i).filter((i) => !isEmptyDoc(i === app.tabIdx ? app.doc : app.tabs[i].doc));
  if (!idx.length) return toast('Chưa có hình nào để lưu');
  const tabs = idx.map((i) => compactDoc(tabDoc(app, i)));
  const data = { format: BUNDLE, version: 1, title: `Các hình ngày ${today()}`, active: Math.max(0, idx.indexOf(app.tabIdx)), tabs };
  if (await downloadFile(`cac-hinh-${today()}.json`, JSON.stringify(data, null, 1), 'application/json')) {
    for (const i of idx) app.tabs[i].savedSig = docSig(i === app.tabIdx ? app.doc : app.tabs[i].doc);
    app.emit('saved');
    toast(`Đã lưu ${idx.length} hình vào một tệp – mở lại bằng Ctrl+O`, 4000);
  }
}

/** Đọc nội dung tệp .json: một hình hoặc một bộ nhiều hình → {docs, active}. */
export function parseFileText(text) {
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('Tệp không phải JSON hợp lệ.'); }
  if (data && data.format === BUNDLE) {
    if (!Array.isArray(data.tabs)) throw new Error('Tệp bộ hình thiếu danh sách "tabs".');
    return { docs: data.tabs.map((x, i) => { try { return parseDocJSON(JSON.stringify(x)); } catch (e) { throw new Error(`Hình ${i + 1}: ${e.message}`); } }), active: data.active | 0 };
  }
  return { docs: [parseDocJSON(text)], active: 0 };
}

/** Mở các tệp (một hình hoặc bộ hình); hình giống hệt một tab đang mở thì không mở trùng. */
export async function openFiles(app, files) {
  let opened = 0, dup = 0, focus = -1;
  for (const f of files) {
    try {
      const { docs, active } = parseFileText(await f.text());
      docs.forEach((doc, k) => {
        if (!doc.title && docs.length === 1) doc.title = f.name.replace(/\.json$/i, '');
        const same = app.tabs.findIndex((t, i) => sameContent(i === app.tabIdx ? app.doc : t.doc, doc));
        if (same >= 0) { dup++; if (k === active) focus = same; return; }
        app.openDoc(doc, { savedSig: null });
        app.tabs[app.tabIdx].savedSig = docSig(app.doc);
        if (!doc.view) app.zoomFit();
        if (k === active) focus = app.tabIdx;
        opened++;
      });
    } catch (e) {
      await confirmDialog('Không mở được tệp', `<b>${escapeBr(f.name)}</b><br>${escapeBr(e.message)}`, 'OK');
    }
  }
  if (focus >= 0) app.switchTab(focus);
  app.emit('saved');
  if (opened || dup) toast(`Đã mở ${opened} hình` + (dup ? ` (${dup} hình đã đang mở – không mở trùng)` : ''));
}

export function openFile(app) {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.json,application/json';
  inp.multiple = true;
  inp.onchange = () => { if (inp.files.length) openFiles(app, [...inp.files]); };
  inp.click();
}

/** Tên tệp không dấu (một số trình duyệt bỏ qua tên tệp có ký tự ngoài ASCII). */
export function fileSafeName(title) {
  const t = title.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return t || 'hinh';
}

const escapeBr = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>');

// ======================= khôi phục bản nháp cũ =======================
const timeLabel = (t) => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())} – ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };

/** Tệp › Khôi phục bản nháp cũ…: chọn một mốc giờ, các hình lúc đó mở thành tab mới (không thay tab đang có). */
export async function restoreDialog(app) {
  const h = (await idbGet(IDB_HIST)) || [];
  if (!h.length) return confirmDialog('Khôi phục bản nháp cũ', 'Chưa có bản chụp nào. Chương trình tự chụp lại các hình đang mở <b>5 phút một lần</b> khi có thay đổi (giữ 12 bản gần nhất) – sau này lỡ đóng hay xoá nhầm thì vào đây.', 'OK');
  const pick = await modal((box, close) => {
    box.classList.add('wide');
    box.innerHTML = `<h3>Khôi phục bản nháp cũ</h3><div class="modal-body">Chọn một mốc: các hình lúc đó được mở thành <b>tab mới</b> (hình đang mở không bị thay).</div>
      <div class="pick-list">${h.map((d, i) => {
        const names = d.tabs.filter((x) => !isEmptyDoc(x)).map((x, k) => escapeBr(x.title || `Hình ${k + 1}`));
        return `<button class="pick" data-i="${i}"><b>${timeLabel(d.t)}</b><span>${names.length} hình: ${names.slice(0, 8).join(' · ')}${names.length > 8 ? ' …' : ''}</span></button>`;
      }).join('')}</div><div class="modal-actions"><button class="cancel">Đóng</button></div>`;
    box.querySelector('.cancel').onclick = () => close(null);
    box.querySelectorAll('.pick').forEach((b) => { b.onclick = () => close(+b.dataset.i); });
  });
  if (pick == null) return;
  const d = normalizeDraft(h[pick]);
  if (!d) return toast('Bản chụp này bị hỏng');
  let n = 0;
  d.tabs.forEach((doc) => {
    if (isEmptyDoc(doc) || app.tabs.some((t, i) => sameContent(i === app.tabIdx ? app.doc : t.doc, doc))) return;
    app.openDoc(doc);
    n++;
  });
  toast(n ? `Đã mở lại ${n} hình của lúc ${timeLabel(d.t)}` : 'Các hình của mốc này đều đang mở');
}

// ======================= khởi động =======================
/** Nạp hình lúc mở trang: khôi phục các tab lần trước, rồi mở hình trong link (#h=...) nếu có. */
export async function initShare(app) {
  const m = /[#&]h=([A-Za-z0-9_-]+)/.exec(location.hash);
  const d = await loadDraft();
  if (d && d.tabs.some((x) => !isEmptyDoc(x))) {
    app.loadDoc(d.tabs[0]);
    for (const x of d.tabs.slice(1)) app.newTab(x);
    d.meta.forEach((mt, i) => { if (app.tabs[i]) Object.assign(app.tabs[i], { kho: mt.kho || null, savedSig: mt.savedSig || null }); });
    app.switchTab(d.active);
    app.emit('saved');
    if (!m) toast('Đã khôi phục ' + (d.tabs.length > 1 ? `${d.tabs.length} hình đang mở lần trước` : 'bản nháp lần trước'));
  }
  if (m) {
    try {
      const doc = await decodeDoc(m[1]);
      // mở lại chính link vừa mở trước đó (đã có trong bản nháp): không tạo tab trùng
      const same = app.tabs.findIndex((t, i) => JSON.stringify((i === app.tabIdx ? app.doc : t.doc).steps) === JSON.stringify(doc.steps));
      if (same >= 0) app.switchTab(same);
      else { app.openDoc(doc); if (!doc.view) app.zoomFit(); }
      toast('Đã mở hình từ link');
    } catch (e) {
      toast(e.message, 5000);
    }
  }
  let timer = null;
  const later = (ms) => { clearTimeout(timer); timer = setTimeout(() => saveDraft(app), ms); };
  app.on('change', () => later(300));
  app.on('saved', () => later(300));
  app.view.onViewChange(() => later(600));
  window.addEventListener('beforeunload', () => saveDraft(app, { unloading: true }));
  app.saveDraftNow = () => saveDraft(app);
  later(500); // chụp ngay trạng thái lúc mở trang vào lịch sử bản nháp
}
