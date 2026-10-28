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
};
