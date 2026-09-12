/* ──────────────────────────────────────────────────────────────
   Executable specification of contracts/agent_court.py
   ──────────────────────────────────────────────────────────────
   This module mirrors the contract's state machine 1:1 so the
   security-critical rules — failure-atomic payouts and the
   finalize-versus-appeal race — are covered by runnable tests
   (`npm test`) without needing a live GenLayer node.

   Every guard here has a matching `assert` in the Python contract.
   ────────────────────────────────────────────────────────────── */

export const MAX_APPEALS = 2;
export const WINDOW_EPOCH_SECONDS = 300;

export type CourtStatus = "OPEN" | "EVIDENCE" | "ADJUDGED" | "FINAL";

export interface Verdict {
  verdict: "PLAINTIFF_WINS" | "DEFENDANT_WINS" | "SPLIT" | "WITHDRAWN";
  plaintiff_share: number;
  rationale: string;
}

export interface Dispute {
  id: number;
  plaintiff: string;
  defendant: string;
  task_spec_url: string;
  task_spec_hash: string;
  delivery_url: string;
  delivery_hash: string;
  delivery_notes: string;
  escrow: bigint;
  status: CourtStatus;
  appeals: number;
  verdict: Verdict | null;
  adjudged_at: number;
  appeal_deadline: number;
  accepted_plaintiff: boolean;
  accepted_defendant: boolean;
  settled: boolean;
  settlement?: { plaintiff_award: bigint; defendant_award: bigint };
}

/** Thrown where the contract would `assert` — i.e. the tx reverts. */
export class Revert extends Error {}

const require_ = (cond: boolean, msg: string) => {
  if (!cond) throw new Revert(msg);
};

/** A native transfer sink. Throwing models a failing GEN payout. */
export type TransferFn = (to: string, amount: bigint) => void;

export interface CourtOptions {
  /** Consensus clock; 0 models a runner that exposes no clock. */
  now?: () => number;
  /** Native transfer primitive; throw to model a payout failure. */
  transfer?: TransferFn;
  filingFee?: bigint;
}

export class AgentCourt {
  readonly treasury: string;
  readonly filingFee: bigint;
  feesCollected = 0n;
  disputes: Dispute[] = [];
  /** Ledger of transfers that actually settled. */
  paid: { to: string; amount: bigint }[] = [];

  private nowFn: () => number;
  private transferFn: TransferFn;

  constructor(treasury: string, opts: CourtOptions = {}) {
    this.treasury = treasury.toLowerCase();
    this.filingFee = opts.filingFee ?? 25_000_000_000_000_000_000n;
    this.nowFn = opts.now ?? (() => 0);
    this.transferFn = opts.transfer ?? (() => {});
  }

  get appealBond(): bigint {
    return this.filingFee * 2n;
  }

  /* ── snapshot / restore: models GenVM reverting the whole tx ── */

  private snapshot(): string {
    return JSON.stringify({
      fees: this.feesCollected.toString(),
      paid: this.paid.map((p) => [p.to, p.amount.toString()]),
      disputes: this.disputes.map((d) => ({
        ...d,
        escrow: d.escrow.toString(),
        settlement: d.settlement
          ? {
              plaintiff_award: d.settlement.plaintiff_award.toString(),
              defendant_award: d.settlement.defendant_award.toString(),
            }
          : undefined,
      })),
    });
  }

