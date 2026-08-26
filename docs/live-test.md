# AgentCourt · Live Test Runbook on Studionet

On-chain end-to-end scenarios for the deployed contract:

- Court: `0x9048d2597D799746A39444bd64318Ff92896B667` v1.2.0 (Studionet, id 61999)
- Explorer: https://explorer-studio.genlayer.com/address/0x9048d2597D799746A39444bd64318Ff92896B667

Each scenario ships as **ready-made public documents** in `samples/`:
`task_spec.md` (what was promised) + `delivery.md` (what was delivered).
The jury fetches both with `gl.nondet.web.render` during `convene_trial`,
so the URLs must be publicly reachable over HTTPS.

## Step 0 — Make the fixtures public

1. Push this repo to GitHub:
   ```
   git push -u origin main
   ```
2. Compose raw URLs:
   ```
   https://raw.githubusercontent.com/<you>/<repo>/main/samples/<scenario>/<file>.md
   ```
   Verify each opens in an incognito tab (validators fetch anonymously).
3. Alternative hosting also works: GitHub Gist (Raw), IPFS gateways —
   anything plain-text over HTTPS.

## Scenario matrix

| # | Case | Spec | Delivery | Escrow (test) | Expected verdict | Share → plaintiff | Rationale anchor |
|---|---|---|---|---|---|---|---|
| S1 | Material breach | `s1-breach/task_spec.md` | `s1-breach/delivery.md` | 10 GEN | `PLAINTIFF_WINS` | 100 | 4/5 objective clauses fail |
| S2 | Full compliance | `s2-compliant/task_spec.md` | `s2-compliant/delivery.md` | 10 GEN | `DEFENDANT_WINS` | 0 | all 5 clauses satisfied |
| S3 | Subjective quality | `s3-subjective/task_spec.md` | `s3-subjective/delivery.md` | 10 GEN | `SPLIT` | 1–99 (see note) | partial compliance without a hard gate |

> Share note (S3): verdict type is stable, but `plaintiff_share` varies
> with the jury — the equivalence band (verdict identical, share ±10)
> is exactly what Optimistic Democracy is for. Record the exact share
> the chain returned; it is the correct answer for that trial.
>
> If a model jury unexpectedly disagrees with the table, that's signal —
> re-run `convene_trial`; the equivalence principle should restabilize.

## Run via the dApp (recommended)

Courtroom → **Live · Studionet 61999** → two MetaMask accounts A/B.

1. **A** fills: spec URL (from your raw link), defendant = B address,
   escrow = 10 GEN → **Lock escrow & open case** → case appears OPEN.
2. **B** (switch account) → pin `delivery.md` URL + notes → EVIDENCE.
3. Anyone → **Convene the trial** (~2–5 min while validators fetch + vote).
4. Read the verdict card → compare with the matrix above.
5. **Optional appeal** (either party, 50 GEN bond from `court_info`) →
   re-convene → the enlarged panel re-judges.
6. **Finalize & settle escrow** → verify:
   - card shows `settled → award → defendant/`amount` per share;
   - both wallet balances moved by exactly the split.
7. Cross-check every tx hash on the explorer (status ACCEPTED/FINALIZED).

Contract v1.1.0 is required. Its `judge()` callback contains both web renders
and the LLM call, and that callback is passed to `prompt_comparative`. GenVM
forbids non-deterministic web access directly from a public write method.

### Extra circuit checks (logic stability)

- **Cancel path**: file a fourth case as A and click
  *Cancel · refund escrow* **before** B delivers → status FINAL,
  verdict `WITHDRAWN`, escrow back to A. Submitting delivery after
  cancel must now revert (status is FINAL).
- **Access control reverts** (expected failures, no state change):
  - `file_dispute` with zero `value` → "escrow must be non-zero"
  - A calls `submit_delivery` → "not the defendant"
  - third account calls `appeal` → "not a party"
  - `finalize` while EVIDENCE → "verdict still pending"
  - second `finalize` after settlement → "already settled"
  - third `appeal` (after 2) → "appeal limit reached"

> Self-disputes are intentionally allowed: one account can play both the
> plaintiff and defendant roles — perfect for single-wallet smoke testing.
> Settlement then returns the escrow split to the same address (net zero).
- The dApp blocks none of these client-side beyond the UI hints — the
  contract itself must revert. Failed txs appear in the session log.

## Run via CLI (optional, same flow)

```bash
genlayer network studionet

COURT=0x9048d2597D799746A39444bd64318Ff92896B667
SPEC="https://raw.githubusercontent.com/<you>/<repo>/main/samples/s1-breach/task_spec.md"
DELIV="https://raw.githubusercontent.com/<you>/<repo>/main/samples/s1-breach/delivery.md"

# 1 · file (plaintiff) — escrow = 10 GEN
genlayer write $COURT file_dispute --value 10 "$SPEC" "0xDefendantAgent"

# 2 · defendant pins delivery
genlayer write $COURT submit_delivery 0 "$DELIV" "shipped as reported"

# 3 · jury — watch ~2–5 min
genlayer write $COURT convene_trial 0
genlayer call  $COURT get_dispute 0
# expect verdict: PLAINTIFF_WINS, plaintiff_share: 100

# 4 · appeal + enlarged panel (optional)
genlayer write $COURT appeal 0 --value 50
genlayer write $COURT convene_trial 0

# 5 · settle
genlayer write $COURT finalize 0
genlayer call  $COURT get_dispute 0
# expect settlement.plaintiff_award = full escrow for S1

# 6 · court economics
genlayer call  $COURT court_info
# fees_collected grows by each appeal bond
```

## Expected timeline per trial

| Stage | Typical duration |
|---|---|
| tx → ACCEPTED (writes) | 20–60 s |
| `convene_trial` → ACCEPTED | 2–5 min (LLM voting rounds) |
| `convene_trial` → FINALIZED (appealable window) | +1–3 min |
| Payout execution after `finalize` | ≤ 1 finalization cycle |

## PASS criteria

- S1 verdict `PLAINTIFF_WINS`, share 100, rationale cites failed clauses 1–3;
  settle moves the **entire** escrow back to A.
- S2 verdict `DEFENDANT_WINS`, share 0; escrow released fully to B.
- S3 verdict `SPLIT`, share in 1..99, rationale references the subjective
  clause — split awards match the share exactly (integer math, no dust).
- Cancel refunds 100% pre-evidence; every access-control revert above
  actually reverts with the documented message.
- `court_info` counters (`fees_collected`, `cases`, `appeal_bond`) behave
  exactly as documented alongside the actions.
