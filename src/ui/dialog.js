// Hộp thoại đơn giản (thay window.confirm/prompt để to, rõ trên máy chiếu và chạy được khi test tự động).

/** Hộp thoại tuỳ biến: build(box, close) dựng nội dung; trả về giá trị truyền cho close (Esc → null). */
export function modal(build) {
  return new Promise((resolve) => {
    const back = document.createElement('div');
    back.className = 'modal-back';
    const box = document.createElement('div');
    box.className = 'modal';
    back.appendChild(box);
    const close = (v) => {
      back.remove();
      document.removeEventListener('keydown', onKey, true);
      resolve(v);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(null); }
    };
    document.addEventListener('keydown', onKey, true);
    build(box, close);
    document.body.appendChild(back);
    const f = box.querySelector('input, textarea, button.primary');
    if (f) f.focus();
  });
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

export function confirmDialog(title, message, okLabel = 'Đồng ý') {
  return modal((box, close) => {
    box.innerHTML = `<h3>${esc(title)}</h3><div class="modal-body">${message}</div>
      <div class="modal-actions"><button class="cancel">Huỷ</button><button class="primary">${esc(okLabel)}</button></div>`;
    box.querySelector('.cancel').onclick = () => close(false);
    box.querySelector('.primary').onclick = () => close(true);
  }).then((v) => !!v);
}

export function promptDialog(title, value = '', hint = '', { cursorEnd = false, error = '' } = {}) {
  return modal((box, close) => {
    box.innerHTML = `<h3>${esc(title)}</h3>${hint ? `<div class="modal-body">${esc(hint)}</div>` : ''}
      <input type="text" class="modal-input" value="${esc(value)}">${error ? `<div class="modal-err">${esc(error)}</div>` : ''}
      <div class="modal-actions"><button class="cancel">Huỷ</button><button class="primary">OK</button></div>`;
    const inp = box.querySelector('input');
    if (cursorEnd) setTimeout(() => { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }, 0);
    else inp.select();
    inp.onkeydown = (e) => { if (e.key === 'Enter') close(inp.value); };
    box.querySelector('.cancel').onclick = () => close(null);
    box.querySelector('.primary').onclick = () => close(inp.value);
  });
}

/** Hộp hiển thị văn bản dài (mã TikZ, link chia sẻ) kèm nút sao chép. */
export function textDialog(title, text, extraHTML = '') {
  return modal((box, close) => {
    box.classList.add('wide');
    box.innerHTML = `<h3>${esc(title)}</h3>${extraHTML}<textarea class="modal-text" readonly spellcheck="false"></textarea>
      <div class="modal-actions"><span class="copied"></span><button class="copy">Sao chép</button><button class="primary">Đóng</button></div>`;
    const ta = box.querySelector('textarea');
    ta.value = text;
    box.querySelector('.copy').onclick = async () => {
      ta.select();
      let ok = false;
      try { await navigator.clipboard.writeText(text); ok = true; } catch { try { ok = document.execCommand('copy'); } catch { ok = false; } }
      box.querySelector('.copied').textContent = ok ? 'Đã sao chép ✓' : 'Hãy bấm Ctrl+C để sao chép';
    };
    box.querySelector('.primary').onclick = () => close(true);
  });
}

let toastTimer = null;
export function toast(msg, ms = 2600) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

/**
 * Hộp sửa văn bản dài (vd bộ gõ tắt). Trả về văn bản mới, null nếu huỷ, hoặc '\u0000default' nếu bấm nút phụ.
 */
export function textDialogEditable(title, text, hintHTML = '', extraLabel = '') {
  return modal((box, close) => {
    box.classList.add('wide');
    box.innerHTML = `<h3>${esc(title)}</h3>${hintHTML ? `<div class="modal-body">${hintHTML}</div>` : ''}<textarea class="modal-text" spellcheck="false"></textarea>
      <div class="modal-actions">${extraLabel ? `<button class="extra" style="margin-right:auto">${esc(extraLabel)}</button>` : ''}<button class="cancel">Huỷ</button><button class="primary">Lưu</button></div>`;
    const ta = box.querySelector('textarea');
    ta.value = text;
    box.querySelector('.cancel').onclick = () => close(null);
    box.querySelector('.primary').onclick = () => close(ta.value);
    const ex = box.querySelector('.extra');
    if (ex) ex.onclick = () => close('\u0000default');
  });
}

/** Hộp chọn một trong nhiều cách: choices = [{label, value, primary?}]. Trả về value đã chọn, null nếu Esc. */
export function choiceDialog(title, messageHTML, choices) {
  return modal((box, close) => {
    box.innerHTML = `<h3>${esc(title)}</h3><div class="modal-body">${messageHTML}</div><div class="modal-actions wrap"></div>`;
    const bar = box.querySelector('.modal-actions');
    for (const c of choices) {
      const b = document.createElement('button');
      b.textContent = c.label;
      if (c.primary) b.className = 'primary';
      b.onclick = () => close(c.value);
      bar.appendChild(b);
    }
  });
}
