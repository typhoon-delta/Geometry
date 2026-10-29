// "Người dùng ảo": dựng hình HOÀN TOÀN QUA GIAO DIỆN như một giáo viên – bấm biểu tượng công cụ trên thanh
// dọc, bấm lên bảng vẽ (vào điểm, lên đường, vào chỗ hai đường cắt nhau), nháy đúp/gõ để đặt tên.
// Không ghi JSON trực tiếp. Mọi vị trí bấm được tính từ những gì đang HIỆN trên màn hình (toạ độ điểm,
// một chỗ trống trên đường thẳng/đường tròn không sát đối tượng khác…), giống mắt người nhìn.
//
// Đếm thao tác: chọn công cụ (1 thao tác dù cần 1–3 lần bấm), bấm lên bảng vẽ, đặt tên, lệnh menu/phím.
// Lần bấm chuột thật (kể cả mở menu) đếm riêng ở `clicks`.

export const PAGE_HELPERS = String.raw`
window.__T = (() => {
  const A = () => window.__app;
  const G = () => window.GeoCore.geom;
  const kinds = () => window.GeoCore.kinds(A().doc);
  const byName = (n) => A().doc.steps.find((s) => s.name === n);
  const val = (id) => A().values.get(id);
  function scale() {
    let x1 = Infinity, x2 = -Infinity, y1 = Infinity, y2 = -Infinity;
    const k = kinds();
    for (const s of A().doc.steps) { const v = val(s.id); if (v && k.get(s.id) === 'point') { x1 = Math.min(x1, v.x); x2 = Math.max(x2, v.x); y1 = Math.min(y1, v.y); y2 = Math.max(y2, v.y); } }
    return Math.max(x2 - x1, y2 - y1, 1e-6);
  }
  // Tìm đối tượng: tên, hoặc {line:[P,Q]} (đường thẳng/đoạn/tia CHỨA P, Q), {circ:[P,Q,R]} (đường tròn qua P,Q,R),
  // {cr:[O,P]} (đường tròn tâm O qua P), {id}
  function find(spec) {
    if (typeof spec === 'string') { const s = byName(spec); return s ? s.id : null; }
    if (spec.id) return spec.id;
    const k = kinds(), sc = scale(), tol = 1e-6 * sc;
    const P = (n) => { const s = byName(n); return s ? val(s.id) : null; };
    const cand = A().doc.steps.filter((s) => !s.hidden && val(s.id));
    if (spec.line) {
      const [p, q] = spec.line.map(P);
      const ok = cand.filter((s) => k.get(s.id) === 'line' && G().distPointLine(p, val(s.id)) < tol && G().distPointLine(q, val(s.id)) < tol);
      // ưu tiên đường có hai đối số đúng là P, Q
      ok.sort((a, b) => (b.args.length === 2 && spec.line.every((n) => b.args.includes(byName(n).id)) ? 1 : 0) - (a.args.length === 2 && spec.line.every((n) => a.args.includes(byName(n).id)) ? 1 : 0));
      return ok[0]?.id || null;
    }
    if (spec.circ) {
      const pts = spec.circ.map(P);
      const s = cand.find((s) => k.get(s.id) === 'circle' && pts.every((p) => Math.abs(G().dist(p, val(s.id).c) - val(s.id).r) < tol));
      return s?.id || null;
    }
    if (spec.cr) {
      const [o, p] = spec.cr.map(P);
      const s = cand.find((s) => k.get(s.id) === 'circle' && G().dist(o, val(s.id).c) < tol && Math.abs(G().dist(p, o) - val(s.id).r) < tol);
      return s?.id || null;
    }
    return null;
  }
  const scr = (p) => A().toScreen(p);
  const inView = (q, m = 12) => q.x > m && q.y > m && q.x < A().view.W - m && q.y < A().view.H - 40;
  /** Chỗ bấm lên một đường: điểm nằm trên đường, trong khung nhìn, hitTest ra đúng đường đó, xa điểm/đường khác. */
  function spotOn(id, near) {
    const v = val(id); if (!v) return null;
    const cands = [];
    if (v.kind === 'circle') for (let i = 0; i < 180; i++) { const t = (2 * Math.PI * i) / 180; cands.push({ x: v.c.x + v.r * Math.cos(t), y: v.c.y + v.r * Math.sin(t) }); }
    else {
      const sub = A().doc.steps.find((s) => s.id === id).type;
      const lo = sub === 'segment' || sub === 'ray' ? 0 : -40, hi = sub === 'segment' ? 1 : 40;
      for (let i = 0; i <= 400; i++) { const t = lo + ((hi - lo) * i) / 400; cands.push({ x: v.p.x + t * v.d.x, y: v.p.y + t * v.d.y }); }
    }
    let best = null;
    for (const P of cands) {
      const q = scr(P);
      if (!inView(q, 20)) continue;
      const hits = A().hitTest(q.x, q.y);
      if (!hits.length || hits[0].id !== id) continue;
      const others = hits.filter((h) => h.id !== id);
      let clear = 30;
      for (const h of others) clear = Math.min(clear, h.d);
      // khoảng cách tới điểm gần nhất
      for (const s of A().doc.steps) { const w = val(s.id); if (!s.hidden && w && w.kind === 'point') clear = Math.min(clear, Math.hypot(scr(w).x - q.x, scr(w).y - q.y) - 10); }
      let score = clear;
      if (near) { const nq = scr(near); score = Math.min(clear, 12) * 4 - Math.hypot(nq.x - q.x, nq.y - q.y) * 0.05; }
      if (clear >= 6 && (!best || score > best.score)) best = { score, x: q.x, y: q.y, clear };
    }
    return best;
  }
  function pointScr(name) { const s = byName(name); const v = s && val(s.id); return v ? scr(v) : null; }
  function crossings(id1, id2) { return G().intersect(val(id1), val(id2)).map((p) => ({ ...scr(p), ux: p.x, uy: p.y })); }
  function stepsSnapshot() { return A().doc.steps.map((s) => s.id); }
  function stepInfo(ids) { const k = kinds(); return ids.map((id) => { const s = A().doc.steps.find((x) => x.id === id); return s ? { id, name: s.name, type: s.type, kind: k.get(id), hidden: !!s.hidden } : null; }).filter(Boolean); }
  function onCurve(pid, cid) { const p = val(pid), c = val(cid); return p && c ? G().distToObject(c.kind === 'line' ? { ...c, sub: 'line' } : c, p) < 1e-6 * scale() : false; }

  // ---------- đo nhãn ----------
  function labelReport() {
    const app = A(), r = app.renderer, k = kinds();
    const boxes = [...r.labelBoxes.entries()].map(([id, b]) => ({ id, name: app.doc.steps.find((s) => s.id === id)?.name, ...b }));
    const pts = r.items.filter((it) => it.kind === 'point' && val(it.s.id)).map((it) => ({ id: it.s.id, name: it.s.name, ...scr(val(it.s.id)) }));
    const curves = r.items.filter((it) => (it.kind === 'line' || it.kind === 'circle') && val(it.s.id)).map((it) => ({ id: it.s.id, type: it.s.type, v: val(it.s.id) }));
    const shrink = (b, m) => ({ x: b.x + m, y: b.y + m, w: b.w - 2 * m, h: b.h - 2 * m });
    const overlapLL = [], overPoint = [], overCurve = [], outside = [];
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = shrink(boxes[i], 1.5), b = shrink(boxes[j], 1.5);
      const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ix > 0 && iy > 0) overlapLL.push([boxes[i].name, boxes[j].name]);
    }
    for (const b of boxes) {
      const s = shrink(b, 2);
      for (const p of pts) if (p.id !== b.id && p.x > s.x - 3 && p.x < s.x + s.w + 3 && p.y > s.y - 3 && p.y < s.y + s.h + 3) overPoint.push([b.name, p.name]);
      if (b.x < 0 || b.y < 0 || b.x + b.w > app.view.W || b.y + b.h > app.view.H) outside.push(b.name);
      const s2 = shrink(b, 3);
      for (const c of curves) if (curveHitsBox(c, s2)) overCurve.push(b.name);
    }
    return { n: boxes.length, overlapLL, overPoint, overCurve: [...new Set(overCurve)], overCurveCount: overCurve.length, outside };
  }
  function segBox(p, q, b) {
    // cắt đoạn pq với hình chữ nhật b (Liang–Barsky)
    let t0 = 0, t1 = 1; const dx = q.x - p.x, dy = q.y - p.y;
    for (const [pp, d, lo, hi] of [[p.x, dx, b.x, b.x + b.w], [p.y, dy, b.y, b.y + b.h]]) {
      if (Math.abs(d) < 1e-12) { if (pp < lo || pp > hi) return false; continue; }
      let a = (lo - pp) / d, c = (hi - pp) / d; if (a > c) [a, c] = [c, a];
      t0 = Math.max(t0, a); t1 = Math.min(t1, c);
    }
    return t0 < t1;
  }
  function curveHitsBox(c, b) {
    const v = c.v;
    if (v.kind === 'circle') {
      const o = scr(v.c), r = v.r * A().view.scale;
      const nx = Math.max(b.x, Math.min(o.x, b.x + b.w)), ny = Math.max(b.y, Math.min(o.y, b.y + b.h));
      const dmin = Math.hypot(nx - o.x, ny - o.y);
      const dmax = Math.max(...[[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]].map(([x, y]) => Math.hypot(x - o.x, y - o.y)));
      return dmin < r && r < dmax;
    }
    const sub = c.type === 'segment' ? 'segment' : c.type === 'ray' ? 'ray' : v.sub;
    const lo = sub === 'line' ? -1e4 : 0, hi = sub === 'segment' ? 1 : 1e4;
    const p = scr({ x: v.p.x + lo * v.d.x, y: v.p.y + lo * v.d.y }), q = scr({ x: v.p.x + hi * v.d.x, y: v.p.y + hi * v.d.y });
    return segBox(p, q, b);
  }

  // ---------- kiểm chứng bằng số ----------
  const H = {
    G: () => G(),
    d: (P, Q) => G().dist(P, Q),
    col: (P, Q, R) => Math.abs(G().cross(G().sub(Q, P), G().sub(R, P))) / Math.max(1e-300, G().dist(P, Q) * G().dist(P, R), G().dist(P, Q) * G().dist(Q, R)),
    cyc: (...pts) => { const c = G().circleThrough(pts[0], pts[1], pts[2]); if (!c) return NaN; return Math.max(0, ...pts.slice(3).map((p) => Math.abs(G().dist(p, c.c) - c.r) / c.r)); },
    onC: (P, c) => Math.abs(G().dist(P, c.c) - c.r) / c.r,
    onL: (P, Q, R) => H.col(P, Q, R),
    rel: (a, b) => Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1e-300),
    angle: (P, V, Q) => { const u = G().sub(P, V), w = G().sub(Q, V); return Math.atan2(Math.abs(G().cross(u, w)), G().dot(u, w)); },
    par: (P, Q, R, S) => { const u = G().unit(G().sub(Q, P)), w = G().unit(G().sub(S, R)); return Math.abs(G().cross(u, w)); },
    perp: (P, Q, R, S) => { const u = G().unit(G().sub(Q, P)), w = G().unit(G().sub(S, R)); return Math.abs(G().dot(u, w)); },
    lineTan: (P, Q, c) => Math.abs(G().distPointLine(c.c, G().lineThrough(P, Q)) - c.r) / c.r,
    ccTan: (c1, c2) => { const d = G().dist(c1.c, c2.c); return Math.min(Math.abs(d - c1.r - c2.r), Math.abs(d - Math.abs(c1.r - c2.r))) / Math.max(c1.r, c2.r); },
    sameCircle: (c1, c2) => (G().dist(c1.c, c2.c) + Math.abs(c1.r - c2.r)) / Math.max(c1.r, c2.r),
    lineOf: (l, P, Q) => Math.max(G().distPointLine(P, l), G().distPointLine(Q, l)) / Math.max(1e-300, G().dist(P, Q)),
    meet: (P, Q, R, S) => G().intersectLL(G().lineThrough(P, Q), G().lineThrough(R, S)),
    incenter: (a, b, c) => G().incenter(a, b, c),
    max: (...xs) => (xs.some((x) => !Number.isFinite(x)) ? NaN : Math.max(...xs)),
  };
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function getter(vals, refs) {
    return (n) => {
      const id = n.startsWith('#') ? refs[n.slice(1)] : byName(n)?.id;
      if (!id) throw new Error('Không có đối tượng ' + n);
      const v = vals.get(id); if (!v) throw new Error('undef'); return v;
    };
  }
  function residual(checkSrc, vals, refs = {}) {
    const check = new Function('V', 'H', 'return (' + checkSrc + ')(V, H)');
    const V = getter(vals, refs);
    try { return check(V, H); } catch (e) { return e.message === 'undef' ? null : 'LỖI: ' + e.message; }
  }
  function verify(checkSrc, preSrc, refs = {}, n = 30, amp = 0.06) {
    const doc = A().doc, base = A().values, sc = scale(), R = rng(2026);
    const out = { base: residual(checkSrc, base, refs), samples: 0, undef: 0, skipped: 0, max: 0 };
    const pre = preSrc ? new Function('V', 'H', 'return (' + preSrc + ')(V, H)') : null;
    for (let i = 0; i < n * 4 && out.samples < n; i++) {
      const ov = new Map();
      for (const s of doc.steps) {
        const p = { ...(s.params || {}) };
        if (s.type === 'free_point') ov.set(s.id, { x: p.x + amp * sc * (2 * R() - 1), y: p.y + amp * sc * (2 * R() - 1) });
        else if (s.type === 'point_on') { const c = val(s.args[0]); const len = c && c.kind === 'line' ? Math.hypot(c.d.x, c.d.y) : 1; const dt = c && c.kind === 'circle' ? 0.25 : (amp * sc) / len; ov.set(s.id, { t: (p.t || 0) + dt * (2 * R() - 1) }); }
      }
      const vals = window.GeoCore.evaluate(doc, ov);
      if (pre) {
        const V = getter(vals, refs);
        let ok = false; try { ok = pre(V, H); } catch { ok = false; }
        if (!ok) { out.skipped++; continue; }
      }
      const r = residual(checkSrc, vals, refs);
      if (r === null || !Number.isFinite(r)) { out.undef++; continue; }
      out.samples++;
      out.max = Math.max(out.max, r);
    }
    return out;
  }
  function exploreReport(expect) {
    const t0 = performance.now();
    const res = window.GeoCore.explore(A().doc);
    const ms = performance.now() - t0;
    const nm = (id) => A().doc.steps.find((s) => s.id === id)?.name;
    // tên các điểm liên quan, kể cả các điểm xác định đường thẳng/đường tròn trong quan hệ
    const expand = (id) => { const s = A().doc.steps.find((x) => x.id === id); const k = kinds().get(id); return k === 'point' ? [s.name] : [s.name, ...s.args.map(nm)]; };
    const rels = res.relations.map((r, i) => ({ i, type: r.type, text: r.text, names: r.ids.flatMap(expand) }));
    let found = null;
    if (expect) for (const r of rels) if ((!expect.type || expect.type.split('|').includes(r.type)) && expect.names.every((n) => r.names.includes(n))) { found = r; break; }
    return { ms: Math.round(ms), count: rels.length, top: rels.slice(0, 6).map((r) => r.text), found: found ? { rank: found.i + 1, text: found.text } : null };
  }
  return { find, spotOn, pointScr, crossings, stepsSnapshot, stepInfo, onCurve, labelReport, verify, residual: (src, refs) => residual(src, A().values, refs), exploreReport, scale, byNameId: (n) => byName(n)?.id || null };
})();
`;

