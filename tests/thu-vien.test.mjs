// Thư viện ví dụ (menu "Ví dụ"): mọi hình mở được, hợp lệ, mọi đối tượng xác định, xuất TikZ được.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { THU_VIEN } from '../src/core/thu-vien.js';
import { validate, evaluate } from '../src/core/model.js';
import { toTikZ } from '../src/export/tikz.js';

test('thư viện ví dụ có đủ các nhóm', () => {
  const g = new Set(THU_VIEN.map((e) => e.nhom));
  for (const n of ['IMO', 'VMO', 'Cấu hình', 'Hình dày']) assert.ok(g.has(n), 'thiếu nhóm ' + n);
  assert.ok(THU_VIEN.length >= 20);
});

for (const e of THU_VIEN) {
  test(`ví dụ ${e.nhom} › ${e.ten}`, () => {
    assert.deepEqual(validate(e.doc), []);
    assert.equal(e.doc.title, e.ten);
    assert.ok(e.de && e.de.length > 20, 'thiếu đề tóm tắt');
    const v = evaluate(e.doc);
    const undef = e.doc.steps.filter((s) => !v.get(s.id)).map((s) => s.name || s.id);
    assert.deepEqual(undef, [], 'đối tượng không xác định');
    const names = e.doc.steps.map((s) => s.name).filter(Boolean);
    assert.equal(new Set(names).size, names.length, 'tên trùng nhau');
    const tex = toTikZ(e.doc, { trimLines: true });
    assert.ok(!/NaN|undefined/.test(tex), 'TikZ có NaN');
  });
}
