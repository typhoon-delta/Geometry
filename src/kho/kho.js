// KHO BÀI TẬP trên GitHub (bản 1.5). Một repo riêng tư của giáo viên, cấu trúc đọc được bằng mắt:
//
//   muc-luc.json                 chỉ mục mọi bài + buổi dạy (để tìm/lọc nhanh, tự cập nhật mỗi lần lưu)
//   chu-de.json                  danh sách chủ đề (sửa được)
//   bai/<mã>/bai.json            một bài: thông tin + các hình (thường 1; bài nhiều ý có thể nhiều hình)
//   bai/<mã>/anh/<id>.png|jpg    ảnh đề / ảnh nền của bài (tách khỏi JSON cho gọn)
//   bai/<mã>/thu-nho.jpg         ảnh thu nhỏ của hình (cho danh sách bài)
//   buoi/<mã>.json               buổi dạy: danh sách bài theo thứ tự + ngày, lớp, ghi chú
//
// Thuần JS (không đụng DOM) để test được trong Node với GitHub giả.
import { KhoError, textToBytes, bytesToBase64, base64ToBytes, gitBlobSha } from './github.js';

export const DEFAULT_TOPICS = [
  'Tam giác và các điểm, đường đặc biệt',
  'Góc, đường tròn, tứ giác nội tiếp',
  'Phương tích, trục đẳng phương',
  'Đường tròn đặc biệt (Euler, mixtilinear, Apollonius…)',
  'Đồng quy, thẳng hàng (Ceva, Menelaus, Pascal, Desargues…)',
  'Tỉ số, hàng điểm điều hoà, cực – đối cực',
  'Phép đối xứng, quay, tịnh tiến',
  'Vị tự, vị tự quay, đồng dạng',
  'Phép nghịch đảo',
  'Tứ giác toàn phần, điểm Miquel, đường đối trung',
  'Tính toán: lượng giác, toạ độ, vectơ, số phức',
  'Bất đẳng thức, cực trị hình học',
  'Quỹ tích, điểm và đường cố định',
  'Hình học tổ hợp',
];

export const STATUS = { de: 'Mới có đề', hinh: 'Có hình', loigiai: 'Có lời giải' };
const INDEX = 'muc-luc.json';
const TOPICS = 'chu-de.json';
const baiPath = (ma) => `bai/${ma}/bai.json`;

export const emptyIndex = () => ({ format: 'kho-bai-muc-luc', version: 1, bai: {}, buoi: {} });

/** Mã (tên thư mục) không dấu: "VMO 2016 – Bài 4" → "vmo-2016-bai-4". */
export function slugify(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'bai';
}

/** Mã cho bài mới: theo nguồn (kỳ-năm-bài) nếu có, không thì theo tên; thêm -2, -3… nếu trùng. */
export function newCode(meta, taken) {
  const n = meta.nguon || {};
  const base = n.ky ? slugify([n.ky, n.nam, n.so && `bai-${n.so}`].filter(Boolean).join(' ')) : slugify(meta.ten);
  let ma = base, k = 2;
  while (taken.has(ma)) ma = `${base}-${k++}`;
  return ma;
}

/** Chuẩn hoá thông tin bài (bỏ trường rỗng). */
export function cleanMeta(m = {}) {
  const out = { ten: String(m.ten || '').trim() || 'Bài chưa đặt tên' };
  const n = m.nguon || {};
  if (n.tuRa) out.nguon = { tuRa: true };
  else if (n.ky || n.nam || n.so) out.nguon = { ...(n.ky ? { ky: String(n.ky).trim() } : {}), ...(n.nam ? { nam: +n.nam || String(n.nam).trim() } : {}), ...(n.so ? { so: String(n.so).trim() } : {}) };
  const arr = (a) => [...new Set((a || []).map((x) => String(x).trim()).filter(Boolean))];
  if (arr(m.chuDe).length) out.chuDe = arr(m.chuDe);
  if (arr(m.the).length) out.the = arr(m.the);
  if (m.doKho) out.doKho = Math.max(1, Math.min(5, m.doKho | 0));
  if (m.ghiChu && String(m.ghiChu).trim()) out.ghiChu = String(m.ghiChu).trim();
  return out;
}

export function sourceLabel(n) {
  if (!n) return '';
  if (n.tuRa) return 'Tự ra';
  return [n.ky, n.nam, n.so && `Bài ${n.so}`].filter(Boolean).join(' – ');
}

