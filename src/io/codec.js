// Mã hoá / giải mã toàn bộ hình vào một chuỗi ngắn để đặt trong URL (#h=...).
// Dạng: 'z' + base64url(deflate-raw(JSON))  — khi trình duyệt có CompressionStream
//       'j' + base64url(UTF-8 JSON)         — dự phòng, không nén
// Thuần JS, chạy được cả trong Node ≥ 18 (để test và để công cụ Python/Node khác dùng lại).

import { validate } from '../core/model.js';

function toB64url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pipe(bytes, stream) {
  const res = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await res.arrayBuffer());
}

/** Bỏ các trường không cần khi chia sẻ (giữ nguyên ngữ nghĩa). */
export function compactDoc(doc) {
  const out = { format: doc.format, version: doc.version };
  if (doc.title) out.title = doc.title;
  if (doc.view) out.view = doc.view;
  // bản 1.3: ảnh dán vào hình (vị trí/cỡ theo toạ độ hình) và dữ liệu ảnh (data URL) theo id
  if (doc.images && doc.images.length) out.images = doc.images;
  if (doc.boxes && doc.boxes.length) out.boxes = doc.boxes; // bản 1.4: khung chữ
  if (doc.imageData && Object.keys(doc.imageData).length) out.imageData = doc.imageData;
  out.steps = doc.steps.map((s) => {
    const t = { id: s.id, type: s.type, args: s.args };
    for (const k of ['params', 'name', 'style', 'hidden', 'joinPrev']) {
      const v = s[k];
      if (v === undefined || v === false || (typeof v === 'object' && v && !Array.isArray(v) && !Object.keys(v).length)) continue;
      t[k] = v;
    }
    return t;
  });
  return out;
}

export async function encodeDoc(doc) {
  const json = JSON.stringify(compactDoc(doc));
  const bytes = new TextEncoder().encode(json);
  if (typeof CompressionStream !== 'undefined') {
    try {
      return 'z' + toB64url(await pipe(bytes, new CompressionStream('deflate-raw')));
    } catch { /* rơi xuống dạng không nén */ }
  }
  return 'j' + toB64url(bytes);
}

/** Giải mã; ném lỗi (tiếng Việt) nếu chuỗi hỏng hoặc hình không hợp lệ. */
export async function decodeDoc(code) {
  let bytes;
  try {
    if (code[0] === 'z') bytes = await pipe(fromB64url(code.slice(1)), new DecompressionStream('deflate-raw'));
    else if (code[0] === 'j') bytes = fromB64url(code.slice(1));
    else throw new Error();
  } catch {
    throw new Error('Link hình bị hỏng hoặc bị cắt cụt.');
  }
  return parseDocJSON(new TextDecoder().decode(bytes));
}

export function parseDocJSON(text) {
  let doc;
  try {
    doc = JSON.parse(text);
  } catch {
    throw new Error('Tệp không phải JSON hợp lệ.');
  }
  const errs = validate(doc);
  if (errs.length) throw new Error('Hình không hợp lệ:\n' + errs.slice(0, 6).join('\n'));
  return doc;
}
