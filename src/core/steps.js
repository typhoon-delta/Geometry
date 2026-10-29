// Danh mục các loại BƯỚC DỰNG. Mỗi bước sinh ra đúng MỘT đối tượng.
//
// Mỗi loại khai báo:
//   kind    : loại đối tượng sinh ra: 'point' | 'line' | 'circle' | 'mark' (đánh dấu, không tham gia khám phá)
//             hoặc 'same' (cùng loại với đối số đầu – dùng cho phép đối xứng)
//   args    : kiểu các đối số (tham chiếu tới id của bước trước):
//             'point' | 'line' | 'circle' | 'curve' (line|circle) | 'obj' (point|line|circle) | 'pl' (point|line)
//             '...point' = danh sách điểm có độ dài thay đổi (≥ 3)
//   params  : tham số số (mặc định) – là "bậc tự do" của bước (toạ độ điểm tự do, vị trí điểm trên đường...)
//   compute : (giá trị các đối số, params) => giá trị (xem geom.js) hoặc null nếu không xác định
//   facts   : (step) => các sự kiện HIỂN NHIÊN từ cách dựng, để bộ khám phá loại bỏ quan hệ tầm thường
//   label   : tên tiếng Việt
//   tag     : nhãn đặc biệt để xếp hạng kết quả khám phá (O, H, I, G, N, circumcircle, ...)
//
// Tham chiếu "ảo" trong facts (đường/đường tròn có thể chưa được dựng thành đối tượng):
//   {L:[X,Y]}      đường thẳng qua X, Y
//   {PB:[X,Y]}     trung trực XY
//   {C:[X,Y,Z]}    đường tròn qua X, Y, Z
//   {IC:[A,B,C]}   đường tròn nội tiếp tam giác ABC
// Các dạng sự kiện:
//   {on:[P, ref]}            điểm P thuộc đường/đường tròn ref
//   {col:[P,Q,R,...]}        thẳng hàng
//   {cyc:[P,Q,R,S,...]}      đồng viên
//   {par:[ref1, ref2]}       song song;  {perp:[ref1, ref2]} vuông góc
//   {tan:[ref1, ref2]}       tiếp xúc

import * as G from './geom.js';

const tri = (f) => ([A, B, C]) => (G.triangleOK(A, B, C) ? f(A, B, C) : null);
const P = (o) => (o ? G.pt(o.x, o.y) : null);

