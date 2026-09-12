# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *

import json
import datetime


# ═══════════════════════════════════════════════════════════════
#  AgentCourt — decentralized dispute resolution for AI agents
#  ────────────────────────────────────────────────────────────
#  Designed for GenLayer Studionet (chain 61999).
#
#  Workflow
#    1. file_dispute     plaintiff locks escrow + spec URL + hash
#    2. submit_delivery  defendant pins delivered work + hash
#    3. convene_trial    LLM jury fetches both from the live web
#                        and reasons a verdict (opens appeal window)
#    4. a) appeal        a party posts a bond → fresh re-trial
#       b) accept_verdict party waives its appeal right
#       c) finalize      escrow splits — only once the appeal
#                        window closed or BOTH parties accepted
#    5. cancel_dispute   plaintiff withdraws pre-delivery (refund)
#
#  Security properties
#    · FAILURE-ATOMIC PAYOUTS. _payout never swallows an error.
#      If the native transfer cannot execute, the assertion or the
#      underlying exception propagates and GenVM reverts the whole
#      transaction — state can never report "settled" while the
#      funds did not actually move.
#    · APPEAL WINDOW. finalize() is rejected while the window is
#      open, so neither a third party nor the winning side can lock
#      in a verdict before the losing side can appeal.
#    · IMMUTABLE EVIDENCE COMMITMENTS. The content hash of the
#      spec and of the delivery is committed on-chain at the time
#      each is pinned and is never mutated afterwards, so evidence
#      swapped behind a live URL is detectable by anyone.
#
#  Schema rules this file obeys (verified against genlayer-sdk):
#    · pinned GenVM runner in the header above
#    · __init__ assigns scalar fields only — TreeMap / DynArray
#      are declared with type annotations and left zero-initialised
#    · public method names never start with "__"
#    · nondet web + LLM calls execute INSIDE the equivalence
#      callback — direct calls from public methods are forbidden
#    · native payouts use the synchronous EVM-interface proxy
#      (runner `EthSend(...).get()`), not asynchronous GenVM
#      PostMessage. No payout exception is swallowed.
# ═══════════════════════════════════════════════════════════════


MAX_APPEALS = 2

# Appeal-window length in epoch seconds.
WINDOW_EPOCH_SECONDS = 300


class Status:
    OPEN = "OPEN"            # filed by plaintiff, awaiting delivery
    EVIDENCE = "EVIDENCE"    # delivery locked — ready for trial
    ADJUDGED = "ADJUDGED"    # verdict reached — appeal window open
    FINAL = "FINAL"          # settled, or withdrawn before evidence


