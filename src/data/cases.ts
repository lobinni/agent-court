/* ──────────────────────────────────────────────────────────────
   AgentCourt · docket data for the courtroom simulator
   (display-only — the live contract lives in contracts/)
   ────────────────────────────────────────────────────────────── */

export type Stance = "agree" | "dissent";
export type VerdictType = "PLAINTIFF" | "DEFENDANT" | "SPLIT";

export interface ValidatorOpinion {
  model: string;
  stance: Stance;
  opinion: string;
}

export interface EvidenceItem {
  label: string;
  kind: "SPEC" | "WEB" | "REPORT" | "LOG" | "CHAIN";
  detail: string;
}

export interface DisputeCase {
  ref: string;
  title: string;
  category: string;
  escrow: number;
  currency: string;
  plaintiff: { name: string; role: string; handle: string };
  defendant: { name: string; role: string; handle: string };
  claim: string;
  rebuttal: string;
  requirements: { clause: string; met: boolean | null }[];
  delivery: string;
  evidence: EvidenceItem[];
  leaderModel: string;
  proposal: string;
  opinions: ValidatorOpinion[];
  appealOpinions: ValidatorOpinion[];
  verdict: {
    type: VerdictType;
    plaintiffShare: number;
    award: string;
    rationale: string;
    appealShare?: number;
    appealNote?: string;
  };
}

export const VALIDATOR_MODELS = [
  "gpt-5.2",
  "claude-sonnet-4.5",
  "llama-4-maverick",
  "gemini-3-pro",
  "qwen3-max",
];

export const APPEAL_MODELS = ["mistral-large-3", "deepseek-v4"];

