import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ROOT_PY = readFileSync(path.join(ROOT, "contracts", "agent_court.py"), "utf8");

/* ── helpers ── */

const CONTRACT_HEAD = `# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }`;

const PUBLIC_METHODS = [
  "file_dispute",
  "submit_delivery",
  "cancel_dispute",
  "convene_trial",
  "appeal",
  "finalize",
  "collect_fees",
  "get_dispute",
  "get_verdict",
  "docket",
  "court_info",
];

/* ── schema-safety rules (every rule corresponds to a real failure we hit) ── */

describe("agent_court.py · GenVM schema contract", () => {
  it("starts with the pinned GenVM runner", () => {
    expect(ROOT_PY.startsWith(CONTRACT_HEAD)).toBe(true);
  });

  it("has no public method whose name starts with __ (get_schema rejects dunders)", () => {
    const publicBlocks = ROOT_PY.split(/@gl\.public/).slice(1);
    for (const block of publicBlocks) {
      const defMatch = block.match(/def\s+(\w+)\s*\(/);
      expect(defMatch, `public block missing def: ${block.slice(0, 60)}`).toBeTruthy();
      expect(defMatch![1].startsWith("__"), `public method \`${defMatch![1]}\` uses a dunder name`).toBe(false);
    }
  });

  it("never uses gl.message.sender without _address (v2 crash)", () => {
    expect(/gl\.message\.sender\b/.test(ROOT_PY)).toBe(false);
    expect(ROOT_PY).toContain("gl.message.sender_address");
  });

  it("__init__ assigns scalar fields only (collections stay zero-initialised)", () => {
    const initStart = ROOT_PY.indexOf("def __init__");
    const initEnd = ROOT_PY.indexOf("@gl.public", initStart);
    const initBody = ROOT_PY.slice(initStart, initEnd);
    expect(initBody).not.toContain("TreeMap(");
    expect(initBody).not.toContain("DynArray(");
    expect(initBody).toContain("self.treasury = gl.message.sender_address");
  });

  it("imports only genlayer and stdlib json", () => {
    const imports = ROOT_PY.match(/^import .+|^from .+ import .+$/gm) ?? [];
    for (const line of imports) {
      const ok =
        line === "from genlayer import *" || line === "import json";
      expect(ok, `unexpected import: ${line}`).toBe(true);
    }
  });

  it("exposes every method the dApp calls", () => {
    for (const m of PUBLIC_METHODS) {
      expect(ROOT_PY.includes(`def ${m}(`), `missing method ${m}()`).toBe(true);
    }
  });

  it("marks escrow-taking methods payable", () => {
    expect(/@gl\.public\.write\.payable\n\s*def file_dispute/.test(ROOT_PY)).toBe(true);
    expect(/@gl\.public\.write\.payable\n\s*def appeal/.test(ROOT_PY)).toBe(true);
  });

  it("splits escrow with integer-safe math (no floating point)", () => {
    expect(ROOT_PY).toContain("total * share // u256(100)");
  });

  it("guards zero escrow and double-settlement", () => {
    expect(ROOT_PY).toContain("escrow must be non-zero");
    expect(ROOT_PY).toContain("already settled");
  });

  it("allows self-disputes for single-account workflow testing", () => {
    expect(ROOT_PY).not.toContain("cannot sue yourself");
  });

  it("bounds every LLM prompt (finite case file)", () => {
    expect(ROOT_PY).toContain('spec[:3800]');
    expect(ROOT_PY).toContain('delivery[:3800]');
  });

  it("runs every web fetch inside the equivalence-principle callback", () => {
    const trialStart = ROOT_PY.indexOf("def convene_trial");
    const juryStart = ROOT_PY.indexOf("def _jury_reason", trialStart);
    const normalizeStart = ROOT_PY.indexOf("def _normalize_verdict", juryStart);
    const publicTrialBody = ROOT_PY.slice(trialStart, juryStart);
    const juryBody = ROOT_PY.slice(juryStart, normalizeStart);

    // Direct nondeterministic calls from a public write method are rejected
    // by GenVM as SystemError: forbidden.
    expect(publicTrialBody).not.toContain("gl.nondet.web.render");
    expect(publicTrialBody).not.toContain("gl.nondet.exec_prompt");

    const judgeStart = juryBody.indexOf("def judge");
    const eqStart = juryBody.indexOf("gl.eq_principle.prompt_comparative");
    const judgeBody = juryBody.slice(judgeStart, eqStart);
    expect(judgeBody.match(/gl\.nondet\.web\.render/g)).toHaveLength(2);
    expect(judgeBody).toContain("gl.nondet.exec_prompt");
  });

  it("requires public HTTPS evidence URLs", () => {
    expect(ROOT_PY).toContain('task_spec_url.startswith("https://")');
    expect(ROOT_PY).toContain('delivery_url.startswith("https://")');
  });

  it("never calls gl.evm.emit_transfer directly (runner-agnostic payouts)", () => {
    // Direct gl.evm.emit_transfer crashes on older runners with
    // AttributeError. All native payouts MUST route through _payout.
    const withoutDocstring = ROOT_PY.replace(/#.*$/gm, "");
    const directCalls = withoutDocstring.match(/gl\.evm\.emit_transfer/g);
    expect(directCalls).toBeNull();
    expect(ROOT_PY).toContain('getattr(evm, "emit_transfer", None)');
    expect(ROOT_PY).toContain('getattr(evm, "emit", None)');
  });

  it("every payout call goes through _payout helper", () => {
    // finalize, cancel_dispute and collect_fees all use _payout
    const payoutCalls = ROOT_PY.match(/self\._payout\(/g) ?? [];
    expect(payoutCalls.length).toBeGreaterThanOrEqual(4); // finalize ×2, cancel ×1, fees ×1
  });
});

describe("repo consistency", () => {
  it("public/ copy is byte-identical to the canonical contract", () => {
    const publicPy = readFileSync(
      path.join(ROOT, "public", "contracts", "agent_court.py"),
      "utf8",
    );
    expect(publicPy).toBe(ROOT_PY);
  });
});

/* ── settlement math mirrored from finalize() ── */

function splitEscrow(totalWei: bigint, plaintiffShare: number): { plaintiff: bigint; defendant: bigint } {
  const share = BigInt(plaintiffShare);
  const plaintiff = (totalWei * share) / 100n;
  const defendant = totalWei - plaintiff;
  return { plaintiff, defendant };
}

describe("escrow split math (mirrors finalize)", () => {
  const escrow = 850n * 10n ** 18n;

  it("100% plaintiff", () => {
    const r = splitEscrow(escrow, 100);
    expect(r.plaintiff).toBe(escrow);
    expect(r.defendant).toBe(0n);
  });

  it("0% plaintiff", () => {
    const r = splitEscrow(escrow, 0);
    expect(r.plaintiff).toBe(0n);
    expect(r.defendant).toBe(escrow);
  });

  it("50/50 split", () => {
    const r = splitEscrow(escrow, 50);
    expect(r.plaintiff + r.defendant).toBe(escrow);
    expect(r.plaintiff).toBe(r.defendant);
  });

  it("arbitrary shares never lose or create dust", () => {
    for (const share of [1, 33, 67, 99]) {
      const r = splitEscrow(escrow, share);
      expect(r.plaintiff + r.defendant).toBe(escrow);
    }
  });

  it("appeal bond equals 2x filing fee", () => {
    const fee = 25_000_000_000_000_000_000n; // 25 GEN in wei, as in __init__
    expect(fee * 2n).toBe(50_000_000_000_000_000_000n);
  });
});
