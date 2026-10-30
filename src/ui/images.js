// Dán / kéo thả / chèn ảnh vào hình (bản 1.3): ảnh đề bài chụp màn hình, hình gốc để đồ lại…
// Ảnh nằm dưới mọi đối tượng hình học, theo toạ độ hình (phóng/dời cùng hình). Xem App.registerImage.
import { toast } from './dialog.js';
import { openFiles } from './share.js';

const MAX_SIDE = 1600; // ảnh lớn hơn được thu nhỏ để tệp .json và bản nháp không quá nặng

export function setupImages(app) {
  document.addEventListener('paste', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || document.querySelector('.modal-back')) return;
    const item = [...(e.clipboardData?.items || [])].find((it) => it.kind === 'file' && it.type.startsWith('image/'));
    if (!item) return;
    e.preventDefault();
    // bản 1.4: ảnh dán vào thành khung Đề bài (gắn màn hình) – hoặc chèn vào khung chữ đang soạn
    insertImageFile(app, item.getAsFile(), null, app.textBoxes ? 'box' : 'background');
  });
  const stage = document.getElementById('stage');
  stage.addEventListener('dragover', (e) => {
    if ([...(e.dataTransfer?.items || [])].some((it) => it.kind === 'file')) e.preventDefault();
  });
  stage.addEventListener('drop', (e) => {
    const all = [...(e.dataTransfer?.files || [])];
    if (all.length) e.preventDefault(); // không để trình duyệt mở thẳng tệp (mất trang đang dạy)
    // bản 1.5: kéo thả tệp hình .json (một hình hoặc bộ nhiều hình) → mở thành tab
    const json = all.filter((f) => /\.json$/i.test(f.name) || f.type === 'application/json');
    if (json.length) openFiles(app, json);
    const files = all.filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    const r = app.view.canvas.getBoundingClientRect();
    files.forEach((f, i) => insertImageFile(app, f, { sx: e.clientX - r.left + 24 * i, sy: e.clientY - r.top + 24 * i }, app.textBoxes ? 'box' : 'background'));
  });
  const btn = document.getElementById('btn-image');
  if (btn) btn.onclick = () => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.onchange = () => { if (inp.files[0]) insertImageFile(app, inp.files[0], null, 'box'); };
    inp.click();
  };
  const bg = document.getElementById('btn-image-bg');
  if (bg) bg.onclick = () => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.onchange = () => { if (inp.files[0]) insertImageFile(app, inp.files[0], null, 'background'); };
    inp.click();
  };
}

const readURL = (file) => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(file); });
const loadImg = (src) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('Không đọc được ảnh')); im.src = src; });

/**
 * Chèn một tệp ảnh. as = 'box': thành khung Đề bài/khung ảnh nổi (bản 1.4); 'background': ảnh nằm dưới hình, theo toạ
 * độ hình (để đồ hình). at = vị trí màn hình của tâm ảnh nền (mặc định giữa khung nhìn).
 */
export async function insertImageFile(app, file, at = null, as = 'background') {
  let src, img;
  try {
    src = await readURL(file);
    img = await loadImg(src);
  } catch {
    toast('Không đọc được ảnh này');
    return null;
  }
  let w = img.naturalWidth, h = img.naturalHeight;
  if (Math.max(w, h) > MAX_SIDE) {
    const k = MAX_SIDE / Math.max(w, h);
    w = Math.round(w * k);
    h = Math.round(h * k);
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    cv.getContext('2d').drawImage(img, 0, 0, w, h);
    src = file.type === 'image/png' ? cv.toDataURL('image/png') : cv.toDataURL('image/jpeg', 0.9);
  }
  if (as === 'box' && app.textBoxes) return app.textBoxes.pasteImage(src, w);
  return insertImageData(app, src, w, h, at);
}

/** Chèn ảnh từ data URL (kích thước điểm ảnh w × h). Ảnh hiện cỡ thật nếu vừa, nếu không thì thu cho vừa 60% khung nhìn. */
export function insertImageData(app, src, w, h, at = null) {
  const v = app.view;
  const f = Math.min(1, (0.6 * v.W) / w, (0.6 * v.H) / h);
  const sw = w * f, sh = h * f;
  const c = at || { sx: v.W / 2, sy: v.H / 2 };
  const tl = app.toUser(c.sx - sw / 2, c.sy - sh / 2);
  const id = 'img' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  app.registerImage(id, src);
  app.commit((doc) => { (doc.images ||= []).push({ id, x: round(tl.x), y: round(tl.y), w: round(sw / v.scale), h: round(sh / v.scale) }); });
  if (app.toolId !== 'move') app.setTool('move');
  app.selectImage(id);
  toast('Đã chèn ảnh – kéo để dời, kéo góc dưới phải để đổi cỡ; "Khoá làm nền" để đồ hình lên trên', 5000);
  return id;
}

const round = (x) => Math.round(x * 1e4) / 1e4;