export class NguoiDung {
  constructor(page, { onIssue } = {}) {
    this.page = page;
    this.count = { tool: 0, board: 0, rename: 0, other: 0 };
    this.clicks = 0;
    this.keys = 0;
    this.issues = []; // vấn đề gặp khi dựng
    this.last = [];
    this.refs = {};
    this.onIssue = onIssue;
  }

  get total() {
    return this.count.tool + this.count.board + this.count.rename + this.count.other;
  }

  async init() {
    await this.page.evaluate(PAGE_HELPERS);
    this.box = await this.page.locator('#board').boundingBox();
  }

  issue(kind, text) {
    if (!this.issues.some((i) => i.text === text)) this.issues.push({ kind, text });
  }

  ev(fn, arg) {
    return this.page.evaluate(fn, arg);
  }

  async has(toolId) {
    return this.ev((id) => !!document.querySelector(`#tools .tool[data-tool="${id}"]`), toolId);
  }

  async currentTool() {
    return this.ev(() => __app.toolId);
  }

  async snapshot() {
    return this.ev(() => __T.stepsSnapshot());
  }

  async diff(before) {
    const set = new Set(before);
    const now = await this.snapshot();
    const ids = now.filter((id) => !set.has(id));
    this.last = await this.ev((ids) => __T.stepInfo(ids), ids);
    if (process.env.DEBUG) console.log('    +', this.last.map((m) => `${m.name || m.type}:${m.type}${m.hidden ? '(ẩn)' : ''}`).join(' '));
    return this.last;
  }