export const STEP_TYPES = {
  // ---------- ĐIỂM ----------
  free_point: {
    kind: 'point', args: [], params: { x: 0, y: 0 }, label: 'Điểm tự do',
    compute: (_, p) => G.pt(p.x, p.y),
  },
  point_on: {
    kind: 'point', args: ['curve'], params: { t: 0 }, label: 'Điểm trên đối tượng',
    compute: ([c], p) => G.pointOn(c, p.t),
    facts: (s) => [{ on: [s.id, s.args[0]] }],
  },
  intersection: {
    // which = 0|1 chọn nghiệm theo thứ tự chuẩn (xem geom.intersectLC / intersectCC) – liên tục khi kéo.
    kind: 'point', args: ['curve', 'curve'], params: { which: 0 }, label: 'Giao điểm',
    compute: ([a, b], p) => G.intersect(a, b)[p.which] || null,
    facts: (s) => [{ on: [s.id, s.args[0]] }, { on: [s.id, s.args[1]] }],
  },
  intersection_other: {
    // Giao điểm thứ hai của hai đường (khác điểm Q đã có, Q thường là một giao điểm đã biết).
    kind: 'point', args: ['curve', 'curve', 'point'], label: 'Giao điểm thứ hai',
    compute: ([a, b, Q]) => {
      const r = G.intersect(a, b);
      if (r.length === 0) return null;
      if (r.length === 1) return r[0];
      return G.dist(r[0], Q) >= G.dist(r[1], Q) ? r[0] : r[1];
    },
    facts: (s) => [{ on: [s.id, s.args[0]] }, { on: [s.id, s.args[1]] }],
  },
  midpoint: {
    kind: 'point', args: ['point', 'point'], label: 'Trung điểm',
    compute: ([A, B]) => G.mid(A, B),
    facts: (s) => [{ col: [s.args[0], s.id, s.args[1]] }, { on: [s.id, { PB: s.args }] }],
  },
  projection: {
    kind: 'point', args: ['point', 'line'], label: 'Hình chiếu',
    compute: ([Q, l]) => G.project(Q, l),
    facts: (s) => [{ on: [s.id, s.args[1]] }, { perp: [{ L: [s.args[0], s.id] }, s.args[1]] }],
  },
  reflect: {
    kind: 'same', args: ['obj', 'pl'], label: 'Đối xứng',
    compute: ([X, M]) => G.reflectObject(X, M),
    facts: (s, kinds) => {
      if (kinds[0] !== 'point') return [];
      if (kinds[1] === 'point') return [{ col: [s.args[0], s.args[1], s.id] }];
      return [{ perp: [{ L: [s.args[0], s.id] }, s.args[1]] }];
    },
  },
  circumcenter: {
    kind: 'point', args: ['point', 'point', 'point'], label: 'Tâm ngoại tiếp', tag: 'O',
    compute: tri(G.circumcenter),
    facts: (s) => {
      const [A, B, C] = s.args;
      return [{ on: [s.id, { PB: [A, B] }] }, { on: [s.id, { PB: [B, C] }] }, { on: [s.id, { PB: [C, A] }] }];
    },
  },
  orthocenter: {
    kind: 'point', args: ['point', 'point', 'point'], label: 'Trực tâm', tag: 'H',
    compute: tri(G.orthocenter),
    facts: (s) => {
      const [A, B, C] = s.args;
      return [
        { perp: [{ L: [A, s.id] }, { L: [B, C] }] },
        { perp: [{ L: [B, s.id] }, { L: [C, A] }] },
        { perp: [{ L: [C, s.id] }, { L: [A, B] }] },
      ];
    },
  },
  incenter: {
    kind: 'point', args: ['point', 'point', 'point'], label: 'Tâm nội tiếp', tag: 'I',
    compute: tri(G.incenter),
    facts: (s) => {
      const [A, B, C] = s.args;
      return [
        { on: [s.id, { AB: [B, A, C] }] }, { on: [s.id, { AB: [A, B, C] }] }, { on: [s.id, { AB: [A, C, B] }] },
      ];
    },
  },
  centroid: {
    kind: 'point', args: ['point', 'point', 'point'], label: 'Trọng tâm', tag: 'G',
    compute: tri(G.centroid),
  },
  nine_point_center: {
    kind: 'point', args: ['point', 'point', 'point'], label: 'Tâm đường tròn Euler', tag: 'N',
    compute: tri(G.ninePointCenter),
  },
  altitude_foot: {
    // Chân đường cao hạ từ đỉnh thứ nhất (A) xuống cạnh đối diện BC.
    kind: 'point', args: ['point', 'point', 'point'], label: 'Chân đường cao',
    compute: tri((A, B, C) => G.project(A, G.lineThrough(B, C))),
    facts: (s) => {
      const [A, B, C] = s.args;
      return [{ col: [B, s.id, C] }, { perp: [{ L: [A, s.id] }, { L: [B, C] }] }];
    },
  },
  incircle_touch: {
    // Tiếp điểm của đường tròn nội tiếp với cạnh BC (đối diện đỉnh thứ nhất A).
    kind: 'point', args: ['point', 'point', 'point'], label: 'Tiếp điểm đường tròn nội tiếp',
    compute: tri((A, B, C) => G.project(G.incenter(A, B, C), G.lineThrough(B, C))),
    facts: (s) => {
      const [A, B, C] = s.args;
      return [{ col: [B, s.id, C] }, { on: [s.id, { IC: [A, B, C] }] }];
    },
  },
  arc_midpoint: {
    // Điểm chính giữa cung BC của (ABC); contains = true: cung chứa A, false: cung không chứa A.
    kind: 'point', args: ['point', 'point', 'point'], params: { contains: false }, label: 'Điểm chính giữa cung',
    compute: ([A, B, C], p) => (G.triangleOK(A, B, C) ? G.arcMidpoint(A, B, C, !!p.contains) : null),
    facts: (s) => {
      const [A, B, C] = s.args;
      return [{ on: [s.id, { C: [A, B, C] }] }, { on: [s.id, { PB: [B, C] }] }];
    },
  },

  center: {
    // Tâm của một đường tròn (mọi công cụ vẽ đường tròn đều dựng kèm tâm).
    kind: 'point', args: ['circle'], label: 'Tâm đường tròn',
    compute: ([c]) => G.pt(c.c.x, c.c.y),
    facts: (s, kinds, doc) => {
      const c = doc && doc.steps.find((x) => x.id === s.args[0]);
      if (!c || !['circle_3pts', 'circumcircle'].includes(c.type)) return [];
      const [A, B, C] = c.args;
      return [{ on: [s.id, { PB: [A, B] }] }, { on: [s.id, { PB: [B, C] }] }, { on: [s.id, { PB: [C, A] }] }];
    },
  },

  // ---------- ĐƯỜNG THẲNG ----------
  line: {
    kind: 'line', args: ['point', 'point'], label: 'Đường thẳng',
    compute: ([A, B]) => G.lineThrough(A, B, 'line'),
    facts: (s) => [{ on: [s.args[0], s.id] }, { on: [s.args[1], s.id] }],
  },
  segment: {
    kind: 'line', args: ['point', 'point'], label: 'Đoạn thẳng',
    compute: ([A, B]) => G.lineThrough(A, B, 'segment'),
    facts: (s) => [{ on: [s.args[0], s.id] }, { on: [s.args[1], s.id] }],
  },
  ray: {
    kind: 'line', args: ['point', 'point'], label: 'Tia',
    compute: ([A, B]) => G.lineThrough(A, B, 'ray'),
    facts: (s) => [{ on: [s.args[0], s.id] }, { on: [s.args[1], s.id] }],
  },
  perpendicular: {
    kind: 'line', args: ['point', 'line'], label: 'Đường vuông góc',
    compute: ([Q, l]) => G.line(Q, G.perp(l.d)),
    facts: (s) => [{ on: [s.args[0], s.id] }, { perp: [s.id, s.args[1]] }],
  },
  parallel: {
    kind: 'line', args: ['point', 'line'], label: 'Đường song song',
    compute: ([Q, l]) => G.line(Q, l.d),
    facts: (s) => [{ on: [s.args[0], s.id] }, { par: [s.id, s.args[1]] }],
  },
  perp_bisector: {
    kind: 'line', args: ['point', 'point'], label: 'Đường trung trực',
    compute: ([A, B]) => (G.dist(A, B) < G.EPS ? null : G.line(G.mid(A, B), G.perp(G.sub(B, A)))),
    facts: (s) => [{ perp: [s.id, { L: s.args }] }],
  },
  angle_bisector: {
    // Phân giác góc ABC (đỉnh B = đối số thứ hai). external = true: phân giác ngoài.
    kind: 'line', args: ['point', 'point', 'point'], params: { external: false }, label: 'Đường phân giác',
    compute: ([A, B, C], p) => G.angleBisector(A, B, C, !!p.external),
    facts: (s) => [{ on: [s.args[1], s.id] }],
  },

  // ---------- ĐƯỜNG TRÒN ----------
  circle: {
    kind: 'circle', args: ['point', 'point'], label: 'Đường tròn (tâm, điểm)',
    compute: ([O, A]) => G.circle(O, G.dist(O, A)),
    facts: (s) => [{ on: [s.args[1], s.id] }],
  },
  circle_radius: {
    // Đường tròn tâm O, bán kính bằng độ dài AB (compa).
    kind: 'circle', args: ['point', 'point', 'point'], label: 'Đường tròn (tâm, bán kính)',
    compute: ([O, A, B]) => G.circle(O, G.dist(A, B)),
  },
  circle_3pts: {
    kind: 'circle', args: ['point', 'point', 'point'], label: 'Đường tròn qua 3 điểm',
    compute: ([A, B, C]) => G.circleThrough(A, B, C),
    facts: (s) => s.args.map((a) => ({ on: [a, s.id] })),
  },
  circumcircle: {
    kind: 'circle', args: ['point', 'point', 'point'], label: 'Đường tròn ngoại tiếp', tag: 'circumcircle',
    compute: ([A, B, C]) => G.circleThrough(A, B, C),
    facts: (s) => s.args.map((a) => ({ on: [a, s.id] })),
  },
  incircle: {
    kind: 'circle', args: ['point', 'point', 'point'], label: 'Đường tròn nội tiếp', tag: 'incircle',
    compute: tri((A, B, C) => G.circle(G.incenter(A, B, C), G.inradius(A, B, C))),
    facts: (s) => {
      const [A, B, C] = s.args;
      return [{ tan: [s.id, { L: [B, C] }] }, { tan: [s.id, { L: [C, A] }] }, { tan: [s.id, { L: [A, B] }] }];
    },
  },
  nine_point_circle: {
    kind: 'circle', args: ['point', 'point', 'point'], label: 'Đường tròn Euler', tag: 'ninepoint',
    compute: tri((A, B, C) => G.circleThrough(G.mid(A, B), G.mid(B, C), G.mid(C, A))),
  },

  // ---------- BỔ SUNG (bản 1.1: thư viện công cụ) ----------
  foot: {
    // Hình chiếu của P lên đường thẳng AB (không cần dựng đường AB).
    kind: 'point', args: ['point', 'point', 'point'], label: 'Chân đường vuông góc',
    compute: ([Q, A, B]) => (G.dist(A, B) < G.EPS ? null : G.project(Q, G.lineThrough(A, B))),
    facts: (s) => {
      const [Q, A, B] = s.args;
      return [{ col: [A, s.id, B] }, { perp: [{ L: [Q, s.id] }, { L: [A, B] }] }];
    },
  },
  reflect_pts: {
    // Điểm đối xứng của P qua đường thẳng AB.
    kind: 'point', args: ['point', 'point', 'point'], label: 'Đối xứng qua đường thẳng',
    compute: ([Q, A, B]) => (G.dist(A, B) < G.EPS ? null : G.reflectPointOverLine(Q, G.lineThrough(A, B))),
    facts: (s) => [{ perp: [{ L: [s.args[0], s.id] }, { L: [s.args[1], s.args[2]] }] }],
  },
  rotate: {
    // Quay đối tượng quanh tâm O một góc (độ, ngược chiều kim đồng hồ).
    kind: 'same', args: ['obj', 'point'], params: { angle: 90 }, label: 'Phép quay',
    compute: ([X, O], p) => G.mapObject(X, (P) => G.rotatePoint(P, O, p.angle)),
  },
  homothety: {
    kind: 'same', args: ['obj', 'point'], params: { k: 2 }, label: 'Phép vị tự',
    compute: ([X, O], p) => G.mapObject(X, (P) => G.homothetyPoint(P, O, p.k)),
    facts: (s, kinds) => (kinds[0] === 'point' ? [{ col: [s.args[1], s.args[0], s.id] }] : []),
  },
  translate: {
    // Tịnh tiến theo vectơ PQ.
    kind: 'same', args: ['obj', 'point', 'point'], label: 'Phép tịnh tiến',
    compute: ([X, P, Q]) => G.mapObject(X, (Z) => G.translatePoint(Z, P, Q)),
  },
  invert: {
    kind: 'point', args: ['point', 'circle'], label: 'Phép nghịch đảo',
    compute: ([P, c]) => G.invertPoint(P, c),
  },
  invert_line: {
    // Ảnh của đường thẳng/đường tròn đi qua tâm nghịch đảo (bản 1.2).
    kind: 'line', args: ['curve', 'circle'], label: 'Nghịch đảo (ảnh là đường thẳng)',
    compute: ([X, c]) => G.invertToLine(X, c),
  },
  invert_circle: {
    // Ảnh của đường thẳng/đường tròn không qua tâm nghịch đảo (bản 1.2).
    kind: 'circle', args: ['curve', 'circle'], label: 'Nghịch đảo (ảnh là đường tròn)',
    compute: ([X, c]) => G.invertToCircle(X, c),
  },
  rotate_by: {
    // Quay X quanh O một góc bằng góc có hướng ∠ABC LẤY TRÊN HÌNH (args: X, O, A, B, C) – kéo hình góc đổi theo.
    kind: 'same', args: ['obj', 'point', 'point', 'point', 'point'], label: 'Phép quay theo góc trên hình',
    compute: ([X, O, A, B, C]) => { const a = G.directedAngle(A, B, C); return a == null ? null : G.mapObject(X, (P) => G.rotatePoint(P, O, a)); },
  },
  homothety_by: {
    // Vị tự X tâm O, tỉ số AB/CD LẤY TRÊN HÌNH (args: X, O, A, B, C, D); params.negative: tỉ số âm.
    kind: 'same', args: ['obj', 'point', 'point', 'point', 'point', 'point'], params: { negative: false }, label: 'Phép vị tự theo tỉ số trên hình',
    compute: ([X, O, A, B, C, D], p) => {
      const cd = G.dist(C, D);
      if (cd < G.EPS) return null;
      const k = ((p.negative ? -1 : 1) * G.dist(A, B)) / cd;
      return G.mapObject(X, (P) => G.homothetyPoint(P, O, k));
    },
    facts: (s, kinds) => (kinds[0] === 'point' ? [{ col: [s.args[1], s.args[0], s.id] }] : []),
  },
  spiral: {
    // Phép đồng dạng (quay + vị tự) tâm O biến A thành B, áp cho X (args: X, O, A, B).
    kind: 'same', args: ['obj', 'point', 'point', 'point'], label: 'Phép đồng dạng tâm O biến A thành B',
    compute: ([X, O, A, B]) => (G.dist(A, O) < G.EPS ? null : G.mapObject(X, (P) => G.spiralPoint(P, O, A, B))),
  },
  tangent_at: {
    kind: 'line', args: ['circle', 'point'], label: 'Tiếp tuyến tại một điểm',
    compute: ([c, P]) => G.tangentAt(c, P),
    facts: (s) => [{ on: [s.args[1], s.id] }, { tan: [s.id, s.args[0]] }],
  },
  tangent_point: {
    // Tiếp điểm của tiếp tuyến kẻ từ P tới đường tròn (which = 0/1).
    kind: 'point', args: ['circle', 'point'], params: { which: 0 }, label: 'Tiếp điểm',
    compute: ([c, P], p) => G.tangentPoints(c, P)[p.which] || null,
    facts: (s) => [{ on: [s.id, s.args[0]] }, { tan: [{ L: [s.args[1], s.id] }, s.args[0]] }],
  },
  common_tangent: {
    kind: 'line', args: ['circle', 'circle'], params: { internal: false, which: 0 }, label: 'Tiếp tuyến chung',
    compute: ([a, b], p) => G.commonTangent(a, b, !!p.internal, p.which),
    facts: (s) => [{ tan: [s.id, s.args[0]] }, { tan: [s.id, s.args[1]] }],
  },
  radical_axis: {
    kind: 'line', args: ['circle', 'circle'], label: 'Trục đẳng phương',
    compute: ([a, b]) => G.radicalAxis(a, b),
  },
  radical_center: {
    kind: 'point', args: ['circle', 'circle', 'circle'], label: 'Tâm đẳng phương',
    compute: ([a, b, c]) => G.radicalCenter(a, b, c),
  },
  homothety_center: {
    kind: 'point', args: ['circle', 'circle'], params: { internal: false }, label: 'Tâm vị tự',
    compute: ([a, b], p) => G.homothetyCenter(a, b, !!p.internal),
  },
  excenter: {
    // Tâm bàng tiếp đối diện đỉnh thứ nhất (A).
    kind: 'point', args: ['point', 'point', 'point'], label: 'Tâm bàng tiếp', tag: 'excenter',
    compute: tri(G.excenter),
  },
  excircle: {
    kind: 'circle', args: ['point', 'point', 'point'], label: 'Đường tròn bàng tiếp', tag: 'excircle',
    compute: tri((A, B, C) => { const J = G.excenter(A, B, C); return J ? G.circle(J, G.distPointLine(J, G.lineThrough(B, C))) : null; }),
    facts: (s) => {
      const [A, B, C] = s.args;
      return [{ tan: [s.id, { L: [B, C] }] }, { tan: [s.id, { L: [C, A] }] }, { tan: [s.id, { L: [A, B] }] }];
    },
  },
  isogonal_conjugate: {
    kind: 'point', args: ['point', 'point', 'point', 'point'], label: 'Điểm liên hợp đẳng giác',
    compute: ([P, A, B, C]) => G.isogonalConjugate(P, A, B, C),
  },
  lemoine: {
    kind: 'point', args: ['point', 'point', 'point'], label: 'Điểm Lemoine', tag: 'K',
    compute: tri(G.lemoine),
  },
  kosnita: {
    kind: 'point', args: ['point', 'point', 'point'], label: 'Điểm Kosnita',
    compute: tri(G.kosnita),
  },
  symmedian_foot: {
    // Chân đường đối trung từ A trên BC.
    kind: 'point', args: ['point', 'point', 'point'], label: 'Chân đường đối trung',
    compute: tri(G.symmedianFoot),
    facts: (s) => [{ col: [s.args[1], s.id, s.args[2]] }],
  },
  cevian_foot: {
    // Giao của AP với BC (args: P, A, B, C).
    kind: 'point', args: ['point', 'point', 'point', 'point'], label: 'Chân đường Cevian',
    compute: ([P, A, B, C]) => (G.dist(A, P) < G.EPS || G.dist(B, C) < G.EPS ? null : G.intersectLL(G.lineThrough(A, P), G.lineThrough(B, C))),
    facts: (s) => {
      const [P, A, B, C] = s.args;
      return [{ col: [B, s.id, C] }, { col: [A, P, s.id] }];
    },
  },
  isogonal_line: {
    // Đường đẳng giác của AP trong góc BAC (args: B, A, C, P; đỉnh là đối số thứ hai).
    kind: 'line', args: ['point', 'point', 'point', 'point'], label: 'Đường đẳng giác',
    compute: ([B, A, C, P]) => G.isogonalLine(B, A, C, P),
    facts: (s) => [{ on: [s.args[1], s.id] }],
  },
  circle_tangent_at: {
    // Đường tròn tiếp xúc AB tại A và đi qua C.
    kind: 'circle', args: ['point', 'point', 'point'], label: 'Đường tròn tiếp xúc AB tại A, qua C',
    compute: ([A, B, C]) => G.circleTangentAt(A, B, C),
    facts: (s) => [{ on: [s.args[0], s.id] }, { on: [s.args[2], s.id] }, { tan: [s.id, { L: [s.args[0], s.args[1]] }] }],
  },
  mixtilinear: {
    kind: 'circle', args: ['point', 'point', 'point'], params: { external: false }, label: 'Đường tròn mixtilinear',
    compute: ([A, B, C], p) => (G.triangleOK(A, B, C) ? G.mixtilinear(A, B, C, !!p.external) : null),
    facts: (s) => {
      const [A, B, C] = s.args;
      return [{ tan: [s.id, { L: [A, B] }] }, { tan: [s.id, { L: [A, C] }] }, { tan: [s.id, { C: [A, B, C] }] }];
    },
  },
  circle_diameter: {
    kind: 'circle', args: ['point', 'point'], label: 'Đường tròn đường kính',
    compute: ([A, B]) => G.circle(G.mid(A, B), G.dist(A, B) / 2),
    facts: (s) => [{ on: [s.args[0], s.id] }, { on: [s.args[1], s.id] }],
  },

  // ---------- ĐÁNH DẤU (không tham gia khám phá) ----------
  polygon: {
    kind: 'mark', args: ['...point'], label: 'Miền đa giác',
    compute: (pts) => ({ kind: 'polygon', pts: pts.map(P) }),
  },
  angle_mark: {
    // Cung đánh dấu góc ABC (đỉnh B). style.arcs = số cung (1..3); góc vuông vẽ ô vuông.
    kind: 'mark', args: ['point', 'point', 'point'], label: 'Đánh dấu góc',
    compute: ([A, B, C]) => ({ kind: 'angle', A: P(A), B: P(B), C: P(C) }),
  },
  segment_mark: {
    // Vạch đánh dấu đoạn AB. style.ticks = số vạch (1..3).
    kind: 'mark', args: ['point', 'point'], label: 'Đánh dấu đoạn',
    compute: ([A, B]) => (G.dist(A, B) < G.EPS ? null : { kind: 'segmark', A: P(A), B: P(B) }),
  },
};

/** Nhóm loại cho bộ chọn kiểu đối số. */
export function argAccepts(argType, kind) {
  switch (argType) {
    case 'point': return kind === 'point';
    case 'line': return kind === 'line';
    case 'circle': return kind === 'circle';
    case 'curve': return kind === 'line' || kind === 'circle';
    case 'obj': return kind === 'point' || kind === 'line' || kind === 'circle';
    case 'pl': return kind === 'point' || kind === 'line';
    case '...point': return kind === 'point';
    default: return false;
  }
}

/** Các tham số tự do (dùng khi xê dịch ngẫu nhiên cho bộ khám phá). */
export const FREE_PARAM_TYPES = new Set(['free_point', 'point_on']);
