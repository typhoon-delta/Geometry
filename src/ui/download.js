// Tải tệp về máy. Ở trang thường (GitHub Pages, mở index.html trên máy) dùng <a download>. Trên trang artifact của
// claude.ai, khung trang chặn kiểu tải đó → dùng khả năng "downloads" của trang (người xem bấm đồng ý mỗi lần lưu).
import { toast } from './dialog.js';

let dlp = null;
/** Gọi sớm lúc mở trang: hỏi trước khả năng "downloads" (nếu có) để lúc bấm Lưu không phải chờ. */
export function initDownloads() {
  if (dlp) return dlp;
  const c = typeof window !== 'undefined' ? window.claude : null;
  dlp = c && typeof c.use === 'function' ? Promise.resolve().then(() => c.use('downloads')).catch(() => null) : Promise.resolve(null);
  return dlp;
}

/** data URL → Blob (không dùng fetch: một số trang chặn fetch data:). */
export function dataURLToBlob(url) {
  const [head, b64] = url.split(',');
  const mime = /data:([^;]+)/.exec(head)?.[1] || 'application/octet-stream';
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return new Blob([buf], { type: mime });
}

/**
 * Tải một tệp: data là chuỗi, Blob hoặc data URL (khi isDataURL). Trả về true nếu đã giao cho trình duyệt.
 */
export async function downloadFile(filename, data, mime = 'application/octet-stream') {
  const blob = data instanceof Blob ? data : typeof data === 'string' && data.startsWith('data:') ? dataURLToBlob(data) : new Blob([data], { type: mime });
  const dl = await initDownloads();
  if (dl) {
    try {
      await dl.save({ filename, data: blob });
      return true;
    } catch (e) {
      const code = e && e.code;
      if (code === 'declined') return false;
      if (code === 'rate_limited') { toast('Đang có một hộp hỏi lưu tệp – trả lời hộp đó trước'); return false; }
      if (code === 'rejected_extension') { toast(`Trang này không cho tải tệp dạng ${filename.split('.').pop()} – mở chương trình từ GitHub Pages hoặc index.html`, 6000); return false; }
      // không dùng được ở trang này → thử cách thường bên dưới
    }
  }
  const a = document.createElement('a');
  a.download = filename;
  a.href = URL.createObjectURL(blob);
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  return true;
}