  async click(px, py) {
    await this.uncover(px, py);
    this.clicks++;
    await this.page.mouse.click(this.box.x + px, this.box.y + py);
  }

  async uncover(px, py) {
    // chỗ cần bấm bị một thẻ nổi (thuộc tính, tuỳ chọn…) che: người dùng phải đóng thẻ trước
    const cover = await this.ev(([x, y]) => { const el = document.elementFromPoint(x, y); return el && el.tagName !== 'CANVAS' ? (el.closest('[id]')?.id || el.tagName) : null; }, [this.box.x + px, this.box.y + py]);
    if (cover && !this.uncovering) {
      this.issue('che hình', `Thẻ nổi "#${cover}" che chỗ cần bấm trên hình – phải bỏ chọn để thẻ ẩn đi`);
      this.uncovering = true;
      const prev = await this.currentTool();
      if (prev !== 'move') await this.tool('move');
      const empty = await this.ev(() => { for (let y = __app.view.H - 60; y > 40; y -= 23) for (let x = 30; x < __app.view.W / 2; x += 37) if (!__app.hitTest(x, y).length && !__app.labelAt({ clientX: x + __app.view.canvas.getBoundingClientRect().left, clientY: y + __app.view.canvas.getBoundingClientRect().top })) return { x, y }; return { x: 30, y: 60 }; });
      this.count.board++;
      await this.click(empty.x, empty.y);
      if (prev !== 'move') await this.tool(prev);
      this.uncovering = false;
    }
  }

