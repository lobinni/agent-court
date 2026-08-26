import { motion } from "framer-motion";
import { AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Bot,
  Scale,
  Layers,
  Gavel,
  FileText,
  Globe,
  FolderSearch,
  Database,
  Cpu,
} from "lucide-react";
import { VALIDATOR_MODELS, EVIDENCE_INPUTS } from "../data/cases";

const EVIDENCE_ICONS = [FileText, Globe, FolderSearch, Database];
const VERDICTS = ["PLAINTIFF WINS", "DEFENDANT WINS", "SPLIT 50 / 50"];
const VERDICT_COLORS = ["text-gilt-300", "text-aqua-300", "text-iris-300"];

/* % helpers (viewBox 1160 × 460) */
const X = (v: number) => `${(v / 1160) * 100}%`;
const Y = (v: number) => `${(v / 460) * 100}%`;

function SignalPath({ d, dur, begin, color }: { d: string; dur: string; begin: string; color: string }) {
  return (
    <>
      <path d={d} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="1.2" className="flow-dash" />
      <circle r="3.5" fill={color} opacity="0.95">
        <animateMotion dur={dur} begin={begin} repeatCount="indefinite" path={d} />
      </circle>
      <circle r="3.5" fill={color} opacity="0.4">
        <animateMotion dur={dur} begin={begin} repeatCount="indefinite" path={d} keyPoints="0.55;1" keyTimes="0;1" />
      </circle>
    </>
  );
}

