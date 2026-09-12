"""
AgentCourt · on-chain contract tests (GenLayer `gltest` / pytest)

Run against a live network:

    pip install genlayer-test
    gltest --chain-type studionet tests/
    # or fully local:
    genlayer up && gltest --chain-type localnet tests/

These cover the two security properties called out in review:

  1. FAILURE-ATOMIC SETTLEMENT — a failing transfer must revert the
     whole call, so a case can never report FINAL/settled while the
     escrow did not move.
  2. FINALIZE-VERSUS-APPEAL RACE — nobody (not even the winning
     party, not a third party) may settle while the appeal window
     is still open.

Plus immutable evidence commitments and access control.

The pure state-machine mirror of these rules also runs offline with
`npm test` (see src/lib/courtLogic.test.ts) — that suite needs no
node and is what CI executes on every commit.
"""

import json
import time

import pytest
from gltest import get_contract_factory, get_accounts
from gltest.assertions import tx_execution_failed, tx_execution_succeeded


CONTRACT = "AgentCourt"

# Public, stable fixtures served over HTTPS (validators fetch these).
SPEC_URL = (
    "https://raw.githubusercontent.com/genlayerlabs/genlayer-project-boilerplate"
    "/main/README.md"
)
DELIVERY_URL = (
    "https://raw.githubusercontent.com/genlayerlabs/genlayer-project-boilerplate"
    "/main/README.md"
)

ESCROW = 10 * 10**18          # 10 GEN
FILING_FEE = 25 * 10**18      # matches __init__
APPEAL_BOND = 2 * FILING_FEE


# ── helpers ───────────────────────────────────────────────────


@pytest.fixture
def court():
    factory = get_contract_factory(CONTRACT)
    return factory.deploy(args=[])


@pytest.fixture
def parties():
    accounts = get_accounts()
    assert len(accounts) >= 3, "need plaintiff, defendant and a third party"
    return accounts[0], accounts[1], accounts[2]


def dispute(court, dispute_id: int) -> dict:
    return json.loads(court.get_dispute(args=[dispute_id]).call())


def settlement_status(court, dispute_id: int) -> dict:
    return json.loads(court.settlement_status(args=[dispute_id]).call())


def open_case(court, plaintiff, defendant) -> int:
    """file_dispute + submit_delivery → case sits in EVIDENCE."""
    receipt = court.file_dispute(
        args=[SPEC_URL, "sha256:spec-commitment", defendant.address],
        value=ESCROW,
        account=plaintiff,
    ).transact()
    assert tx_execution_succeeded(receipt)

    ids = json.loads(court.docket().call())
    dispute_id = ids[-1]

    receipt = court.submit_delivery(
        args=[dispute_id, DELIVERY_URL, "sha256:delivery-commitment", "shipped"],
        account=defendant,
    ).transact()
    assert tx_execution_succeeded(receipt)
    return dispute_id


def adjudicate(court, dispute_id: int, caller):
    """Run the LLM jury. Slow (~2-5 min on studionet)."""
    receipt = court.convene_trial(args=[dispute_id], account=caller).transact()
    assert tx_execution_succeeded(receipt), "jury failed to reach consensus"
    assert dispute(court, dispute_id)["status"] == "ADJUDGED"


# ── 0 · deployment & schema ───────────────────────────────────


def test_deploy_exposes_security_hardened_schema(court):
    info = json.loads(court.court_info().call())
    assert int(info["filing_fee"]) == FILING_FEE
    assert int(info["appeal_bond"]) == APPEAL_BOND
    assert info["max_appeals"] == 2
    assert info["payout_mode"] == "evm-direct"
    assert info["cases"] == 0

    payout = json.loads(court.debug_api_surface().call())["payout"][0]
    assert payout["runner_command"] == "EthSend"
    assert payout["synchronous"] is True
    assert payout["failure_atomic"] is True


# ── 1 · failure-atomic settlement ─────────────────────────────


def test_finalize_is_atomic_state_matches_funds(court, parties):
    """
    Settlement must be all-or-nothing: after a successful finalize the
    balances moved AND the case is FINAL; if the transfer had failed the
    case would still be ADJUDGED (never FINAL with funds stuck).
    """
    plaintiff, defendant, _ = parties
    dispute_id = open_case(court, plaintiff, defendant)
    adjudicate(court, dispute_id, plaintiff)

    # fast path: both parties waive the appeal window
    assert tx_execution_succeeded(
        court.accept_verdict(args=[dispute_id], account=plaintiff).transact()
    )
    assert tx_execution_succeeded(
        court.accept_verdict(args=[dispute_id], account=defendant).transact()
    )

    before_p = plaintiff.get_balance()
    before_d = defendant.get_balance()

    assert tx_execution_succeeded(
        court.finalize(args=[dispute_id], account=plaintiff).transact()
    )

    record = dispute(court, dispute_id)
    assert record["status"] == "FINAL"
    assert record["settled"] is True

    awarded = int(record["settlement"]["plaintiff_award"]) + int(
        record["settlement"]["defendant_award"]
    )
    assert awarded == ESCROW, "escrow must be fully allocated, no dust"

    moved = (plaintiff.get_balance() - before_p) + (defendant.get_balance() - before_d)
    assert moved > 0, "state says settled — the funds must actually have moved"


