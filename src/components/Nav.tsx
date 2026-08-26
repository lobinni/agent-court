import { useEffect, useState } from "react";
import { Scale, ArrowUpRight, Menu, X } from "lucide-react";
import WalletButton from "./WalletButton";

const LINKS = [
  { label: "Courtroom", href: "#courtroom" },
  { label: "Protocol", href: "#protocol" },
  { label: "Contract", href: "#contract" },
  { label: "Deploy", href: "#deploy" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "border-b border-white/[0.07] bg-ink-950/80 backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
        <a href="#top" className="group flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg border border-gilt-400/40 bg-gradient-to-br from-gilt-400/25 to-gilt-500/5 text-gilt-300 shadow-[0_0_24px_rgba(228,186,100,0.25)] transition-transform duration-500 group-hover:rotate-[-8deg]">
            <Scale className="h-4.5 w-4.5" strokeWidth={1.75} />
          </span>
          <span className="leading-none">
            <span className="block font-sans text-[15px] font-semibold tracking-tight text-white">
              AgentCourt
            </span>
            <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-iris-300/90">
              on GenLayer
            </span>
          </span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/50 transition-colors hover:text-gilt-300"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <WalletButton />
          <a
            href="#deploy"
            className="group hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-2 pl-4 pr-2 font-mono text-[11px] uppercase tracking-[0.14em] text-white/80 transition-all hover:border-gilt-400/50 hover:bg-gilt-400/10 hover:text-gilt-200 md:flex"
          >
            Deploy the court
            <span className="grid h-6 w-6 place-items-center rounded-full bg-gilt-400/20 text-gilt-300 transition-transform group-hover:rotate-45">
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </a>
          <button
            onClick={() => setOpen(!open)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-white/70 md:hidden"
            aria-label="Toggle menu"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-white/[0.07] bg-ink-950/95 px-5 py-4 backdrop-blur-xl md:hidden">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block py-3 font-mono text-xs uppercase tracking-[0.18em] text-white/60 hover:text-gilt-300"
            >
              {l.label}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}
