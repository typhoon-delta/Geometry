// Đo bộ Khám phá trên các hình mẫu (bản 1.9). Chạy: node tests/kham-pha/do.mjs   (thêm --chi-tiet để in từng bài)
// Ba chỉ số: (1) kết luận được báo (hạng trong danh sách), (2) bổ đề then chốt được báo, (3) kết luận chứng minh được
// bằng bộ máy suy luận (có / không cần điểm phụ). Dùng chung với tests/kham-pha.test.mjs (chặn thụt lùi).
import { THU_VIEN } from '../../src/core/thu-vien.js';
import { explore } from '../../src/explore/explorer.js';
import { discover } from '../../src/explore/discover.js';
import { evaluate, clone } from '../../src/core/model.js';
import { parseCommand } from '../../src/core/cmd.js';
import { matchContext, relationImplies } from '../../src/explore/match.js';
import { checkClaim } from '../../src/explore/check.js';
import { DE_BAI } from './de-bai.mjs';
import { proveClaim } from '../../src/explore/deduce.js';
import { rankAux } from '../../src/explore/aux.js';
import { addSpecs } from '../../src/core/apply.js';

/** Áp các lệnh dựng (setup / điểm phụ) lên bản sao hình. */
function withCommands(doc, cmds = []) {
  const d = clone(doc);
  for (const c of cmds) {
    const r = parseCommand(d, c);
    if (!r.ok) throw new Error(`${c}: ${r.error}`);
    r.run(d);
  }
  return d;
}

function claimOf(doc, text) {
  const r = parseCommand(doc, text);
  if (!r.ok || r.kind !== 'check') throw new Error(`${text}: ${r.error || 'không phải lệnh kiểm tra'}`);
  // lệnh kiểm tra có thể tự dựng đường phụ (vd OP chưa vẽ) – chạy trên chính doc để có đủ đối tượng
  const claim = r.run(doc);
  // dữ liệu thước đo phải đúng: nhận định luôn đúng (kiểm bằng số)
  const v = checkClaim(doc, claim, { samples: 30 }).verdict;
  if (v !== 'always') throw new Error(`Dữ liệu thước đo sai: "${text}" → ${v}`);
  return claim;
}

/** Hạng (1-based) của quan hệ đầu tiên bao hàm nhận định, hoặc null. */
function rankOf(doc, res, claim) {
  const ctx = matchContext(doc, evaluate(doc));
  const i = res.relations.findIndex((rel) => relationImplies(ctx, rel, claim));
  return i < 0 ? null : i + 1;
}

/** Hạng của điểm phụ (trong danh sách gợi ý) trùng về số với điểm phụ của bổ đề. */
function auxRank(base, ranked, auxDoc) {
  const target = evaluate(auxDoc);
  const last = auxDoc.steps[auxDoc.steps.length - 1];
  const P = target.get(last.id);
  if (!P || P.kind !== 'point') return null;
  const i = ranked.findIndex((r) => {
    const d = clone(base);
    const ids = addSpecs(d, r.specs.map((x) => ({ ...x })));
    const v = evaluate(d).get(ids[ids.length - 1]);
    return v && v.kind === 'point' && Math.hypot(v.x - P.x, v.y - P.y) < 1e-6;
  });
  return i < 0 ? null : i + 1;
}

export function measure({ explore: run = explore, prove = null, aux = false } = {}) {
  const rows = [];
  for (const spec of DE_BAI) {
    const lib = THU_VIEN.find((t) => t.id === spec.id);
    const base = withCommands(lib.doc, spec.setup || []);
    const row = { id: spec.id, goals: [], lemmas: [] };
    // kết luận: bộ khám phá chạy trên hình (gồm phần setup), kết luận phát biểu trên bản sao có thể thêm đường phụ
    const t0 = Date.now();
    const res = run(base);
    row.ms = Date.now() - t0;
    row.count = res.relations.length;
    for (const g of spec.goal) {
      const d = clone(base);
      const claim = claimOf(d, g);
      const rank = rankOf(d, res, claim);
      const proof = prove ? prove(d, claim) : null;
      let proved = proof ? proof.status : null, auxProof = null;
      if (aux && proved !== 'proved') {
        const r = rankAux(d, claim, { budgetMs: 6000 });
        const j = r.results.findIndex((x) => x.proved);
        if (j >= 0) { proved = 'proved_aux'; auxProof = { rank: j + 1, label: r.results[j].label }; }
      }
      row.goals.push({ text: g, rank, proved, auxProof });
    }
    for (const L of spec.lemmas) {
      const d = withCommands(base, L.aux || []);
      const goal0 = spec.goal.length ? claimOf(d, spec.goal[0]) : null;
      const claim = claimOf(d, L.claim);
      // bổ đề: khám phá THEO MỤC TIÊU (nếu bộ khám phá nhận mục tiêu)
      const r2 = run(d, goal0);
      const proof = prove ? prove(d, claim) : null;
      let auxR = null;
      if (aux && L.aux && L.aux.length) {
        const goalClaim = spec.goal.length ? claimOf(clone(base), spec.goal[0]) : null;
        auxR = auxRank(base, rankAux(base, goalClaim, { budgetMs: 8000 }).results, d);
      }
      row.lemmas.push({ text: L.claim, aux: L.aux || [], rank: rankOf(d, r2, claim), proved: proof ? proof.status : null, auxRank: auxR });
    }
    rows.push(row);
  }
  const goals = rows.flatMap((r) => r.goals), lemmas = rows.flatMap((r) => r.lemmas);
  const summary = {
    goals: goals.length,
    goalFound: goals.filter((g) => g.rank).length,
    goalTop3: goals.filter((g) => g.rank && g.rank <= 3).length,
    goalProved: goals.filter((g) => g.proved === 'proved').length,
    goalProvedAux: goals.filter((g) => g.proved === 'proved_aux').length,
    lemmas: lemmas.length,
    lemmaFound: lemmas.filter((l) => l.rank).length,
    lemmaProved: lemmas.filter((l) => l.proved === 'proved').length,
    auxSuggested: lemmas.filter((l) => l.auxRank && l.auxRank <= 5).length,
    msTotal: rows.reduce((s, r) => s + r.ms, 0),
  };
  return { rows, summary };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const useOld = process.argv.includes('--cu');
  const { rows, summary } = measure({ explore: useOld ? (d) => explore(d) : (d, goal) => discover(d, { goal }), prove: (d, claim) => proveClaim(d, claim), aux: process.argv.includes('--diem-phu') });
  if (process.argv.includes('--chi-tiet')) for (const r of rows) {
    console.log(`${r.id.padEnd(16)} ${String(r.count).padStart(3)} quan hệ ${String(r.ms).padStart(5)} ms`);
    for (const g of r.goals) console.log(`   KL  ${g.rank ? '#' + g.rank : '—'}  ${g.proved || ''}  ${g.text}${g.auxProof ? `  [điểm phụ #${g.auxProof.rank}: ${g.auxProof.label}]` : ''}`);
    for (const l of r.lemmas) console.log(`   BĐ  ${l.rank ? '#' + l.rank : '—'}  ${l.proved || ''}  ${l.text}${l.aux.length ? '  [' + l.aux.join('; ') + (l.auxRank ? ` – gợi ý #${l.auxRank}` : ' – không gợi ý') + ']' : ''}`);
  }
  console.log(JSON.stringify(summary));
}
