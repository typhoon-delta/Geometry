// Giao diện kiểm tra nhận định (bản 1.8): hộp kết quả – luôn đúng / sai / không luôn đúng, phản ví dụ, trường hợp đặc biệt.
import { modal, toast } from './dialog.js';
import { checkClaim, claimText, CLAIMS } from '../explore/check.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

export function showCheck(app, claim, doc = app.doc) {
  const q = claimText(doc, claim);
  const r = checkClaim(doc, claim);
  const sp = (st) => r.special.filter((x) => x.status === st);
  let head, cls, body = '';
  const tried = `thử ${r.tested} hình ngẫu nhiên${r.undef ? ` (${r.undef} hình không xác định)` : ''} và ${r.special.length} trường hợp đặc biệt`;
  if (r.verdict === 'always') {
    cls = 'ok';
    head = '✓ Luôn đúng';
    body += `<p>Đúng trên mọi hình đã thử: ${tried}.</p>`;
    const bad = sp('false'), und = sp('undef');
    if (bad.length) body += `<p><b>Nhưng sai khi:</b></p>${list(bad)}`;
    if (und.length) body += `<p><b>Không xác định (suy biến) khi:</b></p>${list(und)}`;
    if (!bad.length && !und.length && r.special.length) body += '<p class="note">Không có ngoại lệ trong các trường hợp đặc biệt đã thử.</p>';
  } else if (r.verdict === 'false' || r.verdict === 'not_always') {
    cls = 'bad';
    head = r.verdict === 'false' ? '✗ Sai ngay trên hình này' : '✗ Không luôn đúng';
    body += r.verdict === 'false'
      ? `<p>Sai lệch trên hình hiện tại: ${fmt(r.base)} (so với cỡ hình).</p>`
      : `<p>Đúng trên hình hiện tại nhưng sai ở ${r.bad}/${r.ok + r.bad} hình thử – có thể do hình đang vẽ rơi đúng vào trường hợp đặc biệt.</p>`;
    const good = sp('true');
    if (good.length) body += `<p><b>Đúng khi:</b></p>${list(good)}`;
  } else if (r.verdict === 'undef_here') {
    cls = 'warn';
    head = 'Không xác định trên hình này';
    body += '<p>Các đối tượng trùng nhau hoặc không dựng được (vd hai đường song song) nên không kiểm tra được.</p>';
  } else {
    cls = 'warn';
    head = 'Chưa đủ hình để kết luận';
    body += `<p>Chỉ có ${r.ok + r.bad} hình hợp lệ (hình gần suy biến).</p>`;
  }
  return modal((box, close) => {
    box.classList.add('check-win');
    box.innerHTML = `<h3>Kiểm tra: ${esc(q)}?</h3>
      <div class="check-verdict ${cls}">${head}</div>
      <div class="modal-body">${body}<p class="note">Kiểm tra bằng số (${CLAIMS[claim.type].title.toLowerCase()}, sai số tương đối 10⁻⁷, ${r.ms} ms) – không thay cho chứng minh.</p></div>
      <div class="modal-actions">${r.counter && r.verdict === 'not_always' ? '<button class="ce">Xem phản ví dụ</button>' : ''}<button class="primary">Đóng</button></div>`;
    box.querySelector('.primary').onclick = () => close(null);
    const ce = box.querySelector('.ce');
    if (ce) ce.onclick = () => { close(null); app.applyOverrides(r.counter.ov); toast('Đã đặt hình về phản ví dụ – Ctrl+Z để trở lại hình cũ', 4000); };
    box.querySelectorAll('[data-sp]').forEach((b) => (b.onclick = () => {
      const s = r.special[+b.dataset.sp];
      close(null);
      app.applyOverrides(s.patch);
      toast(`Đã đưa hình về: ${s.label} – Ctrl+Z để trở lại`, 3500);
    }));
  });

  function list(items) {
    return `<ul class="check-sp">${items.map((x) => `<li>${esc(x.label)} <button class="mini" data-sp="${r.special.indexOf(x)}" title="Đưa hình về trường hợp này">xem</button></li>`).join('')}</ul>`;
  }
}

const fmt = (x) => (x >= 0.01 ? x.toFixed(3) : x.toExponential(1)).replace('.', ',');
