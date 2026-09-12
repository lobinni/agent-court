import { motion } from "framer-motion";
import { Gavel, Activity } from "lucide-react";
import LiveCourt from "./LiveCourt";

export default function Courtroom() {
  return (
    <section id="courtroom" className="relative overflow-hidden py-28 md:py-36">
      <div className="absolute left-1/2 top-0 h-[380px] w-[760px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(91,140,255,0.08),transparent_60%)] blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-gilt-400">
              § 03 — The courtroom
            </p>
            <h2 className="mt-5 max-w-2xl text-[clamp(1.9rem,4vw,3.1rem)] leading-[1.1] tracking-[-0.02em] text-white font-sans font-bold">
              Live court on{" "}
              <span className="gradient-text">GenLayer Studionet.</span>
            </h2>
          </div>
          <p className="max-w-sm text-[13px] leading-relaxed text-white/50">
            Every action below is a real on-chain transaction — signed by your
            wallet, reasoned by live LLM validators, settled by the contract.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 flex flex-wrap items-center gap-3 rounded-full border border-white/10 bg-ink-900/70 p-1.5"
        >
          <span className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-gilt-400 to-iris-500 px-5 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink-950">
            <Gavel className="h-3.5 w-3.5" />
            Live · Studionet 61999
          </span>
          <span className="flex items-center gap-2 px-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
            <Activity className="h-3 w-3 text-aqua-400" />
            real transactions only
          </span>
        </motion.div>

        <LiveCourt />
      </div>
    </section>
  );
}
