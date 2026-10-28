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
