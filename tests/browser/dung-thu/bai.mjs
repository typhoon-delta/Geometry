// Các bài dùng thử: mỗi bài dựng HOÀN TOÀN qua giao diện bằng NguoiDung (nguoi-dung.mjs).
//   dung(u)  : kịch bản thao tác như giáo viên (chọn công cụ, bấm điểm/đường/chỗ cắt, đặt tên)
//   check    : (V, H) => sai số (không thứ nguyên) của KẾT LUẬN đề bài; V('A') = giá trị đối tượng theo tên,
//              V('#k') = đối tượng đã ghi vào u.refs.k khi dựng. Đúng nếu < 1e-7 trên mọi cấu hình xê dịch.
//   pre      : (tuỳ chọn) điều kiện của đề (tam giác nhọn, thứ tự điểm…) – cấu hình xê dịch vi phạm thì bỏ qua
//   kham     : quan hệ mong đợi bộ khám phá tìm thấy {type, names}
//   keo      : điểm kéo thử (mặc định điểm tự do đầu tiên)
import * as G from '../../../src/core/geom.js';

const circleId = (u) => u.last.find((m) => m.kind === 'circle')?.id;
const lineId = (u) => u.last.find((m) => m.kind === 'line')?.id;
const pointsMade = (u) => u.last.filter((m) => m.kind === 'point' && !m.hidden);
/** Toạ độ hiện tại của các điểm theo tên (để chọn đúng chỗ cắt cần bấm, như mắt người nhìn hình). */
const pos = (u, ...names) => u.ev((ns) => ns.map((n) => { const v = __app.values.get(__T.byNameId(n)); return v ? { x: v.x, y: v.y } : null; }), names);
const far = (P, from, k = 1) => ({ x: P.x + k * (P.x - from.x), y: P.y + k * (P.y - from.y) });

/** Tam giác bằng công cụ "Dựng tam giác" (3 lần bấm chỗ trống). */
async function tri(u, a, b, c) {
  await u.use('triangle', a, b, c);
}

/** Đặt tên điểm vừa dựng duy nhất của thao tác trước (nếu tên tự động khác). */
async function name(u, n) {
  const p = pointsMade(u);
  if (p.length) await u.rename(p[p.length - 1].id, n);
}

