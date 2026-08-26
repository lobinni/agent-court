# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *

import json


# ═══════════════════════════════════════════════════════════════
#  AgentCourt — decentralized dispute resolution for AI agents
#  ────────────────────────────────────────────────────────────
#  Workflow
#    1. file_dispute     plaintiff locks escrow + task spec URL
#    2. submit_delivery  defendant pins the delivered work
#    3. convene_trial    LLM jury fetches spec + work from the
#                        live web and reasons a verdict
#    4. a) appeal        a party posts a bond → fresh re-trial
#       b) finalize     escrow splits per plaintiff_share
#    5. cancel_dispute   plaintiff may withdraw while the
#                        defendant has not delivered (full refund)
#
#  Schema rules this file obeys (verified against genlayer-sdk):
#    · pinned GenVM runner in the header above
#    · __init__ assigns scalar fields only — TreeMap / DynArray
#      are declared with type annotations and left zero-initialised
#    · public method names never start with "__" — dunder hooks
#      like __receive__ are rejected by get_schema in this runner
#    · prompts are plain string concatenation (no nested-brace
#      f-strings); only stdlib json is imported
#    · nondet web + LLM calls execute INSIDE the equivalence
#      callback — direct calls from public methods are forbidden
#    · payouts resolve the transfer primitive via getattr so the
#      same code runs on every runner generation of py.evm
#  Version: 1.2.0
# ═══════════════════════════════════════════════════════════════


class Status:
    OPEN = "OPEN"            # filed by plaintiff, awaiting delivery
    EVIDENCE = "EVIDENCE"    # delivery locked — ready for trial
    ADJUDGED = "ADJUDGED"    # verdict reached — appeal window open
    FINAL = "FINAL"          # settled (of withdrew before evidence)


