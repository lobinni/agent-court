# AgentCourt Live Test Runbook — Studionet

**Last updated:** 2026 — configured deployment and synchronous payout preflight.

```text
Network:  GenLayer Studionet
Chain ID: 61999
RPC:      https://studio.genlayer.com/api
Court:    0xaf96D67998A52d53c2551cE58e3E8a4c310B0e6A
Explorer: https://explorer-studio.genlayer.com/address/0xaf96D67998A52d53c2551cE58e3E8a4c310B0e6A
```

## Preflight

```bash
genlayer network studionet
COURT=0xaf96D67998A52d53c2551cE58e3E8a4c310B0e6A
genlayer call $COURT court_info
genlayer call $COURT debug_api_surface
genlayer call $COURT docket
```

Do not send escrow unless:

```text
payout_mode = evm-direct
runner_command = EthSend
synchronous = true
```

If the configured deployment lacks these fields, deploy the current contract
source and replace `COURT`.

## Publish Test Fixtures

Push this repository publicly and build raw URLs:

```bash
SPEC=https://raw.githubusercontent.com/<account>/<repo>/main/samples/s1-breach/task_spec.md
DELIVERY=https://raw.githubusercontent.com/<account>/<repo>/main/samples/s1-breach/delivery.md
```

Confirm both URLs open without authentication.

## Scenario Matrix

| Scenario | Spec | Delivery | Expected verdict |
|---|---|---|---|
| Material breach | `samples/s1-breach/task_spec.md` | `samples/s1-breach/delivery.md` | `PLAINTIFF_WINS`, share 100 |
| Full compliance | `samples/s2-compliant/task_spec.md` | `samples/s2-compliant/delivery.md` | `DEFENDANT_WINS`, share 0 |
| Subjective quality | `samples/s3-subjective/task_spec.md` | `samples/s3-subjective/delivery.md` | `SPLIT`, share 1..99 |

## CLI Workflow

Compute real SHA-256 commitments for the files you publish, then:

```bash
# account A: file with small test escrow
genlayer write $COURT file_dispute \
  --value 10 \
  "$SPEC" \
  "sha256:<SPEC_HASH>" \
  "0xDEFENDANT"

# account B: submit delivery
genlayer write $COURT submit_delivery \
  0 \
  "$DELIVERY" \
  "sha256:<DELIVERY_HASH>" \
  "delivered for live test"

# anyone: jury
genlayer write $COURT convene_trial 0
genlayer call $COURT get_dispute 0
genlayer call $COURT settlement_status 0
```

Choose appeal or acceptance:

```bash
# appeal while window is open
genlayer write $COURT appeal 0 --value 50
genlayer write $COURT convene_trial 0

# or: both parties accept the current verdict
genlayer write $COURT accept_verdict 0   # account A
genlayer write $COURT accept_verdict 0   # account B
```

Then settle:

```bash
genlayer call $COURT settlement_status 0  # can_finalize must be true
genlayer write $COURT finalize 0
genlayer call $COURT get_dispute 0
```

## Failure-Atomic Acceptance Criteria

| Test | Required result |
|---|---|
| Cancellation transfer fails | Case remains `OPEN`, not `FINAL` |
| First settlement transfer fails | Case remains `ADJUDGED`, unsettled |
| Second settlement transfer fails | Whole settlement rolls back; no first-leg persistence |
| Fee sweep fails | `fees_collected` remains unchanged |
| Third party finalizes early | Revert: appeal window still open |
| Only one party accepts | Finalization remains locked |
| Both parties accept | `can_finalize = true` |
| Delivery resubmitted | Revert; original evidence hash remains unchanged |

## DApp Workflow

The browser is live-only. It performs the same steps and validates the contract
before every MetaMask signature. An incompatible court is detached and escrow
actions are blocked.