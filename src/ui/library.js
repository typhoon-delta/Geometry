// THƯ VIỆN CÔNG CỤ theo menu "Công cụ" (giống thư mục công cụ riêng trong Sketchpad của giáo viên).
// Mỗi công cụ: chọn các đối tượng đầu vào (inputs) rồi make(picks, ctx) sinh danh sách bước dựng.
// Không phụ thuộc DOM → chạy được trong test Node (xem src/core/apply.js: runTool).
//
// ctx (do App hoặc toolContext cung cấp): values, name(id), opt(key, mặc định), existingPointAt(P)
// Bản "chi tiết": giữ lại các đường dựng phụ (nét đứt, màu xám); bản thường: các bước phụ được ẩn.

import { STEP_TYPES } from '../core/steps.js';
import * as G from '../core/geom.js';

const AUX_STYLE = { dash: true, color: '#9ca3af' };
const P3 = ['point', 'point', 'point'];
const TRI = ['Chọn đỉnh A', 'Chọn đỉnh B', 'Chọn đỉnh C'];
const TRI_P = ['Chọn đỉnh A', 'Chọn đỉnh B', 'Chọn đỉnh C', 'Chọn điểm P'];
const sub = (n) => (n ? `_${n.length > 1 ? `{${n}}` : n}` : '');

/** Gom các bước của một công cụ; tái sử dụng điểm đã có nếu trùng toạ độ (vd O đã dựng trước). */
class Specs {
  constructor(ctx) {
    this.ctx = ctx;
    this.list = [];
    this.vals = new Map(); // '$k' → giá trị (để tính tiếp các bước sau và kiểm tra trùng)
  }

  val(ref) {
    return ref.startsWith('$') ? this.vals.get(ref) : this.ctx.values.get(ref);
  }

  /** Thêm bước; trả về tham chiếu '$k'. opts: {name, params, style, hidden} */
  add(type, args, opts = {}) {
    const def = STEP_TYPES[type];
    const ref = '$' + this.list.length;
    this.list.push({ type, args, ...opts });
    let v = null;
    try {
      const argv = args.map((a) => this.val(a));
      if (argv.every(Boolean)) v = def.compute(argv, { ...(def.params || {}), ...(opts.params || {}) });
    } catch { v = null; }
    this.vals.set(ref, v || null);
    return ref;
  }

  /** Như add cho một điểm, nhưng dùng lại điểm đã có nếu trùng. */
  point(type, args, opts = {}) {
    const def = STEP_TYPES[type];
    let v = null;
    try { v = def.compute(args.map((a) => this.val(a)), { ...(def.params || {}), ...(opts.params || {}) }); } catch { v = null; }
    if (v && v.kind === 'point') {
      // trùng một điểm vừa dựng trong cùng công cụ, hoặc một điểm đã có trên hình → dùng lại
      for (const [ref, w] of this.vals) if (w && w.kind === 'point' && G.dist(w, v) < 1e-9 * (1 + Math.hypot(v.x, v.y))) return ref;
      const ex = this.ctx.existingPointAt(v, 0.01);
      if (ex) return ex;
    }
    return this.add(type, args, opts);
  }

  /** Bước phụ: ẩn ở bản thường, nét đứt mờ ở bản chi tiết. */
  aux(type, args, detailed, opts = {}) {
    return this.add(type, args, detailed ? { ...opts, style: { ...AUX_STYLE, ...(opts.style || {}) } } : { ...opts, hidden: true });
  }

  seg(a, b, style) {
    return this.add('segment', [a, b], style ? { style } : {});
  }

  /** Đường tròn kèm tâm (tâm dùng lại điểm có sẵn nếu trùng; tên mặc định O, O₁, O₂…). */
  circleWithCenter(type, args, centerName, opts = {}) {
    const c = this.add(type, args, opts);
    this.point('center', [c], { name: centerName || 'O' });
    return c;
  }
}

const T = (menu, id, label, inputs, hints, make, extra = {}) => ({ id, label, menu, icon: extra.icon || '•', inputs, hints, make, ...extra });
const run = (fn) => (picks, ctx) => {
  const S = new Specs(ctx);
  fn(S, picks, ctx);
  return S.list;
};
const poly = (S, pts) => pts.forEach((p, i) => S.seg(p, pts[(i + 1) % pts.length]));

