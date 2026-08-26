/* ──────────────────────────────────────────────────────────────
   GenLayer network helpers — Studionet (chain id 61999)
   ────────────────────────────────────────────────────────────── */

import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

export const STUDIONET = {
  chainId: 61999,
  // 61999 = 0xF22F — MUST match the RPC's real chain id or MetaMask
  // adds a broken network and chainChanged never matches isStudionet
  chainIdHex: `0x${(61999).toString(16)}`,
  name: "GenLayer Studionet",
  rpcUrl: "https://studio.genlayer.com/api",
  symbol: "GEN",
  faucet: "https://faucet.genlayer.com",
  studio: "https://studio.genlayer.com",
  docs: "https://docs.genlayer.com",
};

export const COURT_KEY = "agentcourt:court_address";

/** Read court address: env var (build-time) → localStorage → empty */
export const getCourtAddress = (): string => {
  const env = (typeof import.meta !== "undefined" && import.meta.env?.VITE_COURT_ADDRESS) as string | undefined ?? "";
  if (env.startsWith("0x") && env.length === 42) return env;
  try { return localStorage.getItem(COURT_KEY) ?? ""; } catch { return ""; }
};
export const setCourtAddress = (a: string) => localStorage.setItem(COURT_KEY, a.trim());
export const clearCourtAddress = () => localStorage.removeItem(COURT_KEY);

/* viem-style client factories from genlayer-js */

export type GlClient = ReturnType<typeof createClient>;

/** read-only client — view calls hit the studionet RPC directly */
export const readClient = (): GlClient => createClient({ chain: studionet });

/**
 * signing client bound to MetaMask — passing an address string makes
 * genlayer-js defer all signing to the injected wallet
 */
export const signerClient = (address: string): GlClient =>
  createClient({ chain: studionet, account: address as `0x${string}` });

/* consensus lifecycle (from genlayer-js/types TransactionStatus) */
export const CONSENSUS_STAGES = [
  { key: "PENDING", label: "Pending", hint: "submitted to mempool" },
  { key: "PROPOSING", label: "Proposing", hint: "leader executes the call" },
  { key: "COMMITTING", label: "Committing", hint: "validators hash their verdicts" },
  { key: "REVEALING", label: "Revealing", hint: "equivocations checked" },
  { key: "ACCEPTED", label: "Accepted", hint: "quorum reached" },
  { key: "FINALIZED", label: "Finalized", hint: "appeal window closed" },
] as const;

export function stageIndex(status?: string): number {
  if (!status) return 0;
  const s = status.toUpperCase();
  const i = CONSENSUS_STAGES.findIndex((x) => s.startsWith(x.key));
  return i >= 0 ? i : 0;
}

export const isTerminal = (s?: string) =>
  !!s && /^(ACCEPTED|FINALIZED)/.test(s.toUpperCase());

export const isFailed = (s?: string) =>
  !!s && /^(CANCELED|UNDETERMINED)/.test(s.toUpperCase());

/**
 * Poll a GenLayer transaction through its consensus lifecycle,
 * emitting every stage transition to onStage. Resolves with the
 * transaction object once ACCEPTED / FINALIZED.
 */
export async function trackTx(
  client: GlClient,
  hash: string,
  onStage: (status: string) => void,
  timeoutMs = 8 * 60 * 1000,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const NUMERIC: Record<string, string> = {
    "0": "PENDING", "1": "CANCELED", "2": "PROPOSING", "3": "COMMITTING",
    "4": "REVEALING", "5": "ACCEPTED", "6": "FINALIZED", "7": "UNDETERMINED",
  };
  const start = Date.now();
  let last = "";
  while (Date.now() - start < timeoutMs) {
    let status = "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let tx: any = null;
    try {
      tx = await (client.getTransaction as (args: { hash: string }) => Promise<unknown>)({ hash });
      let raw = String(tx?.statusName ?? tx?.status ?? "").toUpperCase();
      if (/^\d+$/.test(raw)) raw = NUMERIC[raw] ?? raw;
      status = raw;
    } catch {
      /* transient RPC hiccup — keep polling */
    }
    if (status && status !== last) {
      last = status;
      onStage(status);
    }
    if (isTerminal(status)) return tx;
    if (isFailed(status)) throw new Error(`transaction ${status.toLowerCase()} by consensus`);
    await new Promise((r) => setTimeout(r, 2500));
  }
  throw new Error("consensus is taking unusually long — inspect the tx in GenLayer Studio");
}

/* misc formatting */

export const shortAddr = (a?: string | null) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");
export const shortHash = (h?: string | null) => (h ? `${h.slice(0, 10)}…${h.slice(-6)}` : "");

export const isValidAddress = (a: string) => /^0x[0-9a-fA-F]{40}$/.test(a.trim());

/* dispute record as stored by agent_court.py */
export interface OnchainDispute {
  id: number;
  plaintiff: string;
  defendant: string;
  task_spec_url: string;
  delivery_url: string;
  delivery_notes: string;
  escrow: string; // wei, decimal string
  status: "OPEN" | "EVIDENCE" | "ADJUDGED" | "FINAL" | string;
  appeals: number;
  verdict: string; // JSON string, "" until adjudged
  settled: boolean;
  settlement?: { plaintiff_award: string; defendant_award: string };
}

export interface ParsedVerdict {
  verdict: "PLAINTIFF_WINS" | "DEFENDANT_WINS" | "SPLIT" | string;
  plaintiff_share: number;
  rationale: string;
}

export const parseVerdict = (raw: string): ParsedVerdict | null => {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    if (typeof v !== "object" || v === null) return null;
    return v as ParsedVerdict;
  } catch {
    return null;
  }
};
