// Tiện ích dựng hình bằng code (dùng trong test, ví dụ mẫu, và có thể dùng từ console trình duyệt).
//   const b = new Builder();
//   const A = b.point(0, 3, 'A'), B = b.point(-2, 0, 'B'), C = b.point(3, 0, 'C');
//   const O = b.add('circumcenter', [A, B, C], {}, 'O');
//   b.doc  // tài liệu JSON

import { emptyDoc, newId, nextName, kinds } from './model.js';
import { STEP_TYPES } from './steps.js';

export class Builder {
  constructor(doc = emptyDoc()) {
    this.doc = doc;
  }

  /** Thêm một bước; trả về id. */
  add(type, args = [], params = undefined, name = undefined, extra = {}) {
    const def = STEP_TYPES[type];
    if (!def) throw new Error('Loại bước không rõ: ' + type);
    const id = newId(this.doc);
    const kind = def.kind === 'same' ? kinds(this.doc).get(args[0]) : def.kind;
    const step = { id, type, args: [...args] };
    if (params && Object.keys(params).length) step.params = { ...params };
    if (kind !== 'mark') step.name = name || nextName(this.doc, kind);
    Object.assign(step, extra);
    this.doc.steps.push(step);
    return id;
  }

  point(x, y, name) {
    return this.add('free_point', [], { x, y }, name);
  }
}
