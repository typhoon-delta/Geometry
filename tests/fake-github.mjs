// GitHub GIẢ cho test kho bài: cài đúng các API REST mà src/kho/github.js dùng (contents, git data, commits),
// giữ dữ liệu trong bộ nhớ, sha của tệp tính đúng kiểu git (để kiểm tra phát hiện xung đột như thật).
// Dùng trong Node (fetchFn) và trong Playwright (page.route → fake.handle).
import { createHash, randomBytes } from 'node:crypto';

const json = (status, body) => ({ status, body });

export function createFakeGitHub({ repo = 'gv/kho-bai', token = 'tok', isPrivate = true, empty = true } = {}) {
  const objects = new Map(); // sha → {type:'blob', bytes} | {type:'tree', files: Map(path→blobSha)} | {type:'commit', tree, parents, message, date}
  const state = { ref: null, offline: false, calls: [] };
  const rid = () => randomBytes(20).toString('hex');

  const putBlob = (bytes) => {
    const sha = createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), Buffer.from(bytes)])).digest('hex');
    objects.set(sha, { type: 'blob', bytes: Buffer.from(bytes) });
    return sha;
  };
  const putTree = (files) => { const sha = rid(); objects.set(sha, { type: 'tree', files }); return sha; };
  const putCommit = (tree, parents, message) => { const sha = rid(); objects.set(sha, { type: 'commit', tree, parents, message, date: new Date(Date.now() + objects.size).toISOString() }); return sha; };
  const filesAt = (commitSha) => objects.get(objects.get(commitSha).tree).files;

  /** Commit thẳng vào nhánh (giả một máy khác vừa lưu). changes: {path: text | null} */
  function commitExternal(changes, message = 'máy khác') {
    const files = new Map(state.ref ? filesAt(state.ref) : []);
    for (const [p, t] of Object.entries(changes)) { if (t == null) files.delete(p); else files.set(p, putBlob(Buffer.from(t))); }
    state.ref = putCommit(putTree(files), state.ref ? [state.ref] : [], message);
  }
  if (!empty) commitExternal({ 'README.md': '# Kho bài\n' }, 'Initial commit');

  function readText(path) {
    if (!state.ref) return null;
    const sha = filesAt(state.ref).get(path);
    return sha ? objects.get(sha).bytes.toString('utf8') : null;
  }

  function handle(method, url, bodyText, headers = {}) {
    const u = new URL(url);
    state.calls.push(`${method} ${u.pathname}`);
    if (state.offline) return { abort: true };
    if (method === 'OPTIONS') return json(204, null);
    const auth = headers.authorization || headers.Authorization || '';
    if (auth !== `Bearer ${token}`) return json(401, { message: 'Bad credentials' });
    const pre = `/repos/${repo}`;
    if (!u.pathname.startsWith(pre)) return json(404, { message: 'Not Found' });
    const p = u.pathname.slice(pre.length);
    const body = bodyText ? JSON.parse(bodyText) : null;
    const ref = u.searchParams.get('ref') || state.ref;

    if (p === '' && method === 'GET') return json(200, { full_name: repo, private: isPrivate, default_branch: 'main', permissions: { admin: true, push: true, pull: true } });
    if (p === '/git/ref/heads/main' && method === 'GET') {
      if (!state.ref) return json(409, { message: 'Git Repository is empty.' });
      return json(200, { ref: 'refs/heads/main', object: { sha: state.ref, type: 'commit' } });
    }
    if (p.startsWith('/contents/')) {
      const path = decodeURIComponent(p.slice('/contents/'.length));
      if (method === 'PUT') {
        if (state.ref) return json(422, { message: 'only for empty repo in fake' });
        commitExternal({ [path]: Buffer.from(body.content, 'base64').toString('utf8') }, body.message);
        return json(201, { content: { path } });
      }
      if (!ref) return json(404, { message: 'This repository is empty.' });
      const files = filesAt(ref);
      if (files.has(path)) {
        const sha = files.get(path);
        const bytes = objects.get(sha).bytes;
        const big = bytes.length > 1024 * 1024;
        return json(200, { type: 'file', path, name: path.split('/').pop(), sha, size: bytes.length, encoding: big ? 'none' : 'base64', content: big ? '' : bytes.toString('base64') });
      }
      const dir = path.replace(/\/$/, '') + '/';
      const seen = new Map();
      for (const [fp, sha] of files) {
        if (!fp.startsWith(dir)) continue;
        const rest = fp.slice(dir.length);
        const name = rest.split('/')[0];
        if (!seen.has(name)) seen.set(name, rest.includes('/') ? { type: 'dir', name, path: dir + name, sha: rid() } : { type: 'file', name, path: fp, sha });
      }
      if (!seen.size) return json(404, { message: 'Not Found' });
      return json(200, [...seen.values()]);
    }
    let m;
    if ((m = /^\/git\/blobs\/(\w+)$/.exec(p)) && method === 'GET') {
      const o = objects.get(m[1]);
      return o && o.type === 'blob' ? json(200, { sha: m[1], encoding: 'base64', content: o.bytes.toString('base64') }) : json(404, { message: 'Not Found' });
    }
    if (p === '/git/blobs' && method === 'POST') return json(201, { sha: putBlob(Buffer.from(body.content, body.encoding === 'base64' ? 'base64' : 'utf8')) });
    if ((m = /^\/git\/commits\/(\w+)$/.exec(p)) && method === 'GET') {
      const o = objects.get(m[1]);
      return o ? json(200, { sha: m[1], tree: { sha: o.tree }, parents: o.parents.map((s) => ({ sha: s })), message: o.message }) : json(404, { message: 'Not Found' });
    }
    if (p === '/git/trees' && method === 'POST') {
      const files = new Map(body.base_tree ? objects.get(body.base_tree).files : []);
      for (const e of body.tree) {
        if (e.sha === null) files.delete(e.path);
        else if (e.content != null) files.set(e.path, putBlob(Buffer.from(e.content, 'utf8')));
        else if (objects.has(e.sha)) files.set(e.path, e.sha);
        else return json(422, { message: 'tree.sha is not a valid blob' });
      }
      return json(201, { sha: putTree(files) });
    }
    if (p === '/git/commits' && method === 'POST') return json(201, { sha: putCommit(body.tree, body.parents, body.message) });
    if (p === '/git/refs/heads/main' && method === 'PATCH') {
      const c = objects.get(body.sha);
      if (!body.force && !(c.parents || []).includes(state.ref)) return json(422, { message: 'Update is not a fast forward' });
      state.ref = body.sha;
      return json(200, { object: { sha: body.sha } });
    }
    if (p === '/commits' && method === 'GET') {
      const path = u.searchParams.get('path');
      const out = [];
      for (let c = state.ref; c; c = objects.get(c).parents[0]) {
        const o = objects.get(c);
        const par = o.parents[0];
        const now = filesAt(c).get(path), before = par ? filesAt(par).get(path) : undefined;
        if (now !== before) out.push({ sha: c, commit: { message: o.message, author: { date: o.date } } });
      }
      return json(200, out);
    }
    return json(404, { message: `fake: chưa có ${method} ${p}` });
  }

  /** fetch giả cho Node. */
  const fetchFn = async (url, init = {}) => {
    const r = handle(init.method || 'GET', url, init.body, init.headers || {});
    if (r.abort) throw new TypeError('Failed to fetch');
    return { ok: r.status < 300, status: r.status, text: async () => (r.body == null ? '' : JSON.stringify(r.body)) };
  };

  /** Gắn vào trang Playwright. */
  async function attach(page) {
    await page.route('https://api.github.com/**', async (route) => {
      const req = route.request();
      const r = handle(req.method(), req.url(), req.postData(), req.headers());
      if (r.abort) return route.abort('internetdisconnected');
      await route.fulfill({
        status: r.status,
        headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS', 'Content-Type': 'application/json' },
        body: r.body == null ? '' : JSON.stringify(r.body),
      });
    });
  }

  return { handle, fetchFn, attach, state, commitExternal, readText, files: () => (state.ref ? [...filesAt(state.ref).keys()].sort() : []) };
}
