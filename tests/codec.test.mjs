import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeDoc, decodeDoc, parseDocJSON } from '../src/io/codec.js';
import { EXAMPLES } from '../src/core/examples.js';
import { evaluate } from '../src/core/model.js';

test('mã hoá hình vào URL rồi giải mã lại giữ nguyên hình', async () => {
  for (const ex of Object.values(EXAMPLES)) {
    const doc = ex.build();
    const code = await encodeDoc(doc);
    assert.match(code, /^[zj][A-Za-z0-9_-]+$/);
    const back = await decodeDoc(code);
    assert.equal(back.steps.length, doc.steps.length);
    const v1 = evaluate(doc), v2 = evaluate(back);
    for (const s of doc.steps) assert.deepEqual(v2.get(s.id), v1.get(s.id));
  }
});

test('link hỏng / JSON sai báo lỗi rõ ràng', async () => {
  await assert.rejects(decodeDoc('zabc'), /hỏng/);
  assert.throws(() => parseDocJSON('{'), /JSON/);
  assert.throws(() => parseDocJSON('{"format":"hinh-hoc-dong","steps":[{"id":"a","type":"midpoint","args":["x","y"]}]}'), /không hợp lệ/);
});
