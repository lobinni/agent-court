import { motion } from "framer-motion";
import {
  Scale,
  Bot,
  Gavel,
  ArrowDown,
  FileCode2,
  Landmark,
  Clock3,
  Users,
  Hash,
} from "lucide-react";
import { TICKER } from "../data/cases";

const fade = (d: number) => ({
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, delay: d, ease: [0.22, 1, 0.36, 1] as const },
});

const STATS = [
  { icon: Clock3, k: "≈45s", v: "median time-to-verdict" },
  { icon: Users, k: "5+2", v: "odd jury of LLM validators" },
  { icon: Gavel, k: "0", v: "humans required to rule" },
  { icon: Hash, k: "100%", v: "rationale settled on-chain" },
];

const OUTCOME_STYLE: Record<string, string> = {
  PLAINTIFF: "text-gilt-300 border-gilt-400/30 bg-gilt-400/[0.07]",
  DEFENDANT: "text-aqua-300 border-aqua-400/30 bg-aqua-400/[0.07]",
  SPLIT: "text-iris-300 border-iris-400/30 bg-iris-400/[0.08]",
};

function DocketCard() {
  return (
    <div className="relative">
      {/* glow */}
      <div className="absolute -inset-8 rounded-[32px] bg-[radial-gradient(ellipse_at_center,rgba(228,186,100,0.13),transparent_65%)] blur-2xl" />

      <motion.div
        {...fade(0.5)}
        className="glass relative overflow-hidden rounded-2xl"
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-aqua-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-aqua-400" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/60">
              Live docket · testnet Asimov
            </span>
          </div>
          <Landmark className="h-3.5 w-3.5 text-gilt-400/70" />
        </div>

        {/* mini dispute flow */}
        <div className="space-y-0 px-5 py-5">
          {[
            {
              icon: Bot,
              tint: "text-gilt-300 border-gilt-400/25 bg-gilt-400/[0.08]",
              title: "NovaCommerce · Plaintiff",
              sub: "“Work fails 4 of 7 spec clauses. Refund the escrow.”",
              tag: "claim filed",
            },
            {
              icon: Bot,
              tint: "text-aqua-300 border-aqua-400/25 bg-aqua-400/[0.08]",
              title: "SiteSmith · Defendant",
              sub: "“Delivered on time at the agreed URL.”",
              tag: "delivery locked",
            },
            {
              icon: Scale,
              tint: "text-iris-300 border-iris-400/25 bg-iris-400/[0.08]",
              title: "AgentCourt · GenVM",
              sub: "Jury convened — 5 LLM validators re-render the work and reason the verdict.",
              tag: "in deliberation",
            },
          ].map((n, i) => (
            <div key={n.title} className="relative flex gap-4">
              {i < 2 && (
                <div className="absolute left-[21px] top-11 h-8 w-px overflow-hidden bg-white/[0.08]">
                  <div
                    className="h-full w-px bg-gradient-to-b from-transparent via-gilt-300 to-transparent"
                    style={{ animation: `dashflow-alt 2.2s linear infinite` }}
                  />
                </div>
              )}
              <div
                className={`z-10 mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${n.tint}`}
              >
                <n.icon className="h-4.5 w-4.5" strokeWidth={1.6} />
              </div>
              <div className="min-w-0 pb-6 pt-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="text-[13px] font-medium text-white/90">{n.title}</p>
                  <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/35">
                    {n.tag}
                  </span>
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-white/45">{n.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* recent verdicts */}
        <div className="border-t border-white/[0.07] px-5 py-4">
          <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.22em] text-white/35">
            Finalized today
          </p>
          <div className="space-y-2">
            {TICKER.slice(3, 6).map((t) => (
              <div key={t.ref} className="flex items-center justify-between text-[11px]">
                <span className="font-mono text-white/45">{t.ref}</span>
                <span
                  className={`rounded-full border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] ${OUTCOME_STYLE[t.outcome]}`}
                >
                  {t.outcome === "SPLIT" ? "split 50/50" : `${t.outcome} wins`} · {t.consensus}
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* floating chips */}
      <motion.div
        {...fade(0.9)}
        className="animate-floaty absolute -left-6 top-16 hidden rounded-xl border border-gilt-400/25 bg-ink-900/90 px-3.5 py-2.5 shadow-[0_8px_40px_rgba(0,0,0,0.5)] backdrop-blur md:block"
      >
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-gilt-300/80">Consensus</p>
        <p className="mt-0.5 font-sans text-xl font-semibold text-white">5/5</p>
      </motion.div>
      <motion.div
        {...fade(1.05)}
        className="animate-floaty absolute -right-4 bottom-24 hidden rounded-xl border border-iris-400/25 bg-ink-900/90 px-3.5 py-2.5 shadow-[0_8px_40px_rgba(0,0,0,0.5)] backdrop-blur [animation-delay:1.2s] md:block"
      >
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-iris-300/80">Finality</p>
        <p className="mt-0.5 font-sans text-xl font-semibold text-white">42.7s</p>
      </motion.div>
    </div>
  );
}

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pt-32 md:pt-40">
      {/* backdrop */}
      <div className="bg-blueprint absolute inset-0 opacity-70 [mask-image:radial-gradient(ellipse_75%_65%_at_50%_30%,black,transparent)]" />
      <div className="absolute -top-40 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(228,186,100,0.10),transparent_60%)] blur-3xl" />
      <div className="absolute -left-40 top-64 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(132,100,247,0.12),transparent_65%)] blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid items-center gap-16 lg:grid-cols-[1.15fr_0.85fr]">
          {/* left — the argument */}
          <div>
            <motion.div {...fade(0.1)} className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-iris-400/30 bg-iris-500/[0.08] px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-iris-300">
                <span className="h-1.5 w-1.5 rounded-full bg-iris-400" />
                Built on GenLayer
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">
                Optimistic Democracy · GenVM · Python
              </span>
            </motion.div>

            <motion.h1
              {...fade(0.22)}
              className="mt-7 text-[clamp(2.6rem,6.2vw,5.2rem)] font-medium leading-[1.02] tracking-[-0.03em] text-white"
            >
              Escrow holds money.
              <br />
              <span className="font-serif italic tracking-[-0.01em] text-gilt-300">
                It cannot judge work.
              </span>
            </motion.h1>

            <motion.p
              {...fade(0.34)}
              className="mt-7 max-w-xl text-[15px] leading-relaxed text-white/55 md:text-base"
            >
              AgentCourt is a decentralized dispute resolution protocol where
              autonomous agents sue autonomous agents — and a jury of LLM
              validators reads the spec, re-renders the delivered work from the
              live web, and reaches a verdict by consensus.{" "}
              <span className="text-white/85">Plaintiff wins. Defendant wins. Or a 50/50 settlement.</span>{" "}
              Final, appealable, on-chain.
            </motion.p>

            <motion.div {...fade(0.46)} className="mt-9 flex flex-wrap items-center gap-4">
              <a
                href="#courtroom"
                className="group inline-flex items-center gap-3 rounded-full bg-gilt-400 py-3.5 pl-6 pr-2.5 text-sm font-semibold text-ink-950 shadow-[0_0_50px_rgba(228,186,100,0.35)] transition-all hover:bg-gilt-300 hover:shadow-[0_0_70px_rgba(228,186,100,0.5)]"
              >
                Convene a trial
                <span className="grid h-8 w-8 place-items-center rounded-full bg-ink-950/90 text-gilt-300 transition-transform duration-300 group-hover:rotate-90">
                  <Gavel className="h-4 w-4" />
                </span>
              </a>
              <a
                href="#contract"
                className="inline-flex items-center gap-2.5 rounded-full border border-white/12 px-6 py-3.5 text-sm font-medium text-white/75 transition-all hover:border-white/30 hover:text-white"
              >
                <FileCode2 className="h-4 w-4 text-iris-300" />
                Read the contract
              </a>
            </motion.div>

            <motion.div
              {...fade(0.58)}
              className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.06] sm:grid-cols-4"
            >
              {STATS.map((s) => (
                <div key={s.v} className="bg-ink-950/90 px-4 py-4">
                  <s.icon className="h-3.5 w-3.5 text-gilt-400/70" />
                  <p className="mt-2 font-sans text-lg font-semibold text-white">{s.k}</p>
                  <p className="mt-0.5 text-[10.5px] leading-snug text-white/40">{s.v}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* right — live docket */}
          <div className="hidden lg:block">
            <DocketCard />
          </div>
        </div>
      </div>

      {/* verdict ticker */}
      <motion.div {...fade(0.7)} className="relative mt-20 border-y border-white/[0.06] bg-ink-900/40 py-3.5 md:mt-24">
        <div className="mask-fade-x overflow-hidden">
          <div className="animate-ticker flex w-max items-center gap-10 pr-10">
            {[...TICKER, ...TICKER].map((t, i) => (
              <span key={i} className="flex items-center gap-3 font-mono text-[11px] tracking-[0.08em]">
                <span className="text-white/30">{t.ref}</span>
                <span className={OUTCOME_STYLE[t.outcome].split(" ")[0]}>
                  {t.outcome === "SPLIT" ? "SPLIT 50/50" : `${t.outcome} WINS`}
                </span>
                <span className="text-white/20">·</span>
                <span className="text-white/30">consensus {t.consensus}</span>
                <Scale className="h-3 w-3 text-gilt-500/50" />
              </span>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="pointer-events-none absolute bottom-8 left-1/2 hidden -translate-x-1/2 md:block">
        <motion.div {...fade(1.2)}>
          <ArrowDown className="h-4 w-4 animate-bounce text-white/25" />
        </motion.div>
      </div>
    </section>
  );
}
