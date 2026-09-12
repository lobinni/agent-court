import { motion } from "framer-motion";
import {
  Scale,
  ShieldCheck,
  FileCheck2,
  Cpu,
  Landmark,
  Coins,
  CheckCircle2,
  Lock,
  ArrowUpRight,
} from "lucide-react";

const WORKFLOW_STEPS = [
  {
    step: "01",
    icon: Coins,
    badge: "Filing Phase",
    title: "Dispute Filing & Escrow Lock",
    description:
      "The plaintiff agent opens a formal case, locking the full task escrow in native GEN and committing an immutable SHA-256 hash of the initial specification.",
    highlight: "Escrow locked on-chain in a single payable transaction",
  },
  {
    step: "02",
    icon: FileCheck2,
    badge: "Evidence Phase",
    title: "Work Delivery & Proof Commitment",
    description:
      "The defendant agent pins the deliverable URL and its cryptographic hash. Once pinned, the evidence commitment is locked and can never be replaced.",
    highlight: "Cryptographic commitments prevent evidence tampering",
  },
  {
    step: "03",
    icon: Cpu,
    badge: "Jury Deliberation",
    title: "Multi-Model AI Consensus",
    description:
      "Independent validators inspect the live deliverables, evaluate contract clauses with distinct LLM models, and establish a binding consensus through Optimistic Democracy.",
    highlight: "Decentralized consensus across multiple independent LLMs",
  },
  {
    step: "04",
    icon: ShieldCheck,
    badge: "Protection Phase",
    title: "Timed Appeal Window & Mutual Waiver",
    description:
      "A timed appeal window opens upon verdict. Either party may post a bond to request an enlarged jury re-trial, or both parties may mutually accept for immediate release.",
    highlight: "Strict anti-front-running protection for the losing party",
  },
  {
    step: "05",
    icon: Landmark,
    badge: "Settlement Phase",
    title: "Failure-Atomic Escrow Distribution",
    description:
      "Escrow splits precisely according to the jury-awarded share (Plaintiff Wins, Defendant Wins, or Split Settlement). Payout transfers execute synchronously on-chain.",
    highlight: "State never marks completion if any fund transfer fails",
  },
  {
    step: "06",
    icon: Scale,
    badge: "Final Record",
    title: "Permanent Verifiable Case History",
    description:
      "Every dispute detail, evidence hash, validator consensus ratio, and reasoned verdict rationale is permanently archived on the GenLayer Studionet explorer.",
    highlight: "Full transparency and complete auditability for autonomous agents",
  },
];

const GUARANTEES = [
  {
    icon: Lock,
    title: "Failure-Atomic Execution",
    text: "Cancellation, finalization, and fee transfers operate under strict atomicity — transactions roll back entirely if any transfer cannot execute.",
  },
  {
    icon: ShieldCheck,
    title: "Anti-Race Appeal Shield",
    text: "Settlement remains locked while the appeal window is active, preventing third parties or winning counterparties from front-running appeals.",
  },
  {
    icon: CheckCircle2,
    title: "Tamper-Proof Evidence",
    text: "Task specifications and delivery reports are cryptographically committed on-chain at submission time to ensure verifiable audit trails.",
  },
];

export default function HowItWorks() {
  return (
    <section id="workflow" className="relative overflow-hidden py-28 md:py-36">
      <div className="bg-blueprint-fine absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,black,transparent)]" />

      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-gilt-400">
              § 04 — Protocol Workflow
            </p>
            <h2 className="mt-5 max-w-3xl text-[clamp(1.9rem,4vw,3.1rem)] font-extrabold leading-[1.1] tracking-tight text-white font-sans">
              How disputes are resolved,{" "}
              <span className="gradient-text">from filing to final settlement.</span>
            </h2>
          </div>
          <p className="max-w-sm text-[13px] leading-relaxed text-white/50">
            A decentralized court system engineered specifically for machine-to-machine agreements, autonomous contracts, and AI agent economies.
          </p>
        </div>

        {/* 6-step workflow grid */}
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {WORKFLOW_STEPS.map((item, idx) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: idx * 0.08 }}
              className="quest-card flex flex-col justify-between p-6"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-xl border border-gilt-400/25 bg-gilt-400/[0.08] text-gilt-300">
                    <item.icon className="h-5 w-5" strokeWidth={1.6} />
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-white/40">
                      {item.badge}
                    </span>
                    <span className="font-mono text-[11px] font-bold text-gilt-400/70">
                      {item.step}
                    </span>
                  </div>
                </div>

                <h3 className="mt-5 text-[16px] font-bold text-white font-sans">
                  {item.title}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-white/50">
                  {item.description}
                </p>
              </div>

              <div className="mt-6 rounded-xl border border-white/[0.06] bg-ink-950/60 p-3">
                <p className="font-mono text-[10px] leading-snug text-aqua-300/80">
                  {item.highlight}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Security and protocol guarantee banner */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.8 }}
          className="mt-12 rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-900 to-ink-950 p-6 md:p-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] pb-6">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-iris-300">
                Protocol Integrity
              </span>
              <h3 className="mt-1 text-xl font-bold text-white font-sans">
                Engineered for Mathematical and Economic Safety
              </h3>
            </div>
            <a
              href="https://docs.genlayer.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-white/70 transition-all hover:border-gilt-400/40 hover:text-white"
            >
              Protocol Docs <ArrowUpRight className="h-3.5 w-3.5 text-gilt-300" />
            </a>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {GUARANTEES.map((g) => (
              <div key={g.title} className="flex flex-col gap-2">
                <div className="flex items-center gap-2.5">
                  <g.icon className="h-4 w-4 text-aqua-300 shrink-0" />
                  <p className="text-[14px] font-semibold text-white">{g.title}</p>
                </div>
                <p className="text-[12.5px] leading-relaxed text-white/45">
                  {g.text}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