export const CASES: DisputeCase[] = [
  {
    ref: "CFT-2026-0847",
    title: "The Landing Page That Never Shipped",
    category: "Web build · performance SLA",
    escrow: 850,
    currency: "GEN",
    plaintiff: {
      name: "NovaCommerce",
      role: "Plaintiff Agent · procurement",
      handle: "0x7A3f…9c1D",
    },
    defendant: {
      name: "SiteSmith",
      role: "Defendant Agent · web generation",
      handle: "0xB02e…4f77",
    },
    claim:
      "Contracted a five-section product landing page — responsive, Lighthouse ≥ 90, live by Friday. Delivered URL renders a single hero with placeholder copy, and /pricing returns 404.",
    rebuttal:
      "A page was delivered on time at the agreed URL. Completion is subjective; the plaintiff never specified section content beyond the spec headings.",
    requirements: [
      { clause: "Five specified sections present", met: false },
      { clause: "Responsive at 375 / 768 / 1440px", met: false },
      { clause: "Lighthouse performance ≥ 90", met: false },
      { clause: "Copy matches spec outline", met: false },
      { clause: "Deployed at agreed URL", met: true },
      { clause: "Delivered by block timestamp deadline", met: true },
    ],
    delivery: "Single hero section, placeholder copy, LCP 6.8s, /pricing → 404.",
    evidence: [
      { label: "task_spec.md", kind: "SPEC", detail: "ipfs://bafy…4fa2 · 7 clauses, sha256 attested at filing" },
      { label: "delivered URL render", kind: "WEB", detail: "gl.nondet.web.render(url, mode=\"text\") + screenshot" },
      { label: "lighthouse.json", kind: "REPORT", detail: "perf 41 · a11y 88 · LCP 6.8s @ Moto G Power" },
      { label: "negotiation log", kind: "LOG", detail: "47 signed agent messages · xmtp attestation" },
      { label: "escrow lock", kind: "CHAIN", detail: "850 GEN · Asimov tx 0x91c…d3 · FINALIZED" },
    ],
    leaderModel: "gpt-5.2",
    proposal:
      "Four of seven spec clauses objectively fail, including both measurable performance gates. Delivery-on-time does not cure delivery-in-part.",
    opinions: [
      { model: "gpt-5.2", stance: "agree", opinion: "Leader. The rendered page fails clauses 1, 2, 3 and 6 against the hashed spec. Breach is material, not cosmetic." },
      { model: "claude-sonnet-4.5", stance: "agree", opinion: "Spec is attested and unambiguous. Deliverable is ~20% of contracted scope. Equivalence check passes against the leader's JSON verdict." },
      { model: "llama-4-maverick", stance: "agree", opinion: "Lighthouse 41 vs required 90 is a 2.2× miss on an objective gate. No interpretation needed — arithmetic settles it." },
      { model: "gemini-3-pro", stance: "agree", opinion: "Screenshot diff confirms missing sections at all three breakpoints. Plaintiff share 100% is proportionate." },
      { model: "qwen3-max", stance: "agree", opinion: "The 'subjective completion' defence fails: four clauses are binary. Verdict equivalent to leader proposal. Consensus reached." },
    ],
    appealOpinions: [
      { model: "mistral-large-3", stance: "agree", opinion: "Appeal panel review — re-rendered the URL independently. Same four clause failures. Verdict stands." },
      { model: "deepseek-v4", stance: "agree", opinion: "Recomputed Lighthouse from trace artifacts. 41 ± 2. Original verdict within equivalence bounds." },
    ],
    verdict: {
      type: "PLAINTIFF",
      plaintiffShare: 100,
      award: "850 GEN refunded to plaintiff · 15% breach fee from defendant bond",
      rationale:
        "Material breach of four attested spec clauses, including both measurable performance gates. Escrow returns to the plaintiff in full.",
      appealNote: "Appeal resolved — panel of 7 reaffirmed, 7/7. Verdict is final.",
    },
  },
  {
    ref: "CFT-2026-0912",
    title: "A Logo, Allegedly",
    category: "Design · subjective quality",
    escrow: 320,
    currency: "GEN",
    plaintiff: {
      name: "BrandForge",
      role: "Plaintiff Agent · brand orchestration",
      handle: "0x41Dc…88aA",
    },
    defendant: {
      name: "GlyphSmith",
      role: "Defendant Agent · generative design",
      handle: "0xF7b1…03cE",
    },
    claim:
      "Paid for three minimal wordmark concepts with source files. All three are unusable clip-art collages. Aesthetically unacceptable — full refund.",
    rebuttal:
      "Three concepts, SVG sources and favicon set delivered per spec. 'Unacceptable' is a veto the contract never granted. Effort and scope were satisfied.",
    requirements: [
      { clause: "Three distinct concepts", met: true },
      { clause: "Source files included (.svg)", met: true },
      { clause: "Favicon set exported", met: true },
      { clause: "Minimal style as briefed", met: null },
      { clause: "Client approval", met: null },
    ],
    delivery: "Three concepts + sources, delivered on time. Style match disputed.",
    evidence: [
      { label: "brand_brief.md", kind: "SPEC", detail: "ipfs://bafy…77e0 · 'minimal', no acceptance criteria defined" },
      { label: "concept renders", kind: "WEB", detail: "gl.nondet.web.render × 3 · screenshot mode, image tokens to jury" },
      { label: "style references", kind: "WEB", detail: "plaintiff moodboard fetched live · 12 reference marks" },
      { label: "escrow lock", kind: "CHAIN", detail: "320 GEN · Asimov tx 0x30a…9b · FINALIZED" },
    ],
    leaderModel: "claude-sonnet-4.5",
    proposal:
      "Scope clauses all pass; the disputed clause is aesthetic and the bried defines no acceptance gate. Neither full refund nor full release is defensible.",
    opinions: [
      { model: "claude-sonnet-4.5", stance: "agree", opinion: "Leader. Deliverables meet every objective clause. The brief's silence on acceptance criteria must be priced 50/50 between the parties." },
      { model: "gpt-5.2", stance: "agree", opinion: "Reference-set comparison shows partial style drift, but no contractual threshold exists to call it breach. Split is the Nash outcome." },
      { model: "gemini-3-pro", stance: "agree", opinion: "Image-token review: concepts 2 and 3 are within the moodboard's style envelope. Subjective veto rejected; partial payment fair." },
      { model: "llama-4-maverick", stance: "dissent", opinion: "Dissent recorded. Drift on the dominant 'minimal' criterion favours the plaintiff — 75/25 plaintiff would price the risk better." },
      { model: "qwen3-max", stance: "dissent", opinion: "Dissent recorded. Defendant executed contracted scope in full; releasing only 50% punishes compliance. 25/75 defendant." },
    ],
    appealOpinions: [
      { model: "mistral-large-3", stance: "agree", opinion: "Appeal panel review — measured vector complexity against reference marks. Style drift below breach threshold. Split upheld." },
      { model: "deepseek-v4", stance: "dissent", opinion: "Appeal dissent. Slight tilt to defendant: deliverables were executable from day one. 40/60 recommended. Panel majority maintains 50/50." },
    ],
    verdict: {
      type: "SPLIT",
      plaintiffShare: 50,
      award: "160 GEN to plaintiff · 160 GEN to defendant · filing fee burned",
      rationale:
        "All objective clauses satisfied; the single subjective clause lacks a contractual acceptance gate. Loss is shared equally across the ambiguity both agents signed.",
      appealShare: 50,
      appealNote: "Appeal resolved — panel of 7 upheld the split, 5/7. Dissents recorded on-chain.",
    },
  },
  {
    ref: "CFT-2026-0977",
    title: "The Silent Pipeline",
    category: "Data engineering · SLA carve-out",
    escrow: 1200,
    currency: "GEN",
    plaintiff: {
      name: "InsightRail",
      role: "Plaintiff Agent · analytics",
      handle: "0x9E0c…2bB4",
    },
    defendant: {
      name: "DataDuct",
      role: "Defendant Agent · ETL infrastructure",
      handle: "0xC53d…dE10",
    },
    claim:
      "Daily ETL silently dropped ~12% of rows for nine days. Freshness SLA breached; dashboards ran on hollow data. Full refund plus damages.",
    rebuttal:
      "Upstream source shipped a breaking schema change. Clause 4.2 expressly excludes upstream drift from the SLA. Monitoring alerted within one hour of detection.",
    requirements: [
      { clause: "99.5% freshness SLA", met: null },
      { clause: "Schema v3 conformance", met: null },
      { clause: "Alert ≤ 1h on anomaly", met: true },
      { clause: "Clause 4.2 — upstream drift exclusion", met: true },
    ],
    delivery: "Pipeline live with 99.8% uptime; row loss traced to upstream API v2→v3 breaking change.",
    evidence: [
      { label: "pipeline_sla.md", kind: "SPEC", detail: "ipfs://bafy…c1d9 · clause 4.2 hash-verified" },
      { label: "upstream changelog", kind: "WEB", detail: "gl.nondet.web.render — breaking change notice predates incident by 3 days" },
      { label: "row-count telemetry", kind: "REPORT", detail: "2.1M expected / 1.85M delivered · 9-day window" },
      { label: "alert receipts", kind: "LOG", detail: "Pager attestation · T+42min first alert" },
      { label: "escrow lock", kind: "CHAIN", detail: "1,200 GEN · Asimov tx 0x77e…a1 · FINALIZED" },
    ],
    leaderModel: "gemini-3-pro",
    proposal:
      "The row-loss window begins after a hash-verified upstream breaking change. Clause 4.2 allocates exactly this risk to the plaintiff. Alerting duty was discharged.",
    opinions: [
      { model: "gemini-3-pro", stance: "agree", opinion: "Leader. Upstream v2→v3 diff matches the dropped fields one-to-one. The carve-out is unambiguous and was priced into the escrow." },
      { model: "gpt-5.2", stance: "agree", opinion: "Causation chain verified against the live changelog — the fetched notice predates the incident. Defendant performed every duty the contract actually contains." },
      { model: "qwen3-max", stance: "agree", opinion: "Freshness SLA measured 99.8% on ingress; the 12% loss sits on the excluded side of clause 4.2. Verdict equivalent to leader." },
      { model: "claude-sonnet-4.5", stance: "agree", opinion: "The plaintiff is owed sympathy, not escrow. Contract text controls — and the text has a carve-out with the plaintiff's signature on it." },
      { model: "llama-4-maverick", stance: "dissent", opinion: "Dissent recorded. Nine days of silent degradation suggests monitoring was weaker than represented. 20% plaintiff share would be defensible." },
    ],
    appealOpinions: [
      { model: "mistral-large-3", stance: "agree", opinion: "Appeal panel review — re-fetched upstream changelog; timestamps hold. Carve-out applies. Verdict stands." },
      { model: "deepseek-v4", stance: "agree", opinion: "Telemetry replay confirms alert pipeline fired at T+42min per spec. No basis to disturb the verdict." },
    ],
    verdict: {
      type: "DEFENDANT",
      plaintiffShare: 0,
      award: "1,200 GEN released to defendant · 25 GEN filing fee to treasury",
      rationale:
        "Loss causally traced to an excluded upstream breaking change under clause 4.2. Defendant discharged all contracted duties, including alerting.",
      appealNote: "Appeal resolved — panel of 7 reaffirmed, 6/7. Verdict is final.",
    },
  },
];

/* ── verdict ticker (hero marquee) ── */

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

/* ── evidence inputs for the protocol diagram ── */

export const EVIDENCE_INPUTS = [
  { label: "Contract requirements", sub: "task_spec · hash-attested" },
  { label: "Delivered work", sub: "rendered live via gl.nondet.web" },
  { label: "Evidence", sub: "reports · logs · screenshots" },
  { label: "External data", sub: "changelogs, prices, APIs — no oracle" },
];
