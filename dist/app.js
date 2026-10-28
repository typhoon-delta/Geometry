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
    barycentric: () => barycentric,
    centroid: () => centroid,
    circle: () => circle,
    circleTangentAt: () => circleTangentAt,
    circleThrough: () => circleThrough,
    circumcenter: () => circumcenter,
    commonTangent: () => commonTangent,
    cross: () => cross,
    dist: () => dist,
    distPointLine: () => distPointLine,
    distToObject: () => distToObject,
    dot: () => dot,
    excenter: () => excenter,
    finite: () => finite,
    fromBarycentric: () => fromBarycentric,
    homothetyCenter: () => homothetyCenter,
    homothetyPoint: () => homothetyPoint,
    incenter: () => incenter,
    inradius: () => inradius,
    intersect: () => intersect,
    intersectCC: () => intersectCC,
    intersectLC: () => intersectLC,
    intersectLL: () => intersectLL,
    invertPoint: () => invertPoint,
    isogonalConjugate: () => isogonalConjugate,
    isogonalLine: () => isogonalLine,
    kosnita: () => kosnita,
    lemoine: () => lemoine,
    line: () => line,
    lineParam: () => lineParam,
    lineThrough: () => lineThrough,
    mapObject: () => mapObject,
    mid: () => mid,
    mixtilinear: () => mixtilinear,
    mul: () => mul,
    ninePointCenter: () => ninePointCenter,
    norm: () => norm,
    orthocenter: () => orthocenter,
    paramOf: () => paramOf,
    perp: () => perp,
    pointOn: () => pointOn,
    project: () => project,
    pt: () => pt,
    radicalAxis: () => radicalAxis,
    radicalCenter: () => radicalCenter,
    reflectObject: () => reflectObject,
    reflectPointOverLine: () => reflectPointOverLine,
    reflectPointOverPoint: () => reflectPointOverPoint,
    rotatePoint: () => rotatePoint,
    sub: () => sub,
    symmedianFoot: () => symmedianFoot,
    tangentAt: () => tangentAt,
    tangentPoints: () => tangentPoints,
    translatePoint: () => translatePoint,
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
  function rotatePoint(P2, O, deg) {
    const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    const x = P2.x - O.x, y = P2.y - O.y;
    return pt(O.x + c * x - s * y, O.y + s * x + c * y);
  }
  var homothetyPoint = (P2, O, k) => pt(O.x + k * (P2.x - O.x), O.y + k * (P2.y - O.y));
  var translatePoint = (P2, A, B) => pt(P2.x + B.x - A.x, P2.y + B.y - A.y);
  function invertPoint(P2, c) {
    const dx = P2.x - c.c.x, dy = P2.y - c.c.y, d2 = dx * dx + dy * dy;
    if (d2 < EPS * EPS) return null;
    const k = c.r * c.r / d2;
    return pt(c.c.x + k * dx, c.c.y + k * dy);
  }
  function mapObject(X, f) {
    if (!X) return null;
    if (X.kind === "point") return f(X);
    if (X.kind === "line") {
      const a = f(X.p), b = f(add(X.p, X.d));
      return a && b ? line(a, sub(b, a), X.sub) : null;
    }
    if (X.kind === "circle") {
      const c = f(X.c), q = f(add(X.c, { x: X.r, y: 0 }));
      return c && q ? circle(c, dist(c, q)) : null;
    }
    return null;
  }
  function tangentAt(c, P2) {
    const r = sub(P2, c.c);
    if (norm(r) < EPS) return null;
    return line(P2, perp(r));
  }
  function tangentPoints(c, P2) {
    const M = mid(c.c, P2);
    return intersectCC(c, { kind: "circle", c: M, r: dist(M, P2) });
  }
  function commonTangent(c1, c2, internal, which) {
    const D = sub(c2.c, c1.c);
    const d2 = dot(D, D);
    const k = (internal ? -c2.r : c2.r) - c1.r;
    const h2 = d2 - k * k;
    if (d2 < EPS || h2 < -1e-12 * d2) return null;
    const h = Math.sqrt(Math.max(0, h2));
    const sg = which ? 1 : -1;
    const n = { x: (k * D.x + sg * h * -D.y) / d2, y: (k * D.y + sg * h * D.x) / d2 };
    const T1 = { x: c1.c.x - c1.r * n.x, y: c1.c.y - c1.r * n.y };
    const s2 = internal ? -1 : 1;
    const T22 = { x: c2.c.x - s2 * c2.r * n.x, y: c2.c.y - s2 * c2.r * n.y };
    const dir = dist(T1, T22) > EPS ? sub(T22, T1) : perp(n);
    return line(T1, dir);
  }
  function radicalAxis(c1, c2) {
    const D = sub(c2.c, c1.c);
    const d = norm(D);
    if (d < EPS) return null;
    const t = (d * d + c1.r * c1.r - c2.r * c2.r) / (2 * d);
    const u = { x: D.x / d, y: D.y / d };
    return line(pt(c1.c.x + t * u.x, c1.c.y + t * u.y), perp(D));
  }
  function radicalCenter(c1, c2, c3) {
    const a = radicalAxis(c1, c2), b = radicalAxis(c1, c3);
    return a && b ? intersectLL(a, b) : null;
  }
  function homothetyCenter(c1, c2, internal) {
    if (internal) {
      const s2 = c1.r + c2.r;
      return pt((c2.r * c1.c.x + c1.r * c2.c.x) / s2, (c2.r * c1.c.y + c1.r * c2.c.y) / s2);
    }
    const s = c2.r - c1.r;
    if (Math.abs(s) < 1e-12 * Math.max(c1.r, c2.r)) return null;
    return pt((c2.r * c1.c.x - c1.r * c2.c.x) / s, (c2.r * c1.c.y - c1.r * c2.c.y) / s);
  }
  var area2 = (P2, Q, R) => cross(sub(Q, P2), sub(R, P2));
  function barycentric(P2, A, B, C) {
    return [area2(P2, B, C), area2(P2, C, A), area2(P2, A, B)];
  }
  function fromBarycentric(u, v, w, A, B, C) {
    const s = u + v + w;
    const m = Math.max(Math.abs(u), Math.abs(v), Math.abs(w));
    if (!(m > 0) || Math.abs(s) < 1e-12 * m) return null;
    return pt((u * A.x + v * B.x + w * C.x) / s, (u * A.y + v * B.y + w * C.y) / s);
  }
  var sides2 = (A, B, C) => [dist(B, C) ** 2, dist(C, A) ** 2, dist(A, B) ** 2];
  function excenter(A, B, C) {
    if (!triangleOK(A, B, C)) return null;
    const a = dist(B, C), b = dist(C, A), c = dist(A, B);
    return fromBarycentric(-a, b, c, A, B, C);
  }
  function isogonalConjugate(P2, A, B, C) {
    if (!triangleOK(A, B, C)) return null;
    const [u, v, w] = barycentric(P2, A, B, C);
    const sc = Math.abs(area2(A, B, C));
    if ([u, v, w].some((x) => Math.abs(x) < 1e-12 * sc)) return null;
    const [a2, b2, c2] = sides2(A, B, C);
    return fromBarycentric(a2 / u, b2 / v, c2 / w, A, B, C);
  }
  function lemoine(A, B, C) {
    if (!triangleOK(A, B, C)) return null;
    const [a2, b2, c2] = sides2(A, B, C);
    return fromBarycentric(a2, b2, c2, A, B, C);
  }
  function symmedianFoot(A, B, C) {
    if (!triangleOK(A, B, C)) return null;
    const b2 = dist(C, A) ** 2, c2 = dist(A, B) ** 2;
    return pt((b2 * B.x + c2 * C.x) / (b2 + c2), (b2 * B.y + c2 * C.y) / (b2 + c2));
  }
  function kosnita(A, B, C) {
    const N = ninePointCenter(A, B, C);
    return N ? isogonalConjugate(N, A, B, C) : null;
  }
  function isogonalLine(B, A, C, P2) {
    const u = unit(sub(B, A)), v = unit(sub(C, A)), p = sub(P2, A);
    if (!u || !v || norm(p) < EPS) return null;
    let w = add(u, v);
    w = norm(w) < 1e-9 ? perp(u) : unit(w);
    const k = 2 * dot(p, w);
    return line(A, { x: k * w.x - p.x, y: k * w.y - p.y });
  }
  function circleTangentAt(A, B, C) {
    const l1 = line(A, perp(sub(B, A)));
    const l2 = dist(A, C) < EPS ? null : line(mid(A, C), perp(sub(C, A)));
    if (!l1 || !l2) return null;
    const O = intersectLL(l1, l2);
    return O ? circle(O, dist(O, A)) : null;
  }
  function mixtilinear(A, B, C, external = false) {
    const circ = circleThrough(A, B, C);
    if (!circ) return null;
    const u0 = unit(sub(B, A)), v0 = unit(sub(C, A));
    const u = unit(add(u0, v0));
    if (!u) return null;
    const s = Math.abs(cross(u, u0));
    const c2 = 1 - s * s;
    const AO = sub(A, circ.c);
    const t = -2 * (dot(u, AO) + (external ? -1 : 1) * circ.r * s) / c2;
    if (!(t > 0)) return null;
    return circle(pt(A.x + t * u.x, A.y + t * u.y), t * s);
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
    center: {
      // Tâm của một đường tròn (mọi công cụ vẽ đường tròn đều dựng kèm tâm).
      kind: "point",
      args: ["circle"],
      label: "T\xE2m \u0111\u01B0\u1EDDng tr\xF2n",
      compute: ([c]) => pt(c.c.x, c.c.y),
      facts: (s, kinds2, doc) => {
        const c = doc && doc.steps.find((x) => x.id === s.args[0]);
        if (!c || !["circle_3pts", "circumcircle"].includes(c.type)) return [];
        const [A, B, C] = c.args;
        return [{ on: [s.id, { PB: [A, B] }] }, { on: [s.id, { PB: [B, C] }] }, { on: [s.id, { PB: [C, A] }] }];
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
    // ---------- BỔ SUNG (bản 1.1: thư viện công cụ) ----------
    foot: {
      // Hình chiếu của P lên đường thẳng AB (không cần dựng đường AB).
      kind: "point",
      args: ["point", "point", "point"],
      label: "Ch\xE2n \u0111\u01B0\u1EDDng vu\xF4ng g\xF3c",
      compute: ([Q, A, B]) => dist(A, B) < EPS ? null : project(Q, lineThrough(A, B)),
      facts: (s) => {
        const [Q, A, B] = s.args;
        return [{ col: [A, s.id, B] }, { perp: [{ L: [Q, s.id] }, { L: [A, B] }] }];
      }
    },
    reflect_pts: {
      // Điểm đối xứng của P qua đường thẳng AB.
      kind: "point",
      args: ["point", "point", "point"],
      label: "\u0110\u1ED1i x\u1EE9ng qua \u0111\u01B0\u1EDDng th\u1EB3ng",
      compute: ([Q, A, B]) => dist(A, B) < EPS ? null : reflectPointOverLine(Q, lineThrough(A, B)),
      facts: (s) => [{ perp: [{ L: [s.args[0], s.id] }, { L: [s.args[1], s.args[2]] }] }]
    },
    rotate: {
      // Quay đối tượng quanh tâm O một góc (độ, ngược chiều kim đồng hồ).
      kind: "same",
      args: ["obj", "point"],
      params: { angle: 90 },
      label: "Ph\xE9p quay",
      compute: ([X, O], p) => mapObject(X, (P2) => rotatePoint(P2, O, p.angle))
    },
    homothety: {
      kind: "same",
      args: ["obj", "point"],
      params: { k: 2 },
      label: "Ph\xE9p v\u1ECB t\u1EF1",
      compute: ([X, O], p) => mapObject(X, (P2) => homothetyPoint(P2, O, p.k)),
      facts: (s, kinds2) => kinds2[0] === "point" ? [{ col: [s.args[1], s.args[0], s.id] }] : []
    },
    translate: {
      // Tịnh tiến theo vectơ PQ.
      kind: "same",
      args: ["obj", "point", "point"],
      label: "Ph\xE9p t\u1ECBnh ti\u1EBFn",
      compute: ([X, P2, Q]) => mapObject(X, (Z) => translatePoint(Z, P2, Q))
    },
    invert: {
      kind: "point",
      args: ["point", "circle"],
      label: "Ph\xE9p ngh\u1ECBch \u0111\u1EA3o",
      compute: ([P2, c]) => invertPoint(P2, c)
    },
    tangent_at: {
      kind: "line",
      args: ["circle", "point"],
      label: "Ti\u1EBFp tuy\u1EBFn t\u1EA1i m\u1ED9t \u0111i\u1EC3m",
      compute: ([c, P2]) => tangentAt(c, P2),
      facts: (s) => [{ on: [s.args[1], s.id] }, { tan: [s.id, s.args[0]] }]
    },
    tangent_point: {
      // Tiếp điểm của tiếp tuyến kẻ từ P tới đường tròn (which = 0/1).
      kind: "point",
      args: ["circle", "point"],
      params: { which: 0 },
      label: "Ti\u1EBFp \u0111i\u1EC3m",
      compute: ([c, P2], p) => tangentPoints(c, P2)[p.which] || null,
      facts: (s) => [{ on: [s.id, s.args[0]] }, { tan: [{ L: [s.args[1], s.id] }, s.args[0]] }]
    },
    common_tangent: {
      kind: "line",
      args: ["circle", "circle"],
      params: { internal: false, which: 0 },
      label: "Ti\u1EBFp tuy\u1EBFn chung",
      compute: ([a, b], p) => commonTangent(a, b, !!p.internal, p.which),
      facts: (s) => [{ tan: [s.id, s.args[0]] }, { tan: [s.id, s.args[1]] }]
    },
    radical_axis: {
      kind: "line",
      args: ["circle", "circle"],
      label: "Tr\u1EE5c \u0111\u1EB3ng ph\u01B0\u01A1ng",
      compute: ([a, b]) => radicalAxis(a, b)
    },
    radical_center: {
      kind: "point",
      args: ["circle", "circle", "circle"],
      label: "T\xE2m \u0111\u1EB3ng ph\u01B0\u01A1ng",
      compute: ([a, b, c]) => radicalCenter(a, b, c)
    },
    homothety_center: {
      kind: "point",
      args: ["circle", "circle"],
      params: { internal: false },
      label: "T\xE2m v\u1ECB t\u1EF1",
      compute: ([a, b], p) => homothetyCenter(a, b, !!p.internal)
    },
    excenter: {
      // Tâm bàng tiếp đối diện đỉnh thứ nhất (A).
      kind: "point",
      args: ["point", "point", "point"],
      label: "T\xE2m b\xE0ng ti\u1EBFp",
      tag: "excenter",
      compute: tri(excenter)
    },
    excircle: {
      kind: "circle",
      args: ["point", "point", "point"],
      label: "\u0110\u01B0\u1EDDng tr\xF2n b\xE0ng ti\u1EBFp",
      tag: "excircle",
      compute: tri((A, B, C) => {
        const J = excenter(A, B, C);
        return J ? circle(J, distPointLine(J, lineThrough(B, C))) : null;
      }),
      facts: (s) => {
        const [A, B, C] = s.args;
        return [{ tan: [s.id, { L: [B, C] }] }, { tan: [s.id, { L: [C, A] }] }, { tan: [s.id, { L: [A, B] }] }];
      }
    },
    isogonal_conjugate: {
      kind: "point",
      args: ["point", "point", "point", "point"],
      label: "\u0110i\u1EC3m li\xEAn h\u1EE3p \u0111\u1EB3ng gi\xE1c",
      compute: ([P2, A, B, C]) => isogonalConjugate(P2, A, B, C)
    },
    lemoine: {
      kind: "point",
      args: ["point", "point", "point"],
      label: "\u0110i\u1EC3m Lemoine",
      tag: "K",
      compute: tri(lemoine)
    },
    kosnita: {
      kind: "point",
      args: ["point", "point", "point"],
      label: "\u0110i\u1EC3m Kosnita",
      compute: tri(kosnita)
    },
    symmedian_foot: {
      // Chân đường đối trung từ A trên BC.
      kind: "point",
      args: ["point", "point", "point"],
      label: "Ch\xE2n \u0111\u01B0\u1EDDng \u0111\u1ED1i trung",
      compute: tri(symmedianFoot),
      facts: (s) => [{ col: [s.args[1], s.id, s.args[2]] }]
    },
    cevian_foot: {
      // Giao của AP với BC (args: P, A, B, C).
      kind: "point",
      args: ["point", "point", "point", "point"],
      label: "Ch\xE2n \u0111\u01B0\u1EDDng Cevian",
      compute: ([P2, A, B, C]) => dist(A, P2) < EPS || dist(B, C) < EPS ? null : intersectLL(lineThrough(A, P2), lineThrough(B, C)),
      facts: (s) => {
        const [P2, A, B, C] = s.args;
        return [{ col: [B, s.id, C] }, { col: [A, P2, s.id] }];
      }
    },
    isogonal_line: {
      // Đường đẳng giác của AP trong góc BAC (args: B, A, C, P; đỉnh là đối số thứ hai).
      kind: "line",
      args: ["point", "point", "point", "point"],
      label: "\u0110\u01B0\u1EDDng \u0111\u1EB3ng gi\xE1c",
      compute: ([B, A, C, P2]) => isogonalLine(B, A, C, P2),
      facts: (s) => [{ on: [s.args[1], s.id] }]
    },
    circle_tangent_at: {
      // Đường tròn tiếp xúc AB tại A và đi qua C.
      kind: "circle",
      args: ["point", "point", "point"],
      label: "\u0110\u01B0\u1EDDng tr\xF2n ti\u1EBFp x\xFAc AB t\u1EA1i A, qua C",
      compute: ([A, B, C]) => circleTangentAt(A, B, C),
      facts: (s) => [{ on: [s.args[0], s.id] }, { on: [s.args[2], s.id] }, { tan: [s.id, { L: [s.args[0], s.args[1]] }] }]
    },
    mixtilinear: {
      kind: "circle",
      args: ["point", "point", "point"],
      params: { external: false },
      label: "\u0110\u01B0\u1EDDng tr\xF2n mixtilinear",
      compute: ([A, B, C], p) => triangleOK(A, B, C) ? mixtilinear(A, B, C, !!p.external) : null,
      facts: (s) => {
        const [A, B, C] = s.args;
        return [{ tan: [s.id, { L: [A, B] }] }, { tan: [s.id, { L: [A, C] }] }, { tan: [s.id, { C: [A, B, C] }] }];
      }
    },
    circle_diameter: {
      kind: "circle",
      args: ["point", "point"],
      label: "\u0110\u01B0\u1EDDng tr\xF2n \u0111\u01B0\u1EDDng k\xEDnh",
      compute: ([A, B]) => circle(mid(A, B), dist(A, B) / 2),
      facts: (s) => [{ on: [s.args[0], s.id] }, { on: [s.args[1], s.id] }]
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
    for (const s of doc.steps) vals.set(s.id, computeStep(s, vals, overrides));
    return vals;
  }
  function computeStep(s, vals, overrides = null) {
    const def = STEP_TYPES[s.type];
    if (!def) return null;
    const variadic = def.args[0] === "...point";
    const argVals = new Array(s.args.length);
    for (let i = 0; i < s.args.length; i++) {
      const a = vals.get(s.args[i]);
      if (!a || !argAccepts(variadic ? "...point" : def.args[i], a.kind)) return null;
      argVals[i] = a;
    }
    const p = overrides && overrides.has(s.id) ? { ...paramsOf(s), ...overrides.get(s.id) } : paramsOf(s);
    let v;
    try {
      v = def.compute(argVals, p) || null;
    } catch {
      v = null;
    }
    if (v && def.kind !== "mark" && !valueFinite(v)) v = null;
    return v;
  }
  function makeUpdater(doc, changedIds) {
    const need = dependents(doc, changedIds);
    for (const id of changedIds) need.add(id);
    const plan = doc.steps.filter((s) => need.has(s.id));
    const update = (vals) => {
      for (const s of plan) vals.set(s.id, computeStep(s, vals));
      return vals;
    };
    update.size = plan.length;
    return update;
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
      case "perpendicular":
        return `${s.name} (\u22A5 ${describe(doc, s.args[1])} qua ${n(s.args[0])})`;
      case "parallel":
        return `${s.name} (\u2225 ${describe(doc, s.args[1])} qua ${n(s.args[0])})`;
      case "perp_bisector":
        return `${s.name} (trung tr\u1EF1c ${names})`;
      case "angle_bisector":
        return `${s.name} (ph\xE2n gi\xE1c ${s.params?.external ? "ngo\xE0i " : ""}g\xF3c ${names})`;
      case "circle_radius":
        return `(${n(s.args[0])}, ${n(s.args[1])}${n(s.args[2])})`;
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

  // src/core/apply.js
  function addSpecs(doc, specs, { join = true } = {}) {
    const ids = [];
    const k = kinds(doc);
    const used = (n) => doc.steps.some((s) => s.name === n);
    specs.forEach((sp, i) => {
      const def = STEP_TYPES[sp.type];
      if (!def) throw new Error("Lo\u1EA1i b\u01B0\u1EDBc kh\xF4ng r\xF5: " + sp.type);
      const id = newId(doc);
      const args = sp.args.map((a) => typeof a === "string" && a.startsWith("$") ? ids[+a.slice(1)] : a);
      const kind = def.kind === "same" ? k.get(args[0]) : def.kind;
      const step = { id, type: sp.type, args };
      if (sp.params && Object.keys(sp.params).length) step.params = { ...sp.params };
      if (kind !== "mark") step.name = sp.name && !used(sp.name) ? sp.name : nextName(doc, kind, sp.name);
      if (sp.style && Object.keys(sp.style).length) step.style = { ...sp.style };
      if (sp.hidden) step.hidden = true;
      if (i > 0 && join) step.joinPrev = true;
      doc.steps.push(step);
      k.set(id, kind);
      ids.push(id);
    });
    return ids;
  }

  // src/core/names.js
  function parseLabel(name) {
    const s = String(name ?? "");
    let m = /^(.+?)('*)_\{([^}]*)\}('*)$/.exec(s) || /^(.+?)('*)_([^_{}']+)('*)$/.exec(s);
    if (m) return { base: m[1], sub: m[3], primes: (m[2] + m[4]).length };
    m = /^(.*?[^\d'])('*)(\d+)('*)$/.exec(s);
    if (m) return { base: m[1], sub: m[3], primes: (m[2] + m[4]).length };
    m = /^(.*?)('+)$/.exec(s);
    if (m && m[1]) return { base: m[1], sub: "", primes: m[2].length };
    return { base: s, sub: "", primes: 0 };
  }
  var escHTML = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  function labelHTML(name) {
    if (!name) return "";
    const { base, sub: sub3, primes } = parseLabel(name);
    return `<i class="lb">${escHTML(base)}${"\u2032".repeat(primes)}${sub3 ? `<sub>${escHTML(sub3)}</sub>` : ""}</i>`;
  }
  var GREEK = { "\u03B1": "\\alpha", "\u03B2": "\\beta", "\u03B3": "\\gamma", "\u03B4": "\\delta", "\u0394": "\\Delta", "\u03B5": "\\varepsilon", "\u03B8": "\\theta", "\u03BB": "\\lambda", "\u03BC": "\\mu", "\u03C0": "\\pi", "\u03C1": "\\rho", "\u03C3": "\\sigma", "\u03C6": "\\varphi", "\u03C9": "\\omega", "\u03A9": "\\Omega", "\u0393": "\\Gamma" };
  var texText = (s) => s.replace(/[αβγδΔεθλμπρσφωΩΓ]/g, (c) => GREEK[c] + " ").replace(/[#$%&{}]/g, (c) => "\\" + c).trim();
  function texLabel(name) {
    const { base, sub: sub3, primes } = parseLabel(name);
    const b = texText(base);
    const p = "'".repeat(primes);
    if (!sub3) return `$${b}${p}$`;
    const sb = texText(sub3);
    return sb.length === 1 ? `$${b}${p}_${sb}$` : `$${b}${p}_{${sb}}$`;
  }

  // src/core/labels.js
  var N_DIR = 16;
  function autoLabelDirs(doc, values, isShown = (s) => !s.hidden) {
    const k = kinds(doc);
    const shown = doc.steps.filter((s) => isShown(s) && values.get(s.id));
    const pts = shown.filter((s) => k.get(s.id) === "point");
    const curves = shown.filter((s) => k.get(s.id) === "line" || k.get(s.id) === "circle");
    if (!pts.length) return /* @__PURE__ */ new Map();
    let cx = 0, cy = 0, x1 = Infinity, x2 = -Infinity, y1 = Infinity, y2 = -Infinity;
    for (const s of pts) {
      const v = values.get(s.id);
      cx += v.x;
      cy += v.y;
      x1 = Math.min(x1, v.x);
      x2 = Math.max(x2, v.x);
      y1 = Math.min(y1, v.y);
      y2 = Math.max(y2, v.y);
    }
    cx /= pts.length;
    cy /= pts.length;
    const scale = Math.max(x2 - x1, y2 - y1, 1e-9);
    const near = 0.12 * scale;
    const out = /* @__PURE__ */ new Map();
    for (const s of pts) {
      if (s.style && s.style.labelOffset) continue;
      const P2 = values.get(s.id);
      const blocked = [];
      for (const c of curves) {
        const v = values.get(c.id);
        if (distToObject(v, P2) > 1e-6 * scale) continue;
        if (v.kind === "line") {
          const a = Math.atan2(v.d.y, v.d.x);
          const t = lineParam(P2, v);
          const sub3 = c.type === "segment" ? "segment" : c.type === "ray" ? "ray" : v.sub;
          const fwd = sub3 === "line" || (sub3 === "ray" ? true : t < 1 - 1e-9);
          const back = sub3 === "line" || t > 1e-9;
          if (fwd) blocked.push([a, 1]);
          if (back) blocked.push([a + Math.PI, 1]);
        } else {
          const a = Math.atan2(P2.y - v.c.y, P2.x - v.c.x);
          blocked.push([a + Math.PI / 2, 1], [a - Math.PI / 2, 1], [a + Math.PI, 0.4]);
        }
      }
      for (const o of pts) {
        if (o === s) continue;
        const Q = values.get(o.id);
        const d = dist(P2, Q);
        if (d > 1e-9 && d < near) blocked.push([Math.atan2(Q.y - P2.y, Q.x - P2.x), 0.8]);
      }
      const away = Math.atan2(P2.y - cy, P2.x - cx);
      const hasAway = Math.hypot(P2.x - cx, P2.y - cy) > 0.02 * scale;
      let best = Math.PI / 4, bestScore = -Infinity;
      for (let i = 0; i < N_DIR; i++) {
        const th = 2 * Math.PI * i / N_DIR;
        let gap = Math.PI;
        for (const [a, w] of blocked) gap = Math.min(gap, angDiff(th, a) / w);
        let score = Math.min(gap, Math.PI / 2) * 2;
        if (hasAway) score += 0.5 * Math.cos(angDiff(th, away));
        score += 0.05 * Math.cos(angDiff(th, Math.PI / 4));
        if (score > bestScore) {
          bestScore = score;
          best = th;
        }
      }
      out.set(s.id, { x: Math.cos(best), y: Math.sin(best) });
    }
    return out;
  }
  function angDiff(a, b) {
    let d = Math.abs(a - b) % (2 * Math.PI);
    return d > Math.PI ? 2 * Math.PI - d : d;
  }

  // src/core/styles.js
  var THEMES = {
    mono: { id: "mono", label: "\u0110\u01A1n s\u1EAFc", ink: "#000000" },
    textbook: { id: "textbook", label: "S\xE1ch gi\xE1o khoa", ink: "#1f2937" }
  };
  var PALETTE = [
    { name: "\u0110en", hex: "#111827" },
    { name: "Xanh d\u01B0\u01A1ng", hex: "#3b6fb6" },
    { name: "\u0110\u1ECF", hex: "#c0504d" },
    { name: "Xanh l\xE1", hex: "#4e8f5a" },
    { name: "Cam", hex: "#d9822b" },
    { name: "T\xEDm", hex: "#7d5ba6" },
    { name: "Xanh ng\u1ECDc", hex: "#2f8f9d" },
    { name: "X\xE1m", hex: "#8a8f98" }
  ];
  var BY_KIND = {
    mono: {
      point: { color: "#000000", fillColor: "#ffffff", size: 3, hollow: true, showLabel: true, labelColor: "#000000" },
      line: { color: "#000000", width: 1, dash: false, showLabel: false },
      circle: { color: "#000000", width: 1, dash: false, fill: 0, showLabel: false },
      mark: { color: "#000000", width: 1 }
    },
    textbook: {
      point: { color: "#1f2937", size: 3.2, showLabel: true, labelColor: "#1f2937" },
      line: { color: "#1f2937", width: 1.4, dash: false, showLabel: false },
      circle: { color: "#1f2937", width: 1.4, dash: false, fill: 0, showLabel: false },
      mark: { color: "#c0504d", width: 1.4 }
    }
  };
  var BY_TYPE = {
    mono: {
      polygon: { color: "#000000", fill: 0.07 },
      angle_mark: { arcs: 1 },
      segment_mark: { ticks: 1 }
    },
    textbook: {
      free_point: { fillColor: "#c0504d" },
      point_on: { fillColor: "#d9822b" },
      circumcircle: { color: "#3b6fb6" },
      incircle: { color: "#4e8f5a" },
      excircle: { color: "#4e8f5a" },
      nine_point_circle: { color: "#7d5ba6" },
      polygon: { color: "#3b6fb6", fill: 0.12 },
      angle_mark: { color: "#c0504d", arcs: 1 },
      segment_mark: { color: "#c0504d", ticks: 1 }
    }
  };
  var current = "mono";
  function setTheme(id) {
    if (THEMES[id]) current = id;
    return current;
  }
  function styleOf(step, kind, theme = current) {
    const t = BY_KIND[theme] ? theme : "mono";
    const st = { ...BY_KIND[t][kind || "mark"], ...BY_TYPE[t][step.type] || {}, ...step.style || {} };
    if (kind === "point" && step.style && step.style.color && !step.style.fillColor) {
      st.fillColor = step.style.color;
      st.hollow = false;
    }
    return st;
  }
  var isDraggableType = (type) => type === "free_point" || type === "point_on";

  // src/ui/render.js
  var LABEL = { mono: { dist: 11, font: 15 }, textbook: { dist: 13, font: 16 } };
  var HALO = "rgba(96,165,250,0.45)";
  var RELATION = "#f59e0b";
  var LABEL_FONT = "'Times New Roman', 'Nimbus Roman', 'Liberation Serif', 'TeX Gyre Termes', Times, serif";
  var Renderer = class {
    constructor(view) {
      this.view = view;
      this.values = /* @__PURE__ */ new Map();
      this.items = [];
      this.extra = [];
      this.scale = 1;
      this.grid = false;
      this.labelOffsets = /* @__PURE__ */ new Map();
      this.labelBoxes = /* @__PURE__ */ new Map();
      this.drawnIds = /* @__PURE__ */ new Set();
      view.painter = (ctx, v) => this.draw(ctx, v);
    }
    /**
     * Thiết lập cảnh (sau mỗi thay đổi tài liệu, chọn, chế độ…).
     * opts.visible: Set id được hiện (chế độ trình bày) hoặc null = tất cả
     * opts.selected, opts.highlight: Set id
     */
    setScene(doc, values, opts = {}) {
      this.doc = doc;
      this.values = values;
      const k = kinds(doc);
      const visible = opts.visible || null;
      const selected = opts.selected || /* @__PURE__ */ new Set();
      const highlight = opts.highlight || /* @__PURE__ */ new Set();
      const theme = this.theme = opts.theme || "mono";
      const L = LABEL[theme] || LABEL.mono;
      const order = { polygon: 0, circle: 1, line: 2, mark: 3, point: 4 };
      const layer = (s, kind) => order[s.type === "polygon" ? "polygon" : kind] ?? 3;
      this.items = doc.steps.filter((s) => !s.hidden && (!visible || visible.has(s.id))).map((s) => {
        const kind = k.get(s.id);
        return { s, kind, st: styleOf(s, kind, theme), sel: selected.has(s.id), hl: highlight.has(s.id), layer: layer(s, kind) };
      }).sort((a, b) => a.layer - b.layer);
      const dirs = autoLabelDirs(doc, values, (s) => !s.hidden && (!visible || visible.has(s.id)));
      this.labelOffsets = /* @__PURE__ */ new Map();
      for (const it of this.items) {
        if (it.kind !== "point") continue;
        const d = dirs.get(it.s.id) || { x: 0.7, y: 0.7 };
        this.labelOffsets.set(it.s.id, it.st.labelOffset || [Math.round(d.x * L.dist), Math.round(d.y * L.dist)]);
      }
      this.view.requestDraw();
    }
    /** Toạ độ đã đổi (đang kéo): chỉ cần vẽ lại. */
    update(values) {
      this.values = values;
      this.view.requestDraw();
    }
    clearExtra() {
      this.extra = [];
      this.view.requestDraw();
    }
    /** spec: {type:'segment'|'line'|'ray'|'circle'|'circle3'|'point', pts:[() => {x,y}], style} */
    addExtra(spec) {
      this.extra.push(spec);
      this.view.requestDraw();
      return spec;
    }
    setLabelOffset(id, off) {
      this.labelOffsets.set(id, off);
      this.view.requestDraw();
    }
    // ================= vẽ =================
    draw(ctx, view) {
      const sc = this.scale;
      const V = this.values;
      this.drawnIds = /* @__PURE__ */ new Set();
      this.labelBoxes = /* @__PURE__ */ new Map();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (this.grid) drawGrid(ctx, view);
      const labels = [];
      for (const it of this.items) {
        const v = V.get(it.s.id);
        if (!v) continue;
        this.drawnIds.add(it.s.id);
        const { s, kind, st, sel, hl } = it;
        const color = hl ? RELATION : st.color;
        const width = (st.width || 1) * sc * (hl ? 1.8 : 1);
        if (kind === "line") {
          const sub3 = s.type === "segment" ? "segment" : s.type === "ray" ? "ray" : v.sub;
          if (sel) strokeLine(ctx, view, v, sub3, HALO, width + 7 * sc, false);
          strokeLine(ctx, view, v, sub3, color, width, st.dash);
          if (st.showLabel && s.name) labels.push({ id: s.id, name: s.name, at: lineLabelPos(view, v, sub3), color, off: [0, 10] });
        } else if (kind === "circle") {
          const c = view.toScreen(v.c), r = v.r * view.scale;
          if (st.fill) fillCircle(ctx, c, r, st.fillColor || st.color, st.fill);
          if (sel) strokeCircle(ctx, c, r, HALO, width + 7 * sc, false);
          strokeCircle(ctx, c, r, color, width, st.dash);
          if (st.showLabel && s.name) labels.push({ id: s.id, name: s.name, at: { x: c.x + r * 0.707, y: c.y - r * 0.707 }, color, off: [8, 8] });
        } else if (s.type === "polygon") {
          const pts = v.pts.map((p) => view.toScreen(p));
          ctx.beginPath();
          pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
          ctx.closePath();
          ctx.globalAlpha = sel ? Math.min(1, (st.fill ?? 0.12) + 0.15) : st.fill ?? 0.12;
          ctx.fillStyle = st.fillColor || color;
          ctx.fill();
          ctx.globalAlpha = 1;
          if (st.border) {
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.setLineDash([]);
            ctx.stroke();
          }
        } else if (s.type === "angle_mark" || s.type === "segment_mark") {
          const px = 1 / view.scale;
          const [X, Y] = s.type === "angle_mark" ? angleMarkPath(v, st, px, sc) : segMarkPath(v, st, px, sc);
          strokePath(ctx, view, X, Y, sel ? "#60a5fa" : color, width * (sel ? 1.8 : 1));
        } else if (kind === "point") {
          const p = view.toScreen(v);
          const size = (st.size || 3) * sc * (hl ? 1.4 : 1);
          if (sel) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, size + 6 * sc, 0, 2 * Math.PI);
            ctx.fillStyle = HALO;
            ctx.fill();
          }
          drawPoint(ctx, p, size, hl ? RELATION : st.color, hl ? RELATION : st.fillColor || st.color, sc, st.hollow && !hl);
          if (st.showLabel && s.name) labels.push({ id: s.id, name: s.name, at: p, color: hl ? "#b45309" : st.labelColor || "#111827", off: this.labelOffsets.get(s.id) || [9, 9], point: true });
        }
      }
      for (const e of this.extra) drawExtra(ctx, view, e, sc);
      const fontPx = (LABEL[this.theme] || LABEL.mono).font * sc;
      for (const L of labels) {
        const box = drawLabel(ctx, L.name, L.at.x + L.off[0] * sc, L.at.y - L.off[1] * sc, fontPx, L.color);
        if (L.point) this.labelBoxes.set(L.id, box);
      }
    }
  };
  function setStroke(ctx, color, width, dash) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dash ? [6, 4] : []);
  }
  function clip(p, d, x1, y1, x2, y2, tMin = -Infinity, tMax = Infinity) {
    let t0 = tMin, t1 = tMax;
    for (const [pp, dd, lo, hi] of [[p.x, d.x, x1, x2], [p.y, d.y, y1, y2]]) {
      if (Math.abs(dd) < 1e-12) {
        if (pp < lo || pp > hi) return null;
        continue;
      }
      let a = (lo - pp) / dd, b = (hi - pp) / dd;
      if (a > b) [a, b] = [b, a];
      t0 = Math.max(t0, a);
      t1 = Math.min(t1, b);
    }
    return t0 < t1 ? [t0, t1] : null;
  }
  function screenLine(view, v, sub3) {
    const p = view.toScreen(v.p);
    const q = view.toScreen({ x: v.p.x + v.d.x, y: v.p.y + v.d.y });
    const d = { x: q.x - p.x, y: q.y - p.y };
    const m = 20;
    const r = clip(p, d, -m, -m, view.W + m, view.H + m, sub3 === "line" ? -Infinity : 0, sub3 === "segment" ? 1 : Infinity);
    if (!r) return null;
    return [{ x: p.x + r[0] * d.x, y: p.y + r[0] * d.y }, { x: p.x + r[1] * d.x, y: p.y + r[1] * d.y }];
  }
  function strokeLine(ctx, view, v, sub3, color, width, dash) {
    const seg = screenLine(view, v, sub3);
    if (!seg) return;
    setStroke(ctx, color, width, dash);
    ctx.beginPath();
    ctx.moveTo(seg[0].x, seg[0].y);
    ctx.lineTo(seg[1].x, seg[1].y);
    ctx.stroke();
  }
  function lineLabelPos(view, v, sub3) {
    const seg = screenLine(view, v, sub3);
    if (!seg) return { x: -1e4, y: -1e4 };
    const t = sub3 === "segment" ? 0.5 : 0.85;
    return { x: seg[0].x + t * (seg[1].x - seg[0].x), y: seg[0].y + t * (seg[1].y - seg[0].y) };
  }
  function strokeCircle(ctx, c, r, color, width, dash) {
    if (!(r > 0) || r > 1e7) return;
    setStroke(ctx, color, width, dash);
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, 2 * Math.PI);
    ctx.stroke();
  }
  function fillCircle(ctx, c, r, color, alpha) {
    if (!(r > 0) || r > 1e7) return;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, 2 * Math.PI);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  function drawPoint(ctx, p, size, stroke, fill, sc, hollow) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, size, 0, 2 * Math.PI);
    ctx.fillStyle = hollow ? "#ffffff" : fill;
    ctx.fill();
    ctx.setLineDash([]);
    ctx.lineWidth = Math.max(1, 1 * sc);
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
  function strokePath(ctx, view, X, Y, color, width) {
    setStroke(ctx, color, width, false);
    ctx.beginPath();
    let pen = false;
    for (let i = 0; i < X.length; i++) {
      if (!Number.isFinite(X[i])) {
        pen = false;
        continue;
      }
      const p = view.toScreen({ x: X[i], y: Y[i] });
      if (pen) ctx.lineTo(p.x, p.y);
      else {
        ctx.moveTo(p.x, p.y);
        pen = true;
      }
    }
    ctx.stroke();
  }
  function drawGrid(ctx, view) {
    if (view.scale < 6) return;
    const [x1, y1, x2, y2] = view.getBoundingBox();
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    for (let x = Math.ceil(x1); x <= x2; x++) {
      const s = view.toScreen({ x, y: 0 }).x;
      ctx.moveTo(s, 0);
      ctx.lineTo(s, view.H);
    }
    for (let y = Math.ceil(y2); y <= y1; y++) {
      const s = view.toScreen({ x: 0, y }).y;
      ctx.moveTo(0, s);
      ctx.lineTo(view.W, s);
    }
    ctx.stroke();
  }
  var labelCache = /* @__PURE__ */ new Map();
  function measureLabel(ctx, name, fontPx) {
    const key = name + "|" + fontPx;
    let m = labelCache.get(key);
    if (m) return m;
    const { base, sub: sub3, primes } = parseLabel(name);
    const subPx = Math.round(fontPx * 0.68);
    m = { base, sub: sub3, pr: "\u2032".repeat(primes), fBase: `italic ${fontPx}px ${LABEL_FONT}`, fPr: `${fontPx}px ${LABEL_FONT}`, fSub: `italic ${subPx}px ${LABEL_FONT}` };
    ctx.font = m.fBase;
    m.wBase = ctx.measureText(base).width;
    ctx.font = m.fPr;
    m.wPr = m.pr ? ctx.measureText(m.pr).width : 0;
    ctx.font = m.fSub;
    m.wSub = sub3 ? ctx.measureText(sub3).width + 1 : 0;
    m.w = m.wBase + m.wPr + m.wSub;
    if (labelCache.size > 2e3) labelCache.clear();
    labelCache.set(key, m);
    return m;
  }
  function drawLabel(ctx, name, cx, cy, fontPx, color) {
    const m = measureLabel(ctx, name, fontPx);
    const x0 = cx - m.w / 2;
    const baseline = cy + fontPx * 0.33;
    ctx.fillStyle = color;
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.font = m.fBase;
    ctx.fillText(m.base, x0, baseline);
    if (m.pr) {
      ctx.font = m.fPr;
      ctx.fillText(m.pr, x0 + m.wBase, baseline);
    }
    if (m.sub) {
      ctx.font = m.fSub;
      ctx.fillText(m.sub, x0 + m.wBase + m.wPr + 0.5, baseline + fontPx * 0.22);
    }
    return { x: x0 - 2, y: cy - fontPx * 0.6, w: m.w + 4, h: fontPx * 1.25 };
  }
  function drawExtra(ctx, view, e, sc) {
    const P2 = e.pts.map((f) => f());
    if (P2.some((p) => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y))) return;
    const st = { color: "#9ca3af", width: 1.5, dash: true, ...e.style || {} };
    const w = st.width * sc;
    if (e.type === "segment" || e.type === "line" || e.type === "ray") {
      const d = { x: P2[1].x - P2[0].x, y: P2[1].y - P2[0].y };
      if (Math.hypot(d.x, d.y) < 1e-12) return;
      strokeLine(ctx, view, { p: P2[0], d }, e.type, st.color, w, st.dash);
    } else if (e.type === "circle") {
      strokeCircle(ctx, view.toScreen(P2[0]), Math.hypot(P2[1].x - P2[0].x, P2[1].y - P2[0].y) * view.scale, st.color, w, st.dash);
    } else if (e.type === "circle3") {
      const [A, B, C] = P2;
      const d = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));
      if (Math.abs(d) < 1e-12) return;
      const a2 = A.x * A.x + A.y * A.y, b2 = B.x * B.x + B.y * B.y, c2 = C.x * C.x + C.y * C.y;
      const O = { x: (a2 * (B.y - C.y) + b2 * (C.y - A.y) + c2 * (A.y - B.y)) / d, y: (a2 * (C.x - B.x) + b2 * (A.x - C.x) + c2 * (B.x - A.x)) / d };
      strokeCircle(ctx, view.toScreen(O), Math.hypot(A.x - O.x, A.y - O.y) * view.scale, st.color, w, st.dash);
    } else if (e.type === "polyline") {
      setStroke(ctx, st.color, w, st.dash);
      ctx.beginPath();
      P2.forEach((p, i) => {
        const q = view.toScreen(p);
        if (i) ctx.lineTo(q.x, q.y);
        else ctx.moveTo(q.x, q.y);
      });
      ctx.stroke();
    } else if (e.type === "point") {
      drawPoint(ctx, view.toScreen(P2[0]), (st.size || 7) * sc, st.color, st.fill || "#fde68a", sc);
    }
  }
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

  // src/ui/view.js
  var CanvasView = class {
    constructor(host) {
      this.host = host;
      this.canvas = document.createElement("canvas");
      this.canvas.className = "board-canvas";
      host.appendChild(this.canvas);
      this.ctx = this.canvas.getContext("2d");
      this.cx = 0;
      this.cy = 0;
      this.scale = 40;
      this.W = 0;
      this.H = 0;
      this.painter = null;
      this.frameHooks = [];
      this.listeners = [];
      this.frameRequested = false;
      this.resize();
      if (typeof ResizeObserver !== "undefined") new ResizeObserver(() => this.resize()).observe(host);
      else window.addEventListener("resize", () => this.resize());
    }
    resize() {
      const r = this.host.getBoundingClientRect();
      const W = Math.max(1, Math.round(r.width)), H = Math.max(1, Math.round(r.height));
      const dpr = window.devicePixelRatio || 1;
      if (W === this.W && H === this.H && dpr === this.dpr) return;
      this.W = W;
      this.H = H;
      this.dpr = dpr;
      this.canvas.width = Math.round(W * dpr);
      this.canvas.height = Math.round(H * dpr);
      this.canvas.style.width = W + "px";
      this.canvas.style.height = H + "px";
      this.drawNow();
    }
    /** Đăng ký hàm gọi khi khung nhìn đổi (dời/phóng). */
    onViewChange(fn) {
      this.listeners.push(fn);
    }
    viewChanged() {
      for (const fn of this.listeners) fn(this);
    }
    toScreen(P2) {
      return { x: this.W / 2 + (P2.x - this.cx) * this.scale, y: this.H / 2 - (P2.y - this.cy) * this.scale };
    }
    toUser(sx, sy) {
      return { x: this.cx + (sx - this.W / 2) / this.scale, y: this.cy - (sy - this.H / 2) / this.scale };
    }
    /** [xTrái, yTrên, xPhải, yDưới] (cùng quy ước với JSXGraph trước đây, để tương thích tệp cũ). */
    getBoundingBox() {
      const a = this.toUser(0, 0), b = this.toUser(this.W, this.H);
      return [a.x, a.y, b.x, b.y];
    }
    setBoundingBox([x1, y1, x2, y2]) {
      const w = Math.abs(x2 - x1), h = Math.abs(y1 - y2);
      if (!(w > 0) || !(h > 0)) return;
      this.scale = Math.min(this.W / w, this.H / h);
      this.cx = (x1 + x2) / 2;
      this.cy = (y1 + y2) / 2;
      this.requestDraw();
      this.viewChanged();
    }
    panBy(dx, dy) {
      this.cx -= dx / this.scale;
      this.cy += dy / this.scale;
      this.requestDraw();
      this.viewChanged();
    }
    zoomAt(sx, sy, factor) {
      const P2 = this.toUser(sx, sy);
      this.scale = Math.min(1e5, Math.max(0.02, this.scale * factor));
      this.cx = P2.x - (sx - this.W / 2) / this.scale;
      this.cy = P2.y + (sy - this.H / 2) / this.scale;
      this.requestDraw();
      this.viewChanged();
    }
    /** Xin vẽ lại; nhiều lần xin trong cùng một khung chỉ vẽ một lần. */
    requestDraw() {
      if (this.frameRequested || this.drawing) return;
      this.frameRequested = true;
      requestAnimationFrame(() => {
        this.frameRequested = false;
        this.drawNow();
      });
    }
    drawNow() {
      this.drawing = true;
      try {
        for (const f of this.frameHooks) f();
        const ctx = this.ctx;
        ctx.setTransform(this.dpr || 1, 0, 0, this.dpr || 1, 0, 0);
        ctx.clearRect(0, 0, this.W, this.H);
        if (this.painter) this.painter(ctx, this);
      } finally {
        this.drawing = false;
      }
    }
  };

  // src/ui/library.js
  var AUX_STYLE = { dash: true, color: "#9ca3af" };
  var P3 = ["point", "point", "point"];
  var TRI = ["Ch\u1ECDn \u0111\u1EC9nh A", "Ch\u1ECDn \u0111\u1EC9nh B", "Ch\u1ECDn \u0111\u1EC9nh C"];
  var TRI_P = ["Ch\u1ECDn \u0111\u1EC9nh A", "Ch\u1ECDn \u0111\u1EC9nh B", "Ch\u1ECDn \u0111\u1EC9nh C", "Ch\u1ECDn \u0111i\u1EC3m P"];
  var sub2 = (n) => n ? `_${n.length > 1 ? `{${n}}` : n}` : "";
  var Specs = class {
    constructor(ctx) {
      this.ctx = ctx;
      this.list = [];
      this.vals = /* @__PURE__ */ new Map();
    }
    val(ref) {
      return ref.startsWith("$") ? this.vals.get(ref) : this.ctx.values.get(ref);
    }
    /** Thêm bước; trả về tham chiếu '$k'. opts: {name, params, style, hidden} */
    add(type, args, opts = {}) {
      const def = STEP_TYPES[type];
      const ref = "$" + this.list.length;
      this.list.push({ type, args, ...opts });
      let v = null;
      try {
        const argv = args.map((a) => this.val(a));
        if (argv.every(Boolean)) v = def.compute(argv, { ...def.params || {}, ...opts.params || {} });
      } catch {
        v = null;
      }
      this.vals.set(ref, v || null);
      return ref;
    }
    /** Như add cho một điểm, nhưng dùng lại điểm đã có nếu trùng. */
    point(type, args, opts = {}) {
      const def = STEP_TYPES[type];
      let v = null;
      try {
        v = def.compute(args.map((a) => this.val(a)), { ...def.params || {}, ...opts.params || {} });
      } catch {
        v = null;
      }
      if (v && v.kind === "point") {
        for (const [ref, w] of this.vals) if (w && w.kind === "point" && dist(w, v) < 1e-9 * (1 + Math.hypot(v.x, v.y))) return ref;
        const ex = this.ctx.existingPointAt(v, 0.01);
        if (ex) return ex;
      }
      return this.add(type, args, opts);
    }
    /** Bước phụ: ẩn ở bản thường, nét đứt mờ ở bản chi tiết. */
    aux(type, args, detailed, opts = {}) {
      return this.add(type, args, detailed ? { ...opts, style: { ...AUX_STYLE, ...opts.style || {} } } : { ...opts, hidden: true });
    }
    seg(a, b, style) {
      return this.add("segment", [a, b], style ? { style } : {});
    }
    /** Đường tròn kèm tâm (tâm dùng lại điểm có sẵn nếu trùng). */
    circleWithCenter(type, args, centerName, opts = {}) {
      const c = this.add(type, args, opts);
      this.point("center", [c], centerName ? { name: centerName } : {});
      return c;
    }
  };
  var T = (menu, id, label, inputs, hints, make, extra = {}) => ({ id, label, menu, icon: extra.icon || "\u2022", inputs, hints, make, ...extra });
  var run = (fn) => (picks, ctx) => {
    const S = new Specs(ctx);
    fn(S, picks, ctx);
    return S.list;
  };
  var poly = (S, pts) => pts.forEach((p, i) => S.seg(p, pts[(i + 1) % pts.length]));
  var MENUS = ["1. D\u1EF1ng h\xECnh", "2. \u0110\u01B0\u1EDDng \u0111\u1EB7c bi\u1EC7t", "3. \u0110\u01B0\u1EDDng tr\xF2n", "4. \u0110i\u1EC3m \u0111\u1EB7c bi\u1EC7t", "5. Ph\xE9p bi\u1EBFn h\xECnh", "6. M\xF4 h\xECnh"];
  var [M1, M2, M3, M4, M5, M6] = MENUS;
  var LIBRARY = [
    // ======================= 1. DỰNG HÌNH =======================
    T(M1, "triangle", "D\u1EF1ng tam gi\xE1c", P3, TRI, run((S, [A, B, C]) => poly(S, [A, B, C])), { icon: "\u25B3", preview: "polygon" }),
    T(
      M1,
      "right_triangle",
      "Tam gi\xE1c vu\xF4ng",
      ["point", "point"],
      ["Ch\u1ECDn \u0111\u1EC9nh g\xF3c vu\xF4ng A", "Ch\u1ECDn \u0111\u1EC9nh B (\u0111\u1EC9nh C d\u1EF1ng tr\xEAn \u0111\u01B0\u1EDDng vu\xF4ng g\xF3c t\u1EA1i A, k\xE9o \u0111\u01B0\u1EE3c)"],
      run((S, [A, B]) => {
        const ab = S.seg(A, B);
        const p = S.add("perpendicular", [A, ab], { hidden: true });
        const C = S.add("point_on", [p], { params: { t: 0.75 } });
        S.seg(A, C);
        S.seg(B, C);
      }),
      { icon: "\u25FA" }
    ),
    T(
      M1,
      "right_isosceles",
      "Tam gi\xE1c vu\xF4ng c\xE2n",
      ["point", "point"],
      ["Ch\u1ECDn \u0111\u1EC9nh g\xF3c vu\xF4ng A", "Ch\u1ECDn \u0111\u1EC9nh B"],
      run((S, [A, B]) => {
        const C = S.add("rotate", [B, A], { params: { angle: 90 } });
        poly(S, [A, B, C]);
      }),
      { icon: "\u25FA" }
    ),
    T(
      M1,
      "equilateral",
      "Tam gi\xE1c \u0111\u1EC1u",
      ["point", "point"],
      ["Ch\u1ECDn \u0111\u1EC9nh A", "Ch\u1ECDn \u0111\u1EC9nh B (tam gi\xE1c d\u1EF1ng ng\u01B0\u1EE3c chi\u1EC1u kim \u0111\u1ED3ng h\u1ED3)"],
      run((S, [A, B]) => {
        const C = S.add("rotate", [B, A], { params: { angle: 60 } });
        poly(S, [A, B, C]);
      }),
      { icon: "\u25B3" }
    ),
    T(
      M1,
      "trapezoid",
      "H\xECnh thang",
      P3,
      ["Ch\u1ECDn \u0111\u1EC9nh A", "Ch\u1ECDn \u0111\u1EC9nh B (\u0111\xE1y AB)", "Ch\u1ECDn \u0111\u1EC9nh C (D d\u1EF1ng tr\xEAn \u0111\u01B0\u1EDDng qua C song song AB, k\xE9o \u0111\u01B0\u1EE3c)"],
      run((S, [A, B, C]) => {
        const ab = S.seg(A, B);
        const par = S.add("parallel", [C, ab], { hidden: true });
        const D = S.add("point_on", [par], { params: { t: -0.6 } });
        S.seg(B, C);
        S.seg(C, D);
        S.seg(D, A);
      }),
      { icon: "\u23E2" }
    ),
    T(
      M1,
      "isosceles_trapezoid",
      "H\xECnh thang c\xE2n",
      P3,
      ["Ch\u1ECDn \u0111\u1EC9nh A", "Ch\u1ECDn \u0111\u1EC9nh B (\u0111\xE1y AB)", "Ch\u1ECDn \u0111\u1EC9nh C"],
      run((S, [A, B, C]) => {
        const pb = S.add("perp_bisector", [A, B], { hidden: true });
        const D = S.add("reflect", [C, pb]);
        poly(S, [A, B, C, D]);
      }),
      { icon: "\u23E2" }
    ),
    T(
      M1,
      "parallelogram",
      "H\xECnh b\xECnh h\xE0nh",
      P3,
      ["Ch\u1ECDn \u0111\u1EC9nh A", "Ch\u1ECDn \u0111\u1EC9nh B", "Ch\u1ECDn \u0111\u1EC9nh C (D = A + C \u2212 B)"],
      run((S, [A, B, C]) => {
        const D = S.add("translate", [C, B, A]);
        poly(S, [A, B, C, D]);
      }),
      { icon: "\u25B1" }
    ),
    T(
      M1,
      "rectangle",
      "H\xECnh ch\u1EEF nh\u1EADt",
      ["point", "point"],
      ["Ch\u1ECDn \u0111\u1EC9nh A", "Ch\u1ECDn \u0111\u1EC9nh B (C tr\xEAn \u0111\u01B0\u1EDDng vu\xF4ng g\xF3c t\u1EA1i B, k\xE9o \u0111\u01B0\u1EE3c)"],
      run((S, [A, B]) => {
        const ab = S.seg(A, B);
        const p = S.add("perpendicular", [B, ab], { hidden: true });
        const C = S.add("point_on", [p], { params: { t: 0.6 } });
        const D = S.add("translate", [C, B, A]);
        S.seg(B, C);
        S.seg(C, D);
        S.seg(D, A);
      }),
      { icon: "\u25AD" }
    ),
    T(
      M1,
      "rhombus",
      "H\xECnh thoi",
      ["point", "point"],
      ["Ch\u1ECDn \u0111\u1EC9nh A", "Ch\u1ECDn \u0111\u1EC9nh B (C tr\xEAn \u0111\u01B0\u1EDDng tr\xF2n t\xE2m B qua A, k\xE9o \u0111\u01B0\u1EE3c)"],
      run((S, [A, B], ctx) => {
        const c = S.add("circle", [B, A], { hidden: true });
        const a = ctx.values.get(A), b = ctx.values.get(B);
        const t = a && b ? Math.atan2(a.y - b.y, a.x - b.x) - 1.2 : 0;
        const C = S.add("point_on", [c], { params: { t } });
        const D = S.add("translate", [C, B, A]);
        poly(S, [A, B, C, D]);
      }),
      { icon: "\u25C7" }
    ),
    T(
      M1,
      "square",
      "H\xECnh vu\xF4ng",
      ["point", "point"],
      ["Ch\u1ECDn \u0111\u1EC9nh A", "Ch\u1ECDn \u0111\u1EC9nh B (h\xECnh vu\xF4ng ABCD ng\u01B0\u1EE3c chi\u1EC1u kim \u0111\u1ED3ng h\u1ED3)"],
      run((S, [A, B]) => {
        const D = S.add("rotate", [B, A], { params: { angle: 90 } });
        const C = S.add("translate", [D, A, B]);
        poly(S, [A, B, C, D]);
      }),
      { icon: "\u25A1" }
    ),
    T(
      M1,
      "harmonic_quad",
      "T\u1EE9 gi\xE1c \u0111i\u1EC1u ho\xE0",
      P3,
      ["Ch\u1ECDn \u0111\u1EC9nh A", "Ch\u1ECDn \u0111\u1EC9nh B", "Ch\u1ECDn \u0111\u1EC9nh C (D: BD l\xE0 \u0111\u01B0\u1EDDng \u0111\u1ED1i trung c\u1EE7a tam gi\xE1c ABC)"],
      run((S, [A, B, C]) => {
        const w = S.circleWithCenter("circle_3pts", [A, B, C]);
        const ta = S.add("tangent_at", [w, A], { hidden: true });
        const tc = S.add("tangent_at", [w, C], { hidden: true });
        const T0 = S.add("intersection", [ta, tc], { hidden: true });
        const bt = S.add("line", [B, T0], { hidden: true });
        const D = S.add("intersection_other", [bt, w, B]);
        poly(S, [A, B, C, D]);
      }),
      { icon: "\u22A1" }
    ),
    T(
      M1,
      "circle_tangent_at",
      "Ti\u1EBFp x\xFAc v\u1EDBi AB t\u1EA1i A v\xE0 qua C",
      P3,
      ["Ch\u1ECDn ti\u1EBFp \u0111i\u1EC3m A", "Ch\u1ECDn \u0111i\u1EC3m B (\u0111\u01B0\u1EDDng AB l\xE0 ti\u1EBFp tuy\u1EBFn)", "Ch\u1ECDn \u0111i\u1EC3m C thu\u1ED9c \u0111\u01B0\u1EDDng tr\xF2n"],
      run((S, [A, B, C]) => S.circleWithCenter("circle_tangent_at", [A, B, C])),
      { icon: "\u25EF" }
    ),
    T(
      M1,
      "cevian_triangle",
      "Tam gi\xE1c Cevian",
      ["point", "point", "point", "point"],
      TRI_P,
      run((S, [A, B, C, P2]) => {
        const D = S.add("cevian_foot", [P2, A, B, C]);
        const E = S.add("cevian_foot", [P2, B, C, A]);
        const F = S.add("cevian_foot", [P2, C, A, B]);
        S.seg(A, D);
        S.seg(B, E);
        S.seg(C, F);
        poly(S, [D, E, F]);
      }),
      { icon: "\u27D1" }
    ),
    T(
      M1,
      "quadrilateral",
      "D\u1EF1ng t\u1EE9 gi\xE1c",
      ["point", "point", "point", "point"],
      ["Ch\u1ECDn \u0111\u1EC9nh A", "Ch\u1ECDn \u0111\u1EC9nh B", "Ch\u1ECDn \u0111\u1EC9nh C", "Ch\u1ECDn \u0111\u1EC9nh D"],
      run((S, pts) => poly(S, pts)),
      { icon: "\u2B20" }
    ),
    T(
      M1,
      "cyclic_quad",
      "D\u1EF1ng t\u1EE9 gi\xE1c n\u1ED9i ti\u1EBFp",
      P3,
      ["Ch\u1ECDn \u0111\u1EC9nh A", "Ch\u1ECDn \u0111\u1EC9nh B", "Ch\u1ECDn \u0111\u1EC9nh C (D tr\xEAn \u0111\u01B0\u1EDDng tr\xF2n, k\xE9o \u0111\u01B0\u1EE3c)"],
      run((S, [A, B, C], ctx) => {
        const w = S.circleWithCenter("circle_3pts", [A, B, C]);
        const cv = S.vals.get(w), bv = ctx.values.get(B);
        const t = cv && bv ? Math.atan2(cv.c.y - bv.y, cv.c.x - bv.x) : 0;
        const D = S.add("point_on", [w], { params: { t } });
        poly(S, [A, B, C, D]);
      }),
      { icon: "\u2299" }
    ),
    // ======================= 2. ĐƯỜNG ĐẶC BIỆT =======================
    T(
      M2,
      "altitude",
      "\u0110\u01B0\u1EDDng cao",
      P3,
      ["Ch\u1ECDn \u0111\u1EC9nh A (k\u1EBB \u0111\u01B0\u1EDDng cao t\u1EEB A)", "Ch\u1ECDn \u0111\u1EC9nh B", "Ch\u1ECDn \u0111\u1EC9nh C"],
      run((S, [A, B, C]) => {
        const D = S.point("foot", [A, B, C]);
        S.seg(A, D);
      }),
      { icon: "h" }
    ),
    T(
      M2,
      "median",
      "\u0110\u01B0\u1EDDng trung tuy\u1EBFn",
      P3,
      ["Ch\u1ECDn \u0111\u1EC9nh A (trung tuy\u1EBFn t\u1EEB A)", "Ch\u1ECDn \u0111\u1EC9nh B", "Ch\u1ECDn \u0111\u1EC9nh C"],
      run((S, [A, B, C]) => {
        const M = S.point("midpoint", [B, C]);
        S.seg(A, M);
      }),
      { icon: "m" }
    ),
    T(
      M2,
      "perp_bisector",
      "\u0110\u01B0\u1EDDng trung tr\u1EF1c",
      ["point", "point"],
      ["Ch\u1ECDn \u0111i\u1EC3m th\u1EE9 nh\u1EA5t (ho\u1EB7c b\u1EA5m v\xE0o m\u1ED9t \u0111o\u1EA1n th\u1EB3ng)", "Ch\u1ECDn \u0111i\u1EC3m th\u1EE9 hai"],
      run((S, [A, B]) => S.add("perp_bisector", [A, B])),
      { icon: "\u22A5", segmentShortcut: true }
    ),
    T(
      M2,
      "isogonal_line",
      "\u0110\u01B0\u1EDDng \u0111\u1EB3ng gi\xE1c",
      ["point", "point", "point", "point"],
      ["Ch\u1ECDn \u0111i\u1EC3m tr\xEAn c\u1EA1nh th\u1EE9 nh\u1EA5t", "Ch\u1ECDn \u0110\u1EC8NH g\xF3c", "Ch\u1ECDn \u0111i\u1EC3m tr\xEAn c\u1EA1nh th\u1EE9 hai", "Ch\u1ECDn \u0111i\u1EC3m P (d\u1EF1ng \u0111\u01B0\u1EDDng \u0111\u1EB3ng gi\xE1c c\u1EE7a \u0111\u1EC9nh\u2013P)"],
      run((S, [B, A, C, P2]) => S.add("isogonal_line", [B, A, C, P2])),
      { icon: "\u2221" }
    ),
    T(
      M2,
      "symmedian",
      "\u0110\u01B0\u1EDDng \u0111\u1ED1i trung",
      P3,
      ["Ch\u1ECDn \u0111\u1EC9nh A (\u0111\u1ED1i trung t\u1EEB A)", "Ch\u1ECDn \u0111\u1EC9nh B", "Ch\u1ECDn \u0111\u1EC9nh C"],
      run((S, [A, B, C]) => {
        const L = S.point("symmedian_foot", [A, B, C]);
        S.seg(A, L);
      }),
      { icon: "k" }
    ),
    T(
      M2,
      "ext_bisector",
      "\u0110\u01B0\u1EDDng ph\xE2n gi\xE1c ngo\xE0i",
      P3,
      ["Ch\u1ECDn \u0111i\u1EC3m tr\xEAn c\u1EA1nh th\u1EE9 nh\u1EA5t", "Ch\u1ECDn \u0110\u1EC8NH g\xF3c", "Ch\u1ECDn \u0111i\u1EC3m tr\xEAn c\u1EA1nh th\u1EE9 hai"],
      run((S, p) => S.add("angle_bisector", p, { params: { external: true } })),
      { icon: "\u2220" }
    ),
    T(
      M2,
      "int_ext_bisector",
      "\u0110\u01B0\u1EDDng ph\xE2n gi\xE1c trong v\xE0 ngo\xE0i",
      P3,
      ["Ch\u1ECDn \u0111i\u1EC3m tr\xEAn c\u1EA1nh th\u1EE9 nh\u1EA5t", "Ch\u1ECDn \u0110\u1EC8NH g\xF3c", "Ch\u1ECDn \u0111i\u1EC3m tr\xEAn c\u1EA1nh th\u1EE9 hai"],
      run((S, p) => {
        S.add("angle_bisector", p);
        S.add("angle_bisector", p, { params: { external: true } });
      }),
      { icon: "\u2220" }
    ),
    T(
      M2,
      "tangent_at",
      "Ti\u1EBFp tuy\u1EBFn t\u1EA1i m\u1ED9t \u0111i\u1EC3m",
      ["circle", "point"],
      ["Ch\u1ECDn \u0111\u01B0\u1EDDng tr\xF2n v\xE0 m\u1ED9t \u0111i\u1EC3m tr\xEAn n\xF3 (th\u1EE9 t\u1EF1 b\u1EA5t k\u1EF3)", "Ch\u1ECDn n\u1ED1t \u0111\u1ED1i t\u01B0\u1EE3ng c\xF2n l\u1EA1i"],
      run((S, [c, P2]) => S.add("tangent_at", [c, P2])),
      { icon: "\u27C2", anyOrder: true }
    ),
    T(
      M2,
      "tangents_meet",
      "Giao \u0111i\u1EC3m c\u1EE7a hai ti\u1EBFp tuy\u1EBFn",
      ["circle", "point", "point"],
      ["Ch\u1ECDn \u0111\u01B0\u1EDDng tr\xF2n", "Ch\u1ECDn ti\u1EBFp \u0111i\u1EC3m th\u1EE9 nh\u1EA5t", "Ch\u1ECDn ti\u1EBFp \u0111i\u1EC3m th\u1EE9 hai"],
      run((S, [c, P2, Q]) => {
        const a = S.add("tangent_at", [c, P2]), b = S.add("tangent_at", [c, Q]);
        S.add("intersection", [a, b]);
      }),
      { icon: "\u22CF" }
    ),
    T(
      M2,
      "tangents_from",
      "Ti\u1EBFp tuy\u1EBFn k\u1EBB t\u1EEB m\u1ED9t \u0111i\u1EC3m",
      ["circle", "point"],
      ["Ch\u1ECDn \u0111\u01B0\u1EDDng tr\xF2n v\xE0 m\u1ED9t \u0111i\u1EC3m n\u1EB1m ngo\xE0i (th\u1EE9 t\u1EF1 b\u1EA5t k\u1EF3)", "Ch\u1ECDn n\u1ED1t \u0111\u1ED1i t\u01B0\u1EE3ng c\xF2n l\u1EA1i"],
      run((S, [c, P2]) => {
        for (const which of [0, 1]) {
          const T0 = S.add("tangent_point", [c, P2], { params: { which } });
          S.add("line", [P2, T0]);
        }
      }),
      { icon: "\u22CE", anyOrder: true }
    ),
    T(
      M2,
      "common_tangents",
      "Ti\u1EBFp tuy\u1EBFn chung",
      ["circle", "circle"],
      ["Ch\u1ECDn \u0111\u01B0\u1EDDng tr\xF2n th\u1EE9 nh\u1EA5t", "Ch\u1ECDn \u0111\u01B0\u1EDDng tr\xF2n th\u1EE9 hai (d\u1EF1ng m\u1ECDi ti\u1EBFp tuy\u1EBFn chung \u0111ang t\u1ED3n t\u1EA1i)"],
      run((S, [a, b], ctx) => {
        const ca = ctx.values.get(a), cb = ctx.values.get(b);
        for (const internal of [false, true]) for (const which of [0, 1]) {
          if (ca && cb && !commonTangent(ca, cb, internal, which)) continue;
          S.add("common_tangent", [a, b], { params: { internal, which } });
        }
      }),
      { icon: "\u2312" }
    ),
    T(
      M2,
      "euler_line",
      "\u0110\u01B0\u1EDDng th\u1EB3ng Euler",
      P3,
      TRI,
      run((S, [A, B, C]) => {
        const O = S.point("circumcenter", [A, B, C], { name: "O" });
        S.point("centroid", [A, B, C], { name: "G" });
        const H = S.point("orthocenter", [A, B, C], { name: "H" });
        S.add("line", [O, H]);
      }),
      { icon: "e" }
    ),
    T(
      M2,
      "simson_line",
      "\u0110\u01B0\u1EDDng th\u1EB3ng Simson",
      ["point", "point", "point", "point"],
      ["Ch\u1ECDn \u0111\u1EC9nh A", "Ch\u1ECDn \u0111\u1EC9nh B", "Ch\u1ECDn \u0111\u1EC9nh C", "Ch\u1ECDn \u0111i\u1EC3m P (th\u01B0\u1EDDng l\u1EA5y tr\xEAn \u0111\u01B0\u1EDDng tr\xF2n ngo\u1EA1i ti\u1EBFp)"],
      run((S, [A, B, C, P2]) => {
        const D = S.point("foot", [P2, B, C]), E = S.point("foot", [P2, C, A]);
        S.point("foot", [P2, A, B]);
        S.add("line", [D, E]);
      }),
      { icon: "s" }
    ),
    T(
      M2,
      "steiner_line",
      "\u0110\u01B0\u1EDDng th\u1EB3ng Steiner",
      ["point", "point", "point", "point"],
      ["Ch\u1ECDn \u0111\u1EC9nh A", "Ch\u1ECDn \u0111\u1EC9nh B", "Ch\u1ECDn \u0111\u1EC9nh C", "Ch\u1ECDn \u0111i\u1EC3m P (th\u01B0\u1EDDng l\u1EA5y tr\xEAn \u0111\u01B0\u1EDDng tr\xF2n ngo\u1EA1i ti\u1EBFp)"],
      run((S, [A, B, C, P2]) => {
        const X = S.add("reflect_pts", [P2, B, C]), Y = S.add("reflect_pts", [P2, C, A]);
        S.add("reflect_pts", [P2, A, B]);
        S.add("line", [X, Y]);
      }),
      { icon: "\u2113" }
    ),
    // ======================= 3. ĐƯỜNG TRÒN =======================
    T(M3, "circumcircle", "\u0110\u01B0\u1EDDng tr\xF2n ngo\u1EA1i ti\u1EBFp", P3, TRI, run((S, p) => S.circleWithCenter("circumcircle", p, "O")), { icon: "(O)" }),
    T(
      M3,
      "pedal_circle",
      "\u0110\u01B0\u1EDDng tr\xF2n Pedal",
      ["point", "point", "point", "point"],
      TRI_P,
      run((S, [A, B, C, P2]) => {
        const f = [S.aux("foot", [P2, B, C], false), S.aux("foot", [P2, C, A], false), S.aux("foot", [P2, A, B], false)];
        S.circleWithCenter("circle_3pts", f);
      }),
      { icon: "(P)" }
    ),
    T(
      M3,
      "pedal_circle_detail",
      "\u0110\u01B0\u1EDDng tr\xF2n Pedal chi ti\u1EBFt",
      ["point", "point", "point", "point"],
      TRI_P,
      run((S, [A, B, C, P2]) => {
        const f = [S.point("foot", [P2, B, C]), S.point("foot", [P2, C, A]), S.point("foot", [P2, A, B])];
        for (const X of f) S.seg(P2, X, AUX_STYLE);
        S.circleWithCenter("circle_3pts", f);
      }),
      { icon: "(P)" }
    ),
    T(M3, "incircle", "\u0110\u01B0\u1EDDng tr\xF2n n\u1ED9i ti\u1EBFp", P3, TRI, run((S, p) => S.circleWithCenter("incircle", p, "I")), { icon: "(I)" }),
    T(
      M3,
      "excircle",
      "\u0110\u01B0\u1EDDng tr\xF2n b\xE0ng ti\u1EBFp",
      P3,
      ["Ch\u1ECDn \u0111\u1EC9nh A (b\xE0ng ti\u1EBFp g\xF3c A)", "Ch\u1ECDn \u0111\u1EC9nh B", "Ch\u1ECDn \u0111\u1EC9nh C"],
      run((S, [A, B, C], ctx) => S.circleWithCenter("excircle", [A, B, C], "I" + sub2(ctx.name(A)))),
      { icon: "(J)" }
    ),
    T(
      M3,
      "circle_diameter",
      "\u0110\u01B0\u1EDDng tr\xF2n \u0111\u01B0\u1EDDng k\xEDnh",
      ["point", "point"],
      ["Ch\u1ECDn \u0111\u1EA7u m\xFAt th\u1EE9 nh\u1EA5t (ho\u1EB7c b\u1EA5m v\xE0o m\u1ED9t \u0111o\u1EA1n th\u1EB3ng)", "Ch\u1ECDn \u0111\u1EA7u m\xFAt th\u1EE9 hai"],
      run((S, [A, B]) => S.circleWithCenter("circle_diameter", [A, B])),
      { icon: "\u2296", segmentShortcut: true }
    ),
    T(
      M3,
      "mixtilinear_in",
      "\u0110\u01B0\u1EDDng tr\xF2n Mixtilinear n\u1ED9i",
      P3,
      ["Ch\u1ECDn \u0111\u1EC9nh A (mixtilinear \u1EE9ng v\u1EDBi A)", "Ch\u1ECDn \u0111\u1EC9nh B", "Ch\u1ECDn \u0111\u1EC9nh C"],
      run((S, p) => S.circleWithCenter("mixtilinear", p)),
      { icon: "\u25D0" }
    ),
    T(
      M3,
      "mixtilinear_ex",
      "\u0110\u01B0\u1EDDng tr\xF2n Mixtilinear ngo\u1EA1i",
      P3,
      ["Ch\u1ECDn \u0111\u1EC9nh A (mixtilinear ngo\u1EA1i \u1EE9ng v\u1EDBi A)", "Ch\u1ECDn \u0111\u1EC9nh B", "Ch\u1ECDn \u0111\u1EC9nh C"],
      run((S, p) => S.circleWithCenter("mixtilinear", p, void 0, { params: { external: true } })),
      { icon: "\u25D1" }
    ),
    T(
      M3,
      "radical_axis",
      "Tr\u1EE5c \u0111\u1EB3ng ph\u01B0\u01A1ng",
      ["circle", "circle"],
      ["Ch\u1ECDn \u0111\u01B0\u1EDDng tr\xF2n th\u1EE9 nh\u1EA5t", "Ch\u1ECDn \u0111\u01B0\u1EDDng tr\xF2n th\u1EE9 hai"],
      run((S, p) => S.add("radical_axis", p)),
      { icon: "\u2AFC" }
    ),
    T(
      M3,
      "radical_center",
      "T\xE2m \u0111\u1EB3ng ph\u01B0\u01A1ng",
      ["circle", "circle", "circle"],
      ["Ch\u1ECDn \u0111\u01B0\u1EDDng tr\xF2n th\u1EE9 nh\u1EA5t", "Ch\u1ECDn \u0111\u01B0\u1EDDng tr\xF2n th\u1EE9 hai", "Ch\u1ECDn \u0111\u01B0\u1EDDng tr\xF2n th\u1EE9 ba"],
      run((S, p) => S.point("radical_center", p)),
      { icon: "\u2733" }
    ),
    T(M3, "nine_point_circle", "\u0110\u01B0\u1EDDng tr\xF2n Euler", P3, TRI, run((S, p) => S.circleWithCenter("nine_point_circle", p, "N")), { icon: "(N)" }),
    // ======================= 4. ĐIỂM ĐẶC BIỆT =======================
    T(M4, "centroid", "Tr\u1ECDng t\xE2m", P3, TRI, run((S, p) => S.point("centroid", p, { name: "G" })), { icon: "G" }),
    T(
      M4,
      "centroid_detail",
      "Tr\u1ECDng t\xE2m chi ti\u1EBFt",
      P3,
      TRI,
      run((S, [A, B, C]) => {
        for (const [X, Y, Z] of [[A, B, C], [B, C, A], [C, A, B]]) S.seg(X, S.point("midpoint", [Y, Z]), AUX_STYLE);
        S.point("centroid", [A, B, C], { name: "G" });
      }),
      { icon: "G" }
    ),
    T(M4, "orthocenter", "Tr\u1EF1c t\xE2m", P3, TRI, run((S, p) => S.point("orthocenter", p, { name: "H" })), { icon: "H" }),
    T(
      M4,
      "orthocenter_detail",
      "Tr\u1EF1c t\xE2m chi ti\u1EBFt",
      P3,
      TRI,
      run((S, [A, B, C]) => {
        for (const [X, Y, Z] of [[A, B, C], [B, C, A], [C, A, B]]) S.seg(X, S.point("foot", [X, Y, Z]), AUX_STYLE);
        S.point("orthocenter", [A, B, C], { name: "H" });
      }),
      { icon: "H" }
    ),
    T(
      M4,
      "isogonal_conjugate",
      "\u0110i\u1EC3m li\xEAn h\u1EE3p \u0111\u1EB3ng gi\xE1c",
      ["point", "point", "point", "point"],
      TRI_P,
      run((S, [A, B, C, P2], ctx) => S.point("isogonal_conjugate", [P2, A, B, C], { name: ctx.name(P2) ? ctx.name(P2) + "*" : void 0 })),
      { icon: "P*" }
    ),
    T(M4, "lemoine", "\u0110i\u1EC3m Lemoine", P3, TRI, run((S, p) => S.point("lemoine", p, { name: "K" })), { icon: "K" }),
    T(
      M4,
      "pedal_feet",
      "Ch\xE2n \u0111\u01B0\u1EDDng vu\xF4ng g\xF3c h\u1EA1 xu\u1ED1ng ba c\u1EA1nh",
      ["point", "point", "point", "point"],
      TRI_P,
      run((S, [A, B, C, P2]) => {
        for (const [X, Y] of [[B, C], [C, A], [A, B]]) S.seg(P2, S.point("foot", [P2, X, Y]), AUX_STYLE);
      }),
      { icon: "\u22BE" }
    ),
    T(
      M4,
      "ext_homothety_center",
      "T\xE2m v\u1ECB t\u1EF1 ngo\xE0i",
      ["circle", "circle"],
      ["Ch\u1ECDn \u0111\u01B0\u1EDDng tr\xF2n th\u1EE9 nh\u1EA5t", "Ch\u1ECDn \u0111\u01B0\u1EDDng tr\xF2n th\u1EE9 hai"],
      run((S, p) => S.point("homothety_center", p)),
      { icon: "S" }
    ),
    T(
      M4,
      "int_homothety_center",
      "T\xE2m v\u1ECB t\u1EF1 trong",
      ["circle", "circle"],
      ["Ch\u1ECDn \u0111\u01B0\u1EDDng tr\xF2n th\u1EE9 nh\u1EA5t", "Ch\u1ECDn \u0111\u01B0\u1EDDng tr\xF2n th\u1EE9 hai"],
      run((S, p) => S.point("homothety_center", p, { params: { internal: true } })),
      { icon: "s" }
    ),
    T(M4, "kosnita", "\u0110i\u1EC3m Kosnita", P3, TRI, run((S, p) => S.point("kosnita", p)), { icon: "Ko" }),
    T(M4, "nine_point_center", "T\xE2m \u0111\u01B0\u1EDDng tr\xF2n Euler", P3, TRI, run((S, p) => S.point("nine_point_center", p, { name: "N" })), { icon: "N" }),
    // bổ sung
    T(M4, "circumcenter", "T\xE2m ngo\u1EA1i ti\u1EBFp", P3, TRI, run((S, p) => S.point("circumcenter", p, { name: "O" })), { icon: "O" }),
    T(M4, "incenter", "T\xE2m n\u1ED9i ti\u1EBFp", P3, TRI, run((S, p) => S.point("incenter", p, { name: "I" })), { icon: "I" }),
    T(
      M4,
      "excenter",
      "T\xE2m b\xE0ng ti\u1EBFp",
      P3,
      ["Ch\u1ECDn \u0111\u1EC9nh A (t\xE2m b\xE0ng ti\u1EBFp g\xF3c A)", "Ch\u1ECDn \u0111\u1EC9nh B", "Ch\u1ECDn \u0111\u1EC9nh C"],
      run((S, [A, B, C], ctx) => S.point("excenter", [A, B, C], { name: "I" + sub2(ctx.name(A)) })),
      { icon: "J" }
    ),
    T(
      M4,
      "incircle_touch",
      "Ti\u1EBFp \u0111i\u1EC3m \u0111\u01B0\u1EDDng tr\xF2n n\u1ED9i ti\u1EBFp v\u1EDBi BC",
      P3,
      ["Ch\u1ECDn \u0111\u1EC9nh A (ti\u1EBFp \u0111i\u1EC3m tr\xEAn c\u1EA1nh \u0111\u1ED1i di\u1EC7n)", "Ch\u1ECDn \u0111\u1EC9nh B", "Ch\u1ECDn \u0111\u1EC9nh C"],
      run((S, p) => S.point("incircle_touch", p)),
      { icon: "T" }
    ),
    T(
      M4,
      "arc_mid_no",
      "\u0110i\u1EC3m ch\xEDnh gi\u1EEFa cung BC kh\xF4ng ch\u1EE9a A",
      P3,
      ["Ch\u1ECDn \u0111\u1EC9nh A", "Ch\u1ECDn \u0111\u1EC9nh B", "Ch\u1ECDn \u0111\u1EC9nh C"],
      run((S, p) => S.point("arc_midpoint", p, { params: { contains: false } })),
      { icon: "\u2312" }
    ),
    T(
      M4,
      "arc_mid_yes",
      "\u0110i\u1EC3m ch\xEDnh gi\u1EEFa cung BC ch\u1EE9a A",
      P3,
      ["Ch\u1ECDn \u0111\u1EC9nh A", "Ch\u1ECDn \u0111\u1EC9nh B", "Ch\u1ECDn \u0111\u1EC9nh C"],
      run((S, p) => S.point("arc_midpoint", p, { params: { contains: true } })),
      { icon: "\u2312" }
    ),
    T(
      M4,
      "altitude_foot",
      "Ch\xE2n \u0111\u01B0\u1EDDng cao",
      P3,
      ["Ch\u1ECDn \u0111\u1EC9nh A (ch\xE2n \u0111\u01B0\u1EDDng cao t\u1EEB A)", "Ch\u1ECDn \u0111\u1EC9nh B", "Ch\u1ECDn \u0111\u1EC9nh C"],
      run((S, [A, B, C]) => {
        const D = S.point("altitude_foot", [A, B, C]);
        S.seg(A, D, { dash: true });
      }),
      { icon: "h" }
    ),
    // ======================= 5. PHÉP BIẾN HÌNH =======================
    T(
      M5,
      "reflect_point",
      "\u0110\u1ED1i x\u1EE9ng t\xE2m",
      ["obj", "point"],
      ["Ch\u1ECDn \u0111\u1ED1i t\u01B0\u1EE3ng (\u0111i\u1EC3m, \u0111\u01B0\u1EDDng, \u0111\u01B0\u1EDDng tr\xF2n)", "Ch\u1ECDn t\xE2m \u0111\u1ED1i x\u1EE9ng"],
      run((S, p) => S.add("reflect", p)),
      { icon: "\u2299" }
    ),
    T(
      M5,
      "reflect_line",
      "\u0110\u1ED1i x\u1EE9ng tr\u1EE5c",
      ["obj", "line"],
      ["Ch\u1ECDn \u0111\u1ED1i t\u01B0\u1EE3ng (\u0111i\u1EC3m, \u0111\u01B0\u1EDDng, \u0111\u01B0\u1EDDng tr\xF2n)", "Ch\u1ECDn tr\u1EE5c \u0111\u1ED1i x\u1EE9ng"],
      run((S, p) => S.add("reflect", p)),
      { icon: "\u21CB" }
    ),
    T(
      M5,
      "rotate",
      "Quay",
      ["obj", "point"],
      ["Ch\u1ECDn \u0111\u1ED1i t\u01B0\u1EE3ng c\u1EA7n quay", "Ch\u1ECDn t\xE2m quay (g\xF3c quay \u0111\u1EB7t \u1EDF th\u1EBB tu\u1EF3 ch\u1ECDn)"],
      run((S, p, ctx) => S.add("rotate", p, { params: { angle: ctx.opt("angle", 90) } })),
      { icon: "\u21BB", options: [{ key: "angle", label: "G\xF3c quay (\u0111\u1ED9, ng\u01B0\u1EE3c chi\u1EC1u kim \u0111\u1ED3ng h\u1ED3)", def: 90 }] }
    ),
    T(
      M5,
      "homothety",
      "V\u1ECB t\u1EF1",
      ["obj", "point"],
      ["Ch\u1ECDn \u0111\u1ED1i t\u01B0\u1EE3ng", "Ch\u1ECDn t\xE2m v\u1ECB t\u1EF1 (t\u1EC9 s\u1ED1 \u0111\u1EB7t \u1EDF th\u1EBB tu\u1EF3 ch\u1ECDn)"],
      run((S, p, ctx) => S.add("homothety", p, { params: { k: ctx.opt("k", 2) } })),
      { icon: "\u2922", options: [{ key: "k", label: "T\u1EC9 s\u1ED1 v\u1ECB t\u1EF1 k", def: 2 }] }
    ),
    T(
      M5,
      "translate",
      "T\u1ECBnh ti\u1EBFn",
      ["obj", "point", "point"],
      ["Ch\u1ECDn \u0111\u1ED1i t\u01B0\u1EE3ng", "Ch\u1ECDn \u0111i\u1EC3m \u0111\u1EA7u c\u1EE7a vect\u01A1", "Ch\u1ECDn \u0111i\u1EC3m cu\u1ED1i c\u1EE7a vect\u01A1"],
      run((S, p) => S.add("translate", p)),
      { icon: "\u21C9" }
    ),
    T(
      M5,
      "invert",
      "Ngh\u1ECBch \u0111\u1EA3o",
      ["point", "circle"],
      ["Ch\u1ECDn \u0111i\u1EC3m c\u1EA7n ngh\u1ECBch \u0111\u1EA3o", "Ch\u1ECDn \u0111\u01B0\u1EDDng tr\xF2n ngh\u1ECBch \u0111\u1EA3o"],
      run((S, p) => S.add("invert", p)),
      { icon: "\u229B" }
    ),
    T(
      M5,
      "projection",
      "Chi\u1EBFu vu\xF4ng g\xF3c l\xEAn \u0111\u01B0\u1EDDng th\u1EB3ng",
      ["point", "line"],
      ["Ch\u1ECDn \u0111i\u1EC3m v\xE0 \u0111\u01B0\u1EDDng th\u1EB3ng (th\u1EE9 t\u1EF1 b\u1EA5t k\u1EF3)", "Ch\u1ECDn n\u1ED1t \u0111\u1ED1i t\u01B0\u1EE3ng c\xF2n l\u1EA1i"],
      run((S, p) => S.add("projection", p)),
      { icon: "\u22BE", anyOrder: true }
    ),
    // ======================= 6. MÔ HÌNH =======================
    T(
      M6,
      "model_excentral",
      "Tam gi\xE1c v\u1EDBi t\xE2m n\u1ED9i ti\u1EBFp, b\xE0ng ti\u1EBFp",
      P3,
      TRI,
      run((S, [A, B, C], ctx) => {
        poly(S, [A, B, C]);
        S.circleWithCenter("circumcircle", [A, B, C], "O");
        S.circleWithCenter("incircle", [A, B, C], "I");
        for (const [X, Y, Z] of [[A, B, C], [B, C, A], [C, A, B]]) S.circleWithCenter("excircle", [X, Y, Z], "I" + sub2(ctx.name(X)));
      }),
      { icon: "\u29BF" }
    ),
    T(
      M6,
      "model_euler",
      "\u0110\u01B0\u1EDDng th\u1EB3ng v\xE0 \u0111\u01B0\u1EDDng tr\xF2n Euler",
      P3,
      TRI,
      run((S, [A, B, C]) => {
        poly(S, [A, B, C]);
        S.circleWithCenter("circumcircle", [A, B, C], "O");
        const O = S.point("circumcenter", [A, B, C], { name: "O" });
        S.point("centroid", [A, B, C], { name: "G" });
        const H = S.point("orthocenter", [A, B, C], { name: "H" });
        S.circleWithCenter("nine_point_circle", [A, B, C], "N");
        S.add("line", [O, H]);
      }),
      { icon: "E" }
    ),
    T(
      M6,
      "model_orthic",
      "Tam gi\xE1c tr\u1EF1c t\xE2m (orthic)",
      P3,
      TRI,
      run((S, [A, B, C]) => {
        poly(S, [A, B, C]);
        const f = [[A, B, C], [B, C, A], [C, A, B]].map(([X, Y, Z]) => {
          const D = S.point("foot", [X, Y, Z]);
          S.seg(X, D, AUX_STYLE);
          return D;
        });
        S.point("orthocenter", [A, B, C], { name: "H" });
        poly(S, f);
      }),
      { icon: "\u22BF" }
    ),
    T(
      M6,
      "model_medial",
      "Tam gi\xE1c trung b\xECnh",
      P3,
      TRI,
      run((S, [A, B, C]) => {
        poly(S, [A, B, C]);
        const m = [[B, C], [C, A], [A, B]].map((pr) => S.point("midpoint", pr));
        poly(S, m);
        S.point("centroid", [A, B, C], { name: "G" });
      }),
      { icon: "\u25B3" }
    ),
    T(
      M6,
      "model_miquel",
      "\u0110i\u1EC3m Miquel c\u1EE7a tam gi\xE1c",
      P3,
      ["Ch\u1ECDn \u0111\u1EC9nh A", "Ch\u1ECDn \u0111\u1EC9nh B", "Ch\u1ECDn \u0111\u1EC9nh C (D, E, F d\u1EF1ng tr\xEAn c\xE1c c\u1EA1nh, k\xE9o \u0111\u01B0\u1EE3c)"],
      run((S, [A, B, C]) => {
        const bc = S.seg(B, C), ca = S.seg(C, A), ab = S.seg(A, B);
        const D = S.add("point_on", [bc], { params: { t: 0.4 } });
        const E = S.add("point_on", [ca], { params: { t: 0.35 } });
        const F = S.add("point_on", [ab], { params: { t: 0.55 } });
        const w1 = S.add("circle_3pts", [A, E, F]), w2 = S.add("circle_3pts", [B, F, D]);
        S.add("circle_3pts", [C, D, E]);
        S.add("intersection_other", [w1, w2, F], { name: "M" });
      }),
      { icon: "M" }
    ),
    T(
      M6,
      "model_mixtilinear",
      "\u0110\u01B0\u1EDDng tr\xF2n mixtilinear v\xE0 t\xE2m n\u1ED9i ti\u1EBFp",
      P3,
      ["Ch\u1ECDn \u0111\u1EC9nh A", "Ch\u1ECDn \u0111\u1EC9nh B", "Ch\u1ECDn \u0111\u1EC9nh C"],
      run((S, [A, B, C]) => {
        poly(S, [A, B, C]);
        S.circleWithCenter("circumcircle", [A, B, C], "O");
        const m = S.add("mixtilinear", [A, B, C]);
        const J = S.point("center", [m]);
        const K = S.point("foot", [J, A, B]), L = S.point("foot", [J, A, C]);
        S.seg(K, L, AUX_STYLE);
        S.point("incenter", [A, B, C], { name: "I" });
      }),
      { icon: "\u25D0" }
    )
  ];
  var LIBRARY_BY_ID = Object.fromEntries(LIBRARY.map((t) => [t.id, t]));

  // src/ui/tools.js
  var T2 = (id, label, group, icon, inputs, hints, make, extra = {}) => ({ id, label, group, icon, inputs, hints, make, ...extra });
  var one = (type, params, name) => (picks) => [{ type, args: picks, params, name }];
  var withCenter = (type, params, centerName) => (picks, app) => {
    const out = [{ type, args: picks, params }];
    let c = null;
    try {
      c = STEP_TYPES[type].compute(picks.map((id) => app.values.get(id)), { ...STEP_TYPES[type].params || {}, ...params || {} });
    } catch {
      c = null;
    }
    if (!c || !app.existingPointAt(c.c, 0.01)) out.push({ type: "center", args: ["$0"], name: centerName });
    return out;
  };
  var TRI2 = ["Ch\u1ECDn \u0111\u1EC9nh th\u1EE9 nh\u1EA5t", "Ch\u1ECDn \u0111\u1EC9nh th\u1EE9 hai", "Ch\u1ECDn \u0111\u1EC9nh th\u1EE9 ba"];
  var TOOLS = [
    T2("move", "Ch\u1ECDn / k\xE9o", "C\u01A1 b\u1EA3n", "\u2196", [], ["K\xE9o \u0111i\u1EC3m ho\u1EB7c nh\xE3n; b\u1EA5m \u0111\u1EC3 ch\u1ECDn \u0111\u1ED1i t\u01B0\u1EE3ng; k\xE9o n\u1EC1n \u0111\u1EC3 d\u1EDDi h\xECnh, l\u0103n chu\u1ED9t \u0111\u1EC3 ph\xF3ng to/thu nh\u1ECF"], null),
    T2("point", "\u0110i\u1EC3m", "C\u01A1 b\u1EA3n", "\u2022", ["point"], ["B\u1EA5m v\xE0o ch\u1ED7 tr\u1ED1ng: \u0111i\u1EC3m t\u1EF1 do \xB7 b\u1EA5m l\xEAn \u0111\u01B0\u1EDDng/\u0111\u01B0\u1EDDng tr\xF2n: \u0111i\u1EC3m tr\xEAn \u0111\u1ED1i t\u01B0\u1EE3ng \xB7 b\u1EA5m g\u1EA7n ch\u1ED7 c\u1EAFt nhau: giao \u0111i\u1EC3m"], () => []),
    T2("intersect", "Giao \u0111i\u1EC3m", "C\u01A1 b\u1EA3n", "\u2715", ["curve", "curve"], ["Ch\u1ECDn \u0111\u01B0\u1EDDng th\u1EE9 nh\u1EA5t (ho\u1EB7c b\u1EA5m ngay ch\u1ED7 hai \u0111\u01B0\u1EDDng c\u1EAFt nhau)", "Ch\u1ECDn \u0111\u01B0\u1EDDng th\u1EE9 hai"], null),
    T2("midpoint", "Trung \u0111i\u1EC3m", "C\u01A1 b\u1EA3n", "\u25E6", ["point", "point"], ["Ch\u1ECDn \u0111i\u1EC3m th\u1EE9 nh\u1EA5t (ho\u1EB7c b\u1EA5m v\xE0o m\u1ED9t \u0111o\u1EA1n th\u1EB3ng)", "Ch\u1ECDn \u0111i\u1EC3m th\u1EE9 hai"], one("midpoint"), { segmentShortcut: true }),
    T2("segment", "\u0110o\u1EA1n th\u1EB3ng", "\u0110\u01B0\u1EDDng", "\u2014", ["point", "point"], ["Ch\u1ECDn \u0111i\u1EC3m \u0111\u1EA7u", "Ch\u1ECDn \u0111i\u1EC3m cu\u1ED1i"], one("segment"), { preview: "segment" }),
    T2("line", "\u0110\u01B0\u1EDDng th\u1EB3ng", "\u0110\u01B0\u1EDDng", "\u27F7", ["point", "point"], ["Ch\u1ECDn \u0111i\u1EC3m th\u1EE9 nh\u1EA5t", "Ch\u1ECDn \u0111i\u1EC3m th\u1EE9 hai"], one("line"), { preview: "line" }),
    T2("ray", "Tia", "\u0110\u01B0\u1EDDng", "\u2192", ["point", "point"], ["Ch\u1ECDn g\u1ED1c tia", "Ch\u1ECDn \u0111i\u1EC3m thu\u1ED9c tia"], one("ray"), { preview: "ray" }),
    T2("perpendicular", "\u0110\u01B0\u1EDDng vu\xF4ng g\xF3c", "\u0110\u01B0\u1EDDng", "\u22A5", ["point", "line"], ["Ch\u1ECDn \u0111i\u1EC3m v\xE0 \u0111\u01B0\u1EDDng th\u1EB3ng (th\u1EE9 t\u1EF1 b\u1EA5t k\u1EF3)", "Ch\u1ECDn n\u1ED1t \u0111\u1ED1i t\u01B0\u1EE3ng c\xF2n l\u1EA1i"], one("perpendicular"), { anyOrder: true }),
    T2("parallel", "\u0110\u01B0\u1EDDng song song", "\u0110\u01B0\u1EDDng", "\u2225", ["point", "line"], ["Ch\u1ECDn \u0111i\u1EC3m v\xE0 \u0111\u01B0\u1EDDng th\u1EB3ng (th\u1EE9 t\u1EF1 b\u1EA5t k\u1EF3)", "Ch\u1ECDn n\u1ED1t \u0111\u1ED1i t\u01B0\u1EE3ng c\xF2n l\u1EA1i"], one("parallel"), { anyOrder: true }),
    T2("perp_bisector", "Trung tr\u1EF1c", "\u0110\u01B0\u1EDDng", "\u22A5\u0332", ["point", "point"], ["Ch\u1ECDn \u0111i\u1EC3m th\u1EE9 nh\u1EA5t (ho\u1EB7c b\u1EA5m v\xE0o m\u1ED9t \u0111o\u1EA1n th\u1EB3ng)", "Ch\u1ECDn \u0111i\u1EC3m th\u1EE9 hai"], one("perp_bisector"), { segmentShortcut: true }),
    T2("angle_bisector", "Ph\xE2n gi\xE1c trong", "\u0110\u01B0\u1EDDng", "\u2220", ["point", "point", "point"], ["Ch\u1ECDn \u0111i\u1EC3m tr\xEAn c\u1EA1nh th\u1EE9 nh\u1EA5t", "Ch\u1ECDn \u0110\u1EC8NH g\xF3c", "Ch\u1ECDn \u0111i\u1EC3m tr\xEAn c\u1EA1nh th\u1EE9 hai"], one("angle_bisector")),
    T2("ext_bisector", "Ph\xE2n gi\xE1c ngo\xE0i", "\u0110\u01B0\u1EDDng", "\u2220\u2091", ["point", "point", "point"], ["Ch\u1ECDn \u0111i\u1EC3m tr\xEAn c\u1EA1nh th\u1EE9 nh\u1EA5t", "Ch\u1ECDn \u0110\u1EC8NH g\xF3c", "Ch\u1ECDn \u0111i\u1EC3m tr\xEAn c\u1EA1nh th\u1EE9 hai"], one("angle_bisector", { external: true })),
    T2("circle", "T\xE2m + \u0111i\u1EC3m", "\u0110\u01B0\u1EDDng tr\xF2n", "\u25EF", ["point", "point"], ["Ch\u1ECDn t\xE2m", "Ch\u1ECDn m\u1ED9t \u0111i\u1EC3m tr\xEAn \u0111\u01B0\u1EDDng tr\xF2n"], one("circle"), { preview: "circle" }),
    T2("circle_3pts", "Qua 3 \u0111i\u1EC3m", "\u0110\u01B0\u1EDDng tr\xF2n", "\u2299", ["point", "point", "point"], TRI2, withCenter("circle_3pts")),
    T2("circle_radius", "Compa (t\xE2m, b\xE1n k\xEDnh AB)", "\u0110\u01B0\u1EDDng tr\xF2n", "\u2300", ["point", "point", "point"], ["Ch\u1ECDn t\xE2m", "Ch\u1ECDn \u0111\u1EA7u m\xFAt th\u1EE9 nh\u1EA5t c\u1EE7a b\xE1n k\xEDnh", "Ch\u1ECDn \u0111\u1EA7u m\xFAt th\u1EE9 hai"], one("circle_radius")),
    T2("reflect", "\u0110\u1ED1i x\u1EE9ng", "Bi\u1EBFn h\xECnh", "\u21CB", ["obj", "pl"], ["Ch\u1ECDn \u0111\u1ED1i t\u01B0\u1EE3ng c\u1EA7n l\u1EA5y \u0111\u1ED1i x\u1EE9ng (\u0111i\u1EC3m, \u0111\u01B0\u1EDDng, \u0111\u01B0\u1EDDng tr\xF2n)", "Ch\u1ECDn t\xE2m \u0111\u1ED1i x\u1EE9ng (\u0111i\u1EC3m) ho\u1EB7c tr\u1EE5c \u0111\u1ED1i x\u1EE9ng (\u0111\u01B0\u1EDDng th\u1EB3ng)"], one("reflect")),
    T2("projection", "H\xECnh chi\u1EBFu", "Bi\u1EBFn h\xECnh", "\u22BE", ["point", "line"], ["Ch\u1ECDn \u0111i\u1EC3m v\xE0 \u0111\u01B0\u1EDDng th\u1EB3ng (th\u1EE9 t\u1EF1 b\u1EA5t k\u1EF3)", "Ch\u1ECDn n\u1ED1t \u0111\u1ED1i t\u01B0\u1EE3ng c\xF2n l\u1EA1i"], (p) => [{ type: "projection", args: p }], { anyOrder: true }),
    T2("angle_mark", "\u0110\xE1nh d\u1EA5u g\xF3c", "\u0110\xE1nh d\u1EA5u", "\u2221", ["point", "point", "point"], ["Ch\u1ECDn \u0111i\u1EC3m tr\xEAn c\u1EA1nh th\u1EE9 nh\u1EA5t", "Ch\u1ECDn \u0110\u1EC8NH g\xF3c", "Ch\u1ECDn \u0111i\u1EC3m tr\xEAn c\u1EA1nh th\u1EE9 hai"], (p, app) => [{ type: "angle_mark", args: p, style: { ...app.markStyle("angle") } }]),
    T2("segment_mark", "\u0110\xE1nh d\u1EA5u \u0111o\u1EA1n", "\u0110\xE1nh d\u1EA5u", "\u2AFD", ["point", "point"], ["Ch\u1ECDn \u0111\u1EA7u m\xFAt th\u1EE9 nh\u1EA5t (ho\u1EB7c b\u1EA5m v\xE0o m\u1ED9t \u0111o\u1EA1n th\u1EB3ng)", "Ch\u1ECDn \u0111\u1EA7u m\xFAt th\u1EE9 hai"], (p, app) => [{ type: "segment_mark", args: p, style: { ...app.markStyle("segment") } }], { segmentShortcut: true }),
    T2("polygon", "T\xF4 mi\u1EC1n \u0111a gi\xE1c", "\u0110\xE1nh d\u1EA5u", "\u25B1", ["...point"], ["Ch\u1ECDn l\u1EA7n l\u01B0\u1EE3t c\xE1c \u0111\u1EC9nh; b\u1EA5m l\u1EA1i \u0111\u1EC9nh \u0111\u1EA7u (ho\u1EB7c Enter) \u0111\u1EC3 k\u1EBFt th\xFAc"], (p, app) => [{ type: "polygon", args: p, style: { ...app.markStyle("polygon") } }], { preview: "polygon" })
  ];
  var TOOL_BY_ID = Object.fromEntries([...TOOLS, ...LIBRARY].map((t) => [t.id, t]));
  var TOOLBAR = [
    { id: "move", label: "Ch\u1ECDn / k\xE9o", icon: "move", tools: ["move"] },
    { id: "point", label: "\u0110i\u1EC3m", icon: "point", tools: ["point", "intersect", "midpoint"] },
    { id: "circle", label: "\u0110\u01B0\u1EDDng tr\xF2n", icon: "circle", tools: ["circle", "circle_3pts", "circle_radius"] },
    { id: "line", label: "\u0110o\u1EA1n, tia, \u0111\u01B0\u1EDDng th\u1EB3ng", icon: "line", tools: ["segment", "ray", "line"] },
    { id: "construct", label: "D\u1EF1ng", icon: "construct", tools: ["perpendicular", "parallel", "perp_bisector", "angle_bisector", "ext_bisector", "projection", "reflect"] },
    { id: "mark", label: "\u0110\xE1nh d\u1EA5u", icon: "mark", tools: ["angle_mark", "segment_mark", "polygon"] },
    { id: "library", label: "C\xF4ng c\u1EE5", icon: "tools", tools: LIBRARY.map((t) => t.id), submenus: MENUS }
  ];

  // src/ui/icons.js
  var svg = (body) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  var dot2 = (x, y, r = 2.2) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/>`;
  var ICONS = {
    move: svg('<path d="M6 3l12 9-5.5 1 3.2 6.2-2.2 1.1-3.2-6.2L6 18z" fill="currentColor" stroke-width="1"/>'),
    point: svg(dot2(12, 12, 3.2)),
    circle: svg('<circle cx="12" cy="12" r="8"/>' + dot2(12, 12, 1.6) + dot2(20, 12, 1.6)),
    line: svg('<path d="M4 19L20 5"/>' + dot2(7, 16.4, 1.8) + dot2(17, 7.6, 1.8)),
    construct: svg('<path d="M3 18h18M12 18V4"/><path d="M12 15h3v3"/>' + dot2(12, 6, 1.8)),
    triangle: svg('<path d="M12 4L3.5 19h17z"/>' + dot2(12, 4, 1.8) + dot2(3.5, 19, 1.8) + dot2(20.5, 19, 1.8)),
    mark: svg('<path d="M4 19h16M4 19L16 6"/><path d="M10 19a6 6 0 0 0-1.8-4.3"/><path d="M8 11.5l2 2M10 9.5l2 2"/>'),
    tools: svg('<path d="M5 4l8 8-8 8z" fill="currentColor" stroke-width="1"/><circle cx="18" cy="7" r="1.4" fill="currentColor"/><circle cx="18" cy="12" r="1.4" fill="currentColor"/><circle cx="18" cy="17" r="1.4" fill="currentColor"/>'),
    undo: svg('<path d="M9 7H4V2"/><path d="M4 7a9 9 0 1 1-1 7"/>'),
    redo: svg('<path d="M15 7h5V2"/><path d="M20 7a9 9 0 1 0 1 7"/>'),
    panel: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M14 4v16"/>'),
    explore: svg('<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5"/>'),
    present: svg('<path d="M7 5l12 7-12 7z"/>'),
    projector: svg('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>')
  };

  // src/core/macro.js
  var USER_MENU = "7. C\xF4ng c\u1EE5 c\u1EE7a t\xF4i";
  function ancestors(doc, ids) {
    const out = /* @__PURE__ */ new Set();
    const stack = [...ids];
    while (stack.length) {
      const s = stepById(doc, stack.pop());
      if (!s) continue;
      for (const a of s.args) if (!out.has(a)) {
        out.add(a);
        stack.push(a);
      }
    }
    return out;
  }
  var isRoot = (s) => !s.args.length || s.type === "point_on";
  function createMacro(doc, selectedIds, label) {
    const k = kinds(doc);
    const sel = selectedIds.filter((id) => stepById(doc, id));
    if (!sel.length) return { ok: false, error: "H\xE3y ch\u1ECDn c\xE1c \u0111\u1ED1i t\u01B0\u1EE3ng k\u1EBFt qu\u1EA3 (gi\u1EEF Shift \u0111\u1EC3 ch\u1ECDn nhi\u1EC1u), c\xF3 th\u1EC3 ch\u1ECDn th\xEAm c\xE1c \u0111\u1ED1i t\u01B0\u1EE3ng ban \u0111\u1EA7u." };
    const selSet = new Set(sel);
    let results = sel.filter((id) => [...ancestors(doc, [id])].some((a) => selSet.has(a)));
    let givens = sel.filter((id) => !results.includes(id));
    if (!results.length) {
      results = sel;
      givens = [];
    }
    const givenSet = new Set(givens);
    const need = /* @__PURE__ */ new Set();
    const stack = [...results];
    while (stack.length) {
      const id = stack.pop();
      if (need.has(id) || givenSet.has(id)) continue;
      const s = stepById(doc, id);
      if (isRoot(s) && !results.includes(id)) {
        givenSet.add(id);
        givens.push(id);
        continue;
      }
      need.add(id);
      for (const a of s.args) stack.push(a);
    }
    if (results.some((id) => isRoot(stepById(doc, id)) && !stepById(doc, id).args.length))
      return { ok: false, error: "K\u1EBFt qu\u1EA3 kh\xF4ng \u0111\u01B0\u1EE3c l\xE0 \u0111i\u1EC3m t\u1EF1 do (\u0111i\u1EC3m t\u1EF1 do ch\u1EC9 c\xF3 th\u1EC3 l\xE0 \u0111\u1EA7u v\xE0o)." };
    const order = new Map(doc.steps.map((s, i) => [s.id, i]));
    givens = [...givenSet].sort((a, b) => order.get(a) - order.get(b));
    const body = [...need].sort((a, b) => order.get(a) - order.get(b));
    if (!body.length) return { ok: false, error: "Kh\xF4ng c\xF3 b\u01B0\u1EDBc d\u1EF1ng n\xE0o gi\u1EEFa \u0111\u1EA7u v\xE0o v\xE0 k\u1EBFt qu\u1EA3." };
    const ref = (id) => givenSet.has(id) ? "in:" + givens.indexOf(id) : "st:" + body.indexOf(id);
    const steps = body.map((id) => {
      const s = stepById(doc, id);
      const out = { type: s.type, args: s.args.map(ref) };
      if (s.params) out.params = { ...s.params };
      if (s.style) out.style = { ...s.style };
      if (results.includes(id)) {
        out.result = true;
        if (s.name) out.name = s.name;
      }
      return out;
    });
    const inputs = givens.map((id) => k.get(id) === "point" ? "point" : k.get(id));
    const hints = givens.map((id, i) => `Ch\u1ECDn ${inputs[i] === "point" ? "\u0111i\u1EC3m" : inputs[i] === "line" ? "\u0111\u01B0\u1EDDng th\u1EB3ng" : "\u0111\u01B0\u1EDDng tr\xF2n"} \u1EE9ng v\u1EDBi ${describe(doc, id)} (${i + 1}/${givens.length})`);
    return { ok: true, tool: { id: "user_" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36), label: label || "C\xF4ng c\u1EE5 m\u1EDBi", inputs, hints, steps } };
  }
  function macroTool(data) {
    return {
      id: data.id,
      label: data.label,
      menu: USER_MENU,
      icon: "\u2605",
      user: true,
      inputs: data.inputs,
      hints: data.hints,
      data,
      make(picks) {
        const map = (a) => a.startsWith("in:") ? picks[+a.slice(3)] : "$" + a.slice(3);
        return data.steps.map((s) => ({
          type: s.type,
          args: s.args.map(map),
          params: s.params,
          style: s.style,
          name: s.result ? s.name : void 0,
          hidden: !s.result
        }));
      }
    };
  }
  function validMacro(d) {
    return d && typeof d.id === "string" && typeof d.label === "string" && Array.isArray(d.inputs) && Array.isArray(d.steps) && d.steps.every((s) => STEP_TYPES[s.type] && Array.isArray(s.args) && s.args.every((a) => /^(in|st):\d+$/.test(a)));
  }

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
      const st = styleOf(s, k.get(s.id), app.theme);
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
    host.classList.toggle("show", ids.length > 0 && app.mode !== "present");
    if (!ids.length || app.mode === "present") {
      host.innerHTML = "";
      return;
    }
    const k = kinds(app.doc);
    const steps = ids.map((id) => stepById(app.doc, id));
    const s = steps[0];
    const kind = k.get(s.id);
    const st = styleOf(s, kind, app.theme);
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
    var _a;
    const host = document.getElementById("tool-options");
    if (!host) return;
    const t = app.toolId;
    const m = app.markDefaults;
    const tool = TOOL_BY_ID[t];
    if (tool && tool.options && app.mode === "edit") {
      const vals = (_a = app.toolParams || (app.toolParams = {}))[t] || (_a[t] = {});
      host.classList.add("show");
      host.innerHTML = `<div class="tool-group-name">${tool.label}</div>` + tool.options.map((o) => `<label class="row">${o.label} <input type="number" step="any" data-opt="${o.key}" value="${vals[o.key] ?? o.def}" style="width:80px"></label>`).join("");
      host.querySelectorAll("[data-opt]").forEach((inp) => inp.onchange = () => {
        const v = parseFloat(inp.value);
        if (Number.isFinite(v)) vals[inp.dataset.opt] = v;
      });
      return;
    }
    const show = ["angle_mark", "segment_mark", "polygon"].includes(t) && app.mode === "edit";
    host.classList.toggle("show", show);
    if (!show) {
      host.innerHTML = "";
      return;
    }
    const key = t === "polygon" ? "polyColor" : "color";
    let html = `<div class="tool-group-name">Ki\u1EC3u d\u1EA5u m\u1EDBi</div><div class="swatches"><button class="sw def ${!m[key] ? "on" : ""}" data-c="" title="M\xE0u m\u1EB7c \u0111\u1ECBnh c\u1EE7a b\u1ED9 ki\u1EC3u"></button>${PALETTE.map((c) => `<button class="sw ${m[key] === c.hex ? "on" : ""}" data-c="${c.hex}" style="background:${c.hex}" title="${c.name}"></button>`).join("")}</div>`;
    if (t === "angle_mark") html += `<div class="row">S\u1ED1 cung ${[1, 2, 3].map((n) => `<button class="mini ${m.arcs === n ? "on" : ""}" data-n="${n}">${n}</button>`).join("")}</div><div class="note">C\xE1c g\xF3c b\u1EB1ng nhau: d\xF9ng c\xF9ng m\xE0u v\xE0 c\xF9ng s\u1ED1 cung.</div>`;
    if (t === "segment_mark") html += `<div class="row">S\u1ED1 v\u1EA1ch ${[1, 2, 3].map((n) => `<button class="mini ${m.ticks === n ? "on" : ""}" data-n="${n}">${n}</button>`).join("")}</div>`;
    host.innerHTML = html;
    host.querySelectorAll("[data-c]").forEach((b) => b.onclick = () => {
      m[key] = b.dataset.c || null;
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
      this.markDefaults = { color: null, arcs: 1, ticks: 1, polyColor: null };
      this.theme = loadPref("theme", "mono");
      setTheme(this.theme);
      this.listeners = { change: [] };
    }
    // ================= khởi tạo =================
    mount() {
      this.view = new CanvasView(document.getElementById("board"));
      this.view.setBoundingBox([-8, 6, 8, -6]);
      this.renderer = new Renderer(this.view);
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
      this.relation = null;
      this.cancelTool();
      if (doc.view && Array.isArray(doc.view.bbox)) this.view.setBoundingBox(doc.view.bbox);
      this.refresh();
      this.emit("load");
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
      if (this.relation && !this.relation.ids.every((id) => stepById(this.doc, id))) {
        this.relation = null;
        this.highlight.clear();
      }
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
      return addSpecs(this.doc, specs, { join });
    }
    /** Tên hiển thị của một đối tượng (dùng khi công cụ đặt tên kết quả, vd I_A). */
    name(id) {
      return stepById(this.doc, id)?.name || "";
    }
    /** Tham số số của công cụ đang dùng (góc quay, tỉ số vị tự…), chỉnh ở thẻ tuỳ chọn. */
    opt(key, def) {
      const p = this.toolParams && this.toolParams[this.toolId] || {};
      return key in p ? p[key] : def;
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
      this.renderer.grid = this.grid;
      this.renderer.setScene(this.doc, this.values, {
        theme: this.theme,
        visible: this.visibleSet(),
        selected: this.mode === "present" ? /* @__PURE__ */ new Set() : this.selection,
        highlight: this.highlight
      });
      this.renderer.clearExtra();
      this.drawRelationOverlay?.();
      this.renderPanels();
    }
    /** Cập nhật nhanh khi kéo: chỉ tính lại các bước phụ thuộc (nếu có bộ cập nhật), rồi vẽ lại. */
    quickUpdate() {
      if (this.dragUpdater) this.dragUpdater(this.values);
      else this.values = evaluate(this.doc);
      this.renderer.update(this.values);
    }
    renderPanels() {
      renderStepList(this);
      renderProps(this);
      renderToolOptions(this);
      for (const id of ["btn-undo", "menu-undo"]) {
        const b = document.getElementById(id);
        if (b) b.disabled = !this.undoStack.length;
      }
      for (const id of ["btn-redo", "menu-redo"]) {
        const b = document.getElementById(id);
        if (b) b.disabled = !this.redoStack.length;
      }
      this.updatePresentBar();
    }
    // ================= toạ độ & chọn đối tượng =================
    toScreen(P2) {
      return this.view.toScreen(P2);
    }
    toUser(sx, sy) {
      return this.view.toUser(sx, sy);
    }
    eventPos(e) {
      const r = this.boardRect || (this.boardRect = this.view.canvas.getBoundingClientRect());
      return { sx: e.clientX - r.left, sy: e.clientY - r.top };
    }
    /** Các đối tượng gần vị trí màn hình (sx, sy), điểm trước, rồi theo khoảng cách. */
    hitTest(sx, sy) {
      const vis = this.visibleSet();
      const k = kinds(this.doc);
      const P2 = this.toUser(sx, sy);
      const px = 1 / this.view.scale;
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
      const tol = Math.max(1e-9 * this.figureScale(), tolPx / this.view.scale);
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
      const px = 1 / this.view.scale;
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
      this.markActiveTool(id);
      this.stage.classList.toggle("tool-active", id !== "move");
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
      const c = (x) => x ? { color: x } : {};
      if (kind === "angle") return { ...c(m.color), arcs: m.arcs };
      if (kind === "segment") return { ...c(m.color), ticks: m.ticks };
      return { ...c(m.polyColor) };
    }
    startPreview(tool) {
      this.renderer.clearExtra();
      if (!tool.preview || !this.picks.length) return;
      const r = this.renderer;
      const pts = this.picks.map((id) => () => this.values.get(id));
      const mouse = () => this.mouse;
      if (["segment", "line", "ray", "circle"].includes(tool.preview)) r.addExtra({ type: tool.preview, pts: [pts[0], mouse] });
      else if (tool.preview === "polygon") r.addExtra({ type: "polyline", pts: [...pts, mouse] });
    }
    // ================= chuột / cảm ứng =================
    bindPointer() {
      const canvas = this.view.canvas;
      const wrap = this.stage;
      const resetRect = () => {
        this.boardRect = null;
      };
      window.addEventListener("resize", resetRect);
      window.addEventListener("scroll", resetRect, true);
      this.view.onViewChange(resetRect);
      if (typeof ResizeObserver !== "undefined") new ResizeObserver(resetRect).observe(canvas);
      wrap.addEventListener("pointerdown", (e) => this.onPointerDown(e), true);
      let hoverPending = false;
      let lastEvent = null;
      wrap.addEventListener("pointermove", (e) => {
        if (this.drag) return;
        lastEvent = e;
        if (hoverPending) return;
        hoverPending = true;
        requestAnimationFrame(() => {
          hoverPending = false;
          if (this.drag || !lastEvent) return;
          const ev = lastEvent;
          const { sx, sy } = this.eventPos(ev);
          this.mouse = this.toUser(sx, sy);
          if (this.picks.length && this.renderer.extra.length) this.view.requestDraw();
          const hits = this.hitTest(sx, sy);
          let cursor = "";
          if (this.toolId === "move" || this.mode === "present") {
            const h = this.orderHitsForMove(hits)[0];
            if (h && h.kind === "point" && isDraggableType(stepById(this.doc, h.id).type)) cursor = "grab";
            else if (h && this.mode === "edit") cursor = "pointer";
            else if (this.mode === "edit" && this.labelAt(ev)) cursor = "move";
          } else cursor = hits.length ? "pointer" : "crosshair";
          canvas.style.cursor = cursor;
        });
      });
      canvas.addEventListener("wheel", (e) => {
        e.preventDefault();
        const { sx, sy } = this.eventPos(e);
        const dy = e.deltaMode === 1 ? e.deltaY * 30 : e.deltaY;
        this.view.zoomAt(sx, sy, Math.exp(-dy * 15e-4));
      }, { passive: false });
      canvas.addEventListener("dblclick", (e) => {
        if (this.mode === "present") return;
        const { sx, sy } = this.eventPos(e);
        const h = this.hitTest(sx, sy)[0];
        if (h && h.kind === "point") this.renameStep(h.id);
      });
    }
    /** Nhãn điểm tại vị trí chuột (để kéo nhãn). */
    labelAt(e) {
      const { sx, sy } = this.eventPos(e);
      for (const [id, b] of this.renderer.labelBoxes) {
        if (sx >= b.x - 2 && sx <= b.x + b.w + 2 && sy >= b.y - 2 && sy <= b.y + b.h + 2) return id;
      }
      return null;
    }
    /** Dời hình bằng cách kéo nền (một ngón/chuột) hoặc chụm hai ngón để phóng (màn hình cảm ứng). */
    startPan(e) {
      const pointers = this.panPointers || (this.panPointers = /* @__PURE__ */ new Map());
      pointers.set(e.pointerId, this.eventPos(e));
      if (this.panning) return;
      this.panning = true;
      const move = (ev) => {
        if (!pointers.has(ev.pointerId)) return;
        const prev = [...pointers.values()];
        const before = pointers.get(ev.pointerId);
        const now = this.eventPos(ev);
        pointers.set(ev.pointerId, now);
        if (pointers.size >= 2) {
          const [a0, b0] = prev, [a1, b1] = [...pointers.values()];
          const d0 = Math.hypot(a0.sx - b0.sx, a0.sy - b0.sy), d1 = Math.hypot(a1.sx - b1.sx, a1.sy - b1.sy);
          if (d0 > 5) this.view.zoomAt((a1.sx + b1.sx) / 2, (a1.sy + b1.sy) / 2, d1 / d0);
        } else this.view.panBy(now.sx - before.sx, now.sy - before.sy);
      };
      const up = (ev) => {
        pointers.delete(ev.pointerId);
        if (pointers.size) return;
        this.panning = false;
        window.removeEventListener("pointermove", move, true);
        window.removeEventListener("pointerup", up, true);
        window.removeEventListener("pointercancel", up, true);
      };
      window.addEventListener("pointermove", move, true);
      window.addEventListener("pointerup", up, true);
      window.addEventListener("pointercancel", up, true);
    }
    onPointerDown(e) {
      if (!e.target.closest("#board")) return;
      if (e.button !== void 0 && e.button !== 0) return;
      if (document.querySelector(".modal-back")) return;
      this.boardRect = null;
      const { sx, sy } = this.eventPos(e);
      if (sx < 0 || sy < 0 || sx > this.view.W || sy > this.view.H) return;
      if (this.panning) {
        this.startPan(e);
        return;
      }
      this.mouse = this.toUser(sx, sy);
      if (this.toolId !== "move" && this.mode === "edit") {
        e.stopPropagation();
        e.preventDefault();
        this.toolClick(sx, sy);
        return;
      }
      const hits = this.hitTest(sx, sy);
      const lab = this.mode === "edit" && !hits.some((x) => x.kind === "point" && x.d < 5) ? this.labelAt(e) : null;
      if (lab) {
        e.stopPropagation();
        e.preventDefault();
        const s = stepById(this.doc, lab);
        const off = s.style && s.style.labelOffset || this.renderer.labelOffsets.get(lab) || [9, 9];
        this.startDrag(e, { kind: "label", id: lab, start: JSON.stringify(this.doc), sx, sy, off: [...off] });
        return;
      }
      const h = this.pickForMove(hits, sx, sy);
      const step = h ? stepById(this.doc, h.id) : null;
      if (h && h.kind === "point" && isDraggableType(step.type)) {
        e.stopPropagation();
        e.preventDefault();
        this.startDrag(e, { kind: "point", id: h.id, start: JSON.stringify(this.doc) });
        if (this.mode === "edit") this.select(h.id, e.shiftKey, false, true);
        return;
      }
      if (h) {
        e.stopPropagation();
        e.preventDefault();
        if (this.mode === "edit") this.select(h.id, e.shiftKey, true, true);
        return;
      }
      e.preventDefault();
      if (this.mode === "edit" && this.selection.size && !e.shiftKey) {
        this.selection.clear();
        this.refresh();
      }
      this.startPan(e);
    }
    /**
     * Thứ tự ưu tiên khi bấm bằng công cụ Chọn/kéo. Khi nhiều điểm gần như trùng nhau dưới con trỏ (cách nhau
     * vài pixel, vd A và chân đường vuông góc E), ưu tiên: đối tượng ĐANG CHỌN → điểm KÉO ĐƯỢC → điểm dựng;
     * điểm luôn trước đường. Điểm ở xa hơn hẳn (≥ 5 px so với điểm gần nhất) không được ưu tiên.
     */
    orderHitsForMove(hits) {
      const pts = hits.filter((h) => h.kind === "point");
      const minD = pts.length ? Math.min(...pts.map((h) => h.d)) : 0;
      const rank = (h) => {
        const sel = this.mode === "edit" && this.selection.has(h.id) ? 0 : 1;
        if (h.kind === "point") {
          if (h.d > minD + 5) return 10;
          const drag = isDraggableType(stepById(this.doc, h.id).type) ? 0 : 1;
          return sel * 2 + drag;
        }
        return 20 + sel + (h.kind === "mark" ? 5 : 0);
      };
      return hits.slice().sort((a, b) => rank(a) - rank(b) || a.d - b.d);
    }
    /**
     * Chọn đối tượng cho lần nhấn chuột này. Nhấn lại đúng chỗ cũ thì lấy đối tượng hiện tại của vòng chuyển
     * (để nhấn rồi kéo luôn kéo đúng đối tượng đang chọn); nếu thả ra mà không kéo – tức là một lần BẤM lại
     * tại chỗ – thì chuyển sang đối tượng chồng nhau tiếp theo (finishPick). Thanh trạng thái cho biết đang chọn gì.
     */
    pickForMove(hits, sx, sy) {
      let order = this.orderHitsForMove(hits);
      if (!order.length) {
        this.cycle = null;
        return null;
      }
      const minD = Math.min(...order.filter((h) => h.kind === "point").map((h) => h.d), Infinity);
      if (minD < Infinity) order = order.filter((h) => h.kind === "point" && h.d <= minD + 5);
      const key = order.map((h) => h.id).sort().join(",");
      const c = this.cycle;
      let idx = 0;
      let again = false;
      if (c && !c.moved && c.key === key && Math.hypot(c.sx - sx, c.sy - sy) < 4) {
        const byId = new Map(order.map((h) => [h.id, h]));
        order = c.order.map((id) => byId.get(id));
        idx = c.idx;
        again = true;
      }
      this.cycle = { sx, sy, key, order: order.map((h) => h.id), idx, moved: false, again: again && order.length > 1 };
      const finish = () => {
        window.removeEventListener("pointerup", finish, true);
        this.finishPick();
      };
      window.addEventListener("pointerup", finish, true);
      const pts = order.filter((h) => h.kind === "point" && h.d <= order[0].d + 6);
      if (this.mode === "edit" && order.length > 1 && (pts.length > 1 || idx > 0)) {
        const nm = (h) => stepById(this.doc, h.id)?.name || describe(this.doc, h.id);
        this.showHint(`C\xF3 ${order.length} \u0111i\u1EC3m ch\u1ED3ng nhau t\u1EA1i \u0111\xE2y (${order.slice(0, 5).map(nm).join(", ")}): \u0111ang ch\u1ECDn ${nm(order[idx])} \u2014 b\u1EA5m l\u1EA1i t\u1EA1i ch\u1ED7 \u0111\u1EC3 ch\u1ECDn \u0111i\u1EC3m ti\u1EBFp theo`);
        this.hintSticky = true;
      } else if (this.hintSticky) {
        this.hintSticky = false;
        this.showHint();
      }
      return order[idx];
    }
    /** Thả chuột sau khi nhấn lại tại chỗ mà không kéo: chọn đối tượng chồng nhau tiếp theo. */
    finishPick() {
      const c = this.cycle;
      if (!c || !c.again || c.moved || this.mode !== "edit") return;
      c.idx = (c.idx + 1) % c.order.length;
      c.again = false;
      const id = c.order[c.idx];
      const nm = (x) => stepById(this.doc, x)?.name || describe(this.doc, x);
      this.select(id, false, true, true);
      this.showHint(`C\xF3 ${c.order.length} \u0111i\u1EC3m ch\u1ED3ng nhau t\u1EA1i \u0111\xE2y (${c.order.map(nm).join(", ")}): \u0111ang ch\u1ECDn ${nm(id)} \u2014 b\u1EA5m l\u1EA1i t\u1EA1i ch\u1ED7 \u0111\u1EC3 ch\u1ECDn \u0111i\u1EC3m ti\u1EBFp theo`);
      this.hintSticky = true;
    }
    /**
     * Kéo điểm hoặc nhãn. Sự kiện chuột chỉ ghi lại vị trí mới nhất; việc tính lại và vẽ được gom
     * vào requestAnimationFrame (≤ 1 lần mỗi khung hình) và chỉ tính lại các bước phụ thuộc vào điểm
     * đang kéo. Ghi lịch sử hoàn tác, đặt lại nhãn tự động, lưu nháp… chỉ làm một lần khi thả chuột.
     */
    startDrag(e, info) {
      this.drag = info;
      const step = stepById(this.doc, info.id);
      const P0 = this.values.get(info.id);
      if (info.kind === "point" && P0) info.grab = { x: P0.x - this.mouse.x, y: P0.y - this.mouse.y };
      if (info.kind === "point") this.dragUpdater = makeUpdater(this.doc, [info.id]);
      let pending = null;
      const apply = () => {
        if (!pending) return;
        const { sx, sy } = pending;
        pending = null;
        this.mouse = this.toUser(sx, sy);
        if (info.kind === "label") {
          const sc = this.projector ? 1.9 : 1;
          const off = [round1(info.off[0] + (sx - info.sx) / sc), round1(info.off[1] - (sy - info.sy) / sc)];
          step.style = { ...step.style || {}, labelOffset: off };
          this.renderer.setLabelOffset(info.id, off);
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
      this.view.frameHooks.push(apply);
      const move = (ev) => {
        pending = this.eventPos(ev);
        if (this.cycle && Math.hypot(pending.sx - this.cycle.sx, pending.sy - this.cycle.sy) > 3) this.cycle.moved = true;
        this.view.requestDraw();
      };
      const up = () => {
        window.removeEventListener("pointermove", move, true);
        window.removeEventListener("pointerup", up, true);
        window.removeEventListener("pointercancel", up, true);
        apply();
        this.view.frameHooks = this.view.frameHooks.filter((f) => f !== apply);
        this.drag = null;
        this.dragUpdater = null;
        if (JSON.stringify(this.doc) !== info.start) {
          this.pushUndo(info.start);
          this.afterChange();
        }
      };
      window.addEventListener("pointermove", move, true);
      window.addEventListener("pointerup", up, true);
      window.addEventListener("pointercancel", up, true);
    }
    select(id, additive = false, rerender = true, keepCycle = false) {
      if (!keepCycle) this.cycle = null;
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
      const v = await promptDialog("\u0110\u1ED5i t\xEAn", s.name, "G\xF5 nh\u01B0 c\xF4ng th\u1EE9c: I_A \u2192 I v\u1EDBi ch\u1EC9 s\u1ED1 A, X_{AB} \u2192 ch\u1EC9 s\u1ED1 AB, B' \u2192 B ph\u1EA9y, A1 \u2192 A\u2081.");
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
    /** Tô sáng một quan hệ do bộ khám phá tìm ra (null để bỏ). */
    setRelation(rel) {
      this.relation = rel;
      this.highlight = new Set(rel ? rel.ids : []);
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
        this.view.resize();
        this.boardRect = null;
        this.refresh();
      }, 80);
    }
    setThemeId(id) {
      this.theme = setTheme(id);
      savePref("theme", this.theme);
      this.updateMenuChecks();
      this.refresh();
    }
    /** Hiện/ẩn bảng các bước dựng (mặc định ẩn để dành chỗ cho bảng vẽ). */
    togglePanel(show = !document.body.classList.contains("panel-open"), remember = true) {
      document.body.classList.toggle("panel-open", !!show);
      if (remember) savePref("panel", show ? "1" : "0");
      this.updateMenuChecks();
      setTimeout(() => {
        this.view.resize();
        this.boardRect = null;
      }, 0);
    }
    updateMenuChecks() {
      document.querySelectorAll("[data-theme]").forEach((b) => b.classList.toggle("on", b.dataset.theme === this.theme));
      document.getElementById("btn-grid")?.classList.toggle("on", this.grid);
      document.getElementById("menu-panel")?.classList.toggle("on", document.body.classList.contains("panel-open"));
      document.getElementById("btn-panel")?.classList.toggle("on", document.body.classList.contains("panel-open"));
    }
    toggleGrid() {
      this.grid = !this.grid;
      this.renderer.grid = this.grid;
      this.updateMenuChecks();
      this.view.requestDraw();
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
      if (!pts.length) return this.view.setBoundingBox([-8, 6, 8, -6]);
      const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
      let [x1, x2, y1, y2] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
      const m = Math.max(x2 - x1, y2 - y1, 1) * 0.1;
      [x1, x2, y1, y2] = [x1 - m, x2 + m, y1 - m, y2 + m];
      const W = this.view.W, H = this.view.H;
      const per = Math.max((x2 - x1) / W, (y2 - y1) / H);
      const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
      this.view.setBoundingBox([cx - per * W / 2, cy + per * H / 2, cx + per * W / 2, cy - per * H / 2]);
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
            this.setRelation(null);
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
    /** Nạp công cụ tự tạo (lưu trong trình duyệt) và gắn vào menu "Công cụ › 7. Công cụ của tôi". */
    loadUserTools() {
      let list = [];
      try {
        list = JSON.parse(loadPref("tools", "[]"));
      } catch {
        list = [];
      }
      this.userTools = Array.isArray(list) ? list.filter(validMacro) : [];
      for (const id of Object.keys(TOOL_BY_ID)) if (TOOL_BY_ID[id].user) delete TOOL_BY_ID[id];
      for (const d of this.userTools) TOOL_BY_ID[d.id] = macroTool(d);
      const userIds = this.userTools.map((d) => d.id);
      this.toolbarGroups = TOOLBAR.map((g) => g.id === "library" ? { ...g, tools: [...g.tools, ...userIds], submenus: [...g.submenus, USER_MENU] } : g);
    }
    saveUserTools() {
      savePref("tools", JSON.stringify(this.userTools));
      this.loadUserTools();
      this.buildToolbar();
      this.markActiveTool(this.toolId);
    }
    async userToolAction(action, arg) {
      if (action === "create") {
        const r0 = createMacro(this.doc, [...this.selection], "x");
        if (!r0.ok) return toast(r0.error, 5e3);
        const name = await promptDialog("T\u1EA1o c\xF4ng c\u1EE5 m\u1EDBi", "", `\u0110\u1EA7u v\xE0o: ${r0.tool.inputs.length} (${r0.tool.inputs.map((t) => ({ point: "\u0111i\u1EC3m", line: "\u0111\u01B0\u1EDDng th\u1EB3ng", circle: "\u0111\u01B0\u1EDDng tr\xF2n" })[t]).join(", ")}); ${r0.tool.steps.length} b\u01B0\u1EDBc d\u1EF1ng. \u0110\u1EB7t t\xEAn cho c\xF4ng c\u1EE5:`);
        if (!name || !name.trim()) return;
        r0.tool.label = name.trim();
        this.userTools.push(r0.tool);
        this.saveUserTools();
        toast(`\u0110\xE3 t\u1EA1o c\xF4ng c\u1EE5 "${r0.tool.label}" (C\xF4ng c\u1EE5 \u203A ${USER_MENU})`, 4e3);
      } else if (action === "delete") {
        const d = this.userTools.find((x) => x.id === arg);
        if (!d || !await confirmDialog("Xo\xE1 c\xF4ng c\u1EE5", `Xo\xE1 c\xF4ng c\u1EE5 <b>${escapeHTML(d.label)}</b>?`, "Xo\xE1")) return;
        this.userTools = this.userTools.filter((x) => x.id !== arg);
        if (this.toolId === arg) this.setTool("move");
        this.saveUserTools();
      } else if (action === "export") {
        if (!this.userTools.length) return toast("Ch\u01B0a c\xF3 c\xF4ng c\u1EE5 t\u1EF1 t\u1EA1o n\xE0o");
        const blob = new Blob([JSON.stringify({ format: "hinh-hoc-dong-cong-cu", version: 1, tools: this.userTools }, null, 1)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "cong-cu-cua-toi.json";
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          URL.revokeObjectURL(a.href);
          a.remove();
        }, 1e3);
      } else if (action === "import") {
        const inp = document.createElement("input");
        inp.type = "file";
        inp.accept = ".json,application/json";
        inp.onchange = async () => {
          try {
            const data = JSON.parse(await inp.files[0].text());
            const list = (Array.isArray(data) ? data : data.tools || []).filter(validMacro);
            if (!list.length) throw new Error("T\u1EC7p kh\xF4ng ch\u1EE9a c\xF4ng c\u1EE5 h\u1EE3p l\u1EC7");
            for (const d of list) {
              this.userTools = this.userTools.filter((x) => x.id !== d.id);
              this.userTools.push(d);
            }
            this.saveUserTools();
            toast(`\u0110\xE3 nh\u1EADp ${list.length} c\xF4ng c\u1EE5`);
          } catch (e) {
            toast("Kh\xF4ng nh\u1EADp \u0111\u01B0\u1EE3c: " + e.message, 5e3);
          }
        };
        inp.click();
      }
    }
    buildToolbar() {
      const host = document.getElementById("tools");
      if (!this.toolbarGroups) this.loadUserTools();
      const groups = this.toolbarGroups;
      this.groupCurrent = this.groupCurrent || {};
      for (const g of groups) if (!this.groupCurrent[g.id]) this.groupCurrent[g.id] = g.tools[0];
      host.innerHTML = groups.map((g) => {
        const many = g.tools.length > 1 || g.menu;
        const btn = (id) => {
          const t = TOOL_BY_ID[id];
          return `<button class="tool" data-tool="${id}" title="${escapeHTML(t.label)}"><span class="ti">${t.icon}</span><span class="tl">${escapeHTML(t.label)}</span></button>`;
        };
        const items = g.submenus ? g.submenus.map((m) => {
          const ids = g.tools.filter((id) => TOOL_BY_ID[id].menu === m);
          let list = ids.map(btn).join("");
          if (m === USER_MENU) {
            list = ids.map((id) => `<div class="user-tool">${btn(id)}<button class="tool-del" data-del="${id}" title="Xo\xE1 c\xF4ng c\u1EE5 n\xE0y">\u2715</button></div>`).join("") + (ids.length ? '<div class="menu-sep"></div>' : '<div class="note" style="padding:4px 8px">Ch\u01B0a c\xF3 c\xF4ng c\u1EE5 n\xE0o. Ch\u1ECDn c\xE1c \u0111\u1ED1i t\u01B0\u1EE3ng k\u1EBFt qu\u1EA3 tr\xEAn h\xECnh (Shift \u0111\u1EC3 ch\u1ECDn nhi\u1EC1u, c\xF3 th\u1EC3 ch\u1ECDn c\u1EA3 \u0111\u1ED1i t\u01B0\u1EE3ng ban \u0111\u1EA7u) r\u1ED3i b\u1EA5m "T\u1EA1o c\xF4ng c\u1EE5".</div>') + '<button class="tool-action" data-action="create">\uFF0B T\u1EA1o c\xF4ng c\u1EE5 t\u1EEB c\xE1c \u0111\u1ED1i t\u01B0\u1EE3ng \u0111ang ch\u1ECDn\u2026</button><button class="tool-action" data-action="export">Xu\u1EA5t c\xE1c c\xF4ng c\u1EE5 ra t\u1EC7p\u2026</button><button class="tool-action" data-action="import">Nh\u1EADp c\xF4ng c\u1EE5 t\u1EEB t\u1EC7p\u2026</button>';
          }
          return `<div class="sub"><button class="sub-title">${escapeHTML(m)}<span class="caret">\u203A</span></button><div class="sub-pop">${list}</div></div>`;
        }).join("") + (g.extraHTML ? g.extraHTML(this) : "") : g.tools.map(btn).join("");
        return `<div class="tb-group" data-group="${g.id}">
          <button class="tb-btn" data-group="${g.id}" title="${escapeHTML(g.label)}">${ICONS[g.icon] || ""}${many ? '<span class="tb-more"></span>' : ""}</button>
          ${many ? `<div class="flyout"><div class="flyout-title">${escapeHTML(g.label)}</div>${items}</div>` : ""}
        </div>`;
      }).join("");
      const closeAll = () => host.querySelectorAll(".tb-group.open, .sub.open").forEach((x) => x.classList.remove("open"));
      if (this.toolbarBound) return;
      this.toolbarBound = true;
      host.addEventListener("mouseover", (e) => {
        const st = e.target.closest(".sub-title");
        if (!st || st.parentElement.classList.contains("open")) return;
        st.parentElement.parentElement.querySelectorAll(".sub.open").forEach((x) => x.classList.remove("open"));
        st.parentElement.classList.add("open");
      });
      host.onclick = (e) => {
        const act = e.target.closest("[data-action], [data-del]");
        if (act) {
          closeAll();
          this.userToolAction(act.dataset.action || "delete", act.dataset.del);
          return;
        }
        const tb = e.target.closest(".tb-btn");
        const tl = e.target.closest(".tool");
        const st = e.target.closest(".sub-title");
        if (st) {
          const subEl = st.parentElement;
          subEl.parentElement.querySelectorAll(".sub.open").forEach((x) => x !== subEl && x.classList.remove("open"));
          subEl.classList.add("open");
          return;
        }
        if (tl) {
          const g2 = tl.closest(".tb-group").dataset.group;
          this.groupCurrent[g2] = tl.dataset.tool;
          closeAll();
          this.setTool(tl.dataset.tool);
          return;
        }
        if (!tb) return;
        const gEl = tb.closest(".tb-group");
        const g = this.toolbarGroups.find((x) => x.id === tb.dataset.group);
        const wasOpen = gEl.classList.contains("open");
        closeAll();
        if (g.menu) {
          if (!wasOpen) {
            gEl.classList.add("open");
            g.menu(gEl.querySelector(".flyout"), this, closeAll);
          }
          return;
        }
        if (!g.submenus) this.setTool(this.groupCurrent[g.id]);
        if (g.tools.length > 1 && !wasOpen) gEl.classList.add("open");
      };
      document.addEventListener("pointerdown", (e) => {
        if (e.target.closest("#tools") || !host.querySelector(".tb-group.open")) return;
        closeAll();
        if (e.target.closest("#board")) {
          e.stopPropagation();
          e.preventDefault();
        }
      }, true);
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeAll();
      });
    }
    /** Đánh dấu công cụ đang dùng trên thanh công cụ. */
    markActiveTool(id) {
      const groups = this.toolbarGroups || TOOLBAR;
      this.groupCurrent || (this.groupCurrent = {});
      document.querySelectorAll("#tools .tool").forEach((b) => b.classList.toggle("active", b.dataset.tool === id));
      for (const g of groups) {
        const on = g.tools.includes(id) || !!(g.isActive && g.isActive(id));
        if (g.tools.includes(id)) this.groupCurrent[g.id] = id;
        document.querySelector(`#tools .tb-group[data-group="${g.id}"]`)?.classList.toggle("active", on);
      }
    }
    bindButtons() {
      const on = (id, fn) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("click", fn);
      };
      for (const [id, ic] of [["btn-undo", "undo"], ["btn-redo", "redo"], ["btn-explore", "explore"], ["btn-present", "present"], ["btn-projector", "projector"], ["btn-panel", "panel"]]) {
        const b = document.getElementById(id);
        if (b) b.innerHTML = ICONS[ic];
      }
      const menus = [...document.querySelectorAll("#topbar .menu")];
      const closeMenus = () => menus.forEach((m) => m.classList.remove("open"));
      for (const m of menus) {
        m.querySelector(".menu-btn").addEventListener("click", (e) => {
          e.stopPropagation();
          const open = m.classList.contains("open");
          closeMenus();
          if (!open) m.classList.add("open");
        });
        m.querySelector(".menu-pop").addEventListener("click", (e) => {
          if (e.target.closest("button")) closeMenus();
        });
        m.addEventListener("mouseenter", () => {
          if (menus.some((x) => x.classList.contains("open")) && !m.classList.contains("open")) {
            closeMenus();
            m.classList.add("open");
          }
        });
      }
      document.addEventListener("pointerdown", (e) => {
        if (e.target.closest("#topbar .menu") || !menus.some((m) => m.classList.contains("open"))) return;
        closeMenus();
        if (e.target.closest("#board")) {
          e.stopPropagation();
          e.preventDefault();
        }
      }, true);
      on("btn-undo", () => this.undo());
      on("btn-redo", () => this.redo());
      on("menu-undo", () => this.undo());
      on("menu-redo", () => this.redo());
      document.querySelectorAll("[data-theme]").forEach((b) => b.addEventListener("click", () => this.setThemeId(b.dataset.theme)));
      on("btn-panel", () => this.togglePanel());
      on("menu-panel", () => this.togglePanel());
      on("btn-close-panel", () => this.togglePanel(false));
      this.togglePanel(loadPref("panel", "0") === "1", false);
      this.updateMenuChecks();
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
        this.view.setBoundingBox([-8, 6, 8, -6]);
      });
    }
  };
  function loadPref(key, def) {
    try {
      return localStorage.getItem("hinh-hoc-dong:" + key) ?? def;
    } catch {
      return def;
    }
  }
  function savePref(key, v) {
    try {
      localStorage.setItem("hinh-hoc-dong:" + key, v);
    } catch {
    }
  }
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
        const M12 = b.add("midpoint", [B, C], {}, "M");
        const M22 = b.add("midpoint", [C, A], {}, "K");
        const M32 = b.add("midpoint", [A, B], {}, "L");
        b.add("midpoint", [A, H], {}, "X");
        b.add("midpoint", [B, H], {}, "Y");
        b.add("midpoint", [C, H], {}, "Z");
        b.add("circle_3pts", [M12, M22, M32], {}, "\u03C9", { style: { color: "#7e22ce" } });
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
    },
    dense: {
      title: "H\xECnh d\xE0y (m\xF4 ph\u1ECFng \u0111\u1EC1 VMO, d\xF9ng \u0111o hi\u1EC7u n\u0103ng)",
      build() {
        const b = new Builder();
        const A = b.point(0.6, 3.6, "A"), B = b.point(-1.4, -0.6, "B"), C = b.point(2.4, -0.6, "C");
        const BC = b.add("line", [B, C]);
        b.add("segment", [A, B]);
        b.add("segment", [A, C]);
        const eA = b.add("angle_bisector", [B, A, C], { external: true }, void 0, { hidden: true });
        const eB = b.add("angle_bisector", [A, B, C], { external: true }, void 0, { hidden: true });
        const eC = b.add("angle_bisector", [A, C, B], { external: true }, void 0, { hidden: true });
        const IA = b.add("intersection", [eB, eC], {}, "I_A");
        const IB = b.add("intersection", [eA, eC], {}, "I_B");
        const IC = b.add("intersection", [eA, eB], {}, "I_C");
        const TA = b.add("projection", [IA, BC], {}, "T");
        const Q = b.add("projection", [IB, BC], {}, "Q");
        const P2 = b.add("projection", [IC, BC], {}, "P");
        b.add("circle", [IA, TA]);
        b.add("circle", [IB, Q]);
        b.add("circle", [IC, P2]);
        const w = b.add("circumcircle", [A, B, C]);
        const I = b.add("incenter", [A, B, C], {}, "I", { hidden: true });
        for (const [X, Y] of [[IC, IB], [IC, B], [IC, C], [IB, B], [IB, C], [IA, B], [IA, C], [A, IA], [IC, P2], [IB, Q]]) b.add("segment", [X, Y]);
        const lBIB = b.add("line", [B, IB], {}, void 0, { hidden: true });
        const lCIC = b.add("line", [C, IC], {}, void 0, { hidden: true });
        const U = b.add("intersection_other", [lBIB, w, B], {}, "U");
        const V = b.add("intersection_other", [lCIC, w, C], {}, "V");
        const XA = b.add("midpoint", [I, IA], {}, "X_A");
        const XB = b.add("midpoint", [I, IB], {}, "X_B");
        const XC = b.add("midpoint", [I, IC], {}, "X_C");
        const sUV = b.add("segment", [U, V]);
        const PA = b.add("projection", [A, sUV], {}, "P_A");
        const PB = b.add("midpoint", [B, U], {}, "P_B");
        const PC = b.add("midpoint", [C, V], {}, "P_C");
        const Bp = b.add("reflect", [B, lCIC], {}, "B'");
        const Cp = b.add("reflect", [C, lBIB], {}, "C'");
        for (const [X, Y] of [
          [A, U],
          [A, V],
          [IC, U],
          [IB, V],
          [V, IB],
          [U, IC],
          [A, XA],
          [B, XB],
          [C, XC],
          [PB, PC],
          [PA, XA],
          [XB, XC],
          [B, Bp],
          [C, Cp],
          [Cp, IA],
          [Bp, IA],
          [C, Cp],
          [B, PC],
          [C, PB],
          [V, XB],
          [U, XC],
          [IA, U],
          [IA, V],
          [PB, XA],
          [PC, XA]
        ]) b.add("segment", [X, Y]);
        const sAB = b.doc.steps[4].id, sAC = b.doc.steps[5].id;
        const tp = [];
        for (const X of [IA, IB, IC]) for (const l of [sAB, sAC]) tp.push(b.add("projection", [X, l]));
        const mids = [[B, C], [C, A], [A, B]].map(([X, Y]) => b.add("midpoint", [X, Y]));
        b.add("segment", [tp[0], tp[1]]);
        b.add("segment", [mids[0], mids[1]]);
        b.add("segment", [mids[1], mids[2]]);
        b.add("nine_point_circle", [IA, IB, IC], {}, void 0, { hidden: true });
        b.add("circle_3pts", [U, V, I]);
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
    computeStep: () => computeStep,
    dependents: () => dependents,
    describe: () => describe,
    emptyDoc: () => emptyDoc,
    evaluate: () => evaluate,
    frames: () => frames,
    geom: () => geom_exports,
    indexOf: () => indexOf,
    kinds: () => kinds,
    makeUpdater: () => makeUpdater,
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
    const bb = app.view.getBoundingBox().map((v) => Math.round(v * 1e3) / 1e3);
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
    app.view.onViewChange(() => {
      clearTimeout(timer);
      timer = setTimeout(() => saveDraft(app), 600);
    });
    window.addEventListener("beforeunload", () => saveDraft(app));
  }

  // src/explore/knowledge.js
  var UF = class {
    constructor() {
      this.p = /* @__PURE__ */ new Map();
    }
    find(x) {
      if (!this.p.has(x)) this.p.set(x, x);
      let r = x;
      while (this.p.get(r) !== r) r = this.p.get(r);
      while (this.p.get(x) !== r) {
        const n = this.p.get(x);
        this.p.set(x, r);
        x = n;
      }
      return r;
    }
    union(a, b) {
      const ra = this.find(a), rb = this.find(b);
      if (ra !== rb) this.p.set(ra, rb);
      return ra !== rb;
    }
  };
  var Knowledge = class {
    /**
     * @param doc  tài liệu
     * @param rep  hàm id điểm → id đại diện (các điểm luôn trùng nhau gộp làm một)
     */
    constructor(doc, rep = (x) => x) {
      this.rep = rep;
      this.lines = [];
      this.circles = [];
      this.dir = new UF();
      this.perps = [];
      this.tans = [];
      const k = kinds(doc);
      this.kind = k;
      for (const s of doc.steps) {
        const def = STEP_TYPES[s.type];
        if (!def) continue;
        const kind = k.get(s.id);
        if (kind === "line") {
          const i = this.newLine();
          this.lines[i].objs.add(s.id);
          if (s.type === "perp_bisector") this.addTag(i, "PB:" + sortKey(s.args.map(rep)));
          if (s.type === "angle_bisector" && !(s.params && s.params.external)) this.addTag(i, abTag(s.args.map(rep)));
        } else if (kind === "circle") {
          const i = this.newCircle();
          this.circles[i].objs.add(s.id);
          if (s.type === "incircle") this.circles[i].tags.add("IC:" + sortKey(s.args.map(rep)));
          if (s.type === "circumcircle" || s.type === "circle_3pts") for (const a of s.args) this.circles[i].pts.add(rep(a));
        }
      }
      for (const s of doc.steps) {
        const def = STEP_TYPES[s.type];
        if (!def || !def.facts) continue;
        let facts = [];
        try {
          facts = def.facts(s, s.args.map((a) => k.get(a)), doc) || [];
        } catch {
          facts = [];
        }
        for (const f of facts) this.addFact(f);
      }
      this.saturate();
    }
    newLine() {
      this.lines.push({ pts: /* @__PURE__ */ new Set(), objs: /* @__PURE__ */ new Set(), tags: /* @__PURE__ */ new Set(), alive: true });
      return this.lines.length - 1;
    }
    newCircle() {
      this.circles.push({ pts: /* @__PURE__ */ new Set(), objs: /* @__PURE__ */ new Set(), tags: /* @__PURE__ */ new Set(), alive: true });
      return this.circles.length - 1;
    }
    addTag(i, tag) {
      this.lines[i].tags.add(tag);
    }
    /** Chỉ số thực thể đường thẳng ứng với tham chiếu (id đối tượng hoặc tham chiếu ảo). */
    lineOf(ref) {
      const L = this.lines;
      if (typeof ref === "string") return L.findIndex((e) => e.alive && e.objs.has(ref));
      if (ref.L) {
        const [a, b] = ref.L.map(this.rep);
        if (a === b) return -1;
        let i = L.findIndex((e) => e.alive && e.pts.has(a) && e.pts.has(b));
        if (i < 0) {
          i = this.newLine();
          L[i].pts.add(a);
          L[i].pts.add(b);
        }
        return i;
      }
      if (ref.PB) return this.tagged("PB:" + sortKey(ref.PB.map(this.rep)), () => {
        const j = this.lineOf({ L: ref.PB });
        return j;
      });
      if (ref.AB) return this.tagged(abTag(ref.AB.map(this.rep)), null, this.rep(ref.AB[1]));
      return -1;
    }
    tagged(tag, perpTo, through) {
      let i = this.lines.findIndex((e) => e.alive && e.tags.has(tag));
      if (i < 0) {
        i = this.newLine();
        this.lines[i].tags.add(tag);
        if (through) this.lines[i].pts.add(through);
      }
      if (perpTo) {
        const j = perpTo();
        if (j >= 0) this.perps.push([i, j]);
      }
      return i;
    }
    circleOf(ref) {
      const C = this.circles;
      if (typeof ref === "string") return C.findIndex((e) => e.alive && e.objs.has(ref));
      if (ref.C) {
        const ps = ref.C.map(this.rep);
        if (new Set(ps).size < 3) return -1;
        let i = C.findIndex((e) => e.alive && ps.every((p) => e.pts.has(p)));
        if (i < 0) {
          i = this.newCircle();
          ps.forEach((p) => C[i].pts.add(p));
        }
        return i;
      }
      if (ref.IC) {
        const tag = "IC:" + sortKey(ref.IC.map(this.rep));
        let i = C.findIndex((e) => e.alive && e.tags.has(tag));
        if (i < 0) {
          i = this.newCircle();
          C[i].tags.add(tag);
        }
        return i;
      }
      return -1;
    }
    curveOf(ref) {
      if (typeof ref === "string") {
        const kd = this.kind.get(ref);
        if (kd === "line") return { t: "L", i: this.lineOf(ref) };
        if (kd === "circle") return { t: "C", i: this.circleOf(ref) };
        return null;
      }
      if (ref.C || ref.IC) return { t: "C", i: this.circleOf(ref) };
      return { t: "L", i: this.lineOf(ref) };
    }
    addFact(f) {
      if (f.on) {
        const P2 = this.rep(f.on[0]);
        const c = this.curveOf(f.on[1]);
        if (!c || c.i < 0) return;
        (c.t === "L" ? this.lines : this.circles)[c.i].pts.add(P2);
      } else if (f.col) {
        const ps = [...new Set(f.col.map(this.rep))];
        if (ps.length < 2) return;
        const i = this.lineOf({ L: [ps[0], ps[1]] });
        ps.forEach((p) => this.lines[i].pts.add(p));
      } else if (f.cyc) {
        const ps = [...new Set(f.cyc.map(this.rep))];
        if (ps.length < 3) return;
        const i = this.circleOf({ C: ps.slice(0, 3) });
        ps.forEach((p) => this.circles[i].pts.add(p));
      } else if (f.par || f.perp) {
        const [a, b] = (f.par || f.perp).map((r) => this.lineOf(r));
        if (a < 0 || b < 0) return;
        if (f.par) this.dir.union(a, b);
        else this.perps.push([a, b]);
      } else if (f.tan) {
        const [a, b] = f.tan.map((r) => this.curveOf(r));
        if (a && b && a.i >= 0 && b.i >= 0) this.tans.push([a, b]);
      }
    }
    mergeLine(i, j) {
      const a = this.lines[i], b = this.lines[j];
      for (const p of b.pts) a.pts.add(p);
      for (const o of b.objs) a.objs.add(o);
      for (const t of b.tags) a.tags.add(t);
      b.alive = false;
      this.dir.union(i, j);
      this.perps = this.perps.map(([x, y]) => [x === j ? i : x, y === j ? i : y]);
      this.tans = this.tans.map((pr) => pr.map((c) => c.t === "L" && c.i === j ? { t: "L", i } : c));
      this.redirect = this.redirect || /* @__PURE__ */ new Map();
      this.redirect.set(j, i);
    }
    mergeCircle(i, j) {
      const a = this.circles[i], b = this.circles[j];
      for (const p of b.pts) a.pts.add(p);
      for (const o of b.objs) a.objs.add(o);
      for (const t of b.tags) a.tags.add(t);
      b.alive = false;
      this.tans = this.tans.map((pr) => pr.map((c) => c.t === "C" && c.i === j ? { t: "C", i } : c));
    }
    saturate() {
      for (let round = 0; round < 20; round++) {
        let changed = false;
        const perpOf = /* @__PURE__ */ new Map();
        for (const [x, y] of this.perps) {
          const rx = this.dir.find(x), ry = this.dir.find(y);
          if (perpOf.has(ry)) changed = this.dir.union(perpOf.get(ry), rx) || changed;
          else perpOf.set(ry, rx);
          if (perpOf.has(rx)) changed = this.dir.union(perpOf.get(rx), ry) || changed;
          else perpOf.set(rx, ry);
        }
        const L = this.lines;
        for (let i = 0; i < L.length; i++) {
          if (!L[i].alive) continue;
          for (let j = i + 1; j < L.length; j++) {
            if (!L[j].alive) continue;
            let common = 0;
            for (const p of L[j].pts) if (L[i].pts.has(p)) common++;
            const sameTag = [...L[j].tags].some((t) => L[i].tags.has(t));
            if (common >= 2 || sameTag || common >= 1 && this.dir.find(i) === this.dir.find(j)) {
              this.mergeLine(i, j);
              changed = true;
            }
          }
        }
        const C = this.circles;
        for (let i = 0; i < C.length; i++) {
          if (!C[i].alive) continue;
          for (let j = i + 1; j < C.length; j++) {
            if (!C[j].alive) continue;
            let common = 0;
            for (const p of C[j].pts) if (C[i].pts.has(p)) common++;
            const sameTag = [...C[j].tags].some((t) => C[i].tags.has(t));
            if (common >= 3 || sameTag) {
              this.mergeCircle(i, j);
              changed = true;
            }
          }
        }
        if (!changed) break;
      }
    }
    // ---------- truy vấn ----------
    pointOnLineObj(P2, lineId) {
      const i = this.lineOf(lineId);
      return i >= 0 && this.lines[i].pts.has(this.rep(P2));
    }
    pointOnCircleObj(P2, cId) {
      const i = this.circleOf(cId);
      return i >= 0 && this.circles[i].pts.has(this.rep(P2));
    }
    collinear(ps) {
      const r = ps.map(this.rep);
      return this.lines.some((e) => e.alive && r.every((p) => e.pts.has(p)));
    }
    concyclic(ps) {
      const r = ps.map(this.rep);
      return this.circles.some((e) => e.alive && r.every((p) => e.pts.has(p)));
    }
    sameLine(a, b) {
      const i = this.lineOf(a), j = this.lineOf(b);
      return i >= 0 && i === j;
    }
    sameCircle(a, b) {
      const i = this.circleOf(a), j = this.circleOf(b);
      return i >= 0 && i === j;
    }
    parallel(a, b) {
      const i = this.lineOf(a), j = this.lineOf(b);
      return i >= 0 && j >= 0 && this.dir.find(i) === this.dir.find(j);
    }
    perpendicular(a, b) {
      const i = this.lineOf(a), j = this.lineOf(b);
      if (i < 0 || j < 0) return false;
      const ri = this.dir.find(i), rj = this.dir.find(j);
      return this.perps.some(([x, y]) => {
        const rx = this.dir.find(x), ry = this.dir.find(y);
        return rx === ri && ry === rj || rx === rj && ry === ri;
      });
    }
    tangent(a, b) {
      const ca = this.curveOf(a), cb = this.curveOf(b);
      if (!ca || !cb) return false;
      const eq = (u, v) => u.t === v.t && u.i === v.i;
      return this.tans.some(([x, y]) => eq(x, ca) && eq(y, cb) || eq(x, cb) && eq(y, ca));
    }
  };
  var sortKey = (arr) => [...arr].sort().join(",");
  var abTag = ([A, V, C]) => `AB:${V}:${sortKey([A, C])}`;

  // src/explore/explorer.js
  var DEFAULTS = {
    samples: 12,
    // số cấu hình ngẫu nhiên hợp lệ cần có (ngoài cấu hình gốc)
    maxAttempts: 150,
    // số lần thử tối đa (cấu hình suy biến bị loại)
    perturb: 0.3,
    // biên độ xê dịch điểm tự do, tính theo kích thước hình
    tol: 1e-6,
    // dung sai TƯƠNG ĐỐI theo kích thước hình
    minSep: 0.012,
    // hai điểm (vốn khác nhau) gần hơn minSep·kích thước → cấu hình suy biến
    minAngle: 4,
    // tam giác có góc < minAngle độ → suy biến
    maxRadius: 25,
    // đường tròn bán kính > maxRadius·kích thước → gần suy biến (3 điểm gần thẳng hàng)
    seed: 12345,
    maxPoints: 90
    // giới hạn để tránh bùng nổ tổ hợp
  };
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = a + 1831565813 >>> 0;
      let t = a;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function figureScale(vals, pointIds) {
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (const id of pointIds) {
      const v = vals.get(id);
      if (!v) continue;
      x1 = Math.min(x1, v.x);
      x2 = Math.max(x2, v.x);
      y1 = Math.min(y1, v.y);
      y2 = Math.max(y2, v.y);
    }
    const s = Math.hypot(x2 - x1, y2 - y1);
    return Number.isFinite(s) && s > 1e-12 ? s : 1;
  }
  var TRIANGLE_TYPES = /* @__PURE__ */ new Set([
    "circumcenter",
    "orthocenter",
    "incenter",
    "centroid",
    "nine_point_center",
    "altitude_foot",
    "incircle_touch",
    "arc_midpoint",
    "circle_3pts",
    "circumcircle",
    "incircle",
    "nine_point_circle",
    "angle_bisector",
    "excenter",
    "excircle",
    "lemoine",
    "kosnita",
    "symmedian_foot",
    "mixtilinear"
  ]);
  function findTriangles(doc, kindOf, { strict = false } = {}) {
    const tri2 = /* @__PURE__ */ new Map();
    const addTri = (ids) => {
      if (new Set(ids).size !== 3 || !ids.every((a) => kindOf.get(a) === "point")) return;
      const key = [...ids].sort().join(",");
      if (!tri2.has(key)) tri2.set(key, ids);
    };
    for (const s of doc.steps)
      if (TRIANGLE_TYPES.has(s.type) && s.args.length === 3 && !(strict && (s.type === "circle_3pts" || s.type === "angle_bisector"))) addTri(s.args);
    const adj = /* @__PURE__ */ new Map();
    const link = (a, b) => {
      if (!adj.has(a)) adj.set(a, /* @__PURE__ */ new Set());
      if (!adj.has(b)) adj.set(b, /* @__PURE__ */ new Set());
      adj.get(a).add(b);
      adj.get(b).add(a);
    };
    for (const s of doc.steps) if (["line", "segment", "ray"].includes(s.type)) link(s.args[0], s.args[1]);
    for (const [a, nb] of adj) for (const b of nb) for (const c of nb) if (a < b && b < c && adj.get(b).has(c)) addTri([a, b, c]);
    return [...tri2.values()];
  }
  function randomOverrides(doc, base, scale, rand, perturb) {
    const ov = /* @__PURE__ */ new Map();
    for (const s of doc.steps) {
      const p = paramsOf(s);
      if (s.type === "free_point") {
        const r = perturb * scale * Math.sqrt(rand()), a = 2 * Math.PI * rand();
        ov.set(s.id, { x: p.x + r * Math.cos(a), y: p.y + r * Math.sin(a) });
      } else if (s.type === "point_on") {
        const host = base.get(s.args[0]);
        if (!host) continue;
        let t = p.t;
        if (host.kind === "circle") t += (rand() * 2 - 1) * 0.9;
        else if (host.sub === "segment") t = Math.min(0.92, Math.max(0.08, t + (rand() * 2 - 1) * 0.3));
        else if (host.sub === "ray") t = Math.max(0.05, t * Math.exp((rand() * 2 - 1) * 0.5));
        else t += (rand() * 2 - 1) * 0.4;
        ov.set(s.id, { t });
      }
    }
    return ov;
  }
  function degenerate(doc, vals, ctx) {
    const { pointIds, curveIds, sameClassPairs, opts, kindOf, triangles, baseDist } = ctx;
    const scale = figureScale(vals, pointIds);
    for (const id of [...pointIds, ...curveIds]) if (!vals.get(id)) return "kh\xF4ng x\xE1c \u0111\u1ECBnh";
    const sep = opts.minSep * scale;
    for (let i = 0; i < pointIds.length; i++) {
      const a = vals.get(pointIds[i]);
      for (let j = i + 1; j < pointIds.length; j++) {
        if (sameClassPairs.has(pointIds[i] + "|" + pointIds[j])) continue;
        const d = dist(a, vals.get(pointIds[j]));
        if (d < sep && (!baseDist || d < 0.3 * baseDist[i][j])) return "\u0111i\u1EC3m g\u1EA7n tr\xF9ng";
      }
    }
    const sinMin = Math.sin(opts.minAngle * Math.PI / 180);
    const ang = (P2, Q, R) => Math.abs(cross(sub(Q, P2), sub(R, P2))) / (dist(P2, Q) * dist(P2, R) + 1e-300);
    for (const t of triangles) {
      const [A, B, C] = t.map((a) => vals.get(a));
      if (Math.min(ang(A, B, C), ang(B, C, A), ang(C, A, B)) < sinMin) return "tam gi\xE1c d\u1EB9t";
    }
    for (const s of doc.steps) {
      const v = vals.get(s.id);
      if (v && v.kind === "circle" && v.r > opts.maxRadius * scale) return "\u0111\u01B0\u1EDDng tr\xF2n qu\xE1 l\u1EDBn";
      if (s.type === "intersection" || s.type === "intersection_other") {
        const r = intersect(vals.get(s.args[0]), vals.get(s.args[1]));
        if (r.length === 2 && dist(r[0], r[1]) < sep * 2) return "g\u1EA7n ti\u1EBFp x\xFAc";
        if (r.length === 1 && kindOf.get(s.args[0]) === "line" && kindOf.get(s.args[1]) === "line") {
          const l1 = vals.get(s.args[0]), l2 = vals.get(s.args[1]);
          if (Math.abs(cross(unit(l1.d), unit(l2.d))) < sinMin) return "hai \u0111\u01B0\u1EDDng g\u1EA7n song song";
        }
      }
    }
    return null;
  }
  var T3 = {
    coincide: (P2, Q, e) => dist(P2, Q) < e,
    onLine: (P2, l, e) => distPointLine(P2, l) < e,
    onCircle: (P2, c, e) => Math.abs(dist(P2, c.c) - c.r) < e,
    collinear: (P2, Q, R, e) => distPointLine(R, lineThrough(P2, Q)) < e,
    parallel: (l1, l2, e, s) => Math.abs(cross(unit(l1.d), unit(l2.d))) < e / s,
    perpendicular: (l1, l2, e, s) => Math.abs(dot(unit(l1.d), unit(l2.d))) < e / s,
    sameLine: (l1, l2, e, s) => T3.parallel(l1, l2, e, s) && distPointLine(l2.p, l1) < e,
    sameCircle: (c1, c2, e) => dist(c1.c, c2.c) < e && Math.abs(c1.r - c2.r) < e,
    tangentLC: (l, c, e) => Math.abs(distPointLine(c.c, l) - c.r) < e,
    tangentCC: (c1, c2, e) => {
      const d = dist(c1.c, c2.c);
      if (d < e) return false;
      return Math.abs(d - (c1.r + c2.r)) < e || Math.abs(d - Math.abs(c1.r - c2.r)) < e;
    }
  };
  function explore(doc, options = {}) {
    const opts = { ...DEFAULTS, ...options };
    const t0 = Date.now();
    const kindOf = kinds(doc);
    const base = evaluate(doc);
    const pointIds = [], lineIds = [], circleIds = [];
    for (const s of doc.steps) {
      if (!base.get(s.id)) continue;
      const kd = kindOf.get(s.id);
      if (kd === "point") pointIds.push(s.id);
      else if (kd === "line") lineIds.push(s.id);
      else if (kd === "circle") circleIds.push(s.id);
    }
    if (pointIds.length > opts.maxPoints) pointIds.length = opts.maxPoints;
    const curveIds = [...lineIds, ...circleIds];
    const scale0 = figureScale(base, pointIds);
    const sameClassPairs = /* @__PURE__ */ new Set();
    for (let i = 0; i < pointIds.length; i++)
      for (let j = i + 1; j < pointIds.length; j++)
        if (dist(base.get(pointIds[i]), base.get(pointIds[j])) < opts.tol * scale0) sameClassPairs.add(pointIds[i] + "|" + pointIds[j]);
    const rand = rng(opts.seed);
    const triangles = findTriangles(doc, kindOf);
    const baseDist = pointIds.map((a) => pointIds.map((b) => dist(base.get(a), base.get(b))));
    const ctx = { pointIds, curveIds, sameClassPairs, opts, kindOf, triangles, baseDist };
    const samples = [{ vals: base, scale: scale0 }];
    let attempts = 0;
    const rejected = {};
    const baseDegenerate = degenerate(doc, base, { ...ctx, baseDist: null });
    while (samples.length < opts.samples + 1 && attempts < opts.maxAttempts) {
      attempts++;
      const ov = randomOverrides(doc, base, scale0, rand, opts.perturb);
      const vals = evaluate(doc, ov);
      const why = degenerate(doc, vals, ctx);
      if (why) {
        rejected[why] = (rejected[why] || 0) + 1;
        continue;
      }
      samples.push({ vals, scale: figureScale(vals, pointIds) });
    }
    const all = (fn) => samples.every(({ vals, scale }) => fn(vals, opts.tol * scale, scale));
    const repOf = new Map(pointIds.map((id) => [id, id]));
    const classes = [];
    for (const id of pointIds) {
      if (repOf.get(id) !== id) continue;
      const cls = [id];
      for (const j of pointIds) {
        if (j === id || repOf.get(j) !== j || !sameClassPairs.has(id + "|" + j)) continue;
        if (all((v, e) => T3.coincide(v.get(id), v.get(j), e))) {
          cls.push(j);
          repOf.set(j, id);
        }
      }
      if (cls.length > 1) classes.push(cls);
    }
    const rep = (id) => repOf.get(id) || id;
    const reps = pointIds.filter((id) => rep(id) === id);
    const know = new Knowledge(doc, rep);
    const special = recognizeSpecial(doc, samples, reps, circleIds, kindOf, opts, findTriangles(doc, kindOf, { strict: true }));
    const rel = [];
    const name = (id) => stepById(doc, id)?.name || id;
    const desc = (id) => describe(doc, id);
    const list = (ids) => ids.map(name).join(", ");
    for (const cls of classes) rel.push({ type: "coincide", ids: cls, text: `${cls.map(name).join(" \u2261 ")} (tr\xF9ng nhau)` });
    const lineRep = new Map(lineIds.map((id) => [id, id]));
    for (let i = 0; i < lineIds.length; i++) {
      const a = lineIds[i];
      if (lineRep.get(a) !== a) continue;
      for (let j = i + 1; j < lineIds.length; j++) {
        const b = lineIds[j];
        if (lineRep.get(b) !== b) continue;
        if (all((v, e, s) => T3.sameLine(v.get(a), v.get(b), e, s))) {
          lineRep.set(b, a);
          if (!know.sameLine(a, b)) rel.push({ type: "same_line", ids: [a, b], text: `${desc(a)} tr\xF9ng ${desc(b)}` });
        }
      }
    }
    const circRep = new Map(circleIds.map((id) => [id, id]));
    for (let i = 0; i < circleIds.length; i++) {
      const a = circleIds[i];
      if (circRep.get(a) !== a) continue;
      for (let j = i + 1; j < circleIds.length; j++) {
        const b = circleIds[j];
        if (circRep.get(b) !== b) continue;
        if (all((v, e) => T3.sameCircle(v.get(a), v.get(b), e))) {
          circRep.set(b, a);
          if (!know.sameCircle(a, b)) rel.push({ type: "same_circle", ids: [a, b], text: `${desc(a)} tr\xF9ng ${desc(b)}` });
        }
      }
    }
    const lines = lineIds.filter((id) => lineRep.get(id) === id);
    const circles = circleIds.filter((id) => circRep.get(id) === id);
    const v0 = base, e0 = opts.tol * scale0;
    const onLineSets = /* @__PURE__ */ new Map();
    for (const l of lines) {
      const on = reps.filter((P2) => T3.onLine(v0.get(P2), v0.get(l), e0) && all((v, e) => T3.onLine(v.get(P2), v.get(l), e)));
      onLineSets.set(l, on);
      const fresh = on.filter((P2) => !lineIdsSameAs(l, lineIds, lineRep).some((ll) => know.pointOnLineObj(P2, ll)));
      if (fresh.length) rel.push({ type: "on_line", ids: [l, ...fresh], text: `${list(fresh)} n\u1EB1m tr\xEAn ${desc(l)}` });
    }
    const onCircleSets = /* @__PURE__ */ new Map();
    for (const c of circles) {
      const on = reps.filter((P2) => T3.onCircle(v0.get(P2), v0.get(c), e0) && all((v, e) => T3.onCircle(v.get(P2), v.get(c), e)));
      onCircleSets.set(c, on);
      const fresh = on.filter((P2) => !lineIdsSameAs(c, circleIds, circRep).some((cc) => know.pointOnCircleObj(P2, cc)));
      if (fresh.length) rel.push({ type: "on_circle", ids: [c, ...fresh], text: `${list(fresh)} n\u1EB1m tr\xEAn ${desc(c)}` });
    }
    const seenCol = /* @__PURE__ */ new Set();
    for (let i = 0; i < reps.length; i++)
      for (let j = i + 1; j < reps.length; j++) {
        const A = reps[i], B = reps[j];
        const pa = v0.get(A), pb = v0.get(B);
        const set = [A, B];
        for (let k = 0; k < reps.length; k++) {
          if (k === i || k === j) continue;
          if (T3.collinear(pa, pb, v0.get(reps[k]), e0)) set.push(reps[k]);
        }
        if (set.length < 3) continue;
        const verified = [A, B, ...set.slice(2).filter((C) => all((v, e) => T3.collinear(v.get(A), v.get(B), v.get(C), e)))];
        if (verified.length < 3) continue;
        const key = [...verified].sort().join(",");
        if (seenCol.has(key)) continue;
        seenCol.add(key);
        if ([...onLineSets.values()].some((on) => verified.every((P2) => on.includes(P2)))) continue;
        if (know.collinear(verified)) continue;
        rel.push({ type: "collinear", ids: sortByDoc(doc, verified), text: `${list(sortByDoc(doc, verified))} th\u1EB3ng h\xE0ng` });
      }
    const seenCyc = /* @__PURE__ */ new Set();
    const nR = reps.length;
    for (let i = 0; i < nR; i++)
      for (let j = i + 1; j < nR; j++)
        for (let k = j + 1; k < nR; k++) {
          const A = reps[i], B = reps[j], C = reps[k];
          const circ = circleThrough(v0.get(A), v0.get(B), v0.get(C));
          if (!circ || circ.r > opts.maxRadius * scale0) continue;
          const set = [A, B, C];
          for (let m = k + 1; m < nR; m++) if (T3.onCircle(v0.get(reps[m]), circ, e0)) set.push(reps[m]);
          if (set.length < 4) continue;
          const key0 = set.join(",");
          if (seenCyc.has("raw:" + key0)) continue;
          const full = reps.filter((P2) => T3.onCircle(v0.get(P2), circ, e0));
          const ok = full.filter((P2, idx) => idx < 3 || all((v, e) => {
            const c = circleThrough(v.get(full[0]), v.get(full[1]), v.get(full[2]));
            return c && T3.onCircle(v.get(P2), c, e);
          }));
          const key = [...ok].sort().join(",");
          seenCyc.add("raw:" + key0);
          if (ok.length < 4 || seenCyc.has(key)) continue;
          seenCyc.add(key);
          if ([...onCircleSets.values()].some((on) => ok.every((P2) => on.includes(P2)))) continue;
          if (know.concyclic(ok)) continue;
          const ids = sortByDoc(doc, ok);
          rel.push({ type: "concyclic", ids, text: `${list(ids)} \u0111\u1ED3ng vi\xEAn` });
        }
    for (let i = 0; i < lines.length; i++)
      for (let j = i + 1; j < lines.length; j++) {
        const a = lines[i], b = lines[j];
        if (T3.parallel(v0.get(a), v0.get(b), e0, scale0) && all((v, e, s) => T3.parallel(v.get(a), v.get(b), e, s)) && !know.parallel(a, b))
          rel.push({ type: "parallel", ids: [a, b], text: `${desc(a)} \u2225 ${desc(b)}` });
        if (T3.perpendicular(v0.get(a), v0.get(b), e0, scale0) && all((v, e, s) => T3.perpendicular(v.get(a), v.get(b), e, s)) && !know.perpendicular(a, b))
          rel.push({ type: "perpendicular", ids: [a, b], text: `${desc(a)} \u22A5 ${desc(b)}` });
      }
    for (const l of lines)
      for (const c of circles)
        if (T3.tangentLC(v0.get(l), v0.get(c), e0) && all((v, e) => T3.tangentLC(v.get(l), v.get(c), e)) && !know.tangent(l, c))
          rel.push({ type: "tangent", ids: [l, c], text: `${desc(l)} ti\u1EBFp x\xFAc ${desc(c)}` });
    for (let i = 0; i < circles.length; i++)
      for (let j = i + 1; j < circles.length; j++) {
        const a = circles[i], b = circles[j];
        if (T3.tangentCC(v0.get(a), v0.get(b), e0) && all((v, e) => T3.tangentCC(v.get(a), v.get(b), e)) && !know.tangent(a, b))
          rel.push({ type: "tangent", ids: [a, b], text: `${desc(a)} ti\u1EBFp x\xFAc ${desc(b)}` });
      }
    const curves = [...lines, ...circles];
    const seenConc = /* @__PURE__ */ new Set();
    for (let i = 0; i < curves.length; i++)
      for (let j = i + 1; j < curves.length; j++) {
        const a = curves[i], b = curves[j];
        for (const X of intersect(v0.get(a), v0.get(b))) {
          if (dist(X, { x: 0, y: 0 }) > 1e6 || reps.some((P2) => dist(v0.get(P2), X) < 1e3 * e0)) continue;
          if (pointIds.length && minDistToPoints(X, v0, pointIds) > 20 * scale0) continue;
          const through = curves.filter((c) => c !== a && c !== b && onCurve(X, v0.get(c), e0));
          if (!through.length) continue;
          const set = [a, b, ...through];
          const key = [...set].sort().join(",");
          if (seenConc.has(key)) continue;
          seenConc.add(key);
          const ok = all((v, e) => intersect(v.get(a), v.get(b)).some((Y) => through.every((c) => onCurve(Y, v.get(c), e))));
          if (!ok) continue;
          const allLines = set.every((c) => kindOf.get(c) === "line");
          rel.push({ type: "concurrent", ids: set, text: allLines ? `${set.map(desc).join(", ")} \u0111\u1ED3ng quy` : `${set.map(desc).join(", ")} c\xF9ng \u0111i qua m\u1ED9t \u0111i\u1EC3m` });
        }
      }
    const final = rel.filter((r) => !((r.type === "collinear" || r.type === "concyclic") && rel.some((o) => o !== r && o.type === r.type && o.ids.length > r.ids.length && r.ids.every((x) => o.ids.includes(x)))));
    for (const r of final) {
      r.score = scoreOf(r, doc, kindOf, special);
      const notes = [...new Set(r.ids.filter((id) => special.has(id) && !STEP_TYPES[stepById(doc, id)?.type]?.tag).map((id) => `${describe(doc, id)} l\xE0 ${special.get(id).label}`))];
      if (notes.length) r.note = notes.join("; ");
    }
    final.sort((a, b) => b.score - a.score || a.ids.length - b.ids.length);
    return {
      relations: final,
      stats: {
        samples: samples.length - 1,
        attempts,
        rejected,
        baseDegenerate,
        points: reps.length,
        lines: lines.length,
        circles: circles.length,
        ms: Date.now() - t0
      }
    };
  }
  function lineIdsSameAs(id, ids, repMap) {
    return ids.filter((x) => repMap.get(x) === id);
  }
  function onCurve(P2, c, e) {
    return c.kind === "line" ? T3.onLine(P2, c, e) : T3.onCircle(P2, c, e);
  }
  function minDistToPoints(X, vals, ids) {
    let m = Infinity;
    for (const id of ids) m = Math.min(m, dist(vals.get(id), X));
    return m;
  }
  function sortByDoc(doc, ids) {
    const idx = new Map(doc.steps.map((s, i) => [s.id, i]));
    return [...ids].sort((a, b) => idx.get(a) - idx.get(b));
  }
  var BASE_SCORE = { tangent: 6, concurrent: 5, concyclic: 5, on_circle: 5, collinear: 5, on_line: 3.5, perpendicular: 3, parallel: 3, coincide: 3, same_line: 3, same_circle: 3 };
  var SPECIAL_NAMES = /* @__PURE__ */ new Set(["O", "I", "H"]);
  function specialWeight(step) {
    const tag = STEP_TYPES[step.type]?.tag;
    if (tag === "circumcircle" || tag === "incircle" || tag === "ninepoint") return 3;
    if (tag === "O" || tag === "I" || tag === "H") return 3;
    if (SPECIAL_NAMES.has(step.name)) return 2.5;
    if (tag === "G" || tag === "N") return 2;
    return 0;
  }
  function scoreOf(r, doc, kindOf, recognized) {
    let s = BASE_SCORE[r.type] || 2;
    let special = 0;
    for (const id of r.ids) special += Math.max(specialWeight(stepById(doc, id) || {}), recognized.get(id)?.weight || 0);
    s += Math.min(special, 7);
    if (r.ids.some((id) => kindOf.get(id) === "circle")) s += 0.5;
    return Math.round(s * 10) / 10;
  }
  function recognizeSpecial(doc, samples, reps, circleIds, kindOf, opts, tri2) {
    const out = /* @__PURE__ */ new Map();
    const name = (id) => stepById(doc, id)?.name || id;
    let count = 0;
    for (const [A, B, C] of tri2) {
      if (++count > 12) break;
      const triName = name(A) + name(B) + name(C);
      const at = (v) => [v.get(A), v.get(B), v.get(C)];
      const PTS = [
        ["O", 3, "t\xE2m ngo\u1EA1i ti\u1EBFp", circumcenter],
        ["H", 3, "tr\u1EF1c t\xE2m", orthocenter],
        ["I", 3, "t\xE2m n\u1ED9i ti\u1EBFp", incenter],
        ["G", 2, "tr\u1ECDng t\xE2m", centroid],
        ["N", 2, "t\xE2m \u0111\u01B0\u1EDDng tr\xF2n Euler", ninePointCenter]
      ];
      for (const [, w, label, f] of PTS)
        for (const P2 of reps) {
          if (out.has(P2) && out.get(P2).weight >= w) continue;
          if (samples.every(({ vals, scale }) => {
            const X = f(...at(vals));
            return X && dist(X, vals.get(P2)) < opts.tol * scale;
          }))
            out.set(P2, { weight: w, label: `${label} tam gi\xE1c ${triName}` });
        }
      const CIRC = [
        [3, "\u0111\u01B0\u1EDDng tr\xF2n ngo\u1EA1i ti\u1EBFp", (a, b, c) => circleThrough(a, b, c)],
        [3, "\u0111\u01B0\u1EDDng tr\xF2n n\u1ED9i ti\u1EBFp", (a, b, c) => circle(incenter(a, b, c), inradius(a, b, c))],
        [3, "\u0111\u01B0\u1EDDng tr\xF2n Euler", (a, b, c) => circleThrough(mid(a, b), mid(b, c), mid(c, a))]
      ];
      for (const [w, label, f] of CIRC)
        for (const c of circleIds) {
          if (out.has(c)) continue;
          if (samples.every(({ vals, scale }) => {
            const X = f(...at(vals));
            const Y = vals.get(c);
            return X && Y && T3.sameCircle(X, Y, opts.tol * scale);
          }))
            out.set(c, { weight: w, label: `${label} tam gi\xE1c ${triName}` });
        }
    }
    return out;
  }

  // src/ui/explorePanel.js
  var TYPE_LABEL = {
    collinear: "Th\u1EB3ng h\xE0ng",
    concyclic: "\u0110\u1ED3ng vi\xEAn",
    concurrent: "\u0110\u1ED3ng quy",
    parallel: "Song song",
    perpendicular: "Vu\xF4ng g\xF3c",
    tangent: "Ti\u1EBFp x\xFAc",
    on_circle: "\u0110i\u1EC3m tr\xEAn \u0111\u01B0\u1EDDng tr\xF2n",
    on_line: "\u0110i\u1EC3m tr\xEAn \u0111\u01B0\u1EDDng th\u1EB3ng",
    coincide: "Tr\xF9ng nhau",
    same_line: "Tr\xF9ng nhau",
    same_circle: "Tr\xF9ng nhau"
  };
  var esc3 = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  function setupExplore(app) {
    const pane = document.getElementById("tab-explore");
    let result = null;
    let stale = false;
    let active = -1;
    const render = () => {
      let html = `<div class="explore-head">
      <button id="btn-run-explore" class="primary">\u{1F50D} Kh\xE1m ph\xE1 h\xECnh n\xE0y</button>
      <div class="note">X\xEA d\u1ECBch ng\u1EABu nhi\xEAn c\xE1c \u0111i\u1EC3m t\u1EF1 do nhi\u1EC1u l\u1EA7n, ch\u1EC9 gi\u1EEF quan h\u1EC7 \u0111\xFAng tr\xEAn <b>m\u1ECDi</b> m\u1EABu, b\u1ECF quan h\u1EC7 hi\u1EC3n nhi\xEAn t\u1EEB c\xE1ch d\u1EF1ng.</div>
    </div>`;
      if (result) {
        const st = result.stats;
        html += `<div class="explore-stats">${result.relations.length} quan h\u1EC7 \xB7 ${st.samples} m\u1EABu ng\u1EABu nhi\xEAn (${st.attempts} l\u1EA7n th\u1EED) \xB7 ${st.ms} ms${stale ? ' \xB7 <b class="stale">h\xECnh \u0111\xE3 thay \u0111\u1ED5i, h\xE3y kh\xE1m ph\xE1 l\u1EA1i</b>' : ""}</div>`;
        if (st.samples < 5) html += `<div class="note warn">\xCDt m\u1EABu h\u1EE3p l\u1EC7 \u2013 h\xECnh c\xF3 th\u1EC3 g\u1EA7n suy bi\u1EBFn; k\u1EBFt qu\u1EA3 k\xE9m tin c\u1EADy.</div>`;
        if (!result.relations.length) html += '<div class="empty">Kh\xF4ng t\xECm th\u1EA5y quan h\u1EC7 n\xE0o ngo\xE0i c\xE1c quan h\u1EC7 hi\u1EC3n nhi\xEAn.</div>';
        html += '<div class="rel-list">' + result.relations.map((r, i) => `<div class="rel ${i === active ? "active" : ""}" data-i="${i}">
          <span class="rel-score" title="\u0110i\u1EC3m x\u1EBFp h\u1EA1ng">${r.score}</span>
          <div class="rel-body"><div class="rel-type">${TYPE_LABEL[r.type] || r.type}</div><div class="rel-text">${esc3(r.text)}</div>${r.note ? `<div class="rel-note">${esc3(r.note)}</div>` : ""}</div>
        </div>`).join("") + "</div>";
      }
      pane.innerHTML = html;
      pane.querySelector("#btn-run-explore").onclick = run2;
      pane.querySelectorAll(".rel").forEach((el) => el.onclick = () => select(+el.dataset.i));
    };
    const run2 = () => {
      const btn = pane.querySelector("#btn-run-explore");
      if (btn) {
        btn.disabled = true;
        btn.textContent = "\u0110ang kh\xE1m ph\xE1\u2026";
      }
      app.togglePanel(true);
      document.querySelector('[data-tab="tab-explore"]').click();
      setTimeout(() => {
        try {
          result = explore(app.doc);
          stale = false;
          active = -1;
          app.setRelation(null);
          toast(`T\xECm th\u1EA5y ${result.relations.length} quan h\u1EC7`);
        } catch (e) {
          console.error(e);
          toast("L\u1ED7i khi kh\xE1m ph\xE1: " + e.message, 5e3);
        }
        render();
      }, 30);
    };
    const select = (i) => {
      active = active === i ? -1 : i;
      app.setRelation(active >= 0 ? result.relations[active] : null);
      render();
    };
    app.on("load", () => {
      result = null;
      active = -1;
      render();
    });
    app.on("change", () => {
      if (result && !stale) {
        stale = true;
        render();
      }
    });
    const top = document.getElementById("btn-explore");
    if (top) top.onclick = run2;
    render();
  }
  function drawRelationOverlay(app) {
    const r = app.relation;
    if (!r) return;
    const R = app.renderer;
    const V = (id) => app.values.get(id);
    const style = { color: "#f59e0b", width: 2.2, dash: true };
    if (r.type === "collinear") {
      const ids = r.ids;
      let best = [ids[0], ids[1]], bd = -1;
      for (const a of ids) for (const b of ids) {
        const d = V(a) && V(b) ? dist(V(a), V(b)) : 0;
        if (d > bd) {
          bd = d;
          best = [a, b];
        }
      }
      R.addExtra({ type: "line", pts: best.map((id) => () => V(id)), style });
    } else if (r.type === "concyclic") {
      R.addExtra({ type: "circle3", pts: r.ids.slice(0, 3).map((id) => () => V(id)), style });
    } else if (r.type === "concurrent") {
      const common = () => {
        const [a, b, ...rest] = r.ids.map(V);
        if (!a || !b) return null;
        let best = null, bd = Infinity;
        for (const X of intersect(a, b)) {
          const d = rest.reduce((s, c) => s + (c ? distToObject(c, X) : 1e9), 0);
          if (d < bd) {
            bd = d;
            best = X;
          }
        }
        return best;
      };
      R.addExtra({ type: "point", pts: [common], style: { color: "#f59e0b", fill: "#fde68a", size: 7 } });
    }
  }

  // src/export/tikz.js
  var NAMED_COLORS = Object.fromEntries([
    ["#000000", "black"],
    ["#111827", "black"],
    ["#1f2937", "black"],
    ...PALETTE.slice(1).map((c) => [c.hex, c.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").replace(/[^A-Za-z]/g, "").toLowerCase()])
  ]);
  var PT_PER_PX = 0.4;
  var f3 = (v) => {
    const s = (Math.round(v * 1e3) / 1e3).toFixed(3).replace(/\.?0+$/, "");
    return s === "-0" ? "0" : s;
  };
  var xy = (P2) => `(${f3(P2.x)}, ${f3(P2.y)})`;
  function coordName(name, used) {
    let base = (name || "P").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/'/g, "p").replace(/[^A-Za-z0-9]/g, "");
    if (!base || /^\d/.test(base)) base = "P" + base;
    let n = base, i = 2;
    while (used.has(n)) n = base + "-" + i++;
    used.add(n);
    return n;
  }
  function anchorFor(off) {
    const a = Math.atan2(off[1], off[0]) * 180 / Math.PI;
    const dirs = ["right", "above right", "above", "above left", "left", "below left", "below", "below right"];
    return dirs[(Math.round(a / 45) % 8 + 8) % 8];
  }
  function clipLine(l, box, tMin = -Infinity) {
    let t0 = tMin, t1 = Infinity;
    const { p, d } = l;
    for (const [pp, dd, lo, hi] of [[p.x, d.x, box.x1, box.x2], [p.y, d.y, box.y1, box.y2]]) {
      if (Math.abs(dd) < 1e-14) {
        if (pp < lo || pp > hi) return null;
        continue;
      }
      let a = (lo - pp) / dd, b = (hi - pp) / dd;
      if (a > b) [a, b] = [b, a];
      t0 = Math.max(t0, a);
      t1 = Math.min(t1, b);
    }
    if (t0 >= t1) return null;
    return [{ x: p.x + t0 * d.x, y: p.y + t0 * d.y }, { x: p.x + t1 * d.x, y: p.y + t1 * d.y }];
  }
  function toTikZ(doc, opts = {}) {
    const width = opts.width || 12;
    const theme = opts.theme || "mono";
    const vals = opts.values || evaluate(doc);
    const k = kinds(doc);
    const visible = doc.steps.filter((s) => !s.hidden && vals.get(s.id));
    const pts = [];
    for (const s of visible) {
      const v = vals.get(s.id);
      if (v.kind === "point") pts.push(v);
      if (v.kind === "circle") pts.push({ x: v.c.x - v.r, y: v.c.y - v.r }, { x: v.c.x + v.r, y: v.c.y + v.r });
    }
    if (!pts.length) return "% H\xECnh tr\u1ED1ng\n";
    let x1 = Math.min(...pts.map((p) => p.x)), x2 = Math.max(...pts.map((p) => p.x));
    let y1 = Math.min(...pts.map((p) => p.y)), y2 = Math.max(...pts.map((p) => p.y));
    const span = Math.max(x2 - x1, y2 - y1, 1e-6);
    const m = span * 0.08;
    const box = { x1: x1 - m, x2: x2 + m, y1: y1 - m, y2: y2 + m };
    const unit2 = width / (box.x2 - box.x1);
    const cm = (c) => c / unit2;
    const colorDefs = /* @__PURE__ */ new Map();
    const full = (s) => styleOf(s, k.get(s.id), theme);
    const hexName = (hex) => {
      hex = hex.toLowerCase();
      if (NAMED_COLORS[hex]) {
        if (NAMED_COLORS[hex] !== "black") colorDefs.set(NAMED_COLORS[hex], hex);
        return NAMED_COLORS[hex];
      }
      const nm = "c" + hex.replace("#", "");
      colorDefs.set(nm, hex);
      return nm;
    };
    const col = (s) => hexName(full(s).color || "#000000");
    const baseWidth = styleOf({ type: "line" }, "line", theme).width;
    const opt = (...xs) => {
      const o = xs.filter((x) => x && x !== "black");
      return o.length ? `[${o.join(", ")}]` : "";
    };
    const lineOpts = (s) => {
      const st = full(s);
      const w = st.width && Math.abs(st.width - baseWidth) > 1e-9 ? `line width=${f3(st.width * PT_PER_PX)}pt` : "";
      return opt(col(s), st.dash ? "dashed" : "", w);
    };
    const centerOf = /* @__PURE__ */ new Map();
    for (const s of doc.steps) if (s.type === "center" && !centerOf.has(s.args[0])) centerOf.set(s.args[0], s.id);
    const used = /* @__PURE__ */ new Set();
    const cname = /* @__PURE__ */ new Map();
    for (const s of visible) if (k.get(s.id) === "point") cname.set(s.id, coordName(s.name, used));
    for (const s of visible) if (k.get(s.id) === "mark" || ["segment", "circle"].includes(s.type)) for (const a of s.args) {
      if (!cname.has(a) && vals.get(a)) cname.set(a, coordName(stepById(doc, a)?.name || a, used));
    }
    const ref = (id) => `(${cname.get(id)})`;
    const autoDirs = autoLabelDirs(doc, vals);
    const out = { coords: [], fills: [], circles: [], lines: [], marks: [], points: [], labels: [] };
    for (const [id, n] of cname) out.coords.push(`\\coordinate (${n}) at ${xy(vals.get(id))};${stepById(doc, id)?.hidden ? " % \u0111i\u1EC3m \u1EA9n" : ""}`);
    for (const s of visible) {
      const v = vals.get(s.id);
      const st = full(s);
      const kind = k.get(s.id);
      if (kind === "circle") {
        const cId = s.type === "circle" || s.type === "circle_radius" ? s.args[0] : centerOf.get(s.id);
        const cAt = cId && cname.has(cId) ? cId : [...cname.keys()].find((id) => dist(vals.get(id), v.c) < 1e-9 * (1 + v.r));
        const center = cAt ? ref(cAt) : xy(v.c);
        const fill = st.fill || 0;
        if (fill > 0) out.fills.push(`\\fill[${col(s)}, fill opacity=${f3(fill)}] ${center} circle (${f3(v.r)});`);
        out.circles.push(`\\draw${lineOpts(s)} ${center} circle (${f3(v.r)}); % ${s.name || ""}`);
        if (st.showLabel && s.name) {
          const P2 = { x: v.c.x + v.r * Math.cos(Math.PI / 4), y: v.c.y + v.r * Math.sin(Math.PI / 4) };
          out.labels.push(`\\node[above right, ${col(s)}] at ${xy(P2)} {${texLabel(s.name)}};`);
        }
      } else if (kind === "line") {
        const sub3 = s.type === "segment" ? "segment" : s.type === "ray" ? "ray" : v.sub;
        const desc = s.type === "line" || s.type === "segment" || s.type === "ray" ? s.args.map((a) => stepById(doc, a)?.name).join("") : s.name;
        if (sub3 === "segment" && s.type === "segment") out.lines.push(`\\draw${lineOpts(s)} ${ref(s.args[0])} -- ${ref(s.args[1])};`);
        else if (sub3 === "segment") out.lines.push(`\\draw${lineOpts(s)} ${xy(v.p)} -- ${xy(add(v.p, v.d))};`);
        else {
          const seg = clipLine(v, box, sub3 === "ray" ? 0 : -Infinity);
          if (seg) out.lines.push(`\\draw${lineOpts(s)} ${sub3 === "ray" && s.type === "ray" ? ref(s.args[0]) : xy(seg[0])} -- ${xy(seg[1])}; % ${sub3 === "ray" ? "tia" : "\u0111\u01B0\u1EDDng th\u1EB3ng"} ${desc}`);
          if (seg && st.showLabel && s.name) {
            const P2 = { x: seg[0].x + 0.85 * (seg[1].x - seg[0].x), y: seg[0].y + 0.85 * (seg[1].y - seg[0].y) };
            out.labels.push(`\\node[above, ${col(s)}] at ${xy(P2)} {${texLabel(s.name)}};`);
          }
        }
      } else if (s.type === "polygon") {
        const path = s.args.map(ref).join(" -- ") + " -- cycle";
        out.fills.push(`\\fill[${col(s)}, fill opacity=${f3(st.fill ?? 0.1)}] ${path};`);
        if (st.border) out.lines.push(`\\draw${lineOpts(s)} ${path};`);
      } else if (s.type === "angle_mark") {
        out.marks.push(...angleMark(v, s, col(s), cm, ref));
      } else if (s.type === "segment_mark") {
        out.marks.push(...segMark(v, s, col(s), cm));
      } else if (kind === "point") {
        const r = f3((st.size || 3) * 0.5);
        if (st.hollow) out.points.push(`\\filldraw[fill=white${col(s) === "black" ? "" : ", draw=" + col(s)}] ${ref(s.id)} circle (${r}pt);`);
        else out.points.push(`\\fill${opt(hexName(st.fillColor || st.color))} ${ref(s.id)} circle (${r}pt);`);
        const dir = st.labelOffset || (autoDirs.get(s.id) ? [autoDirs.get(s.id).x, autoDirs.get(s.id).y] : [1, 1]);
        if (st.showLabel !== false && s.name) out.labels.push(`\\node[${anchorFor(dir)}, inner sep=1.5pt] at ${ref(s.id)} {${texLabel(s.name)}};`);
      }
    }
    const L = [];
    L.push(`% ${doc.title ? doc.title + " \u2014 " : ""}xu\u1EA5t t\u1EEB H\xECnh h\u1ECDc \u0111\u1ED9ng`);
    L.push("% C\u1EA7n trong ph\u1EA7n m\u1EDF \u0111\u1EA7u: \\usepackage{tikz}");
    L.push("% \u0110\u1ED5i k\xEDch th\u01B0\u1EDBc h\xECnh: s\u1EEDa x=\u2026, y=\u2026 (\u0111\u01A1n v\u1ECB c\u1EE7a m\u1ED9t \xF4 to\u1EA1 \u0111\u1ED9).");
    L.push(`\\begin{tikzpicture}[x=${f3(unit2)}cm, y=${f3(unit2)}cm, line width=${f3(baseWidth * PT_PER_PX)}pt, line cap=round, line join=round]`);
    if (colorDefs.size) {
      L.push("  % M\xE0u");
      for (const [n, hex] of colorDefs) L.push(`  \\definecolor{${n}}{HTML}{${hex.slice(1).toUpperCase()}}`);
    }
    const sec = (title, arr) => {
      if (arr.length) {
        L.push(`  % ${title}`);
        for (const x of arr) L.push("  " + x);
      }
    };
    sec("To\u1EA1 \u0111\u1ED9 c\xE1c \u0111i\u1EC3m", out.coords);
    sec("T\xF4 n\u1EC1n", out.fills);
    sec("\u0110\u01B0\u1EDDng tr\xF2n", out.circles);
    sec("\u0110\u01B0\u1EDDng th\u1EB3ng, \u0111o\u1EA1n th\u1EB3ng, tia", out.lines);
    sec("\u0110\xE1nh d\u1EA5u g\xF3c, \u0111o\u1EA1n b\u1EB1ng nhau", out.marks);
    sec("\u0110i\u1EC3m", out.points);
    sec("Nh\xE3n", out.labels);
    L.push("\\end{tikzpicture}");
    return L.join("\n") + "\n";
  }
  function angleMark(v, s, color, cm, ref) {
    const { A, B, C } = v;
    const st = s.style || {};
    const a1 = Math.atan2(A.y - B.y, A.x - B.x);
    let diff = Math.atan2(C.y - B.y, C.x - B.x) - a1;
    while (diff <= -Math.PI) diff += 2 * Math.PI;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    const deg = (r) => f3(r * 180 / Math.PI);
    const r0 = cm(0.45);
    const vtx = ref(s.args[1]);
    const o = color === "black" ? "" : `[${color}]`;
    if (Math.abs(Math.abs(diff) - Math.PI / 2) < 1e-6 && st.right !== false) {
      const r = r0 * 0.7;
      return [`\\draw${o} ${vtx} ++(${deg(a1)}:${f3(r)}) -- ++(${deg(a1 + diff)}:${f3(r)}) -- ++(${deg(a1 + Math.PI)}:${f3(r)}); % g\xF3c vu\xF4ng`];
    }
    const n = Math.max(1, Math.min(4, st.arcs || 1));
    const outL = [];
    for (let i = 0; i < n; i++) {
      const r = r0 + i * cm(0.09);
      outL.push(`\\draw${o} ${vtx} ++(${deg(a1)}:${f3(r)}) arc[start angle=${deg(a1)}, end angle=${deg(a1 + diff)}, radius=${f3(r)}];`);
    }
    return outL;
  }
  function segMark(v, s, color, cm) {
    const { A, B } = v;
    const st = s.style || {};
    const L = dist(A, B);
    const u = { x: (B.x - A.x) / L, y: (B.y - A.y) / L };
    const n = { x: -u.y, y: u.x };
    const M = mid(A, B);
    const kk = Math.max(1, Math.min(4, st.ticks || 1));
    const h = cm(0.13), gap = cm(0.08);
    const o = color === "black" ? "" : `[${color}]`;
    const outL = [];
    for (let i = 0; i < kk; i++) {
      const off = (i - (kk - 1) / 2) * gap;
      const c = { x: M.x + off * u.x, y: M.y + off * u.y };
      outL.push(`\\draw${o} ${xy({ x: c.x - h * n.x, y: c.y - h * n.y })} -- ${xy({ x: c.x + h * n.x, y: c.y + h * n.y })};`);
    }
    return outL;
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
    const exList = document.getElementById("example-list");
    exList.innerHTML = Object.entries(EXAMPLES).map(([k, e]) => `<button data-example="${k}">${e.title}</button>`).join("");
    app.loadExample = (key) => {
      const ex = EXAMPLES[key];
      if (!ex) return;
      const doc = ex.build();
      doc.title = ex.title;
      app.loadDoc(doc, { keepHistory: true });
      app.zoomFit();
    };
    exList.addEventListener("click", (e) => {
      const b = e.target.closest("[data-example]");
      if (b) app.loadExample(b.dataset.example);
    });
    app.drawRelationOverlay = () => drawRelationOverlay(app);
    setupExplore(app);
    document.getElementById("btn-tikz").onclick = () => {
      const vis = app.visibleSet();
      const doc = vis ? { ...app.doc, steps: app.doc.steps.map((s) => vis.has(s.id) ? s : { ...s, hidden: true }) } : app.doc;
      textDialog(
        "M\xE3 TikZ",
        toTikZ(doc, { values: app.values, theme: app.theme }),
        `<div class="modal-body">Theo b\u1ED9 ki\u1EC3u \u0111ang ch\u1ECDn (<b>${app.theme === "mono" ? "\u0110\u01A1n s\u1EAFc" : "S\xE1ch gi\xE1o khoa"}</b>). D\xE1n v\xE0o t\xE0i li\u1EC7u LaTeX (ch\u1EC9 c\u1EA7n <code>\\usepackage{tikz}</code>). \u0110\u1ED5i k\xEDch th\u01B0\u1EDBc b\u1EB1ng c\xE1ch s\u1EEDa <code>x=\u2026, y=\u2026</code>.</div>`
      );
    };
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
    window.GeoCore = { ...core_exports, Builder, EXAMPLES, codec: codec_exports, explore, toTikZ };
    return app;
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
