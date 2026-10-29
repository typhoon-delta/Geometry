// Chia sẻ (link), lưu/mở tệp JSON, lưu nháp tự động trong trình duyệt.

import { encodeDoc, decodeDoc, parseDocJSON, compactDoc } from '../io/codec.js';
import { textDialog, toast, confirmDialog } from './dialog.js';

const DRAFT_KEY = 'hinh-hoc-dong:nhap'; // bản 1.0–1.2: một hình
const TABS_KEY = 'hinh-hoc-dong:nhap-tab'; // bản 1.3: mọi tab {active, tabs: [doc]}

const roundBox = (bb) => bb.map((v) => Math.round(v * 1000) / 1000);

/** Tài liệu kèm khung nhìn hiện tại (để mở lại đúng chỗ) và dữ liệu các ảnh dán vào (nếu có). */
function docWithView(app, withImages = true) {
  const doc = { ...app.doc, view: { bbox: roundBox(app.view.getBoundingBox()) } };
  return withImages ? app.withImageData(doc) : doc;
}

let draftWarned = false;
function saveDraft(app) {
  try {
    app.stashTab();
    const tabs = app.tabs.map((t, i) => app.withImageData(i === app.tabIdx ? docWithView(app, false) : { ...t.doc, ...(t.bbox ? { view: { bbox: roundBox(t.bbox) } } : {}) }));
    localStorage.setItem(TABS_KEY, JSON.stringify({ active: app.tabIdx, tabs }));
  } catch {
    // chế độ riêng tư / bị chặn lưu trữ / ảnh quá lớn so với dung lượng lưu nháp
    // (ảnh nền hay ảnh đề trong khung chữ đều có thể làm vượt dung lượng – báo một lần, dù lỗi vì lý do gì)
    if (!draftWarned) { draftWarned = true; toast('Không lưu nháp được trong trình duyệt (ảnh quá lớn hoặc trình duyệt chặn lưu) – hãy lưu tệp (Ctrl+S)', 6000); }
  }
}

function loadDraft() {
  try {
    const t = localStorage.getItem(TABS_KEY);
    if (t) {
      const d = JSON.parse(t);
      const tabs = (d.tabs || []).map((x) => { try { return parseDocJSON(JSON.stringify(x)); } catch { return null; } }).filter(Boolean);
      if (tabs.length) return { tabs, active: Math.min(Math.max(0, d.active | 0), tabs.length - 1) };
    }
    const old = localStorage.getItem(DRAFT_KEY);
    return old ? { tabs: [parseDocJSON(old)], active: 0 } : null;
  } catch {
    return null;
  }
}

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

export function saveFile(app) {
  const doc = compactDoc(docWithView(app));
  const text = JSON.stringify(doc, null, 1);
  const blob = new Blob([text], { type: 'application/json' });
  const a = document.createElement('a');
  a.download = `${fileSafeName(app.doc.title || 'hinh')}.json`;
  a.href = URL.createObjectURL(blob);
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

export function openFile(app) {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.json,application/json';
  inp.onchange = async () => {
    const f = inp.files[0];
    if (!f) return;
    try {
      const doc = parseDocJSON(await f.text());
      if (!doc.title) doc.title = f.name.replace(/\.json$/i, '');
      app.openDoc(doc);
      if (!doc.view) app.zoomFit();
      toast(`Đã mở "${f.name}"`);
    } catch (e) {
      await confirmDialog('Không mở được tệp', escapeBr(e.message), 'OK');
    }
  };
  inp.click();
}

/** Tên tệp không dấu (một số trình duyệt bỏ qua tên tệp có ký tự ngoài ASCII). */
export function fileSafeName(title) {
  const t = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return t || 'hinh';
}

const escapeBr = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>');

/** Nạp hình lúc mở trang: ưu tiên link (#h=...), sau đó bản nháp. */
export async function initShare(app) {
  const m = /[#&]h=([A-Za-z0-9_-]+)/.exec(location.hash);
  // khôi phục các tab của lần trước, rồi mở hình trong link (nếu có) ở tab mới
  const d = loadDraft();
  if (d && d.tabs.some((x) => x.steps.length || (x.images || []).length)) {
    app.loadDoc(d.tabs[0]);
    for (const x of d.tabs.slice(1)) app.newTab(x);
    app.switchTab(d.active);
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
  app.on('change', () => {
    clearTimeout(timer);
    timer = setTimeout(() => saveDraft(app), 300);
  });
  app.view.onViewChange(() => {
    clearTimeout(timer);
    timer = setTimeout(() => saveDraft(app), 600);
  });
  window.addEventListener('beforeunload', () => saveDraft(app));
}