export const MENUS = ['1. Dựng hình', '2. Đường đặc biệt', '3. Đường tròn', '4. Điểm đặc biệt', '5. Phép biến hình', '6. Mô hình'];
const [M1, M2, M3, M4, M5, M6] = MENUS;

export const LIBRARY = [
  // ======================= 1. DỰNG HÌNH =======================
  T(M1, 'triangle', 'Dựng tam giác', P3, TRI, run((S, [A, B, C]) => poly(S, [A, B, C])), { icon: '△', preview: 'polygon' }),
  T(M1, 'right_triangle', 'Tam giác vuông', ['point', 'point'], ['Chọn đỉnh góc vuông A', 'Chọn đỉnh B (đỉnh C dựng trên đường vuông góc tại A, kéo được)'],
    run((S, [A, B]) => {
      const ab = S.seg(A, B);
      const p = S.add('perpendicular', [A, ab], { hidden: true });
      const C = S.add('point_on', [p], { params: { t: 0.75 } });
      S.seg(A, C); S.seg(B, C);
    }), { icon: '◺' }),
  T(M1, 'right_isosceles', 'Tam giác vuông cân', ['point', 'point'], ['Chọn đỉnh góc vuông A', 'Chọn đỉnh B'],
    run((S, [A, B]) => { const C = S.add('rotate', [B, A], { params: { angle: 90 } }); poly(S, [A, B, C]); }), { icon: '◺' }),
  T(M1, 'equilateral', 'Tam giác đều', ['point', 'point'], ['Chọn đỉnh A', 'Chọn đỉnh B (tam giác dựng ngược chiều kim đồng hồ)'],
    run((S, [A, B]) => { const C = S.add('rotate', [B, A], { params: { angle: 60 } }); poly(S, [A, B, C]); }), { icon: '△' }),
  T(M1, 'trapezoid', 'Hình thang', P3, ['Chọn đỉnh A', 'Chọn đỉnh B (đáy AB)', 'Chọn đỉnh C (D dựng trên đường qua C song song AB, kéo được)'],
    run((S, [A, B, C]) => {
      const ab = S.seg(A, B);
      const par = S.add('parallel', [C, ab], { hidden: true });
      const D = S.add('point_on', [par], { params: { t: -0.6 } });
      S.seg(B, C); S.seg(C, D); S.seg(D, A);
    }), { icon: '⏢' }),
  T(M1, 'isosceles_trapezoid', 'Hình thang cân', P3, ['Chọn đỉnh A', 'Chọn đỉnh B (đáy AB)', 'Chọn đỉnh C'],
    run((S, [A, B, C]) => {
      const pb = S.add('perp_bisector', [A, B], { hidden: true });
      const D = S.add('reflect', [C, pb]);
      poly(S, [A, B, C, D]);
    }), { icon: '⏢' }),
  T(M1, 'parallelogram', 'Hình bình hành', P3, ['Chọn đỉnh A', 'Chọn đỉnh B', 'Chọn đỉnh C (D = A + C − B)'],
    run((S, [A, B, C]) => { const D = S.add('translate', [C, B, A]); poly(S, [A, B, C, D]); }), { icon: '▱' }),
  T(M1, 'rectangle', 'Hình chữ nhật', ['point', 'point'], ['Chọn đỉnh A', 'Chọn đỉnh B (C trên đường vuông góc tại B, kéo được)'],
    run((S, [A, B]) => {
      const ab = S.seg(A, B);
      const p = S.add('perpendicular', [B, ab], { hidden: true });
      const C = S.add('point_on', [p], { params: { t: 0.6 } });
      const D = S.add('translate', [C, B, A]);
      S.seg(B, C); S.seg(C, D); S.seg(D, A);
    }), { icon: '▭' }),
  T(M1, 'rhombus', 'Hình thoi', ['point', 'point'], ['Chọn đỉnh A', 'Chọn đỉnh B (C trên đường tròn tâm B qua A, kéo được)'],
    run((S, [A, B], ctx) => {
      const c = S.add('circle', [B, A], { hidden: true });
      const a = ctx.values.get(A), b = ctx.values.get(B);
      const t = a && b ? Math.atan2(a.y - b.y, a.x - b.x) - 1.2 : 0;
      const C = S.add('point_on', [c], { params: { t } });
      const D = S.add('translate', [C, B, A]);
      poly(S, [A, B, C, D]);
    }), { icon: '◇' }),
  T(M1, 'square', 'Hình vuông', ['point', 'point'], ['Chọn đỉnh A', 'Chọn đỉnh B (hình vuông ABCD ngược chiều kim đồng hồ)'],
    run((S, [A, B]) => {
      const D = S.add('rotate', [B, A], { params: { angle: 90 } });
      const C = S.add('translate', [D, A, B]);
      poly(S, [A, B, C, D]);
    }), { icon: '□' }),
  T(M1, 'harmonic_quad', 'Tứ giác điều hoà', P3, ['Chọn đỉnh A', 'Chọn đỉnh B', 'Chọn đỉnh C (D: BD là đường đối trung của tam giác ABC)'],
    run((S, [A, B, C]) => {
      const w = S.circleWithCenter('circle_3pts', [A, B, C]);
      const ta = S.add('tangent_at', [w, A], { hidden: true });
      const tc = S.add('tangent_at', [w, C], { hidden: true });
      const T0 = S.add('intersection', [ta, tc], { hidden: true });
      const bt = S.add('line', [B, T0], { hidden: true });
      const D = S.add('intersection_other', [bt, w, B]);
      poly(S, [A, B, C, D]);
    }), { icon: '⊡' }),
  T(M1, 'circle_tangent_at', 'Tiếp xúc với AB tại A và qua C', P3, ['Chọn tiếp điểm A', 'Chọn điểm B (đường AB là tiếp tuyến)', 'Chọn điểm C thuộc đường tròn'],
    run((S, [A, B, C]) => S.circleWithCenter('circle_tangent_at', [A, B, C])), { icon: '◯' }),
  T(M1, 'cevian_triangle', 'Tam giác Cevian', ['point', 'point', 'point', 'point'], TRI_P,
    run((S, [A, B, C, P]) => {
      const D = S.add('cevian_foot', [P, A, B, C]);
      const E = S.add('cevian_foot', [P, B, C, A]);
      const F = S.add('cevian_foot', [P, C, A, B]);
      S.seg(A, D); S.seg(B, E); S.seg(C, F);
      poly(S, [D, E, F]);
    }), { icon: '⟑' }),
  T(M1, 'quadrilateral', 'Dựng tứ giác', ['point', 'point', 'point', 'point'], ['Chọn đỉnh A', 'Chọn đỉnh B', 'Chọn đỉnh C', 'Chọn đỉnh D'],
    run((S, pts) => poly(S, pts)), { icon: '⬠' }),
  T(M1, 'cyclic_quad', 'Dựng tứ giác nội tiếp', P3, ['Chọn đỉnh A', 'Chọn đỉnh B', 'Chọn đỉnh C (D trên đường tròn, kéo được)'],
    run((S, [A, B, C], ctx) => {
      const w = S.circleWithCenter('circle_3pts', [A, B, C]);
      const cv = S.vals.get(w), bv = ctx.values.get(B);
      const t = cv && bv ? Math.atan2(cv.c.y - bv.y, cv.c.x - bv.x) : 0; // phía đối diện B
      const D = S.add('point_on', [w], { params: { t } });
      poly(S, [A, B, C, D]);
    }), { icon: '⊙' }),

  // ======================= 2. ĐƯỜNG ĐẶC BIỆT =======================
  T(M2, 'altitude', 'Đường cao', P3, ['Chọn đỉnh A (kẻ đường cao từ A)', 'Chọn đỉnh B', 'Chọn đỉnh C'],
    run((S, [A, B, C]) => { const D = S.point('foot', [A, B, C]); S.seg(A, D); }), { icon: 'h' }),
  T(M2, 'median', 'Đường trung tuyến', P3, ['Chọn đỉnh A (trung tuyến từ A)', 'Chọn đỉnh B', 'Chọn đỉnh C'],
    run((S, [A, B, C]) => { const M = S.point('midpoint', [B, C]); S.seg(A, M); }), { icon: 'm' }),
  T(M2, 'perp_bisector', 'Đường trung trực', ['point', 'point'], ['Chọn điểm thứ nhất (hoặc bấm vào một đoạn thẳng)', 'Chọn điểm thứ hai'],
    run((S, [A, B]) => S.add('perp_bisector', [A, B])), { icon: '⊥', segmentShortcut: true }),
  T(M2, 'isogonal_line', 'Đường đẳng giác', ['point', 'point', 'point', 'point'], ['Chọn điểm trên cạnh thứ nhất', 'Chọn ĐỈNH góc', 'Chọn điểm trên cạnh thứ hai', 'Chọn điểm P (dựng đường đẳng giác của đỉnh–P)'],
    run((S, [B, A, C, P]) => S.add('isogonal_line', [B, A, C, P])), { icon: '∡' }),
  T(M2, 'symmedian', 'Đường đối trung', P3, ['Chọn đỉnh A (đối trung từ A)', 'Chọn đỉnh B', 'Chọn đỉnh C'],
    run((S, [A, B, C]) => { const L = S.point('symmedian_foot', [A, B, C]); S.seg(A, L); }), { icon: 'k' }),
  T(M2, 'ext_bisector', 'Đường phân giác ngoài', P3, ['Chọn điểm trên cạnh thứ nhất', 'Chọn ĐỈNH góc', 'Chọn điểm trên cạnh thứ hai'],
    run((S, p) => S.add('angle_bisector', p, { params: { external: true } })), { icon: '∠' }),
  T(M2, 'int_ext_bisector', 'Đường phân giác trong và ngoài', P3, ['Chọn điểm trên cạnh thứ nhất', 'Chọn ĐỈNH góc', 'Chọn điểm trên cạnh thứ hai'],
    run((S, p) => { S.add('angle_bisector', p); S.add('angle_bisector', p, { params: { external: true } }); }), { icon: '∠' }),
  T(M2, 'tangent_at', 'Tiếp tuyến tại một điểm', ['circle', 'point'], ['Chọn đường tròn và một điểm trên nó (thứ tự bất kỳ)', 'Chọn nốt đối tượng còn lại'],
    run((S, [c, P]) => S.add('tangent_at', [c, P])), { icon: '⟂', anyOrder: true }),
  T(M2, 'tangents_meet', 'Giao điểm của hai tiếp tuyến', ['circle', 'point', 'point'], ['Chọn đường tròn', 'Chọn tiếp điểm thứ nhất', 'Chọn tiếp điểm thứ hai'],
    run((S, [c, P, Q]) => {
      const a = S.add('tangent_at', [c, P]), b = S.add('tangent_at', [c, Q]);
      S.add('intersection', [a, b]);
    }), { icon: '⋏' }),
  T(M2, 'tangents_from', 'Tiếp tuyến kẻ từ một điểm', ['circle', 'point'], ['Chọn đường tròn và một điểm nằm ngoài (thứ tự bất kỳ)', 'Chọn nốt đối tượng còn lại'],
    run((S, [c, P]) => {
      for (const which of [0, 1]) {
        const T0 = S.add('tangent_point', [c, P], { params: { which } });
        S.add('line', [P, T0]);
      }
    }), { icon: '⋎', anyOrder: true }),
  T(M2, 'common_tangents', 'Tiếp tuyến chung', ['circle', 'circle'], ['Chọn đường tròn thứ nhất', 'Chọn đường tròn thứ hai (dựng mọi tiếp tuyến chung đang tồn tại)'],
    run((S, [a, b], ctx) => {
      const ca = ctx.values.get(a), cb = ctx.values.get(b);
      for (const internal of [false, true]) for (const which of [0, 1]) {
        if (ca && cb && !G.commonTangent(ca, cb, internal, which)) continue;
        S.add('common_tangent', [a, b], { params: { internal, which } });
      }
    }), { icon: '⌒' }),
  T(M2, 'euler_line', 'Đường thẳng Euler', P3, TRI,
    run((S, [A, B, C]) => {
      const O = S.point('circumcenter', [A, B, C], { name: 'O' });
      S.point('centroid', [A, B, C], { name: 'G' });
      const H = S.point('orthocenter', [A, B, C], { name: 'H' });
      S.add('line', [O, H]);
    }), { icon: 'e' }),
  T(M2, 'simson_line', 'Đường thẳng Simson', ['point', 'point', 'point', 'point'], ['Chọn đỉnh A', 'Chọn đỉnh B', 'Chọn đỉnh C', 'Chọn điểm P (thường lấy trên đường tròn ngoại tiếp)'],
    run((S, [A, B, C, P]) => {
      const D = S.point('foot', [P, B, C]), E = S.point('foot', [P, C, A]);
      S.point('foot', [P, A, B]);
      S.add('line', [D, E]);
    }), { icon: 's' }),
  T(M2, 'steiner_line', 'Đường thẳng Steiner', ['point', 'point', 'point', 'point'], ['Chọn đỉnh A', 'Chọn đỉnh B', 'Chọn đỉnh C', 'Chọn điểm P (thường lấy trên đường tròn ngoại tiếp)'],
    run((S, [A, B, C, P]) => {
      const X = S.add('reflect_pts', [P, B, C]), Y = S.add('reflect_pts', [P, C, A]);
      S.add('reflect_pts', [P, A, B]);
      S.add('line', [X, Y]);
    }), { icon: 'ℓ' }),

  // ======================= 3. ĐƯỜNG TRÒN =======================
  T(M3, 'circumcircle', 'Đường tròn ngoại tiếp', P3, TRI, run((S, p) => S.circleWithCenter('circumcircle', p, 'O')), { icon: '(O)' }),
  T(M3, 'pedal_circle', 'Đường tròn Pedal', ['point', 'point', 'point', 'point'], TRI_P,
    run((S, [A, B, C, P]) => {
      const f = [S.aux('foot', [P, B, C], false), S.aux('foot', [P, C, A], false), S.aux('foot', [P, A, B], false)];
      S.circleWithCenter('circle_3pts', f);
    }), { icon: '(P)' }),
  T(M3, 'pedal_circle_detail', 'Đường tròn Pedal chi tiết', ['point', 'point', 'point', 'point'], TRI_P,
    run((S, [A, B, C, P]) => {
      const f = [S.point('foot', [P, B, C]), S.point('foot', [P, C, A]), S.point('foot', [P, A, B])];
      for (const X of f) S.seg(P, X, AUX_STYLE);
      S.circleWithCenter('circle_3pts', f);
    }), { icon: '(P)' }),
  T(M3, 'incircle', 'Đường tròn nội tiếp', P3, TRI, run((S, p) => S.circleWithCenter('incircle', p, 'I')), { icon: '(I)' }),
  T(M3, 'excircle', 'Đường tròn bàng tiếp', P3, ['Chọn đỉnh A (bàng tiếp góc A)', 'Chọn đỉnh B', 'Chọn đỉnh C'],
    run((S, [A, B, C], ctx) => S.circleWithCenter('excircle', [A, B, C], 'I' + sub(ctx.name(A)))), { icon: '(J)' }),
  T(M3, 'circle_diameter', 'Đường tròn đường kính', ['point', 'point'], ['Chọn đầu mút thứ nhất (hoặc bấm vào một đoạn thẳng)', 'Chọn đầu mút thứ hai'],
    run((S, [A, B]) => S.circleWithCenter('circle_diameter', [A, B])), { icon: '⊖', segmentShortcut: true }),
  T(M3, 'mixtilinear_in', 'Đường tròn Mixtilinear nội', P3, ['Chọn đỉnh A (mixtilinear ứng với A)', 'Chọn đỉnh B', 'Chọn đỉnh C'],
    run((S, p) => S.circleWithCenter('mixtilinear', p)), { icon: '◐' }),
  T(M3, 'mixtilinear_ex', 'Đường tròn Mixtilinear ngoại', P3, ['Chọn đỉnh A (mixtilinear ngoại ứng với A)', 'Chọn đỉnh B', 'Chọn đỉnh C'],
    run((S, p) => S.circleWithCenter('mixtilinear', p, undefined, { params: { external: true } })), { icon: '◑' }),
  T(M3, 'radical_axis', 'Trục đẳng phương', ['circle', 'circle'], ['Chọn đường tròn thứ nhất', 'Chọn đường tròn thứ hai'],
    run((S, p) => S.add('radical_axis', p)), { icon: '⫼' }),
  T(M3, 'radical_center', 'Tâm đẳng phương', ['circle', 'circle', 'circle'], ['Chọn đường tròn thứ nhất', 'Chọn đường tròn thứ hai', 'Chọn đường tròn thứ ba'],
    run((S, p) => S.point('radical_center', p)), { icon: '✳' }),
  T(M3, 'nine_point_circle', 'Đường tròn Euler', P3, TRI, run((S, p) => S.circleWithCenter('nine_point_circle', p, 'N')), { icon: '(N)' }),

  // ======================= 4. ĐIỂM ĐẶC BIỆT =======================
  T(M4, 'centroid', 'Trọng tâm', P3, TRI, run((S, p) => S.point('centroid', p, { name: 'G' })), { icon: 'G' }),
  T(M4, 'centroid_detail', 'Trọng tâm chi tiết', P3, TRI,
    run((S, [A, B, C]) => {
      for (const [X, Y, Z] of [[A, B, C], [B, C, A], [C, A, B]]) S.seg(X, S.point('midpoint', [Y, Z]), AUX_STYLE);
      S.point('centroid', [A, B, C], { name: 'G' });
    }), { icon: 'G' }),
  T(M4, 'orthocenter', 'Trực tâm', P3, TRI, run((S, p) => S.point('orthocenter', p, { name: 'H' })), { icon: 'H' }),
  T(M4, 'orthocenter_detail', 'Trực tâm chi tiết', P3, TRI,
    run((S, [A, B, C]) => {
      for (const [X, Y, Z] of [[A, B, C], [B, C, A], [C, A, B]]) S.seg(X, S.point('foot', [X, Y, Z]), AUX_STYLE);
      S.point('orthocenter', [A, B, C], { name: 'H' });
    }), { icon: 'H' }),
  T(M4, 'isogonal_conjugate', 'Điểm liên hợp đẳng giác', ['point', 'point', 'point', 'point'], TRI_P,
    run((S, [A, B, C, P], ctx) => S.point('isogonal_conjugate', [P, A, B, C], { name: ctx.name(P) ? ctx.name(P) + '*' : undefined })), { icon: 'P*' }),
  T(M4, 'lemoine', 'Điểm Lemoine', P3, TRI, run((S, p) => S.point('lemoine', p, { name: 'K' })), { icon: 'K' }),
  T(M4, 'pedal_feet', 'Chân đường vuông góc hạ xuống ba cạnh', ['point', 'point', 'point', 'point'], TRI_P,
    run((S, [A, B, C, P]) => {
      for (const [X, Y] of [[B, C], [C, A], [A, B]]) S.seg(P, S.point('foot', [P, X, Y]), AUX_STYLE);
    }), { icon: '⊾' }),
  T(M4, 'ext_homothety_center', 'Tâm vị tự ngoài', ['circle', 'circle'], ['Chọn đường tròn thứ nhất', 'Chọn đường tròn thứ hai'],
    run((S, p) => S.point('homothety_center', p)), { icon: 'S' }),
  T(M4, 'int_homothety_center', 'Tâm vị tự trong', ['circle', 'circle'], ['Chọn đường tròn thứ nhất', 'Chọn đường tròn thứ hai'],
    run((S, p) => S.point('homothety_center', p, { params: { internal: true } })), { icon: 's' }),
  T(M4, 'kosnita', 'Điểm Kosnita', P3, TRI, run((S, p) => S.point('kosnita', p)), { icon: 'Ko' }),
  T(M4, 'nine_point_center', 'Tâm đường tròn Euler', P3, TRI, run((S, p) => S.point('nine_point_center', p, { name: 'N' })), { icon: 'N' }),
  // bổ sung
  T(M4, 'circumcenter', 'Tâm ngoại tiếp', P3, TRI, run((S, p) => S.point('circumcenter', p, { name: 'O' })), { icon: 'O' }),
  T(M4, 'incenter', 'Tâm nội tiếp', P3, TRI, run((S, p) => S.point('incenter', p, { name: 'I' })), { icon: 'I' }),
  T(M4, 'excenter', 'Tâm bàng tiếp', P3, ['Chọn đỉnh A (tâm bàng tiếp góc A)', 'Chọn đỉnh B', 'Chọn đỉnh C'],
    run((S, [A, B, C], ctx) => S.point('excenter', [A, B, C], { name: 'I' + sub(ctx.name(A)) })), { icon: 'J' }),
  T(M4, 'incircle_touch', 'Tiếp điểm đường tròn nội tiếp với BC', P3, ['Chọn đỉnh A (tiếp điểm trên cạnh đối diện)', 'Chọn đỉnh B', 'Chọn đỉnh C'],
    run((S, p) => S.point('incircle_touch', p)), { icon: 'T' }),
  T(M4, 'arc_mid_no', 'Điểm chính giữa cung BC không chứa A', P3, ['Chọn đỉnh A', 'Chọn đỉnh B', 'Chọn đỉnh C'],
    run((S, p) => S.point('arc_midpoint', p, { params: { contains: false } })), { icon: '⌒' }),
  T(M4, 'arc_mid_yes', 'Điểm chính giữa cung BC chứa A', P3, ['Chọn đỉnh A', 'Chọn đỉnh B', 'Chọn đỉnh C'],
    run((S, p) => S.point('arc_midpoint', p, { params: { contains: true } })), { icon: '⌒' }),
  T(M4, 'altitude_foot', 'Chân đường cao', P3, ['Chọn đỉnh A (chân đường cao từ A)', 'Chọn đỉnh B', 'Chọn đỉnh C'],
    run((S, [A, B, C]) => { const D = S.point('altitude_foot', [A, B, C]); S.seg(A, D, { dash: true }); }), { icon: 'h' }),

  // ======================= 5. PHÉP BIẾN HÌNH =======================
  T(M5, 'reflect_point', 'Đối xứng tâm', ['obj', 'point'], ['Chọn đối tượng (điểm, đường, đường tròn)', 'Chọn tâm đối xứng'],
    run((S, p) => S.add('reflect', p)), { icon: '⊙' }),
  T(M5, 'reflect_line', 'Đối xứng trục', ['obj', 'line'], ['Chọn đối tượng (điểm, đường, đường tròn)', 'Chọn trục đối xứng'],
    run((S, p) => S.add('reflect', p)), { icon: '⇋' }),
  T(M5, 'rotate', 'Quay', ['obj', 'point'], ['Chọn đối tượng cần quay', 'Chọn tâm quay (góc quay đặt ở thẻ tuỳ chọn)'],
    run((S, p, ctx) => S.add('rotate', p, { params: { angle: ctx.opt('angle', 90) } })), { icon: '↻', options: [{ key: 'angle', label: 'Góc quay (độ, ngược chiều kim đồng hồ)', def: 90 }] }),
  T(M5, 'homothety', 'Vị tự', ['obj', 'point'], ['Chọn đối tượng', 'Chọn tâm vị tự (tỉ số đặt ở thẻ tuỳ chọn)'],
    run((S, p, ctx) => S.add('homothety', p, { params: { k: ctx.opt('k', 2) } })), { icon: '⤢', options: [{ key: 'k', label: 'Tỉ số vị tự k', def: 2 }] }),
  T(M5, 'translate', 'Tịnh tiến', ['obj', 'point', 'point'], ['Chọn đối tượng', 'Chọn điểm đầu của vectơ', 'Chọn điểm cuối của vectơ'],
    run((S, p) => S.add('translate', p)), { icon: '⇉' }),
  T(M5, 'invert', 'Nghịch đảo', ['obj', 'circle'], ['Chọn đối tượng cần nghịch đảo (điểm, đường thẳng, đường tròn)', 'Chọn đường tròn nghịch đảo'],
    run((S, [X, c], ctx) => {
      const x = ctx.values.get(X), k = ctx.values.get(c);
      if (!x || x.kind === 'point') return S.add('invert', [X, c]);
      // ảnh là đường thẳng khi X đi qua tâm nghịch đảo (ở hình hiện tại), ngược lại là đường tròn
      S.add(k && G.invertToLine(x, k) ? 'invert_line' : 'invert_circle', [X, c]);
    }), { icon: '⊛' }),
  T(M5, 'rotate_by', 'Quay theo góc trên hình', ['obj', 'point', 'point', 'point', 'point'],
    ['Chọn đối tượng cần quay', 'Chọn tâm quay', 'Góc quay = góc ABC trên hình: chọn điểm A', 'Chọn đỉnh góc B', 'Chọn điểm C (quay theo chiều từ BA sang BC)'],
    run((S, p) => S.add('rotate_by', p)), { icon: '↻∠', allowRepeat: true }),
  T(M5, 'homothety_by', 'Vị tự theo tỉ số trên hình', ['obj', 'point', 'point', 'point', 'point', 'point'],
    ['Chọn đối tượng', 'Chọn tâm vị tự', 'Tỉ số = AB/CD trên hình: chọn A', 'Chọn B', 'Chọn C', 'Chọn D'],
    run((S, p, ctx) => S.add('homothety_by', p, ctx.opt('k', 1) < 0 ? { params: { negative: true } } : {})),
    { icon: '⤢÷', allowRepeat: true, options: [{ key: 'k', label: 'Dấu của tỉ số (1: dương, −1: âm)', def: 1 }] }),
  T(M5, 'spiral', 'Đồng dạng tâm O biến A thành B', ['obj', 'point', 'point', 'point'],
    ['Chọn đối tượng', 'Chọn tâm O', 'Chọn điểm A', 'Chọn điểm B (ảnh của A) – quay ∠AOB và vị tự tỉ số OB/OA'],
    run((S, p) => S.add('spiral', p)), { icon: '↻⤢', allowRepeat: true }),
  T(M5, 'projection', 'Chiếu vuông góc lên đường thẳng', ['point', 'line'], ['Chọn điểm và đường thẳng (thứ tự bất kỳ)', 'Chọn nốt đối tượng còn lại'],
    run((S, p) => S.add('projection', p)), { icon: '⊾', anyOrder: true }),

  // ======================= 6. MÔ HÌNH =======================
  T(M6, 'model_excentral', 'Tam giác với tâm nội tiếp, bàng tiếp', P3, TRI,
    run((S, [A, B, C], ctx) => {
      poly(S, [A, B, C]);
      S.circleWithCenter('circumcircle', [A, B, C], 'O');
      S.circleWithCenter('incircle', [A, B, C], 'I');
      for (const [X, Y, Z] of [[A, B, C], [B, C, A], [C, A, B]]) S.circleWithCenter('excircle', [X, Y, Z], 'I' + sub(ctx.name(X)));
    }), { icon: '⦿' }),
  T(M6, 'model_euler', 'Đường thẳng và đường tròn Euler', P3, TRI,
    run((S, [A, B, C]) => {
      poly(S, [A, B, C]);
      S.circleWithCenter('circumcircle', [A, B, C], 'O');
      const O = S.point('circumcenter', [A, B, C], { name: 'O' });
      S.point('centroid', [A, B, C], { name: 'G' });
      const H = S.point('orthocenter', [A, B, C], { name: 'H' });
      S.circleWithCenter('nine_point_circle', [A, B, C], 'N');
      S.add('line', [O, H]);
    }), { icon: 'E' }),
  T(M6, 'model_orthic', 'Tam giác trực tâm (orthic)', P3, TRI,
    run((S, [A, B, C]) => {
      poly(S, [A, B, C]);
      const f = [[A, B, C], [B, C, A], [C, A, B]].map(([X, Y, Z]) => { const D = S.point('foot', [X, Y, Z]); S.seg(X, D, AUX_STYLE); return D; });
      S.point('orthocenter', [A, B, C], { name: 'H' });
      poly(S, f);
    }), { icon: '⊿' }),
  T(M6, 'model_medial', 'Tam giác trung bình', P3, TRI,
    run((S, [A, B, C]) => {
      poly(S, [A, B, C]);
      const m = [[B, C], [C, A], [A, B]].map((pr) => S.point('midpoint', pr));
      poly(S, m);
      S.point('centroid', [A, B, C], { name: 'G' });
    }), { icon: '△' }),
  T(M6, 'model_miquel', 'Điểm Miquel của tam giác', P3, ['Chọn đỉnh A', 'Chọn đỉnh B', 'Chọn đỉnh C (D, E, F dựng trên các cạnh, kéo được)'],
    run((S, [A, B, C]) => {
      const bc = S.seg(B, C), ca = S.seg(C, A), ab = S.seg(A, B);
      const D = S.add('point_on', [bc], { params: { t: 0.4 } });
      const E = S.add('point_on', [ca], { params: { t: 0.35 } });
      const F = S.add('point_on', [ab], { params: { t: 0.55 } });
      const w1 = S.add('circle_3pts', [A, E, F]), w2 = S.add('circle_3pts', [B, F, D]);
      S.add('circle_3pts', [C, D, E]);
      S.add('intersection_other', [w1, w2, F], { name: 'M' });
    }), { icon: 'M' }),
  T(M6, 'model_mixtilinear', 'Đường tròn mixtilinear và tâm nội tiếp', P3, ['Chọn đỉnh A', 'Chọn đỉnh B', 'Chọn đỉnh C'],
    run((S, [A, B, C]) => {
      poly(S, [A, B, C]);
      S.circleWithCenter('circumcircle', [A, B, C], 'O');
      const m = S.add('mixtilinear', [A, B, C]);
      const J = S.point('center', [m]);
      const K = S.point('foot', [J, A, B]), L = S.point('foot', [J, A, C]);
      S.seg(K, L, AUX_STYLE);
      S.point('incenter', [A, B, C], { name: 'I' });
    }), { icon: '◐' }),
];

export const LIBRARY_BY_ID = Object.fromEntries(LIBRARY.map((t) => [t.id, t]));
