// Chia sẻ (link), lưu/mở tệp JSON, lưu nháp tự động trong trình duyệt.

import { encodeDoc, decodeDoc, parseDocJSON, compactDoc } from '../io/codec.js';
import { textDialog, toast, confirmDialog } from './dialog.js';

const DRAFT_KEY = 'hinh-hoc-dong:nhap';

/** Tài liệu kèm khung nhìn hiện tại (để mở lại đúng chỗ). */
function docWithView(app) {
  const bb = app.board.getBoundingBox().map((v) => Math.round(v * 1000) / 1000);
  return { ...app.doc, view: { bbox: bb } };
}

function saveDraft(app) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(docWithView(app)));
  } catch { /* chế độ riêng tư / bị chặn lưu trữ: bỏ qua */ }
}

function loadDraft() {
  try {
    const t = localStorage.getItem(DRAFT_KEY);
    return t ? parseDocJSON(t) : null;
  } catch {
    return null;
  }
}

export async function shareLink(app) {
  const code = await encodeDoc(docWithView(app));
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
      app.loadDoc(doc, { keepHistory: true });
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
  let loaded = false;
  if (m) {
    try {
      const doc = await decodeDoc(m[1]);
      app.loadDoc(doc);
      if (!doc.view) app.zoomFit();
      loaded = true;
      toast('Đã mở hình từ link');
    } catch (e) {
      toast(e.message, 5000);
    }
  }
  if (!loaded) {
    const d = loadDraft();
    if (d && d.steps.length) {
      app.loadDoc(d);
      toast('Đã khôi phục bản nháp lần trước');
    }
  }
  let timer = null;
  app.on('change', () => {
    clearTimeout(timer);
    timer = setTimeout(() => saveDraft(app), 300);
  });
  app.board.on('boundingbox', () => {
    clearTimeout(timer);
    timer = setTimeout(() => saveDraft(app), 600);
  });
  window.addEventListener('beforeunload', () => saveDraft(app));
}
