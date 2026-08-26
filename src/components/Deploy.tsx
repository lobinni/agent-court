import { motion } from "framer-motion";
import {
  TerminalSquare,
  Coins,
  Rocket,
  Gavel,
  ArrowUpRight,
  Server,
  FlaskConical,
  Globe2,
  BookOpenText,
  MonitorDot,
  LayoutGrid,
  Wallet,
  PlugZap,
  CheckCircle2,
} from "lucide-react";
import { useWallet } from "../lib/WalletContext";
import { STUDIONET } from "../lib/genlayer";

const STEPS = [
  {
    icon: TerminalSquare,
    n: "01",
    title: "Install the toolkit",
    body: "The genlayer CLI boots the Studio and a local validator set with one command.",
    cmd: "npm install -g genlayer && genlayer init",
  },
  {
    icon: Coins,
    n: "02",
    title: "Get test GEN",
    body: "On Studionet the faucet lives inside Studio (account selector → 💧). faucet.genlayer.com serves Asimov.",
    cmd: "studio.genlayer.com · account selector → 💧",
  },
  {
    icon: Rocket,
    n: "03",
    title: "Deploy the court",
    body: "One Python file, one CLI call. Consensus picks up deployment just like any transaction.",
    cmd: "genlayer deploy --contract contracts/agent_court.py --network testnetAsimov",
  },
  {
    icon: Gavel,
    n: "04",
    title: "Convene the first jury",
    body: "File a dispute with locked escrow, let the defendant lock delivery, then convene_trial.",
    cmd: "genlayer write 0xCOURT convene_trial 0",
  },
];

const NETWORKS = [
  { icon: Server, name: "Localnet", purpose: "full control, instant reset", status: "dev", tone: "text-white/50 border-white/15" },
  { icon: FlaskConical, name: "Studionet", purpose: "hosted · team prototyping", status: "beta", tone: "text-iris-300 border-iris-400/30" },
  { icon: Globe2, name: "Testnet Asimov", purpose: "production-like · faucet GEN", status: "live", tone: "text-gilt-300 border-gilt-400/30" },
];

const LINKS = [
  { icon: BookOpenText, label: "docs.genlayer.com", sub: "intelligent contracts · GenVM reference" },
  { icon: MonitorDot, label: "studio.genlayer.com", sub: "deploy & debug in the browser IDE" },
  { icon: LayoutGrid, label: "portal.genlayer.foundation", sub: "builders program · grants & resources" },
];

export default function Deploy() {
  const w = useWallet();
  return (
    <section id="deploy" className="relative overflow-hidden py-28 md:py-36">
      <div className="bg-blueprint absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_60%,black,transparent)]" />

      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <div className="max-w-3xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-gilt-400">
            § 05 — Ship it
          </p>
          <h2 className="mt-5 text-[clamp(1.9rem,4vw,3.1rem)] font-medium leading-[1.1] tracking-[-0.02em] text-white">
            From clone to court order{" "}
            <span className="font-serif italic text-gilt-300">in four commands.</span>
          </h2>
        </div>

        <div className="mt-14 grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          {/* steps */}
          <div>
            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.7, delay: i * 0.06 }}
                className="group relative flex gap-6 pb-10 last:pb-0"
              >
                {i < STEPS.length - 1 && (
                  <div className="absolute left-[27px] top-16 h-[calc(100%-64px)] w-px bg-gradient-to-b from-gilt-400/30 to-white/[0.04]" />
                )}
                <div className="relative z-10 grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-gilt-400/25 bg-ink-900 text-gilt-300 transition-all duration-300 group-hover:border-gilt-400/50 group-hover:shadow-[0_0_30px_rgba(228,186,100,0.15)]">
                  <s.icon className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-[10px] tracking-[0.2em] text-gilt-400/70">{s.n}</span>
                    <h3 className="text-[16px] font-semibold text-white">{s.title}</h3>
                  </div>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-white/45">{s.body}</p>
                  <div className="mt-3 flex items-center gap-2 overflow-x-auto rounded-lg border border-white/[0.07] bg-ink-900/80 px-3.5 py-2.5 [scrollbar-width:thin]">
                    <span className="font-mono text-[10px] text-gilt-400">$</span>
                    <code className="whitespace-nowrap font-mono text-[11px] text-white/70">{s.cmd}</code>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* networks + resources */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.8 }}
              className="glass rounded-2xl p-6"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">Networks</p>
              <div className="mt-4 space-y-3">
                {NETWORKS.map((n) => (
                  <div key={n.name} className={`flex items-center justify-between rounded-xl border bg-ink-900/60 px-4 py-3.5 ${n.tone.split(" ").slice(1).join(" ")}`}>
                    <div className="flex items-center gap-3">
                      <n.icon className={`h-4 w-4 ${n.tone.split(" ")[0]}`} strokeWidth={1.6} />
                      <div>
                        <p className="text-[13.5px] font-medium text-white">{n.name}</p>
                        <p className="font-mono text-[9.5px] tracking-[0.06em] text-white/35">{n.purpose}</p>
                      </div>
                    </div>
                    <span className={`font-mono text-[9px] uppercase tracking-[0.16em] ${n.tone.split(" ")[0]}`}>
                      ● {n.status}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[11.5px] leading-relaxed text-white/35">
                Develop on localnet, review with the team on studionet, then
                hold real trials on Asimov — same contract, same verdict
                loop at every stage.
              </p>

              {/* MetaMask setup */}
              <div className="mt-5 rounded-xl border border-gilt-400/25 bg-gilt-400/[0.05] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Wallet className="h-4 w-4 text-gilt-300" />
                    <p className="text-[12.5px] font-semibold text-white">MetaMask × Studionet</p>
                  </div>
                  <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-gilt-300/80">id · 61999</span>
                </div>
                <p className="mt-2 font-mono text-[10px] leading-relaxed text-white/40">
                  {STUDIONET.rpcUrl} · {STUDIONET.symbol}
                </p>
                {w.address && w.isStudionet ? (
                  <p className="mt-3 flex items-center gap-2 rounded-lg border border-aqua-400/30 bg-aqua-400/[0.07] px-3.5 py-2.5 font-mono text-[10.5px] text-aqua-300">
                    <CheckCircle2 className="h-3.5 w-3.5" /> wallet ready — {w.balance ?? "…"} GEN
                  </p>
                ) : (
                  <button
                    onClick={w.address ? w.addOrSwitchStudionet : w.connect}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-gilt-400 px-4 py-2.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-950 transition-all hover:bg-gilt-300"
                  >
                    <PlugZap className="h-3.5 w-3.5" />
                    {w.address ? "Add / switch to Studionet" : "Connect & add Studionet"}
                  </button>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="glass rounded-2xl p-6"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">Resources</p>
              <div className="mt-4 space-y-1">
                {LINKS.map((l) => (
                  <a
                    key={l.label}
                    href={`https://${l.label}`}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center justify-between rounded-xl px-3 py-3 transition-colors hover:bg-white/[0.04]"
                  >
                    <div className="flex items-center gap-3">
                      <l.icon className="h-4 w-4 text-iris-300" strokeWidth={1.6} />
                      <div>
                        <p className="font-mono text-[12px] text-white/80 group-hover:text-gilt-200">{l.label}</p>
                        <p className="text-[11px] text-white/35">{l.sub}</p>
                      </div>
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-white/25 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-gilt-300" />
                  </a>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
