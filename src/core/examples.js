// Các hình mẫu (dùng trong menu "Ví dụ" và trong test tự động).

import { Builder } from './builder.js';

const triangle = (b) => {
  const A = b.point(-0.6, 3.4, 'A'), B = b.point(-3.4, -1.6, 'B'), C = b.point(3.6, -1.6, 'C');
  b.add('segment', [A, B]); b.add('segment', [B, C]); b.add('segment', [C, A]);
  return [A, B, C];
};

export const EXAMPLES = {
  euler_line: {
    title: 'Đường thẳng Euler',
    build() {
      const b = new Builder();
      const [A, B, C] = triangle(b);
      b.add('circumcircle', [A, B, C]);
      b.add('circumcenter', [A, B, C], {}, 'O');
      b.add('centroid', [A, B, C], {}, 'G');
      b.add('orthocenter', [A, B, C], {}, 'H');
      return b.doc;
    },
  },
  nine_point: {
    title: 'Đường tròn Euler (9 điểm)',
    build() {
      const b = new Builder();
      const [A, B, C] = triangle(b);
      const H = b.add('orthocenter', [A, B, C], {}, 'H');
      const D = b.add('altitude_foot', [A, B, C], {}, 'D');
      const E = b.add('altitude_foot', [B, C, A], {}, 'E');
      const F = b.add('altitude_foot', [C, A, B], {}, 'F');
      b.add('segment', [A, D], {}, undefined, { style: { dash: true } });
      b.add('segment', [B, E], {}, undefined, { style: { dash: true } });
      b.add('segment', [C, F], {}, undefined, { style: { dash: true } });
      const M1 = b.add('midpoint', [B, C], {}, 'M');
      const M2 = b.add('midpoint', [C, A], {}, 'K');
      const M3 = b.add('midpoint', [A, B], {}, 'L');
      b.add('midpoint', [A, H], {}, 'X');
      b.add('midpoint', [B, H], {}, 'Y');
      b.add('midpoint', [C, H], {}, 'Z');
      b.add('circle_3pts', [M1, M2, M3], {}, 'ω', { style: { color: '#7e22ce' } });
      return b.doc;
    },
  },
  simson: {
    title: 'Đường thẳng Simson',
    build() {
      const b = new Builder();
      const A = b.point(-0.6, 3.4, 'A'), B = b.point(-3.4, -1.6, 'B'), C = b.point(3.6, -1.6, 'C');
      const a = b.add('line', [B, C]), bb = b.add('line', [C, A]), c = b.add('line', [A, B]);
      const w = b.add('circumcircle', [A, B, C]);
      const P = b.add('point_on', [w], { t: 2.2 }, 'P');
      b.add('projection', [P, a], {}, 'D');
      b.add('projection', [P, bb], {}, 'E');
      b.add('projection', [P, c], {}, 'F');
      return b.doc;
    },
  },
  miquel: {
    title: 'Định lý Miquel',
    build() {
      const b = new Builder();
      const [A, B, C] = triangle(b);
      const sAB = b.doc.steps[3].id, sBC = b.doc.steps[4].id, sCA = b.doc.steps[5].id;
      const D = b.add('point_on', [sBC], { t: 0.4 }, 'D');
      const E = b.add('point_on', [sCA], { t: 0.35 }, 'E');
      const F = b.add('point_on', [sAB], { t: 0.55 }, 'F');
      const w1 = b.add('circle_3pts', [A, E, F]);
      const w2 = b.add('circle_3pts', [B, F, D]);
      b.add('circle_3pts', [C, D, E]);
      b.add('intersection_other', [w1, w2, F], {}, 'M');
      return b.doc;
    },
  },
  dense: {
    title: 'Hình dày (mô phỏng đề VMO, dùng đo hiệu năng)',
    build() {
      // ~30 điểm, ~40 đường, 5–6 đường tròn: tam giác, 3 tâm bàng tiếp, 3 đường tròn bàng tiếp,
      // đường tròn ngoại tiếp và nhiều đoạn nối – gần với một hình đề thi thực tế.
      const b = new Builder();
      const A = b.point(0.6, 3.6, 'A'), B = b.point(-1.4, -0.6, 'B'), C = b.point(2.4, -0.6, 'C');
      const BC = b.add('line', [B, C]);
      b.add('segment', [A, B]); b.add('segment', [A, C]);
      const eA = b.add('angle_bisector', [B, A, C], { external: true }, undefined, { hidden: true });
      const eB = b.add('angle_bisector', [A, B, C], { external: true }, undefined, { hidden: true });
      const eC = b.add('angle_bisector', [A, C, B], { external: true }, undefined, { hidden: true });
      const IA = b.add('intersection', [eB, eC], {}, 'I_A');
      const IB = b.add('intersection', [eA, eC], {}, 'I_B');
      const IC = b.add('intersection', [eA, eB], {}, 'I_C');
      const TA = b.add('projection', [IA, BC], {}, 'T');
      const Q = b.add('projection', [IB, BC], {}, 'Q');
      const P = b.add('projection', [IC, BC], {}, 'P');
      b.add('circle', [IA, TA]); b.add('circle', [IB, Q]); b.add('circle', [IC, P]);
      const w = b.add('circumcircle', [A, B, C]);
      const I = b.add('incenter', [A, B, C], {}, 'I', { hidden: true });
      for (const [X, Y] of [[IC, IB], [IC, B], [IC, C], [IB, B], [IB, C], [IA, B], [IA, C], [A, IA], [IC, P], [IB, Q]]) b.add('segment', [X, Y]);
      const lBIB = b.add('line', [B, IB], {}, undefined, { hidden: true });
      const lCIC = b.add('line', [C, IC], {}, undefined, { hidden: true });
      const U = b.add('intersection_other', [lBIB, w, B], {}, 'U');
      const V = b.add('intersection_other', [lCIC, w, C], {}, 'V');
      const XA = b.add('midpoint', [I, IA], {}, 'X_A');
      const XB = b.add('midpoint', [I, IB], {}, 'X_B');
      const XC = b.add('midpoint', [I, IC], {}, 'X_C');
      const sUV = b.add('segment', [U, V]);
      const PA = b.add('projection', [A, sUV], {}, 'P_A');
      const PB = b.add('midpoint', [B, U], {}, 'P_B');
      const PC = b.add('midpoint', [C, V], {}, 'P_C');
      const Bp = b.add('reflect', [B, lCIC], {}, "B'");
      const Cp = b.add('reflect', [C, lBIB], {}, "C'");
      for (const [X, Y] of [[A, U], [A, V], [IC, U], [IB, V], [V, IB], [U, IC], [A, XA], [B, XB], [C, XC], [PB, PC], [PA, XA], [XB, XC],
        [B, Bp], [C, Cp], [Cp, IA], [Bp, IA], [C, Cp], [B, PC], [C, PB], [V, XB], [U, XC], [IA, U], [IA, V], [PB, XA], [PC, XA]]) b.add('segment', [X, Y]);
      const sAB = b.doc.steps[4].id, sAC = b.doc.steps[5].id;
      const tp = [];
      for (const X of [IA, IB, IC]) for (const l of [sAB, sAC]) tp.push(b.add('projection', [X, l]));
      const mids = [[B, C], [C, A], [A, B]].map(([X, Y]) => b.add('midpoint', [X, Y]));
      b.add('segment', [tp[0], tp[1]]); b.add('segment', [mids[0], mids[1]]); b.add('segment', [mids[1], mids[2]]);
      b.add('nine_point_circle', [IA, IB, IC], {}, undefined, { hidden: true });
      b.add('circle_3pts', [U, V, I]);
      return b.doc;
    },
  },
};