  /** Chọn công cụ qua thanh công cụ dọc (bấm biểu tượng nhóm, mục menu con nếu có, rồi công cụ). */
  async tool(id) {
    const page = this.page;
    this.count.tool++;
    // phím tắt (nếu giao diện có và công cụ có phím tắt) – nhanh hơn bấm menu
    const key = await this.ev((id) => (window.__app.toolKey ? window.__app.toolKey(id) : null), id);
    if (key) {
      await page.keyboard.press(key);
      this.keys++;
      if ((await this.currentTool()) === id) return;
    }
    // công cụ vừa dùng: một lần bấm ở cuối thanh dọc
    if (await this.ev((id) => !!document.querySelector(`#tools [data-recent="${id}"]`), id)) {
      this.clicks++;
      await page.click(`#tools [data-recent="${id}"]`);
      if ((await this.currentTool()) === id) return;
    }
    const info = await this.ev((id) => {
      const el = document.querySelector(`#tools .tool[data-tool="${id}"]`);
      if (!el) return null;
      const g = el.closest('.tb-group');
      const sub = el.closest('.sub');
      return { g: g.dataset.group, sub: sub ? [...sub.parentElement.querySelectorAll(':scope > .sub')].indexOf(sub) : -1, many: !!g.querySelector('.flyout') };
    }, id);
    if (!info) {
      // nhóm chỉ một công cụ (vd Chọn/kéo)
      this.clicks++;
      await page.click(`.tb-btn[data-group="${id}"]`);
      return;
    }
    const scope = `#tools .tb-group[data-group="${info.g}"]`;
    this.clicks++;
    await page.click(`${scope} > .tb-btn`);
    const open = await this.ev((s) => document.querySelector(s).classList.contains('open'), scope);
    if ((await this.currentTool()) === id && !open) return;
    if (!open) { this.clicks++; await page.click(`${scope} > .tb-btn`); }
    if (info.sub >= 0) { this.clicks++; await page.locator(`${scope} .sub-title`).nth(info.sub).click(); }
    this.clicks++;
    await page.click(`${scope} .tool[data-tool="${id}"]`);
    if ((await this.currentTool()) !== id) throw new Error('Không chọn được công cụ ' + id);
  }

