// Nói chuyện với GitHub cho KHO BÀI (bản 1.5) – chỉ dùng REST API công khai của GitHub, không máy chủ riêng.
// Đọc: API "contents" (tệp > 1 MB đọc qua "git/blobs"). Ghi: API "git data" để MỘT lần lưu (bài + ảnh + mục lục) là
// MỘT commit, và cập nhật nhánh kiểu không ép (force: false) → hai máy lưu cùng lúc thì máy sau biết để thử lại,
// không bao giờ đè mất commit của máy kia.

export class KhoError extends Error {
  /** code: 'offline' | 'auth' | 'notfound' | 'moved' | 'conflict' | 'empty' | 'http' */
  constructor(code, message, extra = {}) {
    super(message);
    this.code = code;
    Object.assign(this, extra);
  }
}

// ---------- mã hoá base64 / UTF-8 ----------
export function bytesToBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
export function base64ToBytes(b64) {
  const bin = atob(String(b64).replace(/\s+/g, ''));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
export const textToBytes = (t) => new TextEncoder().encode(t);
export const bytesToText = (b) => new TextDecoder().decode(b);

/** SHA-1 kiểu git của một tệp ("blob <độ dài>\0" + nội dung) – để biết phiên bản tệp vừa lưu mà không phải hỏi lại. */
export async function gitBlobSha(bytes) {
  const subtle = globalThis.crypto && globalThis.crypto.subtle;
  if (!subtle) return null;
  const head = textToBytes(`blob ${bytes.length}\0`);
  const all = new Uint8Array(head.length + bytes.length);
  all.set(head);
  all.set(bytes, head.length);
  const h = new Uint8Array(await subtle.digest('SHA-1', all));
  return [...h].map((x) => x.toString(16).padStart(2, '0')).join('');
}

const encPath = (p) => p.split('/').map(encodeURIComponent).join('/');

export class GitHubRepo {
  /** repo: "chủ/tên", token: mã truy cập (fine-grained), fetchFn: để test. */
  constructor({ repo, token, api = 'https://api.github.com', fetchFn = null }) {
    this.repo = repo;
    this.token = token;
    this.api = api;
    this.fetch = fetchFn || ((...a) => globalThis.fetch(...a));
    this.branch = null;
  }

  async req(method, path, body) {
    let res;
    try {
      res = await this.fetch(this.api + path, {
        method,
        headers: {
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store',
      });
    } catch {
      throw new KhoError('offline', 'Không kết nối được GitHub (mất mạng?)');
    }
    let data = null;
    const text = await res.text();
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (res.ok) return data;
    const msg = (data && data.message) || `HTTP ${res.status}`;
    if (res.status === 401) throw new KhoError('auth', 'Token không đúng hoặc đã hết hạn', { status: 401 });
    if (res.status === 403 && /rate limit/i.test(msg)) throw new KhoError('http', 'GitHub tạm giới hạn số lần gọi – đợi vài phút', { status: 403 });
    if (res.status === 403) throw new KhoError('auth', 'Token không có quyền ghi vào repo này (cần quyền Contents: Read and write)', { status: 403 });
    if (res.status === 404) throw new KhoError('notfound', msg, { status: 404 });
    if (res.status === 409 && /empty/i.test(msg)) throw new KhoError('empty', 'Repo đang trống', { status: 409 });
    if (res.status === 422 && /fast forward|not a fast-forward|Update is not a fast forward/i.test(msg)) throw new KhoError('moved', 'Kho vừa được cập nhật từ nơi khác', { status: 422 });
    throw new KhoError('http', `GitHub báo lỗi: ${msg}`, { status: res.status });
  }

  /** Thông tin repo: {private, default_branch, permissions}. */
  async info() {
    const r = await this.req('GET', `/repos/${this.repo}`);
    this.branch = r.default_branch || 'main';
    return r;
  }

  /** Commit mới nhất của nhánh chính; null nếu repo còn trống. */
  async head() {
    if (!this.branch) await this.info();
    try {
      const r = await this.req('GET', `/repos/${this.repo}/git/ref/heads/${encodeURIComponent(this.branch)}`);
      return r.object.sha;
    } catch (e) {
      if (e.code === 'notfound' || e.code === 'empty') return null;
      throw e;
    }
  }

  /** Đọc một tệp tại commit ref → {sha, bytes} hoặc null nếu không có. */
  async readFile(path, ref) {
    let r;
    try {
      r = await this.req('GET', `/repos/${this.repo}/contents/${encPath(path)}${ref ? `?ref=${ref}` : ''}`);
    } catch (e) {
      if (e.code === 'notfound') return null;
      throw e;
    }
    if (Array.isArray(r)) throw new KhoError('http', `${path} là thư mục`);
    if (r.content && r.encoding === 'base64') return { sha: r.sha, bytes: base64ToBytes(r.content) };
    return { sha: r.sha, bytes: await this.blob(r.sha) }; // tệp > 1 MB
  }

  async readText(path, ref) {
    const f = await this.readFile(path, ref);
    return f ? { sha: f.sha, text: bytesToText(f.bytes) } : null;
  }

  async blob(sha) {
    const r = await this.req('GET', `/repos/${this.repo}/git/blobs/${sha}`);
    return base64ToBytes(r.content);
  }

  /** Liệt kê thư mục tại commit ref → [{name, path, sha, type}] ([] nếu không có). */
  async listDir(path, ref) {
    try {
      const r = await this.req('GET', `/repos/${this.repo}/contents/${encPath(path)}${ref ? `?ref=${ref}` : ''}`);
      return Array.isArray(r) ? r : [];
    } catch (e) {
      if (e.code === 'notfound') return [];
      throw e;
    }
  }

  /** Tạo tệp đầu tiên cho repo còn trống (API git data không làm được việc này). */
  async initEmpty(path, text, message) {
    if (!this.branch) await this.info();
    await this.req('PUT', `/repos/${this.repo}/contents/${encPath(path)}`, { message, content: bytesToBase64(textToBytes(text)), branch: this.branch });
  }

  /**
   * Một commit gồm nhiều thay đổi, nối sau commit base:
   *   changes: [{path, text} | {path, bytes} | {path, remove: true}]
   * Trả về sha commit mới. Lỗi code 'moved' nếu nhánh đã đổi kể từ base (người gọi đọc lại rồi thử lại).
   */
  async commit(base, changes, message) {
    const baseCommit = await this.req('GET', `/repos/${this.repo}/git/commits/${base}`);
    const tree = [];
    for (const c of changes) {
      if (c.remove) tree.push({ path: c.path, mode: '100644', type: 'blob', sha: null });
      else if (c.text != null) tree.push({ path: c.path, mode: '100644', type: 'blob', content: c.text });
      else {
        const b = await this.req('POST', `/repos/${this.repo}/git/blobs`, { content: bytesToBase64(c.bytes), encoding: 'base64' });
        tree.push({ path: c.path, mode: '100644', type: 'blob', sha: b.sha });
      }
    }
    const t = await this.req('POST', `/repos/${this.repo}/git/trees`, { base_tree: baseCommit.tree.sha, tree });
    const cm = await this.req('POST', `/repos/${this.repo}/git/commits`, { message, tree: t.sha, parents: [base] });
    await this.req('PATCH', `/repos/${this.repo}/git/refs/heads/${encodeURIComponent(this.branch)}`, { sha: cm.sha, force: false });
    return cm.sha;
  }

  /** Các commit đụng tới một đường dẫn (mới nhất trước): [{sha, date, message}]. */
  async history(path, n = 30) {
    if (!this.branch) await this.info();
    const r = await this.req('GET', `/repos/${this.repo}/commits?path=${encodeURIComponent(path)}&sha=${encodeURIComponent(this.branch)}&per_page=${n}`);
    return (r || []).map((c) => ({ sha: c.sha, date: c.commit && c.commit.author && c.commit.author.date, message: c.commit && c.commit.message }));
  }
}