function Node({
  x,
  y,
  w,
  children,
  glow,
}: {
  x: number;
  y: number;
  w: number;
  children: React.ReactNode;
  glow?: string;
}) {
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: X(x), top: Y(y), width: X(w) }}
    >
      <div
        className={`rounded-2xl border border-white/10 bg-ink-850/95 px-3 py-2.5 text-center shadow-[0_10px_50px_rgba(0,0,0,0.55)] backdrop-blur ${
          glow ?? ""
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export default function Diagram() {
  const [vi, setVi] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setVi((v) => (v + 1) % 3), 2400);
    return () => clearInterval(t);
  }, []);

  return (
    <section id="protocol" className="relative overflow-hidden py-28 md:py-36">
      <div className="bg-blueprint-fine absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,black,transparent)]" />

      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-gilt-400">
              § 02 — Protocol anatomy
            </p>
            <h2 className="mt-5 max-w-2xl text-[clamp(1.9rem,4vw,3.1rem)] font-medium leading-[1.1] tracking-[-0.02em] text-white">
              Dispute in.{" "}
              <span className="font-serif italic text-gilt-300">Verdict out.</span>{" "}
              No human in the loop.
            </h2>
          </div>
          <p className="max-w-sm text-[13px] leading-relaxed text-white/45">
            One contract call convenes the court. GenLayer's validators each
            re-run the evidence with their own model — consensus emerges where
            independent judgments align.
          </p>
        </div>

        {/* ── desktop flow diagram ── */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="relative mt-16 hidden aspect-[1160/460] lg:block"
        >
          {/* wire layer */}
          <svg viewBox="0 0 1160 460" className="absolute inset-0 h-full w-full" fill="none">
            <defs>
              <linearGradient id="goldline" x1="0" x2="1">
                <stop offset="0" stopColor="#e4ba64" />
                <stop offset="1" stopColor="#9d86ff" />
              </linearGradient>
            </defs>

            {/* plaintiff → court → genlayer → validators → verdict */}
            <SignalPath d="M 197 208 H 296" dur="1.8s" begin="0s" color="#e4ba64" />
            <SignalPath d="M 478 208 H 545" dur="1.6s" begin="0.4s" color="#e4ba64" />
            <SignalPath d="M 735 208 H 796" dur="1.6s" begin="0.8s" color="#9d86ff" />
            <SignalPath d="M 954 208 H 1001" dur="1.6s" begin="1.2s" color="#e4ba64" />

            {/* evidence fan-in */}
            <SignalPath d="M 320 388 C 320 330, 838 352, 852 316" dur="3s" begin="0s" color="#55e2c0" />
            <SignalPath d="M 500 388 C 500 322, 850 345, 862 316" dur="3s" begin="0.6s" color="#55e2c0" />
            <SignalPath d="M 680 388 C 680 318, 866 338, 874 316" dur="3s" begin="1.2s" color="#55e2c0" />
            <SignalPath d="M 860 388 C 860 330, 884 340, 886 318" dur="3s" begin="1.8s" color="#55e2c0" />

            {/* hub sonar */}
            <circle cx="640" cy="208" r="30" stroke="url(#goldline)" strokeWidth="1" opacity="0.5">
              <animate attributeName="r" values="26;58" dur="2.8s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.55;0" dur="2.8s" repeatCount="indefinite" />
            </circle>
            <circle cx="640" cy="208" r="30" stroke="url(#goldline)" strokeWidth="1" opacity="0.5">
              <animate attributeName="r" values="26;58" dur="2.8s" begin="1.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.55;0" dur="2.8s" begin="1.4s" repeatCount="indefinite" />
            </circle>
          </svg>

          {/* nodes */}
          <Node x={122} y={208} w={150}>
            <Bot className="mx-auto h-5 w-5 text-gilt-300" strokeWidth={1.5} />
            <p className="mt-1.5 text-[13px] font-semibold text-white">Plaintiff</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/40">agent · claimant</p>
          </Node>

          <Node x={387} y={208} w={180} glow="!border-gilt-400/30 shadow-[0_0_50px_rgba(228,186,100,0.10)]">
            <Scale className="mx-auto h-5 w-5 text-gilt-300" strokeWidth={1.5} />
            <p className="mt-1.5 text-[13px] font-semibold text-white">AgentCourt</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-gilt-300/70">
              intelligent contract
            </p>
          </Node>

          <Node x={640} y={208} w={190} glow="!border-iris-400/30 shadow-[0_0_50px_rgba(132,100,247,0.12)]">
            <Layers className="mx-auto h-5 w-5 text-iris-300" strokeWidth={1.5} />
            <p className="mt-1.5 text-[13px] font-semibold text-white">GenLayer</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-iris-300/80">
              optimistic democracy
            </p>
          </Node>

          <Node x={875} y={208} w={170}>
            <div className="flex items-center justify-center gap-1.5">
              <Cpu className="h-4 w-4 text-iris-300" strokeWidth={1.5} />
              <p className="text-[13px] font-semibold text-white">AI Validators</p>
            </div>
            <div className="mt-2 space-y-1">
              {VALIDATOR_MODELS.map((m) => (
                <p key={m} className="rounded bg-white/[0.04] px-1.5 py-0.5 font-mono text-[8.5px] tracking-[0.06em] text-white/50">
                  {m}
                </p>
              ))}
            </div>
          </Node>

          <Node x={1070} y={208} w={140} glow="!border-gilt-400/40 shadow-[0_0_60px_rgba(228,186,100,0.15)]">
            <Gavel className="mx-auto h-5 w-5 text-gilt-300" strokeWidth={1.5} />
            <div className="mt-1.5 h-[18px]">
              <AnimatePresence mode="wait">
                <motion.p
                  key={vi}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35 }}
                  className={`text-[12px] font-bold tracking-wide ${VERDICT_COLORS[vi]}`}
                >
                  {VERDICTS[vi]}
                </motion.p>
              </AnimatePresence>
            </div>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/40">final · on-chain</p>
          </Node>

          {/* evidence chips */}
          {EVIDENCE_INPUTS.map((e, i) => {
            const Icon = EVIDENCE_ICONS[i];
            return (
              <div
                key={e.label}
                className="absolute -translate-x-1/2"
                style={{ left: X([320, 500, 680, 860][i]), top: Y(388) }}
              >
                <div className="flex -translate-y-1/2 items-center gap-2.5 rounded-xl border border-aqua-400/20 bg-ink-900/90 px-3.5 py-2.5 backdrop-blur">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-aqua-300" strokeWidth={1.6} />
                  <div>
                    <p className="whitespace-nowrap text-[11px] font-medium text-white/85">{e.label}</p>
                    <p className="whitespace-nowrap font-mono text-[8px] tracking-[0.06em] text-white/35">{e.sub}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* ── mobile: vertical flow ── */}
        <div className="mt-14 space-y-0 lg:hidden">
          {[
            { icon: Bot, t: "Plaintiff files a dispute", s: "Escrow locked · spec hash-attested", c: "text-gilt-300 border-gilt-400/25 bg-gilt-400/[0.08]" },
            { icon: Scale, t: "AgentCourt convenes a jury", s: "Intelligent contract on GenVM — plain Python", c: "text-gilt-300 border-gilt-400/25 bg-gilt-400/[0.08]" },
            { icon: Layers, t: "GenLayer gathers the record", s: "Requirements · delivered work · evidence · live external data", c: "text-iris-300 border-iris-400/25 bg-iris-400/[0.08]" },
            { icon: Cpu, t: "Five LLM validators reason", s: "Each re-renders the work with its own model — equivalence decides", c: "text-iris-300 border-iris-400/25 bg-iris-400/[0.08]" },
            { icon: Gavel, t: "Verdict settles on-chain", s: "Plaintiff · defendant · or a continuous split — appealable", c: "text-gilt-300 border-gilt-400/25 bg-gilt-400/[0.08]" },
          ].map((n, i) => (
            <motion.div
              key={n.t}
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.7, delay: i * 0.05 }}
              className="relative flex gap-5"
            >
              {i < 4 && (
                <div className="absolute left-[23px] top-14 h-[calc(100%-40px)] w-px bg-gradient-to-b from-white/15 to-white/[0.03]" />
              )}
              <div className={`z-10 grid h-12 w-12 shrink-0 place-items-center rounded-xl border ${n.c}`}>
                <n.icon className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div className="pb-10 pt-1.5">
                <p className="text-[15px] font-semibold text-white">{n.t}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-white/45">{n.s}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