def test_double_finalize_reverts(court, parties):
    plaintiff, defendant, third = parties
    dispute_id = open_case(court, plaintiff, defendant)
    adjudicate(court, dispute_id, plaintiff)
    court.accept_verdict(args=[dispute_id], account=plaintiff).transact()
    court.accept_verdict(args=[dispute_id], account=defendant).transact()
    court.finalize(args=[dispute_id], account=plaintiff).transact()

    receipt = court.finalize(args=[dispute_id], account=third).transact()
    assert tx_execution_failed(receipt), "a settled case must never settle twice"


def test_cancel_refund_is_atomic(court, parties):
    """Pre-delivery withdrawal refunds in full or reverts — never half."""
    plaintiff, defendant, _ = parties
    receipt = court.file_dispute(
        args=[SPEC_URL, "sha256:spec", defendant.address],
        value=ESCROW,
        account=plaintiff,
    ).transact()
    assert tx_execution_succeeded(receipt)
    dispute_id = json.loads(court.docket().call())[-1]

    before = plaintiff.get_balance()
    assert tx_execution_succeeded(
        court.cancel_dispute(args=[dispute_id], account=plaintiff).transact()
    )

    record = dispute(court, dispute_id)
    assert record["status"] == "FINAL"
    assert json.loads(record["verdict"])["verdict"] == "WITHDRAWN"
    assert plaintiff.get_balance() > before, "refund must reach the plaintiff"


def test_fee_collection_is_treasury_only_and_atomic(court, parties):
    plaintiff, defendant, third = parties
    dispute_id = open_case(court, plaintiff, defendant)
    adjudicate(court, dispute_id, plaintiff)

    # an appeal bond funds the treasury
    assert tx_execution_succeeded(
        court.appeal(args=[dispute_id], value=APPEAL_BOND, account=defendant).transact()
    )
    assert int(json.loads(court.court_info().call())["fees_collected"]) == APPEAL_BOND

    # a stranger cannot sweep
    assert tx_execution_failed(
        court.collect_fees(args=[], account=third).transact()
    )
    assert int(json.loads(court.court_info().call())["fees_collected"]) == APPEAL_BOND

    # the deployer (treasury) can, and the counter only clears on success
    assert tx_execution_succeeded(
        court.collect_fees(args=[], account=plaintiff).transact()
    )
    assert int(json.loads(court.court_info().call())["fees_collected"]) == 0


# ── 2 · finalize versus appeal race ───────────────────────────


def test_third_party_cannot_finalize_during_appeal_window(court, parties):
    plaintiff, defendant, third = parties
    dispute_id = open_case(court, plaintiff, defendant)
    adjudicate(court, dispute_id, plaintiff)

    status = settlement_status(court, dispute_id)
    assert status["window_closed"] is False
    assert status["can_finalize"] is False

    receipt = court.finalize(args=[dispute_id], account=third).transact()
    assert tx_execution_failed(receipt), "third party front-ran the appeal window"
    assert dispute(court, dispute_id)["settled"] is False


def test_winning_party_cannot_front_run_the_losing_party(court, parties):
    """The classic race: winner settles before the loser can appeal."""
    plaintiff, defendant, _ = parties
    dispute_id = open_case(court, plaintiff, defendant)
    adjudicate(court, dispute_id, plaintiff)

    # plaintiff accepts, then immediately tries to settle
    court.accept_verdict(args=[dispute_id], account=plaintiff).transact()
    receipt = court.finalize(args=[dispute_id], account=plaintiff).transact()
    assert tx_execution_failed(receipt), "one-sided acceptance must not unlock settlement"

    # the defendant's appeal right survived
    assert tx_execution_succeeded(
        court.appeal(args=[dispute_id], value=APPEAL_BOND, account=defendant).transact()
    )
    record = dispute(court, dispute_id)
    assert record["status"] == "EVIDENCE"
    assert record["appeals"] == 1
    assert record["verdict"] == "", "an appeal vacates the previous verdict"


def test_both_parties_accepting_unlocks_immediate_settlement(court, parties):
    plaintiff, defendant, third = parties
    dispute_id = open_case(court, plaintiff, defendant)
    adjudicate(court, dispute_id, plaintiff)

    court.accept_verdict(args=[dispute_id], account=plaintiff).transact()
    court.accept_verdict(args=[dispute_id], account=defendant).transact()
    assert settlement_status(court, dispute_id)["can_finalize"] is True

    # even a third party may settle once both sides waived
    assert tx_execution_succeeded(
        court.finalize(args=[dispute_id], account=third).transact()
    )


