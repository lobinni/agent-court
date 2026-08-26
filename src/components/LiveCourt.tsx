import { useCallback, useEffect, useRef, useState } from "react";
import { useWallet } from "../lib/WalletContext";
import {
  STUDIONET,
  CONSENSUS_STAGES,
  stageIndex,
  readClient,
  signerClient,
  trackTx,
  getCourtAddress,
  setCourtAddress,
  clearCourtAddress,
  shortAddr,
  shortHash,
  isValidAddress,
  parseVerdict,
  type OnchainDispute,
  type GlClient,
} from "../lib/genlayer";
import { fetchTextAsset } from "../lib/contractSource";
import { formatEther, parseEther } from "viem";
import {
  Wallet,
  Rocket,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  LoaderCircle,
  Gavel,
  TriangleAlert,
  Landmark,
  ScrollText,
  CircleDollarSign,
  ShieldCheck,
  Unplug,
  Link2,
  Bot,
  FilePlus2,
  X,
} from "lucide-react";

/* ── types ── */

interface Feed {
  id: number;
  text: string;
  tone: "ok" | "err" | "info" | "hash";
}

interface ActiveTx {
  hash: string;
  label: string;
  stage: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const gl = (c: GlClient) => c as any;

const STATUS_STYLE: Record<string, string> = {
  OPEN: "border-white/20 bg-white/[0.04] text-white/50",
  EVIDENCE: "border-iris-400/40 bg-iris-500/10 text-iris-300",
  ADJUDGED: "border-gilt-400/40 bg-gilt-400/10 text-gilt-300",
  FINAL: "border-aqua-400/40 bg-aqua-400/10 text-aqua-300",
};

const VERDICT_STYLE: Record<string, string> = {
  PLAINTIFF_WINS: "text-gilt-300 border-gilt-400/50",
  DEFENDANT_WINS: "text-aqua-300 border-aqua-400/50",
  SPLIT: "text-iris-300 border-iris-400/50",
};

const fmtGen = (wei: string) => {
  try {
    const n = Number.parseFloat(formatEther(BigInt(wei)));
    return n.toLocaleString("en-US", { maximumFractionDigits: n < 10 ? 4 : 2 });
  } catch {
    return wei;
  }
};

/* ── small pieces ── */

function Gate({ icon: Icon, title, body, children }: {
  icon: React.ElementType;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="grid place-items-center px-6 py-16 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-gilt-400/30 bg-gilt-400/[0.08] text-gilt-300 shadow-[0_0_50px_rgba(228,186,100,0.15)]">
          <Icon className="h-7 w-7" strokeWidth={1.4} />
        </span>
        <h3 className="mt-6 text-xl font-semibold text-white">{title}</h3>
        <p className="mt-2.5 text-[13px] leading-relaxed text-white/50">{body}</p>
        {children}
      </div>
    </div>
  );
}

function Tracker({ tx }: { tx: ActiveTx }) {
  const idx = stageIndex(tx.stage);
  return (
    <div className="rounded-2xl border border-iris-400/25 bg-iris-500/[0.06] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-iris-300">
          Optimistic Democracy · {tx.label}
        </p>
        <code className="font-mono text-[10px] text-white/40">{shortHash(tx.hash)}</code>
      </div>
      <div className="mt-4 flex items-center">
        {CONSENSUS_STAGES.map((s, i) => (
          <div key={s.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={`grid h-6 w-6 place-items-center rounded-full border font-mono text-[8px] transition-all duration-500 ${
                  i < idx
                    ? "border-gilt-400/60 bg-gilt-400/20 text-gilt-300"
                    : i === idx
                      ? "border-iris-400 bg-iris-500/25 text-iris-200 shadow-[0_0_16px_rgba(132,100,247,0.5)]"
                      : "border-white/10 bg-white/[0.02] text-white/25"
                }`}
              >
                {i === idx ? <LoaderCircle className="h-3 w-3 animate-spin" /> : i + 1}
              </span>
              <span className={`whitespace-nowrap font-mono text-[7.5px] uppercase tracking-[0.12em] ${i <= idx ? "text-white/70" : "text-white/25"}`}>
                {s.label}
              </span>
            </div>
            {i < CONSENSUS_STAGES.length - 1 && (
              <div className={`mx-1 mb-4 h-px flex-1 transition-colors duration-500 ${i < idx ? "bg-gilt-400/50" : "bg-white/10"}`} />
            )}
          </div>
        ))}
      </div>
      <p className="mt-2 text-center font-mono text-[10px] text-white/40">
        {CONSENSUS_STAGES[Math.min(idx, CONSENSUS_STAGES.length - 1)].hint}…
      </p>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-white/10 bg-ink-900/80 px-3.5 py-2.5 font-mono text-[12px] text-white/80 placeholder:text-white/25 outline-none transition-colors focus:border-gilt-400/50";

const labelCls = "mb-1.5 block font-mono text-[9px] uppercase tracking-[0.18em] text-white/35";

/* ── main ── */

export default function LiveCourt() {
  const w = useWallet();

  const [court, setCourt] = useState<string>(() => getCourtAddress());
  const [attach, setAttach] = useState("");
  const [disputes, setDisputes] = useState<OnchainDispute[]>([]);
  const [filingFee, setFilingFee] = useState<string | null>(null);
  const [appealBond, setAppealBond] = useState<bigint | null>(null);
  const [contractVersion, setContractVersion] = useState<string | null>(null);
  const [loadingDocket, setLoadingDocket] = useState(false);
  const [tx, setTx] = useState<ActiveTx | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [feed, setFeed] = useState<Feed[]>([]);
  const [copied, setCopied] = useState(false);

  // filing form
  const [specUrl, setSpecUrl] = useState("");
  const [defendant, setDefendant] = useState("");
  const [escrow, setEscrow] = useState("850");
  // delivery forms (per dispute id)
  const [delivery, setDelivery] = useState<Record<number, { url: string; notes: string }>>({});

  const feedId = useRef(0);
  const feedRef = useRef<HTMLDivElement>(null);

  const log = useCallback((text: string, tone: Feed["tone"] = "info") => {
    feedId.current += 1;
    setFeed((f) => [...f.slice(-39), { id: feedId.current, text, tone }]);
  }, []);

  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [feed]);

  /* ── reads ── */

  const loadDocket = useCallback(
    async (addr?: string) => {
      const target = (addr ?? court).trim();
      if (!isValidAddress(target)) return;
      setLoadingDocket(true);
      try {
        const c = gl(readClient());
        const rawIds = await c.readContract({ address: target, functionName: "docket", args: [], stateStatus: "accepted" });
        const ids: number[] = JSON.parse(String(rawIds));
        const all: OnchainDispute[] = [];
        for (const id of ids) {
          const raw = await c.readContract({ address: target, functionName: "get_dispute", args: [id], stateStatus: "accepted" });
          const d = JSON.parse(String(raw)) as OnchainDispute;
          // Normalize party addresses — the contract stores Address.__str__
          // (checksummed) while the wallet address is lowercase; comparisons
          // must happen on likewise-normalized strings.
          d.plaintiff = d.plaintiff.toLowerCase();
          d.defendant = d.defendant.toLowerCase();
          all.push(d);
        }
        setDisputes(all.reverse());
        try {
          const info = await c.readContract({ address: target, functionName: "court_info", args: [], stateStatus: "accepted" });
          const parsed = JSON.parse(String(info));
          setFilingFee(fmtGen(String(parsed.filing_fee ?? "0")));
          setAppealBond(BigInt(String(parsed.appeal_bond ?? "0")));
          const version = typeof parsed.version === "string" ? parsed.version : "legacy";
          setContractVersion(version);
          if (version === "legacy") {
            log("legacy court detected — deploy v1.1.0 before convening a live trial", "err");
          }
        } catch {
          setFilingFee(null);
          setAppealBond(null);
          setContractVersion(null);
        }
        log(`docket loaded — ${ids.length} case${ids.length === 1 ? "" : "s"} on record`, "ok");
      } catch (e) {
        log(`docket read failed — ${e instanceof Error ? e.message : String(e)}`, "err");
      } finally {
        setLoadingDocket(false);
      }
    },
    [court, log],
  );

  useEffect(() => {
    if (court && w.address && w.isStudionet) loadDocket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [court, w.address, w.isStudionet]);

  /* ── write pipeline ── */

  const runTx = useCallback(
    async (
      label: string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fire: (client: any) => Promise<`0x${string}`>,
      after?: (receipt?: unknown) => void,
    ) => {
      if (!w.address || !w.isStudionet || busy) return;
      setBusy(label);
      try {
        const client = signerClient(w.address);
        log(`signing ${label} — confirm in MetaMask…`);
        const hash = await fire(gl(client));
        log(`tx submitted ${shortHash(hash)} — consensus started`, "hash");
        setTx({ hash, label, stage: "PENDING" });
        const receipt = await trackTx(client, hash, (s) => setTx((t) => (t ? { ...t, stage: s } : t)));
        log(`✓ ${label} — accepted by the jury`, "ok");
        setTx(null);
        after?.(receipt);
        await loadDocket();
        w.refreshBalance();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        log(`✗ ${label} failed — ${msg}`, "err");
        setTx(null);
      } finally {
        setBusy(null);
      }
    },
    [w, busy, loadDocket, log],
  );

  /* ── actions ── */

  const deployCourt = useCallback(async () => {
    if (!w.address || !w.isStudionet || busy) return;
    setBusy("deploy");
    try {
      const client = gl(signerClient(w.address));
      log("resolving consensus + ghost contracts…");
      await client.initializeConsensusSmartContract();
      log("signing deploy — confirm in MetaMask…");
      const code = (await fetchTextAsset("contracts/agent_court.py")) ?? "";
      if (!code) throw new Error("could not load the contract source");
      const hash: `0x${string}` = await client.deployContract({ code, args: [], leaderOnly: false });
      log(`tx submitted ${shortHash(hash)} — deploying agent_court.py`, "hash");
      setTx({ hash, label: "Deploy court", stage: "PENDING" });
      const receipt = await trackTx(client, hash, (s) => setTx((t) => (t ? { ...t, stage: s } : t)));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r: any = receipt;
      const addr: string = r?.data?.contract_address ?? r?.contract_address ?? "";
      if (addr) {
        setCourtAddress(addr);
        setCourt(addr);
        log(`✓ AgentCourt deployed at ${shortAddr(addr)} — saved as your court`, "ok");
      } else {
        log("✓ deploy accepted — open the tx in Studio to copy the contract address", "ok");
      }
      setTx(null);
    } catch (e) {
      log(`✗ deploy failed — ${e instanceof Error ? e.message : String(e)}`, "err");
      setTx(null);
    } finally {
      setBusy(null);
    }
  }, [w, busy, log]);

  const attachCourt = useCallback(() => {
    if (!isValidAddress(attach)) {
      log("invalid address — expected 0x + 40 hex chars", "err");
      return;
    }
    setCourtAddress(attach);
    setCourt(attach.trim());
    log(`attached court ${shortAddr(attach)}`, "ok");
  }, [attach, log]);

  const fileDispute = useCallback(() => {
    if (!isValidAddress(defendant)) return log("defendant must be a 0x…40hex address", "err");
    if (!specUrl.trim()) return log("task spec URL required", "err");
    if (!specUrl.trim().startsWith("https://")) {
      return log("task spec must be a public HTTPS URL — use a raw GitHub/Gist link, not ipfs:// or localhost", "err");
    }
    let value: bigint;
    try {
      value = parseEther(escrow);
    } catch {
      return log("escrow must be a number of GEN", "err");
    }
    if (value <= 0n) return log("escrow must be non-zero", "err");
    runTx("file_dispute", (c) =>
      c.writeContract({ address: court, functionName: "file_dispute", args: [specUrl.trim(), defendant.trim()], value }),
    );
  }, [court, specUrl, defendant, escrow, runTx, log]);

  const submitDelivery = useCallback(
    (id: number) => {
      const d = delivery[id];
      if (!d?.url?.trim()) return log("delivery URL required", "err");
      if (!d.url.trim().startsWith("https://")) {
        return log("delivery must be a public HTTPS URL — validators cannot access localhost, private hosts or ipfs://", "err");
      }
      runTx(`submit_delivery #${id}`, (c) =>
        c.writeContract({ address: court, functionName: "submit_delivery", args: [id, d.url.trim(), d.notes ?? ""] }),
      );
    },
    [court, delivery, runTx, log],
  );

  const convene = useCallback(
    (id: number) => {
      runTx(`convene_trial #${id}`, (c) => c.writeContract({ address: court, functionName: "convene_trial", args: [id] }));
    },
    [court, runTx],
  );

  const appealCase = useCallback(
    (id: number) => {
      const bond = appealBond && appealBond > 0n ? appealBond : parseEther("50");
      runTx(`appeal #${id}`, (c) =>
        c.writeContract({ address: court, functionName: "appeal", args: [id], value: bond }),
      );
    },
    [court, runTx, appealBond],
  );

  const cancelCase = useCallback(
    (id: number) => {
      runTx(`cancel_dispute #${id}`, (c) =>
        c.writeContract({ address: court, functionName: "cancel_dispute", args: [id] }),
      );
    },
    [court, runTx],
  );

  const finalizeCase = useCallback(
    (id: number) => {
      runTx(`finalize #${id}`, (c) => c.writeContract({ address: court, functionName: "finalize", args: [id] }));
    },
    [court, runTx],
  );

  /* ── gates ── */

  let body: React.ReactNode;

  if (!w.hasWallet) {
    body = (
      <Gate
        icon={Wallet}
        title="MetaMask required for the live court"
        body="The bench on Studionet is real: real escrow, real validators, real verdicts. Install MetaMask, then connect and add the GenLayer Studionet network."
      >
        <a
          href="https://metamask.io/download"
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-gilt-400 px-6 py-3 text-sm font-semibold text-ink-950 transition-colors hover:bg-gilt-300"
        >
          Install MetaMask <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </Gate>
    );
  } else if (!w.address) {
    body = (
      <Gate
        icon={Unplug}
        title="Connect to enter the live court"
        body="File real disputes, lock GEN escrow, convene the LLM jury and settle on-chain — every action below is an actual Studionet transaction signed by your wallet."
      >
        <button
          onClick={w.connect}
          disabled={w.connecting}
          className="mt-6 inline-flex items-center gap-2.5 rounded-full bg-gilt-400 px-6 py-3 text-sm font-semibold text-ink-950 transition-all hover:bg-gilt-300 disabled:opacity-50"
        >
          <Wallet className="h-4 w-4" /> {w.connecting ? "Opening MetaMask…" : "Connect MetaMask"}
        </button>
        {w.error && <p className="mt-3 font-mono text-[11px] text-ember-400">{w.error}</p>}
      </Gate>
    );
  } else if (!w.isStudionet) {
    body = (
      <Gate
        icon={TriangleAlert}
        title="Wrong network — the court sits on Studionet"
        body="Add the hosted GenLayer development network. One click adds it to MetaMask and switches over."
      >
        <div className="mx-auto mt-5 max-w-xs overflow-hidden rounded-xl border border-white/10 text-left font-mono text-[11px]">
          {[
            ["Network", STUDIONET.name],
            ["RPC URL", STUDIONET.rpcUrl],
            ["Chain ID", String(STUDIONET.chainId)],
            ["Currency", STUDIONET.symbol],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 border-b border-white/[0.06] px-3.5 py-2 last:border-0">
              <span className="text-white/35">{k}</span>
              <span className="truncate text-white/75">{v}</span>
            </div>
          ))}
        </div>
        <button
          onClick={w.addOrSwitchStudionet}
          className="mt-5 inline-flex items-center gap-2.5 rounded-full bg-gilt-400 px-6 py-3 text-sm font-semibold text-ink-950 transition-all hover:bg-gilt-300"
        >
          <Link2 className="h-4 w-4" /> Add / switch to Studionet
        </button>
        {w.error && <p className="mt-3 font-mono text-[11px] text-ember-400">{w.error}</p>}
      </Gate>
    );
  } else if (!court) {
    body = (
      <div className="grid gap-6 p-6 md:grid-cols-2 md:p-10">
        {/* deploy */}
        <div className="flex flex-col justify-between rounded-2xl border border-gilt-400/25 bg-gradient-to-br from-gilt-400/[0.08] to-transparent p-6">
          <div>
            <div className="flex items-center gap-2.5">
              <Rocket className="h-4.5 w-4.5 text-gilt-300" />
              <h3 className="text-[15px] font-semibold text-white">Deploy your own court</h3>
            </div>
            <p className="mt-2.5 text-[12.5px] leading-relaxed text-white/50">
              One click ships <code className="font-mono text-gilt-200/90">agent_court.py</code> — the
              exact contract shown in §04 — from your wallet. ~45s of consensus
              and it becomes your jurisdiction.
            </p>
            {tx && <div className="mt-4"><Tracker tx={tx} /></div>}
          </div>
          <button
            onClick={deployCourt}
            disabled={!!busy}
            className="mt-5 inline-flex items-center justify-center gap-2.5 rounded-xl bg-gilt-400 px-5 py-3 text-sm font-semibold text-ink-950 transition-all hover:bg-gilt-300 disabled:opacity-50"
          >
            {busy === "deploy" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            Deploy AgentCourt to Studionet
          </button>
        </div>

        {/* attach */}
        <div className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-ink-900/50 p-6">
          <div>
            <div className="flex items-center gap-2.5">
              <Landmark className="h-4.5 w-4.5 text-iris-300" />
              <h3 className="text-[15px] font-semibold text-white">Attach an existing court</h3>
            </div>
            <p className="mt-2.5 text-[12.5px] leading-relaxed text-white/50">
              Already deployed via Studio or CLI? Paste the contract address to
              load its docket and rule over it here.
            </p>
            <div className="mt-4">
              <label className={labelCls}>Court contract address</label>
              <input
                value={attach}
                onChange={(e) => setAttach(e.target.value)}
                placeholder="0x…"
                className={inputCls}
                spellCheck={false}
              />
            </div>
          </div>
          <button
            onClick={attachCourt}
            className="mt-5 inline-flex items-center justify-center gap-2.5 rounded-xl border border-iris-400/50 bg-iris-500/10 px-5 py-3 text-sm font-semibold text-iris-200 transition-all hover:bg-iris-500/20"
          >
            <Landmark className="h-4 w-4" /> Attach & load docket
          </button>
        </div>
      </div>
    );
  } else {
    /* ── dashboard ── */
    body = (
      <div className="grid gap-0 lg:grid-cols-12">
        {/* left: court + filing */}
        <div className="border-b border-white/[0.07] lg:col-span-4 lg:border-b-0 lg:border-r">
          <div className="border-b border-white/[0.07] p-5">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">
                <Landmark className="h-3 w-3 text-gilt-400" /> Your court
              </p>
              <button
                onClick={() => {
                  clearCourtAddress();
                  setCourt("");
                  setDisputes([]);
                }}
                className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/30 transition-colors hover:text-ember-400"
              >
                detach
              </button>
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg border border-white/10 bg-ink-900/80 px-3 py-2 font-mono text-[11px] text-gilt-200/90">
                {court}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(court).catch(() => {});
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1200);
                }}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 text-white/50 transition-colors hover:border-gilt-400/40 hover:text-gilt-300"
                aria-label="Copy address"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-aqua-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between font-mono text-[10px] text-white/40">
              <span>
                {disputes.length} case{disputes.length === 1 ? "" : "s"} on docket
                {filingFee && <span className="text-white/25"> · fee {filingFee} GEN</span>}
                {contractVersion && <span className={contractVersion === "legacy" ? "text-ember-400" : "text-aqua-300/60"}> · {contractVersion === "legacy" ? "legacy contract" : `v${contractVersion}`}</span>}
              </span>
              <button
                onClick={() => loadDocket()}
                className="flex items-center gap-1.5 text-white/50 transition-colors hover:text-aqua-300"
              >
                <RefreshCw className={`h-3 w-3 ${loadingDocket ? "animate-spin" : ""}`} /> refresh
              </button>
            </div>
          </div>

          {/* filing form */}
          <div className="p-5">
            <p className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">
              <FilePlus2 className="h-3 w-3 text-gilt-400" /> File a dispute · as plaintiff
            </p>
            <div className="mt-4 space-y-3.5">
              <div>
                <label className={labelCls}>Task spec URL (attested)</label>
                <input
                  value={specUrl}
                  onChange={(e) => setSpecUrl(e.target.value)}
                  placeholder="https://raw.githubusercontent.com/…/task_spec.md"
                  className={inputCls}
                  spellCheck={false}
                />
                <p className="mt-1.5 font-mono text-[8.5px] leading-relaxed text-white/25">
                  Public HTTPS only · use a raw GitHub/Gist or HTTPS gateway URL
                </p>
              </div>
              <div>
                <label className={labelCls}>Defendant address</label>
                <input
                  value={defendant}
                  onChange={(e) => setDefendant(e.target.value)}
                  placeholder="0x…"
                  className={inputCls}
                  spellCheck={false}
                />
              </div>
              <div>
                <label className={labelCls}>Escrow at stake · GEN</label>
                <input
                  value={escrow}
                  onChange={(e) => setEscrow(e.target.value)}
                  inputMode="decimal"
                  className={inputCls}
                  spellCheck={false}
                />
              </div>
              <button
                onClick={fileDispute}
                disabled={!!busy}
                className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-gilt-400 px-5 py-3 text-sm font-semibold text-ink-950 transition-all hover:bg-gilt-300 disabled:opacity-50"
              >
                {busy === "file_dispute" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Gavel className="h-4 w-4" />}
                Lock escrow & open case
              </button>
              <p className="font-mono text-[9.5px] leading-relaxed text-white/25">
                escrow = msg.value, locked in one payable call · filing fee 25 GEN on appeal
              </p>
            </div>
          </div>
        </div>

        {/* right: tracker + docket + feed */}
        <div className="flex flex-col lg:col-span-8">
          {tx && <div className="border-b border-white/[0.07] p-5"><Tracker tx={tx} /></div>}

          <div className="flex-1 space-y-4 p-5">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">
                <ScrollText className="h-3 w-3" /> On-chain docket
              </p>
              {w.balance !== null && (
                <span className="flex items-center gap-1.5 font-mono text-[10px] text-white/40">
                  <CircleDollarSign className="h-3 w-3 text-aqua-300" /> {w.balance} GEN
                  <a href={STUDIONET.studio} target="_blank" rel="noreferrer" className="text-aqua-300/70 underline-offset-2 hover:underline" title="Studionet faucet lives inside Studio — account selector 💧">
                    get GEN 💧
                  </a>
                </span>
              )}
            </div>

            {disputes.length === 0 && !loadingDocket && (
              <div className="grid place-items-center rounded-2xl border border-dashed border-white/10 py-12">
                <p className="font-mono text-[11px] text-white/25">
                  the docket is empty — file the first dispute on the left
                </p>
              </div>
            )}
            {loadingDocket && disputes.length === 0 && (
              <div className="grid place-items-center py-12">
                <LoaderCircle className="h-5 w-5 animate-spin text-gilt-400" />
              </div>
            )}

            {disputes.map((d) => {
              const v = parseVerdict(d.verdict);
              const me = w.address?.toLowerCase();
              const isParty = me === d.plaintiff || me === d.defendant;
              const dv = delivery[d.id] ?? { url: "", notes: "" };
              return (
                <div key={d.id} className="rounded-2xl border border-white/[0.08] bg-ink-900/50 p-5">
                  {/* header */}
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-[13px] font-semibold text-white">Case #{d.id}</span>
                    <span className={`rounded-full border px-2.5 py-1 font-mono text-[8.5px] uppercase tracking-[0.16em] ${STATUS_STYLE[d.status] ?? STATUS_STYLE.OPEN}`}>
                      {d.status}
                    </span>
                    {d.appeals > 0 && (
                      <span className="rounded-full border border-ember-500/40 bg-ember-500/10 px-2.5 py-1 font-mono text-[8.5px] uppercase tracking-[0.16em] text-ember-400">
                        appeals ×{d.appeals}
                      </span>
                    )}
                    <span className="ml-auto flex items-center gap-1.5 font-mono text-[10.5px] text-gilt-300/90">
                      <CircleDollarSign className="h-3.5 w-3.5" /> {fmtGen(d.escrow)} GEN escrow
                    </span>
                  </div>

                  {/* parties */}
                  <div className="mt-3 grid gap-1.5 font-mono text-[10.5px] sm:grid-cols-2">
                    <p className="truncate text-white/50">
                      <span className="text-gilt-300/80">plaintiff </span>
                      {d.plaintiff}
                      {me === d.plaintiff && <span className="ml-1.5 rounded bg-gilt-400/15 px-1.5 py-0.5 text-[8px] uppercase tracking-[0.1em] text-gilt-300">you</span>}
                    </p>
                    <p className="truncate text-white/50">
                      <span className="text-aqua-300/80">defendant </span>
                      {d.defendant}
                      {me === d.defendant && <span className="ml-1.5 rounded bg-aqua-400/15 px-1.5 py-0.5 text-[8px] uppercase tracking-[0.1em] text-aqua-300">you</span>}
                    </p>
                  </div>

                  {/* links */}
                  <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px]">
                    <a href={d.task_spec_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-white/40 transition-colors hover:text-gilt-300">
                      <ExternalLink className="h-2.5 w-2.5" /> task spec
                    </a>
                    {d.delivery_url && (
                      <a href={d.delivery_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-white/40 transition-colors hover:text-aqua-300">
                        <ExternalLink className="h-2.5 w-2.5" /> delivered work
                      </a>
                    )}
                  </div>

                  {/* verdict */}
                  {v && (
                    <div className="mt-4 rounded-xl border border-white/[0.08] bg-ink-950/60 p-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={`rounded-md border-2 px-3 py-1.5 font-mono text-[12px] font-bold tracking-[0.1em] ${VERDICT_STYLE[v.verdict] ?? "text-white border-white/40"}`}>
                          {v.verdict === "SPLIT" ? `SPLIT ${v.plaintiff_share}/${100 - v.plaintiff_share}` : v.verdict.replace("_", " ")}
                        </span>
                        <div className="flex h-1.5 min-w-32 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                          <div className="bg-gradient-to-r from-gilt-500 to-gilt-300" style={{ width: `${v.plaintiff_share}%` }} />
                        </div>
                        <span className="font-mono text-[9px] text-white/40">
                          {v.plaintiff_share}% P / {100 - v.plaintiff_share}% D
                        </span>
                      </div>
                      {v.rationale && (
                        <p className="mt-3 border-l-2 border-gilt-400/30 pl-3 font-serif text-[13.5px] italic leading-relaxed text-white/60">
                          “{v.rationale}”
                        </p>
                      )}
                      {d.settlement && (
                        <p className="mt-2.5 font-mono text-[10px] text-aqua-300/80">
                          settled → {fmtGen(d.settlement.plaintiff_award)} GEN to plaintiff · {fmtGen(d.settlement.defendant_award)} GEN to defendant
                        </p>
                      )}
                    </div>
                  )}

                  {/* actions */}
                  <div className="mt-4">
                    {d.status === "OPEN" && (
                      me === d.defendant ? (
                        <div className="space-y-2.5 rounded-xl border border-dashed border-aqua-400/25 bg-aqua-400/[0.03] p-4">
                          <p className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-aqua-300/80">
                            <Bot className="h-3 w-3" /> you are the defendant — pin your delivery
                          </p>
                          <input
                            value={dv.url}
                            onChange={(e) => setDelivery((m) => ({ ...m, [d.id]: { ...dv, url: e.target.value } }))}
                            placeholder="https://raw.githubusercontent.com/…/delivery.md"
                            className={inputCls}
                            spellCheck={false}
                          />
                          <input
                            value={dv.notes}
                            onChange={(e) => setDelivery((m) => ({ ...m, [d.id]: { ...dv, notes: e.target.value } }))}
                            placeholder="delivery notes (optional)"
                            className={inputCls}
                            spellCheck={false}
                          />
                          <button
                            onClick={() => submitDelivery(d.id)}
                            disabled={!!busy}
                            className="inline-flex items-center gap-2 rounded-lg border border-aqua-400/50 bg-aqua-400/10 px-4 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-aqua-200 transition-all hover:bg-aqua-400/20 disabled:opacity-50"
                          >
                            {busy === `submit_delivery #${d.id}` ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <ScrollText className="h-3.5 w-3.5" />}
                            Submit delivery
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="flex-1 rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3 font-mono text-[10.5px] leading-relaxed text-white/35">
                            awaiting delivery — switch to the defendant account
                            <span className="text-aqua-300/70"> {shortAddr(d.defendant)} </span>
                            to pin the delivered work here
                          </p>
                          {me === d.plaintiff && (
                            <button
                              onClick={() => cancelCase(d.id)}
                              disabled={!!busy}
                              className="inline-flex items-center gap-2 rounded-lg border border-ember-500/40 bg-ember-500/10 px-4 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-ember-400 transition-all hover:bg-ember-500/20 disabled:opacity-50"
                            >
                              {busy === `cancel_dispute #${d.id}` ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                              Cancel · refund escrow
                            </button>
                          )}
                        </div>
                      )
                    )}

                    {d.status === "EVIDENCE" && (
                      <button
                        onClick={() => convene(d.id)}
                        disabled={!!busy || contractVersion === "legacy"}
                        className="inline-flex items-center gap-2.5 rounded-xl bg-gilt-400 px-5 py-3 text-sm font-semibold text-ink-950 shadow-[0_0_30px_rgba(228,186,100,0.25)] transition-all hover:bg-gilt-300 disabled:opacity-50"
                      >
                        {busy === `convene_trial #${d.id}` ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Gavel className="h-4 w-4" />}
                        {contractVersion === "legacy" ? "Redeploy v1.1.0 to convene" : "Convene the trial — jury reasons live"}
                      </button>
                    )}

                    {d.status === "ADJUDGED" && (
                      <div className="flex flex-wrap gap-2.5">
                        {isParty && d.appeals < 2 && (
                          <button
                            onClick={() => appealCase(d.id)}
                            disabled={!!busy}
                            className="inline-flex items-center gap-2 rounded-lg border border-iris-400/50 bg-iris-500/10 px-4 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-iris-200 transition-all hover:bg-iris-500/20 disabled:opacity-50"
                          >
                            {busy === `appeal #${d.id}` ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                            Appeal · {appealBond ? fmtGen(appealBond.toString()) : "50"} GEN bond
                          </button>
                        )}
                        <button
                          onClick={() => finalizeCase(d.id)}
                          disabled={!!busy}
                          className="inline-flex items-center gap-2 rounded-lg bg-gilt-400 px-4 py-2.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-950 transition-all hover:bg-gilt-300 disabled:opacity-50"
                        >
                          {busy === `finalize #${d.id}` ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <CircleDollarSign className="h-3.5 w-3.5" />}
                          Finalize & settle escrow
                        </button>
                      </div>
                    )}

                    {d.status === "FINAL" && (
                      <p className="flex items-center gap-2 font-mono text-[10.5px] text-aqua-300/70">
                        <Check className="h-3.5 w-3.5" /> case closed — escrow settled by the ghost contract
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* feed */}
          <div className="border-t border-white/[0.07]">
            <div className="flex items-center justify-between px-5 pt-3">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">session log</span>
              <span className="font-mono text-[9px] text-white/20">studionet · id 61999</span>
            </div>
            <div ref={feedRef} className="h-28 space-y-1 overflow-y-auto px-5 py-3 [scrollbar-width:thin]">
              {feed.length === 0 && <p className="font-mono text-[10.5px] text-white/20">» actions and consensus events appear here…</p>}
              {feed.map((l) => (
                <p
                  key={l.id}
                  className={`font-mono text-[10.5px] leading-relaxed ${
                    l.tone === "err" ? "text-ember-400" : l.tone === "ok" ? "text-aqua-300/90" : l.tone === "hash" ? "text-iris-300/90" : "text-white/45"
                  }`}
                >
                  » {l.text}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass mt-6 overflow-hidden rounded-3xl">
      {/* live header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="relative flex h-2 w-2">
            <span className="absolute h-full w-full animate-ping rounded-full bg-aqua-400 opacity-60" />
            <span className="relative h-2 w-2 rounded-full bg-aqua-400" />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/60">
            Live mode · GenLayer Studionet
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[9px] tracking-[0.14em] text-white/40">
            chain 61999
          </span>
        </div>
        {w.address && (
          <span className="font-mono text-[10px] text-white/40">
            bench: <span className="text-white/70">{shortAddr(w.address)}</span>
          </span>
        )}
      </div>
      {body}
    </div>
  );
}
