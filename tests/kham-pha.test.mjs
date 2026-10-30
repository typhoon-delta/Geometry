// Thước đo bộ Khám phá (tests/kham-pha): chặn thụt lùi. Khi bộ khám phá / bộ máy suy luận tốt lên, nâng các ngưỡng.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { measure } from './kham-pha/do.mjs';
import { proveClaim } from '../src/explore/deduce.js';
import { discover } from '../src/explore/discover.js';

test('thước đo Khám phá trên các hình mẫu: không thụt lùi', () => {
  const { summary: s } = measure({ explore: (d, goal) => discover(d, { goal }), prove: (d, claim) => proveClaim(d, claim) });
  console.log('    ', JSON.stringify(s));
  assert.ok(s.goalFound >= 26, `kết luận được báo: ${s.goalFound}`);
  assert.ok(s.goalTop3 >= 16, `kết luận trong top 3: ${s.goalTop3}`);
  assert.ok(s.goalProved >= 4, `kết luận chứng minh được: ${s.goalProved}`);
  assert.ok(s.lemmaFound >= 5, `bổ đề được báo (theo mục tiêu): ${s.lemmaFound}`);
  assert.ok(s.lemmaProved >= 6, `bổ đề chứng minh được: ${s.lemmaProved}`);
});

test('điểm phụ: IMO 2013/4 – gợi ý đầu tiên là giao điểm thứ hai (Z) và có nó thì chứng minh được X, Y, H thẳng hàng', async () => {
  const { THU_VIEN } = await import('../src/core/thu-vien.js');
  const { parseCommand } = await import('../src/core/cmd.js');
  const { clone } = await import('../src/core/model.js');
  const { rankAux } = await import('../src/explore/auxPoints.js');
  const d = clone(THU_VIEN.find((x) => x.id === 'imo2013-4').doc);
  const claim = parseCommand(d, 'kiểm tra X, Y, H thẳng hàng').run(d);
  const r = rankAux(d, claim, { budgetMs: 20000 });
  assert.ok(r.results[0].proved, r.results[0].label);
  assert.ok(r.results[0].explain.steps.some((s) => /trục đẳng phương/.test(s.text)), 'lời giải dùng trục đẳng phương');
});