  /** Mục tiêu nằm ngoài khung nhìn: người dùng phải thu phóng vừa hình (menu Hiển thị) rồi mới bấm được. */
  async fitIfOutside(sx, sy, what) {
    const [W, H] = await this.ev(() => [__app.view.W, __app.view.H]);
    if (sx > 8 && sy > 8 && sx < W - 8 && sy < H - 30) return false;
    this.issue('khung nhìn', 'Đối tượng mới dựng nằm ngoài khung nhìn – phải "Thu phóng vừa hình" mới bấm/đặt tên được' + (what ? ` (${what})` : ''));
    const k = await this.ev(() => (window.__app.fitKey ? window.__app.fitKey : null));
    if (k) { this.count.other++; this.keys++; await this.page.keyboard.press(k); } else await this.menu('btn-fit');
    await this.page.waitForTimeout(30);
    return true;
  }

  async toUser(x, y) {
    return this.ev(([x, y]) => __app.toScreen({ x, y }), [x, y]);
  }

  /** Bấm lên bảng vẽ tại toạ độ hình (x, y) – thường là chỗ trống để tạo điểm tự do. */
  async at(x, y) {
    const before = await this.snapshot();
    const s = await this.toUser(x, y);
    this.count.board++;
    await this.click(s.x, s.y);
    return this.diff(before);
  }

