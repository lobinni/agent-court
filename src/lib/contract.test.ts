import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SOURCE = readFileSync(path.join(ROOT, "contracts", "agent_court.py"), "utf8");

const HEAD = `# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }`;

const PUBLIC_METHODS = [
  "file_dispute",
  "submit_delivery",
  "cancel_dispute",
  "convene_trial",
  "accept_verdict",
  "appeal",
  "finalize",
  "collect_fees",
  "get_dispute",
  "get_verdict",
  "evidence_commitments",
  "settlement_status",
  "docket",
  "court_info",
  "debug_api_surface",
];

function methodBody(name: string): string {
  const start = SOURCE.indexOf(`def ${name}`);
  expect(start, `${name} missing`).toBeGreaterThan(-1);
  const after = start + name.length + 4;
  const bounds = ["\n    @gl.public", "\n    def ", "\n    # ──"]
    .map((mark) => SOURCE.indexOf(mark, after))
    .filter((index) => index > -1);
  const end = bounds.length ? Math.min(...bounds) : SOURCE.length;
  return SOURCE.slice(start, end);
}

describe("AgentCourt schema safety", () => {
  it("uses the pinned GenVM runner header", () => {
    expect(SOURCE.startsWith(HEAD)).toBe(true);
  });

  it("exposes every method required by the dApp", () => {
    for (const name of PUBLIC_METHODS) {
      expect(SOURCE).toContain(`def ${name}(`);
    }
  });

  it("has no public dunder method", () => {
    for (const block of SOURCE.split(/@gl\.public/).slice(1)) {
      const match = block.match(/def\s+(\w+)\s*\(/);
      expect(match).toBeTruthy();
      expect(match![1].startsWith("__")).toBe(false);
    }
  });

  it("uses sender_address and never the removed sender alias", () => {
    expect(SOURCE).toContain("gl.message.sender_address");
    expect(SOURCE).not.toMatch(/gl\.message\.sender\b/);
  });

  it("does not initialize storage collections manually", () => {
    const init = methodBody("__init__");
    expect(init).not.toContain("TreeMap(");
    expect(init).not.toContain("DynArray(");
  });

  it("marks escrow entry points payable", () => {
    expect(SOURCE).toMatch(/@gl\.public\.write\.payable\s*\n\s*def file_dispute/);
    expect(SOURCE).toMatch(/@gl\.public\.write\.payable\s*\n\s*def appeal/);
  });
});

describe("synchronous failure-atomic payouts", () => {
  it("declares an EVM contract-interface receiver", () => {
    expect(SOURCE).toMatch(/@gl\.evm\.contract_interface\s*\nclass NativeValueReceiver/);
    expect(SOURCE).toContain("class View:");
    expect(SOURCE).toContain("class Write:");
  });

  it("uses synchronous EVM EthSend proxy in _payout", () => {
    const payout = methodBody("_payout");
    expect(payout).toContain("NativeValueReceiver(to_addr).emit_transfer(value=amount)");
    expect(payout).not.toContain("get_contract_at");
    expect(payout).not.toContain("PostMessage");
  });

  it("never swallows a payout error", () => {
    const payout = methodBody("_payout");
    expect(payout).not.toMatch(/except\s+Exception/);
    expect(payout).not.toMatch(/\bpass\b/);
  });

  it("advertises the synchronous payout capability", () => {
    expect(methodBody("court_info")).toContain('"payout_mode": "evm-direct"');
    const debug = methodBody("debug_api_surface");
    expect(debug).toContain('"runner_command": "EthSend"');
    expect(debug).toContain('"synchronous": True');
    expect(debug).toContain('"failure_atomic": True');
  });

  it("documents that asynchronous PostMessage is forbidden for payout", () => {
    const debug = methodBody("debug_api_surface");
    expect(debug).toContain('"runner_command": "PostMessage"');
    expect(debug).toContain('"allowed_for_payout": False');
  });

  it("orders effects before synchronous interaction in all value paths", () => {
    for (const name of ["cancel_dispute", "finalize", "collect_fees"]) {
      const body = methodBody(name);
      const payout = body.indexOf("self._payout(");
      expect(payout, `${name} must call _payout`).toBeGreaterThan(-1);
      const effect = Math.max(
        body.indexOf('d["settled"] = True'),
        body.indexOf("self.fees_collected = u256(0)"),
      );
      expect(effect, `${name} must write effects`).toBeGreaterThan(-1);
      expect(effect).toBeLessThan(payout);
    }
  });

  it("allocates every escrow unit with integer math", () => {
    expect(methodBody("finalize")).toContain("total * share // u256(100)");
    expect(methodBody("finalize")).toContain("to_defendant = total - to_plaintiff");
  });
});

describe("appeal-window protection", () => {
  it("opens the window when a verdict lands", () => {
    const trial = methodBody("convene_trial");
    expect(trial).toContain('d["appeal_deadline"]');
    expect(trial).toContain('d["accepted_plaintiff"] = False');
    expect(trial).toContain('d["accepted_defendant"] = False');
  });

  it("blocks finalization until settlement is unlocked", () => {
    expect(methodBody("finalize")).toContain(
      'assert self._settlement_unlocked(d), "appeal window still open"',
    );
  });

  it("blocks appeals after the window closes", () => {
    expect(methodBody("appeal")).toContain(
      'assert not self._window_closed(d), "appeal window closed"',
    );
  });

  it("requires both acceptances for the fast path", () => {
    const unlock = methodBody("_settlement_unlocked");
    expect(unlock).toContain('d["accepted_plaintiff"] and d["accepted_defendant"]');
  });

  it("vacates verdict and acceptance state on appeal", () => {
    const appeal = methodBody("appeal");
    expect(appeal).toContain('d["verdict"] = ""');
    expect(appeal).toContain('d["accepted_plaintiff"] = False');
    expect(appeal).toContain('d["accepted_defendant"] = False');
  });
});

describe("immutable evidence commitments", () => {
  it("does not hard-fail on missing or non-canonical commitments", () => {
    // Regression: a strict format gate (`_valid_commitment`, 'invalid task spec
    // commitment') previously caused user GEN to revert whenever the browser
    // could not fetch an evidence URL (CORS, localhost, private hosts).
    // Commitments are optional; immutability applies to whatever is recorded.
    expect(SOURCE).not.toContain("_valid_commitment");
    expect(SOURCE).not.toContain("invalid task spec commitment");
    expect(SOURCE).not.toContain("invalid delivery commitment");
  });

  it("stores the task-spec commitment at filing", () => {
    expect(methodBody("file_dispute")).toContain('"task_spec_hash": task_spec_hash');
  });

  it("locks the delivery commitment once", () => {
    const submit = methodBody("submit_delivery");
    expect(submit).toContain('assert d["delivery_hash"] == ""');
    expect(submit).toContain('d["delivery_hash"] = delivery_hash');
  });

  it("requires public HTTPS evidence", () => {
    expect(SOURCE).toContain('task_spec_url.startswith("https://")');
    expect(SOURCE).toContain('delivery_url.startswith("https://")');
  });

  it("exposes both immutable commitments", () => {
    const view = methodBody("evidence_commitments");
    expect(view).toContain('"task_spec_hash"');
    expect(view).toContain('"delivery_hash"');
  });
});

describe("consensus and repository integrity", () => {
  it("runs web and LLM nondeterminism inside the equivalence callback", () => {
    const trial = methodBody("convene_trial");
    expect(trial).not.toContain("gl.nondet.web.render");
    const jury = methodBody("_jury_reason");
    expect(jury.match(/gl\.nondet\.web\.render/g)).toHaveLength(2);
    expect(jury).toContain("gl.nondet.exec_prompt");
    expect(jury).toContain("gl.eq_principle.prompt_comparative");
  });

  it("does not embed release-version gates", () => {
    expect(SOURCE).not.toMatch(/"version"\s*:/i);
  });

  it("keeps browser and canonical copies byte-identical", () => {
    const publicCopy = readFileSync(
      path.join(ROOT, "public", "contracts", "agent_court.py"),
      "utf8",
    );
    expect(publicCopy).toBe(SOURCE);
  });
});