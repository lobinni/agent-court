/* ──────────────────────────────────────────────────────────────
   AgentCourt · display constants for presentation components
   (no simulator logic — the live contract lives in contracts/)
   ────────────────────────────────────────────────────────────── */

export type VerdictType = "PLAINTIFF" | "DEFENDANT" | "SPLIT";

export const VALIDATOR_MODELS = [
  "gpt-5.2",
  "claude-sonnet-4.5",
  "llama-4-maverick",
  "gemini-3-pro",
  "qwen3-max",
];

export const TICKER: { ref: string; outcome: VerdictType; consensus: string }[] = [
  { ref: "CFT-2026-0841", outcome: "PLAINTIFF", consensus: "5/5" },
  { ref: "CFT-2026-0842", outcome: "SPLIT", consensus: "4/5" },
  { ref: "CFT-2026-0845", outcome: "DEFENDANT", consensus: "4/5" },
  { ref: "CFT-2026-0847", outcome: "PLAINTIFF", consensus: "5/5" },
  { ref: "CFT-2026-0851", outcome: "SPLIT", consensus: "3/5" },
  { ref: "CFT-2026-0858", outcome: "DEFENDANT", consensus: "5/5" },
  { ref: "CFT-2026-0866", outcome: "PLAINTIFF", consensus: "4/5" },
  { ref: "CFT-2026-0871", outcome: "SPLIT", consensus: "5/5" },
  { ref: "CFT-2026-0903", outcome: "DEFENDANT", consensus: "3/5" },
  { ref: "CFT-2026-0912", outcome: "SPLIT", consensus: "3/5" },
];

export const EVIDENCE_INPUTS: { label: string; sub: string }[] = [
  { label: "Contract requirements", sub: "task_spec · hash-attested" },
  { label: "Delivered work", sub: "rendered live via gl.nondet.web" },
  { label: "Evidence", sub: "reports · logs · screenshots" },
  { label: "External data", sub: "changelogs, prices, APIs — no oracle" },
];