  /** Bấm vào một điểm đang hiện theo tên. */
  async P(name) {
    let s = await this.ev((n) => __T.pointScr(n), name);
    if (!s) throw new Error('Không thấy điểm ' + name);
    if (await this.fitIfOutside(s.x, s.y, name)) s = await this.ev((n) => __T.pointScr(n), name);
    const before = await this.snapshot();
    this.count.board++;
    await this.click(s.x, s.y);
    return this.diff(before);
  }

  /** Bấm lên một đường thẳng/đường tròn (spec như __T.find), ở chỗ trống gần `near` (toạ độ hình) nếu có. */
  async on(spec, near = null) {
    const id = await this.ev((sp) => __T.find(sp), spec);
    if (!id) throw new Error('Không thấy đối tượng ' + JSON.stringify(spec));
    let s = await this.ev(([id, near]) => __T.spotOn(id, near), [id, near]);
    if (!s && (await this.fitIfOutside(-1, -1, 'đường cần chọn'))) s = await this.ev(([id, near]) => __T.spotOn(id, near), [id, near]);
    if (!s) {
      this.issue('chọn', `Không tìm được chỗ trống để bấm lên ${JSON.stringify(spec)} (đường bị các đối tượng khác che kín)`);
      throw new Error('Không bấm được lên ' + JSON.stringify(spec));
    }
    const before = await this.snapshot();
    this.count.board++;
    await this.click(s.x, s.y);
    return this.diff(before);
  }

  async id(spec) {
    return this.ev((sp) => __T.find(sp), spec);
  }

  /**
   * Tạo giao điểm của hai đường bằng cách bấm thẳng vào chỗ cắt (công cụ Giao điểm), chọn chỗ cắt gần `near`
   * (toạ độ hình) hoặc thứ `which`. Kiểm tra điểm tạo ra đúng là giao của HAI đường đã định; nếu sai thì
   * hoàn tác và chọn lần lượt hai đường (cách chậm hơn), ghi lại vấn đề.
   */
  async cross(spec1, spec2, near = null, name = null) {
    const [a, b] = [await this.id(spec1), await this.id(spec2)];
    if (!a || !b) throw new Error('Không thấy đường ' + JSON.stringify(!a ? spec1 : spec2));
    if ((await this.currentTool()) !== 'intersect') await this.tool('intersect');
    // near = {not: 'R'}: giao điểm "thứ hai", khác điểm R đã có
    if (near && near.not) {
      const R = await this.ev((n) => { const v = __app.values.get(__T.byNameId(n)); return { x: v.x, y: v.y }; }, near.not);
      const roots = await this.ev(([a, b]) => __T.crossings(a, b), [a, b]);
      const fr = roots.reduce((p, q) => (Math.hypot(p.ux - R.x, p.uy - R.y) >= Math.hypot(q.ux - R.x, q.uy - R.y) ? p : q));
      near = { x: fr.ux, y: fr.uy };
    }
    let xs = await this.ev(([a, b]) => __T.crossings(a, b), [a, b]);
    if (!xs.length) throw new Error('Hai đường không cắt nhau: ' + JSON.stringify([spec1, spec2]));
    let target = xs[0];
    if (near && xs.length > 1) target = xs.reduce((p, q) => (Math.hypot(p.ux - near.x, p.uy - near.y) <= Math.hypot(q.ux - near.x, q.uy - near.y) ? p : q));
    if (await this.fitIfOutside(target.x, target.y, 'chỗ cắt')) {
      xs = await this.ev(([a, b]) => __T.crossings(a, b), [a, b]);
      target = near && xs.length > 1 ? xs.reduce((p, q) => (Math.hypot(p.ux - near.x, p.uy - near.y) <= Math.hypot(q.ux - near.x, q.uy - near.y) ? p : q)) : xs[0];
    }
    const before = await this.snapshot();
    const W = await this.ev(() => [__app.view.W, __app.view.H]);
    let made = [];
    if (target.x > 4 && target.y > 4 && target.x < W[0] - 4 && target.y < W[1] - 4) {
      this.count.board++;
      if (process.env.DEBUG) console.log('    bấm chỗ cắt', target, await this.ev(([x, y]) => [__app.toolId, __app.picks, __app.hitTest(x, y).map((h) => h.id + ':' + h.kind + ':' + h.d.toFixed(1))], [target.x, target.y]));
      await this.click(target.x, target.y);
      made = await this.diff(before);
    } else this.issue('chọn', 'Chỗ cắt nằm ngoài khung nhìn – phải chọn lần lượt hai đường');
    let pid = made.find((m) => m.kind === 'point')?.id;
    if (!pid && !made.length && target.x > 4) {
      // bấm trúng điểm đã có ở đó
      pid = await this.ev(([x, y]) => { const h = __app.hitTest(x, y).find((h) => h.kind === 'point'); return h ? h.id : null; }, [target.x, target.y]);
    }
    const good = pid && (await this.ev(([p, a, b]) => __T.onCurve(p, a) && __T.onCurve(p, b), [pid, a, b]));
    if (!good) {
      if (made.length) {
        this.issue('giao điểm', `Bấm vào chỗ cắt của ${fmt(spec1)} và ${fmt(spec2)} tạo nhầm giao điểm của đường khác (nhiều đường đi qua gần đó)`);
        await this.key('Control+z');
      }
      // chọn lần lượt hai đường
      if ((await this.currentTool()) !== 'intersect') await this.tool('intersect');
      const b2 = await this.snapshot();
      await this.on(spec1, near);
      await this.on(spec2, near);
      made = await this.diff(b2);
      const pts = made.filter((m) => m.kind === 'point');
      if (pts.length > 1 && near) {
        // tạo cả hai giao điểm: xoá điểm thừa
        this.issue('thừa bước', 'Chọn hai đường tạo cả hai giao điểm – phải xoá điểm thừa');
        const far = await this.ev(([ids, near]) => { const v = (id) => __app.values.get(id); return ids.reduce((p, q) => (Math.hypot(v(p).x - near.x, v(p).y - near.y) >= Math.hypot(v(q).x - near.x, v(q).y - near.y) ? p : q)); }, [pts.map((p) => p.id), near]);
        await this.deleteById(far);
        pid = pts.find((p) => p.id !== far).id;
      } else pid = pts[0]?.id;
    }
    if (name && pid) await this.rename(pid, name);
    return pid;
  }