const plain = (t) => String(t || '').replace(/!\[\]\(img:[^)]*\)/g, ' ').replace(/\\[a-zA-Z]+/g, ' ').replace(/[$*{}_^\\]/g, ' ').replace(/^\s*-{3,}.*$/gm, ' ').replace(/\s+/g, ' ').trim();

/** Trạng thái suy từ nội dung: có lời giải > có hình > mới có đề. */
export function statusOf(docs) {
  const boxes = docs.flatMap((d) => d.boxes || []);
  if (boxes.some((b) => b.role === 'loigiai' && plain(b.text))) return 'loigiai';
  if (docs.some((d) => d.steps.length)) return 'hinh';
  return 'de';
}

/** Dòng của bài trong mục lục. */
export function indexEntry(meta, docs, extra = {}) {
  const boxes = docs.flatMap((d) => d.boxes || []);
  const txt = (role) => boxes.filter((b) => b.role === role).map((b) => plain(b.text)).join(' ');
  return {
    ...cleanMeta(meta),
    trangThai: statusOf(docs),
    soHinh: docs.length,
    tom: (txt('de') + ' | ' + txt('loigiai')).slice(0, 600),
    capNhat: new Date().toISOString(),
    ...extra,
  };
}

/** Ảnh dùng trong một hình: ảnh nền + ảnh trong khung chữ. */
function imageIds(doc) {
  const ids = new Set((doc.images || []).map((im) => im.id));
  for (const b of doc.boxes || []) for (const m of String(b.text || '').matchAll(/!\[\]\(img:([A-Za-z0-9_-]+)\)/g)) ids.add(m[1]);
  return ids;
}

function dataURLParts(url) {
  const m = /^data:(image\/[a-z+]+);base64,(.*)$/s.exec(url || '');
  if (!m) return null;
  const ext = m[1] === 'image/jpeg' ? 'jpg' : m[1] === 'image/svg+xml' ? 'svg' : m[1].split('/')[1];
  return { mime: m[1], ext, bytes: base64ToBytes(m[2]) };
}
const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' };

export class Kho {
  constructor(gh) {
    this.gh = gh;
    this.head = null;
    this.index = emptyIndex();
    this.topics = [...DEFAULT_TOPICS];
    this.thumbCache = new Map(); // mã → data URL
  }

  /** Kết nối: kiểm tra repo, tạo cấu trúc nếu repo trống, đọc mục lục + chủ đề. */
  async open() {
    const info = await this.gh.info();
    this.info = info;
    let head = await this.gh.head();
    if (!head) {
      await this.gh.initEmpty(INDEX, JSON.stringify(emptyIndex(), null, 1), 'Tạo kho bài tập');
      head = await this.gh.head();
      await this.load(head);
      await this.saveTopics(this.topics);
      return info;
    }
    await this.load(head);
    return info;
  }

  async load(head) {
    this.head = head || (await this.gh.head());
    const ix = await this.gh.readText(INDEX, this.head);
    this.index = ix ? { ...emptyIndex(), ...JSON.parse(ix.text) } : emptyIndex();
    const tp = await this.gh.readText(TOPICS, this.head);
    this.topics = tp ? JSON.parse(tp.text).chuDe || [...DEFAULT_TOPICS] : [...DEFAULT_TOPICS];
  }

  /** Đọc lại kho (vd sau khi lưu ở máy khác). */
  async refresh() {
    const h = await this.gh.head();
    if (h !== this.head) await this.load(h);
    return this.index;
  }

  /**
   * Chạy một lần ghi: build(fresh) đọc trạng thái mới nhất của kho (mục lục mới đọc lại) rồi trả về
   * {changes, message, result}. Nhánh vừa đổi ở nơi khác (code 'moved') thì đọc lại và làm lại, tối đa 4 lần.
   */
  async write(build) {
    for (let attempt = 0; ; attempt++) {
      const head = await this.gh.head();
      const ix = await this.gh.readText(INDEX, head);
      const index = ix ? { ...emptyIndex(), ...JSON.parse(ix.text) } : emptyIndex();
      const { changes, message, result } = await build({ head, index });
      changes.push({ path: INDEX, text: JSON.stringify(index, null, 1) });
      try {
        const sha = await this.gh.commit(head, changes, message);
        this.head = sha;
        this.index = index;
        return result;
      } catch (e) {
        if (e.code !== 'moved' || attempt >= 3) throw e;
      }
    }
  }

