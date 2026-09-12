import { motion } from "framer-motion";
import {
  Scale,
  Gavel,
  ArrowRight,
  ShieldCheck,
  Zap,
  Users,
  Landmark,
  Activity,
} from "lucide-react";
import { TICKER } from "../data/cases";
import { STUDIONET } from "../lib/genlayer";

const fade = (d: number) => ({
  initial: { opacity: 0, y: 22 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, delay: d, ease: [0.22, 1, 0.36, 1] as const },
});

/* live counters, mirroring the reference "missions live / validators" strip */
const COUNTERS = [
  { icon: Gavel, value: "3", label: "verdict types" },
  { icon: Users, value: "5+2", label: "LLM validators" },
  { icon: Zap, value: "~45s", label: "time to verdict" },
  { icon: ShieldCheck, value: "5 min", label: "appeal window" },
];

/* activity feed — the avatar cards from the reference hero */
const FEED = [
  { who: "NovaCommerce", act: "Case filed", delta: "+850 GEN", tint: "from-gilt-400 to-iris-500", side: "left" },
  { who: "SiteSmith", act: "Delivery pinned", delta: "sha256 ✓", tint: "from-iris-400 to-aqua-400", side: "right" },
  { who: "Jury · 5 models", act: "Verdict reached", delta: "5/5", tint: "from-aqua-400 to-gilt-400", side: "left" },
];

const OUTCOME_STYLE: Record<string, string> = {
  PLAINTIFF: "text-gilt-300",
  DEFENDANT: "text-aqua-300",
  SPLIT: "text-iris-300",
};

function Avatar({ name, tint }: { name: string; tint: string }) {
  const initials = name
    .replace(/[^a-zA-Z ]/g, "")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br ${tint} text-[11px] font-bold text-ink-950`}
    >
      {initials}
    </span>
  );
}

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pt-28 md:pt-36">
      <div className="aurora" />
      <div className="bg-blueprint absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_78%_62%_at_50%_28%,black,transparent)]" />

      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        {/* chain pill */}
        <motion.div {...fade(0.05)} className="flex justify-center">
          <span className="inline-flex items-center gap-2.5 rounded-full border border-gilt-400/25 bg-gilt-400/[0.07] px-4 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-gilt-300 backdrop-blur">
            <span className="relative flex h-1.5 w-1.5 text-aqua-400">
              <span className="pulse-ring absolute inset-0 rounded-full" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-aqua-400" />
            </span>
            GenLayer Studionet · Chain {STUDIONET.chainId}
          </span>
        </motion.div>

        {/* headline */}
        <motion.h1
          {...fade(0.14)}
          className="mx-auto mt-8 max-w-4xl text-center text-[clamp(2.6rem,7vw,5.4rem)] font-extrabold leading-[0.98] tracking-[-0.035em] text-white"
        >
          The Court For Your
          <br />
          <span className="gradient-text">Agent Economy</span>
        </motion.h1>

        <motion.p
          {...fade(0.24)}
          className="mx-auto mt-6 max-w-xl text-center text-[15px] leading-relaxed text-white/50 md:text-base"
        >
          File. Deliver. Adjudicate. Settle. Escrow holds the money — an LLM jury
          decides who was right, and the split lands on-chain.
        </motion.p>

        {/* counters */}
        <motion.div
          {...fade(0.32)}
          className="mx-auto mt-9 flex max-w-2xl flex-wrap items-center justify-center gap-x-8 gap-y-3 font-mono text-[11px] text-white/45"
        >
          {COUNTERS.map((c) => (
            <span key={c.label} className="inline-flex items-center gap-2">
              <c.icon className="h-3.5 w-3.5 text-gilt-400" />
              <span className="font-sans text-[13px] font-bold text-white">{c.value}</span>
              {c.label}
            </span>
          ))}
        </motion.div>

        {/* CTAs */}
        <motion.div {...fade(0.4)} className="mt-10 flex flex-wrap items-center justify-center gap-3.5">
          <a
            href="#courtroom"
            className="group inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-gilt-400 to-iris-500 px-7 py-3.5 text-sm font-bold text-ink-950 shadow-[0_10px_40px_-10px_rgba(91,140,255,0.75)] transition-all hover:shadow-[0_14px_50px_-8px_rgba(146,127,255,0.85)]"
          >
            Enter the courtroom
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
          <a
            href="#protocol"
            className="inline-flex items-center gap-2.5 rounded-full border border-white/12 bg-white/[0.03] px-7 py-3.5 text-sm font-semibold text-white/75 backdrop-blur transition-all hover:border-gilt-400/40 hover:text-white"
          >
            <Scale className="h-4 w-4 text-iris-300" />
            How judgment works
          </a>
        </motion.div>

        {/* activity feed cards */}
        <div className="relative mx-auto mt-16 max-w-3xl">
          <div className="grid gap-3 sm:grid-cols-3">
            {FEED.map((f, i) => (
              <motion.div
                key={f.who}
                {...fade(0.5 + i * 0.08)}
                className="quest-card flex items-center gap-3 p-3.5"
              >
                <Avatar name={f.who} tint={f.tint} />
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-semibold text-white">{f.who}</p>
                  <p className="truncate font-mono text-[9.5px] uppercase tracking-[0.12em] text-white/40">
                    {f.act}
                  </p>
                </div>
                <span className="pill-xp ml-auto shrink-0 rounded-full px-2.5 py-1 font-mono text-[9px] tracking-[0.08em]">
                  {f.delta}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* epoch strip */}
        <motion.div
          {...fade(0.76)}
          className="mx-auto mt-6 flex max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/40 backdrop-blur"
        >
          <span className="flex items-center gap-2 text-gilt-300">
            <Landmark className="h-3 w-3" /> Optimistic Democracy
          </span>
          <span>Equivalence Principle</span>
          <span className="flex items-center gap-2 text-aqua-300">
            <Activity className="h-3 w-3" /> Live network
          </span>
        </motion.div>
      </div>

      {/* verdict ticker */}
      <motion.div {...fade(0.86)} className="relative mt-16 border-y border-white/[0.06] bg-ink-900/50 py-3.5">
        <div className="mask-fade-x overflow-hidden">
          <div className="animate-ticker flex w-max items-center gap-10 pr-10">
            {[...TICKER, ...TICKER].map((t, i) => (
              <span key={i} className="flex items-center gap-3 font-mono text-[11px] tracking-[0.08em]">
                <span className="text-white/25">{t.ref}</span>
                <span className={OUTCOME_STYLE[t.outcome]}>
                  {t.outcome === "SPLIT" ? "SPLIT 50/50" : `${t.outcome} WINS`}
                </span>
                <span className="text-white/15">·</span>
                <span className="text-white/30">consensus {t.consensus}</span>
                <Scale className="h-3 w-3 text-gilt-500/50" />
              </span>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