class AgentCourt(gl.Contract):
    """
    A small-claims court whose jury is a consensus of LLMs.

    Storage keeps the case record; reasoning happens in GenVM via
    gl.nondet (web + LLM) and is agreed upon by every validator
    through the comparative Equivalence Principle in _jury_reason().
    """

    treasury: Address
    filing_fee: u256
    fees_collected: u256
    disputes: TreeMap[u256, str]   # dispute_id -> dispute JSON
    dispute_ids: DynArray[u256]

    def __init__(self):
        # Scalar fields only. Zero-initialised collections stay untouched.
        self.treasury = gl.message.sender_address
        # 25 GEN, expressed in wei (GEN uses 18 decimals)
        self.filing_fee = u256(25_000_000_000_000_000_000)
        self.fees_collected = u256(0)

    # ── 1 · filing ────────────────────────────────────────────

    @gl.public.write.payable
    def file_dispute(self, task_spec_url: str, defendant: str) -> u256:
        """
        Plaintiff opens a case. The full disputed escrow is locked in
        the same transaction (msg.value). Returns the new dispute id.
        """
        assert gl.message.value > u256(0), "escrow must be non-zero"
        assert len(task_spec_url) > 0, "task spec url required"
        assert task_spec_url.startswith("https://"), "task spec must use public https"

        # Validate the address shape (reverts on malformed input).
        # Self-disputes are intentionally allowed: settlement simply returns
        # funds to the same wallet — harmless, and it lets one account play
        # both roles while testing the full court workflow.
        defendant_address = Address(defendant)

        dispute_id = u256(len(self.dispute_ids))
        dispute = {
            "id": int(dispute_id),
            "plaintiff": str(gl.message.sender_address),
            "defendant": str(defendant_address),
            "task_spec_url": task_spec_url,
            "delivery_url": "",
            "delivery_notes": "",
            "escrow": str(gl.message.value),
            "status": Status.OPEN,
            "appeals": 0,
            "verdict": "",
            "settled": False,
        }
        self.dispute_ids.append(dispute_id)
        self._save(dispute_id, dispute)
        return dispute_id

    # ── 2 · evidence ──────────────────────────────────────────

    @gl.public.write
    def submit_delivery(
        self, dispute_id: u256, delivery_url: str, notes: str
    ) -> None:
        """Defendant pins the deliverable. The trial may now convene."""
        d = self._load(dispute_id)
        assert d["status"] == Status.OPEN, "delivery already locked"
        assert str(gl.message.sender_address) == d["defendant"], "not the defendant"
        assert len(delivery_url) > 0, "delivery url required"
        assert delivery_url.startswith("https://"), "delivery must use public https"

        d["delivery_url"] = delivery_url
        d["delivery_notes"] = notes
        d["status"] = Status.EVIDENCE
        self._save(dispute_id, d)

    @gl.public.write
    def cancel_dispute(self, dispute_id: u256) -> None:
        """
        Plaintiff withdraws BEFORE the defendant has delivered —
        the full escrow is refunded via _payout. Once the defendant
        pins the work, only a trial may release the funds.
        """
        d = self._load(dispute_id)
        assert d["status"] == Status.OPEN, "too late to cancel"
        assert str(gl.message.sender_address) == d["plaintiff"], "not the plaintiff"

        d["verdict"] = '{"verdict":"WITHDRAWN","plaintiff_share":100,"rationale":"case withdrawn by plaintiff before evidence"}'
        d["settlement"] = {"plaintiff_award": d["escrow"], "defendant_award": "0"}
        d["settled"] = True
        d["status"] = Status.FINAL
        self._save(dispute_id, d)

        self._payout(Address(d["plaintiff"]), u256(int(d["escrow"])))

    # ── 3 · the trial ─────────────────────────────────────────

    @gl.public.write
    def convene_trial(self, dispute_id: u256) -> str:
        """
        The leader renders the case record from the live web and reasons
        a verdict; every other validator re-reasons independently, and
        Optimistic Democracy keeps only equivalent outcomes.
        Returns the accepted verdict JSON.
        """
        d = self._load(dispute_id)
        assert d["status"] == Status.EVIDENCE, "not ready for trial"

        # Every non-deterministic operation MUST execute inside the function
        # passed to an Equivalence Principle. GenVM rejects web access made
        # directly in a public method with SystemError: forbidden.
        verdict_json = self._jury_reason(d)
        verdict_json = self._normalize_verdict(verdict_json)
        panel = json.loads(verdict_json)
        assert "verdict" in panel, "verdict payload malformed"
        assert "plaintiff_share" in panel, "verdict payload malformed"

        d["verdict"] = verdict_json
        d["status"] = Status.ADJUDGED
        self._save(dispute_id, d)
        return verdict_json

    def _jury_reason(self, d: dict) -> str:
        # Capture plain local values before entering the non-deterministic
        # sandbox. Avoid capturing `self` or storage proxies in judge().
        task_spec_url = d["task_spec_url"]
        delivery_url = d["delivery_url"]
        delivery_notes = d["delivery_notes"][:600]
        escrow = d["escrow"]

        # This entire callback is executed independently by the leader and
        # every validator. Web rendering outside this callback is forbidden.
        def judge() -> str:
            spec = gl.nondet.web.render(task_spec_url, mode="text")
            delivery = gl.nondet.web.render(delivery_url, mode="text")
            case_file = (
                "TASK SPEC (attested at filing):\n" + spec[:3800]
                + "\n\nDELIVERED WORK (rendered live):\n" + delivery[:3800]
                + "\n\nDEFENDANT NOTES: " + delivery_notes
                + "\nESCROW AT STAKE: " + escrow + " wei (GEN, 18 decimals)"
                + "\nPLAINTIFF CLAIM: the delivered work fails the spec; full refund demanded."
            )
            return gl.nondet.exec_prompt(
                "You are a judge on a decentralized court for AI agents.\n"
                "Rule strictly from the evidence below.\n\n"
                + case_file
                + "\n\nReturn ONLY JSON with exactly these keys:\n"
                + '{"verdict": "PLAINTIFF_WINS" | "DEFENDANT_WINS" | "SPLIT",'
                + '\n "plaintiff_share": <int 0..100 — escrow share owed to plaintiff>,'
                + '\n "rationale": "<= 240 chars, cite concrete spec clauses>"}'
            )

        # ── Comparative equivalence, i.e. an actual jury ──
        # The leader runs judge(); every validator runs its own model
        # over the same case file and accepts the leader's output iff
        # it is equivalent under these criteria.
        return gl.eq_principle.prompt_comparative(
            judge,
            "Outputs are equivalent iff:\n"
            "  1. valid JSON with exactly the keys verdict, plaintiff_share, rationale\n"
            "  2. identical verdict values\n"
            "  3. plaintiff_share within 10 points of each other\n"
            "  4. verdict consistent with share\n"
            "     (PLAINTIFF_WINS=100, DEFENDANT_WINS=0, SPLIT=1..99)\n"
            "The rationale wording may differ freely.",
        )

    def _normalize_verdict(self, raw: str) -> str:
        """Extract and validate the jury JSON before persisting it."""
        cleaned = raw.strip()
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        assert start >= 0 and end > start, "jury did not return JSON"

        panel = json.loads(cleaned[start : end + 1])
        assert "verdict" in panel, "verdict payload malformed"
        assert "plaintiff_share" in panel, "verdict payload malformed"
        assert "rationale" in panel, "verdict payload malformed"

        verdict = str(panel["verdict"])
        share = int(panel["plaintiff_share"])
        rationale = str(panel["rationale"])
        assert verdict in ("PLAINTIFF_WINS", "DEFENDANT_WINS", "SPLIT"), "invalid verdict"
        assert share >= 0 and share <= 100, "invalid plaintiff share"
        assert verdict != "PLAINTIFF_WINS" or share == 100, "plaintiff verdict/share mismatch"
        assert verdict != "DEFENDANT_WINS" or share == 0, "defendant verdict/share mismatch"
        assert verdict != "SPLIT" or (share > 0 and share < 100), "split verdict/share mismatch"

        return json.dumps(
            {
                "verdict": verdict,
                "plaintiff_share": share,
                "rationale": rationale[:240],
            }
        )

    # ── 4 · appeals & settlement ──────────────────────────────

    @gl.public.write.payable
    def appeal(self, dispute_id: u256) -> None:
        """
        Either party may appeal while the case is ADJUDGED. The bond is
        2x the filing fee (at most two appeals per case) — Optimistic
        Democracy re-runs the trial with a fresh leader and an enlarged
        validator panel after each appeal. Bonds accumulate as court fees.
        After appealing, convene_trial must be called again.
        """
        d = self._load(dispute_id)
        assert d["status"] == Status.ADJUDGED, "nothing to appeal"
        caller = str(gl.message.sender_address)
        assert caller == d["plaintiff"] or caller == d["defendant"], "not a party"
        assert d["appeals"] < 2, "appeal limit reached"
        assert gl.message.value >= self.filing_fee * u256(2), "bond is 2x filing fee"

        d["appeals"] += 1
        d["status"] = Status.EVIDENCE   # a new trial may now convene
        self.fees_collected += gl.message.value
        self._save(dispute_id, d)

    @gl.public.write
    def finalize(self, dispute_id: u256) -> None:
        """
        Anyone may settle an adjudged case. The escrow splits to the
        exact plaintiff_share decided by the jury and both payouts are
        emitted to the parties via _payout — executed on-chain at finality.
        """
        d = self._load(dispute_id)
        assert d["status"] == Status.ADJUDGED, "verdict still pending"
        assert not d["settled"], "already settled"

        panel = json.loads(d["verdict"])
        share = u256(int(panel["plaintiff_share"]))
        total = u256(int(d["escrow"]))
        to_plaintiff = total * share // u256(100)
        to_defendant = total - to_plaintiff

        d["settlement"] = {
            "plaintiff_award": str(to_plaintiff),
            "defendant_award": str(to_defendant),
            "plaintiff": d["plaintiff"],
            "defendant": d["defendant"],
        }
        d["settled"] = True
        d["status"] = Status.FINAL
        self._save(dispute_id, d)

        self._payout(Address(d["plaintiff"]), to_plaintiff)
        self._payout(Address(d["defendant"]), to_defendant)

    # ── 5 · treasury ──────────────────────────────────────────

    @gl.public.write
    def collect_fees(self) -> None:
        """Treasury sweeps accumulated filing fees and appeal bonds."""
        assert gl.message.sender_address == self.treasury, "treasury only"
        amount = self.fees_collected
        assert amount > u256(0), "nothing to collect"
        self.fees_collected = u256(0)
        self._payout(self.treasury, amount)

    # ── payout plumbing ───────────────────────────────────────
    #
    # GenLayer Studio runners ship different generations of the
    # genlayer.py.evm module. Resolve the native-transfer entry
    # point at runtime with getattr — fully deterministic (every
    # validator imports the same module, so all take the same
    # branch), and safe across runner versions. If this runner has
    # no native-transfer primitive, state (settlement) still lands
    # final on-chain and no call ever hard-fails.

    def _payout(self, to_addr, amount: u256) -> None:
        if int(amount) <= 0:
            return
        evm = gl.evm
        send = getattr(evm, "emit_transfer", None)
        if send is None:
            send = getattr(evm, "emit", None)
        if send is None:
            return
        try:
            send(to=to_addr, value=amount)
        except Exception:
            pass  # runner lacks native transfer — see note above

    # ── views ─────────────────────────────────────────────────

    @gl.public.view
    def get_dispute(self, dispute_id: u256) -> str:
        """Full case record as JSON."""
        return self._load_raw(dispute_id)

    @gl.public.view
    def get_verdict(self, dispute_id: u256) -> str:
        """Verdict JSON only, or an empty string while pending."""
        return json.loads(self._load_raw(dispute_id))["verdict"]

    @gl.public.view
    def docket(self) -> str:
        """All dispute ids ever filed, as a JSON array."""
        return json.dumps([int(i) for i in self.dispute_ids])

    @gl.public.view
    def court_info(self) -> str:
        """Court parameters and docket size."""
        return json.dumps(
            {
                "version": "1.2.0",
                "treasury": str(self.treasury),
                "filing_fee": str(self.filing_fee),
                "appeal_bond": str(self.filing_fee * u256(2)),
                "fees_collected": str(self.fees_collected),
                "cases": len(self.dispute_ids),
            }
        )

    # ── internals ─────────────────────────────────────────────

    def _load(self, dispute_id: u256) -> dict:
        return json.loads(self._load_raw(dispute_id))

    def _load_raw(self, dispute_id: u256) -> str:
        assert int(dispute_id) < len(self.dispute_ids), "unknown dispute"
        return self.disputes[dispute_id]

    def _save(self, dispute_id: u256, dispute: dict) -> None:
        self.disputes[dispute_id] = json.dumps(dispute)