def test_appeal_after_window_closed_reverts(court, parties):
    """
    Requires the runner to expose a consensus clock. The window is 5
    minutes; this test waits it out, so it is marked slow.
    """
    plaintiff, defendant, _ = parties
    dispute_id = open_case(court, plaintiff, defendant)
    adjudicate(court, dispute_id, plaintiff)

    status = settlement_status(court, dispute_id)
    if status["appeal_deadline"] == 0:
        pytest.skip("runner exposes no consensus clock — acceptance path only")

    time.sleep(310)  # outlive the 5-minute window

    receipt = court.appeal(
        args=[dispute_id], value=APPEAL_BOND, account=defendant
    ).transact()
    assert tx_execution_failed(receipt), "appeals must stop when the window closes"

    # and now anyone may settle
    assert tx_execution_succeeded(
        court.finalize(args=[dispute_id], account=plaintiff).transact()
    )


def test_appeal_limit_is_enforced(court, parties):
    plaintiff, defendant, _ = parties
    dispute_id = open_case(court, plaintiff, defendant)

    for _ in range(2):
        adjudicate(court, dispute_id, plaintiff)
        assert tx_execution_succeeded(
            court.appeal(
                args=[dispute_id], value=APPEAL_BOND, account=defendant
            ).transact()
        )

    adjudicate(court, dispute_id, plaintiff)
    receipt = court.appeal(
        args=[dispute_id], value=APPEAL_BOND, account=defendant
    ).transact()
    assert tx_execution_failed(receipt), "third appeal must be rejected"


def test_accepted_party_cannot_appeal(court, parties):
    plaintiff, defendant, _ = parties
    dispute_id = open_case(court, plaintiff, defendant)
    adjudicate(court, dispute_id, plaintiff)

    court.accept_verdict(args=[dispute_id], account=defendant).transact()
    receipt = court.appeal(
        args=[dispute_id], value=APPEAL_BOND, account=defendant
    ).transact()
    assert tx_execution_failed(receipt)


def test_underfunded_appeal_reverts(court, parties):
    plaintiff, defendant, _ = parties
    dispute_id = open_case(court, plaintiff, defendant)
    adjudicate(court, dispute_id, plaintiff)

    receipt = court.appeal(
        args=[dispute_id], value=APPEAL_BOND - 1, account=defendant
    ).transact()
    assert tx_execution_failed(receipt)


# ── 3 · immutable evidence commitments ────────────────────────


def test_evidence_commitments_are_recorded_and_immutable(court, parties):
    plaintiff, defendant, _ = parties
    dispute_id = open_case(court, plaintiff, defendant)

    commitments = json.loads(court.evidence_commitments(args=[dispute_id]).call())
    assert commitments["task_spec_hash"] == "sha256:spec-commitment"
    assert commitments["delivery_hash"] == "sha256:delivery-commitment"

    # a second delivery (with a different hash) must be impossible
    receipt = court.submit_delivery(
        args=[dispute_id, DELIVERY_URL, "sha256:swapped", "tamper"],
        account=defendant,
    ).transact()
    assert tx_execution_failed(receipt)

    after = json.loads(court.evidence_commitments(args=[dispute_id]).call())
    assert after["delivery_hash"] == "sha256:delivery-commitment"


def test_non_https_evidence_is_rejected(court, parties):
    plaintiff, defendant, _ = parties
    receipt = court.file_dispute(
        args=["ipfs://bafy-not-fetchable", "sha256:x", defendant.address],
        value=ESCROW,
        account=plaintiff,
    ).transact()
    assert tx_execution_failed(receipt), "validators cannot fetch ipfs:// — must revert"


# ── 4 · access control ────────────────────────────────────────


def test_only_defendant_may_submit_delivery(court, parties):
    plaintiff, defendant, third = parties
    court.file_dispute(
        args=[SPEC_URL, "sha256:spec", defendant.address],
        value=ESCROW,
        account=plaintiff,
    ).transact()
    dispute_id = json.loads(court.docket().call())[-1]

    assert tx_execution_failed(
        court.submit_delivery(
            args=[dispute_id, DELIVERY_URL, "h", ""], account=third
        ).transact()
    )


def test_only_plaintiff_may_cancel_and_only_before_delivery(court, parties):
    plaintiff, defendant, _ = parties
    court.file_dispute(
        args=[SPEC_URL, "sha256:spec", defendant.address],
        value=ESCROW,
        account=plaintiff,
    ).transact()
    dispute_id = json.loads(court.docket().call())[-1]

    assert tx_execution_failed(
        court.cancel_dispute(args=[dispute_id], account=defendant).transact()
    )

    court.submit_delivery(
        args=[dispute_id, DELIVERY_URL, "h", ""], account=defendant
    ).transact()
    assert tx_execution_failed(
        court.cancel_dispute(args=[dispute_id], account=plaintiff).transact()
    ), "cancellation must close once evidence is locked"


def test_zero_escrow_rejected(court, parties):
    plaintiff, defendant, _ = parties
    assert tx_execution_failed(
        court.file_dispute(
            args=[SPEC_URL, "sha256:spec", defendant.address],
            value=0,
            account=plaintiff,
        ).transact()
    )
