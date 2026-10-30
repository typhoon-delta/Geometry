// Trường hợp đặc biệt của một hình (bản 1.8): tam giác cân / vuông / đều, điểm chạy về trung điểm, chân đường cao,
// điểm đối tâm, điểm trong tam giác về trọng tâm / tâm nội tiếp… Mỗi trường hợp là một bộ tham số mới cho các bậc tự do
// (free_point, point_on, point_in) – dùng để "kéo nhanh" trên giao diện và để kiểm tra nhận định có ngoại lệ không.
//
//   specialCases(doc, values?) → [{key, label, about: [id…], patch: {id: params}}]

import { evaluate, kinds, stepById, paramsOf } from '../core/model.js';
import * as G from '../core/geom.js';
import { findTriangles } from './explorer.js';

const nm = (doc, id) => stepById(doc, id)?.name || '?';

export function specialCases(doc, values = evaluate(doc)) {
  const kindOf = kinds(doc);
  const out = [];
  const seen = new Set();
  const add = (key, label, about, patch) => {
    if (seen.has(key) || !Object.keys(patch).length) return;
    for (const p of Object.values(patch)) if (Object.values(p).some((x) => !Number.isFinite(x))) return;
    seen.add(key);
    out.push({ key, label, about, patch });
  };
  const free = (id) => stepById(doc, id)?.type === 'free_point';
  const xy = (P) => ({ x: round(P.x), y: round(P.y) });

  // ---- tam giác ----
  const tris = [...findTriangles(doc, kindOf, { strict: true }), ...findTriangles(doc, kindOf, { drawn: true })];
  for (const t of tris) {
    const V = t.map((id) => values.get(id));
    if (V.some((v) => !v) || Math.abs(G.cross(G.sub(V[1], V[0]), G.sub(V[2], V[0]))) < 1e-12) continue;
    const triName = t.map((id) => nm(doc, id)).join('');
    const tkey = [...t].sort().join(',');
    for (let i = 0; i < 3; i++) {
      const X = t[i], Y = t[(i + 1) % 3], Z = t[(i + 2) % 3];
      const [x, y, z] = [X, Y, Z].map((id) => values.get(id));
      const M = G.mid(y, z), yz = G.dist(y, z);
      const n = G.unit({ x: -(z.y - y.y), y: z.x - y.x });
      const h = G.dot(G.sub(x, M), n); // khoảng cách có dấu từ X tới YZ
      // cân tại X
      if (free(X)) add(`can:${tkey}:${X}`, `tam giác ${triName} cân tại ${nm(doc, X)}`, [X, Y, Z], { [X]: xy(G.add(M, G.mul(n, h))) });
      else if (free(Y)) add(`can:${tkey}:${X}`, `tam giác ${triName} cân tại ${nm(doc, X)}`, [X, Y, Z], { [Y]: xy(G.add(x, G.mul(G.unit(G.sub(y, x)), G.dist(x, z)))) });
      else if (free(Z)) add(`can:${tkey}:${X}`, `tam giác ${triName} cân tại ${nm(doc, X)}`, [X, Y, Z], { [Z]: xy(G.add(x, G.mul(G.unit(G.sub(z, x)), G.dist(x, y)))) });
      // vuông tại X
      if (free(X)) {
        const d = G.dist(x, M);
        if (d > 1e-12) add(`vuong:${tkey}:${X}`, `tam giác ${triName} vuông tại ${nm(doc, X)}`, [X, Y, Z], { [X]: xy(G.add(M, G.mul(G.sub(x, M), yz / 2 / d))) });
      } else if (free(Y)) {
        const u = G.unit({ x: -(z.y - x.y), y: z.x - x.x }); // đường qua X vuông góc XZ
        add(`vuong:${tkey}:${X}`, `tam giác ${triName} vuông tại ${nm(doc, X)}`, [X, Y, Z], { [Y]: xy(G.add(x, G.mul(u, G.dot(G.sub(y, x), u)))) });
      } else if (free(Z)) {
        const u = G.unit({ x: -(y.y - x.y), y: y.x - x.x });
        add(`vuong:${tkey}:${X}`, `tam giác ${triName} vuông tại ${nm(doc, X)}`, [X, Y, Z], { [Z]: xy(G.add(x, G.mul(u, G.dot(G.sub(z, x), u)))) });
      }
      // đều: dời đỉnh tự do đầu tiên
      if (free(X)) add(`deu:${tkey}`, `tam giác ${triName} đều`, [X, Y, Z], { [X]: xy(G.add(M, G.mul(n, Math.sign(h || 1) * yz * Math.sqrt(3) / 2))) });
    }
  }

  // ---- điểm chạy trên đường / đường tròn, điểm trong tam giác ----
  for (const s of doc.steps) {
    const P = values.get(s.id);
    if (!P) continue;
    if (s.type === 'point_on') {
      const host = values.get(s.args[0]);
      const hs = stepById(doc, s.args[0]);
      if (!host) continue;
      const tOf = (Q) => round(G.paramOf(host, Q));
      if (host.kind === 'line' && ['segment', 'line', 'ray'].includes(hs.type)) {
        const [E, F] = hs.args;
        const e = values.get(E), f = values.get(F);
        add(`trung-diem:${s.id}`, `${nm(doc, s.id)} là trung điểm ${nm(doc, E)}${nm(doc, F)}`, [s.id, E, F], { [s.id]: { t: tOf(G.mid(e, f)) } });
        // chân đường cao từ đỉnh thứ ba của tam giác có cạnh EF
        for (const t of tris) {
          if (!t.includes(E) || !t.includes(F)) continue;
          const R = t.find((id) => id !== E && id !== F);
          const foot = proj(values.get(R), host);
          add(`chan-cao:${s.id}:${R}`, `${nm(doc, s.id)} là chân đường cao từ ${nm(doc, R)}`, [s.id, R], { [s.id]: { t: tOf(foot) } });
          // chân phân giác: chia EF theo tỉ số RE : RF
          const re = G.dist(values.get(R), e), rf = G.dist(values.get(R), f);
          add(`chan-pg:${s.id}:${R}`, `${nm(doc, s.id)} là chân phân giác từ ${nm(doc, R)}`, [s.id, R], { [s.id]: { t: tOf(G.add(e, G.mul(G.sub(f, e), re / (re + rf)))) } });
        }
      } else if (host.kind === 'circle') {
        // đối xứng với một điểm khác trên đường tròn qua tâm; trùng một điểm khác (thường là suy biến)
        for (const o of doc.steps) {
          const Q = values.get(o.id);
          if (o.id === s.id || kindOf.get(o.id) !== 'point' || !Q || Math.abs(G.dist(Q, host.c) - host.r) > 1e-9 * (1 + host.r)) continue;
          add(`doi-tam:${s.id}:${o.id}`, `${nm(doc, s.id)} đối xứng với ${nm(doc, o.id)} qua tâm`, [s.id, o.id], { [s.id]: { t: tOf(G.sub(G.mul(host.c, 2), Q)) } });
        }
      }
    } else if (s.type === 'point_in') {
      const [A, B, C] = s.args.map((id) => values.get(id));
      if (!A || !B || !C) continue;
      const a = G.dist(B, C), b = G.dist(C, A), c = G.dist(A, B);
      const N = nm(doc, s.id);
      const bary = (wa, wb, wc) => { const sm = wa + wb + wc; return { u: round(wb / sm), v: round(wc / sm) }; };
      add(`trong-tam:${s.id}`, `${N} là trọng tâm`, [s.id, ...s.args], { [s.id]: bary(1, 1, 1) });
      add(`noi-tiep:${s.id}`, `${N} là tâm nội tiếp`, [s.id, ...s.args], { [s.id]: bary(a, b, c) });
      const cosA = (b * b + c * c - a * a) / (2 * b * c), cosB = (a * a + c * c - b * b) / (2 * a * c), cosC = (a * a + b * b - c * c) / (2 * a * b);
      if (cosA > 1e-6 && cosB > 1e-6 && cosC > 1e-6) {
        // tam giác nhọn: trực tâm, tâm ngoại tiếp nằm trong
        const tan = (x) => Math.sqrt(1 - x * x) / x;
        add(`truc-tam:${s.id}`, `${N} là trực tâm`, [s.id, ...s.args], { [s.id]: bary(tan(cosA), tan(cosB), tan(cosC)) });
        add(`ngoai-tiep:${s.id}`, `${N} là tâm ngoại tiếp`, [s.id, ...s.args], { [s.id]: bary(a * a * (b * b + c * c - a * a), b * b * (c * c + a * a - b * b), c * c * (a * a + b * b - c * c)) });
      }
    }
  }
  return out;
}

/** Áp một trường hợp đặc biệt: Map id → params (dùng làm overrides cho evaluate). */
export function caseOverrides(doc, sc) {
  return new Map(Object.entries(sc.patch).map(([id, p]) => [id, { ...paramsOf(stepById(doc, id)), ...p }]));
}

function proj(P, l) {
  const u = G.unit(l.d);
  return G.add(l.p, G.mul(u, G.dot(G.sub(P, l.p), u)));
}

const round = (v) => Math.round(v * 1e9) / 1e9;