  async key(k) {
    this.count.other++;
    this.keys++;
    await this.page.keyboard.press(k);
  }

  async deleteById(id) {
    await this.ensureMove();
    const s = await this.ev((id) => __app.toScreen(__app.values.get(id)), id);
    this.count.board++;
    await this.click(s.x, s.y);
    await this.key('Delete');
  }

  async ensureMove() {
    if ((await this.currentTool()) !== 'move') await this.tool('move');
  }

  /**
   * Đặt tên cho một điểm (id hoặc tên cũ). Cách nhanh nhất mà giao diện cho phép:
   *  – nếu có "gõ để đặt tên" (điểm vừa dựng đang được chọn): gõ tên + Enter;
   *  – nếu không: về công cụ Chọn, nháy đúp vào điểm, gõ tên + Enter, rồi chọn lại công cụ cũ.
   */
  async rename(ref, newName) {
    if (process.env.DEBUG) console.log('    đặt tên', ref, '→', newName);
    const id = (await this.ev((r) => (__app.doc.steps.some((s) => s.id === r) ? r : __T.byNameId(r)), ref));
    if (!id) throw new Error('Không thấy điểm ' + ref);
    const cur = await this.ev((id) => __app.doc.steps.find((s) => s.id === id).name, id);
    if (cur === newName) return;
    const quick = await this.ev((id) => !!__app.typeToRename && __app.selection.size === 1 && __app.selection.has(id), id);
    if (quick) {
      this.count.rename++;
      this.keys += newName.length + 1;
      await this.page.keyboard.type(newName);
      await this.page.keyboard.press('Enter');
    } else {
      const prevTool = await this.currentTool();
      if (prevTool !== 'move') await this.tool('move');
      let s = await this.ev((id) => __app.toScreen(__app.values.get(id)), id);
      if (await this.fitIfOutside(s.x, s.y, newName)) s = await this.ev((id) => __app.toScreen(__app.values.get(id)), id);
      this.count.rename++;
      this.clicks += 2;
      await this.uncover(s.x, s.y);
      if (process.env.DEBUG) console.log('    nháy đúp', s, await this.ev(([x, y, bx, by]) => [document.elementFromPoint(bx + x, by + y)?.tagName, __app.hitTest(x, y).map((h) => h.id + ':' + h.kind + ':' + h.d.toFixed(1)), __app.toolId], [s.x, s.y, this.box.x, this.box.y]));
      await this.page.mouse.dblclick(this.box.x + s.x, this.box.y + s.y);
      // bản cũ: hộp thoại đổi tên; bản 1.2: ô tên tại chỗ (.inline-name)
      const dlg = await this.page.waitForSelector('.modal-input, .inline-name', { timeout: 1500 }).catch(() => null);
      this.keys += newName.length + 1;
      if (dlg) {
        const sel = (await this.page.$('.inline-name')) ? '.inline-name' : '.modal-input';
        await this.page.fill(sel, newName);
        await this.page.press(sel, 'Enter');
      } else if (await this.page.$('#props.show #p-name')) {
        // nháy đúp không mở được hộp đổi tên (thẻ thuộc tính hiện ra đè lên điểm) → gõ vào ô Tên của thẻ
        this.issue('che hình', 'Bấm vào điểm gần góc phải: thẻ thuộc tính hiện ra đè lên chính điểm đó, nháy đúp không mở được hộp đổi tên – phải gõ vào ô Tên của thẻ');
        this.clicks++;
        await this.page.fill('#p-name', newName);
        await this.page.press('#p-name', 'Enter');
      } else throw new Error('Không mở được hộp đổi tên cho ' + ref);
      if (prevTool !== 'move') this.pendingTool = prevTool;
    }
    await this.page.waitForTimeout(20);
    const got = await this.ev((id) => __app.doc.steps.find((s) => s.id === id).name, id);
    if (got !== newName) {
      // tên đã dùng → giao diện từ chối: đổi tên điểm đang giữ tên đó (thành tên tạm) rồi làm lại
      const holder = await this.ev((n) => __T.byNameId(n), newName);
      const same = holder && (await this.ev(([a, b]) => { const p = __app.values.get(a), q = __app.values.get(b); return p && q && Math.hypot(p.x - q.x, p.y - q.y) < 1e-9; }, [holder, id]));
      if (same) {
        this.issue('chọn', `Hai điểm trùng toạ độ: bấm/nháy đúp luôn chọn điểm dựng trước, không chọn được điểm vừa dựng để đặt tên "${newName}"`);
        return false;
      }
      const holderType = holder && (await this.ev((h) => __app.doc.steps.find((s) => s.id === h).type, holder));
      this.issue('đặt tên', `Tên "${newName}" đã bị chiếm (${holderType === 'center' ? 'tâm đường tròn tự đặt tên' : 'điểm khác'}) – phải đổi tên điểm kia trước`);
      if (!holder || this.renaming) return false;
      this.renaming = true;
      const tmp = await this.ev(() => { let i = 1; while (__T.byNameId('Z' + i)) i++; return 'Z' + i; });
      await this.rename(holder, tmp);
      this.renaming = false;
      return this.rename(id, newName);
    }
    if (this.pendingTool) { const t = this.pendingTool; this.pendingTool = null; await this.tool(t); }
    return true;
  }

