# AgentCourt Manual Test Guide

End-to-end testing for the live-only dApp and contract on GenLayer Studionet.

**Last updated:** 2026 — configured deployment and reviewer requirements
re-audited.

| Field | Value |
|---|---|
| Network | GenLayer Studionet |
| Chain ID | `61999` (`0xf22f`) |
| RPC | `https://studio.genlayer.com/api` |
| Court | `0xaf96D67998A52d53c2551cE58e3E8a4c310B0e6A` |
| Explorer | https://explorer-studio.genlayer.com/address/0xaf96D67998A52d53c2551cE58e3E8a4c310B0e6A |

## 1. Install And Run

```bash
npm install
npm test
npm run dev
```

Open `http://localhost:5173`.

## 2. Wallet And Network

1. Install MetaMask.
2. Click **Connect**.
3. Add or switch to Studionet.
4. Confirm chain ID `61999` and RPC `https://studio.genlayer.com/api`.
5. Use the faucet in the Studio account selector to fund the wallet.

The app polls wallet account and network state every 2.5 seconds.

## 3. Mandatory Court Preflight

Before sending any GEN, run:

```bash
genlayer network studionet
genlayer call 0xaf96D67998A52d53c2551cE58e3E8a4c310B0e6A court_info
genlayer call 0xaf96D67998A52d53c2551cE58e3E8a4c310B0e6A debug_api_surface
genlayer call 0xaf96D67998A52d53c2551cE58e3E8a4c310B0e6A docket
```

Required capabilities:

```text
court_info.payout_mode = evm-direct
debug_api_surface.payout[0].runner_command = EthSend
debug_api_surface.payout[0].synchronous = true
```

If any field is absent, the address was deployed before the final payout audit.
Do not send escrow. Deploy the current `contracts/agent_court.py` first.

The frontend performs the same preflight and blocks MetaMask signatures for a
missing or incompatible court.

## 4. Prepare Evidence

Use two public HTTPS raw files:

- task specification;
- delivery report.

Sample fixtures are in `samples/`. Publish the repository and use raw GitHub
URLs. Confirm both URLs work without authentication.

The frontend computes a SHA-256 commitment for each document **when the URL is
readable from the browser** (CORS-allowed public host — raw GitHub/Gist URLs
work). Commitments are **optional**: if the browser cannot fetch the URL, the
frontend files without one and logs that choice. GenLayer validators fetch the
live URL directly at trial time regardless, so trials still proceed. Whatever
hash is recorded on-chain is immutable and cannot be overwritten afterwards.

## 5. File A Case

Using account A:

1. Enter the task specification URL.
2. Enter account B as defendant.
3. Start with a small escrow amount.
4. Click **Lock escrow & open case**.
5. Confirm transaction stages reach `ACCEPTED` or `FINALIZED`.
6. Confirm the case appears as `OPEN`.

## 6. Test Cancellation

Before delivery, account A clicks **Cancel · refund escrow**.

PASS criteria:

- refund reaches account A;
- status becomes `FINAL`;
- verdict is `WITHDRAWN`;
- a second cancel fails;
- if payout fails, state must remain `OPEN`, not `FINAL`.

The last criterion is the failure-atomic reviewer requirement.

## 7. Submit Delivery

For a new case, switch to account B:

1. Enter the delivery URL and notes.
2. Submit delivery.
3. Confirm status becomes `EVIDENCE`.
4. Confirm `evidence_commitments()` returns both URL/hash pairs.
5. Attempting a second delivery must fail.

## 8. Convene Trial

Any account may call **Convene the trial**.

The jury call may take several minutes because validators fetch evidence and
run LLM reasoning. PASS criteria:

- transaction succeeds;
- status becomes `ADJUDGED`;
- verdict JSON contains `verdict`, `plaintiff_share`, and `rationale`;
- `settlement_status.can_finalize` is initially false;
- the appeal window is open.

## 9. Test The Finalize-Versus-Appeal Race

Immediately after the verdict:

1. A third account attempts `finalize` — it must fail.
2. Only the winning party accepts — `finalize` must still fail.
3. The losing party appeals during the window — it must succeed.
4. Case returns to `EVIDENCE`, the old verdict is cleared, and acceptances are
   reset.

This proves neither a third party nor the winning party can front-run appeal.

## 10. Settlement Paths

After a fresh verdict, choose one:

- both parties call **Accept verdict**; or
- wait until the appeal window closes.

Then call **Finalize & settle escrow**.

PASS criteria:

- both wallet awards equal the recorded settlement;
- awards sum exactly to escrow;
- case becomes `FINAL` only after transfers succeed;
- a failed first or second transfer leaves the case `ADJUDGED` and unsettled;
- a second finalize fails.

## 11. Fee Collection

After an appeal bond is collected:

1. A non-treasury account calls `collect_fees` — must fail.
2. Treasury calls `collect_fees` — transfer succeeds and counter becomes zero.
3. Under forced transfer failure, the counter must remain unchanged.

## 12. Explorer Verification

Inspect every transaction hash at https://explorer-studio.genlayer.com.

For payout transactions, verify the contract uses an EVM `EthSend` path. A
child `PostMessage` to an EOA is not an atomic payout and must not be treated as
successful settlement.

## 13. Automated Coverage

```bash
npm test
python -m pip install genlayer-test pytest
gltest --chain-type studionet tests/
```

See `tests/README.md` for test installation and expected results.