  private restore(snap: string) {
    const s = JSON.parse(snap);
    this.feesCollected = BigInt(s.fees);
    this.paid = s.paid.map(([to, amount]: [string, string]) => ({ to, amount: BigInt(amount) }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.disputes = s.disputes.map((d: any) => ({
      ...d,
      escrow: BigInt(d.escrow),
      settlement: d.settlement
        ? {
            plaintiff_award: BigInt(d.settlement.plaintiff_award),
            defendant_award: BigInt(d.settlement.defendant_award),
          }
        : undefined,
    }));
  }

  /**
   * Executes `fn` atomically. Any Revert (including one raised by a
   * failing payout) rolls back every state change — exactly what
   * GenVM does when a contract call raises.
   */
  private atomic<T>(fn: () => T): T {
    const snap = this.snapshot();
    try {
      return fn();
    } catch (e) {
      this.restore(snap);
      throw e;
    }
  }

  /* ── payout: never swallows, mirrors _payout in Python ── */

  private payout(to: string, amount: bigint) {
    if (amount <= 0n) return;
    this.transferFn(to, amount); // may throw → caller reverts
    this.paid.push({ to, amount });
  }

  /* ── clock helpers, mirroring _now / _window ── */

  private now(): number {
    return this.nowFn();
  }

  private windowClosed(d: Dispute): boolean {
    if (d.appeal_deadline <= 0) return false;
    const now = this.now();
    if (now <= 0) return false;
    return now >= d.appeal_deadline;
  }

  private settlementUnlocked(d: Dispute): boolean {
    if (d.accepted_plaintiff && d.accepted_defendant) return true;
    return this.windowClosed(d);
  }

  private load(id: number): Dispute {
    require_(id >= 0 && id < this.disputes.length, "unknown dispute");
    return this.disputes[id];
  }

  /* ── 1 · filing ── */

  fileDispute(
    sender: string,
    value: bigint,
    taskSpecUrl: string,
    taskSpecHash: string,
    defendant: string,
  ): number {
    return this.atomic(() => {
      require_(value > 0n, "escrow must be non-zero");
      require_(taskSpecUrl.length > 0, "task spec url required");
      require_(taskSpecUrl.startsWith("https://"), "task spec must use public https");
      require_(/^0x[0-9a-fA-F]{40}$/.test(defendant), "invalid address");

      const d: Dispute = {
        id: this.disputes.length,
        plaintiff: sender.toLowerCase(),
        defendant: defendant.toLowerCase(),
        task_spec_url: taskSpecUrl,
        task_spec_hash: taskSpecHash,
        delivery_url: "",
        delivery_hash: "",
        delivery_notes: "",
        escrow: value,
        status: "OPEN",
        appeals: 0,
        verdict: null,
        adjudged_at: 0,
        appeal_deadline: 0,
        accepted_plaintiff: false,
        accepted_defendant: false,
        settled: false,
      };
      this.disputes.push(d);
      return d.id;
    });
  }

  /* ── 2 · evidence ── */

  submitDelivery(sender: string, id: number, url: string, hash: string, notes = "") {
    return this.atomic(() => {
      const d = this.load(id);
      require_(d.status === "OPEN", "delivery already locked");
      require_(sender.toLowerCase() === d.defendant, "not the defendant");
      require_(url.length > 0, "delivery url required");
      require_(url.startsWith("https://"), "delivery must use public https");
      require_(d.delivery_hash === "", "evidence commitment is immutable");

      d.delivery_url = url;
      d.delivery_hash = hash;
      d.delivery_notes = notes;
      d.status = "EVIDENCE";
    });
  }

  cancelDispute(sender: string, id: number) {
    return this.atomic(() => {
      const d = this.load(id);
      require_(d.status === "OPEN", "too late to cancel");
      require_(sender.toLowerCase() === d.plaintiff, "not the plaintiff");
      require_(!d.settled, "already settled");

      const amount = d.escrow;
      d.verdict = {
        verdict: "WITHDRAWN",
        plaintiff_share: 100,
        rationale: "case withdrawn by plaintiff before evidence",
      };
      d.settlement = { plaintiff_award: amount, defendant_award: 0n };
      d.settled = true;
      d.status = "FINAL";

      this.payout(d.plaintiff, amount); // failure reverts everything above
    });
  }

  /* ── 3 · trial (jury result injected; nondet lives on-chain) ── */

  conveneTrial(id: number, verdict: Verdict) {
    return this.atomic(() => {
      const d = this.load(id);
      require_(d.status === "EVIDENCE", "not ready for trial");
      require_(!d.settled, "already settled");
      require_(
        ["PLAINTIFF_WINS", "DEFENDANT_WINS", "SPLIT"].includes(verdict.verdict),
        "invalid verdict",
      );
      const s = verdict.plaintiff_share;
      require_(s >= 0 && s <= 100, "invalid plaintiff share");
      require_(verdict.verdict !== "PLAINTIFF_WINS" || s === 100, "plaintiff verdict/share mismatch");
      require_(verdict.verdict !== "DEFENDANT_WINS" || s === 0, "defendant verdict/share mismatch");
      require_(verdict.verdict !== "SPLIT" || (s > 0 && s < 100), "split verdict/share mismatch");

      const now = this.now();
      d.verdict = verdict;
      d.status = "ADJUDGED";
      d.adjudged_at = now;
      d.appeal_deadline = now > 0 ? now + WINDOW_EPOCH_SECONDS : 0;
      d.accepted_plaintiff = false;
      d.accepted_defendant = false;
    });
  }

  /* ── 4 · acceptance, appeal, settlement ── */

  acceptVerdict(sender: string, id: number) {
    return this.atomic(() => {
      const d = this.load(id);
      require_(d.status === "ADJUDGED", "no verdict to accept");
      require_(!d.settled, "already settled");
      const who = sender.toLowerCase();
      require_(who === d.plaintiff || who === d.defendant, "not a party");
      if (who === d.plaintiff) d.accepted_plaintiff = true;
      if (who === d.defendant) d.accepted_defendant = true;
    });
  }

  appeal(sender: string, id: number, value: bigint) {
    return this.atomic(() => {
      const d = this.load(id);
      require_(d.status === "ADJUDGED", "nothing to appeal");
      require_(!d.settled, "already settled");
      const who = sender.toLowerCase();
      require_(who === d.plaintiff || who === d.defendant, "not a party");
      require_(d.appeals < MAX_APPEALS, "appeal limit reached");
      require_(value >= this.appealBond, "bond is 2x filing fee");
      require_(!this.windowClosed(d), "appeal window closed");
      if (who === d.plaintiff) require_(!d.accepted_plaintiff, "verdict already accepted");
      if (who === d.defendant) require_(!d.accepted_defendant, "verdict already accepted");

      d.appeals += 1;
      d.status = "EVIDENCE";
      d.verdict = null;
      d.adjudged_at = 0;
      d.appeal_deadline = 0;
      d.accepted_plaintiff = false;
      d.accepted_defendant = false;
      this.feesCollected += value;
    });
  }

  finalize(id: number) {
    return this.atomic(() => {
      const d = this.load(id);
      // `settled` first so a double-settle reports the precise reason.
      require_(!d.settled, "already settled");
      require_(d.status === "ADJUDGED", "verdict still pending");
      require_(this.settlementUnlocked(d), "appeal window still open");

      const share = BigInt(d.verdict!.plaintiff_share);
      const total = d.escrow;
      const toPlaintiff = (total * share) / 100n;
      const toDefendant = total - toPlaintiff;

      d.settlement = { plaintiff_award: toPlaintiff, defendant_award: toDefendant };
      d.settled = true;
      d.status = "FINAL";

      this.payout(d.plaintiff, toPlaintiff);
      this.payout(d.defendant, toDefendant);
    });
  }

  /* ── 5 · treasury ── */

  collectFees(sender: string) {
    return this.atomic(() => {
      require_(sender.toLowerCase() === this.treasury, "treasury only");
      const amount = this.feesCollected;
      require_(amount > 0n, "nothing to collect");
      this.feesCollected = 0n;
      this.payout(this.treasury, amount);
    });
  }

  /* ── views ── */

  settlementStatus(id: number) {
    const d = this.load(id);
    return {
      status: d.status,
      appeals: d.appeals,
      max_appeals: MAX_APPEALS,
      appeal_deadline: d.appeal_deadline,
      now: this.now(),
      accepted_plaintiff: d.accepted_plaintiff,
      accepted_defendant: d.accepted_defendant,
      window_closed: this.windowClosed(d),
      can_finalize: !d.settled && d.status === "ADJUDGED" && this.settlementUnlocked(d),
      settled: d.settled,
    };
  }

  evidenceCommitments(id: number) {
    const d = this.load(id);
    return {
      task_spec_url: d.task_spec_url,
      task_spec_hash: d.task_spec_hash,
      delivery_url: d.delivery_url,
      delivery_hash: d.delivery_hash,
    };
  }
}
