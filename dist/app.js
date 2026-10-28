(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/core/geom.js
  var geom_exports = {};
  __export(geom_exports, {
    EPS: () => EPS,
    add: () => add,
    angleBisector: () => angleBisector,
    arcMidpoint: () => arcMidpoint,
    centroid: () => centroid,
    circle: () => circle,
    circleThrough: () => circleThrough,
    circumcenter: () => circumcenter,
    cross: () => cross,
    dist: () => dist,
    distPointLine: () => distPointLine,
    distToObject: () => distToObject,
    dot: () => dot,
    finite: () => finite,
    incenter: () => incenter,
    inradius: () => inradius,
    intersect: () => intersect,
    intersectCC: () => intersectCC,
    intersectLC: () => intersectLC,
    intersectLL: () => intersectLL,
    line: () => line,
    lineParam: () => lineParam,
    lineThrough: () => lineThrough,
    mid: () => mid,
    mul: () => mul,
    ninePointCenter: () => ninePointCenter,
    norm: () => norm,
    orthocenter: () => orthocenter,
    paramOf: () => paramOf,
    perp: () => perp,
    pointOn: () => pointOn,
    project: () => project,
    pt: () => pt,
    reflectObject: () => reflectObject,
    reflectPointOverLine: () => reflectPointOverLine,
    reflectPointOverPoint: () => reflectPointOverPoint,
    sub: () => sub,
    triangleOK: () => triangleOK,
    unit: () => unit
  });
  var EPS = 1e-12;
  var pt = (x, y) => ({ kind: "point", x, y });
  var add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
  var sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
  var mul = (a, k) => ({ x: a.x * k, y: a.y * k });
  var dot = (a, b) => a.x * b.x + a.y * b.y;
  var cross = (a, b) => a.x * b.y - a.y * b.x;
  var norm = (a) => Math.hypot(a.x, a.y);
  var dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  var perp = (a) => ({ x: -a.y, y: a.x });
  var unit = (a) => {
    const n = norm(a);
    return n < EPS ? null : { x: a.x / n, y: a.y / n };
  };
  var mid = (a, b) => pt((a.x + b.x) / 2, (a.y + b.y) / 2);
  var finite = (...xs) => xs.every((v) => Number.isFinite(v));
  function line(p, d, subtype = "line") {
    if (!p || !d || norm(d) < EPS || !finite(p.x, p.y, d.x, d.y)) return null;
    return { kind: "line", p: { x: p.x, y: p.y }, d: { x: d.x, y: d.y }, sub: subtype };
  }
  function circle(c, r) {
    if (!c || !finite(c.x, c.y, r) || r < EPS) return null;
    return { kind: "circle", c: { x: c.x, y: c.y }, r };
  }
  var lineThrough = (a, b, subtype = "line") => line(a, sub(b, a), subtype);
  function project(P2, l) {
    const t = dot(sub(P2, l.p), l.d) / dot(l.d, l.d);
    return pt(l.p.x + t * l.d.x, l.p.y + t * l.d.y);
  }
  var lineParam = (P2, l) => dot(sub(P2, l.p), l.d) / dot(l.d, l.d);
  var distPointLine = (P2, l) => Math.abs(cross(l.d, sub(P2, l.p))) / norm(l.d);
  function reflectPointOverPoint(P2, C) {
    return pt(2 * C.x - P2.x, 2 * C.y - P2.y);
  }
  function reflectPointOverLine(P2, l) {
    const F = project(P2, l);
    return pt(2 * F.x - P2.x, 2 * F.y - P2.y);
  }
  function intersectLL(l1, l2) {
    const den = cross(l1.d, l2.d);
    const scale = norm(l1.d) * norm(l2.d);
    if (Math.abs(den) < 1e-14 * scale) return null;
    const t = cross(sub(l2.p, l1.p), l2.d) / den;
    return pt(l1.p.x + t * l1.d.x, l1.p.y + t * l1.d.y);
  }
  function intersectLC(l, c) {
    const dd = dot(l.d, l.d);
    const f = sub(l.p, c.c);
    const b = dot(f, l.d);
    const cc = dot(f, f) - c.r * c.r;
    let disc = b * b - dd * cc;
    const tol = 1e-12 * Math.max(b * b, dd * c.r * c.r);
    if (disc < -tol) return [];
    if (disc < 0) disc = 0;
    const s = Math.sqrt(disc);
    const t1 = (-b - s) / dd;
    const t2 = (-b + s) / dd;
    return [pt(l.p.x + t1 * l.d.x, l.p.y + t1 * l.d.y), pt(l.p.x + t2 * l.d.x, l.p.y + t2 * l.d.y)];
  }
  function intersectCC(c1, c2) {
    const D = sub(c2.c, c1.c);
    const d = norm(D);
    if (d < EPS) return [];
    const a = (d * d + c1.r * c1.r - c2.r * c2.r) / (2 * d);
    let h2 = c1.r * c1.r - a * a;
    const tol = 1e-12 * c1.r * c1.r;
    if (h2 < -tol) return [];
    if (h2 < 0) h2 = 0;
    const h = Math.sqrt(h2);
    const u = { x: D.x / d, y: D.y / d };
    const M = { x: c1.c.x + a * u.x, y: c1.c.y + a * u.y };
    const n = perp(u);
    return [pt(M.x - h * n.x, M.y - h * n.y), pt(M.x + h * n.x, M.y + h * n.y)];
  }
  function intersect(o1, o2) {
    if (!o1 || !o2) return [];
    if (o1.kind === "line" && o2.kind === "line") {
      const P2 = intersectLL(o1, o2);
      return P2 ? [P2] : [];
    }
    if (o1.kind === "line" && o2.kind === "circle") return intersectLC(o1, o2);
    if (o1.kind === "circle" && o2.kind === "line") return intersectLC(o2, o1);
    if (o1.kind === "circle" && o2.kind === "circle") return intersectCC(o1, o2);
    return [];
  }
  function circleThrough(A, B, C) {
    const d = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));
    const s = Math.max(dist(A, B), dist(B, C), dist(C, A));
    if (Math.abs(d) < 1e-12 * s * s) return null;
    const a2 = A.x * A.x + A.y * A.y;
    const b2 = B.x * B.x + B.y * B.y;
    const c2 = C.x * C.x + C.y * C.y;
    const ux = (a2 * (B.y - C.y) + b2 * (C.y - A.y) + c2 * (A.y - B.y)) / d;
    const uy = (a2 * (C.x - B.x) + b2 * (A.x - C.x) + c2 * (B.x - A.x)) / d;
    const O = pt(ux, uy);
    return circle(O, dist(O, A));
  }
  function triangleOK(A, B, C) {
    const s = Math.max(dist(A, B), dist(B, C), dist(C, A));
    return s > EPS && Math.abs(cross(sub(B, A), sub(C, A))) > 1e-12 * s * s;
  }
  function circumcenter(A, B, C) {
    const c = circleThrough(A, B, C);
    return c ? pt(c.c.x, c.c.y) : null;
  }
  function centroid(A, B, C) {
    if (!triangleOK(A, B, C)) return null;
    return pt((A.x + B.x + C.x) / 3, (A.y + B.y + C.y) / 3);
  }
  function orthocenter(A, B, C) {
    const O = circumcenter(A, B, C);
    if (!O) return null;
    return pt(A.x + B.x + C.x - 2 * O.x, A.y + B.y + C.y - 2 * O.y);
  }
  function incenter(A, B, C) {
    if (!triangleOK(A, B, C)) return null;
    const a = dist(B, C), b = dist(C, A), c = dist(A, B);
    const s = a + b + c;
    return pt((a * A.x + b * B.x + c * C.x) / s, (a * A.y + b * B.y + c * C.y) / s);
  }
  function inradius(A, B, C) {
    const I = incenter(A, B, C);
    if (!I) return null;
    return distPointLine(I, lineThrough(B, C));
  }
  function ninePointCenter(A, B, C) {
    const O = circumcenter(A, B, C);
    const H = orthocenter(A, B, C);
    if (!O || !H) return null;
    return mid(O, H);
  }
  function angleBisector(A, B, C, external = false) {
    const u = unit(sub(A, B));
    const v = unit(sub(C, B));
    if (!u || !v) return null;
    let d = external ? sub(u, v) : add(u, v);
    if (norm(d) < 1e-9) d = perp(u);
    const s = (dist(A, B) + dist(C, B)) / 2;
    return line(B, mul(unit(d), s));
  }
  function arcMidpoint(A, B, C, containsA) {
    const circ = circleThrough(A, B, C);
    if (!circ) return null;
    const M = mid(B, C);
    const n = unit(perp(sub(C, B)));
    if (!n) return null;
    const side = dot(sub(A, M), n);
    if (Math.abs(side) < EPS) return null;
    const sgn = side > 0 === containsA ? 1 : -1;
    return pt(circ.c.x + sgn * circ.r * n.x, circ.c.y + sgn * circ.r * n.y);
  }
  function pointOn(obj, t) {
    if (!obj) return null;
    if (obj.kind === "line") {
      let s = t;
      if (obj.sub === "segment") s = Math.min(1, Math.max(0, t));
      else if (obj.sub === "ray") s = Math.max(0, t);
      return pt(obj.p.x + s * obj.d.x, obj.p.y + s * obj.d.y);
    }
    if (obj.kind === "circle") return pt(obj.c.x + obj.r * Math.cos(t), obj.c.y + obj.r * Math.sin(t));
    return null;
  }
  function paramOf(obj, P2) {
    if (obj.kind === "line") {
      let t = lineParam(P2, obj);
      if (obj.sub === "segment") t = Math.min(1, Math.max(0, t));
      else if (obj.sub === "ray") t = Math.max(0, t);
      return t;
    }
    if (obj.kind === "circle") return Math.atan2(P2.y - obj.c.y, P2.x - obj.c.x);
    return 0;
  }
  function distToObject(obj, P2) {
    if (!obj) return Infinity;
    if (obj.kind === "point") return dist(obj, P2);
    if (obj.kind === "circle") return Math.abs(dist(obj.c, P2) - obj.r);
    if (obj.kind === "line") return dist(pointOn(obj, paramOf(obj, P2)), P2);
    return Infinity;
  }
  function reflectObject(X, M) {
    if (!X || !M) return null;
    const f = M.kind === "point" ? (P2) => reflectPointOverPoint(P2, M) : (P2) => reflectPointOverLine(P2, M);
    if (X.kind === "point") return f(X);
    if (X.kind === "line") {
      const a = f(X.p);
      const b = f(add(X.p, X.d));
      return line(a, sub(b, a), X.sub);
    }
    if (X.kind === "circle") return circle(f(X.c), X.r);
    return null;
  }

  // src/core/steps.js
  var tri = (f) => ([A, B, C]) => triangleOK(A, B, C) ? f(A, B, C) : null;
  var P = (o) => o ? pt(o.x, o.y) : null;
  var STEP_TYPES = {
    // ---------- ĐIỂM ----------
    free_point: {
      kind: "point",
      args: [],
      params: { x: 0, y: 0 },
      label: "\u0110i\u1EC3m t\u1EF1 do",
      compute: (_, p) => pt(p.x, p.y)
    },
    point_on: {
      kind: "point",
      args: ["curve"],
      params: { t: 0 },
      label: "\u0110i\u1EC3m tr\xEAn \u0111\u1ED1i t\u01B0\u1EE3ng",
      compute: ([c], p) => pointOn(c, p.t),
      facts: (s) => [{ on: [s.id, s.args[0]] }]
    },
    intersection: {
      // which = 0|1 chọn nghiệm theo thứ tự chuẩn (xem geom.intersectLC / intersectCC) – liên tục khi kéo.
      kind: "point",
      args: ["curve", "curve"],
      params: { which: 0 },
      label: "Giao \u0111i\u1EC3m",
      compute: ([a, b], p) => intersect(a, b)[p.which] || null,
      facts: (s) => [{ on: [s.id, s.args[0]] }, { on: [s.id, s.args[1]] }]
    },
    intersection_other: {
      // Giao điểm thứ hai của hai đường (khác điểm Q đã có, Q thường là một giao điểm đã biết).
      kind: "point",
      args: ["curve", "curve", "point"],
      label: "Giao \u0111i\u1EC3m th\u1EE9 hai",
      compute: ([a, b, Q]) => {
        const r = intersect(a, b);
        if (r.length === 0) return null;
        if (r.length === 1) return r[0];
        return dist(r[0], Q) >= dist(r[1], Q) ? r[0] : r[1];
      },
      facts: (s) => [{ on: [s.id, s.args[0]] }, { on: [s.id, s.args[1]] }]
    },
    midpoint: {
      kind: "point",
      args: ["point", "point"],
      label: "Trung \u0111i\u1EC3m",
      compute: ([A, B]) => mid(A, B),
      facts: (s) => [{ col: [s.args[0], s.id, s.args[1]] }, { on: [s.id, { PB: s.args }] }]
    },
    projection: {
      kind: "point",
      args: ["point", "line"],
      label: "H\xECnh chi\u1EBFu",
      compute: ([Q, l]) => project(Q, l),
      facts: (s) => [{ on: [s.id, s.args[1]] }, { perp: [{ L: [s.args[0], s.id] }, s.args[1]] }]
    },
    reflect: {
      kind: "same",
      args: ["obj", "pl"],
      label: "\u0110\u1ED1i x\u1EE9ng",
      compute: ([X, M]) => reflectObject(X, M),
      facts: (s, kinds2) => {
        if (kinds2[0] !== "point") return [];
        if (kinds2[1] === "point") return [{ col: [s.args[0], s.args[1], s.id] }];
        return [{ perp: [{ L: [s.args[0], s.id] }, s.args[1]] }];
      }
    },
    circumcenter: {
      kind: "point",
      args: ["point", "point", "point"],
      label: "T\xE2m ngo\u1EA1i ti\u1EBFp",
      tag: "O",
      compute: tri(circumcenter),
      facts: (s) => {
        const [A, B, C] = s.args;
        return [{ on: [s.id, { PB: [A, B] }] }, { on: [s.id, { PB: [B, C] }] }, { on: [s.id, { PB: [C, A] }] }];
      }
    },
    orthocenter: {
      kind: "point",
      args: ["point", "point", "point"],
      label: "Tr\u1EF1c t\xE2m",
      tag: "H",
      compute: tri(orthocenter),
      facts: (s) => {
        const [A, B, C] = s.args;
        return [
          { perp: [{ L: [A, s.id] }, { L: [B, C] }] },
          { perp: [{ L: [B, s.id] }, { L: [C, A] }] },
          { perp: [{ L: [C, s.id] }, { L: [A, B] }] }
        ];
      }
    },
    incenter: {
      kind: "point",
      args: ["point", "point", "point"],
      label: "T\xE2m n\u1ED9i ti\u1EBFp",
      tag: "I",
      compute: tri(incenter),
      facts: (s) => {
        const [A, B, C] = s.args;
        return [
          { on: [s.id, { AB: [B, A, C] }] },
          { on: [s.id, { AB: [A, B, C] }] },
          { on: [s.id, { AB: [A, C, B] }] }
        ];
      }
    },
    centroid: {
      kind: "point",
      args: ["point", "point", "point"],
      label: "Tr\u1ECDng t\xE2m",
      tag: "G",
      compute: tri(centroid)
    },
    nine_point_center: {
      kind: "point",
      args: ["point", "point", "point"],
      label: "T\xE2m \u0111\u01B0\u1EDDng tr\xF2n Euler",
      tag: "N",
      compute: tri(ninePointCenter)
    },
    altitude_foot: {
      // Chân đường cao hạ từ đỉnh thứ nhất (A) xuống cạnh đối diện BC.
      kind: "point",
      args: ["point", "point", "point"],
      label: "Ch\xE2n \u0111\u01B0\u1EDDng cao",
      compute: tri((A, B, C) => project(A, lineThrough(B, C))),
      facts: (s) => {
        const [A, B, C] = s.args;
        return [{ col: [B, s.id, C] }, { perp: [{ L: [A, s.id] }, { L: [B, C] }] }];
      }
    },
    incircle_touch: {
      // Tiếp điểm của đường tròn nội tiếp với cạnh BC (đối diện đỉnh thứ nhất A).
      kind: "point",
      args: ["point", "point", "point"],
      label: "Ti\u1EBFp \u0111i\u1EC3m \u0111\u01B0\u1EDDng tr\xF2n n\u1ED9i ti\u1EBFp",
      compute: tri((A, B, C) => project(incenter(A, B, C), lineThrough(B, C))),
      facts: (s) => {
        const [A, B, C] = s.args;
        return [{ col: [B, s.id, C] }, { on: [s.id, { IC: [A, B, C] }] }];
      }
    },
    arc_midpoint: {
      // Điểm chính giữa cung BC của (ABC); contains = true: cung chứa A, false: cung không chứa A.
      kind: "point",
      args: ["point", "point", "point"],
      params: { contains: false },
      label: "\u0110i\u1EC3m ch\xEDnh gi\u1EEFa cung",
      compute: ([A, B, C], p) => triangleOK(A, B, C) ? arcMidpoint(A, B, C, !!p.contains) : null,
      facts: (s) => {
        const [A, B, C] = s.args;
        return [{ on: [s.id, { C: [A, B, C] }] }, { on: [s.id, { PB: [B, C] }] }];
      }
    },
    // ---------- ĐƯỜNG THẲNG ----------
    line: {
      kind: "line",
      args: ["point", "point"],
      label: "\u0110\u01B0\u1EDDng th\u1EB3ng",
      compute: ([A, B]) => lineThrough(A, B, "line"),
      facts: (s) => [{ on: [s.args[0], s.id] }, { on: [s.args[1], s.id] }]
    },
    segment: {
      kind: "line",
      args: ["point", "point"],
      label: "\u0110o\u1EA1n th\u1EB3ng",
      compute: ([A, B]) => lineThrough(A, B, "segment"),
      facts: (s) => [{ on: [s.args[0], s.id] }, { on: [s.args[1], s.id] }]
    },
    ray: {
      kind: "line",
      args: ["point", "point"],
      label: "Tia",
      compute: ([A, B]) => lineThrough(A, B, "ray"),
      facts: (s) => [{ on: [s.args[0], s.id] }, { on: [s.args[1], s.id] }]
    },
    perpendicular: {
      kind: "line",
      args: ["point", "line"],
      label: "\u0110\u01B0\u1EDDng vu\xF4ng g\xF3c",
      compute: ([Q, l]) => line(Q, perp(l.d)),
      facts: (s) => [{ on: [s.args[0], s.id] }, { perp: [s.id, s.args[1]] }]
    },
    parallel: {
      kind: "line",
      args: ["point", "line"],
      label: "\u0110\u01B0\u1EDDng song song",
      compute: ([Q, l]) => line(Q, l.d),
      facts: (s) => [{ on: [s.args[0], s.id] }, { par: [s.id, s.args[1]] }]
    },
    perp_bisector: {
      kind: "line",
      args: ["point", "point"],
      label: "\u0110\u01B0\u1EDDng trung tr\u1EF1c",
      compute: ([A, B]) => dist(A, B) < EPS ? null : line(mid(A, B), perp(sub(B, A))),
      facts: (s) => [{ perp: [s.id, { L: s.args }] }]
    },
    angle_bisector: {
      // Phân giác góc ABC (đỉnh B = đối số thứ hai). external = true: phân giác ngoài.
      kind: "line",
      args: ["point", "point", "point"],
      params: { external: false },
      label: "\u0110\u01B0\u1EDDng ph\xE2n gi\xE1c",
      compute: ([A, B, C], p) => angleBisector(A, B, C, !!p.external),
      facts: (s) => [{ on: [s.args[1], s.id] }]
    },
    // ---------- ĐƯỜNG TRÒN ----------
    circle: {
      kind: "circle",
      args: ["point", "point"],
      label: "\u0110\u01B0\u1EDDng tr\xF2n (t\xE2m, \u0111i\u1EC3m)",
      compute: ([O, A]) => circle(O, dist(O, A)),
      facts: (s) => [{ on: [s.args[1], s.id] }]
    },
    circle_radius: {
      // Đường tròn tâm O, bán kính bằng độ dài AB (compa).
      kind: "circle",
      args: ["point", "point", "point"],
      label: "\u0110\u01B0\u1EDDng tr\xF2n (t\xE2m, b\xE1n k\xEDnh)",
      compute: ([O, A, B]) => circle(O, dist(A, B))
    },
    circle_3pts: {
      kind: "circle",
      args: ["point", "point", "point"],
      label: "\u0110\u01B0\u1EDDng tr\xF2n qua 3 \u0111i\u1EC3m",
      compute: ([A, B, C]) => circleThrough(A, B, C),
      facts: (s) => s.args.map((a) => ({ on: [a, s.id] }))
    },
    circumcircle: {
      kind: "circle",
      args: ["point", "point", "point"],
      label: "\u0110\u01B0\u1EDDng tr\xF2n ngo\u1EA1i ti\u1EBFp",
      tag: "circumcircle",
      compute: ([A, B, C]) => circleThrough(A, B, C),
      facts: (s) => s.args.map((a) => ({ on: [a, s.id] }))
    },
    incircle: {
      kind: "circle",
      args: ["point", "point", "point"],
      label: "\u0110\u01B0\u1EDDng tr\xF2n n\u1ED9i ti\u1EBFp",
      tag: "incircle",
      compute: tri((A, B, C) => circle(incenter(A, B, C), inradius(A, B, C))),
      facts: (s) => {
        const [A, B, C] = s.args;
        return [{ tan: [s.id, { L: [B, C] }] }, { tan: [s.id, { L: [C, A] }] }, { tan: [s.id, { L: [A, B] }] }];
      }
    },
    nine_point_circle: {
      kind: "circle",
      args: ["point", "point", "point"],
      label: "\u0110\u01B0\u1EDDng tr\xF2n Euler",
      tag: "ninepoint",
      compute: tri((A, B, C) => circleThrough(mid(A, B), mid(B, C), mid(C, A)))
    },
    // ---------- ĐÁNH DẤU (không tham gia khám phá) ----------
    polygon: {
      kind: "mark",
      args: ["...point"],
      label: "Mi\u1EC1n \u0111a gi\xE1c",
      compute: (pts) => ({ kind: "polygon", pts: pts.map(P) })
    },
    angle_mark: {
      // Cung đánh dấu góc ABC (đỉnh B). style.arcs = số cung (1..3); góc vuông vẽ ô vuông.
      kind: "mark",
      args: ["point", "point", "point"],
      label: "\u0110\xE1nh d\u1EA5u g\xF3c",
      compute: ([A, B, C]) => ({ kind: "angle", A: P(A), B: P(B), C: P(C) })
    },
    segment_mark: {
      // Vạch đánh dấu đoạn AB. style.ticks = số vạch (1..3).
      kind: "mark",
      args: ["point", "point"],
      label: "\u0110\xE1nh d\u1EA5u \u0111o\u1EA1n",
      compute: ([A, B]) => dist(A, B) < EPS ? null : { kind: "segmark", A: P(A), B: P(B) }
    }
  };
  function argAccepts(argType, kind) {
    switch (argType) {
      case "point":
        return kind === "point";
      case "line":
        return kind === "line";
      case "circle":
        return kind === "circle";
      case "curve":
        return kind === "line" || kind === "circle";
      case "obj":
        return kind === "point" || kind === "line" || kind === "circle";
      case "pl":
        return kind === "point" || kind === "line";
      case "...point":
        return kind === "point";
      default:
        return false;
    }
  }
  var FREE_PARAM_TYPES = /* @__PURE__ */ new Set(["free_point", "point_on"]);

  // src/core/model.js
  var FORMAT = "hinh-hoc-dong";
  var VERSION = 1;
  function emptyDoc() {
    return { format: FORMAT, version: VERSION, title: "", steps: [] };
  }
  var stepById = (doc, id) => doc.steps.find((s) => s.id === id);
  function indexOf(doc) {
    const m = /* @__PURE__ */ new Map();
    doc.steps.forEach((s, i) => m.set(s.id, i));
    return m;
  }
  function kinds(doc) {
    const k = /* @__PURE__ */ new Map();
    for (const s of doc.steps) {
      const def = STEP_TYPES[s.type];
      if (!def) {
        k.set(s.id, null);
        continue;
      }
      k.set(s.id, def.kind === "same" ? k.get(s.args[0]) || null : def.kind);
    }
    return k;
  }
  var paramsOf = (step) => ({ ...STEP_TYPES[step.type]?.params || {}, ...step.params || {} });
  function evaluate(doc, overrides = null) {
    const vals = /* @__PURE__ */ new Map();
    for (const s of doc.steps) {
      const def = STEP_TYPES[s.type];
      let v = null;
      if (def) {
        const argVals = s.args.map((a) => vals.get(a));
        const ok = argVals.every((a, i) => {
          if (!a) return false;
          const t = def.args[0] === "...point" ? "...point" : def.args[i];
          return argAccepts(t, a.kind);
        });
        if (ok) {
          const p = overrides && overrides.has(s.id) ? { ...paramsOf(s), ...overrides.get(s.id) } : paramsOf(s);
          try {
            v = def.compute(argVals, p) || null;
          } catch {
            v = null;
          }
          if (v && def.kind !== "mark" && !valueFinite(v)) v = null;
        }
      }
      vals.set(s.id, v);
    }
    return vals;
  }
  function valueFinite(v) {
    if (v.kind === "point") return Number.isFinite(v.x) && Number.isFinite(v.y);
    if (v.kind === "line") return [v.p.x, v.p.y, v.d.x, v.d.y].every(Number.isFinite);
    if (v.kind === "circle") return [v.c.x, v.c.y, v.r].every(Number.isFinite);
    return true;
  }
  function dependents(doc, ids) {
    const set = new Set(ids);
    const out = /* @__PURE__ */ new Set();
    for (const s of doc.steps) {
      if (s.args.some((a) => set.has(a) || out.has(a))) out.add(s.id);
    }
    return out;
  }
  function removeSteps(doc, ids) {
    const dep = dependents(doc, ids);
    const all = /* @__PURE__ */ new Set([...ids, ...dep]);
    return { doc: { ...doc, steps: doc.steps.filter((s) => !all.has(s.id)) }, removed: [...all] };
  }
  function newId(doc) {
    let max = 0;
    for (const s of doc.steps) {
      const m = /^s(\d+)$/.exec(s.id);
      if (m) max = Math.max(max, +m[1]);
    }
    return "s" + (max + 1);
  }
  var POINT_LETTERS = "ABCDEFKLMPQRSTUVXYZJW".split("");
  function nextName(doc, kind, preferred) {
    const used = new Set(doc.steps.map((s) => s.name).filter(Boolean));
    const tryName = (n) => !used.has(n) ? n : null;
    if (preferred) {
      if (tryName(preferred)) return preferred;
      for (let i = 1; ; i++) if (tryName(preferred + i)) return preferred + i;
    }
    if (kind === "point") {
      for (const L of POINT_LETTERS) if (tryName(L)) return L;
      for (let i = 1; ; i++) for (const L of POINT_LETTERS) if (tryName(L + i)) return L + i;
    }
    const base = kind === "line" ? "d" : kind === "circle" ? "\u03C9" : "m";
    for (let i = 1; ; i++) if (tryName(base + i)) return base + i;
  }
  function validate(doc) {
    const errs = [];
    if (!doc || typeof doc !== "object") return ["Kh\xF4ng ph\u1EA3i \u0111\u1ED1i t\u01B0\u1EE3ng JSON"];
    if (doc.format !== FORMAT) errs.push(`Thi\u1EBFu "format": "${FORMAT}"`);
    if (!Array.isArray(doc.steps)) return [...errs, 'Thi\u1EBFu danh s\xE1ch "steps"'];
    const seen = /* @__PURE__ */ new Set();
    const k = /* @__PURE__ */ new Map();
    for (const [i, s] of doc.steps.entries()) {
      const where = `B\u01B0\u1EDBc ${i + 1} (${s && s.id})`;
      if (!s || typeof s.id !== "string") {
        errs.push(`${where}: thi\u1EBFu id`);
        continue;
      }
      if (seen.has(s.id)) errs.push(`${where}: id tr\xF9ng`);
      const def = STEP_TYPES[s.type];
      if (!def) {
        errs.push(`${where}: lo\u1EA1i b\u01B0\u1EDBc kh\xF4ng r\xF5 "${s.type}"`);
        seen.add(s.id);
        continue;
      }
      if (!Array.isArray(s.args)) {
        errs.push(`${where}: thi\u1EBFu args`);
        seen.add(s.id);
        continue;
      }
      const variadic = def.args[0] === "...point";
      if (variadic ? s.args.length < 3 : s.args.length !== def.args.length)
        errs.push(`${where}: s\u1ED1 \u0111\u1ED1i s\u1ED1 sai`);
      s.args.forEach((a, j) => {
        if (!seen.has(a)) errs.push(`${where}: tham chi\u1EBFu "${a}" ch\u01B0a \u0111\u01B0\u1EE3c d\u1EF1ng \u1EDF b\u01B0\u1EDBc tr\u01B0\u1EDBc`);
        else {
          const t = variadic ? "...point" : def.args[j];
          if (t && !argAccepts(t, k.get(a))) errs.push(`${where}: \u0111\u1ED1i s\u1ED1 "${a}" sai lo\u1EA1i`);
        }
      });
      k.set(s.id, def.kind === "same" ? k.get(s.args[0]) : def.kind);
      seen.add(s.id);
    }
    return errs;
  }
  var clone = (doc) => JSON.parse(JSON.stringify(doc));
  function frames(doc) {
    const out = [];
    let pendingHidden = [];
    for (const s of doc.steps) {
      if (s.hidden) {
        pendingHidden.push(s.id);
        continue;
      }
      if (s.joinPrev && out.length) out[out.length - 1].push(...pendingHidden, s.id);
      else out.push([...pendingHidden, s.id]);
      pendingHidden = [];
    }
    if (pendingHidden.length) {
      if (out.length) out[out.length - 1].push(...pendingHidden);
      else out.push(pendingHidden);
    }
    return out;
  }
  function describe(doc, id) {
    const s = stepById(doc, id);
    if (!s) return id;
    const n = (a) => stepById(doc, a)?.name || a;
    const names = s.args.map(n).join("");
    switch (s.type) {
      case "line":
      case "segment":
      case "ray":
        return names;
      case "circle_3pts":
      case "circumcircle":
        return `(${names})`;
      case "circle":
        return `(${n(s.args[0])}, ${n(s.args[0])}${n(s.args[1])})`;
      case "incircle":
        return `\u0111\u01B0\u1EDDng tr\xF2n n\u1ED9i ti\u1EBFp ${names}`;
      case "nine_point_circle":
        return `\u0111\u01B0\u1EDDng tr\xF2n Euler ${names}`;
      default:
        return s.name || id;
    }
  }

  // src/ui/styles.js
  var PALETTE = [
    { name: "\u0110en", hex: "#111827" },
    { name: "Xanh d\u01B0\u01A1ng", hex: "#1d4ed8" },
    { name: "\u0110\u1ECF", hex: "#dc2626" },
    { name: "Xanh l\xE1", hex: "#15803d" },
    { name: "Cam", hex: "#ea580c" },
    { name: "T\xEDm", hex: "#7e22ce" },
    { name: "Xanh ng\u1ECDc", hex: "#0e7490" },
    { name: "X\xE1m", hex: "#6b7280" }
  ];
  var DEFAULT_BY_TYPE = {
    free_point: { color: "#111827", fillColor: "#dc2626" },
    point_on: { color: "#111827", fillColor: "#ea580c" },
    circumcircle: { color: "#1d4ed8" },
    incircle: { color: "#15803d" },
    nine_point_circle: { color: "#7e22ce" },
    polygon: { color: "#1d4ed8", fill: 0.12 },
    angle_mark: { color: "#dc2626", arcs: 1 },
    segment_mark: { color: "#dc2626", ticks: 1 }
  };
  var DEFAULT_BY_KIND = {
    point: { color: "#111827", size: 3, showLabel: true, labelOffset: [8, 10] },
    line: { color: "#111827", width: 1.6, dash: false, showLabel: false },
    circle: { color: "#111827", width: 1.6, dash: false, fill: 0, showLabel: false },
    mark: { color: "#dc2626", width: 1.6 }
  };
  function styleOf(step, kind) {
    return { ...DEFAULT_BY_KIND[kind || "mark"], ...DEFAULT_BY_TYPE[step.type] || {}, ...step.style || {} };
  }
  var isDraggableType = (type) => type === "free_point" || type === "point_on";

  // src/ui/render.js
  var HALO = "#60a5fa";
  var RELATION = "#f59e0b";
  function labelHTML(name) {
    if (!name) return "";
    const esc3 = name.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const m = /^(.*?)(\d+)('*)$/.exec(esc3);
    return m && m[1] ? `${m[1]}<sub>${m[2]}</sub>${m[3]}` : esc3;
  }
  var Renderer = class {
    constructor(board) {
      this.board = board;
      this.values = /* @__PURE__ */ new Map();
      this.els = /* @__PURE__ */ new Map();
      this.extra = [];
      this.scale = 1;
    }
    val(id) {
      return this.values.get(id);
    }
    clear() {
      for (const arr of this.els.values()) for (const e of arr.slice().reverse()) this.board.removeObject(e);
      this.els.clear();
    }
    /**
     * Dựng lại toàn bộ phần tử.
     * opts.visible: Set id được phép hiện (chế độ trình bày) hoặc null = tất cả
     * opts.selected: Set id đang chọn; opts.highlight: Set id tô sáng (kết quả khám phá)
     */
    rebuild(doc, values, opts = {}) {
      const b = this.board;
      b.suspendUpdate();
      this.clear();
      this.values = values;
      this.doc = doc;
      const k = kinds(doc);
      const visible = opts.visible || null;
      const selected = opts.selected || /* @__PURE__ */ new Set();
      const highlight = opts.highlight || /* @__PURE__ */ new Set();
      const order = { polygon: 0, circle: 1, line: 2, mark: 3, point: 4 };
      const steps = doc.steps.filter((s) => !s.hidden && (!visible || visible.has(s.id))).map((s) => ({ s, kind: k.get(s.id) })).sort((a, b2) => (order[a.s.type === "polygon" ? "polygon" : a.kind] ?? 3) - (order[b2.s.type === "polygon" ? "polygon" : b2.kind] ?? 3));
      for (const { s, kind } of steps) {
        const st = styleOf(s, kind);
        const sel = selected.has(s.id);
        const hl = highlight.has(s.id);
        try {
          const arr = this.create(s, kind, st, sel, hl);
          this.els.set(s.id, arr);
        } catch (e) {
          console.warn("Kh\xF4ng v\u1EBD \u0111\u01B0\u1EE3c", s, e);
        }
      }
      b.unsuspendUpdate();
      this.refreshVisibility();
    }
    /** Cập nhật toạ độ sau khi kéo (không dựng lại phần tử). */
    update(values) {
      this.values = values;
      this.refreshVisibility();
      this.board.update();
    }
    refreshVisibility() {
      for (const [id, arr] of this.els) {
        const ok = !!this.values.get(id);
        for (const e of arr) {
          if (e._hideAlways) continue;
          if (e.visProp.visible !== ok) e.setAttribute({ visible: ok });
        }
      }
    }
    // ---------- tạo phần tử ----------
    fx(fn) {
      return () => {
        const v = fn();
        return v == null || !Number.isFinite(v) ? NaN : v;
      };
    }
    helperPoint(fx, fy) {
      const p = this.board.create("point", [fx, fy], { visible: false, fixed: true, withLabel: false, name: "" });
      p._hideAlways = true;
      return p;
    }
    create(s, kind, st, sel, hl) {
      const id = s.id;
      const b = this.board;
      const sc = this.scale;
      const color = hl ? RELATION : st.color;
      const width = (st.width || 1.6) * sc * (hl ? 1.8 : 1);
      const common = { fixed: true, highlight: false, withLabel: false, name: "" };
      const out = [];
      const V = () => this.values.get(id);
      if (kind === "point") {
        const size = (st.size || 3) * sc * (hl ? 1.4 : 1);
        if (sel) {
          out.push(b.create("point", [this.fx(() => V()?.x), this.fx(() => V()?.y)], {
            ...common,
            size: size + 6 * sc,
            strokeColor: HALO,
            fillColor: HALO,
            fillOpacity: 0.35,
            strokeOpacity: 0.6
          }));
        }
        const p = b.create("point", [this.fx(() => V()?.x), this.fx(() => V()?.y)], {
          ...common,
          name: st.showLabel ? labelHTML(s.name) : "",
          withLabel: !!st.showLabel,
          size,
          face: "o",
          strokeColor: hl ? RELATION : st.color,
          strokeWidth: 1 * sc,
          fillColor: hl ? RELATION : st.fillColor || st.color,
          label: {
            offset: (st.labelOffset || [8, 10]).map((v) => v * sc),
            fontSize: Math.round(16 * sc),
            strokeColor: hl ? "#b45309" : st.labelColor || "#111827",
            cssClass: "pt-label",
            highlightCssClass: "pt-label",
            highlight: false
          }
        });
        p._stepId = id;
        out.push(p);
        return out;
      }
      if (kind === "line") {
        const p1 = this.helperPoint(this.fx(() => V()?.p.x), this.fx(() => V()?.p.y));
        const p2 = this.helperPoint(this.fx(() => V() && V().p.x + V().d.x), this.fx(() => V() && V().p.y + V().d.y));
        out.push(p1, p2);
        const subt = s.type === "segment" ? "segment" : s.type === "ray" ? "ray" : null;
        const sub2 = subt || this.values.get(id)?.sub || "line";
        const attrs = {
          ...common,
          straightFirst: sub2 === "line",
          straightLast: sub2 !== "segment",
          strokeColor: color,
          strokeWidth: width,
          dash: st.dash ? 2 : 0,
          withLabel: !!st.showLabel,
          name: st.showLabel ? labelHTML(s.name) : "",
          label: { fontSize: Math.round(15 * sc), strokeColor: color }
        };
        if (sel) out.push(b.create("line", [p1, p2], { ...attrs, strokeColor: HALO, strokeWidth: width + 7 * sc, strokeOpacity: 0.45, dash: 0, withLabel: false, name: "" }));
        out.push(b.create("line", [p1, p2], attrs));
        return out;
      }
      if (kind === "circle") {
        const c = this.helperPoint(this.fx(() => V()?.c.x), this.fx(() => V()?.c.y));
        out.push(c);
        const r = () => V()?.r ?? NaN;
        const attrs = {
          ...common,
          strokeColor: color,
          strokeWidth: width,
          dash: st.dash ? 2 : 0,
          fillColor: st.fillColor || st.color,
          fillOpacity: st.fill || 0,
          withLabel: !!st.showLabel,
          name: st.showLabel ? labelHTML(s.name) : "",
          label: { fontSize: Math.round(15 * sc), strokeColor: color }
        };
        if (sel) out.push(b.create("circle", [c, r], { ...attrs, strokeColor: HALO, strokeWidth: width + 7 * sc, strokeOpacity: 0.45, fillOpacity: 0, dash: 0, withLabel: false, name: "" }));
        out.push(b.create("circle", [c, r], attrs));
        return out;
      }
      if (s.type === "polygon") {
        const pts = s.args.map((_, i) => this.helperPoint(this.fx(() => V()?.pts[i].x), this.fx(() => V()?.pts[i].y)));
        out.push(...pts);
        const poly = b.create("polygon", pts, {
          ...common,
          fillColor: st.fillColor || color,
          fillOpacity: sel ? Math.min(1, (st.fill ?? 0.12) + 0.15) : st.fill ?? 0.12,
          borders: { visible: !!st.border, strokeColor: color, strokeWidth: width, highlight: false, fixed: true },
          vertices: { visible: false },
          hasInnerPoints: false
        });
        out.push(poly);
        return out;
      }
      if (s.type === "angle_mark" || s.type === "segment_mark") {
        const curve = b.create("curve", [[0], [0]], {
          ...common,
          strokeColor: sel ? HALO : color,
          strokeWidth: width * (sel ? 1.8 : 1)
        });
        const self = this;
        curve.updateDataArray = function() {
          const v = V();
          const pathOut = v ? s.type === "angle_mark" ? angleMarkPath(v, st, self.pxToUser(), sc) : segMarkPath(v, st, self.pxToUser(), sc) : [[], []];
          this.dataX = pathOut[0];
          this.dataY = pathOut[1];
        };
        out.push(curve);
        return out;
      }
      return out;
    }
    /** Số đơn vị người dùng ứng với 1 pixel. */
    pxToUser() {
      return 1 / this.board.unitX;
    }
    // ---------- phần tử tạm ----------
    clearExtra() {
      for (const e of this.extra.slice().reverse()) this.board.removeObject(e);
      this.extra = [];
    }
    addExtra(type, parents, attrs) {
      const e = this.board.create(type, parents, { fixed: true, highlight: false, withLabel: false, name: "", ...attrs });
      this.extra.push(e);
      return e;
    }
  };
  function angleMarkPath(v, st, px, sc = 1) {
    const { A, B, C } = v;
    const a1 = Math.atan2(A.y - B.y, A.x - B.x);
    let a2 = Math.atan2(C.y - B.y, C.x - B.x);
    let diff = a2 - a1;
    while (diff <= -Math.PI) diff += 2 * Math.PI;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    const X = [], Y = [];
    const r0 = 18 * sc * px * (st.radius || 1);
    const right = Math.abs(Math.abs(diff) - Math.PI / 2) < 1e-6 && st.right !== false;
    if (right) {
      const r = r0 * 0.75;
      const u = { x: Math.cos(a1), y: Math.sin(a1) }, w = { x: Math.cos(a1 + diff), y: Math.sin(a1 + diff) };
      X.push(B.x + r * u.x, B.x + r * (u.x + w.x), B.x + r * w.x);
      Y.push(B.y + r * u.y, B.y + r * (u.y + w.y), B.y + r * w.y);
      return [X, Y];
    }
    const n = Math.max(1, Math.min(4, st.arcs || 1));
    for (let k = 0; k < n; k++) {
      const r = r0 + k * 4 * sc * px;
      const N = 24;
      for (let i = 0; i <= N; i++) {
        const t = a1 + diff * i / N;
        X.push(B.x + r * Math.cos(t));
        Y.push(B.y + r * Math.sin(t));
      }
      X.push(NaN);
      Y.push(NaN);
    }
    return [X, Y];
  }
  function segMarkPath(v, st, px, sc = 1) {
    const { A, B } = v;
    const L = Math.hypot(B.x - A.x, B.y - A.y);
    const u = { x: (B.x - A.x) / L, y: (B.y - A.y) / L };
    const n = { x: -u.y, y: u.x };
    const M = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
    const k = Math.max(1, Math.min(4, st.ticks || 1));
    const h = 6 * sc * px, gap = 4 * sc * px;
    const X = [], Y = [];
    for (let i = 0; i < k; i++) {
      const off = (i - (k - 1) / 2) * gap;
      const c = { x: M.x + off * u.x, y: M.y + off * u.y };
      X.push(c.x - h * n.x, c.x + h * n.x, NaN);
      Y.push(c.y - h * n.y, c.y + h * n.y, NaN);
    }
    return [X, Y];
  }

  // src/ui/tools.js
  var T = (id, label, group, icon, inputs, hints, make, extra = {}) => ({ id, label, group, icon, inputs, hints, make, ...extra });
  var one = (type, params, name) => (picks) => [{ type, args: picks, params, name }];
  var TRI = ["Ch\u1ECDn \u0111\u1EC9nh th\u1EE9 nh\u1EA5t", "Ch\u1ECDn \u0111\u1EC9nh th\u1EE9 hai", "Ch\u1ECDn \u0111\u1EC9nh th\u1EE9 ba"];
  var VTX = ["Ch\u1ECDn \u0111\u1EC9nh A (\u0111\u1EC9nh \u0111\u1ED1i di\u1EC7n c\u1EA1nh c\u1EA7n x\xE9t)", "Ch\u1ECDn \u0111\u1EC9nh B", "Ch\u1ECDn \u0111\u1EC9nh C"];
  var TOOLS = [
    T("move", "Ch\u1ECDn / k\xE9o", "C\u01A1 b\u1EA3n", "\u2196", [], ["K\xE9o \u0111i\u1EC3m t\u1EF1 do (\u0111\u1ECF) ho\u1EB7c \u0111i\u1EC3m tr\xEAn \u0111\u1ED1i t\u01B0\u1EE3ng (cam). K\xE9o n\u1EC1n \u0111\u1EC3 d\u1EDDi h\xECnh; l\u0103n chu\u1ED9t \u0111\u1EC3 ph\xF3ng to/thu nh\u1ECF. K\xE9o nh\xE3n \u0111\u1EC3 d\u1EDDi nh\xE3n."], null),
    T("point", "\u0110i\u1EC3m", "C\u01A1 b\u1EA3n", "\u2022", ["point"], ["B\u1EA5m v\xE0o ch\u1ED7 tr\u1ED1ng: \u0111i\u1EC3m t\u1EF1 do \xB7 b\u1EA5m l\xEAn \u0111\u01B0\u1EDDng/\u0111\u01B0\u1EDDng tr\xF2n: \u0111i\u1EC3m tr\xEAn \u0111\u1ED1i t\u01B0\u1EE3ng \xB7 b\u1EA5m g\u1EA7n ch\u1ED7 c\u1EAFt nhau: giao \u0111i\u1EC3m"], () => []),
    T("intersect", "Giao \u0111i\u1EC3m", "C\u01A1 b\u1EA3n", "\u2715", ["curve", "curve"], ["Ch\u1ECDn \u0111\u01B0\u1EDDng th\u1EE9 nh\u1EA5t (ho\u1EB7c b\u1EA5m ngay ch\u1ED7 hai \u0111\u01B0\u1EDDng c\u1EAFt nhau)", "Ch\u1ECDn \u0111\u01B0\u1EDDng th\u1EE9 hai"], null),
    T("midpoint", "Trung \u0111i\u1EC3m", "C\u01A1 b\u1EA3n", "\u25E6", ["point", "point"], ["Ch\u1ECDn \u0111i\u1EC3m th\u1EE9 nh\u1EA5t (ho\u1EB7c b\u1EA5m v\xE0o m\u1ED9t \u0111o\u1EA1n th\u1EB3ng)", "Ch\u1ECDn \u0111i\u1EC3m th\u1EE9 hai"], one("midpoint"), { segmentShortcut: true }),
    T("segment", "\u0110o\u1EA1n th\u1EB3ng", "\u0110\u01B0\u1EDDng", "\u2014", ["point", "point"], ["Ch\u1ECDn \u0111i\u1EC3m \u0111\u1EA7u", "Ch\u1ECDn \u0111i\u1EC3m cu\u1ED1i"], one("segment"), { preview: "segment" }),
    T("line", "\u0110\u01B0\u1EDDng th\u1EB3ng", "\u0110\u01B0\u1EDDng", "\u27F7", ["point", "point"], ["Ch\u1ECDn \u0111i\u1EC3m th\u1EE9 nh\u1EA5t", "Ch\u1ECDn \u0111i\u1EC3m th\u1EE9 hai"], one("line"), { preview: "line" }),
    T("ray", "Tia", "\u0110\u01B0\u1EDDng", "\u2192", ["point", "point"], ["Ch\u1ECDn g\u1ED1c tia", "Ch\u1ECDn \u0111i\u1EC3m thu\u1ED9c tia"], one("ray"), { preview: "ray" }),
    T("perpendicular", "\u0110\u01B0\u1EDDng vu\xF4ng g\xF3c", "\u0110\u01B0\u1EDDng", "\u22A5", ["point", "line"], ["Ch\u1ECDn \u0111i\u1EC3m v\xE0 \u0111\u01B0\u1EDDng th\u1EB3ng (th\u1EE9 t\u1EF1 b\u1EA5t k\u1EF3)", "Ch\u1ECDn n\u1ED1t \u0111\u1ED1i t\u01B0\u1EE3ng c\xF2n l\u1EA1i"], one("perpendicular"), { anyOrder: true }),
    T("parallel", "\u0110\u01B0\u1EDDng song song", "\u0110\u01B0\u1EDDng", "\u2225", ["point", "line"], ["Ch\u1ECDn \u0111i\u1EC3m v\xE0 \u0111\u01B0\u1EDDng th\u1EB3ng (th\u1EE9 t\u1EF1 b\u1EA5t k\u1EF3)", "Ch\u1ECDn n\u1ED1t \u0111\u1ED1i t\u01B0\u1EE3ng c\xF2n l\u1EA1i"], one("parallel"), { anyOrder: true }),
    T("perp_bisector", "Trung tr\u1EF1c", "\u0110\u01B0\u1EDDng", "\u22A5\u0332", ["point", "point"], ["Ch\u1ECDn \u0111i\u1EC3m th\u1EE9 nh\u1EA5t (ho\u1EB7c b\u1EA5m v\xE0o m\u1ED9t \u0111o\u1EA1n th\u1EB3ng)", "Ch\u1ECDn \u0111i\u1EC3m th\u1EE9 hai"], one("perp_bisector"), { segmentShortcut: true }),
    T("angle_bisector", "Ph\xE2n gi\xE1c trong", "\u0110\u01B0\u1EDDng", "\u2220", ["point", "point", "point"], ["Ch\u1ECDn \u0111i\u1EC3m tr\xEAn c\u1EA1nh th\u1EE9 nh\u1EA5t", "Ch\u1ECDn \u0110\u1EC8NH g\xF3c", "Ch\u1ECDn \u0111i\u1EC3m tr\xEAn c\u1EA1nh th\u1EE9 hai"], one("angle_bisector")),
    T("ext_bisector", "Ph\xE2n gi\xE1c ngo\xE0i", "\u0110\u01B0\u1EDDng", "\u2220\u2091", ["point", "point", "point"], ["Ch\u1ECDn \u0111i\u1EC3m tr\xEAn c\u1EA1nh th\u1EE9 nh\u1EA5t", "Ch\u1ECDn \u0110\u1EC8NH g\xF3c", "Ch\u1ECDn \u0111i\u1EC3m tr\xEAn c\u1EA1nh th\u1EE9 hai"], one("angle_bisector", { external: true })),
    T("circle", "T\xE2m + \u0111i\u1EC3m", "\u0110\u01B0\u1EDDng tr\xF2n", "\u25EF", ["point", "point"], ["Ch\u1ECDn t\xE2m", "Ch\u1ECDn m\u1ED9t \u0111i\u1EC3m tr\xEAn \u0111\u01B0\u1EDDng tr\xF2n"], one("circle"), { preview: "circle" }),
    T("circle_3pts", "Qua 3 \u0111i\u1EC3m", "\u0110\u01B0\u1EDDng tr\xF2n", "\u2299", ["point", "point", "point"], TRI, one("circle_3pts")),
    T("circle_radius", "Compa (t\xE2m, b\xE1n k\xEDnh AB)", "\u0110\u01B0\u1EDDng tr\xF2n", "\u2300", ["point", "point", "point"], ["Ch\u1ECDn t\xE2m", "Ch\u1ECDn \u0111\u1EA7u m\xFAt th\u1EE9 nh\u1EA5t c\u1EE7a b\xE1n k\xEDnh", "Ch\u1ECDn \u0111\u1EA7u m\xFAt th\u1EE9 hai"], one("circle_radius")),
    T("reflect", "\u0110\u1ED1i x\u1EE9ng", "Bi\u1EBFn h\xECnh", "\u21CB", ["obj", "pl"], ["Ch\u1ECDn \u0111\u1ED1i t\u01B0\u1EE3ng c\u1EA7n l\u1EA5y \u0111\u1ED1i x\u1EE9ng (\u0111i\u1EC3m, \u0111\u01B0\u1EDDng, \u0111\u01B0\u1EDDng tr\xF2n)", "Ch\u1ECDn t\xE2m \u0111\u1ED1i x\u1EE9ng (\u0111i\u1EC3m) ho\u1EB7c tr\u1EE5c \u0111\u1ED1i x\u1EE9ng (\u0111\u01B0\u1EDDng th\u1EB3ng)"], one("reflect")),
    T("projection", "H\xECnh chi\u1EBFu", "Bi\u1EBFn h\xECnh", "\u22BE", ["point", "line"], ["Ch\u1ECDn \u0111i\u1EC3m v\xE0 \u0111\u01B0\u1EDDng th\u1EB3ng (th\u1EE9 t\u1EF1 b\u1EA5t k\u1EF3)", "Ch\u1ECDn n\u1ED1t \u0111\u1ED1i t\u01B0\u1EE3ng c\xF2n l\u1EA1i"], (p) => [{ type: "projection", args: p }], { anyOrder: true }),
    T("triangle", "Tam gi\xE1c", "Tam gi\xE1c", "\u25B3", ["point", "point", "point"], TRI, ([A, B, C]) => [
      { type: "segment", args: [A, B] },
      { type: "segment", args: [B, C] },
      { type: "segment", args: [C, A] }
    ], { preview: "polygon" }),
    T("circumcenter", "T\xE2m ngo\u1EA1i ti\u1EBFp O", "Tam gi\xE1c", "O", ["point", "point", "point"], TRI, one("circumcenter", void 0, "O")),
    T("circumcircle", "\u0110\u01B0\u1EDDng tr\xF2n ngo\u1EA1i ti\u1EBFp", "Tam gi\xE1c", "(O)", ["point", "point", "point"], TRI, one("circumcircle")),
    T("orthocenter", "Tr\u1EF1c t\xE2m H", "Tam gi\xE1c", "H", ["point", "point", "point"], TRI, one("orthocenter", void 0, "H")),
    T("incenter", "T\xE2m n\u1ED9i ti\u1EBFp I", "Tam gi\xE1c", "I", ["point", "point", "point"], TRI, one("incenter", void 0, "I")),
    T("incircle", "\u0110\u01B0\u1EDDng tr\xF2n n\u1ED9i ti\u1EBFp", "Tam gi\xE1c", "(I)", ["point", "point", "point"], TRI, one("incircle")),
    T("centroid", "Tr\u1ECDng t\xE2m G", "Tam gi\xE1c", "G", ["point", "point", "point"], TRI, one("centroid", void 0, "G")),
    T("nine_point_center", "T\xE2m Euler N", "Tam gi\xE1c", "N", ["point", "point", "point"], TRI, one("nine_point_center", void 0, "N")),
    T("nine_point_circle", "\u0110\u01B0\u1EDDng tr\xF2n Euler", "Tam gi\xE1c", "(N)", ["point", "point", "point"], TRI, one("nine_point_circle")),
    T("altitude_foot", "Ch\xE2n \u0111\u01B0\u1EDDng cao", "Tam gi\xE1c", "h", ["point", "point", "point"], VTX, ([A, B, C]) => [
      { type: "altitude_foot", args: [A, B, C] },
      { type: "segment", args: [A, "$0"], style: { dash: true } }
    ]),
    T("incircle_touch", "Ti\u1EBFp \u0111i\u1EC3m n\u1ED9i ti\u1EBFp", "Tam gi\xE1c", "T", ["point", "point", "point"], VTX, one("incircle_touch")),
    T("arc_mid_no", "\u0110i\u1EC3m gi\u1EEFa cung BC kh\xF4ng ch\u1EE9a A", "Tam gi\xE1c", "\u2312", ["point", "point", "point"], VTX, one("arc_midpoint", { contains: false })),
    T("arc_mid_yes", "\u0110i\u1EC3m gi\u1EEFa cung BC ch\u1EE9a A", "Tam gi\xE1c", "\u2312A", ["point", "point", "point"], VTX, one("arc_midpoint", { contains: true })),
    T("angle_mark", "\u0110\xE1nh d\u1EA5u g\xF3c", "\u0110\xE1nh d\u1EA5u", "\u2221", ["point", "point", "point"], ["Ch\u1ECDn \u0111i\u1EC3m tr\xEAn c\u1EA1nh th\u1EE9 nh\u1EA5t", "Ch\u1ECDn \u0110\u1EC8NH g\xF3c", "Ch\u1ECDn \u0111i\u1EC3m tr\xEAn c\u1EA1nh th\u1EE9 hai"], (p, app) => [{ type: "angle_mark", args: p, style: { ...app.markStyle("angle") } }]),
    T("segment_mark", "\u0110\xE1nh d\u1EA5u \u0111o\u1EA1n", "\u0110\xE1nh d\u1EA5u", "\u2AFD", ["point", "point"], ["Ch\u1ECDn \u0111\u1EA7u m\xFAt th\u1EE9 nh\u1EA5t (ho\u1EB7c b\u1EA5m v\xE0o m\u1ED9t \u0111o\u1EA1n th\u1EB3ng)", "Ch\u1ECDn \u0111\u1EA7u m\xFAt th\u1EE9 hai"], (p, app) => [{ type: "segment_mark", args: p, style: { ...app.markStyle("segment") } }], { segmentShortcut: true }),
    T("polygon", "T\xF4 mi\u1EC1n \u0111a gi\xE1c", "\u0110\xE1nh d\u1EA5u", "\u25B1", ["...point"], ["Ch\u1ECDn l\u1EA7n l\u01B0\u1EE3t c\xE1c \u0111\u1EC9nh; b\u1EA5m l\u1EA1i \u0111\u1EC9nh \u0111\u1EA7u (ho\u1EB7c Enter) \u0111\u1EC3 k\u1EBFt th\xFAc"], (p, app) => [{ type: "polygon", args: p, style: { ...app.markStyle("polygon") } }], { preview: "polygon" })
  ];
  var TOOL_BY_ID = Object.fromEntries(TOOLS.map((t) => [t.id, t]));

  // src/ui/dialog.js
  function modal(build) {
    return new Promise((resolve) => {
      const back = document.createElement("div");
      back.className = "modal-back";
      const box = document.createElement("div");
      box.className = "modal";
      back.appendChild(box);
      const close = (v) => {
        back.remove();
        document.removeEventListener("keydown", onKey, true);
        resolve(v);
      };
      const onKey = (e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          close(null);
        }
      };
      document.addEventListener("keydown", onKey, true);
      build(box, close);
      document.body.appendChild(back);
      const f = box.querySelector("input, textarea, button.primary");
      if (f) f.focus();
    });
  }
  var esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  function confirmDialog(title, message, okLabel = "\u0110\u1ED3ng \xFD") {
    return modal((box, close) => {
      box.innerHTML = `<h3>${esc(title)}</h3><div class="modal-body">${message}</div>
      <div class="modal-actions"><button class="cancel">Hu\u1EF7</button><button class="primary">${esc(okLabel)}</button></div>`;
      box.querySelector(".cancel").onclick = () => close(false);
      box.querySelector(".primary").onclick = () => close(true);
    }).then((v) => !!v);
  }
  function promptDialog(title, value = "", hint = "") {
    return modal((box, close) => {
      box.innerHTML = `<h3>${esc(title)}</h3>${hint ? `<div class="modal-body">${esc(hint)}</div>` : ""}
      <input type="text" class="modal-input" value="${esc(value)}">
      <div class="modal-actions"><button class="cancel">Hu\u1EF7</button><button class="primary">OK</button></div>`;
      const inp = box.querySelector("input");
      inp.select();
      inp.onkeydown = (e) => {
        if (e.key === "Enter") close(inp.value);
      };
      box.querySelector(".cancel").onclick = () => close(null);
      box.querySelector(".primary").onclick = () => close(inp.value);
    });
  }
  function textDialog(title, text, extraHTML = "") {
    return modal((box, close) => {
      box.classList.add("wide");
      box.innerHTML = `<h3>${esc(title)}</h3>${extraHTML}<textarea class="modal-text" readonly spellcheck="false"></textarea>
      <div class="modal-actions"><span class="copied"></span><button class="copy">Sao ch\xE9p</button><button class="primary">\u0110\xF3ng</button></div>`;
      const ta = box.querySelector("textarea");
      ta.value = text;
      box.querySelector(".copy").onclick = async () => {
        ta.select();
        let ok = false;
        try {
          await navigator.clipboard.writeText(text);
          ok = true;
        } catch {
          try {
            ok = document.execCommand("copy");
          } catch {
            ok = false;
          }
        }
        box.querySelector(".copied").textContent = ok ? "\u0110\xE3 sao ch\xE9p \u2713" : "H\xE3y b\u1EA5m Ctrl+C \u0111\u1EC3 sao ch\xE9p";
      };
      box.querySelector(".primary").onclick = () => close(true);
    });
  }
  var toastTimer = null;
  function toast(msg, ms = 2600) {
    let t = document.getElementById("toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), ms);
  }

  // src/ui/panels.js
  var esc2 = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  function stepTitle(doc, s, values = null) {
    const def = STEP_TYPES[s.type];
    const n = (a) => stepById(doc, a)?.name || "?";
    let label = def ? def.label : s.type;
    const p = paramsOf(s);
    if (s.type === "arc_midpoint") label += p.contains ? " (ch\u1EE9a \u0111\u1EC9nh)" : " (kh\xF4ng ch\u1EE9a \u0111\u1EC9nh)";
    if (s.type === "angle_bisector" && p.external) label = "Ph\xE2n gi\xE1c ngo\xE0i";
    if (s.type === "intersection" && values && intersectCount(values, s) === 2) label += ` (nghi\u1EC7m ${p.which + 1})`;
    if (s.type === "free_point" || !s.args.length) return label;
    let args = s.args.map(n);
    if (s.type === "intersection_other") return `${label} c\u1EE7a ${args[0]}, ${args[1]} (kh\xE1c ${args[2]})`;
    if (s.type === "angle_mark") return `${label} ${args.join("")}`;
    return `${label} (${args.join(", ")})`;
  }
  function intersectCount(values, s) {
    return intersect(values.get(s.args[0]), values.get(s.args[1])).length;
  }
  function renderStepList(app) {
    const host = document.getElementById("steps");
    if (!host) return;
    const doc = app.doc;
    const fr = frames(doc);
    const frameOf = /* @__PURE__ */ new Map();
    fr.forEach((ids, i) => ids.forEach((id) => frameOf.set(id, i)));
    const k = kinds(doc);
    const present = app.mode === "present";
    if (!doc.steps.length) {
      host.innerHTML = '<div class="empty">Ch\u01B0a c\xF3 b\u01B0\u1EDBc d\u1EF1ng n\xE0o.<br>Ch\u1ECDn c\xF4ng c\u1EE5 b\xEAn tr\xE1i r\u1ED3i b\u1EA5m l\xEAn b\u1EA3ng v\u1EBD.<br><br>Ho\u1EB7c m\u1EDF <b>V\xED d\u1EE5</b> \u1EDF thanh tr\xEAn.</div>';
      return;
    }
    let lastFrame = -1;
    const rows = doc.steps.map((s, i) => {
      const f = frameOf.get(s.id);
      const st = styleOf(s, k.get(s.id));
      const cls = ["step"];
      if (app.selection.has(s.id)) cls.push("sel");
      if (app.highlight.has(s.id)) cls.push("hl");
      if (s.hidden) cls.push("hidden");
      if (present && f > app.frameIdx) cls.push("future");
      if (present && f === app.frameIdx) cls.push("current");
      const newFrame = f !== lastFrame;
      lastFrame = f;
      const valid = !!app.values.get(s.id);
      return `<div class="${cls.join(" ")}${newFrame ? " frame-start" : ""}" data-id="${s.id}">
      <span class="sn">${newFrame ? `<span class="fbadge" title="Khung tr\xECnh b\xE0y">${f + 1}</span>` : ""}</span>
      <button class="eye" data-act="eye" title="${s.hidden ? "Hi\u1EC7n" : "\u1EA8n"}">${s.hidden ? "\u25CC" : "\u25CF"}</button>
      <span class="dot" style="background:${esc2(st.fillColor && k.get(s.id) === "point" ? st.fillColor : st.color)}"></span>
      <span class="nm">${s.name ? labelHTML(s.name) : ""}</span>
      <span class="ds">${esc2(stepTitle(doc, s, app.values))}${valid ? "" : ' <i class="undef">(kh\xF4ng x\xE1c \u0111\u1ECBnh)</i>'}</span>
      <button class="join ${s.joinPrev ? "on" : ""}" data-act="join" title="G\u1ED9p v\xE0o c\xF9ng khung tr\xECnh b\xE0y v\u1EDBi b\u01B0\u1EDBc ph\xEDa tr\xEAn" ${i === 0 ? "disabled" : ""}>\u2912</button>
    </div>`;
    });
    host.innerHTML = rows.join("");
    const sel = host.querySelector(".step.sel, .step.current");
    if (sel && !host.dataset.noScroll) sel.scrollIntoView({ block: "nearest" });
  }
  function bindStepList(app) {
    const host = document.getElementById("steps");
    host.addEventListener("click", (e) => {
      const row = e.target.closest(".step");
      if (!row) return;
      const id = row.dataset.id;
      const act = e.target.closest("[data-act]")?.dataset.act;
      const s = stepById(app.doc, id);
      if (act === "eye") return app.setStepProp(id, "hidden", !s.hidden);
      if (act === "join") return app.setStepProp(id, "joinPrev", !s.joinPrev);
      if (app.mode === "present") {
        const fr = frames(app.doc);
        const i = fr.findIndex((ids) => ids.includes(id));
        if (i >= 0) app.gotoFrame(i);
        return;
      }
      app.select(id, e.shiftKey || e.ctrlKey || e.metaKey);
    });
    host.addEventListener("dblclick", (e) => {
      const row = e.target.closest(".step");
      if (row && app.mode !== "present") app.renameStep(row.dataset.id);
    });
  }
  function renderProps(app) {
    const host = document.getElementById("props");
    if (!host) return;
    const ids = [...app.selection].filter((id) => stepById(app.doc, id));
    if (!ids.length || app.mode === "present") {
      host.innerHTML = '<div class="empty small">B\u1EA5m v\xE0o m\u1ED9t \u0111\u1ED1i t\u01B0\u1EE3ng (tr\xEAn h\xECnh ho\u1EB7c trong danh s\xE1ch) \u0111\u1EC3 xem v\xE0 s\u1EEDa thu\u1ED9c t\xEDnh. Gi\u1EEF Shift \u0111\u1EC3 ch\u1ECDn nhi\u1EC1u.</div>';
      return;
    }
    const k = kinds(app.doc);
    const steps = ids.map((id) => stepById(app.doc, id));
    const s = steps[0];
    const kind = k.get(s.id);
    const st = styleOf(s, kind);
    const one2 = steps.length === 1;
    const allKinds = new Set(steps.map((x) => k.get(x.id)));
    const swatches = PALETTE.map((c) => `<button class="sw ${st.color === c.hex ? "on" : ""}" data-color="${c.hex}" title="${c.name}" style="background:${c.hex}"></button>`).join("");
    let html = "";
    if (one2) {
      html += `<div class="prop-title">${s.name ? `<b>${labelHTML(s.name)}</b> \xB7 ` : ""}${esc2(stepTitle(app.doc, s, app.values))}</div>`;
      if (s.name) html += `<label class="row">T\xEAn <input id="p-name" type="text" value="${esc2(s.name)}"></label>`;
    } else {
      html += `<div class="prop-title">\u0110ang ch\u1ECDn ${steps.length} \u0111\u1ED1i t\u01B0\u1EE3ng</div>`;
    }
    html += `<div class="row">M\xE0u <span class="swatches">${swatches}</span></div>`;
    if (allKinds.has("line") || allKinds.has("circle") || allKinds.has("mark")) {
      html += `<label class="row">\u0110\u1ED9 d\xE0y n\xE9t <select id="p-width">${[1, 1.6, 2.5, 3.5].map((w) => `<option value="${w}" ${st.width === w ? "selected" : ""}>${w}</option>`).join("")}</select></label>`;
    }
    if (allKinds.has("line") || allKinds.has("circle")) html += `<label class="row"><input id="p-dash" type="checkbox" ${st.dash ? "checked" : ""}> N\xE9t \u0111\u1EE9t</label>`;
    if (allKinds.has("circle") || s.type === "polygon") {
      const f = st.fill || 0;
      html += `<label class="row">T\xF4 n\u1EC1n nh\u1EA1t <input id="p-fill" type="range" min="0" max="0.4" step="0.04" value="${f}"></label>`;
    }
    if (allKinds.has("point")) html += `<label class="row">C\u1EE1 \u0111i\u1EC3m <select id="p-size">${[2, 3, 4, 5].map((w) => `<option ${st.size === w ? "selected" : ""}>${w}</option>`).join("")}</select></label>`;
    if (one2 && kind !== "mark") html += `<label class="row"><input id="p-label" type="checkbox" ${st.showLabel ? "checked" : ""}> Hi\u1EC7n nh\xE3n</label>`;
    if (one2 && s.type === "angle_mark") html += `<div class="row">S\u1ED1 cung ${[1, 2, 3].map((n) => `<button class="mini ${st.arcs === n ? "on" : ""}" data-arcs="${n}">${n}</button>`).join("")}</div>`;
    if (one2 && s.type === "segment_mark") html += `<div class="row">S\u1ED1 v\u1EA1ch ${[1, 2, 3].map((n) => `<button class="mini ${st.ticks === n ? "on" : ""}" data-ticks="${n}">${n}</button>`).join("")}</div>`;
    if (one2 && s.type === "polygon") html += `<label class="row"><input id="p-border" type="checkbox" ${st.border ? "checked" : ""}> V\u1EBD vi\u1EC1n</label>`;
    if (one2 && s.type === "intersection" && intersectCount(app.values, s) === 2) html += `<div class="row"><button id="p-swap" class="mini wide">\u0110\u1ED5i sang giao \u0111i\u1EC3m c\xF2n l\u1EA1i</button></div>`;
    if (one2 && s.type === "arc_midpoint") html += `<div class="row"><button id="p-arc" class="mini wide">\u0110\u1ED5i sang cung ${paramsOf(s).contains ? "kh\xF4ng ch\u1EE9a" : "ch\u1EE9a"} \u0111\u1EC9nh</button></div>`;
    if (one2 && isDraggableType(s.type)) {
      const v = app.values.get(s.id);
      if (v) html += `<div class="row coords">(${v.x.toFixed(3)}; ${v.y.toFixed(3)})</div>`;
    }
    if (one2) {
      html += `<label class="row"><input id="p-hidden" type="checkbox" ${s.hidden ? "checked" : ""}> \u1EA8n (\u0111\u1ED1i t\u01B0\u1EE3ng ph\u1EE5)</label>`;
      html += `<label class="row"><input id="p-join" type="checkbox" ${s.joinPrev ? "checked" : ""}> G\u1ED9p khung tr\xECnh b\xE0y v\u1EDBi b\u01B0\u1EDBc tr\u01B0\u1EDBc</label>`;
    }
    html += `<div class="row"><button id="p-del" class="danger">Xo\xE1 ${one2 ? "" : steps.length + " \u0111\u1ED1i t\u01B0\u1EE3ng"}</button></div>`;
    host.innerHTML = html;
    const q = (sel) => host.querySelector(sel);
    host.querySelectorAll(".sw").forEach((b) => b.onclick = () => app.setStyle(ids, { color: b.dataset.color, ...allKinds.has("point") ? { fillColor: b.dataset.color } : {} }));
    if (q("#p-name")) q("#p-name").onchange = (e) => {
      if (!app.setName(s.id, e.target.value.trim())) e.target.value = s.name;
    };
    if (q("#p-width")) q("#p-width").onchange = (e) => app.setStyle(ids, { width: +e.target.value });
    if (q("#p-dash")) q("#p-dash").onchange = (e) => app.setStyle(ids, { dash: e.target.checked });
    if (q("#p-fill")) q("#p-fill").onchange = (e) => app.setStyle(ids, { fill: +e.target.value });
    if (q("#p-size")) q("#p-size").onchange = (e) => app.setStyle(ids, { size: +e.target.value });
    if (q("#p-label")) q("#p-label").onchange = (e) => app.setStyle(ids, { showLabel: e.target.checked });
    if (q("#p-border")) q("#p-border").onchange = (e) => app.setStyle(ids, { border: e.target.checked });
    host.querySelectorAll("[data-arcs]").forEach((b) => b.onclick = () => app.setStyle(ids, { arcs: +b.dataset.arcs }));
    host.querySelectorAll("[data-ticks]").forEach((b) => b.onclick = () => app.setStyle(ids, { ticks: +b.dataset.ticks }));
    if (q("#p-swap")) q("#p-swap").onclick = () => app.setParams(s.id, { which: 1 - (paramsOf(s).which || 0) });
    if (q("#p-arc")) q("#p-arc").onclick = () => app.setParams(s.id, { contains: !paramsOf(s).contains });
    if (q("#p-hidden")) q("#p-hidden").onchange = (e) => app.setStepProp(s.id, "hidden", e.target.checked);
    if (q("#p-join")) q("#p-join").onchange = (e) => app.setStepProp(s.id, "joinPrev", e.target.checked);
    q("#p-del").onclick = () => app.deleteSteps(ids);
  }
  function renderToolOptions(app) {
    const host = document.getElementById("tool-options");
    if (!host) return;
    const t = app.toolId;
    const m = app.markDefaults;
    if (!["angle_mark", "segment_mark", "polygon"].includes(t)) {
      host.innerHTML = "";
      return;
    }
    const key = t === "polygon" ? "polyColor" : "color";
    let html = `<div class="tool-group-name">Ki\u1EC3u d\u1EA5u m\u1EDBi</div><div class="swatches">${PALETTE.map((c) => `<button class="sw ${m[key] === c.hex ? "on" : ""}" data-c="${c.hex}" style="background:${c.hex}" title="${c.name}"></button>`).join("")}</div>`;
    if (t === "angle_mark") html += `<div class="row">S\u1ED1 cung ${[1, 2, 3].map((n) => `<button class="mini ${m.arcs === n ? "on" : ""}" data-n="${n}">${n}</button>`).join("")}</div><div class="note">C\xE1c g\xF3c b\u1EB1ng nhau: d\xF9ng c\xF9ng m\xE0u v\xE0 c\xF9ng s\u1ED1 cung.</div>`;
    if (t === "segment_mark") html += `<div class="row">S\u1ED1 v\u1EA1ch ${[1, 2, 3].map((n) => `<button class="mini ${m.ticks === n ? "on" : ""}" data-n="${n}">${n}</button>`).join("")}</div>`;
    host.innerHTML = html;
    host.querySelectorAll("[data-c]").forEach((b) => b.onclick = () => {
      m[key] = b.dataset.c;
      renderToolOptions(app);
    });
    host.querySelectorAll("[data-n]").forEach((b) => b.onclick = () => {
      m[t === "angle_mark" ? "arcs" : "ticks"] = +b.dataset.n;
      renderToolOptions(app);
    });
  }

  // src/ui/app.js
  var HISTORY_MAX = 200;
  var App = class {
    constructor() {
      this.doc = emptyDoc();
      this.values = /* @__PURE__ */ new Map();
      this.undoStack = [];
      this.redoStack = [];
      this.selection = /* @__PURE__ */ new Set();
      this.highlight = /* @__PURE__ */ new Set();
      this.toolId = "move";
      this.picks = [];
      this.tx = null;
      this.mode = "edit";
      this.frameIdx = 0;
      this.projector = false;
      this.grid = false;
      this.mouse = { x: 0, y: 0 };
      this.markDefaults = { color: "#dc2626", arcs: 1, ticks: 1, polyColor: "#1d4ed8" };
      this.listeners = { change: [] };
    }
    // ================= khởi tạo =================
    mount() {
      JXG.Options.text.useMathJax = false;
      JXG.Options.text.display = "html";
      this.board = JXG.JSXGraph.initBoard("board", {
        boundingbox: [-8, 6, 8, -6],
        keepAspectRatio: true,
        axis: false,
        grid: false,
        showCopyright: false,
        showNavigation: false,
        showInfobox: false,
        pan: { enabled: true, needShift: false, needTwoFingers: false },
        zoom: { wheel: true, needShift: false, min: 0.02, max: 100, factorX: 1.15, factorY: 1.15 },
        resize: { enabled: true }
      });
      this.renderer = new Renderer(this.board);
      this.stage = document.getElementById("stage");
      this.buildToolbar();
      this.bindPointer();
      this.bindKeys();
      this.bindButtons();
      this.setTool("move");
      this.refresh();
    }
    on(evt, fn) {
      var _a;
      ((_a = this.listeners)[evt] || (_a[evt] = [])).push(fn);
    }
    emit(evt) {
      for (const fn of this.listeners[evt] || []) fn(this);
    }
    // ================= tài liệu & lịch sử =================
    /** Thay toàn bộ tài liệu (mở file, link...). */
    loadDoc(doc, { keepHistory = false } = {}) {
      if (keepHistory) this.pushUndo(JSON.stringify(this.doc));
      else {
        this.undoStack = [];
        this.redoStack = [];
      }
      this.doc = clone(doc);
      this.selection.clear();
      this.highlight.clear();
      this.cancelTool();
      if (doc.view && Array.isArray(doc.view.bbox)) this.board.setBoundingBox(doc.view.bbox, true);
      this.refresh();
      this.emit("change");
    }
    pushUndo(snapshot) {
      this.undoStack.push(snapshot);
      if (this.undoStack.length > HISTORY_MAX) this.undoStack.shift();
      this.redoStack = [];
    }
    /** Thay đổi tài liệu như một bước hoàn tác được. mutate(doc) sửa trực tiếp doc. */
    commit(mutate) {
      const before = this.tx ?? JSON.stringify(this.doc);
      mutate(this.doc);
      if (!this.tx) this.pushUndo(before);
      this.afterChange();
    }
    afterChange() {
      for (const id of [...this.selection]) if (!stepById(this.doc, id)) this.selection.delete(id);
      this.refresh();
      this.emit("change");
    }
    beginTx() {
      if (!this.tx) this.tx = JSON.stringify(this.doc);
    }
    endTx() {
      if (this.tx) {
        if (this.tx !== JSON.stringify(this.doc)) this.pushUndo(this.tx);
        this.tx = null;
      }
    }
    undo() {
      this.cancelTool();
      if (!this.undoStack.length) return toast("Kh\xF4ng c\xF2n g\xEC \u0111\u1EC3 ho\xE0n t\xE1c");
      this.redoStack.push(JSON.stringify(this.doc));
      this.doc = JSON.parse(this.undoStack.pop());
      this.afterChange();
    }
    redo() {
      this.cancelTool();
      if (!this.redoStack.length) return toast("Kh\xF4ng c\xF2n g\xEC \u0111\u1EC3 l\xE0m l\u1EA1i");
      this.undoStack.push(JSON.stringify(this.doc));
      this.doc = JSON.parse(this.redoStack.pop());
      this.afterChange();
    }
    /**
     * Thêm các bước từ đặc tả [{type,args,params,name,style}]. Đối số '$k' = id của bước thứ k vừa thêm.
     * Các bước sau bước đầu được gộp chung khung trình bày. Trả về danh sách id.
     */
    addSteps(specs, { join = true } = {}) {
      const ids = [];
      const k = kinds(this.doc);
      specs.forEach((sp, i) => {
        const def = STEP_TYPES[sp.type];
        const id = newId(this.doc);
        const args = sp.args.map((a) => typeof a === "string" && a.startsWith("$") ? ids[+a.slice(1)] : a);
        const kind = def.kind === "same" ? k.get(args[0]) : def.kind;
        const step = { id, type: sp.type, args };
        if (sp.params && Object.keys(sp.params).length) step.params = { ...sp.params };
        if (kind !== "mark") step.name = sp.name && !this.nameUsed(sp.name) ? sp.name : nextName(this.doc, kind, sp.name);
        if (sp.style) step.style = { ...sp.style };
        if (i > 0 && join) step.joinPrev = true;
        this.doc.steps.push(step);
        k.set(id, kind);
        ids.push(id);
      });
      return ids;
    }
    nameUsed(name, exceptId) {
      return this.doc.steps.some((s) => s.name === name && s.id !== exceptId);
    }
    // ================= tính toán & vẽ =================
    visibleSet() {
      if (this.mode !== "present") return null;
      const fr = frames(this.doc);
      const set = /* @__PURE__ */ new Set();
      for (let i = 0; i <= Math.min(this.frameIdx, fr.length - 1); i++) for (const id of fr[i]) set.add(id);
      return set;
    }
    refresh() {
      this.values = evaluate(this.doc);
      this.renderer.scale = this.projector ? 1.9 : 1;
      this.renderer.rebuild(this.doc, this.values, {
        visible: this.visibleSet(),
        selected: this.mode === "present" ? /* @__PURE__ */ new Set() : this.selection,
        highlight: this.highlight
      });
      this.renderer.clearExtra();
      this.drawRelationOverlay?.();
      this.renderPanels();
    }
    /** Cập nhật nhanh khi kéo (không dựng lại phần tử). */
    quickUpdate() {
      this.values = evaluate(this.doc);
      this.renderer.update(this.values);
      this.updateCoordsReadout?.();
    }
    renderPanels() {
      renderStepList(this);
      renderProps(this);
      renderToolOptions(this);
      document.getElementById("btn-undo").disabled = !this.undoStack.length;
      document.getElementById("btn-redo").disabled = !this.redoStack.length;
      this.updatePresentBar();
    }
    // ================= toạ độ & chọn đối tượng =================
    toScreen(P2) {
      const b = this.board;
      return { x: b.origin.scrCoords[1] + P2.x * b.unitX, y: b.origin.scrCoords[2] - P2.y * b.unitY };
    }
    toUser(sx, sy) {
      const b = this.board;
      return { x: (sx - b.origin.scrCoords[1]) / b.unitX, y: (b.origin.scrCoords[2] - sy) / b.unitY };
    }
    eventPos(e) {
      const r = this.board.containerObj.getBoundingClientRect();
      return { sx: e.clientX - r.left, sy: e.clientY - r.top };
    }
    /** Các đối tượng gần vị trí màn hình (sx, sy), điểm trước, rồi theo khoảng cách. */
    hitTest(sx, sy) {
      const vis = this.visibleSet();
      const k = kinds(this.doc);
      const P2 = this.toUser(sx, sy);
      const px = 1 / this.board.unitX;
      const f = this.projector ? 1.6 : 1;
      const out = [];
      for (const s of this.doc.steps) {
        if (s.hidden || vis && !vis.has(s.id)) continue;
        const v = this.values.get(s.id);
        const kind = k.get(s.id);
        if (!v || kind === "mark") continue;
        const d = distToObject(v, P2) / px;
        if (kind === "point" && d <= 11 * f) out.push({ id: s.id, kind, d, pri: 0 });
        else if ((kind === "line" || kind === "circle") && d <= 7 * f) out.push({ id: s.id, kind, d, pri: 1 });
      }
      for (const s of this.doc.steps) {
        if (s.hidden || vis && !vis.has(s.id) || k.get(s.id) !== "mark") continue;
        const v = this.values.get(s.id);
        if (!v) continue;
        const d = markDistance(v, P2, px * f) / px;
        if (d <= 9 * f) out.push({ id: s.id, kind: "mark", d, pri: 2 });
      }
      out.sort((a, b) => a.pri - b.pri || a.d - b.d);
      return out;
    }
    figureScale() {
      let xs = [], ys = [];
      for (const v of this.values.values()) if (v && v.kind === "point") {
        xs.push(v.x);
        ys.push(v.y);
      }
      if (xs.length < 2) return 10;
      return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 1e-6);
    }
    /** Điểm đã có trùng (về số) với P. */
    existingPointAt(P2, tolPx = 0.5) {
      const k = kinds(this.doc);
      const tol = Math.max(1e-9 * this.figureScale(), tolPx / this.board.unitX);
      for (const s of this.doc.steps) {
        if (k.get(s.id) !== "point") continue;
        const v = this.values.get(s.id);
        if (v && dist(v, P2) < tol) return s.id;
      }
      return null;
    }
    /**
     * Tạo giao điểm của hai đường c1, c2. near: toạ độ chuột (chọn nghiệm gần nhất) hoặc null (tạo mọi nghiệm).
     * Nếu một nghiệm trùng điểm đã có thì nghiệm còn lại được dựng bằng "giao điểm thứ hai" (bền vững hơn
     * chọn theo chỉ số). Trả về danh sách id điểm (mới hoặc có sẵn).
     */
    createIntersections(c1, c2, near = null) {
      const v1 = this.values.get(c1), v2 = this.values.get(c2);
      const roots = intersect(v1, v2);
      if (!roots.length) {
        toast("Hai \u0111\u01B0\u1EDDng n\xE0y kh\xF4ng c\u1EAFt nhau (\u1EDF v\u1ECB tr\xED hi\u1EC7n t\u1EA1i)");
        return [];
      }
      const existing = roots.map((r) => this.existingPointAt(r, 0.01));
      let idx = roots.map((_, i) => i);
      if (near) idx = [idx.reduce((a, b) => dist(roots[a], near) <= dist(roots[b], near) ? a : b)];
      const out = [];
      for (const i of idx) {
        if (existing[i]) {
          out.push(existing[i]);
          continue;
        }
        const other = roots.length === 2 ? existing[1 - i] : null;
        const spec = other ? { type: "intersection_other", args: [c1, c2, other] } : { type: "intersection", args: [c1, c2], params: roots.length === 2 ? { which: i } : void 0 };
        out.push(...this.addSteps([spec]));
        this.values = evaluate(this.doc);
      }
      return out;
    }
    /** Lấy (hoặc tạo) một điểm tại vị trí bấm: điểm có sẵn / giao điểm / điểm trên đường / điểm tự do. */
    resolvePoint(sx, sy, hits) {
      const pHit = hits.find((h) => h.kind === "point");
      if (pHit) return pHit.id;
      const P2 = this.toUser(sx, sy);
      const curves = hits.filter((h) => h.kind === "line" || h.kind === "circle").slice(0, 4);
      const px = 1 / this.board.unitX;
      let best = null;
      for (let i = 0; i < curves.length; i++)
        for (let j = i + 1; j < curves.length; j++)
          for (const r of intersect(this.values.get(curves[i].id), this.values.get(curves[j].id))) {
            const d = dist(r, P2) / px;
            if (d < 14 && (!best || d < best.d)) best = { d, a: curves[i].id, b: curves[j].id };
          }
      if (best) return this.createIntersections(best.a, best.b, P2)[0] ?? null;
      if (curves.length) {
        const c = curves[0].id;
        const t = paramOf(this.values.get(c), P2);
        return this.addSteps([{ type: "point_on", args: [c], params: { t } }])[0];
      }
      const Q = this.snap(P2);
      return this.addSteps([{ type: "free_point", args: [], params: { x: Q.x, y: Q.y } }])[0];
    }
    snap(P2) {
      if (!this.grid) return { x: round6(P2.x), y: round6(P2.y) };
      return { x: Math.round(P2.x * 2) / 2, y: Math.round(P2.y * 2) / 2 };
    }
    // ================= công cụ =================
    setTool(id) {
      this.cancelTool();
      this.toolId = id;
      document.querySelectorAll(".tool").forEach((b) => b.classList.toggle("active", b.dataset.tool === id));
      this.stage.classList.toggle("tool-active", id !== "move");
      this.board.attr.pan.enabled = id === "move";
      this.showHint();
      renderToolOptions(this);
    }
    cancelTool() {
      this.picks = [];
      this.renderer?.clearExtra();
      if (this.tx) {
        this.endTx();
        this.refresh();
      }
      this.showHint();
    }
    showHint(msg) {
      const el = document.getElementById("hint");
      if (!el) return;
      if (this.mode === "present") {
        el.textContent = "Ch\u1EBF \u0111\u1ED9 tr\xECnh b\xE0y: \u2190 \u2192 (ho\u1EB7c PageUp/PageDown) \u0111\u1EC3 chuy\u1EC3n khung. V\u1EABn k\xE9o \u0111\u01B0\u1EE3c \u0111i\u1EC3m t\u1EF1 do.";
        return;
      }
      const t = TOOL_BY_ID[this.toolId];
      const i = Math.min(this.picks.length, t.hints.length - 1);
      el.textContent = msg || `${t.label}: ${t.hints[i] || ""}`;
    }
    neededTypes(tool) {
      if (tool.inputs[0] === "...point") return ["point"];
      if (!tool.anyOrder) return [tool.inputs[this.picks.length]];
      const k = kinds(this.doc);
      const rem = [...tool.inputs];
      for (const p of this.picks) {
        const j = rem.findIndex((t) => argAccepts(t, k.get(p)));
        if (j >= 0) rem.splice(j, 1);
      }
      return rem;
    }
    toolClick(sx, sy) {
      const tool = TOOL_BY_ID[this.toolId];
      const hits = this.hitTest(sx, sy).filter((h) => h.kind !== "mark");
      const k = kinds(this.doc);
      this.beginTx();
      if (tool.id === "point") {
        const id2 = this.resolvePoint(sx, sy, hits);
        this.endTx();
        this.selection = new Set(id2 ? [id2] : []);
        this.afterChange();
        return;
      }
      if (tool.id === "intersect") {
        const curves = hits.filter((h) => h.kind === "line" || h.kind === "circle");
        if (!this.picks.length && curves.length >= 2) {
          this.createIntersections(curves[0].id, curves[1].id, this.toUser(sx, sy));
          return this.finishTool();
        }
        const c = curves.find((h) => !this.picks.includes(h.id));
        if (!c) return this.showHint("H\xE3y b\u1EA5m v\xE0o m\u1ED9t \u0111\u01B0\u1EDDng th\u1EB3ng ho\u1EB7c \u0111\u01B0\u1EDDng tr\xF2n");
        this.picks.push(c.id);
        if (this.picks.length === 2) {
          this.createIntersections(this.picks[0], this.picks[1], null);
          return this.finishTool();
        }
        this.selection = new Set(this.picks);
        this.refresh();
        return this.showHint();
      }
      if (tool.segmentShortcut && !this.picks.length && hits.length && hits[0].kind === "line") {
        const s = stepById(this.doc, hits[0].id);
        if (s.type === "segment") {
          this.picks = [...s.args];
          return this.completeTool(tool);
        }
      }
      const need = this.neededTypes(tool);
      let chosen = hits.find((h) => need.some((t) => argAccepts(t, h.kind)));
      let id = chosen?.id;
      if (!id && need.some((t) => argAccepts(t, "point"))) id = this.resolvePoint(sx, sy, hits);
      if (!id) return this.showHint(`H\xE3y ch\u1ECDn ${need.map(typeName).join(" ho\u1EB7c ")}`);
      if (tool.inputs[0] === "...point") {
        if (this.picks.length >= 3 && id === this.picks[0]) return this.completeTool(tool);
        if (this.picks.includes(id)) return;
        this.picks.push(id);
      } else {
        if (this.picks.includes(id)) return this.showHint("\u0110\u1ED1i t\u01B0\u1EE3ng n\xE0y \u0111\xE3 \u0111\u01B0\u1EE3c ch\u1ECDn, h\xE3y ch\u1ECDn \u0111\u1ED1i t\u01B0\u1EE3ng kh\xE1c");
        this.picks.push(id);
        if (tool.anyOrder && this.picks.length === tool.inputs.length) {
          const kk = kinds(this.doc);
          const ordered = [];
          const rest = [...this.picks];
          for (const t of tool.inputs) {
            const j = rest.findIndex((p) => argAccepts(t, kk.get(p)));
            ordered.push(rest.splice(j, 1)[0]);
          }
          this.picks = ordered;
        }
        if (this.picks.length === tool.inputs.length) return this.completeTool(tool);
      }
      void k;
      this.selection = new Set(this.picks);
      this.refresh();
      this.startPreview(tool);
      this.showHint();
    }
    completeTool(tool) {
      const specs = tool.make(this.picks, this);
      const ids = this.addSteps(specs);
      this.selection = new Set(ids.slice(0, 1));
      this.finishTool();
    }
    finishTool() {
      this.picks = [];
      this.renderer.clearExtra();
      this.endTx();
      if (this.toolId === "intersect") this.selection.clear();
      this.afterChange();
      this.showHint();
    }
    markStyle(kind) {
      const m = this.markDefaults;
      if (kind === "angle") return { color: m.color, arcs: m.arcs };
      if (kind === "segment") return { color: m.color, ticks: m.ticks };
      return { color: m.polyColor, fill: 0.12 };
    }
    startPreview(tool) {
      this.renderer.clearExtra();
      if (!tool.preview || !this.picks.length) return;
      const r = this.renderer;
      const ptOf = (id) => r.addExtra("point", [() => this.values.get(id)?.x ?? NaN, () => this.values.get(id)?.y ?? NaN], { visible: false });
      const mouse = r.addExtra("point", [() => this.mouse.x, () => this.mouse.y], { visible: false });
      const st = { strokeColor: "#9ca3af", strokeWidth: 1.5, dash: 2 };
      const pts = this.picks.map(ptOf);
      if (tool.preview === "segment") r.addExtra("segment", [pts[0], mouse], st);
      else if (tool.preview === "line") r.addExtra("line", [pts[0], mouse], st);
      else if (tool.preview === "ray") r.addExtra("line", [pts[0], mouse], { ...st, straightFirst: false });
      else if (tool.preview === "circle") r.addExtra("circle", [pts[0], mouse], st);
      else if (tool.preview === "polygon") {
        for (let i = 0; i + 1 < pts.length; i++) r.addExtra("segment", [pts[i], pts[i + 1]], st);
        r.addExtra("segment", [pts[pts.length - 1], mouse], st);
      }
    }
    // ================= chuột / cảm ứng =================
    bindPointer() {
      const box = this.board.containerObj;
      const wrap = this.stage;
      wrap.addEventListener("pointerdown", (e) => this.onPointerDown(e), true);
      wrap.addEventListener("pointermove", (e) => {
        const { sx, sy } = this.eventPos(e);
        this.mouse = this.toUser(sx, sy);
        if (this.picks.length && this.renderer.extra.length) this.board.update();
        if (!this.drag) {
          const hits = this.hitTest(sx, sy);
          let cursor = "";
          if (this.toolId === "move" && this.mode !== "edit-disabled") {
            const h = hits[0];
            if (h && h.kind === "point" && isDraggableType(stepById(this.doc, h.id).type)) cursor = "grab";
            else if (h) cursor = "pointer";
            else if (this.labelAt(e)) cursor = "move";
          } else if (this.toolId !== "move") cursor = hits.length ? "pointer" : "crosshair";
          box.style.cursor = cursor;
        }
      });
      box.addEventListener("dblclick", (e) => {
        if (this.mode === "present") return;
        const { sx, sy } = this.eventPos(e);
        const h = this.hitTest(sx, sy)[0];
        if (h && h.kind === "point") this.renameStep(h.id);
      });
    }
    /** Nhãn điểm tại vị trí chuột (để kéo nhãn). */
    labelAt(e) {
      for (const [id, arr] of this.renderer.els) {
        const p = arr[arr.length - 1];
        if (!p || p.elType !== "point" || !p.label || !p.label.rendNode || !p.visProp.visible || !p.visProp.withlabel) continue;
        const r = p.label.rendNode.getBoundingClientRect();
        if (r.width && e.clientX >= r.left - 2 && e.clientX <= r.right + 2 && e.clientY >= r.top - 2 && e.clientY <= r.bottom + 2) return id;
      }
      return null;
    }
    onPointerDown(e) {
      if (e.button !== void 0 && e.button !== 0) return;
      if (document.querySelector(".modal-back")) return;
      const { sx, sy } = this.eventPos(e);
      const r = this.board.containerObj.getBoundingClientRect();
      if (sx < 0 || sy < 0 || sx > r.width || sy > r.height) return;
      this.mouse = this.toUser(sx, sy);
      if (this.toolId !== "move" && this.mode === "edit") {
        e.stopPropagation();
        e.preventDefault();
        this.toolClick(sx, sy);
        return;
      }
      const hits = this.hitTest(sx, sy);
      const lab = this.mode === "edit" && !(hits[0] && hits[0].kind === "point" && hits[0].d < 5) ? this.labelAt(e) : null;
      if (lab) {
        e.stopPropagation();
        e.preventDefault();
        const s = stepById(this.doc, lab);
        const off = s.style && s.style.labelOffset || [8, 10];
        this.startDrag(e, { kind: "label", id: lab, start: JSON.stringify(this.doc), sx, sy, off: [...off] });
        return;
      }
      const h = hits[0];
      const step = h ? stepById(this.doc, h.id) : null;
      if (h && h.kind === "point" && isDraggableType(step.type)) {
        e.stopPropagation();
        e.preventDefault();
        this.startDrag(e, { kind: "point", id: h.id, start: JSON.stringify(this.doc) });
        if (this.mode === "edit") this.select(h.id, e.shiftKey, false);
        return;
      }
      if (h) {
        e.stopPropagation();
        e.preventDefault();
        if (this.mode === "edit") this.select(h.id, e.shiftKey);
        return;
      }
      if (this.mode === "edit" && (this.selection.size || this.highlight.size) && !e.shiftKey) {
        this.selection.clear();
        this.refresh();
      }
    }
    startDrag(e, info) {
      this.drag = info;
      const step = stepById(this.doc, info.id);
      const P0 = this.values.get(info.id);
      if (info.kind === "point" && P0) info.grab = { x: P0.x - this.mouse.x, y: P0.y - this.mouse.y };
      const move = (ev) => {
        const { sx, sy } = this.eventPos(ev);
        this.mouse = this.toUser(sx, sy);
        if (info.kind === "label") {
          const sc = this.projector ? 1.9 : 1;
          const off = [round1(info.off[0] + (sx - info.sx) / sc), round1(info.off[1] - (sy - info.sy) / sc)];
          step.style = { ...step.style || {}, labelOffset: off };
          const arr = this.renderer.els.get(info.id);
          const p = arr && arr[arr.length - 1];
          if (p && p.label) {
            p.label.setAttribute({ offset: off.map((v) => v * sc) });
            this.board.update();
          }
          return;
        }
        const target = { x: this.mouse.x + info.grab.x, y: this.mouse.y + info.grab.y };
        if (step.type === "free_point") {
          const Q = this.snap(target);
          step.params = { ...step.params || {}, x: Q.x, y: Q.y };
        } else if (step.type === "point_on") {
          const c = this.values.get(step.args[0]);
          if (c) step.params = { ...step.params || {}, t: round9(paramOf(c, target)) };
        }
        this.quickUpdate();
      };
      const up = () => {
        window.removeEventListener("pointermove", move, true);
        window.removeEventListener("pointerup", up, true);
        window.removeEventListener("pointercancel", up, true);
        this.drag = null;
        if (JSON.stringify(this.doc) !== info.start) {
          this.pushUndo(info.start);
          this.afterChange();
        }
      };
      window.addEventListener("pointermove", move, true);
      window.addEventListener("pointerup", up, true);
      window.addEventListener("pointercancel", up, true);
    }
    select(id, additive = false, rerender = true) {
      if (additive) {
        if (this.selection.has(id)) this.selection.delete(id);
        else this.selection.add(id);
      } else this.selection = /* @__PURE__ */ new Set([id]);
      if (rerender) this.refresh();
      else this.renderPanels();
    }
    // ================= sửa đối tượng =================
    async renameStep(id) {
      const s = stepById(this.doc, id);
      if (!s || !s.name) return;
      const v = await promptDialog("\u0110\u1ED5i t\xEAn", s.name, "Ch\u1EEF s\u1ED1 \u1EDF cu\u1ED1i hi\u1EC3n th\u1ECB th\xE0nh ch\u1EC9 s\u1ED1 d\u01B0\u1EDBi (A1 \u2192 A\u2081). C\xF3 th\u1EC3 d\xF9ng d\u1EA5u ph\u1EA9y tr\xEAn: A'.");
      if (v == null) return;
      this.setName(id, v.trim());
    }
    setName(id, name) {
      const s = stepById(this.doc, id);
      if (!name || name === s.name) return false;
      if (this.nameUsed(name, id)) {
        toast(`T\xEAn "${name}" \u0111\xE3 \u0111\u01B0\u1EE3c d\xF9ng`);
        return false;
      }
      this.commit(() => {
        s.name = name;
      });
      return true;
    }
    setStyle(ids, patch) {
      this.commit((doc) => {
        for (const id of ids) {
          const s = stepById(doc, id);
          if (s) s.style = { ...s.style || {}, ...patch };
        }
      });
    }
    setStepProp(id, key, value) {
      this.commit((doc) => {
        const s = stepById(doc, id);
        if (!s) return;
        if (value === false || value == null) delete s[key];
        else s[key] = value;
      });
    }
    setParams(id, patch) {
      this.commit((doc) => {
        const s = stepById(doc, id);
        s.params = { ...s.params || {}, ...patch };
      });
    }
    async deleteSteps(ids) {
      ids = ids.filter((id) => stepById(this.doc, id));
      if (!ids.length) return;
      const dep = [...dependents(this.doc, ids)];
      if (dep.length) {
        const names = dep.map((d) => `<b>${escapeHTML(describe(this.doc, d) || d)}</b>`).join(", ");
        const ok = await confirmDialog("Xo\xE1 \u0111\u1ED1i t\u01B0\u1EE3ng", `Xo\xE1 ${ids.map((i) => `<b>${escapeHTML(describe(this.doc, i))}</b>`).join(", ")} s\u1EBD xo\xE1 k\xE8m <b>${dep.length}</b> \u0111\u1ED1i t\u01B0\u1EE3ng ph\u1EE5 thu\u1ED9c: ${names}.<br>Ti\u1EBFp t\u1EE5c?`, "Xo\xE1");
        if (!ok) return;
      }
      this.commit((doc) => {
        const { doc: nd } = removeSteps(doc, ids);
        doc.steps = nd.steps;
      });
      this.selection.clear();
      this.refresh();
    }
    // ================= trình bày / trình chiếu =================
    setMode(mode) {
      this.cancelTool();
      this.mode = mode;
      document.body.classList.toggle("presenting", mode === "present");
      if (mode === "present") {
        this.frameIdx = 0;
        this.selection.clear();
        this.board.attr.pan.enabled = true;
      } else this.setTool(this.toolId);
      this.refresh();
      this.showHint();
    }
    gotoFrame(i) {
      const n = frames(this.doc).length;
      this.frameIdx = Math.max(0, Math.min(n - 1, i));
      this.refresh();
    }
    updatePresentBar() {
      const lab = document.getElementById("frame-label");
      if (!lab) return;
      const n = frames(this.doc).length;
      lab.textContent = n ? `Khung ${Math.min(this.frameIdx + 1, n)} / ${n}` : "Ch\u01B0a c\xF3 b\u01B0\u1EDBc n\xE0o";
      document.getElementById("btn-prev").disabled = this.frameIdx <= 0;
      document.getElementById("btn-next").disabled = this.frameIdx >= n - 1;
    }
    async setProjector(on) {
      this.projector = on;
      document.body.classList.toggle("projector", on);
      try {
        if (on && !document.fullscreenElement) await document.documentElement.requestFullscreen();
        if (!on && document.fullscreenElement) await document.exitFullscreen();
      } catch {
      }
      setTimeout(() => {
        this.board.resizeContainer(this.stage.clientWidth, this.stage.clientHeight, true, true);
        this.refresh();
      }, 60);
    }
    toggleGrid() {
      this.grid = !this.grid;
      if (this.gridEl) {
        this.board.removeObject(this.gridEl);
        this.gridEl = null;
      }
      if (this.grid) this.gridEl = this.board.create("grid", [], { majorStep: [1, 1], minorElements: 0, strokeColor: "#cbd5e1", strokeOpacity: 0.7 });
      document.getElementById("btn-grid").classList.toggle("on", this.grid);
      this.board.update();
    }
    zoomFit() {
      const pts = [];
      const vis = this.visibleSet();
      for (const s of this.doc.steps) {
        if (s.hidden || vis && !vis.has(s.id)) continue;
        const v = this.values.get(s.id);
        if (!v) continue;
        if (v.kind === "point") pts.push(v);
        if (v.kind === "circle") pts.push({ x: v.c.x - v.r, y: v.c.y - v.r }, { x: v.c.x + v.r, y: v.c.y + v.r });
      }
      if (!pts.length) return this.board.setBoundingBox([-8, 6, 8, -6], true);
      const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
      let [x1, x2, y1, y2] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
      const m = Math.max(x2 - x1, y2 - y1, 1) * 0.12;
      this.board.setBoundingBox([x1 - m, y2 + m, x2 + m, y1 - m], true);
    }
    // ================= bàn phím & nút =================
    bindKeys() {
      document.addEventListener("keydown", (e) => {
        if (document.querySelector(".modal-back")) return;
        const tag = (e.target.tagName || "").toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select") return;
        const ctrl = e.ctrlKey || e.metaKey;
        if (ctrl && (e.key === "z" || e.key === "Z") && !e.shiftKey) {
          e.preventDefault();
          this.undo();
          return;
        }
        if (ctrl && (e.key === "y" || e.key === "Y" || (e.key === "z" || e.key === "Z") && e.shiftKey)) {
          e.preventDefault();
          this.redo();
          return;
        }
        if (this.mode === "present") {
          if (["ArrowRight", "PageDown", " ", "ArrowDown"].includes(e.key)) {
            e.preventDefault();
            this.gotoFrame(this.frameIdx + 1);
          } else if (["ArrowLeft", "PageUp", "ArrowUp"].includes(e.key)) {
            e.preventDefault();
            this.gotoFrame(this.frameIdx - 1);
          } else if (e.key === "Home") this.gotoFrame(0);
          else if (e.key === "End") this.gotoFrame(1e9);
          else if (e.key === "Escape" && !this.projector) this.setMode("edit");
          return;
        }
        if (e.key === "Escape") {
          if (this.picks.length) this.cancelTool();
          else if (this.toolId !== "move") this.setTool("move");
          else {
            this.selection.clear();
            this.highlight.clear();
            this.refresh();
          }
        } else if (e.key === "Enter" && this.picks.length >= 3 && TOOL_BY_ID[this.toolId].inputs[0] === "...point") {
          this.completeTool(TOOL_BY_ID[this.toolId]);
        } else if ((e.key === "Delete" || e.key === "Backspace") && this.selection.size) {
          e.preventDefault();
          this.deleteSteps([...this.selection]);
        }
      });
      document.addEventListener("fullscreenchange", () => {
        if (!document.fullscreenElement && this.projector) this.setProjector(false);
      });
    }
    buildToolbar() {
      const host = document.getElementById("tools");
      const groups = [];
      for (const t of TOOLS) {
        let g = groups.find((x) => x.name === t.group);
        if (!g) groups.push(g = { name: t.group, tools: [] });
        g.tools.push(t);
      }
      host.innerHTML = groups.map((g) => `<div class="tool-group"><div class="tool-group-name">${g.name}</div><div class="tool-grid">${g.tools.map((t) => `<button class="tool" data-tool="${t.id}" title="${t.label}"><span class="ti">${t.icon}</span><span class="tl">${t.label}</span></button>`).join("")}</div></div>`).join("") + '<div id="tool-options"></div>';
      host.addEventListener("click", (e) => {
        const b = e.target.closest(".tool");
        if (b) this.setTool(b.dataset.tool);
      });
    }
    bindButtons() {
      const on = (id, fn) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("click", fn);
      };
      on("btn-undo", () => this.undo());
      on("btn-redo", () => this.redo());
      on("btn-delete", () => this.deleteSteps([...this.selection]));
      on("btn-grid", () => this.toggleGrid());
      on("btn-fit", () => this.zoomFit());
      on("btn-present", () => this.setMode(this.mode === "present" ? "edit" : "present"));
      on("btn-projector", () => this.setProjector(!this.projector));
      on("btn-prev", () => this.gotoFrame(this.frameIdx - 1));
      on("btn-next", () => this.gotoFrame(this.frameIdx + 1));
      on("btn-exit-present", () => {
        if (this.projector) this.setProjector(false);
        this.setMode("edit");
      });
      on("btn-new", async () => {
        if (this.doc.steps.length && !await confirmDialog("H\xECnh m\u1EDBi", "Xo\xE1 h\xECnh hi\u1EC7n t\u1EA1i \u0111\u1EC3 b\u1EAFt \u0111\u1EA7u h\xECnh m\u1EDBi? (C\xF3 th\u1EC3 ho\xE0n t\xE1c b\u1EB1ng Ctrl+Z.)", "H\xECnh m\u1EDBi")) return;
        this.commit((doc) => {
          doc.steps = [];
          doc.title = "";
        });
        this.board.setBoundingBox([-8, 6, 8, -6], true);
      });
    }
  };
  var round6 = (v) => Math.round(v * 1e6) / 1e6;
  var round9 = (v) => Math.round(v * 1e9) / 1e9;
  var round1 = (v) => Math.round(v * 10) / 10;
  var escapeHTML = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  function typeName(t) {
    return { point: "m\u1ED9t \u0111i\u1EC3m", line: "m\u1ED9t \u0111\u01B0\u1EDDng th\u1EB3ng", circle: "m\u1ED9t \u0111\u01B0\u1EDDng tr\xF2n", curve: "m\u1ED9t \u0111\u01B0\u1EDDng th\u1EB3ng/\u0111\u01B0\u1EDDng tr\xF2n", obj: "m\u1ED9t \u0111\u1ED1i t\u01B0\u1EE3ng", pl: "m\u1ED9t \u0111i\u1EC3m ho\u1EB7c \u0111\u01B0\u1EDDng th\u1EB3ng", "...point": "m\u1ED9t \u0111i\u1EC3m" }[t] || t;
  }
  function markDistance(v, P2, px) {
    if (v.kind === "angle") return Math.abs(dist(v.B, P2) - 20 * px);
    if (v.kind === "segmark") return dist(mid(v.A, v.B), P2);
    if (v.kind === "polygon") return pointInPolygon(P2, v.pts) ? 0 : Infinity;
    return Infinity;
  }
  function pointInPolygon(P2, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = pts[i], b = pts[j];
      if (a.y > P2.y !== b.y > P2.y && P2.x < (b.x - a.x) * (P2.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside;
  }

  // src/core/builder.js
  var Builder = class {
    constructor(doc = emptyDoc()) {
      this.doc = doc;
    }
    /** Thêm một bước; trả về id. */
    add(type, args = [], params = void 0, name = void 0, extra = {}) {
      const def = STEP_TYPES[type];
      if (!def) throw new Error("Lo\u1EA1i b\u01B0\u1EDBc kh\xF4ng r\xF5: " + type);
      const id = newId(this.doc);
      const kind = def.kind === "same" ? kinds(this.doc).get(args[0]) : def.kind;
      const step = { id, type, args: [...args] };
      if (params && Object.keys(params).length) step.params = { ...params };
      if (kind !== "mark") step.name = name || nextName(this.doc, kind);
      Object.assign(step, extra);
      this.doc.steps.push(step);
      return id;
    }
    point(x, y, name) {
      return this.add("free_point", [], { x, y }, name);
    }
  };

  // src/core/examples.js
  var triangle = (b) => {
    const A = b.point(-0.6, 3.4, "A"), B = b.point(-3.4, -1.6, "B"), C = b.point(3.6, -1.6, "C");
    b.add("segment", [A, B]);
    b.add("segment", [B, C]);
    b.add("segment", [C, A]);
    return [A, B, C];
  };
  var EXAMPLES = {
    euler_line: {
      title: "\u0110\u01B0\u1EDDng th\u1EB3ng Euler",
      build() {
        const b = new Builder();
        const [A, B, C] = triangle(b);
        b.add("circumcircle", [A, B, C]);
        b.add("circumcenter", [A, B, C], {}, "O");
        b.add("centroid", [A, B, C], {}, "G");
        b.add("orthocenter", [A, B, C], {}, "H");
        return b.doc;
      }
    },
    nine_point: {
      title: "\u0110\u01B0\u1EDDng tr\xF2n Euler (9 \u0111i\u1EC3m)",
      build() {
        const b = new Builder();
        const [A, B, C] = triangle(b);
        const H = b.add("orthocenter", [A, B, C], {}, "H");
        const D = b.add("altitude_foot", [A, B, C], {}, "D");
        const E = b.add("altitude_foot", [B, C, A], {}, "E");
        const F = b.add("altitude_foot", [C, A, B], {}, "F");
        b.add("segment", [A, D], {}, void 0, { style: { dash: true } });
        b.add("segment", [B, E], {}, void 0, { style: { dash: true } });
        b.add("segment", [C, F], {}, void 0, { style: { dash: true } });
        const M1 = b.add("midpoint", [B, C], {}, "M");
        const M2 = b.add("midpoint", [C, A], {}, "K");
        const M3 = b.add("midpoint", [A, B], {}, "L");
        b.add("midpoint", [A, H], {}, "X");
        b.add("midpoint", [B, H], {}, "Y");
        b.add("midpoint", [C, H], {}, "Z");
        b.add("circle_3pts", [M1, M2, M3], {}, "\u03C9", { style: { color: "#7e22ce" } });
        return b.doc;
      }
    },
    simson: {
      title: "\u0110\u01B0\u1EDDng th\u1EB3ng Simson",
      build() {
        const b = new Builder();
        const A = b.point(-0.6, 3.4, "A"), B = b.point(-3.4, -1.6, "B"), C = b.point(3.6, -1.6, "C");
        const a = b.add("line", [B, C]), bb = b.add("line", [C, A]), c = b.add("line", [A, B]);
        const w = b.add("circumcircle", [A, B, C]);
        const P2 = b.add("point_on", [w], { t: 2.2 }, "P");
        b.add("projection", [P2, a], {}, "D");
        b.add("projection", [P2, bb], {}, "E");
        b.add("projection", [P2, c], {}, "F");
        return b.doc;
      }
    },
    miquel: {
      title: "\u0110\u1ECBnh l\xFD Miquel",
      build() {
        const b = new Builder();
        const [A, B, C] = triangle(b);
        const sAB = b.doc.steps[3].id, sBC = b.doc.steps[4].id, sCA = b.doc.steps[5].id;
        const D = b.add("point_on", [sBC], { t: 0.4 }, "D");
        const E = b.add("point_on", [sCA], { t: 0.35 }, "E");
        const F = b.add("point_on", [sAB], { t: 0.55 }, "F");
        const w1 = b.add("circle_3pts", [A, E, F]);
        const w2 = b.add("circle_3pts", [B, F, D]);
        b.add("circle_3pts", [C, D, E]);
        b.add("intersection_other", [w1, w2, F], {}, "M");
        return b.doc;
      }
    }
  };

  // src/core/index.js
  var core_exports = {};
  __export(core_exports, {
    FORMAT: () => FORMAT,
    FREE_PARAM_TYPES: () => FREE_PARAM_TYPES,
    STEP_TYPES: () => STEP_TYPES,
    VERSION: () => VERSION,
    argAccepts: () => argAccepts,
    clone: () => clone,
    dependents: () => dependents,
    describe: () => describe,
    emptyDoc: () => emptyDoc,
    evaluate: () => evaluate,
    frames: () => frames,
    geom: () => geom_exports,
    indexOf: () => indexOf,
    kinds: () => kinds,
    newId: () => newId,
    nextName: () => nextName,
    paramsOf: () => paramsOf,
    removeSteps: () => removeSteps,
    stepById: () => stepById,
    validate: () => validate
  });

  // src/io/codec.js
  var codec_exports = {};
  __export(codec_exports, {
    compactDoc: () => compactDoc,
    decodeDoc: () => decodeDoc,
    encodeDoc: () => encodeDoc,
    parseDocJSON: () => parseDocJSON
  });
  function toB64url(bytes) {
    let bin = "";
    for (let i = 0; i < bytes.length; i += 32768) bin += String.fromCharCode(...bytes.subarray(i, i + 32768));
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function fromB64url(s) {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  async function pipe(bytes, stream) {
    const res = new Response(new Blob([bytes]).stream().pipeThrough(stream));
    return new Uint8Array(await res.arrayBuffer());
  }
  function compactDoc(doc) {
    const out = { format: doc.format, version: doc.version };
    if (doc.title) out.title = doc.title;
    if (doc.view) out.view = doc.view;
    out.steps = doc.steps.map((s) => {
      const t = { id: s.id, type: s.type, args: s.args };
      for (const k of ["params", "name", "style", "hidden", "joinPrev"]) {
        const v = s[k];
        if (v === void 0 || v === false || typeof v === "object" && v && !Array.isArray(v) && !Object.keys(v).length) continue;
        t[k] = v;
      }
      return t;
    });
    return out;
  }
  async function encodeDoc(doc) {
    const json = JSON.stringify(compactDoc(doc));
    const bytes = new TextEncoder().encode(json);
    if (typeof CompressionStream !== "undefined") {
      try {
        return "z" + toB64url(await pipe(bytes, new CompressionStream("deflate-raw")));
      } catch {
      }
    }
    return "j" + toB64url(bytes);
  }
  async function decodeDoc(code) {
    let bytes;
    try {
      if (code[0] === "z") bytes = await pipe(fromB64url(code.slice(1)), new DecompressionStream("deflate-raw"));
      else if (code[0] === "j") bytes = fromB64url(code.slice(1));
      else throw new Error();
    } catch {
      throw new Error("Link h\xECnh b\u1ECB h\u1ECFng ho\u1EB7c b\u1ECB c\u1EAFt c\u1EE5t.");
    }
    return parseDocJSON(new TextDecoder().decode(bytes));
  }
  function parseDocJSON(text) {
    let doc;
    try {
      doc = JSON.parse(text);
    } catch {
      throw new Error("T\u1EC7p kh\xF4ng ph\u1EA3i JSON h\u1EE3p l\u1EC7.");
    }
    const errs = validate(doc);
    if (errs.length) throw new Error("H\xECnh kh\xF4ng h\u1EE3p l\u1EC7:\n" + errs.slice(0, 6).join("\n"));
    return doc;
  }

  // src/ui/share.js
  var DRAFT_KEY = "hinh-hoc-dong:nhap";
  function docWithView(app) {
    const bb = app.board.getBoundingBox().map((v) => Math.round(v * 1e3) / 1e3);
    return { ...app.doc, view: { bbox: bb } };
  }
  function saveDraft(app) {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(docWithView(app)));
    } catch {
    }
  }
  function loadDraft() {
    try {
      const t = localStorage.getItem(DRAFT_KEY);
      return t ? parseDocJSON(t) : null;
    } catch {
      return null;
    }
  }
  async function shareLink(app) {
    const code = await encodeDoc(docWithView(app));
    const base = location.href.split("#")[0];
    const url = `${base}#h=${code}`;
    try {
      history.replaceState(null, "", "#h=" + code);
    } catch {
    }
    const warn = location.protocol === "file:" ? '<div class="modal-body">\u26A0 Trang \u0111ang m\u1EDF t\u1EEB t\u1EC7p tr\xEAn m\xE1y (file://). Link ch\u1EC9 d\xF9ng \u0111\u01B0\u1EE3c tr\xEAn m\xE1y n\xE0y; h\xE3y d\xF9ng b\u1EA3n tr\xEAn GitHub Pages \u0111\u1EC3 g\u1EEDi cho ng\u01B0\u1EDDi kh\xE1c.</div>' : "";
    await textDialog("Link chia s\u1EBB h\xECnh", url, `<div class="modal-body">G\u1EEDi link n\xE0y: ng\u01B0\u1EDDi nh\u1EADn m\u1EDF ra s\u1EBD th\u1EA5y \u0111\xFAng h\xECnh (to\xE0n b\u1ED9 h\xECnh n\u1EB1m trong link, kh\xF4ng c\u1EA7n m\xE1y ch\u1EE7). \u0110\u1ED9 d\xE0i: ${url.length} k\xFD t\u1EF1.</div>${warn}`);
  }
  function saveFile(app) {
    const doc = compactDoc(docWithView(app));
    const text = JSON.stringify(doc, null, 1);
    const blob = new Blob([text], { type: "application/json" });
    const a = document.createElement("a");
    a.download = `${fileSafeName(app.doc.title || "hinh")}.json`;
    a.href = URL.createObjectURL(blob);
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 1e3);
  }
  function openFile(app) {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = ".json,application/json";
    inp.onchange = async () => {
      const f = inp.files[0];
      if (!f) return;
      try {
        const doc = parseDocJSON(await f.text());
        if (!doc.title) doc.title = f.name.replace(/\.json$/i, "");
        app.loadDoc(doc, { keepHistory: true });
        if (!doc.view) app.zoomFit();
        toast(`\u0110\xE3 m\u1EDF "${f.name}"`);
      } catch (e) {
        await confirmDialog("Kh\xF4ng m\u1EDF \u0111\u01B0\u1EE3c t\u1EC7p", escapeBr(e.message), "OK");
      }
    };
    inp.click();
  }
  function fileSafeName(title) {
    const t = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
    return t || "hinh";
  }
  var escapeBr = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>");
  async function initShare(app) {
    const m = /[#&]h=([A-Za-z0-9_-]+)/.exec(location.hash);
    let loaded = false;
    if (m) {
      try {
        const doc = await decodeDoc(m[1]);
        app.loadDoc(doc);
        if (!doc.view) app.zoomFit();
        loaded = true;
        toast("\u0110\xE3 m\u1EDF h\xECnh t\u1EEB link");
      } catch (e) {
        toast(e.message, 5e3);
      }
    }
    if (!loaded) {
      const d = loadDraft();
      if (d && d.steps.length) {
        app.loadDoc(d);
        toast("\u0110\xE3 kh\xF4i ph\u1EE5c b\u1EA3n nh\xE1p l\u1EA7n tr\u01B0\u1EDBc");
      }
    }
    let timer = null;
    app.on("change", () => {
      clearTimeout(timer);
      timer = setTimeout(() => saveDraft(app), 300);
    });
    app.board.on("boundingbox", () => {
      clearTimeout(timer);
      timer = setTimeout(() => saveDraft(app), 600);
    });
    window.addEventListener("beforeunload", () => saveDraft(app));
  }

  // src/ui/main.js
  function start() {
    const app = new App();
    app.mount();
    bindStepList(app);
    document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("active", x === t));
      document.querySelectorAll(".tabpane").forEach((p) => p.classList.toggle("active", p.id === t.dataset.tab));
    }));
    document.getElementById("exit-projector").onclick = () => app.setProjector(false);
    const sel = document.getElementById("sel-example");
    if (sel) {
      sel.innerHTML = '<option value="">V\xED d\u1EE5\u2026</option>' + Object.entries(EXAMPLES).map(([k, e]) => `<option value="${k}">${e.title}</option>`).join("");
      sel.onchange = () => {
        const ex = EXAMPLES[sel.value];
        sel.value = "";
        if (!ex) return;
        const doc = ex.build();
        doc.title = ex.title;
        app.loadDoc(doc, { keepHistory: true });
        app.zoomFit();
      };
    }
    document.getElementById("btn-share").onclick = () => shareLink(app);
    document.getElementById("btn-save").onclick = () => saveFile(app);
    document.getElementById("btn-open").onclick = () => openFile(app);
    const title = document.getElementById("doc-title");
    app.on("change", () => {
      if (document.activeElement !== title) title.value = app.doc.title || "";
    });
    title.onchange = () => app.commit((doc) => {
      doc.title = title.value.trim();
    });
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveFile(app);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "o") {
        e.preventDefault();
        openFile(app);
      }
    });
    initShare(app).then(() => {
      title.value = app.doc.title || "";
    });
    window.__app = app;
    window.GeoCore = { ...core_exports, Builder, EXAMPLES, codec: codec_exports };
    return app;
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
