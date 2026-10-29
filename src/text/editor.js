// Bộ soạn chữ trong khung (bản 1.4): CodeMirror 6 + tô màu LaTeX + gõ nhanh.
//   – TỰ ĐỔI trong công thức ngay khi gõ (snippets.js), GÕ TẮT ";…" + Tab, ô nhảy ${} bằng Tab
//   – gợi ý tên điểm trên hình (trong công thức) và lệnh LaTeX hay dùng (sau "\")
//   – Ctrl+M: $…$; Ctrl+Shift+M: $$…$$; Ctrl+Enter: bước mới; Esc: xong
import { EditorView, keymap, placeholder } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { StreamLanguage, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { stex } from '@codemirror/legacy-modes/mode/stex';
import { autocompletion, snippet, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { inMath, matchAuto, matchShort } from './snippets.js';

const COMMANDS = ['angle', 'triangle', 'parallel', 'perp', 'cong', 'sim', 'frac', 'dfrac', 'sqrt', 'overline', 'overrightarrow', 'overset{\\frown}',
  'circ', 'cdot', 'times', 'le', 'ge', 'ne', 'Rightarrow', 'Leftrightarrow', 'iff', 'implies', 'in', 'notin', 'cap', 'cup', 'subset', 'equiv',
  'alpha', 'beta', 'gamma', 'delta', 'varphi', 'omega', 'Omega', 'pi', 'theta', 'lambda', 'mu', 'sin', 'cos', 'tan', 'cot', 'log', 'ln',
  'text{}', 'left(', 'right)', 'begin{cases}', 'end{cases}', 'begin{aligned}', 'end{aligned}', 'quad', 'qquad', 'dots', 'cdots', 'infty', 'pm',
  'goc', 'tamgiac', 'cung{}', 'vecto{}'];

/**
 * Tạo bộ soạn trong `parent`. opts: {text, rules: () => {auto, short}, names: () => [tên điểm], onChange(text), onDone(save)}.
 * Trả về {view, insert(str), focus(), text(), destroy()}.
 */
export function createEditor(parent, opts) {
  const rules = () => (opts.rules ? opts.rules() : { auto: [], short: [] });
  const before = (state, pos) => state.doc.sliceString(0, pos);

  // ô nhảy dùng cú pháp snippet: thay [from, to) bằng mẫu, con trỏ vào ô đầu tiên
  const applyTemplate = (view, tpl, from, to) => {
    if (tpl.includes('${')) snippet(tpl)(view, null, from, to);
    else view.dispatch({ changes: { from, to, insert: tpl }, selection: { anchor: from + tpl.length }, userEvent: 'input.complete' });
  };

  const autoInput = EditorView.inputHandler.of((view, from, to, text) => {
    if (text.length !== 1) return false;
    // lệnh vừa tự đổi đã kèm dấu cách (\angle ) → bỏ dấu cách người dùng gõ thêm
    if (text === ' ' && from === to && /\\[A-Za-z]+ $/.test(before(view.state, from).slice(-24)) && inMath(before(view.state, from))) return true;
    const b = before(view.state, from) + text;
    if (!inMath(b)) return false;
    const hit = matchAuto(b, rules().auto);
    if (!hit) return false;
    view.dispatch({ changes: { from, to, insert: text }, selection: { anchor: from + 1 }, userEvent: 'input.type' });
    const end = from + 1;
    applyTemplate(view, hit.rep, end - hit.len, end);
    return true;
  });

  const wrap = (open, close) => (view) => {
    const r = view.state.selection.main;
    const sel = view.state.sliceDoc(r.from, r.to);
    view.dispatch({ changes: { from: r.from, to: r.to, insert: open + sel + close }, selection: { anchor: r.from + open.length + sel.length } });
    return true;
  };

  const keys = keymap.of([
    {
      key: 'Tab',
      run: (view) => {
        const pos = view.state.selection.main.head;
        const hit = matchShort(before(view.state, pos), rules().short);
        if (hit) { applyTemplate(view, hit.rep, pos - hit.len, pos); return true; }
        // không có gõ tắt: nhảy qua dấu đóng ngay sau con trỏ (ra khỏi {…} hay $…$); không thụt dòng
        const m = /^[}$)\]]+/.exec(view.state.doc.sliceString(pos, pos + 4));
        if (m) view.dispatch({ selection: { anchor: pos + 1 } });
        return true;
      },
    },
    { key: 'Mod-m', run: wrap('$', '$') },
    { key: 'Mod-Shift-m', run: wrap('$$\n', '\n$$') },
    { key: 'Mod-Enter', run: (view) => { const p = view.state.doc.length; view.dispatch({ changes: { from: p, insert: '\n---\n' }, selection: { anchor: p + 5 } }); return true; } },
    { key: 'Escape', run: () => { opts.onDone && opts.onDone(true); return true; } },
  ]);

  const complete = (ctx) => {
    const b = before(ctx.state, ctx.pos);
    const cmd = /\\([A-Za-z]*)$/.exec(b);
    if (cmd) return { from: ctx.pos - cmd[1].length, options: COMMANDS.map((c) => ({ label: c, type: 'keyword', apply: c })), validFor: /^[A-Za-z]*$/ };
    if (!inMath(b)) return null;
    // tên điểm: chỉ gợi ý khi gọi (Ctrl+Space) hoặc đang gõ tên có chỉ số (I_…) – gõ nhanh "BAC" không bị bảng gợi ý chặn Enter
    const w = /[A-Z][A-Za-z0-9_{}']*$/.exec(b);
    if (!ctx.explicit && !(w && w[0].includes('_'))) return null;
    const names = (opts.names ? opts.names() : []).filter((n) => /^[A-Z]/.test(n));
    if (!names.length) return null;
    return { from: w ? ctx.pos - w[0].length : ctx.pos, options: names.map((n) => ({ label: n, type: 'variable', detail: 'trên hình' })) };
  };

  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: opts.text || '',
      extensions: [
        history(),
        keys,
        keymap.of([...closeBracketsKeymap, ...completionKeymap, ...defaultKeymap, ...historyKeymap]),
        closeBrackets(),
        // tự đóng ( [ { $ – KHÔNG đóng dấu ' (dấu phẩy của tên điểm B')
        EditorState.languageData.of(() => [{ closeBrackets: { brackets: ['(', '[', '{', '$'] } }]),
        autocompletion({ override: [complete], activateOnTyping: true, icons: false }),
        StreamLanguage.define(stex),
        syntaxHighlighting(defaultHighlightStyle),
        EditorView.lineWrapping,
        autoInput,
        placeholder('Gõ chữ và công thức: $\\angle BAC = 90^o$ …  Ctrl+M: công thức · ;g + Tab: \\angle · Ctrl+Enter: bước mới · Esc: xong'),
        EditorView.updateListener.of((u) => { if (u.docChanged && opts.onChange) opts.onChange(u.state.doc.toString()); }),
      ],
    }),
  });

  return {
    view,
    text: () => view.state.doc.toString(),
    focus: () => view.focus(),
    insert(str) {
      const r = view.state.selection.main;
      view.dispatch({ changes: { from: r.from, to: r.to, insert: str }, selection: { anchor: r.from + str.length } });
      view.focus();
    },
    destroy: () => view.destroy(),
  };
}
