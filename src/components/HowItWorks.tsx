import { useEffect, useRef, useState } from "react";
import { fetchCircuitSource } from "../lib/contractSource";
import { Snippet } from "./Snippet";
import { Scale, Database, Eye, Cpu, Landmark, ArrowRight } from "lucide-react";

const FALLBACK = `@gl.public.write
def convene_trial(self, dispute_id: u256) -> str:
    spec = gl.nondet.web.render(d["task_spec_url"], mode="text")
    verdict_json = self._jury_reason(d, spec, delivery)
    d["status"] = Status.ADJUDGED
    return verdict_json`;

const UNITS = [
  {
    icon: Scale,
    title: "Every ranking sits inside case context",
    body: "Specs, deliverables and evidence are hash-attested at filing. Nothing drifts mid-trial — the court reasons over the same record every validator saw.",
  },
  {
    icon: Database,
    title: "State that survives the jury",
    body: "Escrow, parties and verdicts live in the contract's storage root. Even a failed appeal leaves the last accepted verdict untouched.",
  },
  {
    icon: Eye,
    title: "Evidence you can replay",
    body: "The delivered work is re-rendered from the live web inside the trail itself — each validator fetches independently before voting.",
  },
  {
    icon: Cpu,
    title: "Models reach consensus",
    body: "Five LLMs disagree privately, then Optimistic Democracy keeps only outcomes inside the equivalence band. No single model can sway the bench.",
  },
  {
    icon: Landmark,
    title: "Money follows the verdict",
    body: "On finalization the escrow splits to the exact plaintiff_share — 100, 0, or 50/50 — executed by the chain's ghost contract at finality.",
  },
];

export default function HowItWorks() {
  const [source, setSource] = useState<string>(FALLBACK);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    fetchCircuitSource()
      .then((txt) => {
        if (mounted.current && txt) setSource(txt);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted.current) setLoading(false);
      });
    return () => {
      mounted.current = false;
    };
  }, []);

  // center the snippet on the convene_trial body
  const ndx = source.indexOf("def convene_trial");
  const windowStart = ndx > 420 ? ndx - 420 : 0;
  const snippet = source.slice(windowStart, windowStart + 520);
  const shown = snippet.endsWith("\n") ? snippet : snippet + "\n…";

  return (
    <section id="protocol-details" className="relative overflow-hidden py-28">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-gilt-400">§ 04 — Circuit internals</p>
        <h2 className="mt-5 max-w-3xl text-[clamp(1.9rem,4vw,3rem)] font-medium leading-[1.1] tracking-tight text-white">
          The verdict layer, <span className="font-serif italic text-gilt-300">in plain text.</span>
        </h2>

        <div className="mt-14 grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          {/* live code snippet — source of truth */}
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a13]">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3">
              <span className="font-mono text-[10px] text-white/40">
                {loading ? "loading…" : "contracts/agent_court.py · convene_trial"}
              </span>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/35 transition-colors hover:text-gilt-300"
              >
                Source <ArrowRight className="h-3 w-3" />
              </a>
            </div>
            <div className="max-h-[340px] overflow-auto p-5 [scrollbar-width:thin]">
              <Snippet code={shown} />
            </div>
          </div>

          {/* architecture cards */}
          <div className="space-y-4">
            {UNITS.map((u) => (
              <div key={u.title} className="flex gap-4 rounded-2xl border border-white/[0.07] bg-ink-900/50 p-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-gilt-400/25 bg-gilt-400/[0.07] text-gilt-300">
                  <u.icon className="h-4.5 w-4.5" strokeWidth={1.6} />
                </span>
                <div>
                  <p className="text-[14px] font-semibold text-white">{u.title}</p>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/45">{u.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