  /** Đặt tên cho các điểm vừa tạo ở thao tác trước (theo thứ tự tạo). */
  async names(...list) {
    const pts = this.last.filter((m) => m.kind === 'point' && !m.hidden);
    for (let i = 0; i < list.length && i < pts.length; i++) if (list[i]) await this.rename(pts[i].id, list[i]);
  }

  /** Dùng một công cụ: chọn công cụ rồi bấm lần lượt các mục (tên điểm, {line:…}, {circ:…}, [x,y] chỗ trống). */
  async use(toolId, ...picks) {
    await this.tool(toolId);
    const before = await this.snapshot();
    for (const p of picks) {
      if (Array.isArray(p)) await this.at(p[0], p[1]);
      else if (typeof p === 'string' && (await this.ev((n) => !!__T.byNameId(n) && __app.values.get(__T.byNameId(n))?.kind === 'point', p))) await this.P(p);
      else if (p && p.near) await this.on(p.spec, p.near);
      else await this.on(p);
    }
    return this.diff(before);
  }

  async menu(itemId) {
    const i = await this.ev((id) => [...document.querySelectorAll('#topbar .menu')].indexOf(document.getElementById(id).closest('.menu')), itemId);
    this.count.other++;
    this.clicks += 2;
    await this.page.click(`#topbar .menu:nth-child(${i + 1}) .menu-btn`);
    await this.page.click('#' + itemId);
  }
}

const fmt = (s) => (typeof s === 'string' ? s : s.line ? s.line.join('') : s.circ ? `(${s.circ.join('')})` : s.cr ? `(${s.cr[0]}, ${s.cr.join('')})` : JSON.stringify(s));
