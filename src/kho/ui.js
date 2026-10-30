// Giao diện KHO BÀI (bản 1.5): kết nối repo, Lưu vào kho (Ctrl+S khi đã kết nối), Mở từ kho (Ctrl+K) với tìm kiếm và
// bộ lọc, buổi dạy, nhập tệp, các phiên bản cũ, hàng chờ khi mất mạng. Phần dữ liệu ở kho.js, phần GitHub ở github.js.
import { GitHubRepo, KhoError } from './github.js';
import { Kho, STATUS, filterIndex, kyOf, sourceLabel } from './kho.js';
import { renderThumb } from './thumb.js';
import { modal, toast, confirmDialog, choiceDialog, textDialogEditable } from '../ui/dialog.js';
import { tabDoc, docSig, isEmptyDoc, parseFileText, today, fileSafeName } from '../ui/share.js';
import { compactDoc } from '../io/codec.js';
import { idbGet, idbSet } from '../io/idb.js';
import { toLatexSet } from '../export/latex.js';
import { downloadTex } from '../ui/download.js';

const CONF_KEY = 'hinh-hoc-dong:kho';
const QUEUE_KEY = 'hang-cho-kho';
const COMMON_KY = ['VMO', 'IMO', 'TST', 'ISL', 'APMO', 'EGMO', 'Olympic 30/4', 'HSG tỉnh', 'Chuyên KHTN', 'Tự ra'];
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmtDate = (iso) => { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? String(iso) : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; };
const fmtTime = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} ${fmtDate(iso)}`; };

function loadConf() {
  try { const c = JSON.parse(localStorage.getItem(CONF_KEY) || 'null'); return c && c.repo && c.token ? c : null; } catch { return null; }
}
function saveConf(c) {
  try { if (c) localStorage.setItem(CONF_KEY, JSON.stringify(c)); else localStorage.removeItem(CONF_KEY); } catch { /* bỏ qua */ }
}

/** "VMO 2016 – Bài 4" → {ky: 'VMO', nam: 2016, so: '4'} (đoán từ tên tab). */
export function guessSource(title) {
  const m = /^\s*(.+?)\s+((?:19|20)\d\d)\b(?:\s*[-–—:,]?\s*(?:bài|problem|p|câu)\s*([0-9]+[a-z]?))?/i.exec(String(title || ''));
  return m ? { ky: m[1].trim(), nam: +m[2], ...(m[3] ? { so: m[3] } : {}) } : null;
}

export function setupKho(app) {
  const S = { conf: loadConf(), kho: null, connecting: null, queue: [], flushing: false, busy: 0, error: null };
  app.kho = S;
  const chip = document.getElementById('kho-status');
  let uid = 0;
  const tabUid = (t) => (t.uid ||= `t${Date.now().toString(36)}${uid++}`);

  // ---------- trạng thái trên thanh trên ----------
  function updateChip() {
    if (!chip) return;
    const n = S.queue.length;
    chip.className = 'kho-chip';
    let label;
    if (!S.conf) { label = 'Kết nối kho bài'; chip.classList.add('off'); }
    else if (S.busy) { label = 'Đang lưu…'; chip.classList.add('busy'); }
    else if (n) { label = `Chưa đồng bộ (${n})`; chip.classList.add('warn'); }
    else if (S.error) { label = 'Kho: lỗi kết nối'; chip.classList.add('warn'); }
    else if (S.kho) label = `Kho · ${Object.keys(S.kho.index.bai).length} bài`;
    else label = 'Kho…';
    chip.innerHTML = `<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M2 5.5L8 2.5l6 3v5L8 13.5l-6-3z"/><path d="M2 5.5l6 3 6-3M8 8.5v5"/></svg><span>${esc(label)}</span>`;
    chip.title = S.conf ? `Kho bài: ${S.conf.repo}${S.error ? ' – ' + S.error : ''}${n ? ` – ${n} lần lưu đang chờ có mạng` : ''} (Ctrl+K: mở kho)` : 'Kết nối một repo GitHub riêng tư làm kho bài tập';
    // nhãn phím tắt: Ctrl+S lưu vào kho khi đã kết nối
    const k1 = document.querySelector('#btn-save kbd'), k2 = document.querySelector('#btn-kho-save kbd');
    if (k1) k1.style.display = S.conf ? 'none' : '';
    if (k2) k2.style.display = S.conf ? '' : 'none';
    const dc = document.getElementById('btn-kho-disconnect');
    if (dc) dc.style.display = S.conf ? '' : 'none';
  }
  const busy = async (fn) => { S.busy++; updateChip(); try { return await fn(); } finally { S.busy--; updateChip(); } };

  // ---------- kết nối ----------
  async function connect(conf = S.conf) {
    const gh = new GitHubRepo({ repo: conf.repo, token: conf.token });
    const kho = new Kho(gh);
    const info = await kho.open();
    S.kho = kho;
    S.error = null;
    updateChip();
    return info;
  }

  /** Kho đã sẵn sàng (kết nối nếu cần; chưa cấu hình thì mở hộp kết nối). Trả về Kho hoặc null. */
  async function ensureKho({ silent = false } = {}) {
    if (S.kho) return S.kho;
    if (!S.conf) { if (!silent) await connectDialog(); return S.kho; }
    try {
      S.connecting ||= busy(() => connect());
      await S.connecting;
      return S.kho;
    } catch (e) {
      S.error = e.message;
      updateChip();
      if (silent) return null;
      if (e.code === 'offline') toast('Mất mạng – chưa mở được kho', 4000);
      else await confirmDialog('Không mở được kho', esc(e.message) + '<br>Kiểm tra lại ở <i>Kho › Kết nối kho…</i>', 'OK');
      return null;
    } finally {
      S.connecting = null;
    }
  }

  async function connectDialog() {
    const res = await modal((box, close) => {
      box.classList.add('wide');
      box.innerHTML = `<h3>Kết nối kho bài tập</h3>
        <div class="modal-body kho-help">
          Kho là một <b>repo GitHub riêng tư</b> của thầy/cô: mọi bài, buổi dạy được lưu ở đó, mở lại ở máy nào cũng được, GitHub giữ lịch sử mọi lần sửa.
          <ol>
            <li>Tạo repo: <a href="https://github.com/new" target="_blank" rel="noopener">github.com/new</a> → đặt tên (vd <code>kho-bai</code>) → chọn <b>Private</b> → <i>Create repository</i>.</li>
            <li>Tạo token: <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">Settings › Developer settings › Fine-grained tokens › Generate new token</a>
              → <i>Repository access</i>: <b>Only select repositories</b>, chọn repo kho → <i>Permissions › Repository permissions › Contents</i>: <b>Read and write</b> → <i>Generate token</i> → sao chép.</li>
            <li>Dán vào đây. Token chỉ lưu trong trình duyệt của máy này – chỉ nên dùng trên máy riêng.</li>
          </ol>
        </div>
        <label class="row">Repo <input type="text" class="k-repo" placeholder="tên-tài-khoản/kho-bai" value="${esc(S.conf ? S.conf.repo : '')}" spellcheck="false"></label>
        <label class="row">Token <input type="password" class="k-token" placeholder="github_pat_…" value="${esc(S.conf ? S.conf.token : '')}" spellcheck="false" autocomplete="off"></label>
        <div class="k-msg note"></div>
        <div class="modal-actions">${S.conf ? '<button class="k-off danger" style="margin-right:auto">Ngắt kết nối</button>' : ''}<button class="cancel">Huỷ</button><button class="primary">Kết nối</button></div>`;
      const msg = box.querySelector('.k-msg');
      box.querySelector('.cancel').onclick = () => close(null);
      const off = box.querySelector('.k-off');
      if (off) off.onclick = () => close('off');
      box.querySelector('.primary').onclick = async () => {
        let repo = box.querySelector('.k-repo').value.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/+$/, '');
        const token = box.querySelector('.k-token').value.trim();
        if (!/^[\w.-]+\/[\w.-]+$/.test(repo) || !token) { msg.textContent = 'Cần nhập repo dạng tên-tài-khoản/tên-repo và token.'; return; }
        msg.textContent = 'Đang kết nối…';
        try {
          const info = await connect({ repo, token });
          if (!info.private && !(await confirmDialog('Repo đang công khai', `Repo <b>${esc(repo)}</b> đang để <b>công khai</b>: ai cũng xem được đề và lời giải trong kho (cả học sinh). Nên đổi sang Private trong Settings của repo. Vẫn dùng repo này?`, 'Vẫn dùng'))) { S.kho = null; msg.textContent = ''; return; }
          if (info.permissions && info.permissions.push === false) { msg.textContent = 'Token chỉ có quyền đọc – cần quyền Contents: Read and write.'; S.kho = null; return; }
          close({ repo, token });
        } catch (e) {
          S.kho = null;
          msg.textContent = e.code === 'notfound' ? 'Không thấy repo (sai tên, hoặc token chưa được cấp quyền cho repo này).' : e.message;
        }
      };
    });
    if (res === 'off') {
      S.conf = null; S.kho = null; saveConf(null);
      toast('Đã ngắt kết nối kho (token đã xoá khỏi máy này)');
    } else if (res) {
      S.conf = res; saveConf(res);
      toast(`Đã kết nối kho ${res.repo} – ${Object.keys(S.kho.index.bai).length} bài`);
      flushQueue();
    }
    updateChip();
  }

  // ---------- hàng chờ khi mất mạng ----------
  async function loadQueue() { S.queue = (await idbGet(QUEUE_KEY)) || []; updateChip(); }
  const saveQueue = () => idbSet(QUEUE_KEY, S.queue);

  async function flushQueue() {
    if (S.flushing || !S.queue.length || !S.conf) return;
    S.flushing = true;
    try {
      const kho = await ensureKho();
      if (!kho) return;
      while (S.queue.length) {
        const it = S.queue[0];
        try {
          const r = await busy(() => kho.saveDoc(it.params));
          S.queue.shift();
          await saveQueue();
          afterSaved(it.tab, r, it.sig, it.params.meta);
        } catch (e) {
          if (e.code === 'offline') break;
          if (e.code === 'conflict') {
            S.queue.shift();
            await saveQueue();
            await resolveConflict(it.params, it.tab, it.sig, e);
            continue;
          }
          toast('Lưu lên kho bị lỗi: ' + e.message, 6000);
          break;
        }
      }
      if (!S.queue.length) toast('Đã đồng bộ các lần lưu đang chờ lên kho');
    } finally {
      S.flushing = false;
      updateChip();
    }
  }
  window.addEventListener('online', () => flushQueue());
  setInterval(() => { if (S.queue.length && navigator.onLine !== false) flushQueue(); }, 60e3);

  // ---------- lưu ----------
  const tabByUid = (u) => app.tabs.findIndex((t) => t.uid === u);

  function afterSaved(tabU, r, sig, meta) {
    const i = tabByUid(tabU);
    if (i >= 0) {
      const t = app.tabs[i];
      t.kho = { ma: r.ma, hinh: r.hinh, sha: r.sha };
      if (sig) t.savedSig = sig;
      const d = i === app.tabIdx ? app.doc : t.doc;
      if (!d.title && meta && meta.ten) {
        if (i === app.tabIdx) app.commit((doc) => { doc.title = meta.ten; });
        else d.title = meta.ten;
        if (sig) t.savedSig = docSig(i === app.tabIdx ? app.doc : t.doc);
      }
    }
    // các tab khác của cùng bài (bài nhiều hình): bài.json đã đổi → cập nhật phiên bản để lần lưu sau không báo nhầm xung đột
    app.tabs.forEach((t) => { if (t.kho && t.kho.ma === r.ma) t.kho.sha = r.sha; });
    app.emit('saved');
    updateChip();
  }

  /** Lưu (hoặc xếp hàng chờ nếu mất mạng). */
  async function doSave(params, tabIndex) {
    const t = app.tabs[tabIndex];
    const tabU = tabUid(t);
    const sig = docSig(tabIndex === app.tabIdx ? app.doc : t.doc);
    const kho = S.kho || (await ensureKho().catch(() => null));
    try {
      if (!kho) throw new KhoError('offline', 'chưa kết nối');
      const r = await busy(() => kho.saveDoc(params));
      afterSaved(tabU, r, sig, params.meta);
      toast(`Đã lưu vào kho: ${kho.index.bai[r.ma] ? kho.index.bai[r.ma].ten : r.ma}`);
      return r;
    } catch (e) {
      if (e.code === 'offline') {
        S.queue.push({ params, tab: tabU, sig, t: Date.now() });
        await saveQueue();
        updateChip();
        toast('Mất mạng – đã giữ lại trong máy, có mạng sẽ tự lưu lên kho', 5000);
        return null;
      }
      if (e.code === 'conflict') return resolveConflict(params, tabU, sig, e);
      await confirmDialog('Không lưu được vào kho', esc(e.message), 'OK');
      return null;
    }
  }

  async function resolveConflict(params, tabU, sig, e) {
    const ten = (e.current && e.current.meta && e.current.meta.ten) || params.ma;
    const v = await choiceDialog('Bài đã được sửa ở nơi khác',
      `Bài <b>${esc(ten)}</b> trong kho đã được lưu từ nơi khác (máy khác hoặc tab khác) sau khi thầy/cô mở nó. Lưu thế nào?`,
      [{ label: 'Mở bản trên kho (tab mới) để so', value: 'open' }, { label: 'Lưu thành bài mới', value: 'new' }, { label: 'Huỷ', value: null }, { label: 'Ghi đè bằng hình này', value: 'force', primary: true }]);
    if (v === 'force') return doSave({ ...params, force: true }, tabByUid(tabU));
    if (v === 'new') return doSave({ meta: { ...((e.current && e.current.meta) || {}), ten: `${ten} (bản sửa ${fmtDate(new Date().toISOString())})` }, doc: params.doc, thumb: params.thumb }, tabByUid(tabU));
    if (v === 'open') await openBai(params.ma, { forceNew: true });
    return null;
  }

  function currentPayload(i = app.tabIdx) {
    const d = i === app.tabIdx ? app.doc : app.tabs[i].doc;
    return {
      doc: compactDoc(tabDoc(app, i)),
      thumb: renderThumb(d, { theme: app.theme, trimLines: app.renderer.trimLines, images: app.images }),
    };
  }

  /** Ctrl+S (đã kết nối kho): tab đã gắn bài → lưu luôn; chưa → hỏi thông tin bài. */
  async function saveCurrent() {
    if (isEmptyDoc(app.doc)) return toast('Hình đang trống – chưa có gì để lưu');
    const kho = await ensureKho();
    if (!kho && !S.conf) return;
    const t = app.tabs[app.tabIdx];
    if (t.kho && t.kho.ma) return doSave({ ma: t.kho.ma, hinh: t.kho.hinh, ...currentPayload(), expectSha: t.kho.sha }, app.tabIdx);
    if (!kho) return toast('Chưa mở được kho – bài mới cần kết nối kho. Tạm lưu ra tệp: Tệp › Lưu hình này ra tệp', 5000);
    const r = await metaDialog({ title: 'Lưu vào kho', meta: { ten: app.doc.title || '', nguon: guessSource(app.doc.title) }, allowAttach: true, okLabel: 'Lưu vào kho' });
    if (!r) return;
    if (r.attachTo) return doSave({ ma: r.attachTo, hinh: null, ...currentPayload() }, app.tabIdx);
    return doSave({ meta: r.meta, ...currentPayload() }, app.tabIdx);
  }

  // ---------- hộp thông tin bài ----------
  function metaDialog({ title, meta = {}, allowAttach = false, okLabel = 'Lưu' }) {
    const kho = S.kho;
    const ix = kho.index;
    const kys = [...new Set([...Object.values(ix.bai).map((e) => e.nguon && e.nguon.ky).filter(Boolean), ...COMMON_KY.filter((k) => k !== 'Tự ra')])];
    const tags = [...new Set(Object.values(ix.bai).flatMap((e) => e.the || []))].sort((a, b) => a.localeCompare(b, 'vi'));
    const n = meta.nguon || {};
    const chosen = new Set(meta.chuDe || []);
    let doKho = meta.doKho || 0;
    return modal((box, close) => {
      box.classList.add('wide', 'kmeta');
      box.innerHTML = `<h3>${esc(title)}</h3>
        ${allowAttach ? `<div class="seg k-mode"><button data-m="new" class="on">Bài mới</button><button data-m="attach">Thêm làm hình phụ của bài có sẵn</button></div>
          <div class="k-attach" hidden><input type="text" class="k-attach-q" list="k-bai-list" placeholder="Gõ để tìm bài…"><datalist id="k-bai-list">${Object.entries(ix.bai).map(([ma, e]) => `<option value="${esc(e.ten)} [${esc(ma)}]">`).join('')}</datalist>
          <div class="note">Dùng khi một bài có nhiều hình (mỗi ý một hình). Mở bài là mở đủ các hình thành tab.</div></div>` : ''}
        <div class="k-fields">
          <label class="row">Tên bài <input type="text" class="k-ten" value="${esc(meta.ten || '')}" placeholder="vd VMO 2016 – Bài 4"></label>
          <div class="row k-src">Nguồn
            <input type="text" class="k-ky" list="k-ky-list" value="${esc(n.ky || '')}" placeholder="Kỳ thi (VMO, IMO…)"><datalist id="k-ky-list">${kys.map((k) => `<option value="${esc(k)}">`).join('')}</datalist>
            <input type="number" class="k-nam" value="${esc(n.nam || '')}" placeholder="Năm" min="1950" max="2100">
            <input type="text" class="k-so" value="${esc(n.so || '')}" placeholder="Bài số">
            <label class="k-tura"><input type="checkbox" class="k-tuRa" ${n.tuRa ? 'checked' : ''}> Tự ra</label></div>
          <div class="k-label">Chủ đề</div>
          <div class="chips k-topics">${kho.topics.map((t) => `<button type="button" class="chip ${chosen.has(t) ? 'on' : ''}" data-t="${esc(t)}">${esc(t)}</button>`).join('')}</div>
          <label class="row">Kỹ thuật, thẻ <input type="text" class="k-the" value="${esc((meta.the || []).join(', '))}" placeholder="phân cách bằng dấu phẩy: vị tự quay, đường tròn Euler…"></label>
          ${tags.length ? `<div class="chips small k-tagsugg">${tags.slice(0, 40).map((t) => `<button type="button" class="chip" data-g="${esc(t)}">+ ${esc(t)}</button>`).join('')}</div>` : ''}
          <div class="row">Độ khó <span class="k-dk">${[1, 2, 3, 4, 5].map((i) => `<button type="button" data-d="${i}" class="${i <= doKho ? 'on' : ''}" title="${i}/5">●</button>`).join('')}</span><span class="note k-dk-l"></span></div>
          <label class="row k-gc">Ghi chú riêng <textarea class="k-ghiChu" rows="2" placeholder="Chỉ thầy/cô thấy: gợi ý dạy, lỗi học sinh hay mắc…">${esc(meta.ghiChu || '')}</textarea></label>
        </div>
        <div class="k-msg note"></div>
        <div class="modal-actions"><button class="cancel">Huỷ</button><button class="primary">${esc(okLabel)}</button></div>`;
      const q = (s) => box.querySelector(s);
      let mode = 'new';
      if (allowAttach) {
        box.querySelectorAll('.k-mode button').forEach((b) => { b.onclick = () => { mode = b.dataset.m; box.querySelectorAll('.k-mode button').forEach((x) => x.classList.toggle('on', x === b)); q('.k-attach').hidden = mode !== 'attach'; q('.k-fields').hidden = mode === 'attach'; }; });
      }
      q('.k-topics').onclick = (e) => { const b = e.target.closest('[data-t]'); if (b) b.classList.toggle('on'); };
      const sugg = q('.k-tagsugg');
      if (sugg) sugg.onclick = (e) => { const b = e.target.closest('[data-g]'); if (!b) return; const inp = q('.k-the'); const cur = inp.value.split(',').map((x) => x.trim()).filter(Boolean); if (!cur.includes(b.dataset.g)) inp.value = [...cur, b.dataset.g].join(', '); };
      const dkLabel = ['chưa đánh giá', 'dễ', 'vừa', 'khá khó', 'khó', 'rất khó'];
      const paintDk = () => { box.querySelectorAll('.k-dk button').forEach((b) => b.classList.toggle('on', +b.dataset.d <= doKho)); q('.k-dk-l').textContent = dkLabel[doKho]; };
      q('.k-dk').onclick = (e) => { const b = e.target.closest('[data-d]'); if (!b) return; doKho = doKho === +b.dataset.d ? 0 : +b.dataset.d; paintDk(); };
      paintDk();
      const tuRa = q('.k-tuRa');
      const syncTuRa = () => ['.k-ky', '.k-nam', '.k-so'].forEach((s) => { q(s).disabled = tuRa.checked; });
      tuRa.onchange = syncTuRa;
      syncTuRa();
      // gõ tên kiểu "VMO 2016 – Bài 4" → tự điền nguồn nếu ô nguồn còn trống
      q('.k-ten').oninput = () => { if (q('.k-ky').value || tuRa.checked) return; const g = guessSource(q('.k-ten').value); if (g) { q('.k-ky').value = g.ky; q('.k-nam').value = g.nam; q('.k-so').value = g.so || ''; } };
      box.querySelector('.cancel').onclick = () => close(null);
      box.querySelector('.primary').onclick = () => {
        if (mode === 'attach') {
          const m = /\[([a-z0-9-]+)\]\s*$/.exec(q('.k-attach-q').value);
          if (!m || !ix.bai[m[1]]) { q('.k-msg').textContent = 'Chọn một bài trong danh sách gợi ý.'; return; }
          return close({ attachTo: m[1] });
        }
        const ten = q('.k-ten').value.trim();
        if (!ten) { q('.k-msg').textContent = 'Cần đặt tên bài.'; q('.k-ten').focus(); return; }
        close({
          meta: {
            ten,
            nguon: tuRa.checked ? { tuRa: true } : { ky: q('.k-ky').value.trim(), nam: q('.k-nam').value.trim(), so: q('.k-so').value.trim() },
            chuDe: [...box.querySelectorAll('.k-topics .chip.on')].map((b) => b.dataset.t),
            the: q('.k-the').value.split(',').map((x) => x.trim()).filter(Boolean),
            doKho,
            ghiChu: q('.k-ghiChu').value,
          },
        });
      };
    });
  }

  // ---------- mở bài ----------
  /** Mở bài thành tab (mỗi hình một tab). Bài đang mở sẵn thì chuyển tới. opts.ref: phiên bản cũ (mở thành bản sao). */
  async function openBai(ma, { ref = null, forceNew = false } = {}) {
    const kho = await ensureKho();
    if (!kho) return false;
    if (!ref && !forceNew) {
      const open = app.tabs.findIndex((t) => t.kho && t.kho.ma === ma);
      if (open >= 0) { app.switchTab(open); return true; }
    }
    try {
      const b = await busy(() => kho.loadBai(ma, ref));
      b.docs.forEach((doc, i) => {
        if (!doc.title) doc.title = b.docs.length > 1 ? `${b.meta.ten} (${i + 1})` : b.meta.ten;
        const link = ref || forceNew ? null : { ma, hinh: i, sha: b.sha };
        app.openDoc(doc, { kho: link });
        app.tabs[app.tabIdx].savedSig = link ? docSig(app.doc) : null;
        if (!doc.view) app.zoomFit();
      });
      app.emit('saved');
      return true;
    } catch (e) {
      await confirmDialog('Không mở được bài', esc(e.message), 'OK');
      return false;
    }
  }

  // ---------- cửa sổ kho ----------
  async function openBrowser(view = 'bai') {
    const kho = await ensureKho();
    if (!kho) return;
    const F = { chuDe: new Set(), ky: new Set(), doKho: new Set(), trangThai: new Set(), daDay: null };
    let q = '', sort = 'moi', paint = null;
    const sel = new Set();
    busy(() => kho.refresh()).then(() => paint && paint()).catch(() => {});
    await modal((box, close) => {
      box.classList.add('kho-win');
      box.innerHTML = `<div class="kw-head"><h3>Kho bài</h3><input type="search" class="kw-q" placeholder="Tìm tên, nguồn, chủ đề, thẻ, chữ trong đề/lời giải… (không cần dấu)">
        <select class="kw-sort" title="Sắp xếp"><option value="moi">Mới sửa trước</option><option value="ten">Theo tên</option><option value="nguon">Theo nguồn</option><option value="doKho">Theo độ khó</option></select>
        <button class="kw-x" title="Đóng (Esc)">✕</button></div>
        <div class="kw-tabs"><button data-v="bai">Bài tập</button><button data-v="buoi">Buổi dạy</button><span class="spacer"></span>
          <button class="kw-import">Nhập tệp vào kho…</button><button class="kw-topics">Sửa danh sách chủ đề…</button><button class="kw-conn">Kết nối…</button></div>
        <div class="kw-body"><aside class="kw-filter"></aside><div class="kw-main"></div></div>
        <div class="kw-foot"><span class="kw-count"></span><span class="spacer"></span><button class="kw-open-sel" disabled>Mở các bài đã chọn</button><button class="kw-buoi-sel primary" disabled>Tạo buổi dạy từ các bài đã chọn</button></div>`;
      const $ = (s) => box.querySelector(s);
      const main = $('.kw-main'), filt = $('.kw-filter');
      $('.kw-x').onclick = () => close(null);
      $('.kw-q').oninput = (e) => { q = e.target.value; paint(); };
      $('.kw-sort').onchange = (e) => { sort = e.target.value; paint(); };
      $('.kw-conn').onclick = async () => { close(null); await connectDialog(); };
      $('.kw-import').onclick = async () => { close(null); await importDialog(); };
      $('.kw-topics').onclick = async () => {
        const t = await textDialogEditable('Danh sách chủ đề', kho.topics.join('\n'), 'Mỗi dòng một chủ đề. Đổi tên một chủ đề không tự đổi ở các bài đã gắn (sửa lại ở <i>Sửa thông tin</i> của bài).');
        if (t == null || t === '\u0000default') return;
        await busy(() => kho.saveTopics(t.split('\n'))).catch((e) => toast(e.message, 5000));
        paint();
      };
      box.querySelectorAll('.kw-tabs [data-v]').forEach((b) => { b.onclick = () => { view = b.dataset.v; paint(); }; });
      $('.kw-open-sel').onclick = async () => { const list = [...sel]; close(null); for (const ma of list) await openBai(ma); };
      $('.kw-buoi-sel').onclick = async () => { const list = [...sel]; close(null); await buoiDialog({ bai: list }); };

      const thumbs = new IntersectionObserver((ents) => {
        for (const en of ents) {
          if (!en.isIntersecting) continue;
          const el = en.target;
          thumbs.unobserve(el);
          kho.thumb(el.dataset.ma).then((url) => { if (url) el.innerHTML = `<img src="${url}" alt="">`; }).catch(() => {});
        }
      }, { root: main });

      const count = (key, fn) => { const m = new Map(); for (const e of Object.values(kho.index.bai)) for (const k of fn(e)) m.set(k, (m.get(k) || 0) + 1); return m; };
      function paintFilter() {
        const topics = count('chuDe', (e) => e.chuDe || []);
        const kys = count('ky', (e) => [kyOf(e)]);
        const st = count('st', (e) => [e.trangThai]);
        const group = (title, key, items) => items.length ? `<div class="kf-g"><div class="kf-t">${title}</div>${items.map(([v, label, n]) => `<label class="kf-i"><input type="checkbox" data-k="${key}" data-v="${esc(v)}" ${F[key].has(key === 'doKho' ? +v : v) ? 'checked' : ''}><span>${esc(label)}</span><i>${n}</i></label>`).join('')}</div>` : '';
        const allTopics = [...new Set([...kho.topics, ...topics.keys()])].filter((t) => topics.get(t));
        filt.innerHTML = `<button class="kf-clear" ${[...Object.values(F)].some((x) => x && x.size) || F.daDay != null ? '' : 'hidden'}>Bỏ mọi bộ lọc</button>`
          + group('Chủ đề', 'chuDe', allTopics.map((t) => [t, t, topics.get(t)]))
          + group('Nguồn', 'ky', [...kys].sort((a, b) => b[1] - a[1]).map(([k, n]) => [k, k, n]))
          + group('Độ khó', 'doKho', [1, 2, 3, 4, 5, 0].map((d) => [d, d ? '●'.repeat(d) : 'Chưa đánh giá', Object.values(kho.index.bai).filter((e) => (e.doKho || 0) === d).length]).filter((x) => x[2]))
          + group('Trạng thái', 'trangThai', Object.entries(STATUS).map(([k, l]) => [k, l, st.get(k) || 0]).filter((x) => x[2]))
          + `<div class="kf-g"><div class="kf-t">Đã dạy</div><label class="kf-i"><input type="radio" name="kf-day" data-day="" ${F.daDay == null ? 'checked' : ''}><span>Tất cả</span></label><label class="kf-i"><input type="radio" name="kf-day" data-day="1" ${F.daDay === true ? 'checked' : ''}><span>Đã dạy</span></label><label class="kf-i"><input type="radio" name="kf-day" data-day="0" ${F.daDay === false ? 'checked' : ''}><span>Chưa dạy</span></label></div>`;
        filt.querySelectorAll('input[data-k]').forEach((c) => { c.onchange = () => { const k = c.dataset.k, v = k === 'doKho' ? +c.dataset.v : c.dataset.v; if (c.checked) F[k].add(v); else F[k].delete(v); paint(); }; });
        filt.querySelectorAll('input[data-day]').forEach((c) => { c.onchange = () => { F.daDay = c.dataset.day === '' ? null : c.dataset.day === '1'; paint(); }; });
        const cl = filt.querySelector('.kf-clear');
        if (cl) cl.onclick = () => { for (const k of ['chuDe', 'ky', 'doKho', 'trangThai']) F[k].clear(); F.daDay = null; paint(); };
      }

      function paintBai() {
        const rows = filterIndex(kho.index, q, F, sort);
        const nb = Object.keys(kho.index.bai).length;
        $('.kw-count').textContent = `${rows.length}/${nb} bài${sel.size ? ` · đã chọn ${sel.size}` : ''}`;
        if (!nb) {
          main.innerHTML = `<div class="kw-empty"><b>Kho còn trống.</b><br>Mở một hình rồi nhấn <kbd>Ctrl+S</kbd> để lưu bài đầu tiên, hoặc <button class="kw-imp2">nhập các tệp .json đã lưu</button>.</div>`;
          main.querySelector('.kw-imp2').onclick = async () => { close(null); await importDialog(); };
          return;
        }
        if (!rows.length) { main.innerHTML = '<div class="kw-empty">Không có bài nào khớp tìm kiếm / bộ lọc.</div>'; return; }
        main.innerHTML = `<div class="kgrid">${rows.map(([ma, e]) => {
          const taught = kho.taughtIn(ma);
          const openNow = app.tabs.some((t) => t.kho && t.kho.ma === ma);
          return `<div class="kcard ${sel.has(ma) ? 'sel' : ''}" data-ma="${esc(ma)}" tabindex="0">
            <div class="kc-thumb" data-ma="${esc(ma)}"><span>${esc((e.ten || '?').trim()[0] || '?')}</span></div>
            <label class="kc-sel" title="Chọn (để mở nhiều bài / tạo buổi dạy)"><input type="checkbox" ${sel.has(ma) ? 'checked' : ''}></label>
            <button class="kc-more" title="Thêm thao tác">⋯</button>
            <div class="kc-info"><div class="kc-ten">${esc(e.ten)}${e.soHinh > 1 ? ` <span class="kc-n">${e.soHinh} hình</span>` : ''}</div>
              <div class="kc-src">${esc(sourceLabel(e.nguon) || 'Chưa ghi nguồn')}${e.doKho ? ` · <span class="kc-dk" title="Độ khó ${e.doKho}/5">${'●'.repeat(e.doKho)}<i>${'●'.repeat(5 - e.doKho)}</i></span>` : ''}</div>
              ${(e.chuDe || []).length || (e.the || []).length ? `<div class="kc-tags">${(e.chuDe || []).map((t) => `<span class="tag">${esc(t)}</span>`).join('')}${(e.the || []).map((t) => `<span class="tag soft">${esc(t)}</span>`).join('')}</div>` : ''}
              <div class="kc-st"><span class="st st-${e.trangThai}">${STATUS[e.trangThai] || ''}</span>${taught.length ? ` · đã dạy ${taught.length} lần (gần nhất ${fmtDate(taught[0].ngay) || taught[0].ten})` : ''}${openNow ? ' · <b>đang mở</b>' : ''}</div></div></div>`;
        }).join('')}</div>`;
        main.querySelectorAll('.kc-thumb').forEach((el) => thumbs.observe(el));
        main.querySelectorAll('.kcard').forEach((c) => {
          const ma = c.dataset.ma;
          c.onclick = async (ev) => {
            if (ev.target.closest('.kc-sel')) { const cb = c.querySelector('.kc-sel input'); if (ev.target !== cb) return; if (cb.checked) sel.add(ma); else sel.delete(ma); c.classList.toggle('sel', cb.checked); updateFoot(); return; }
            if (ev.target.closest('.kc-more')) { ev.stopPropagation(); cardMenu(c.querySelector('.kc-more'), ma); return; }
            close(null);
            await openBai(ma);
          };
          c.onkeydown = (ev) => { if (ev.key === 'Enter') c.click(); };
        });
      }

      function cardMenu(anchor, ma) {
        document.querySelector('.kpop')?.remove();
        const pop = document.createElement('div');
        pop.className = 'kpop';
        pop.innerHTML = `<button data-a="open">Mở</button><button data-a="meta">Sửa thông tin…</button><button data-a="hist">Các phiên bản cũ…</button><button data-a="buoi">Thêm vào buổi dạy…</button><div class="menu-sep"></div><button data-a="del" class="danger-t">Xoá khỏi kho…</button>`;
        const r = anchor.getBoundingClientRect(), br = box.getBoundingClientRect();
        pop.style.left = `${r.right - br.left - 190}px`;
        pop.style.top = `${r.bottom - br.top + 4}px`;
        box.appendChild(pop);
        const off = (ev) => { if (!pop.contains(ev.target)) { pop.remove(); document.removeEventListener('pointerdown', off, true); } };
        document.addEventListener('pointerdown', off, true);
        pop.onclick = async (ev) => {
          const a = ev.target.closest('[data-a]');
          if (!a) return;
          pop.remove();
          const act = a.dataset.a;
          if (act === 'open') { close(null); await openBai(ma); }
          else if (act === 'meta') await editMeta(ma).then(paint);
          else if (act === 'hist') { const ok = await historyDialog(ma); if (ok) close(null); }
          else if (act === 'buoi') await addToBuoiDialog(ma).then(paint);
          else if (act === 'del') {
            const e = kho.index.bai[ma];
            if (!(await confirmDialog('Xoá bài khỏi kho', `Xoá <b>${esc(e.ten)}</b> khỏi kho? Bài cũng bị gỡ khỏi các buổi dạy. (Vẫn lấy lại được từ lịch sử repo trên GitHub.)`, 'Xoá'))) return;
            await busy(() => kho.deleteBai(ma)).catch((er) => toast(er.message, 5000));
            app.tabs.forEach((t) => { if (t.kho && t.kho.ma === ma) { t.kho = null; t.savedSig = null; } });
            sel.delete(ma);
            app.emit('saved');
            paint();
          }
        };
      }

      function paintBuoi() {
        const list = Object.entries(kho.index.buoi).sort((a, b) => String(b[1].ngay || b[1].capNhat).localeCompare(String(a[1].ngay || a[1].capNhat)));
        $('.kw-count').textContent = `${list.length} buổi dạy`;
        const words = q.trim().toLowerCase();
        const shown = list.filter(([, b]) => !words || [b.ten, b.lop, b.ghiChu, ...b.bai.map((m) => kho.index.bai[m]?.ten)].join(' ').toLowerCase().includes(words));
        main.innerHTML = shown.length ? `<div class="kbuoi">${shown.map(([bm, b]) => `<div class="kb-row" data-b="${esc(bm)}">
            <div class="kb-info"><div class="kb-ten">${esc(b.ten)}</div><div class="kb-sub">${[b.ngay && fmtDate(b.ngay), b.lop, `${b.bai.length} bài`].filter(Boolean).map(esc).join(' · ')}</div>
              <div class="kb-bai">${b.bai.map((m, i) => `<span>${i + 1}. ${esc(kho.index.bai[m] ? kho.index.bai[m].ten : '(đã xoá)')}</span>`).join('')}</div>${b.ghiChu ? `<div class="note">${esc(b.ghiChu)}</div>` : ''}</div>
            <div class="kb-act"><button data-a="open" class="primary">Mở buổi</button><button data-a="edit">Sửa…</button><button data-a="de">Phiếu đề (.tex)</button><button data-a="full">Phiếu kèm lời giải</button><button data-a="del" class="danger-t">Xoá</button></div></div>`).join('')}</div>`
          : `<div class="kw-empty">${list.length ? 'Không có buổi nào khớp tìm kiếm.' : 'Chưa có buổi dạy nào. Mở các bài định dạy rồi chọn <i>Kho › Lưu các tab đang mở thành buổi dạy…</i>, hoặc chọn nhiều bài ở mục Bài tập rồi bấm <i>Tạo buổi dạy</i>.'}</div>`;
        main.querySelectorAll('.kb-row').forEach((row) => {
          const bm = row.dataset.b;
          row.querySelector('.kb-act').onclick = async (ev) => {
            const a = ev.target.closest('[data-a]');
            if (!a) return;
            const act = a.dataset.a, b = kho.index.buoi[bm];
            if (act === 'open') { close(null); for (const m of b.bai) if (kho.index.bai[m]) await openBai(m); toast(`Đã mở buổi "${b.ten}" (${b.bai.length} bài)`); }
            else if (act === 'edit') { await buoiDialog({ ma: bm, ...b }); paint(); }
            else if (act === 'de' || act === 'full') await exportBuoi(bm, act === 'full');
            else if (act === 'del') {
              if (!(await confirmDialog('Xoá buổi dạy', `Xoá buổi <b>${esc(b.ten)}</b>? Các bài vẫn còn trong kho.`, 'Xoá'))) return;
              await busy(() => kho.deleteBuoi(bm)).catch((er) => toast(er.message, 5000));
              paint();
            }
          };
        });
      }

      function updateFoot() {
        $('.kw-open-sel').disabled = $('.kw-buoi-sel').disabled = !sel.size || view !== 'bai';
        $('.kw-foot').hidden = view !== 'bai';
        if (view === 'bai') $('.kw-count').textContent = $('.kw-count').textContent.replace(/ · đã chọn \d+$/, '') + (sel.size ? ` · đã chọn ${sel.size}` : '');
      }

      paint = () => {
        box.querySelectorAll('.kw-tabs [data-v]').forEach((b) => {
          b.classList.toggle('on', b.dataset.v === view);
          b.textContent = b.dataset.v === 'bai' ? `Bài tập (${Object.keys(kho.index.bai).length})` : `Buổi dạy (${Object.keys(kho.index.buoi).length})`;
        });
        filt.hidden = view !== 'bai';
        $('.kw-sort').hidden = view !== 'bai';
        if (view === 'bai') { paintFilter(); paintBai(); } else paintBuoi();
        updateFoot();
      };
      paint();
      setTimeout(() => $('.kw-q').focus(), 0);
    });
    paint = null;
  }

  async function editMeta(ma) {
    const kho = S.kho;
    const e = kho.index.bai[ma];
    const r = await metaDialog({ title: 'Thông tin bài', meta: e, okLabel: 'Lưu thông tin' });
    if (!r) return;
    try {
      const res = await busy(() => kho.updateMeta(ma, r.meta));
      app.tabs.forEach((t) => { if (t.kho && t.kho.ma === ma) t.kho.sha = res.sha; });
      toast('Đã lưu thông tin bài');
    } catch (er) { toast(er.message, 5000); }
  }

  async function historyDialog(ma) {
    const kho = S.kho;
    let list;
    try { list = await busy(() => kho.history(ma)); } catch (e) { toast(e.message, 5000); return false; }
    const pick = await modal((box, close) => {
      box.classList.add('wide');
      box.innerHTML = `<h3>Các phiên bản: ${esc(kho.index.bai[ma].ten)}</h3><div class="modal-body">Mỗi lần lưu là một phiên bản. Mở một bản cũ thành <b>tab mới</b> (bản sao, không gắn với kho) để xem hoặc chép lại phần cần.</div>
        <div class="pick-list">${list.map((c, i) => `<button class="pick" data-i="${i}"><b>${fmtTime(c.date)}${i === 0 ? ' – bản hiện tại' : ''}</b><span>${esc(c.message || '')}</span></button>`).join('')}</div>
        <div class="modal-actions"><button class="cancel">Đóng</button></div>`;
      box.querySelector('.cancel').onclick = () => close(null);
      box.querySelectorAll('.pick').forEach((b) => { b.onclick = () => close(+b.dataset.i); });
    });
    if (pick == null) return false;
    if (pick === 0) return openBai(ma, { forceNew: false });
    const c = list[pick];
    return openBai(ma, { ref: c.sha, forceNew: true }).then((ok) => { if (ok) app.commit((d) => { d.title = `${kho.index.bai[ma].ten} – bản ${fmtTime(c.date)}`; }); return ok; });
  }

  // ---------- buổi dạy ----------
  async function addToBuoiDialog(ma) {
    const kho = S.kho;
    const list = Object.entries(kho.index.buoi);
    const v = await choiceDialog('Thêm vào buổi dạy', list.length ? 'Chọn buổi:' : 'Chưa có buổi dạy nào.', [...list.slice(0, 12).map(([bm, b]) => ({ label: `${b.ten}${b.ngay ? ' – ' + fmtDate(b.ngay) : ''}`, value: bm })), { label: '+ Buổi mới…', value: '\u0000new', primary: true }]);
    if (v == null) return;
    if (v === '\u0000new') return buoiDialog({ bai: [ma] });
    const b = kho.index.buoi[v];
    if (b.bai.includes(ma)) return toast('Bài đã có trong buổi này');
    await busy(() => kho.saveBuoi({ ma: v, ...b, bai: [...b.bai, ma] })).then(() => toast(`Đã thêm vào buổi "${b.ten}"`)).catch((e) => toast(e.message, 5000));
  }

  /** Sửa / tạo buổi dạy. buoi: {ma?, ten, ngay, lop, ghiChu, bai: [mã]}. */
  async function buoiDialog(buoi) {
    const kho = await ensureKho();
    if (!kho) return null;
    const lops = [...new Set(Object.values(kho.index.buoi).map((b) => b.lop).filter(Boolean))];
    let bai = [...(buoi.bai || [])];
    const res = await modal((box, close) => {
      box.classList.add('wide');
      box.innerHTML = `<h3>${buoi.ma ? 'Sửa buổi dạy' : 'Buổi dạy mới'}</h3>
        <label class="row">Tên buổi <input type="text" class="b-ten" value="${esc(buoi.ten || '')}" placeholder="vd Buổi 5 – Tứ giác nội tiếp"></label>
        <div class="row">Ngày <input type="date" class="b-ngay" value="${esc(buoi.ngay || today())}"> Lớp <input type="text" class="b-lop" list="b-lop-list" value="${esc(buoi.lop || '')}" placeholder="vd 11 Toán"><datalist id="b-lop-list">${lops.map((l) => `<option value="${esc(l)}">`).join('')}</datalist></div>
        <label class="row">Ghi chú <input type="text" class="b-gc" value="${esc(buoi.ghiChu || '')}" placeholder="tuỳ ý"></label>
        <div class="k-label">Các bài (theo thứ tự dạy)</div><div class="b-list"></div>
        <div class="row"><input type="text" class="b-add" list="b-bai-list" placeholder="Thêm bài: gõ để tìm…"><datalist id="b-bai-list">${Object.entries(kho.index.bai).map(([ma, e]) => `<option value="${esc(e.ten)} [${esc(ma)}]">`).join('')}</datalist></div>
        <div class="k-msg note"></div>
        <div class="modal-actions"><button class="cancel">Huỷ</button><button class="primary">Lưu buổi dạy</button></div>`;
      const q = (s) => box.querySelector(s);
      const paintList = () => {
        q('.b-list').innerHTML = bai.length ? bai.map((m, i) => `<div class="b-item"><span>${i + 1}. ${esc(kho.index.bai[m] ? kho.index.bai[m].ten : m)}</span><button data-u="${i}" ${i ? '' : 'disabled'} title="Lên">↑</button><button data-d="${i}" ${i < bai.length - 1 ? '' : 'disabled'} title="Xuống">↓</button><button data-x="${i}" title="Bỏ khỏi buổi">✕</button></div>`).join('') : '<div class="note">Chưa có bài nào.</div>';
      };
      paintList();
      q('.b-list').onclick = (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.u) { const i = +b.dataset.u; [bai[i - 1], bai[i]] = [bai[i], bai[i - 1]]; }
        if (b.dataset.d) { const i = +b.dataset.d; [bai[i + 1], bai[i]] = [bai[i], bai[i + 1]]; }
        if (b.dataset.x) bai.splice(+b.dataset.x, 1);
        paintList();
      };
      q('.b-add').onchange = () => { const m = /\[([a-z0-9-]+)\]\s*$/.exec(q('.b-add').value); if (m && kho.index.bai[m[1]] && !bai.includes(m[1])) { bai.push(m[1]); paintList(); } q('.b-add').value = ''; };
      q('.cancel').onclick = () => close(null);
      q('.primary').onclick = () => {
        if (!bai.length) { q('.k-msg').textContent = 'Buổi dạy cần ít nhất một bài.'; return; }
        close({ ma: buoi.ma, ten: q('.b-ten').value || `Buổi ${fmtDate(q('.b-ngay').value)}`, ngay: q('.b-ngay').value, lop: q('.b-lop').value, ghiChu: q('.b-gc').value, bai });
      };
    });
    if (!res) return null;
    try {
      const bm = await busy(() => kho.saveBuoi(res));
      toast(`Đã lưu buổi dạy "${res.ten}"`);
      return bm;
    } catch (e) { toast(e.message, 5000); return null; }
  }

  /** Kho › Lưu các tab đang mở thành buổi dạy: lưu từng tab vào kho (tab chưa có thì thành bài mới), rồi tạo buổi. */
  async function saveTabsAsBuoi() {
    const kho = await ensureKho();
    if (!kho) return;
    app.stashTab();
    const idx = app.tabs.map((_, i) => i).filter((i) => !isEmptyDoc(i === app.tabIdx ? app.doc : app.tabs[i].doc));
    if (!idx.length) return toast('Chưa có hình nào đang mở');
    const name = (i) => (i === app.tabIdx ? app.doc : app.tabs[i].doc).title || `Hình ${i + 1}`;
    const pick = await modal((box, close) => {
      box.classList.add('wide');
      box.innerHTML = `<h3>Lưu các tab đang mở thành buổi dạy</h3><div class="modal-body">Mỗi tab được lưu vào kho (tab chưa có trong kho thành <b>bài mới</b> mang tên tab – sửa thông tin sau), rồi gom thành một buổi theo thứ tự tab.</div>
        <div class="pick-list">${idx.map((i) => { const t = app.tabs[i]; return `<label class="b-tab"><input type="checkbox" data-i="${i}" checked> ${esc(name(i))} <span class="note">${t.kho ? (t.kho.ma && kho.index.bai[t.kho.ma] ? '· đã có trong kho' : '') : '· bài mới'}</span></label>`; }).join('')}</div>
        <div class="modal-actions"><button class="cancel">Huỷ</button><button class="primary">Tiếp tục</button></div>`;
      box.querySelector('.cancel').onclick = () => close(null);
      box.querySelector('.primary').onclick = () => close([...box.querySelectorAll('input[data-i]:checked')].map((c) => +c.dataset.i));
    });
    if (!pick || !pick.length) return;
    const codes = [];
    for (const i of pick) {
      const t = app.tabs[i];
      const d = i === app.tabIdx ? app.doc : t.doc;
      const payload = currentPayload(i);
      let r;
      if (t.kho && t.kho.ma && kho.index.bai[t.kho.ma]) {
        r = docSig(d) === t.savedSig ? { ma: t.kho.ma } : await doSave({ ma: t.kho.ma, hinh: t.kho.hinh, ...payload, expectSha: t.kho.sha }, i);
      } else {
        r = await doSave({ meta: { ten: name(i), nguon: guessSource(name(i)) }, ...payload }, i);
      }
      if (!r) return toast('Dừng: còn tab chưa lưu được vào kho – buổi dạy chưa được tạo', 5000);
      if (!codes.includes(r.ma)) codes.push(r.ma);
    }
    await buoiDialog({ ten: '', ngay: today(), bai: codes });
  }

  async function exportBuoi(bm, loiGiai) {
    const kho = S.kho;
    const b = kho.index.buoi[bm];
    try {
      const items = [];
      for (const m of b.bai) {
        if (!kho.index.bai[m]) continue;
        const r = await busy(() => kho.loadBai(m));
        items.push({ title: r.meta.ten, docs: r.docs });
      }
      const { tex, files } = toLatexSet(items, { title: b.ten, subtitle: [b.lop, b.ngay && fmtDate(b.ngay)].filter(Boolean).join(' – '), theme: app.theme, trimLines: app.renderer.trimLines, loiGiai });
      await downloadTex(fileSafeName(`${b.ten}${loiGiai ? '-loi-giai' : '-de'}`), tex, files);
    } catch (e) { toast(e.message, 5000); }
  }

  // ---------- nhập tệp ----------
  async function importDialog() {
    const kho = await ensureKho();
    if (!kho) return;
    let rows = []; // {doc, ten, nguon, on}
    const res = await modal((box, close) => {
      box.classList.add('wide');
      box.innerHTML = `<h3>Nhập vào kho</h3><div class="modal-body">Chọn các tệp <code>.json</code> đã lưu (một hình, hoặc tệp "lưu tất cả các tab"). Mỗi hình thành một bài; sửa tên ngay ở đây, các thông tin khác sửa sau.</div>
        <div class="row"><button class="i-files">Chọn tệp…</button><button class="i-tabs">Lấy các tab đang mở</button><button class="i-ex">Thêm các bài ví dụ có sẵn</button></div>
        <div class="pick-list i-list"></div>
        <div class="k-msg note"></div>
        <div class="modal-actions"><button class="cancel">Huỷ</button><button class="primary" disabled>Nhập</button></div>`;
      const q = (s) => box.querySelector(s);
      const paintRows = () => {
        q('.i-list').innerHTML = rows.map((r, i) => `<label class="i-row"><input type="checkbox" data-i="${i}" ${r.on ? 'checked' : ''}><input type="text" data-t="${i}" value="${esc(r.ten)}"><span class="note">${esc(sourceLabel(r.nguon) || '')}${r.doc.boxes && r.doc.boxes.length ? ' · có khung chữ' : ''}</span></label>`).join('');
        const n = rows.filter((r) => r.on).length;
        q('.primary').disabled = !n;
        q('.primary').textContent = n ? `Nhập ${n} bài` : 'Nhập';
        q('.i-list').querySelectorAll('[data-i]').forEach((c) => { c.onchange = () => { rows[+c.dataset.i].on = c.checked; paintRows(); }; });
        q('.i-list').querySelectorAll('[data-t]').forEach((c) => { c.oninput = () => { rows[+c.dataset.t].ten = c.value; }; });
      };
      const add = (doc, ten) => {
        if (isEmptyDoc(doc)) return;
        if (rows.some((r) => JSON.stringify(r.doc.steps) === JSON.stringify(doc.steps) && JSON.stringify(r.doc.boxes || null) === JSON.stringify(doc.boxes || null))) return;
        const t = ten || doc.title || `Bài ${rows.length + 1}`;
        rows.push({ doc, ten: t, nguon: guessSource(t), on: !Object.values(kho.index.bai).some((e) => e.ten === t) });
      };
      q('.i-files').onclick = () => {
        const inp = document.createElement('input');
        inp.type = 'file'; inp.accept = '.json,application/json'; inp.multiple = true;
        inp.onchange = async () => {
          for (const f of inp.files) {
            try { const { docs } = parseFileText(await f.text()); docs.forEach((d) => add(d, docs.length === 1 ? d.title || f.name.replace(/\.json$/i, '') : null)); } catch (e) { q('.k-msg').textContent = `${f.name}: ${e.message}`; }
          }
          paintRows();
        };
        inp.click();
      };
      q('.i-tabs').onclick = () => { app.stashTab(); app.tabs.forEach((_, i) => add(compactDoc(tabDoc(app, i)))); paintRows(); };
      q('.i-ex').onclick = () => { for (const ex of (window.GeoCore && window.GeoCore.THU_VIEN) || []) add(JSON.parse(JSON.stringify(ex.doc)), ex.doc.title); paintRows(); };
      q('.cancel').onclick = () => close(null);
      q('.primary').onclick = () => close(rows.filter((r) => r.on));
      paintRows();
    });
    if (!res || !res.length) return;
    const items = res.map((r) => ({ meta: { ten: r.ten.trim() || 'Bài chưa đặt tên', nguon: r.nguon }, docs: [r.doc], thumb: renderThumb(r.doc, { theme: app.theme, trimLines: app.renderer.trimLines }) }));
    try {
      const codes = await busy(() => kho.importMany(items));
      toast(`Đã nhập ${codes.length} bài vào kho`, 4000);
    } catch (e) { await confirmDialog('Không nhập được', esc(e.message), 'OK'); }
  }

  // ---------- nối vào giao diện ----------
  const on = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
  on('kho-status', () => (S.conf ? openBrowser() : connectDialog()));
  on('btn-kho-open', () => openBrowser());
  on('btn-kho-save', () => saveCurrent());
  on('btn-kho-meta', async () => {
    const t = app.tabs[app.tabIdx];
    if (!t.kho || !t.kho.ma) return toast('Hình này chưa có trong kho – Ctrl+S để lưu vào kho');
    if (await ensureKho()) await editMeta(t.kho.ma);
  });
  on('btn-kho-buoi-tabs', () => saveTabsAsBuoi());
  on('btn-kho-buoi', () => openBrowser('buoi'));
  on('btn-kho-import', () => importDialog());
  on('btn-kho-connect', () => connectDialog());
  on('btn-kho-disconnect', async () => {
    if (!(await confirmDialog('Ngắt kết nối kho', 'Xoá token khỏi máy này? Các bài trong kho vẫn còn nguyên trên GitHub.', 'Ngắt kết nối'))) return;
    S.conf = null; S.kho = null; saveConf(null); updateChip(); toast('Đã ngắt kết nối kho');
  });

  updateChip();
  loadQueue().then(() => {
    if (S.conf) ensureKho({ silent: true }).then(() => flushQueue()).catch(() => {});
  });

  return { saveCurrent, openBrowser, openBai, connectDialog, ensureKho, flushQueue, saveTabsAsBuoi, importDialog, isConnected: () => !!S.conf, state: S };
}
