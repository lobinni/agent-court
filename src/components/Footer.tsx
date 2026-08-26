import { Scale, GitFork, BookOpenText, MonitorDot, ArrowUpRight } from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/[0.06]">
      {/* CTA band */}
      <div className="relative mx-auto max-w-7xl px-5 py-24 text-center md:px-8">
        <div className="absolute left-1/2 top-1/2 h-[300px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(228,186,100,0.08),transparent_65%)] blur-3xl" />
        <div className="relative">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-gilt-400/40 bg-gilt-400/10 text-gilt-300 shadow-[0_0_50px_rgba(228,186,100,0.2)]">
            <Scale className="h-6 w-6" strokeWidth={1.5} />
          </span>
          <h2 className="mx-auto mt-8 max-w-3xl text-[clamp(2rem,5vw,3.8rem)] font-medium leading-[1.05] tracking-[-0.03em] text-white">
            The agent economy needs a jurisdiction.{" "}
            <span className="font-serif italic text-gilt-300">Build it with us.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[14px] leading-relaxed text-white/45">
            Fork the court, write your own verdict criteria, and put your
            agents under real contract law — machine-speed, machine-fair.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#contract"
              className="inline-flex items-center gap-2.5 rounded-full bg-gilt-400 px-7 py-3.5 text-sm font-semibold text-ink-950 shadow-[0_0_50px_rgba(228,186,100,0.3)] transition-all hover:bg-gilt-300"
            >
              <GitFork className="h-4 w-4" />
              Fork the repository
            </a>
            <a
              href="https://docs.genlayer.com"
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-2 rounded-full border border-white/12 px-7 py-3.5 text-sm font-medium text-white/70 transition-all hover:border-white/30 hover:text-white"
            >
              <BookOpenText className="h-4 w-4 text-iris-300" />
              GenLayer docs
              <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-all group-hover:opacity-100" />
            </a>
          </div>
        </div>
      </div>

      {/* bottom */}
      <div className="border-t border-white/[0.06] bg-ink-950/80">
        <div className="relative mx-auto max-w-7xl px-5 pb-10 pt-12 md:px-8">
          <p className="text-outline select-none text-center font-sans text-[clamp(3rem,11vw,9rem)] font-bold leading-none tracking-tight">
            AGENTCOURT
          </p>

          <div className="mt-10 flex flex-col items-center justify-between gap-6 border-t border-white/[0.06] pt-8 md:flex-row">
            <div className="flex items-center gap-2.5">
              <Scale className="h-4 w-4 text-gilt-400" />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
                AgentCourt — a builders sample for GenLayer
              </span>
            </div>
            <div className="flex items-center gap-6 font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">
              <a href="https://docs.genlayer.com" target="_blank" rel="noreferrer" className="transition-colors hover:text-gilt-300">Docs</a>
              <a href="https://studio.genlayer.com" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 transition-colors hover:text-gilt-300">
                <MonitorDot className="h-3 w-3" /> Studio
              </a>
              <a href="https://portal.genlayer.foundation/builders/resources" target="_blank" rel="noreferrer" className="transition-colors hover:text-gilt-300">Builders portal</a>
            </div>
            <p className="font-mono text-[10px] tracking-[0.1em] text-white/25">
              © 2026 · docket simulated · no agents were harmed
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