  /** Thay đổi để ghi một bài (bài.json + ảnh mới + ảnh thu nhỏ); xoá ảnh không còn dùng. */
  async baiChanges(ma, bai, imageData, thumb, prevAnh = {}) {
    const changes = [];
    const used = new Set(bai.hinh.flatMap((d) => [...imageIds(d)]));
    // ảnh đã có trên kho: lấy từ bai.json cũ (không cần hỏi GitHub thêm lần nào)
    const have = new Map(Object.entries(prevAnh).map(([id, rel]) => [id, `bai/${ma}/${rel}`]));
    bai.anh = {};
    for (const id of used) {
      if (have.has(id)) { bai.anh[id] = have.get(id).slice(`bai/${ma}/`.length); continue; }
      const p = dataURLParts(imageData[id]);
      if (!p) continue;
      const path = `bai/${ma}/anh/${id}.${p.ext}`;
      changes.push({ path, bytes: p.bytes });
      bai.anh[id] = path.slice(`bai/${ma}/`.length);
    }
    for (const [id, path] of have) if (!used.has(id)) changes.push({ path, remove: true });
    if (thumb) { const p = dataURLParts(thumb); if (p) changes.push({ path: `bai/${ma}/thu-nho.jpg`, bytes: p.bytes }); }
    const text = JSON.stringify(bai, null, 1);
    changes.push({ path: baiPath(ma), text });
    return { changes, sha: await gitBlobSha(textToBytes(text)) };
  }

  /**
   * Lưu một hình vào kho.
   *  - bài mới: {meta, doc, thumb} → tạo mã mới
   *  - bài có sẵn: {ma, hinh: chỉ số hình (bỏ trống = thêm hình mới vào bài), meta?, doc, expectSha, thumb}
   * doc có imageData (data URL các ảnh). expectSha: phiên bản bài.json lúc mở; khác phiên bản trên kho →
   * KhoError 'conflict' (trừ khi force). Trả về {ma, hinh, sha}.
   */
  async saveDoc({ ma = null, hinh = null, meta = null, doc, expectSha = null, thumb = null, force = false }) {
    return this.write(async ({ head, index }) => {
      let bai, code = ma, prevAnh = {};
      if (code) {
        const cur = await this.gh.readText(baiPath(code), head);
        if (!cur) throw new KhoError('notfound', 'Bài này không còn trong kho (đã bị xoá?)');
        if (expectSha && !force && cur.sha !== expectSha) throw new KhoError('conflict', 'Bài đã được sửa ở nơi khác', { current: JSON.parse(cur.text) });
        bai = JSON.parse(cur.text);
        prevAnh = bai.anh || {};
        if (meta) bai.meta = cleanMeta(meta);
      } else {
        bai = { format: 'kho-bai', version: 1, meta: cleanMeta(meta || { ten: doc.title }), hinh: [] };
        code = newCode(bai.meta, new Set(Object.keys(index.bai)));
        bai.ma = code;
      }
      const { imageData = {}, ...plainDoc } = doc;
      const at = hinh == null || hinh >= bai.hinh.length ? bai.hinh.length : hinh;
      bai.hinh[at] = plainDoc;
      bai.capNhat = new Date().toISOString();
      const { changes, sha } = await this.baiChanges(code, bai, imageData, at === 0 ? thumb : null, prevAnh);
      index.bai[code] = indexEntry(bai.meta, bai.hinh, { thuNho: !!(thumb && at === 0) || !!(index.bai[code] && index.bai[code].thuNho) });
      if (thumb && at === 0) this.thumbCache.set(code, thumb);
      return { changes, message: `${ma ? 'Cập nhật' : 'Thêm'} bài: ${bai.meta.ten}`, result: { ma: code, hinh: at, sha } };
    });
  }

  /** Nhập nhiều bài một lần (MỘT commit): items = [{meta, docs: [doc có imageData], thumb?}]. Trả về [mã]. */
  async importMany(items) {
    return this.write(async ({ index }) => {
      const changes = [], codes = [];
      const taken = new Set(Object.keys(index.bai));
      for (const it of items) {
        const meta = cleanMeta(it.meta);
        const code = newCode(meta, taken);
        taken.add(code);
        const imageData = Object.assign({}, ...it.docs.map((d) => d.imageData || {}));
        const bai = { format: 'kho-bai', version: 1, ma: code, meta, hinh: it.docs.map(({ imageData: _, ...d }) => d), capNhat: new Date().toISOString() };
        const r = await this.baiChanges(code, bai, imageData, it.thumb || null);
        changes.push(...r.changes);
        index.bai[code] = indexEntry(meta, bai.hinh, { thuNho: !!it.thumb });
        if (it.thumb) this.thumbCache.set(code, it.thumb);
        codes.push(code);
      }
      return { changes, message: `Nhập ${items.length} bài vào kho`, result: codes };
    });
  }