# The interface has no ABI methods because only ContractProxy.emit_transfer()
# is used. The pinned runner maps this proxy to `EthSend(...).get()`, making
# EVM value delivery synchronous with the current GenVM execution.
@gl.evm.contract_interface
class NativeValueReceiver:
    class View:
        pass

    class Write:
        pass


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
    def file_dispute(
        self, task_spec_url: str, task_spec_hash: str, defendant: str
    ) -> u256:
        """
        Plaintiff opens a case. The full disputed escrow is locked in
        the same transaction (msg.value).

        task_spec_hash is an immutable commitment (sha256 hex of the
        spec content at filing time). It is stored once and can never
        be rewritten, so evidence swapped behind the URL is provable.
        Self-disputes are intentionally allowed so one account can play
        both roles while testing the workflow.
        """
        assert gl.message.value > u256(0), "escrow must be non-zero"
        assert len(task_spec_url) > 0, "task spec url required"
        assert task_spec_url.startswith("https://"), "task spec must use public https"

        defendant_address = Address(defendant)  # reverts on malformed input

        dispute_id = u256(len(self.dispute_ids))
        dispute = {
            "id": int(dispute_id),
            "plaintiff": str(gl.message.sender_address),
            "defendant": str(defendant_address),
            "task_spec_url": task_spec_url,
            "task_spec_hash": task_spec_hash,
            "delivery_url": "",
            "delivery_hash": "",
            "delivery_notes": "",
            "escrow": str(gl.message.value),
            "status": Status.OPEN,
            "appeals": 0,
            "verdict": "",
            "adjudged_at": 0,
            "appeal_deadline": 0,
            "accepted_plaintiff": False,
            "accepted_defendant": False,
            "settled": False,
        }
        self.dispute_ids.append(dispute_id)
        self._save(dispute_id, dispute)
        return dispute_id

    # ── 2 · evidence ──────────────────────────────────────────

    @gl.public.write
    def submit_delivery(
        self, dispute_id: u256, delivery_url: str, delivery_hash: str, notes: str
    ) -> None:
        """
        Defendant pins the deliverable together with its immutable
        content commitment. Only possible while the case is OPEN, so
        the commitment can never be replaced later.
        """
        d = self._load(dispute_id)
        assert d["status"] == Status.OPEN, "delivery already locked"
        assert str(gl.message.sender_address) == d["defendant"], "not the defendant"
        assert len(delivery_url) > 0, "delivery url required"
        assert delivery_url.startswith("https://"), "delivery must use public https"
        assert d["delivery_hash"] == "", "evidence commitment is immutable"

        d["delivery_url"] = delivery_url
        d["delivery_hash"] = delivery_hash
        d["delivery_notes"] = notes
        d["status"] = Status.EVIDENCE
        self._save(dispute_id, d)

    @gl.public.write
    def cancel_dispute(self, dispute_id: u256) -> None:
        """
        Plaintiff withdraws BEFORE the defendant has delivered — the
        full escrow is refunded. Failure-atomic: if the refund cannot
        execute, _payout raises and the whole call reverts, so the
        case is never marked FINAL without the money moving.
        """
        d = self._load(dispute_id)
        assert d["status"] == Status.OPEN, "too late to cancel"
        assert str(gl.message.sender_address) == d["plaintiff"], "not the plaintiff"
        assert not d["settled"], "already settled"

        amount = u256(int(d["escrow"]))

        d["verdict"] = '{"verdict":"WITHDRAWN","plaintiff_share":100,"rationale":"case withdrawn by plaintiff before evidence"}'
        d["settlement"] = {"plaintiff_award": d["escrow"], "defendant_award": "0"}
        d["settled"] = True
        d["status"] = Status.FINAL
        self._save(dispute_id, d)

        # Interaction last; any failure reverts the state written above.
        self._payout(Address(d["plaintiff"]), amount)

    # ── 3 · the trial ─────────────────────────────────────────

    @gl.public.write
    def convene_trial(self, dispute_id: u256) -> str:
        """
        The leader renders the case record from the live web and reasons
        a verdict; every other validator re-reasons independently, and
        Optimistic Democracy keeps only equivalent outcomes.

        Reaching a verdict OPENS the appeal window. Until that window
        closes (or both parties accept) nobody can finalize.
        """
        d = self._load(dispute_id)
        assert d["status"] == Status.EVIDENCE, "not ready for trial"
        assert not d["settled"], "already settled"

        # Every non-deterministic operation MUST execute inside the function
        # passed to an Equivalence Principle. GenVM rejects web access made
        # directly in a public method with SystemError: forbidden.
        verdict_json = self._jury_reason(d)
        verdict_json = self._normalize_verdict(verdict_json)

        now = self._now()
        d["verdict"] = verdict_json
        d["status"] = Status.ADJUDGED
        d["adjudged_at"] = now
        d["appeal_deadline"] = now + self._window(now) if now > 0 else 0
        d["accepted_plaintiff"] = False
        d["accepted_defendant"] = False
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

    # ── 4 · appeal window, acceptance & settlement ────────────

    @gl.public.write
    def accept_verdict(self, dispute_id: u256) -> None:
        """
        A party waives its right to appeal. Once BOTH parties have
        accepted, the appeal window is moot and anyone may finalize
        immediately — this is the fast path that avoids waiting.
        """
        d = self._load(dispute_id)
        assert d["status"] == Status.ADJUDGED, "no verdict to accept"
        assert not d["settled"], "already settled"

        caller = str(gl.message.sender_address)
        assert caller == d["plaintiff"] or caller == d["defendant"], "not a party"

        if caller == d["plaintiff"]:
            d["accepted_plaintiff"] = True
        if caller == d["defendant"]:
            d["accepted_defendant"] = True
        self._save(dispute_id, d)

    @gl.public.write.payable
    def appeal(self, dispute_id: u256) -> None:
        """
        Either party may appeal WHILE THE APPEAL WINDOW IS OPEN. The
        bond is 2x the filing fee (at most two appeals per case).
        A party that already accepted the verdict cannot appeal it.
        After appealing, convene_trial must be called again.
        """
        d = self._load(dispute_id)
        assert d["status"] == Status.ADJUDGED, "nothing to appeal"
        assert not d["settled"], "already settled"

        caller = str(gl.message.sender_address)
        assert caller == d["plaintiff"] or caller == d["defendant"], "not a party"
        assert d["appeals"] < MAX_APPEALS, "appeal limit reached"
        assert gl.message.value >= self.filing_fee * u256(2), "bond is 2x filing fee"

        # The window must still be open — this is the other half of the
        # finalize-versus-appeal race guard.
        assert not self._window_closed(d), "appeal window closed"

        if caller == d["plaintiff"]:
            assert not d["accepted_plaintiff"], "verdict already accepted"
        if caller == d["defendant"]:
            assert not d["accepted_defendant"], "verdict already accepted"

        d["appeals"] += 1
        d["status"] = Status.EVIDENCE      # a new trial may now convene
        d["verdict"] = ""                  # previous verdict is vacated
        d["adjudged_at"] = 0
        d["appeal_deadline"] = 0
        d["accepted_plaintiff"] = False
        d["accepted_defendant"] = False
        self.fees_collected += gl.message.value
        self._save(dispute_id, d)

    @gl.public.write
    def finalize(self, dispute_id: u256) -> None:
        """
        Settle an adjudged case. Callable by ANYONE, but only after the
        appeal window closed or both parties explicitly accepted — a
        third party can never front-run the losing side's appeal.

        Failure-atomic: the payouts run last and any failure reverts the
        settlement state written above, so the case cannot be marked
        FINAL unless both transfers actually executed.
        """
        d = self._load(dispute_id)
        # `settled` is checked first so a double-settle attempt always
        # reports the precise reason instead of a stale status message.
        assert not d["settled"], "already settled"
        assert d["status"] == Status.ADJUDGED, "verdict still pending"
        assert self._settlement_unlocked(d), "appeal window still open"

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
        """
        Treasury sweeps accumulated filing fees and appeal bonds.
        Failure-atomic: the counter is zeroed before the transfer, and
        a failing transfer reverts that write together with the call,
        so fees can never be marked collected without being paid out.
        """
        assert gl.message.sender_address == self.treasury, "treasury only"
        amount = self.fees_collected
        assert amount > u256(0), "nothing to collect"

        self.fees_collected = u256(0)
        self._payout(self.treasury, amount)

    # ── payout plumbing ───────────────────────────────────────
    #
    # VERIFIED against the pinned Studionet runner standard library:
    #   genlayer/gl/_internal/eth.py
    #
    # NativeValueReceiver(to).emit_transfer(value=amount) executes an
    # `EthSend` and immediately waits on `.get()`. A transfer failure raises
    # inside this same transaction, so GenVM rolls back all previous state.
    #
    # Do not use gl.get_contract_at(...).emit_transfer() for payouts here:
    # that API emits an asynchronous `PostMessage`; parent state may commit
    # before the child message later fails at contract_not_found_handler.

    def _payout(self, to_addr, amount: u256) -> None:
        if int(amount) <= 0:
            return
        NativeValueReceiver(to_addr).emit_transfer(value=amount)

    # ── appeal-window helpers ─────────────────────────────────

    def _now(self) -> int:
        """
        Consensus clock in epoch seconds, or 0 when the runner exposes no
        usable clock. ISO strings are parsed deterministically from the
        transaction context — wall-clock time is never read locally.
        """
        raw = getattr(gl, "message_raw", None)
        if raw is None:
            return 0

        value = None
        try:
            value = raw["datetime"]
        except Exception:
            value = getattr(raw, "datetime", None)
        if value is None:
            return 0

        if isinstance(value, bool):
            return 0
        if isinstance(value, int):
            return int(value)
        if isinstance(value, float):
            return int(value)

        text = str(value).strip()
        if text.endswith("Z"):
            text = text[:-1] + "+00:00"
        try:
            parsed = datetime.datetime.fromisoformat(text)
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=datetime.timezone.utc)
            return int(parsed.timestamp())
        except Exception:
            return 0

    def _window(self, now: int) -> int:
        """Appeal-window length in the same unit as the clock."""
        if now <= 0:
            return 0
        return WINDOW_EPOCH_SECONDS

    def _window_closed(self, d: dict) -> bool:
        deadline = int(d["appeal_deadline"])
        if deadline <= 0:
            return False          # no clock → window never expires by time
        now = self._now()
        if now <= 0:
            return False
        return now >= deadline

    def _settlement_unlocked(self, d: dict) -> bool:
        """
        Settlement is allowed only when the losing side can no longer
        appeal: either both parties explicitly accepted the verdict, or
        the timed appeal window has fully elapsed. There is NO shortcut
        for exhausted appeals — even after MAX_APPEALS, the window must
        still close or both parties must accept. When the runner exposes
        no consensus clock, the window never expires by time and both
        parties must accept — deliberately strict, never optimistic.
        """
        if d["accepted_plaintiff"] and d["accepted_defendant"]:
            return True
        return self._window_closed(d)

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
    def evidence_commitments(self, dispute_id: u256) -> str:
        """
        The immutable content commitments recorded when each piece of
        evidence was pinned. Anyone can re-fetch the URLs and compare.
        """
        d = self._load(dispute_id)
        return json.dumps(
            {
                "task_spec_url": d["task_spec_url"],
                "task_spec_hash": d["task_spec_hash"],
                "delivery_url": d["delivery_url"],
                "delivery_hash": d["delivery_hash"],
            }
        )

    @gl.public.view
    def settlement_status(self, dispute_id: u256) -> str:
        """Appeal-window state — what the dApp needs to gate finalize."""
        d = self._load(dispute_id)
        return json.dumps(
            {
                "status": d["status"],
                "appeals": d["appeals"],
                "max_appeals": MAX_APPEALS,
                "adjudged_at": d["adjudged_at"],
                "appeal_deadline": d["appeal_deadline"],
                "now": self._now(),
                "accepted_plaintiff": d["accepted_plaintiff"],
                "accepted_defendant": d["accepted_defendant"],
                "window_closed": self._window_closed(d),
                "can_finalize": (not d["settled"])
                and d["status"] == Status.ADJUDGED
                and self._settlement_unlocked(d),
                "settled": d["settled"],
            }
        )

    @gl.public.view
    def docket(self) -> str:
        """All dispute ids ever filed, as a JSON array."""
        return json.dumps([int(i) for i in self.dispute_ids])

    @gl.public.view
    def court_info(self) -> str:
        """Court parameters and docket size."""
        return json.dumps(
            {
                "treasury": str(self.treasury),
                "filing_fee": str(self.filing_fee),
                "appeal_bond": str(self.filing_fee * u256(2)),
                "max_appeals": MAX_APPEALS,
                "payout_mode": "evm-direct",
                "fees_collected": str(self.fees_collected),
                "cases": len(self.dispute_ids),
            }
        )

    @gl.public.view
    def debug_api_surface(self) -> str:
        """
        Read-only introspection of this runner's native-value surface.
        Deploy → call → read the output: hits reveal exactly which payout
        primitive this runner exposes. The probe only uses getattr/dir —
        it never invokes anything.
        """
        report = [
            {
                "path": "NativeValueReceiver(addr).emit_transfer",
                "mode": "evm-direct",
                "runner_command": "EthSend",
                "synchronous": True,
                "failure_atomic": True,
            },
            {
                "path": "gl.get_contract_at(addr).emit_transfer",
                "mode": "genvm-message",
                "runner_command": "PostMessage",
                "synchronous": False,
                "allowed_for_payout": False,
            },
        ]

        listing = {}
        for family, module in (
            ("evm", getattr(gl, "evm", None)),
            ("advanced", getattr(gl, "advanced", None)),
            ("gl", gl),
        ):
            if module is None:
                listing[family] = None
                continue
            try:
                names = [str(n) for n in dir(module) if not str(n).startswith("_")]
                listing[family] = names[:64]
            except Exception as e:
                listing[family] = ["<dir() unavailable: " + str(e) + ">"]

        return json.dumps({"payout": report, "members": listing})

    # ── internals ─────────────────────────────────────────────

    def _load(self, dispute_id: u256) -> dict:
        return json.loads(self._load_raw(dispute_id))

    def _load_raw(self, dispute_id: u256) -> str:
        assert int(dispute_id) < len(self.dispute_ids), "unknown dispute"
        return self.disputes[dispute_id]

    def _save(self, dispute_id: u256, dispute: dict) -> None:
        self.disputes[dispute_id] = json.dumps(dispute)
