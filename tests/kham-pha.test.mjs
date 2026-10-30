// Thước đo bộ Khám phá (tests/kham-pha): chặn thụt lùi. Khi bộ khám phá / bộ máy suy luận tốt lên, nâng các ngưỡng.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { measure } from './kham-pha/do.mjs';
import { proveClaim } from '../src/explore/deduce.js';

test('thước đo Khám phá trên các hình mẫu: không thụt lùi', () => {
  const { summary: s } = measure({ prove: (d, claim) => proveClaim(d, claim) });
  console.log('    ', JSON.stringify(s));
  assert.ok(s.goalFound >= 23, `kết luận được báo: ${s.goalFound}`);
  assert.ok(s.goalTop3 >= 13, `kết luận trong top 3: ${s.goalTop3}`);
  assert.ok(s.goalProved >= 3, `kết luận chứng minh được: ${s.goalProved}`);
  assert.ok(s.lemmaProved >= 6, `bổ đề chứng minh được: ${s.lemmaProved}`);
});