  /** Sửa thông tin bài (không đụng hình). */
  async updateMeta(ma, meta) {
    return this.write(async ({ head, index }) => {
      const cur = await this.gh.readText(baiPath(ma), head);
      if (!cur) throw new KhoError('notfound', 'Bài này không còn trong kho');
      const bai = JSON.parse(cur.text);
      bai.meta = cleanMeta(meta);
      const text = JSON.stringify(bai, null, 1);
      index.bai[ma] = { ...index.bai[ma], ...indexEntry(bai.meta, bai.hinh, { thuNho: !!(index.bai[ma] && index.bai[ma].thuNho) }) };
      return { changes: [{ path: baiPath(ma), text }], message: `Sửa thông tin bài: ${bai.meta.ten}`, result: { sha: await gitBlobSha(textToBytes(text)) } };
    });
  }

  /** Mở bài (tại commit ref, mặc định mới nhất) → {ma, meta, sha, docs: [doc có imageData]}. */
  async loadBai(ma, ref = null) {
    const r = ref || this.head || (await this.gh.head());
    const cur = await this.gh.readText(baiPath(ma), r);
    if (!cur) throw new KhoError('notfound', 'Không tìm thấy bài trong kho');
    const bai = JSON.parse(cur.text);
    const imageData = {};
    for (const [id, rel] of Object.entries(bai.anh || {})) {
      const f = await this.gh.readFile(`bai/${ma}/${rel}`, r);
      if (f) imageData[id] = `data:${MIME[rel.split('.').pop()] || 'image/png'};base64,${bytesToBase64(f.bytes)}`;
    }
    const docs = bai.hinh.map((d) => {
      const ids = imageIds(d);
      const own = {};
      for (const id of ids) if (imageData[id]) own[id] = imageData[id];
      return Object.keys(own).length ? { ...d, imageData: own } : { ...d };
    });
    return { ma, meta: bai.meta, sha: cur.sha, docs };
  }

  /** Ảnh thu nhỏ (data URL) hoặc null. */
  async thumb(ma) {
    if (this.thumbCache.has(ma)) return this.thumbCache.get(ma);
    if (!this.index.bai[ma] || !this.index.bai[ma].thuNho) return null;
    const f = await this.gh.readFile(`bai/${ma}/thu-nho.jpg`, this.head);
    const url = f ? `data:image/jpeg;base64,${bytesToBase64(f.bytes)}` : null;
    this.thumbCache.set(ma, url);
    return url;
  }

  /** Xoá bài (cả ảnh) và gỡ khỏi các buổi dạy. */
  async deleteBai(ma) {
    return this.write(async ({ head, index }) => {
      const cur = await this.gh.readText(baiPath(ma), head);
      const anh = cur ? JSON.parse(cur.text).anh || {} : {};
      const changes = [{ path: baiPath(ma), remove: true }, ...Object.values(anh).map((rel) => ({ path: `bai/${ma}/${rel}`, remove: true }))];
      if (index.bai[ma] && index.bai[ma].thuNho) changes.push({ path: `bai/${ma}/thu-nho.jpg`, remove: true });
      const ten = index.bai[ma] ? index.bai[ma].ten : ma;
      delete index.bai[ma];
      for (const [bm, b] of Object.entries(index.buoi)) {
        if (!b.bai.includes(ma)) continue;
        b.bai = b.bai.filter((x) => x !== ma);
        changes.push({ path: `buoi/${bm}.json`, text: JSON.stringify({ format: 'kho-bai-buoi', version: 1, ma: bm, ...b }, null, 1) });
      }
      this.thumbCache.delete(ma);
      return { changes, message: `Xoá bài: ${ten}`, result: true };
    });
  }

