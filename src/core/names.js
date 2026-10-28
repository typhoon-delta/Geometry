// Cú pháp tên (nhãn) điểm kiểu công thức:
//   I_A  → I với chỉ số dưới A        X_{AB} → X với chỉ số dưới AB
//   B'   → B phẩy, B'' → B hai phẩy   A'_1 hoặc A_1' → A phẩy chỉ số 1
//   A1   → A chỉ số 1 (chữ số ở cuối tự thành chỉ số dưới)
//   ω1   → ω chỉ số 1
// Dùng chung cho bảng vẽ, danh sách bước (HTML) và TikZ.

/** Tách tên thành {base, sub, primes}. */
export function parseLabel(name) {
  const s = String(name ?? '');
  let m = /^(.+?)('*)_\{([^}]*)\}('*)$/.exec(s) || /^(.+?)('*)_([^_{}']+)('*)$/.exec(s);
  if (m) return { base: m[1], sub: m[3], primes: (m[2] + m[4]).length };
  m = /^(.*?[^\d'])('*)(\d+)('*)$/.exec(s);
  if (m) return { base: m[1], sub: m[3], primes: (m[2] + m[4]).length };
  m = /^(.*?)('+)$/.exec(s);
  if (m && m[1]) return { base: m[1], sub: '', primes: m[2].length };
  return { base: s, sub: '', primes: 0 };
}

const escHTML = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** HTML cho danh sách bước / bảng thuộc tính. */
export function labelHTML(name) {
  if (!name) return '';
  const { base, sub, primes } = parseLabel(name);
  return `<i class="lb">${escHTML(base)}${'′'.repeat(primes)}${sub ? `<sub>${escHTML(sub)}</sub>` : ''}</i>`;
}

const GREEK = { 'α': '\\alpha', 'β': '\\beta', 'γ': '\\gamma', 'δ': '\\delta', 'Δ': '\\Delta', 'ε': '\\varepsilon', 'θ': '\\theta', 'λ': '\\lambda', 'μ': '\\mu', 'π': '\\pi', 'ρ': '\\rho', 'σ': '\\sigma', 'φ': '\\varphi', 'ω': '\\omega', 'Ω': '\\Omega', 'Γ': '\\Gamma' };
const texText = (s) => s.replace(/[αβγδΔεθλμπρσφωΩΓ]/g, (c) => GREEK[c] + ' ').replace(/[#$%&{}]/g, (c) => '\\' + c).trim();

/** Nhãn LaTeX (chế độ toán): I_A → $I_A$, X_{AB} → $X_{AB}$, B' → $B'$, A1 → $A_1$. */
export function texLabel(name) {
  const { base, sub, primes } = parseLabel(name);
  const b = texText(base);
  const p = "'".repeat(primes);
  if (!sub) return `$${b}${p}$`;
  const sb = texText(sub);
  return sb.length === 1 ? `$${b}${p}_${sb}$` : `$${b}${p}_{${sb}}$`;
}
