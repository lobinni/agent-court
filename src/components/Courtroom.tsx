import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Gavel,
  Bot,
  Check,
  X,
  Minus,
  FastForward,
  RotateCcw,
  Landmark,
  FileText,
  Globe,
  BarChart3,
  ScrollText,
  Link2,
  ShieldCheck,
  CircleDollarSign,
} from "lucide-react";
import {
  CASES,
  APPEAL_MODELS,
  type DisputeCase,
  type Stance,
} from "../data/cases";
import LiveCourt from "./LiveCourt";

/* ───────────────────────── types ───────────────────────── */

type Phase =
  | "idle"
  | "intake"
  | "evidence"
  | "deliberation"
  | "verdict"
  | "appeal"
  | "final";

interface Line {
  id: number;
  kind: "sys" | "leader" | "agree" | "dissent" | "rule" | "verdict";
  text: string;
  done: boolean;
}

const PHASES = ["Intake", "Evidence", "Deliberation", "Verdict"] as const;
const EVIDENCE_ICONS = { SPEC: FileText, WEB: Globe, REPORT: BarChart3, LOG: ScrollText, CHAIN: Link2 } as const;

const LINE_COLOR: Record<Line["kind"], string> = {
  sys: "text-white/40",
  leader: "text-iris-300",
  agree: "text-gilt-200/90",
  dissent: "text-ember-400/90",
  rule: "text-aqua-300/90",
  verdict: "text-white",
};

/* ───────────────────────── scales ───────────────────────── */

function Scales({ tilt }: { tilt: number }) {
  return (
    <svg viewBox="0 0 400 180" className="w-full max-w-[380px]">
      {/* stand */}
      <line x1="200" y1="52" x2="200" y2="146" stroke="rgba(240,217,164,0.85)" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M 172 160 Q 200 144 228 160" fill="none" stroke="rgba(240,217,164,0.6)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="166" y1="164" x2="234" y2="164" stroke="rgba(240,217,164,0.85)" strokeWidth="3.5" strokeLinecap="round" />

      {/* tilting beam */}
      <g
        className="scale-beam"
        style={{ transform: `rotate(${tilt}deg)`, transformOrigin: "200px 52px" }}
      >
        <line x1="76" y1="52" x2="324" y2="52" stroke="rgba(240,217,164,0.9)" strokeWidth="3" strokeLinecap="round" />
        <circle cx="200" cy="52" r="6" fill="#0e0e1a" stroke="rgba(240,217,164,0.95)" strokeWidth="2.5" />

        {/* left pan — plaintiff */}
        {[[76, -1], [324, 1]].map(([bx]) => (
          <g key={bx}>
            <line x1={bx} y1="52" x2={bx - 18} y2="96" stroke="rgba(255,255,255,0.28)" strokeWidth="1.4" />
            <line x1={bx} y1="52" x2={bx + 18} y2="96" stroke="rgba(255,255,255,0.28)" strokeWidth="1.4" />
            <path
              d={`M ${bx - 24} 96 Q ${bx} 122 ${bx + 24} 96`}
              fill="rgba(228,186,100,0.10)"
              stroke="rgba(240,217,164,0.8)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>
        ))}
      </g>

      <circle cx="200" cy="46" r="2.4" fill="#e4ba64" />

      <text x="76" y="146" textAnchor="middle" fill="rgba(240,217,164,0.55)" fontSize="9" fontFamily="JetBrains Mono" letterSpacing="2">
        PLAINTIFF
      </text>
      <text x="324" y="146" textAnchor="middle" fill="rgba(142,242,217,0.55)" fontSize="9" fontFamily="JetBrains Mono" letterSpacing="2">
        DEFENDANT
      </text>
    </svg>
  );
}

/* ─────────────────────── main bench ─────────────────────── */

