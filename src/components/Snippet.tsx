import { useMemo } from "react";

const MASTER =
  /(?<comment>#[^\n]*)|(?<str>f?"""[\s\S]*?"""|f?r?"(?:[^"\\\n]|\\.)*"|f?r?'(?:[^'\\\n]|\\.)*')|(?<dec>@[\w.]+)|(?<kw>\b(?:class|def|return|if|elif|else|for|in|import|from|assert|raise|not|and|or|None|True|False|self|lambda|with|pass|is|while|try|except|finally|yield|continue|break|int|str|dict)\b)|(?<num>\b\d+(?:\.\d+)?\b)/g;

const CLS = {
  comment: "text-white/28 italic",
  str: "text-gilt-300/85",
  dec: "text-ember-400",
  kw: "text-iris-300",
  num: "text-aqua-300",
  plain: "text-white/65",
} as const;

export function highlightPy(code: string) {
  MASTER.lastIndex = 0;
  const out: React.ReactNode[] = [];
  let last = 0;
  let k = 0;
  for (const m of code.matchAll(MASTER)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(<span key={k++} className={CLS.plain}>{code.slice(last, idx)}</span>);
    const g = m.groups ?? {};
    const cls =
      g.comment !== undefined ? CLS.comment
      : g.str !== undefined ? CLS.str
      : g.dec !== undefined ? CLS.dec
      : g.kw !== undefined ? CLS.kw
      : CLS.num;
    out.push(<span key={k++} className={cls}>{m[0]}</span>);
    last = idx + m[0].length;
  }
  if (last < code.length) out.push(<span key={k++} className={CLS.plain}>{code.slice(last)}</span>);
  return out;
}

export function Snippet({ code }: { code: string }) {
  const nodes = useMemo(() => highlightPy(code), [code]);
  const lines = code.split("\n");
  return (
    <div className="flex min-w-max">
      <div className="sticky left-0 select-none border-r border-white/[0.06] bg-[#0a0a13] px-3 py-0.5 text-right font-mono text-[9.5px] leading-[1.8] text-white/15">
        {lines.map((_, i) => <div key={i}>{i + 1}</div>)}
      </div>
      <pre className="px-4 py-0.5 font-mono text-[11px] leading-[1.8]">{nodes}</pre>
    </div>
  );
}