  /** Lưu buổi dạy {ma?, ten, ngay, lop, ghiChu, bai: [mã]} → mã buổi. */
  async saveBuoi(buoi) {
    return this.write(async ({ index }) => {
      const b = { ten: String(buoi.ten || '').trim() || `Buổi ${buoi.ngay || ''}`.trim(), ngay: buoi.ngay || null, lop: (buoi.lop || '').trim() || null, ghiChu: (buoi.ghiChu || '').trim() || null, bai: [...buoi.bai], capNhat: new Date().toISOString() };
      let ma = buoi.ma;
      if (!ma) {
        const base = slugify(`${b.ngay || ''} ${b.ten}`);
        ma = base;
        for (let k = 2; index.buoi[ma]; k++) ma = `${base}-${k}`;
      }
      index.buoi[ma] = b;
      return { changes: [{ path: `buoi/${ma}.json`, text: JSON.stringify({ format: 'kho-bai-buoi', version: 1, ma, ...b }, null, 1) }], message: `${buoi.ma ? 'Sửa' : 'Thêm'} buổi dạy: ${b.ten}`, result: ma };
    });
  }

  async deleteBuoi(ma) {
    return this.write(async ({ index }) => {
      const ten = index.buoi[ma] ? index.buoi[ma].ten : ma;
      delete index.buoi[ma];
      return { changes: [{ path: `buoi/${ma}.json`, remove: true }], message: `Xoá buổi dạy: ${ten}`, result: true };
    });
  }

  async saveTopics(list) {
    return this.write(async () => {
      this.topics = [...new Set(list.map((x) => x.trim()).filter(Boolean))];
      return { changes: [{ path: TOPICS, text: JSON.stringify({ format: 'kho-bai-chu-de', version: 1, chuDe: this.topics }, null, 1) }], message: 'Sửa danh sách chủ đề', result: this.topics };
    });
  }

  /** Các phiên bản cũ của bài: [{sha, date, message}]. */
  history(ma) {
    return this.gh.history(baiPath(ma));
  }

  /** Các buổi có dạy bài này: [{ma, ten, ngay, lop}] (mới nhất trước). */
  taughtIn(ma) {
    return Object.entries(this.index.buoi).filter(([, b]) => b.bai.includes(ma)).map(([bm, b]) => ({ ma: bm, ...b })).sort((a, b) => String(b.ngay).localeCompare(String(a.ngay)));
  }
}

// ======================= tìm kiếm, lọc (dùng cho giao diện, test được) =======================
const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

/**
 * Lọc bài trong mục lục. q: chữ tìm (không phân biệt dấu, mọi từ đều phải có); f: {chuDe: Set, ky: Set, doKho: Set,
 * trangThai: Set, daDay: bool|null}; sort: 'moi' | 'ten' | 'doKho' | 'nguon'. Trả về [[mã, dòng]].
 */
export function filterIndex(index, q = '', f = {}, sort = 'moi') {
  const words = fold(q).split(/\s+/).filter(Boolean);
  const taught = new Set(Object.values(index.buoi || {}).flatMap((b) => b.bai));
  let rows = Object.entries(index.bai || {}).filter(([ma, e]) => {
    if (words.length) {
      const hay = fold([e.ten, sourceLabel(e.nguon), (e.chuDe || []).join(' '), (e.the || []).join(' '), e.tom, e.ghiChu, ma].join(' '));
      if (!words.every((w) => hay.includes(w))) return false;
    }
    if (f.chuDe && f.chuDe.size && !(e.chuDe || []).some((c) => f.chuDe.has(c))) return false;
    if (f.ky && f.ky.size && !f.ky.has(kyOf(e))) return false;
    if (f.doKho && f.doKho.size && !f.doKho.has(e.doKho || 0)) return false;
    if (f.trangThai && f.trangThai.size && !f.trangThai.has(e.trangThai)) return false;
    if (f.daDay === true && !taught.has(ma)) return false;
    if (f.daDay === false && taught.has(ma)) return false;
    return true;
  });
  const cmp = {
    moi: (a, b) => String(b[1].capNhat).localeCompare(String(a[1].capNhat)),
    ten: (a, b) => a[1].ten.localeCompare(b[1].ten, 'vi', { numeric: true }),
    doKho: (a, b) => (a[1].doKho || 9) - (b[1].doKho || 9) || a[1].ten.localeCompare(b[1].ten, 'vi', { numeric: true }),
    nguon: (a, b) => sourceLabel(a[1].nguon).localeCompare(sourceLabel(b[1].nguon), 'vi', { numeric: true }),
  }[sort] || (() => 0);
  rows = rows.sort(cmp);
  return rows;
}

/** Nhóm nguồn để lọc: tên kỳ thi, "Tự ra", hoặc "Chưa ghi". */
export function kyOf(e) {
  return e.nguon ? (e.nguon.tuRa ? 'Tự ra' : e.nguon.ky || 'Chưa ghi') : 'Chưa ghi';
}
