import { beforeEach, describe, expect, it } from "vitest";
import { AgentCourt, Revert, WINDOW_EPOCH_SECONDS, type Verdict } from "./courtLogic";

/* ── fixtures ── */

const TREASURY = "0x1111111111111111111111111111111111111111";
const ALICE = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"; // plaintiff
const BOB = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"; // defendant
const CAROL = "0xcccccccccccccccccccccccccccccccccccccccc"; // third party

const SPEC = "https://raw.example.com/task_spec.md";
const DELIVERY = "https://raw.example.com/delivery.md";
const ESCROW = 850n * 10n ** 18n;

const PLAINTIFF_WINS: Verdict = {
  verdict: "PLAINTIFF_WINS",
  plaintiff_share: 100,
  rationale: "four spec clauses failed",
};
const SPLIT: Verdict = {
  verdict: "SPLIT",
  plaintiff_share: 50,
  rationale: "objective clauses met, subjective clause undefined",
};

/** Court with a working clock and a working transfer sink. */
function makeCourt(clock: { t: number }, transfer?: (to: string, amount: bigint) => void) {
  return new AgentCourt(TREASURY, {
    now: () => clock.t,
    transfer,
  });
}

function fileAndDeliver(court: AgentCourt) {
  const id = court.fileDispute(ALICE, ESCROW, SPEC, "sha256:spec", BOB);
  court.submitDelivery(BOB, id, DELIVERY, "sha256:delivery", "shipped");
  return id;
}

/* ══════════════════════════════════════════════════════════════
   1 · FAILURE-ATOMIC PAYOUTS
   State must never report completion when a transfer fails.
   ══════════════════════════════════════════════════════════════ */

describe("failure-atomic settlement", () => {
  const clock = { t: 1_000_000 };

  it("finalize reverts entirely when the payout primitive is missing", () => {
    const court = makeCourt(clock, () => {
      throw new Revert("no native transfer primitive on this runner");
    });
    const id = fileAndDeliver(court);
    court.conveneTrial(id, PLAINTIFF_WINS);
    court.acceptVerdict(ALICE, id);
    court.acceptVerdict(BOB, id);

    expect(() => court.finalize(id)).toThrow(Revert);

    // The case must NOT claim to be settled.
    const d = court.disputes[id];
    expect(d.settled).toBe(false);
    expect(d.status).toBe("ADJUDGED");
    expect(d.settlement).toBeUndefined();
    expect(court.paid).toHaveLength(0);
  });

  it("finalize reverts when only the SECOND payout fails (no partial settlement)", () => {
    let calls = 0;
    const court = makeCourt(clock, () => {
      calls += 1;
      if (calls === 2) throw new Revert("transfer failed"); // defendant leg
    });
    const id = fileAndDeliver(court);
    court.conveneTrial(id, SPLIT); // both legs non-zero
    court.acceptVerdict(ALICE, id);
    court.acceptVerdict(BOB, id);

    expect(() => court.finalize(id)).toThrow(Revert);

    const d = court.disputes[id];
    expect(d.settled).toBe(false);
    expect(d.status).toBe("ADJUDGED");
    // the first (successful) leg was rolled back too
    expect(court.paid).toHaveLength(0);
  });

  it("finalize commits state and both payouts when transfers succeed", () => {
    const court = makeCourt(clock);
    const id = fileAndDeliver(court);
    court.conveneTrial(id, SPLIT);
    court.acceptVerdict(ALICE, id);
    court.acceptVerdict(BOB, id);
    court.finalize(id);

    const d = court.disputes[id];
    expect(d.settled).toBe(true);
    expect(d.status).toBe("FINAL");
    expect(court.paid).toHaveLength(2);
    const total = court.paid.reduce((a, p) => a + p.amount, 0n);
    expect(total).toBe(ESCROW); // no dust created or lost
  });

  it("cancel_dispute reverts entirely when the refund fails", () => {
    const court = makeCourt(clock, () => {
      throw new Revert("transfer failed");
    });
    const id = court.fileDispute(ALICE, ESCROW, SPEC, "sha256:spec", BOB);

    expect(() => court.cancelDispute(ALICE, id)).toThrow(Revert);

    const d = court.disputes[id];
    expect(d.settled).toBe(false);
    expect(d.status).toBe("OPEN"); // still cancellable / still deliverable
    expect(court.paid).toHaveLength(0);
  });

  it("collect_fees does not zero the counter when the sweep fails", () => {
    const court = makeCourt(clock, (to) => {
      if (to === TREASURY) throw new Revert("transfer failed");
    });
    const id = fileAndDeliver(court);
    court.conveneTrial(id, PLAINTIFF_WINS);
    court.appeal(BOB, id, court.appealBond); // bond becomes court fees
    const banked = court.feesCollected;
    expect(banked).toBe(court.appealBond);

    expect(() => court.collectFees(TREASURY)).toThrow(Revert);

    // fees must still be claimable — not silently marked collected
    expect(court.feesCollected).toBe(banked);
  });
});

