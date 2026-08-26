import { useEffect, useRef, useState } from "react";
import {
  Wallet,
  ChevronDown,
  Copy,
  Check,
  LogOut,
  Droplets,
  TriangleAlert,
} from "lucide-react";
import { useWallet } from "../lib/WalletContext";
import { shortAddr, STUDIONET } from "../lib/genlayer";

export default function WalletButton() {
  const w = useWallet();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  if (w.address && !w.isStudionet) {
    return (
      <button
        onClick={w.addOrSwitchStudionet}
        className="flex items-center gap-2 rounded-full border border-ember-500/50 bg-ember-500/10 px-4 py-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ember-400 transition-all hover:bg-ember-500/20"
      >
        <TriangleAlert className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Switch to Studionet</span>
        <span className="sm:hidden">Switch</span>
      </button>
    );
  }

  if (!w.address) {
    return (
      <button
        onClick={w.connect}
        disabled={w.connecting}
        className="flex items-center gap-2 rounded-full border border-aqua-400/40 bg-aqua-400/[0.08] px-4 py-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-aqua-300 transition-all hover:border-aqua-300 hover:bg-aqua-400/15 disabled:opacity-50"
      >
        <Wallet className="h-3.5 w-3.5" />
        {w.connecting ? "Connecting…" : "Connect"}
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 rounded-full border border-aqua-400/35 bg-aqua-400/[0.07] py-2 pl-3.5 pr-2.5 font-mono text-[10.5px] tracking-[0.06em] text-white/85 transition-all hover:border-aqua-300/60"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute h-full w-full animate-ping rounded-full bg-aqua-400 opacity-60" />
          <span className="relative h-2 w-2 rounded-full bg-aqua-400" />
        </span>
        {shortAddr(w.address)}
        {w.balance && <span className="hidden text-aqua-300/80 sm:inline">{w.balance} GEN</span>}
        <ChevronDown className={`h-3 w-3 text-white/40 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 overflow-hidden rounded-2xl border border-white/10 bg-ink-900/95 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          <div className="border-b border-white/[0.07] px-4 py-3.5">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/35">Connected</p>
            <button
              onClick={async () => {
                if (w.address) {
                  await navigator.clipboard.writeText(w.address).catch(() => {});
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1200);
                }
              }}
              className="mt-1.5 flex w-full items-center justify-between gap-2 rounded-lg bg-white/[0.03] px-2.5 py-2 font-mono text-[11px] text-white/75 transition-colors hover:bg-white/[0.06]"
            >
              {shortAddr(w.address)}
              {copied ? <Check className="h-3 w-3 text-aqua-400" /> : <Copy className="h-3 w-3 text-white/30" />}
            </button>
            <div className="mt-2.5 flex items-center justify-between font-mono text-[10px] text-white/45">
              <span>Balance</span>
              <span className="text-aqua-300">{w.balance ?? "…"} GEN</span>
            </div>
            <div className="mt-1 flex items-center justify-between font-mono text-[10px] text-white/45">
              <span>Network</span>
              <span className="text-gilt-300">Studionet · 61999</span>
            </div>
          </div>
          <a
            href={STUDIONET.studio}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2.5 px-4 py-3 text-[12px] text-white/60 transition-colors hover:bg-white/[0.04] hover:text-white"
          >
            <Droplets className="h-3.5 w-3.5 text-aqua-300" /> Get GEN — Studio 💧
            <span className="ml-auto font-mono text-[8px] uppercase tracking-[0.1em] text-white/25">studionet</span>
          </a>
          <a
            href={STUDIONET.faucet}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2.5 px-4 py-3 text-[12px] text-white/60 transition-colors hover:bg-white/[0.04] hover:text-white"
          >
            <Droplets className="h-3.5 w-3.5 text-iris-300" /> faucet.genlayer.com
            <span className="ml-auto font-mono text-[8px] uppercase tracking-[0.1em] text-white/25">asimov</span>
          </a>
          <button
            onClick={() => {
              w.disconnect();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2.5 border-t border-white/[0.05] px-4 py-3 text-[12px] text-white/60 transition-colors hover:bg-white/[0.04] hover:text-ember-400"
          >
            <LogOut className="h-3.5 w-3.5" /> Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