export const BAI = [
  // ============================== IMO ==============================
  {
    id: 'imo2008-1', nhom: 'IMO', ten: 'IMO 2008 – Bài 1',
    de: 'Tam giác nhọn ABC, trực tâm H. Đường tròn tâm là trung điểm BC đi qua H cắt đường thẳng BC tại A₁, A₂; tương tự B₁, B₂ (với CA) và C₁, C₂ (với AB). Chứng minh sáu điểm A₁, A₂, B₁, B₂, C₁, C₂ cùng thuộc một đường tròn.',
    async dung(u) {
      await tri(u, [-0.8, 3.6], [-3.6, -2], [3.8, -2]);
      await u.use('orthocenter', 'A', 'B', 'C');
      for (const [X, Y, M, n1, n2] of [['B', 'C', 'M_a', 'A_1', 'A_2'], ['C', 'A', 'M_b', 'B_1', 'B_2'], ['A', 'B', 'M_c', 'C_1', 'C_2']]) {
        await u.use('midpoint', { line: [X, Y] });
        await name(u, M);
        await u.use('circle', M, 'H');
        const [P, Q] = await pos(u, X, Y);
        await u.cross({ cr: [M, 'H'] }, { line: [X, Y] }, P, n1);
        await u.cross({ cr: [M, 'H'] }, { line: [X, Y] }, Q, n2);
      }
      await u.use('circle_3pts', 'A_1', 'A_2', 'B_1');
    },
    check: (V, H) => H.cyc(V('A_1'), V('A_2'), V('B_1'), V('B_2'), V('C_1'), V('C_2')),
    kham: { type: 'concyclic|on_circle', names: ['A_1', 'A_2', 'B_1', 'B_2', 'C_1', 'C_2'] },
  },
  {
    id: 'imo2010-2', nhom: 'IMO', ten: 'IMO 2010 – Bài 2',
    de: 'I là tâm nội tiếp tam giác ABC, Γ là đường tròn ngoại tiếp. AI cắt Γ lần nữa tại D. E thuộc cung BDC, F thuộc cạnh BC sao cho ∠BAF = ∠CAE. G là trung điểm IF. Chứng minh DG và EI cắt nhau trên Γ.',
    async dung(u) {
      await tri(u, [-1.2, 3.6], [-3.6, -1.8], [3.8, -1.8]);
      await u.use('circumcircle', 'A', 'B', 'C');
      u.refs.w = circleId(u);
      await u.use('incenter', 'A', 'B', 'C');
      await u.use('line', 'A', 'I');
      await u.cross({ line: ['A', 'I'] }, { id: u.refs.w }, { x: 0, y: -6 }, 'D');
      await u.use('point', { spec: { id: u.refs.w }, near: { x: 2.6, y: -3.4 } });
      await name(u, 'E');
      await u.use('isogonal_line', 'B', 'A', 'C', 'E');
      const iso = lineId(u);
      await u.cross({ id: iso }, { line: ['B', 'C'] }, null, 'F');
      await u.use('midpoint', 'I', 'F');
      await name(u, 'G');
      await u.use('line', 'D', 'G');
      await u.use('line', 'E', 'I');
      const [D] = await pos(u, 'D');
      await u.cross({ line: ['D', 'G'] }, { line: ['E', 'I'] }, null, 'X');
      void D;
    },
    // X dựng là giao của hai trong ba đường DG, EI, Γ (bấm vào chỗ cắt) – kiểm cả ba
    check: (V, H) => H.max(H.cyc(V('A'), V('B'), V('C'), V('X')), H.col(V('D'), V('G'), V('X')), H.col(V('E'), V('I'), V('X'))),
    kham: { type: 'on_circle|concyclic|on_line|collinear', names: ['X'] },
  },
  {
    id: 'imo2012-5', nhom: 'IMO', ten: 'IMO 2012 – Bài 5',
    de: 'Tam giác ABC vuông tại C, D là chân đường cao từ C. X nằm trong đoạn CD. K thuộc đoạn AX với BK = BC; L thuộc đoạn BX với AL = AC. M là giao điểm của AL và BK. Chứng minh MK = ML.',
    async dung(u) {
      await u.use('right_triangle', [-0.5, 3.5], [-4.5, -1.5]); // đỉnh góc vuông bấm trước
      // đỉnh góc vuông phải tên C: đổi tên A ↔ C
      await u.rename('A', 'C');
      if (!(await u.id('A'))) await u.rename('Z1', 'A'); // bản cũ: tên C bị chiếm → đã đổi điểm kia thành Z1
      await u.use('altitude_foot', 'C', 'A', 'B');
      await name(u, 'D');
      const [C, D] = await pos(u, 'C', 'D');
      await u.use('point', { spec: { line: ['C', 'D'] }, near: { x: C.x + 0.55 * (D.x - C.x), y: C.y + 0.55 * (D.y - C.y) } });
      await name(u, 'X');
      await u.use('segment', 'A', 'X');
      await u.use('segment', 'B', 'X');
      await u.use('circle', 'B', 'C');
      await u.use('circle', 'A', 'C');
      const [A, B, X, Cc] = await pos(u, 'A', 'B', 'X', 'C');
      const kRoots = G.intersect(G.lineThrough(A, X), G.circle(B, G.dist(B, Cc)));
      const K = kRoots.find((p) => G.lineParam(p, G.lineThrough(A, X)) > 0 && G.lineParam(p, G.lineThrough(A, X)) < 1);
      await u.cross({ line: ['A', 'X'] }, { cr: ['B', 'C'] }, K, 'K');
      const lRoots = G.intersect(G.lineThrough(B, X), G.circle(A, G.dist(A, Cc)));
      const L = lRoots.find((p) => G.lineParam(p, G.lineThrough(B, X)) > 0 && G.lineParam(p, G.lineThrough(B, X)) < 1);
      await u.cross({ line: ['B', 'X'] }, { cr: ['A', 'C'] }, L, 'L');
      await u.use('segment', 'A', 'L');
      await u.use('segment', 'B', 'K');
      await u.cross({ line: ['A', 'L'] }, { line: ['B', 'K'] }, null, 'M');
    },
    check: (V, H) => H.rel(H.d(V('M'), V('K')), H.d(V('M'), V('L'))),
    keo: ['X', 'B'],
  },
  {
    id: 'imo2013-4', nhom: 'IMO', ten: 'IMO 2013 – Bài 4',
    de: 'Tam giác nhọn ABC, trực tâm H, W thuộc cạnh BC. M, N là chân đường cao từ B, C. ω₁ là đường tròn (BWN), X ∈ ω₁ với WX là đường kính; ω₂ là đường tròn (CWM), Y ∈ ω₂ với WY là đường kính. Chứng minh X, Y, H thẳng hàng.',
    async dung(u) {
      await tri(u, [-0.6, 3.8], [-3.6, -1.8], [3.8, -1.8]);
      await u.use('orthocenter', 'A', 'B', 'C');
      await u.use('point', { spec: { line: ['B', 'C'] }, near: { x: 0.9, y: -1.8 } });
      await name(u, 'W');
      await u.use('altitude_foot', 'B', 'C', 'A');
      await name(u, 'M');
      await u.use('altitude_foot', 'C', 'A', 'B');
      await name(u, 'N');
      await u.use('circle_3pts', 'B', 'W', 'N');
      await name(u, 'O_1');
      await u.use('reflect_point', 'W', 'O_1');
      await name(u, 'X');
      await u.use('circle_3pts', 'C', 'W', 'M');
      await name(u, 'O_2');
      await u.use('reflect_point', 'W', 'O_2');
      await name(u, 'Y');
      await u.use('line', 'X', 'Y');
    },
    check: (V, H) => H.col(V('X'), V('Y'), V('H')),
    kham: { type: 'collinear|on_line', names: ['X', 'Y', 'H'] },
    keo: ['W', 'A'],
  },
  {
    id: 'imo2014-4', nhom: 'IMO', ten: 'IMO 2014 – Bài 4',
    de: 'P, Q thuộc cạnh BC của tam giác nhọn ABC sao cho ∠PAB = ∠BCA và ∠CAQ = ∠ABC. M, N thuộc AP, AQ sao cho P là trung điểm AM, Q là trung điểm AN. Chứng minh BM và CN cắt nhau trên đường tròn ngoại tiếp ABC.',
    async dung(u) {
      await tri(u, [-0.4, 3.6], [-3.8, -1.6], [3.6, -1.6]);
      await u.use('circumcircle', 'A', 'B', 'C');
      // ∠PAB = ∠C ⇔ AB tiếp xúc đường tròn (ACP) tại A
      await u.use('circle_tangent_at', 'A', 'B', 'C');
      const k1 = circleId(u);
      const [B, C] = await pos(u, 'B', 'C');
      await u.cross({ id: k1 }, { line: ['B', 'C'] }, { not: 'C' }, 'P');
      await u.use('circle_tangent_at', 'A', 'C', 'B');
      const k2 = circleId(u);
      await u.cross({ id: k2 }, { line: ['B', 'C'] }, { not: 'B' }, 'Q');
      await u.use('reflect_point', 'A', 'P');
      await name(u, 'M');
      await u.use('reflect_point', 'A', 'Q');
      await name(u, 'N');
      await u.use('line', 'B', 'M');
      await u.use('line', 'C', 'N');
      await u.cross({ line: ['B', 'M'] }, { line: ['C', 'N'] }, null, 'X');
    },
    check: (V, H) => H.max(H.cyc(V('A'), V('B'), V('C'), V('X')), H.col(V('B'), V('M'), V('X')), H.col(V('C'), V('N'), V('X'))),
    kham: { type: 'on_circle|concyclic|on_line|collinear', names: ['X'] },
  },
  {
    id: 'imo2015-4', nhom: 'IMO', ten: 'IMO 2015 – Bài 4',
    de: 'Tam giác ABC nội tiếp Ω tâm O. Đường tròn Γ tâm A cắt BC tại D, E (B, D, E, C theo thứ tự) và cắt Ω tại F, G (A, F, B, C, G theo thứ tự). Đường tròn (BDF) cắt AB lần nữa tại K, (CGE) cắt CA lần nữa tại L. FK và GL cắt nhau tại X. Chứng minh X thuộc AO.',
    async dung(u) {
      await tri(u, [-0.6, 3.8], [-4, -1.6], [4, -1.6]);
      await u.use('circumcircle', 'A', 'B', 'C');
      u.refs.w = circleId(u);
      await u.use('circle', 'A', [-5.8, 1.5]);
      await name(u, 'R');
      const g = { cr: ['A', 'R'] };
      await u.cross(g, { line: ['B', 'C'] }, { x: -3, y: -1.6 }, 'D');
      await u.cross(g, { line: ['B', 'C'] }, { x: 3, y: -1.6 }, 'E');
      await u.cross(g, { id: u.refs.w }, { x: -4.5, y: 0 }, 'F');
      await u.cross(g, { id: u.refs.w }, { x: 4.5, y: 0 }, 'G');
      await u.use('circle_3pts', 'B', 'D', 'F');
      const c1 = circleId(u);
      const [A, B, C] = await pos(u, 'A', 'B', 'C');
      await u.cross({ id: c1 }, { line: ['A', 'B'] }, { not: 'B' }, 'K');
      await u.use('circle_3pts', 'C', 'G', 'E');
      const c2 = circleId(u);
      await u.cross({ id: c2 }, { line: ['C', 'A'] }, { not: 'C' }, 'L');
      void B; void C;
      await u.use('line', 'F', 'K');
      await u.use('line', 'G', 'L');
      await u.cross({ line: ['F', 'K'] }, { line: ['G', 'L'] }, null, 'X');
      await u.use('line', 'A', 'O');
    },
    check: (V, H) => H.col(V('A'), V('O'), V('X')),
    kham: { type: 'collinear|on_line', names: ['A', 'O', 'X'] },
  },
  {
    id: 'imo2017-4', nhom: 'IMO', ten: 'IMO 2017 – Bài 4',
    de: 'R, S thuộc đường tròn Ω, RS không là đường kính; ℓ là tiếp tuyến của Ω tại R. T sao cho S là trung điểm RT. J thuộc cung nhỏ RS sao cho đường tròn Γ ngoại tiếp JST cắt ℓ tại hai điểm; A là giao điểm gần R hơn. AJ cắt Ω lần nữa tại K. Chứng minh KT tiếp xúc Γ.',
    async dung(u) {
      await u.use('circle', [0, 0.6], [0, -3.4]);
      await u.names('O', 'R');
      const om = { cr: ['O', 'R'] };
      await u.use('point', { spec: om, near: { x: 3.76, y: -0.77 } });
      await name(u, 'S');
      await u.use('tangent_at', om, 'R');
      u.refs.l = lineId(u);
      await u.use('reflect_point', 'R', 'S');
      await name(u, 'T');
      await u.use('point', { spec: om, near: { x: 2.0, y: -2.9 } });
      await name(u, 'J');
      await u.use('circle_3pts', 'J', 'S', 'T');
      u.refs.g = circleId(u);
      const [R] = await pos(u, 'R');
      await u.cross({ id: u.refs.g }, { id: u.refs.l }, R, 'A');
      await u.use('line', 'A', 'J');
      const [A, J] = await pos(u, 'A', 'J');
      await u.cross({ line: ['A', 'J'] }, om, { not: 'J' }, 'K');
      await u.use('line', 'K', 'T');
    },
    check: (V, H) => H.lineTan(V('K'), V('T'), V('#g')),
    pre: (V, H) => H.G().intersect(V('#g'), V('#l')).length === 2,
    kham: { type: 'tangent', names: ['K', 'T'] },
    keo: ['S', 'J'],
  },
  {
    id: 'imo2018-1', nhom: 'IMO', ten: 'IMO 2018 – Bài 1',
    de: 'Γ là đường tròn ngoại tiếp tam giác nhọn ABC. D, E thuộc các đoạn AB, AC với AD = AE. Trung trực của BD và CE cắt các cung nhỏ AB, AC của Γ tại F, G. Chứng minh DE ∥ FG (hoặc trùng).',
    async dung(u) {
      await tri(u, [-0.4, 3.8], [-4, -1.6], [4, -1.6]);
      await u.use('circumcircle', 'A', 'B', 'C');
      u.refs.w = circleId(u);
      await u.use('point', { spec: { line: ['A', 'B'] }, near: { x: -2.6, y: 0.4 } });
      await name(u, 'D');
      await u.use('circle', 'A', 'D');
      await u.cross({ cr: ['A', 'D'] }, { line: ['A', 'C'] }, { x: 2.5, y: 0.4 }, 'E');
      await u.use('perp_bisector', 'B', 'D');
      const p1 = lineId(u);
      await u.cross({ id: p1 }, { id: u.refs.w }, { x: -4, y: 2.5 }, 'F');
      await u.use('perp_bisector', 'C', 'E');
      const p2 = lineId(u);
      await u.cross({ id: p2 }, { id: u.refs.w }, { x: 4, y: 2.5 }, 'G');
      await u.use('segment', 'D', 'E');
      await u.use('segment', 'F', 'G');
    },
    check: (V, H) => H.par(V('D'), V('E'), V('F'), V('G')),
    kham: { type: 'parallel', names: [] },
  },
  {
    id: 'imo2019-6', nhom: 'IMO', ten: 'IMO 2019 – Bài 6',
    de: 'I là tâm nội tiếp tam giác nhọn ABC (AB ≠ AC), ω tiếp xúc BC, CA, AB tại D, E, F. Đường thẳng qua D vuông góc EF cắt ω lần nữa tại R. AR cắt ω lần nữa tại P. Đường tròn (PCE) và (PBF) cắt nhau lần nữa tại Q. Chứng minh DI và PQ cắt nhau trên đường thẳng qua A vuông góc AI.',
    async dung(u) {
      await tri(u, [-0.8, 3.8], [-3.8, -1.8], [4.0, -1.8]);
      await u.use('incircle', 'A', 'B', 'C');
      u.refs.w = circleId(u);
      await u.use('incircle_touch', 'A', 'B', 'C'); await name(u, 'D');
      await u.use('incircle_touch', 'B', 'C', 'A'); await name(u, 'E');
      await u.use('incircle_touch', 'C', 'A', 'B'); await name(u, 'F');
      await u.use('segment', 'E', 'F');
      await u.use('perpendicular', 'D', { line: ['E', 'F'] });
      const pd = lineId(u);
      const [D, A] = await pos(u, 'D', 'A');
      await u.cross({ id: pd }, { id: u.refs.w }, { not: 'D' }, 'R');
      await u.use('line', 'A', 'R');
      const [R] = await pos(u, 'R');
      await u.cross({ line: ['A', 'R'] }, { id: u.refs.w }, { not: 'R' }, 'P');
      void R;
      await u.use('circle_3pts', 'P', 'C', 'E'); const c1 = circleId(u);
      await u.use('circle_3pts', 'P', 'B', 'F'); const c2 = circleId(u);
      const [P] = await pos(u, 'P');
      const roots = G.intersect(await u.ev((id) => __app.values.get(id), c1), await u.ev((id) => __app.values.get(id), c2));
      const Q = roots.reduce((a, b) => (G.dist(a, P) > G.dist(b, P) ? a : b));
      await u.cross({ id: c1 }, { id: c2 }, Q, 'Q');
      await u.use('line', 'D', 'I');
      await u.use('line', 'P', 'Q');
      await u.use('line', 'A', 'I');
      await u.use('perpendicular', 'A', { line: ['A', 'I'] });
    },
    check: (V, H) => { const Z = H.meet(V('D'), V('I'), V('P'), V('Q')); return H.perp(V('A'), Z, V('A'), V('I')); },
    kham: { type: 'concurrent', names: [] },
  },
  {
    id: 'imo2021-4', nhom: 'IMO', ten: 'IMO 2021 – Bài 4',
    de: 'Đường tròn Γ tâm I tiếp xúc bốn cạnh của tứ giác lồi ABCD. Ω là đường tròn (AIC). Tia đối của AB… cắt Ω tại X (BA kéo dài qua A), Z (BC kéo dài qua C); AD, CD kéo dài qua D cắt Ω tại Y, T. Chứng minh AD + DT + TX + XA = CD + DY + YZ + ZC.',
    async dung(u) {
      await u.use('circle', [0, 0], [0, -2.2]);
      await u.names('I', 'U');
      const g = { cr: ['I', 'U'] };
      const ang = [90, 140, 230, 330].map((d) => (d * Math.PI) / 180);
      const tl = [];
      for (let i = 0; i < 4; i++) {
        await u.use('point', { spec: g, near: { x: 2.2 * Math.cos(ang[i]), y: 2.2 * Math.sin(ang[i]) } });
        await name(u, `T_${i + 1}`);
      }
      for (let i = 0; i < 4; i++) { await u.use('tangent_at', g, `T_${i + 1}`); tl.push(lineId(u)); }
      const V = ['D', 'A', 'B', 'C']; // đỉnh giữa tiếp tuyến thứ i và i+1 (đặt tên sao cho X, Y, Z, T nằm trên phần kéo dài như đề)
      for (let i = 0; i < 4; i++) {
        const a = (ang[i] + ang[(i + 1) % 4] + (i === 3 ? 2 * Math.PI : 0)) / 2;
        const half = ((i === 3 ? ang[0] + 2 * Math.PI : ang[i + 1]) - ang[i]) / 2;
        const rr = 2.2 / Math.cos(half);
        await u.cross({ id: tl[i] }, { id: tl[(i + 1) % 4] }, { x: rr * Math.cos(a), y: rr * Math.sin(a) }, V[i]);
      }
      await u.use('circle_3pts', 'A', 'I', 'C');
      u.refs.om = circleId(u);
      const [A, B, C, D] = await pos(u, 'A', 'B', 'C', 'D');
      await u.cross({ line: ['B', 'A'] }, { id: u.refs.om }, { not: 'A' }, 'X');
      await u.cross({ line: ['B', 'C'] }, { id: u.refs.om }, { not: 'C' }, 'Z');
      await u.cross({ line: ['A', 'D'] }, { id: u.refs.om }, { not: 'A' }, 'Y');
      await u.cross({ line: ['C', 'D'] }, { id: u.refs.om }, { not: 'C' }, 'T');
    },
    check: (V, H) => { const d = H.d; const [A, C, D, X, Y, Z, T] = ['A', 'C', 'D', 'X', 'Y', 'Z', 'T'].map(V); return H.rel(d(A, D) + d(D, T) + d(T, X) + d(X, A), d(C, D) + d(D, Y) + d(Y, Z) + d(Z, C)); },
    pre: (V, H) => { const G = H.G(); const be = (P, Q, R) => G.lineParam(R, G.lineThrough(P, Q)) > 1; return be(V('B'), V('A'), V('X')) && be(V('B'), V('C'), V('Z')) && be(V('A'), V('D'), V('Y')) && be(V('C'), V('D'), V('T')); },
    keo: ['T_1', 'U'],
  },
  {
    id: 'imo2023-2', nhom: 'IMO', ten: 'IMO 2023 – Bài 2',
    de: 'Tam giác nhọn ABC, AB < AC, Ω ngoại tiếp. S là điểm chính giữa cung CB chứa A. Đường vuông góc từ A xuống BC cắt BS tại D, cắt Ω lần nữa tại E. Đường qua D song song BC cắt BE tại L. ω = (BDL) cắt Ω lần nữa tại P. Chứng minh tiếp tuyến của ω tại P cắt BS trên phân giác trong góc BAC.',
    async dung(u) {
      await tri(u, [-1.0, 3.8], [-3.6, -1.6], [4.2, -1.6]);
      await u.use('circumcircle', 'A', 'B', 'C');
      u.refs.w = circleId(u);
      await u.use('arc_mid_yes', 'A', 'B', 'C'); await name(u, 'S');
      await u.use('perpendicular', 'A', { line: ['B', 'C'] }); const h = lineId(u);
      await u.use('line', 'B', 'S');
      await u.cross({ id: h }, { line: ['B', 'S'] }, null, 'D');
      await u.cross({ id: h }, { id: u.refs.w }, { not: 'A' }, 'E');
      await u.use('parallel', 'D', { line: ['B', 'C'] }); const pa = lineId(u);
      await u.use('line', 'B', 'E');
      await u.cross({ id: pa }, { line: ['B', 'E'] }, null, 'L');
      await u.use('circle_3pts', 'B', 'D', 'L'); u.refs.om = circleId(u);
      const [B] = await pos(u, 'B');
      const roots = G.intersect(await u.ev((id) => __app.values.get(id), u.refs.om), await u.ev((id) => __app.values.get(id), u.refs.w));
      const Pp = roots.reduce((a, b) => (G.dist(a, B) > G.dist(b, B) ? a : b));
      await u.cross({ id: u.refs.om }, { id: u.refs.w }, Pp, 'P');
      await u.use('tangent_at', { id: u.refs.om }, 'P'); const t = lineId(u);
      await u.cross({ id: t }, { line: ['B', 'S'] }, null, 'X');
      await u.use('line', 'A', 'X');
    },
    check: (V, H) => H.col(V('A'), V('X'), H.incenter(V('A'), V('B'), V('C'))),
    pre: (V, H) => H.d(V('A'), V('B')) < H.d(V('A'), V('C')),
  },
  {
    id: 'imo2024-4', nhom: 'IMO', ten: 'IMO 2024 – Bài 4',
    de: 'Tam giác ABC với AB < AC < BC, tâm nội tiếp I, đường tròn nội tiếp ω. X ≠ C thuộc BC sao cho đường qua X song song AC tiếp xúc ω; Y ≠ B thuộc BC sao cho đường qua Y song song AB tiếp xúc ω. AI cắt (ABC) lần nữa tại P. K, L là trung điểm AC, AB. Chứng minh ∠KIL + ∠YPX = 180°.',
    async dung(u) {
      await tri(u, [0.5, 3.5], [-3.4, -1.6], [4.6, -1.6]);
      await u.use('incircle', 'A', 'B', 'C');
      // tiếp tuyến của ω song song AC (khác AC) = ảnh của AC qua phép đối xứng tâm I
      await u.use('reflect_point', { line: ['C', 'A'] }, 'I'); const l1 = lineId(u);
      await u.cross({ id: l1 }, { line: ['B', 'C'] }, null, 'X');
      await u.use('reflect_point', { line: ['A', 'B'] }, 'I'); const l2 = lineId(u);
      await u.cross({ id: l2 }, { line: ['B', 'C'] }, null, 'Y');
      await u.use('circumcircle', 'A', 'B', 'C'); const w = circleId(u);
      await u.use('line', 'A', 'I');
      await u.cross({ line: ['A', 'I'] }, { id: w }, { x: 0.5, y: -6 }, 'P');
      await u.use('midpoint', { line: ['C', 'A'] }); await name(u, 'K');
      await u.use('midpoint', { line: ['A', 'B'] }); await name(u, 'L');
      await u.use('segment', 'K', 'I'); await u.use('segment', 'I', 'L');
      await u.use('segment', 'Y', 'P'); await u.use('segment', 'P', 'X');
    },
    check: (V, H) => Math.abs(H.angle(V('K'), V('I'), V('L')) + H.angle(V('Y'), V('P'), V('X')) - Math.PI) / Math.PI,
    pre: (V, H) => H.d(V('A'), V('B')) < H.d(V('A'), V('C')) && H.d(V('A'), V('C')) < H.d(V('B'), V('C')),
  },
  {
    id: 'imo2025-2', nhom: 'IMO', ten: 'IMO 2025 – Bài 2',
    de: 'Ω tâm M và Γ tâm N (bán kính Ω nhỏ hơn) cắt nhau tại A, B. MN cắt Ω tại C, cắt Γ tại D (C, M, N, D theo thứ tự). P là tâm ngoại tiếp ACD. AP cắt Ω lần nữa tại E, cắt Γ lần nữa tại F. H là trực tâm PMN. Chứng minh đường qua H song song AP tiếp xúc đường tròn (BEF).',
    async dung(u) {
      await u.use('circle', [-1.5, 0.3], [-1.5, -1.7]);
      await u.names('M', 'U');
      await u.use('circle', [1.9, 0.3], [1.9, -2.8]);
      await u.names('N', 'V');
      const om = { cr: ['M', 'U'] }, ga = { cr: ['N', 'V'] };
      await u.cross(om, ga, { x: 0, y: 3 }, 'A');
      await u.cross(om, ga, { x: 0, y: -3 }, 'B');
      await u.use('line', 'M', 'N');
      await u.cross({ line: ['M', 'N'] }, om, { x: -5, y: 0.3 }, 'C');
      await u.cross({ line: ['M', 'N'] }, ga, { x: 6, y: 0.3 }, 'D');
      await u.use('circumcenter', 'A', 'C', 'D'); await name(u, 'P');
      await u.use('line', 'A', 'P');
      const [A, P] = await pos(u, 'A', 'P');
      await u.cross({ line: ['A', 'P'] }, om, { not: 'A' }, 'E');
      await u.cross({ line: ['A', 'P'] }, ga, { not: 'A' }, 'F');
      await u.use('orthocenter', 'P', 'M', 'N');
      await u.use('parallel', 'H', { line: ['A', 'P'] }); u.refs.h = lineId(u);
      await u.use('circle_3pts', 'B', 'E', 'F'); u.refs.c = circleId(u);
    },
    check: (V, H) => { const l = V('#h'), c = V('#c'); return Math.abs(H.G().distPointLine(c.c, l) - c.r) / c.r; },
    kham: { type: 'tangent', names: [] },
    keo: ['N', 'U'],
  },

  // ============================== VMO ==============================
  {
    id: 'vmo2014-4', nhom: 'VMO', ten: 'VMO 2014 – Bài 4',
    de: 'Tam giác nhọn ABC (AB < AC) nội tiếp (O); I là điểm chính giữa cung BC không chứa A. K ≠ C thuộc AC với IK = IC. BK cắt (O) tại D (D ≠ B), cắt AI tại E. DI cắt AC tại F. a) EF = BC/2. b) M thuộc DI với CM ∥ AD; KM cắt BC tại N; (BKN) cắt (O) tại P ≠ B. Chứng minh PK đi qua trung điểm AD.',
    async dung(u) {
      await tri(u, [-1.2, 3.8], [-3.6, -1.6], [4.2, -1.6]);
      await u.use('circumcircle', 'A', 'B', 'C'); u.refs.w = circleId(u);
      await u.use('arc_mid_no', 'A', 'B', 'C'); await name(u, 'I');
      await u.use('circle', 'I', 'C');
      const [A] = await pos(u, 'A');
      await u.cross({ cr: ['I', 'C'] }, { line: ['A', 'C'] }, { not: 'C' }, 'K');
      await u.use('line', 'B', 'K');
      const [B, K] = await pos(u, 'B', 'K');
      await u.cross({ line: ['B', 'K'] }, { id: u.refs.w }, { not: 'B' }, 'D');
      await u.use('line', 'A', 'I');
      await u.cross({ line: ['B', 'K'] }, { line: ['A', 'I'] }, null, 'E');
      await u.use('line', 'D', 'I');
      await u.cross({ line: ['D', 'I'] }, { line: ['A', 'C'] }, null, 'F');
      await u.use('segment', 'E', 'F');
      await u.use('line', 'A', 'D');
      await u.use('parallel', 'C', { line: ['A', 'D'] }); const pc = lineId(u);
      await u.cross({ id: pc }, { line: ['D', 'I'] }, null, 'M');
      await u.use('line', 'K', 'M');
      await u.cross({ line: ['K', 'M'] }, { line: ['B', 'C'] }, null, 'N');
      await u.use('circle_3pts', 'B', 'K', 'N'); const c = circleId(u);
      const [Bb] = await pos(u, 'B');
      const roots = G.intersect(await u.ev((id) => __app.values.get(id), c), await u.ev((id) => __app.values.get(id), u.refs.w));
      await u.cross({ id: c }, { id: u.refs.w }, roots.reduce((a, b) => (G.dist(a, Bb) > G.dist(b, Bb) ? a : b)), 'P');
      await u.use('midpoint', 'A', 'D'); await name(u, 'J');
      await u.use('line', 'P', 'K');
    },
    check: (V, H) => H.max(H.rel(H.d(V('E'), V('F')), H.d(V('B'), V('C')) / 2), H.col(V('P'), V('K'), V('J'))),
    pre: (V, H) => H.d(V('A'), V('B')) < H.d(V('A'), V('C')),
  },
  {
    id: 'vmo2016-3', nhom: 'VMO', ten: 'VMO 2016 – Bài 3',
    de: 'B, C cố định, A thay đổi (tam giác ABC nhọn). D là trung điểm BC; E, F là hình chiếu của D trên AB, AC. O là tâm ngoại tiếp; EF cắt AO, BC tại M, N. a) Đường tròn (AMN) luôn đi qua một điểm cố định. b) Tiếp tuyến tại E, F của (AEF) cắt nhau tại T; T thuộc một đường thẳng cố định.',
    async dung(u) {
      await tri(u, [0.8, 3.4], [-3.6, -1.6], [3.6, -1.6]);
      await u.use('midpoint', { line: ['B', 'C'] }); await name(u, 'D');
      await u.use('projection', 'D', { line: ['A', 'B'] }); await name(u, 'E');
      await u.use('projection', 'D', { line: ['A', 'C'] }); await name(u, 'F');
      await u.use('circumcenter', 'A', 'B', 'C');
      await u.use('line', 'E', 'F');
      await u.use('line', 'A', 'O');
      await u.cross({ line: ['E', 'F'] }, { line: ['A', 'O'] }, null, 'M');
      await u.cross({ line: ['E', 'F'] }, { line: ['B', 'C'] }, null, 'N');
      await u.use('circle_3pts', 'A', 'M', 'N');
      await u.use('circle_diameter', 'A', 'D'); const c = circleId(u);
      await u.use('tangent_at', { id: c }, 'E'); const t1 = lineId(u);
      await u.use('tangent_at', { id: c }, 'F'); const t2 = lineId(u);
      await u.cross({ id: t1 }, { id: t2 }, null, 'T');
      await u.use('perp_bisector', { line: ['B', 'C'] });
    },
    // a) điểm cố định là D; b) T nằm trên trung trực BC
    check: (V, H) => H.max(H.cyc(V('A'), V('M'), V('N'), V('D')), H.rel(H.d(V('T'), V('B')), H.d(V('T'), V('C')))),
    kham: { type: 'concyclic|on_circle', names: ['A', 'M', 'N', 'D'] },
  },

  // ============================== CẤU HÌNH HAY GẶP ==============================
  {
    id: 'noi-bang-tiep', nhom: 'Cấu hình', ten: 'Bổ đề tâm nội tiếp – bàng tiếp',
    de: 'S là điểm chính giữa cung BC không chứa A của (ABC). Chứng minh B, C, I, I_A cùng nằm trên đường tròn tâm S (S là trung điểm II_A).',
    async dung(u) {
      await tri(u, [-0.4, 4.4], [-2.6, 0.2], [2.8, 0.2]);
      await u.use('circumcircle', 'A', 'B', 'C');
      await u.use('incenter', 'A', 'B', 'C');
      await u.use('excenter', 'A', 'B', 'C');
      await u.use('arc_mid_no', 'A', 'B', 'C'); await name(u, 'S');
      await u.use('segment', 'A', 'I_A');
      await u.use('circle', 'S', 'B');
    },
    check: (V, H) => { const S = V('S'), r = H.d(S, V('B')); return H.max(...['C', 'I', 'I_A'].map((n) => H.rel(H.d(S, V(n)), r)), H.col(V('I'), S, V('I_A'))); },
    kham: { type: 'on_circle|concyclic', names: ['I', 'I_A'] },
  },
  {
    id: 'euler-feuerbach', nhom: 'Cấu hình', ten: 'Đường tròn Euler – định lý Feuerbach',
    de: 'Đường tròn Euler của tam giác ABC tiếp xúc với đường tròn nội tiếp và ba đường tròn bàng tiếp.',
    async dung(u) {
      await tri(u, [-0.6, 2.6], [-2.0, -0.6], [2.2, -0.6]);
      await u.use('nine_point_circle', 'A', 'B', 'C'); u.refs.n = circleId(u);
      await u.use('incircle', 'A', 'B', 'C'); u.refs.i = circleId(u);
      await u.use('excircle', 'A', 'B', 'C'); u.refs.a = circleId(u);
      await u.use('excircle', 'B', 'C', 'A'); u.refs.b = circleId(u);
      await u.use('excircle', 'C', 'A', 'B'); u.refs.c = circleId(u);
      // điểm Feuerbach: bấm vào chỗ hai đường tròn tiếp xúc
      const [N, I] = await pos(u, 'N', 'I');
      const ni = await u.ev((ids) => ids.map((id) => __app.values.get(id)), [u.refs.n, u.refs.i]);
      const Fe = { x: ni[1].c.x + (ni[1].r * (ni[1].c.x - ni[0].c.x)) / G.dist(ni[0].c, ni[1].c), y: ni[1].c.y + (ni[1].r * (ni[1].c.y - ni[0].c.y)) / G.dist(ni[0].c, ni[1].c) };
      void N; void I;
      try { await u.cross({ id: u.refs.n }, { id: u.refs.i }, Fe, 'F_e'); } catch (e) { u.issue('giao điểm', 'Không bấm được tiếp điểm của hai đường tròn tiếp xúc (điểm Feuerbach): ' + e.message); }
    },
    check: (V, H) => H.max(...['#i', '#a', '#b', '#c'].map((k) => H.ccTan(V('#n'), V(k)))),
    kham: { type: 'tangent', names: [] },
  },
  {
    id: 'mixtilinear', nhom: 'Cấu hình', ten: 'Đường tròn mixtilinear',
    de: 'Đường tròn mixtilinear nội ứng với A tiếp xúc AB, AC tại K, L và tiếp xúc trong (O) tại T. Chứng minh I là trung điểm KL và T, I và điểm chính giữa cung BAC thẳng hàng.',
    async dung(u) {
      await tri(u, [-0.4, 3.8], [-3.8, -1.6], [4.0, -1.6]);
      await u.use('circumcircle', 'A', 'B', 'C'); u.refs.w = circleId(u);
      await u.use('mixtilinear_in', 'A', 'B', 'C'); u.refs.m = circleId(u);
      await name(u, 'J');
      await u.use('incenter', 'A', 'B', 'C');
      const vals = await u.ev((ids) => ids.map((id) => __app.values.get(id)), [u.refs.w, u.refs.m]);
      const T = { x: vals[0].c.x + (vals[0].r * (vals[1].c.x - vals[0].c.x)) / G.dist(vals[0].c, vals[1].c), y: vals[0].c.y + (vals[0].r * (vals[1].c.y - vals[0].c.y)) / G.dist(vals[0].c, vals[1].c) };
      let ok = false;
      try { await u.cross({ id: u.refs.m }, { id: u.refs.w }, T, 'T'); ok = true; } catch (e) { u.issue('giao điểm', 'Không lấy được tiếp điểm T của hai đường tròn tiếp xúc bằng công cụ Giao điểm: ' + e.message); }
      if (!ok) {
        await u.use('line', 'O', 'J');
        await u.cross({ line: ['O', 'J'] }, { id: u.refs.w }, T, 'T');
      }
      await u.use('projection', 'J', { line: ['A', 'B'] }); await name(u, 'K');
      await u.use('projection', 'J', { line: ['A', 'C'] }); await name(u, 'L');
      await u.use('segment', 'K', 'L');
      await u.use('arc_mid_yes', 'A', 'B', 'C'); await name(u, 'S');
      await u.use('line', 'T', 'S');
    },
    check: (V, H) => H.max(H.col(V('T'), V('I'), V('S')), H.d(V('I'), H.G().mid(V('K'), V('L'))) / H.d(V('K'), V('L'))),
  },
  {
    id: 'nghich-dao-bc', nhom: 'Cấu hình', ten: 'Nghịch đảo √(bc)',
    de: 'Phép nghịch đảo tâm A bán kính √(AB·AC) hợp với phép đối xứng qua phân giác góc A đổi chỗ B và C, biến (ABC) thành đường thẳng BC và biến đường tròn mixtilinear nội thành đường tròn bàng tiếp góc A.',
    async dung(u) {
      await tri(u, [-0.6, 3.8], [-3.0, -0.8], [4.2, -1.4]);
      await u.use('circumcircle', 'A', 'B', 'C'); u.refs.w = circleId(u);
      await u.use('angle_bisector', 'B', 'A', 'C'); u.refs.d = lineId(u);
      await u.use('reflect', 'C', { id: u.refs.d }); await name(u, "C'");
      // bán kính √(AB·AC') = độ dài tiếp tuyến từ A tới một đường tròn bất kỳ qua B, C'
      await u.use('circle_diameter', 'B', "C'"); const kap = circleId(u);
      await u.use('tangents_from', { id: kap }, 'A');
      const tp = pointsMade(u)[0];
      await u.rename(tp.id, 'T');
      await u.use('circle', 'A', 'T'); u.refs.k = circleId(u);
      const canCircle = await u.ev(() => !!window.GeoCore.STEP_TYPES.invert_circle);
      if (canCircle) {
        await u.use('invert', { id: u.refs.w }, { id: u.refs.k }); u.refs.wi = lineId(u);
        await u.use('reflect', { id: u.refs.wi }, { id: u.refs.d }); u.refs.wr = lineId(u);
        await u.use('mixtilinear_in', 'A', 'B', 'C'); u.refs.m = circleId(u);
        await u.use('invert', { id: u.refs.m }, { id: u.refs.k }); const mi = circleId(u);
        await u.use('reflect', { id: mi }, { id: u.refs.d }); u.refs.mr = circleId(u);
      } else {
        u.issue('thiếu công cụ', 'Nghịch đảo chỉ áp cho điểm: ảnh của (O) và của đường tròn mixtilinear phải dựng qua ảnh của 3 điểm');
        // ảnh của (O): nghịch đảo B, C → hai điểm, đường thẳng qua chúng
        for (const [P, n] of [['B', 'B_1'], ['C', 'C_1']]) { await u.use('invert', P, { id: u.refs.k }); await name(u, n); }
        await u.use('line', 'B_1', 'C_1'); u.refs.wi = lineId(u);
        await u.use('reflect', { id: u.refs.wi }, { id: u.refs.d }); u.refs.wr = lineId(u);
        await u.use('mixtilinear_in', 'A', 'B', 'C'); u.refs.m = circleId(u);
        const names = ['X', 'Y', 'Z'];
        const mv = await u.ev((id) => __app.values.get(id), u.refs.m);
        for (let i = 0; i < 3; i++) {
          const a = 1 + 2.1 * i;
          await u.use('point', { spec: { id: u.refs.m }, near: { x: mv.c.x + mv.r * Math.cos(a), y: mv.c.y + mv.r * Math.sin(a) } });
          await name(u, names[i]);
          await u.use('invert', names[i], { id: u.refs.k }); await name(u, names[i] + "'");
        }
        await u.use('circle_3pts', "X'", "Y'", "Z'"); const mi = circleId(u);
        await u.use('reflect', { id: mi }, { id: u.refs.d }); u.refs.mr = circleId(u);
      }
      await u.use('excircle', 'A', 'B', 'C'); u.refs.ex = circleId(u);
    },
    check: (V, H) => H.max(H.lineOf(V('#wr'), V('B'), V('C')), H.sameCircle(V('#mr'), V('#ex'))),
  },
  {
    id: 'brocard', nhom: 'Cấu hình', ten: 'Tứ giác nội tiếp – định lý Brocard',
    de: 'Tứ giác ABCD nội tiếp (O). P = AC ∩ BD, Q = AB ∩ CD, R = AD ∩ BC. Chứng minh O là trực tâm tam giác PQR.',
    async dung(u) {
      await u.use('cyclic_quad', [-2.6, 2.6], [-3.4, -1.4], [2.2, -2.6]);
      const pm = pointsMade(u);
      const c = pm.find((m) => m.type === 'center');
      if (c) await u.rename(c.id, 'O');
      const d = pm.find((m) => m.type === 'point_on');
      if (d) await u.rename(d.id, 'D');
      await u.use('segment', 'A', 'C');
      await u.use('segment', 'B', 'D');
      await u.cross({ line: ['A', 'C'] }, { line: ['B', 'D'] }, null, 'P');
      await u.cross({ line: ['A', 'B'] }, { line: ['C', 'D'] }, null, 'Q');
      await u.cross({ line: ['A', 'D'] }, { line: ['B', 'C'] }, null, 'R');
      await u.use('segment', 'P', 'Q'); await u.use('segment', 'Q', 'R'); await u.use('segment', 'R', 'P');
      await u.use('perpendicular', 'O', { line: ['Q', 'R'] });
    },
    check: (V, H) => H.max(H.perp(V('O'), V('P'), V('Q'), V('R')), H.perp(V('O'), V('Q'), V('P'), V('R'))),
    kham: { type: 'perpendicular|on_line', names: ['O'] },
  },
  {
    id: 'monge', nhom: 'Cấu hình', ten: 'Tiếp tuyến chung – định lý Monge',
    de: 'Ba đường tròn có bán kính khác nhau. Hai tiếp tuyến chung ngoài của mỗi cặp cắt nhau tại tâm vị tự ngoài; ba tâm vị tự ngoài thẳng hàng.',
    async dung(u) {
      const C = [[-4.5, -1, 1.2], [0.5, 2.4, 1.8], [4.2, -1.5, 0.8]];
      const nm = ['O_1', 'O_2', 'O_3'];
      for (let i = 0; i < 3; i++) {
        await u.use('circle', [C[i][0], C[i][1]], [C[i][0] + C[i][2] * 0.6, C[i][1] - C[i][2] * 0.8]);
        await u.names(nm[i], `R_${i + 1}`);
      }
      const cs = [];
      for (let i = 0; i < 3; i++) cs.push(await u.id({ cr: [nm[i], `R_${i + 1}`] }));
      await u.use('common_tangents', { id: cs[0] }, { id: cs[1] });
      u.refs.t = u.last.filter((m) => m.kind === 'line').map((m) => m.id);
      for (const [i, j, n] of [[0, 1, 'S_{12}'], [1, 2, 'S_{23}'], [0, 2, 'S_{13}']]) {
        await u.use('ext_homothety_center', { id: cs[i] }, { id: cs[j] });
        await name(u, n);
      }
      await u.use('line', 'S_{12}', 'S_{23}');
    },
    check: (V, H) => H.max(H.col(V('S_{12}'), V('S_{23}'), V('S_{13}'))),
    kham: { type: 'collinear|on_line', names: ['S_{12}', 'S_{23}', 'S_{13}'] },
  },
  {
    id: 'dong-dang-xoan', nhom: 'Cấu hình', ten: 'Tâm đồng dạng xoắn (quay + vị tự)',
    de: 'X = AB ∩ CD; (XAC) và (XBD) cắt nhau lần nữa tại S. Phép quay tâm S góc ∠ASC rồi vị tự tâm S tỉ số SC/SA biến A thành C và B thành D.',
    async dung(u) {
      for (const [x, y] of [[-4, 1.5], [-1.6, -0.3], [1.5, 0.3], [3.5, 2.7]]) await u.use('point', [x, y]);
      await u.use('line', 'A', 'B');
      await u.use('line', 'C', 'D');
      await u.cross({ line: ['A', 'B'] }, { line: ['C', 'D'] }, null, 'X');
      await u.use('circle_3pts', 'X', 'A', 'C'); const c1 = circleId(u);
      await u.use('circle_3pts', 'X', 'B', 'D'); const c2 = circleId(u);
      const [X] = await pos(u, 'X');
      const roots = G.intersect(...(await u.ev((ids) => ids.map((id) => __app.values.get(id)), [c1, c2])));
      await u.cross({ id: c1 }, { id: c2 }, roots.reduce((a, b) => (G.dist(a, X) > G.dist(b, X) ? a : b)), 'S');
      if (await u.has('rotate_by')) {
        await u.use('rotate_by', 'B', 'S', 'A', 'S', 'C'); await name(u, 'B_1');
        await u.use('homothety_by', 'B_1', 'S', 'S', 'C', 'S', 'A'); await name(u, "D'");
        await u.use('segment', 'S', 'B'); await u.use('segment', 'S', "D'");
      } else {
        u.issue('thiếu công cụ', 'Phép quay/vị tự chỉ nhận góc/tỉ số là hằng số gõ tay – không lấy được góc ASC và tỉ số SC/SA trên hình (kéo hình là sai)');
        await u.use('segment', 'S', 'B'); await u.use('segment', 'S', 'D');
      }
    },
    // bản có công cụ góc/tỉ số trên hình: D' (ảnh của B) phải trùng D; bản cũ: kiểm bằng công thức
    check: (V, H) => { let D2 = null; try { D2 = V("D'"); } catch (e) { if (e.message === 'undef') throw e; } if (D2) return H.d(D2, V('D')) / H.d(V('S'), V('D')); const S = V('S'), A = V('A'), B = V('B'), C = V('C'), D = V('D'); const k = H.d(S, C) / H.d(S, A); const R = H.G().rotatePoint(B, S, (H.G().cross(H.G().sub(A, S), H.G().sub(C, S)) >= 0 ? 1 : -1) * H.angle(A, S, C) * 180 / Math.PI); const D3 = H.G().homothetyPoint(R, S, k); return H.d(D3, D) / H.d(S, D); },
  },
  {
    id: 'hinh-day', nhom: 'Hình dày', ten: 'Tam giác với ba tâm bàng tiếp (hình dày)',
    de: 'Tam giác ABC, tâm nội tiếp I, ba tâm bàng tiếp I_A, I_B, I_C, đường tròn ngoại tiếp và ba đường tròn bàng tiếp. (O) là đường tròn Euler của tam giác I_AI_BI_C, I là trực tâm của nó, trung điểm M_A của II_A nằm trên (O). Kèm nhãn có chỉ số dưới và dấu phẩy.',
    async dung(u) {
      await u.use('model_excentral', [-0.3, 2.4], [-1.8, -0.6], [2.0, -0.6]);
      await u.use('segment', 'I_B', 'I_C'); await u.use('segment', 'I_C', 'I_A'); await u.use('segment', 'I_A', 'I_B');
      for (const X of ['A', 'B', 'C']) {
        await u.use('midpoint', 'I', 'I_' + X); await name(u, 'M_' + X);
      }
      for (const [X, Y, Z] of [['A', 'B', 'C'], ['B', 'C', 'A'], ['C', 'A', 'B']]) {
        await u.use('projection', 'I_' + X, { line: [Y, Z] }); await name(u, 'T_' + X);
      }
      for (const X of ['A', 'B', 'C']) { await u.use('reflect_point', X, 'O'); await name(u, X + "'"); }
      await u.use('segment', 'A', "A'");
      await u.use('segment', 'I', 'I_A');
    },
    check: (V, H) => { const G = H.G(); const n = G.ninePointCenter(V('I_A'), V('I_B'), V('I_C')); const h = G.orthocenter(V('I_A'), V('I_B'), V('I_C')); const s = H.d(V('I_A'), V('I_B')); return H.max(H.d(n, V('O')) / s, H.d(h, V('I')) / s, H.cyc(V('A'), V('B'), V('C'), V('M_A'), V('M_B'), V('M_C'))); },
    kham: { type: 'on_circle|concyclic', names: ['M_A', 'M_B', 'M_C'] },
  },
];