/* ══════════════════════════════════════════════════════════════
   2 · FINALIZE  vs  APPEAL  RACE
   No one may lock in a verdict while the window is still open.
   ══════════════════════════════════════════════════════════════ */

describe("finalize versus appeal race", () => {
  let clock: { t: number };
  let court: AgentCourt;
  let id: number;

  beforeEach(() => {
    clock = { t: 1_000_000 };
    court = makeCourt(clock);
    id = fileAndDeliver(court);
    court.conveneTrial(id, PLAINTIFF_WINS);
  });

  it("opens an appeal window when the verdict lands", () => {
    const s = court.settlementStatus(id);
    expect(s.status).toBe("ADJUDGED");
    expect(s.appeal_deadline).toBe(clock.t + WINDOW_EPOCH_SECONDS);
    expect(s.window_closed).toBe(false);
    expect(s.can_finalize).toBe(false);
  });

  it("blocks a third party from finalizing while the window is open", () => {
    expect(() => court.finalize(id)).toThrow(/appeal window still open/);
    expect(court.disputes[id].settled).toBe(false);
  });

  it("blocks the WINNING party from front-running the loser's appeal", () => {
    // Alice won 100/0 and would love to settle before Bob appeals.
    court.acceptVerdict(ALICE, id);
    expect(() => court.finalize(id)).toThrow(/appeal window still open/);

    // Bob still gets his appeal.
    court.appeal(BOB, id, court.appealBond);
    expect(court.disputes[id].status).toBe("EVIDENCE");
    expect(court.disputes[id].appeals).toBe(1);
  });

  it("allows immediate settlement once BOTH parties accept", () => {
    court.acceptVerdict(ALICE, id);
    court.acceptVerdict(BOB, id);
    expect(court.settlementStatus(id).can_finalize).toBe(true);

    court.finalize(id); // third party may now settle it
    expect(court.disputes[id].status).toBe("FINAL");
  });

  it("allows anyone to finalize once the window elapses", () => {
    clock.t += WINDOW_EPOCH_SECONDS; // window closes exactly at the deadline
    expect(court.settlementStatus(id).window_closed).toBe(true);

    court.finalize(id);
    expect(court.disputes[id].settled).toBe(true);
    expect(court.paid[0]).toEqual({ to: ALICE, amount: ESCROW });
  });

  it("rejects an appeal filed after the window closed", () => {
    clock.t += WINDOW_EPOCH_SECONDS + 1;
    expect(() => court.appeal(BOB, id, court.appealBond)).toThrow(/appeal window closed/);
  });

  it("rejects an appeal from a party that already accepted the verdict", () => {
    court.acceptVerdict(BOB, id);
    expect(() => court.appeal(BOB, id, court.appealBond)).toThrow(/verdict already accepted/);
  });

  it("rejects an appeal from a non-party", () => {
    expect(() => court.appeal(CAROL, id, court.appealBond)).toThrow(/not a party/);
  });

  it("rejects an under-funded appeal bond", () => {
    expect(() => court.appeal(BOB, id, court.appealBond - 1n)).toThrow(/bond is 2x filing fee/);
  });

  it("an appeal vacates the verdict and re-opens a fresh window on re-trial", () => {
    court.appeal(BOB, id, court.appealBond);
    const mid = court.disputes[id];
    expect(mid.verdict).toBeNull();
    expect(mid.appeal_deadline).toBe(0);
    expect(mid.accepted_plaintiff).toBe(false);

    // cannot finalize a vacated case
    expect(() => court.finalize(id)).toThrow(/verdict still pending/);

    clock.t += 60;
    court.conveneTrial(id, SPLIT);
    expect(court.settlementStatus(id).appeal_deadline).toBe(clock.t + WINDOW_EPOCH_SECONDS);
  });

  it("enforces the appeal limit and settles after the final window", () => {
    court.appeal(BOB, id, court.appealBond);
    court.conveneTrial(id, PLAINTIFF_WINS);
    court.appeal(BOB, id, court.appealBond);
    court.conveneTrial(id, PLAINTIFF_WINS);

    expect(() => court.appeal(BOB, id, court.appealBond)).toThrow(/appeal limit reached/);

    clock.t += WINDOW_EPOCH_SECONDS;
    court.finalize(id);
    expect(court.disputes[id].status).toBe("FINAL");
  });

  it("never settles twice", () => {
    clock.t += WINDOW_EPOCH_SECONDS;
    court.finalize(id);
    expect(() => court.finalize(id)).toThrow(/already settled/);
    expect(court.paid).toHaveLength(1);
  });
});

/* ══════════════════════════════════════════════════════════════
   3 · NO-CLOCK RUNNER — strict mode, never optimistic
   ══════════════════════════════════════════════════════════════ */

