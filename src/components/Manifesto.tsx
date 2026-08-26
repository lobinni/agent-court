import { motion } from "framer-motion";
import {
  ArrowLeftRight,
  PiggyBank,
  Wallet,
  MessageSquareText,
  Scale,
  Ban,
} from "lucide-react";

const CROWDED = [
  { icon: ArrowLeftRight, name: "DEXs", note: "settle trades — solved, crowded" },
  { icon: PiggyBank, name: "Lending", note: "settle loans — solved, crowded" },
  { icon: Wallet, name: "Wallets", note: "hold keys — solved, crowded" },
  { icon: MessageSquareText, name: "AI chatbots", note: "talk — zero moat" },
];

const rise = (d: number) => ({
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.8, delay: d, ease: [0.22, 1, 0.36, 1] as const },
});

export default function Manifesto() {
  return (
    <section className="relative overflow-hidden py-28 md:py-36">
      <div className="absolute right-[-200px] top-20 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(228,186,100,0.07),transparent_65%)] blur-3xl" />

      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <motion.p {...rise(0)} className="font-mono text-[11px] uppercase tracking-[0.28em] text-gilt-400">
          § 01 — The thesis
        </motion.p>
        <motion.h2
          {...rise(0.08)}
          className="mt-5 max-w-3xl text-[clamp(1.9rem,4vw,3.1rem)] font-medium leading-[1.1] tracking-[-0.02em] text-white"
        >
          Not another app chasing the same five primitives.{" "}
          <span className="font-serif italic text-gilt-300">
            A court system for an economy that never sleeps.
          </span>
        </motion.h2>

        <div className="mt-14 grid gap-6 lg:grid-cols-[1fr_1.05fr]">
          {/* left — the argued copy */}
          <motion.div {...rise(0.12)} className="glass flex flex-col justify-between rounded-2xl p-7 md:p-9">
            <div>
              <p className="text-[15px] leading-relaxed text-white/60">
                When one AI agent hires another, the failure modes are rarely
                binary. A spec is ambiguous, a deliverable is{" "}
                <em className="font-serif text-white/85">almost</em> right, an
                upstream API changes at 3am. Deterministic chains cannot touch
                any of it — so today, every agent dispute routes back to a
                human, off-chain.
              </p>
              <p className="mt-5 text-[15px] leading-relaxed text-white/60">
                Bitcoin made money trustless. Ethereum made computation
                trustless.{" "}
                <span className="border-b border-gilt-400/40 text-gilt-200">
                  GenLayer makes judgment trustless
                </span>
                — and AgentCourt is where that judgment gets a docket number.
              </p>
            </div>

            {/* binary vs continuum */}
            <div className="mt-9 space-y-5 border-t border-white/[0.07] pt-7">
              <div>
                <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">
                  <span>Escrow · binary</span>
                  <span>0 or 100 — nothing between</span>
                </div>
                <div className="mt-2.5 flex h-9 overflow-hidden rounded-lg border border-white/10">
                  <div className="grid flex-1 place-items-center border-r border-white/10 bg-ember-500/[0.12] font-mono text-[9.5px] uppercase tracking-[0.14em] text-ember-400">
                    Refund 100%
                  </div>
                  <div className="grid flex-1 place-items-center bg-aqua-400/[0.08] font-mono text-[9.5px] uppercase tracking-[0.14em] text-aqua-300">
                    Release 100%
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-gilt-300/80">
                  <span>AgentCourt · continuous</span>
                  <span>any share the evidence supports</span>
                </div>
                <div className="relative mt-2.5 h-9 overflow-hidden rounded-lg border border-gilt-400/25 bg-gradient-to-r from-ember-500/[0.14] via-gilt-400/[0.14] to-aqua-400/[0.14]">
                  {[25, 50, 75].map((x) => (
                    <span key={x} className="absolute top-0 h-full w-px bg-white/10" style={{ left: `${x}%` }} />
                  ))}
                  <motion.div
                    initial={{ left: "50%" }}
                    whileInView={{ left: ["50%", "62%", "37%", "50%"] }}
                    viewport={{ once: false, margin: "-60px" }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-0 h-full w-[3px] -translate-x-1/2 bg-gilt-300 shadow-[0_0_16px_rgba(228,186,100,0.9)]"
                  />
                  <span className="absolute inset-0 grid place-items-center font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/50">
                    0 ── 30 / 70 ── 50 / 50 ── 70 / 30 ── 100
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* right — crowded board + the gap */}
          <div className="grid gap-6 sm:grid-cols-2">
            {CROWDED.map((c, i) => (
              <motion.div
                key={c.name}
                {...rise(0.12 + i * 0.06)}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-900/60 p-6"
              >
                <div className="flex items-start justify-between">
                  <c.icon className="h-6 w-6 text-white/25" strokeWidth={1.5} />
                  <Ban className="h-3.5 w-3.5 text-ember-500/60" />
                </div>
                <p className="mt-5 font-sans text-lg font-medium text-white/40 line-through decoration-ember-500/50 decoration-2">
                  {c.name}
                </p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white/25">
                  {c.note}
                </p>
              </motion.div>
            ))}

            <motion.div
              {...rise(0.4)}
              className="relative overflow-hidden rounded-2xl border border-gilt-400/35 bg-gradient-to-br from-gilt-400/[0.13] via-ink-900 to-ink-900 p-6 sm:col-span-2"
            >
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gilt-400/15 blur-3xl" />
              <div className="relative flex flex-wrap items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl border border-gilt-400/40 bg-gilt-400/15 text-gilt-300">
                      <Scale className="h-5 w-5" strokeWidth={1.6} />
                    </span>
                    <div>
                      <p className="font-sans text-xl font-semibold text-white">The missing primitive</p>
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gilt-300/80">
                        judgment, as a service
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 max-w-md text-[13px] leading-relaxed text-white/55">
                    Every machine-to-machine contract will eventually produce a
                    disagreement no if-statement anticipated. The chain that can
                    adjudicate subjectivity becomes the jurisdiction of the
                    agent economy. That jurisdiction is GenLayer.
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 font-mono text-[10px] uppercase tracking-[0.16em]">
                  {["subjective evidence", "natural-language specs", "partial fault"].map((t) => (
                    <span key={t} className="rounded-full border border-gilt-400/25 bg-gilt-400/[0.08] px-3 py-1.5 text-gilt-200/90">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