export default function Courtroom() {
  const [mode, setMode] = useState<"sim" | "live">("sim");
  const [caseIdx, setCaseIdx] = useState(0);
  const c: DisputeCase = CASES[caseIdx];

  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState<Line[]>([]);
  const [votes, setVotes] = useState<(Stance | null)[]>(Array(5).fill(null));
  const [appealVotes, setAppealVotes] = useState<(Stance | null)[]>([]);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [shareNow, setShareNow] = useState(50);
  const [reqsRevealed, setReqsRevealed] = useState(0);
  const [fast, setFast] = useState(false);
  const [appealed, setAppealed] = useState(false);

  const runRef = useRef(0);
  const speedRef = useRef(1);
  const lineIdRef = useRef(0);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    speedRef.current = fast ? 5 : 1;
  }, [fast]);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [transcript]);

  const running = phase === "intake" || phase === "evidence" || phase === "deliberation" || phase === "appeal";
  const verdictShown = phase === "verdict" || phase === "final" || phase === "appeal";

  const share = appealed && c.verdict.appealShare !== undefined ? c.verdict.appealShare : c.verdict.plaintiffShare;
  const displayedShare = verdictShown ? share : shareNow;
  const tilt = useMemo(() => ((50 - displayedShare) / 50) * 11, [displayedShare]);

  const allVotes = useMemo(() => (appealed ? [...votes, ...appealVotes] : votes), [votes, appealVotes, appealed]);
  const agrees = allVotes.filter((v) => v === "agree").length;
  const casted = allVotes.filter((v) => v !== null).length;

  const sys = useCallback(async (text: string, kind: Line["kind"] = "sys") => {
    const me = runRef.current;
    const id = ++lineIdRef.current;
    setTranscript((t) => [...t, { id, kind, text: "", done: false }]);
    for (let i = 2; i <= text.length + 1; i += 2) {
      if (runRef.current !== me) return false;
      const slice = text.slice(0, i);
      setTranscript((t) => t.map((l) => (l.id === id ? { ...l, text: slice } : l)));
      const ch = text[Math.min(i, text.length - 1)];
      await new Promise((r) => setTimeout(r, (ch === " " ? 10 : 15) / speedRef.current));
    }
    setTranscript((t) => t.map((l) => (l.id === id ? { ...l, text, done: true } : l)));
    return runRef.current === me;
  }, []);

  const wait = useCallback(async (ms: number) => {
    const me = runRef.current;
    await new Promise((r) => setTimeout(r, ms / speedRef.current));
    return runRef.current === me;
  }, []);

  const reset = useCallback((toPhase: Phase = "idle") => {
    runRef.current++;
    setPhase(toPhase);
    setTranscript([]);
    setVotes(Array(5).fill(null));
    setAppealVotes([]);
    setActiveIdx(null);
    setShareNow(50);
    setReqsRevealed(0);
    setAppealed(false);
    setFast(false);
  }, []);

  /* ── the trial ── */

  const convene = useCallback(async () => {
    runRef.current++;
    setPhase("intake");
    setTranscript([]);
    setVotes(Array(5).fill(null));
    setAppealVotes([]);
    setAppealed(false);
    setShareNow(50);
    setReqsRevealed(0);

    if (!(await sys(`Docket opened — ${c.ref} · ${c.title.toLowerCase()}.`, "rule"))) return;
    await wait(350);
    if (!(await sys(`plaintiff ${c.plaintiff.handle} locks ${c.escrow} GEN escrow · tx 0x9${caseIdx}1c…d3 · FINALIZED.`))) return;
    await wait(350);
    if (!(await sys(`defendant ${c.defendant.handle} submits delivery — spec and URL pinned to the record.`))) return;
    await wait(500);

    setPhase("evidence");
    for (let i = 0; i < c.evidence.length; i++) {
      const e = c.evidence[i];
      const verb = e.kind === "WEB" ? `gl.nondet.web.render → ${e.detail}` : `${e.label} · ${e.detail}`;
      if (!(await sys(`exhibit ${String.fromCharCode(65 + i)} — ${verb}`))) return;
      setReqsRevealed((r) => Math.min(c.requirements.length, r + Math.ceil(c.requirements.length / c.evidence.length)));
      await wait(320);
    }
    if (!(await sys(`spec hash verified · record sealed. leader elected by rotation: ${c.leaderModel}.`, "rule"))) return;
    await wait(500);

    setPhase("deliberation");
    if (!(await sys(`proposing verdict — “${c.proposal}”`, "leader"))) return;
    await wait(400);

    const tally: number[] = [];
    for (let i = 0; i < c.opinions.length; i++) {
      const op = c.opinions[i];
      setActiveIdx(i);
      await wait(650);
      if (!(await sys(`${op.model} — ${op.opinion}`, op.stance === "agree" ? "agree" : "dissent"))) return;
      const implied =
        op.stance === "agree"
          ? c.verdict.plaintiffShare
          : c.verdict.plaintiffShare > 50
            ? 0
            : c.verdict.plaintiffShare < 50
              ? 100
              : i % 2 === 0
                ? 25
                : 75;
      tally.push(implied);
      setShareNow(tally.reduce((a, b) => a + b, 0) / tally.length);
      setVotes((v) => v.map((x, j) => (j === i ? op.stance : x)));
      await wait(300);
    }
    setActiveIdx(null);

    const yes = c.opinions.filter((o) => o.stance === "agree").length;
    if (!(await sys(`equivalence check — ${yes}/5 validators accept the leader's reasoning ≥ quorum 3.`))) return;
    await wait(450);
    if (!(await sys(`verdict attested on-chain · block 0x8f2${caseIdx}e… · rationale pinned to calldata.`, "rule"))) return;
    await wait(400);

    setPhase("verdict");
    await sys(
      c.verdict.type === "PLAINTIFF"
        ? `PLAINTIFF WINS — ${c.verdict.award}.`
        : c.verdict.type === "DEFENDANT"
          ? `DEFENDANT WINS — ${c.verdict.award}.`
          : `SPLIT DECISION — ${c.verdict.award}.`,
      "verdict"
    );
  }, [c, caseIdx, sys, wait]);

  /* ── appeal ── */

  const appeal = useCallback(async () => {
    if (appealed || !verdictShown) return;
    runRef.current++;
    setPhase("appeal");
    setAppealed(true);
    setAppealVotes(Array(2).fill(null));

    if (!(await sys(`appeal filed · 50 GEN bond posted. Optimistic Democracy escalates — two validators join the panel.`, "rule"))) return;
    await wait(500);
    for (let i = 0; i < c.appealOpinions.length; i++) {
      const op = c.appealOpinions[i];
      setActiveIdx(5 + i);
      if (!(await sys(`${op.model} · appeal bench — ${op.opinion}`, op.stance === "agree" ? "agree" : "dissent"))) return;
      setAppealVotes((v) => v.map((x, j) => (j === i ? op.stance : x)));
      await wait(420);
    }
    setActiveIdx(null);
    if (!(await sys(c.verdict.appealNote ?? "Appeal resolved — verdict stands.", "rule"))) return;
    setPhase("final");
  }, [appealed, verdictShown, c, sys, wait]);

  /* ── stepper state ── */
  const stepIndex =
    phase === "idle" ? 0 : phase === "intake" ? 1 : phase === "evidence" ? 2 : phase === "deliberation" ? 3 : 4;

  const panel = [...VALIDATOR_ROW(c), ...APPEAL_MODELS.map((m, i) => ({
    model: m,
    vote: appealed ? appealVotes[i] : (undefined as Stance | null | undefined),
    idx: 5 + i,
  }))].filter((v) => v.vote !== undefined).map((v) => ({ model: v.model, vote: v.vote as Stance | null, idx: v.idx }));

  function VALIDATOR_ROW(cc: DisputeCase) {
    return cc.opinions.map((o, i) => ({ model: o.model, vote: votes[i], idx: i }));
  }

  const outcome = c.verdict.type;

  return (
    <section id="courtroom" className="relative overflow-hidden py-28 md:py-36">
      <div className="absolute left-1/2 top-0 h-[380px] w-[760px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(228,186,100,0.07),transparent_60%)] blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-gilt-400">
              § 03 — The courtroom
            </p>
            <h2 className="mt-5 max-w-2xl text-[clamp(1.9rem,4vw,3.1rem)] font-medium leading-[1.1] tracking-[-0.02em] text-white">
              Convene a trial.{" "}
              <span className="font-serif italic text-gilt-300">
                Watch five models disagree — then agree.
              </span>
            </h2>
          </div>
          <p className="max-w-sm text-[13px] leading-relaxed text-white/45">
            A live simulation of the protocol's trial loop, scripted from real
            docket patterns. Every line of the transcript maps to a contract
            call or a validator action.
          </p>
        </div>

        {/* mode toggle */}
        <div className="mt-12 inline-flex items-center gap-1 rounded-full border border-white/10 bg-ink-900/70 p-1">
          <button
            onClick={() => setMode("sim")}
            className={`rounded-full px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] transition-all duration-300 ${
              mode === "sim" ? "bg-gilt-400 text-ink-950 shadow-[0_0_24px_rgba(228,186,100,0.35)]" : "text-white/45 hover:text-white/75"
            }`}
          >
            Simulation
          </button>
          <button
            onClick={() => setMode("live")}
            className={`flex items-center gap-2 rounded-full px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] transition-all duration-300 ${
              mode === "live" ? "bg-aqua-400 text-ink-950 shadow-[0_0_24px_rgba(85,226,192,0.35)]" : "text-white/45 hover:text-white/75"
            }`}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className={`absolute h-full w-full animate-ping rounded-full opacity-70 ${mode === "live" ? "bg-ink-950" : "bg-aqua-400"}`} />
              <span className={`relative h-1.5 w-1.5 rounded-full ${mode === "live" ? "bg-ink-950" : "bg-aqua-400"}`} />
            </span>
            Live · Studionet 61999
          </button>
        </div>

        {mode === "live" && <LiveCourt />}

        {/* case tabs */}
        <div className={`gap-2.5 ${mode === "live" ? "hidden" : "mt-4 flex flex-wrap"}`}>
          {CASES.map((cc, i) => (
            <button
              key={cc.ref}
              onClick={() => {
                setCaseIdx(i);
                reset();
              }}
              className={`group rounded-xl border px-4 py-3 text-left transition-all duration-300 ${
                i === caseIdx
                  ? "border-gilt-400/50 bg-gilt-400/[0.08]"
                  : "border-white/[0.08] bg-white/[0.02] hover:border-white/20"
              }`}
            >
              <p className={`font-mono text-[9px] uppercase tracking-[0.18em] ${i === caseIdx ? "text-gilt-300" : "text-white/35"}`}>
                {cc.ref}
              </p>
              <p className={`mt-1 text-[13px] font-medium ${i === caseIdx ? "text-white" : "text-white/55 group-hover:text-white/80"}`}>
                {cc.title}
              </p>
            </button>
          ))}
        </div>

        {/* bench */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className={`glass mt-6 overflow-hidden rounded-3xl ${mode === "live" ? "hidden" : ""}`}
        >
          {/* header: ref + stepper */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] px-6 py-4">
            <div className="flex items-center gap-3">
              <Landmark className="h-4 w-4 text-gilt-400" />
              <span className="font-mono text-[11px] tracking-[0.1em] text-white/60">{c.ref}</span>
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-white/30 sm:inline">
                · {c.category}
              </span>
            </div>

            <div className="flex items-center gap-0.5">
              {PHASES.map((p, i) => (
                <div key={p} className="flex items-center">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-1.5 w-1.5 rounded-full transition-all duration-500 ${
                        stepIndex > i ? "bg-gilt-400" : stepIndex === i && running ? "animate-pulse bg-iris-400" : "bg-white/15"
                      }`}
                    />
                    <span
                      className={`font-mono text-[9px] uppercase tracking-[0.16em] transition-colors duration-500 ${
                        stepIndex > i ? "text-gilt-300" : stepIndex === i && phase !== "idle" ? "text-white/70" : "text-white/25"
                      }`}
                    >
                      {p}
                    </span>
                  </div>
                  {i < PHASES.length - 1 && <div className={`mx-2.5 h-px w-5 sm:w-9 ${stepIndex > i ? "bg-gilt-400/50" : "bg-white/10"}`} />}
                </div>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-12">
            {/* ─── left: case brief ─── */}
            <div className="border-b border-white/[0.07] p-6 lg:col-span-4 lg:border-b-0 lg:border-r xl:col-span-3">
              <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">
                <ScrollText className="h-3 w-3" /> Case brief
              </div>

              {/* parties */}
              <div className="mt-4 space-y-2.5">
                {[
                  { p: c.plaintiff, tint: "text-gilt-300 border-gilt-400/25 bg-gilt-400/[0.07]", label: "plaintiff" },
                  { p: c.defendant, tint: "text-aqua-300 border-aqua-400/25 bg-aqua-400/[0.07]", label: "defendant" },
                ].map(({ p, tint, label }) => (
                  <div key={p.name} className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 ${tint}`}>
                    <Bot className="h-4 w-4 shrink-0" strokeWidth={1.6} />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-white">{p.name}</p>
                      <p className="truncate font-mono text-[9px] tracking-[0.06em] opacity-70">{p.handle} · {label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* claim */}
              <p className="mt-4 text-[12.5px] leading-relaxed text-white/55">{c.claim}</p>
              <p className="mt-2.5 border-l-2 border-aqua-400/30 pl-3 text-[12px] italic leading-relaxed text-white/40">
                “{c.rebuttal}”
              </p>

              {/* requirements */}
              <div className="mt-5 border-t border-white/[0.07] pt-4">
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">Spec clauses</p>
                <ul className="mt-2.5 space-y-2">
                  {c.requirements.map((r, i) => {
                    const shown = i < reqsRevealed;
                    return (
                      <li key={r.clause} className="flex items-start gap-2.5 text-[12px]">
                        <span
                          className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border transition-all duration-500 ${
                            !shown
                              ? "border-white/15 text-white/20"
                              : r.met === true
                                ? "border-aqua-400/50 bg-aqua-400/15 text-aqua-300"
                                : r.met === false
                                  ? "border-ember-500/50 bg-ember-500/15 text-ember-400"
                                  : "border-gilt-400/50 bg-gilt-400/15 text-gilt-300"
                          }`}
                        >
                          {!shown ? <Minus className="h-2.5 w-2.5" /> : r.met === true ? <Check className="h-2.5 w-2.5" /> : r.met === false ? <X className="h-2.5 w-2.5" /> : <span className="text-[8px]">~</span>}
                        </span>
                        <span className={`leading-snug transition-colors duration-500 ${!shown ? "text-white/30" : r.met === false ? "text-ember-400/80 line-through decoration-ember-500/40" : "text-white/60"}`}>
                          {r.clause}
                          {shown && r.met === null && <span className="ml-1.5 font-mono text-[8px] uppercase tracking-[0.12em] text-gilt-300/70">disputed</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* evidence */}
              <div className="mt-5 border-t border-white/[0.07] pt-4">
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">Exhibits</p>
                <ul className="mt-2.5 space-y-2">
                  {c.evidence.map((e, i) => {
                    const Icon = EVIDENCE_ICONS[e.kind];
                    const lit = phase !== "idle" && phase !== "intake";
                    return (
                      <li key={e.label} className="flex items-center gap-2.5 text-[11.5px]">
                        <Icon className={`h-3.5 w-3.5 shrink-0 transition-colors duration-700 ${lit ? "text-aqua-300" : "text-white/25"}`} style={{ transitionDelay: `${i * 120}ms` }} />
                        <span className={`truncate font-mono transition-colors duration-700 ${lit ? "text-white/65" : "text-white/30"}`}>{e.label}</span>
                        <span className="ml-auto font-mono text-[8px] uppercase tracking-[0.14em] text-white/25">{e.kind}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            {/* ─── center: scales + verdict ─── */}
            <div className="relative flex flex-col items-center justify-between border-b border-white/[0.07] px-6 py-8 lg:col-span-4 lg:border-b-0 lg:border-r xl:col-span-5">
              {/* escrow chip */}
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5">
                <CircleDollarSign className="h-3.5 w-3.5 text-gilt-400" />
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/55">
                  escrow at stake · <span className="text-gilt-300">{c.escrow} {c.currency}</span>
                </span>
              </div>

              <div className="relative my-4 grid place-items-center">
                <div className="absolute h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(228,186,100,0.06),transparent_65%)]" />
                {phase === "deliberation" && (
                  <div className="animate-sonar absolute h-52 w-52 rounded-full border border-gilt-400/25" />
                )}
                <Scales tilt={tilt} />

                {/* verdict stamp */}
                <AnimatePresence>
                  {phase === "verdict" || phase === "final" ? (
                    <motion.div
                      key={phase + c.ref}
                      initial={{ scale: 2.6, opacity: 0, rotate: -16 }}
                      animate={{ scale: 1, opacity: 1, rotate: -8 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 320, damping: 22 }}
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                    >
                      <div
                        className={`whitespace-nowrap rounded-md border-[3px] px-5 py-2.5 font-mono text-xl font-bold tracking-[0.12em] backdrop-blur-sm ${
                          outcome === "PLAINTIFF"
                            ? "border-gilt-400/90 text-gilt-300 shadow-[0_0_50px_rgba(228,186,100,0.25)]"
                            : outcome === "DEFENDANT"
                              ? "border-aqua-400/90 text-aqua-300 shadow-[0_0_50px_rgba(85,226,192,0.25)]"
                              : "border-iris-400/90 text-iris-300 shadow-[0_0_50px_rgba(157,134,255,0.3)]"
                        }`}
                        style={{ maskImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.6'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.92'/%3E%3C/svg%3E\")", maskSize: "120px" }}
                      >
                        {outcome === "SPLIT" ? `SPLIT ${share}/${100 - share}` : `${outcome} WINS`}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

              {/* settlement bar */}
              <div className="w-full max-w-[380px]">
                <div className="flex justify-between font-mono text-[8.5px] uppercase tracking-[0.18em] text-white/35">
                  <span>plaintiff {Math.round(displayedShare)}%</span>
                  <span>consensus {casted ? `${agrees}/${casted}` : "—"}</span>
                  <span>{100 - Math.round(displayedShare)}% defendant</span>
                </div>
                <div className="mt-2 flex h-2 overflow-hidden rounded-full border border-white/10 bg-ink-800">
                  <motion.div
                    className="h-full bg-gradient-to-r from-gilt-500 to-gilt-300"
                    animate={{ width: `${displayedShare}%` }}
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                  />
                  <motion.div
                    className="h-full flex-1 bg-gradient-to-r from-aqua-500 to-aqua-300"
                    animate={{ opacity: verdictShown ? 1 : 0.35 }}
                  />
                </div>

                {/* consensus pips */}
                <div className="mt-4 flex justify-center gap-2">
                  {panel.map((v, i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                        v.vote === null ? "bg-white/10" : v.vote === "agree" ? "bg-gilt-400 shadow-[0_0_10px_rgba(228,186,100,0.5)]" : "bg-ember-500 shadow-[0_0_10px_rgba(242,105,74,0.4)]"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* validators */}
              <div className="mt-6 flex w-full flex-wrap justify-center gap-2">
                {panel.map((v) => (
                  <div
                    key={v.idx}
                    className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 font-mono text-[9px] tracking-[0.04em] transition-all duration-500 ${
                      activeIdx === v.idx
                        ? "border-iris-400/60 bg-iris-500/15 text-iris-200 shadow-[0_0_20px_rgba(132,100,247,0.25)]"
                        : v.vote === "agree"
                          ? "border-gilt-400/40 bg-gilt-400/[0.07] text-gilt-200/90"
                          : v.vote === "dissent"
                            ? "border-ember-500/40 bg-ember-500/[0.07] text-ember-400/90"
                            : "border-white/[0.08] bg-white/[0.02] text-white/35"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        activeIdx === v.idx ? "animate-ping bg-iris-300" : v.vote === "agree" ? "bg-gilt-400" : v.vote === "dissent" ? "bg-ember-500" : "bg-white/20"
                      }`}
                    />
                    {v.model}
                    {v.idx >= 5 && <span className="text-[7px] uppercase tracking-[0.12em] text-white/30">appeal</span>}
                  </div>
                ))}
              </div>

              {/* controls */}
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                {phase === "idle" && (
                  <button
                    onClick={convene}
                    className="group inline-flex items-center gap-3 rounded-full bg-gilt-400 py-3 pl-6 pr-2.5 text-sm font-semibold text-ink-950 shadow-[0_0_40px_rgba(228,186,100,0.3)] transition-all hover:bg-gilt-300"
                  >
                    Convene the court
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-ink-950/90 text-gilt-300 transition-transform duration-300 group-hover:rotate-[20deg]">
                      <Gavel className="h-4 w-4" />
                    </span>
                  </button>
                )}

                {running && (
                  <button
                    onClick={() => setFast((f) => !f)}
                    className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] transition-all ${
                      fast ? "border-gilt-400/60 bg-gilt-400/10 text-gilt-200" : "border-white/15 text-white/60 hover:border-white/30"
                    }`}
                  >
                    <FastForward className="h-3.5 w-3.5" />
                    {fast ? "5× speed on" : "Fast-forward"}
                  </button>
                )}

                {phase === "verdict" && !appealed && (
                  <button
                    onClick={appeal}
                    className="inline-flex items-center gap-2 rounded-full border border-iris-400/50 bg-iris-500/10 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-iris-200 transition-all hover:bg-iris-500/20"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    File appeal · +2 validators
                  </button>
                )}

                {(phase === "verdict" || phase === "final") && (
                  <button
                    onClick={() => reset()}
                    className="inline-flex items-center gap-2 rounded-full border border-white/12 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-white/55 transition-all hover:border-white/30 hover:text-white"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset bench
                  </button>
                )}

                {phase === "final" && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-gilt-400/40 bg-gilt-400/10 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-gilt-300">
                    <Landmark className="h-3.5 w-3.5" /> Finalized · block 8,412,{560 + caseIdx}
                  </span>
                )}
              </div>
            </div>

            {/* ─── right: transcript ─── */}
            <div className="flex min-h-[420px] flex-col lg:col-span-4 xl:col-span-4">
              <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-3.5">
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">
                  Court transcript · genvm stdout
                </span>
                <span className="flex gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-ember-500/60" />
                  <span className="h-2 w-2 rounded-full bg-gilt-400/60" />
                  <span className="h-2 w-2 rounded-full bg-aqua-400/60" />
                </span>
              </div>

              <div ref={logRef} className="relative max-h-[420px] flex-1 space-y-3 overflow-y-auto scroll-smooth px-6 py-5 [scrollbar-width:thin] lg:max-h-[520px]">
                {transcript.length === 0 && (
                  <div className="absolute inset-0 grid place-items-center">
                    <p className="max-w-[220px] text-center font-mono text-[11px] leading-relaxed text-white/25">
                      bench is empty.
                      <br />
                      convene the court to
                      <br />
                      begin the record.
                    </p>
                  </div>
                )}
                {transcript.map((l) => (
                  <p key={l.id} className={`font-mono text-[11.5px] leading-relaxed ${LINE_COLOR[l.kind]}`}>
                    <span className="mr-2 select-none text-white/20">»</span>
                    {l.text}
                    {!l.done && <span className="animate-caret ml-0.5 inline-block h-3 w-[7px] translate-y-0.5 bg-gilt-300/80" />}
                  </p>
                ))}
                {phase === "final" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-lg border border-white/10 bg-ink-900/80 p-3 font-mono text-[10px] leading-relaxed text-aqua-300/80"
                  >
                    {"{ \"verdict\": \""}
                    {outcome === "SPLIT" ? "SPLIT" : `${outcome}_WINS`}
                    {"\", \"plaintiff_share\": "}
                    {share}
                    {", \"appeals\": "}
                    {appealed ? 1 : 0}
                    {" }"}
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* footnote */}
        <p className="mt-5 text-center font-mono text-[10px] tracking-[0.06em] text-white/25">
          {mode === "sim"
            ? "simulation scripted for the browser — flip to Live mode to run the same loop as real Studionet transactions"
            : "every action above is a real GenLayer transaction — signed by MetaMask, judged by live LLM validators"}
        </p>
      </div>
    </section>
  );
}