describe("runner without a consensus clock", () => {
  it("requires both parties to accept before any settlement", () => {
    const court = new AgentCourt(TREASURY, { now: () => 0 });
    const id = fileAndDeliver(court);
    court.conveneTrial(id, PLAINTIFF_WINS);

    expect(court.settlementStatus(id).appeal_deadline).toBe(0);
    expect(() => court.finalize(id)).toThrow(/appeal window still open/);

    court.acceptVerdict(ALICE, id);
    expect(() => court.finalize(id)).toThrow(/appeal window still open/);

    court.acceptVerdict(BOB, id);
    court.finalize(id);
    expect(court.disputes[id].settled).toBe(true);
  });

  it("still allows appeals because the window never auto-expires", () => {
    const court = new AgentCourt(TREASURY, { now: () => 0 });
    const id = fileAndDeliver(court);
    court.conveneTrial(id, PLAINTIFF_WINS);
    court.appeal(BOB, id, court.appealBond);
    expect(court.disputes[id].appeals).toBe(1);
  });
});

/* ══════════════════════════════════════════════════════════════
   4 · IMMUTABLE EVIDENCE COMMITMENTS
   ══════════════════════════════════════════════════════════════ */

describe("immutable evidence commitments", () => {
  const clock = { t: 1_000_000 };

  it("records the spec and delivery hashes at pin time", () => {
    const court = makeCourt(clock);
    const id = court.fileDispute(ALICE, ESCROW, SPEC, "sha256:aaa", BOB);
    court.submitDelivery(BOB, id, DELIVERY, "sha256:bbb", "notes");

    expect(court.evidenceCommitments(id)).toEqual({
      task_spec_url: SPEC,
      task_spec_hash: "sha256:aaa",
      delivery_url: DELIVERY,
      delivery_hash: "sha256:bbb",
    });
  });

  it("refuses to overwrite a delivery commitment", () => {
    const court = makeCourt(clock);
    const id = fileAndDeliver(court);
    expect(() => court.submitDelivery(BOB, id, DELIVERY, "sha256:evil", "swap")).toThrow(
      /delivery already locked/,
    );
    expect(court.evidenceCommitments(id).delivery_hash).toBe("sha256:delivery");
  });

  it("rejects non-HTTPS evidence that validators could not fetch", () => {
    const court = makeCourt(clock);
    expect(() => court.fileDispute(ALICE, ESCROW, "ipfs://bafy", "h", BOB)).toThrow(
      /public https/,
    );
    const id = court.fileDispute(ALICE, ESCROW, SPEC, "h", BOB);
    expect(() => court.submitDelivery(BOB, id, "http://localhost:8080", "h", "")).toThrow(
      /public https/,
    );
  });
});

/* ══════════════════════════════════════════════════════════════
   5 · ACCESS CONTROL & ESCROW MATH
   ══════════════════════════════════════════════════════════════ */

describe("access control and escrow math", () => {
  const clock = { t: 1_000_000 };

  it("only the defendant can submit delivery", () => {
    const court = makeCourt(clock);
    const id = court.fileDispute(ALICE, ESCROW, SPEC, "h", BOB);
    expect(() => court.submitDelivery(ALICE, id, DELIVERY, "h", "")).toThrow(/not the defendant/);
  });

  it("only the plaintiff can cancel, and only before delivery", () => {
    const court = makeCourt(clock);
    const id = court.fileDispute(ALICE, ESCROW, SPEC, "h", BOB);
    expect(() => court.cancelDispute(BOB, id)).toThrow(/not the plaintiff/);
    court.submitDelivery(BOB, id, DELIVERY, "h", "");
    expect(() => court.cancelDispute(ALICE, id)).toThrow(/too late to cancel/);
  });

  it("only the treasury can collect fees", () => {
    const court = makeCourt(clock);
    const id = fileAndDeliver(court);
    court.conveneTrial(id, PLAINTIFF_WINS);
    court.appeal(BOB, id, court.appealBond);
    expect(() => court.collectFees(CAROL)).toThrow(/treasury only/);
    court.collectFees(TREASURY);
    expect(court.feesCollected).toBe(0n);
  });

  it("rejects zero escrow", () => {
    const court = makeCourt(clock);
    expect(() => court.fileDispute(ALICE, 0n, SPEC, "h", BOB)).toThrow(/non-zero/);
  });

  it("splits every share without dust", () => {
    for (const share of [0, 1, 33, 50, 67, 99, 100]) {
      const clk = { t: 1_000_000 };
      const court = makeCourt(clk);
      const id = fileAndDeliver(court);
      const verdict: Verdict =
        share === 100
          ? PLAINTIFF_WINS
          : share === 0
            ? { verdict: "DEFENDANT_WINS", plaintiff_share: 0, rationale: "r" }
            : { verdict: "SPLIT", plaintiff_share: share, rationale: "r" };
      court.conveneTrial(id, verdict);
      clk.t += WINDOW_EPOCH_SECONDS;
      court.finalize(id);
      const total = court.paid.reduce((a, p) => a + p.amount, 0n);
      expect(total).toBe(ESCROW);
    }
  });
});
