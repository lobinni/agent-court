# AgentCourt

Decentralized dispute resolution for AI agents on GenLayer. A plaintiff locks
GEN escrow, a defendant commits delivered work, an LLM validator jury issues a
reasoned verdict, and settlement is protected by an appeal window.

**Last updated:** 2026 — latest Studionet deployment registered; payout path
re-audited against the GenVM runner's synchronous EVM interface.

## Network And Deployment

| Field | Value |
|---|---|
| Network | GenLayer Studionet |
| Chain ID | `61999` (`0xf22f`) |
| RPC | `https://studio.genlayer.com/api` |
| Currency | `GEN` |
| Configured deployment | `0xaf96D67998A52d53c2551cE58e3E8a4c310B0e6A` |
| Explorer | https://explorer-studio.genlayer.com/address/0xaf96D67998A52d53c2551cE58e3E8a4c310B0e6A |
| Registry | [`deployments/studionet.json`](deployments/studionet.json) |

### Important payout compatibility notice

The configured address was deployed before the final payout audit unless its
`court_info()` result contains:

```json
{"payout_mode":"evm-direct"}
```

The dApp checks this capability before every value-bearing signature. If it is
absent, escrow actions are blocked. Deploy the current
`contracts/agent_court.py`, update `VITE_COURT_ADDRESS`, and rebuild.

This guard exists because the earlier `gl.get_contract_at(...).emit_transfer()`
path creates an asynchronous GenVM `PostMessage`. Its parent call may complete
before child delivery later fails. The current source uses
`@gl.evm.contract_interface` and `NativeValueReceiver(...).emit_transfer()`,
which executes synchronous `EthSend(...).get()` in the pinned runner.

## Quick Start

```bash
npm install
npm test
npm run dev
```

Open `http://localhost:5173`, connect MetaMask, and switch to Studionet. The app
performs a contract existence and capability preflight before requesting any
transaction signature.

## Environment

```env
VITE_COURT_ADDRESS=0xaf96D67998A52d53c2551cE58e3E8a4c310B0e6A
```

`.env` is local and ignored by Git. `.env.example` and
`deployments/studionet.json` contain the public configured address.

## Contract Workflow

```text
file_dispute
  -> OPEN
  -> submit_delivery
  -> EVIDENCE
  -> convene_trial
  -> ADJUDGED
       -> appeal -> EVIDENCE -> new trial
       -> both parties accept -> settlement unlocked
       -> appeal window closes -> settlement unlocked
  -> finalize
  -> FINAL
```

Pre-delivery cancellation:

```text
OPEN -> cancel_dispute -> synchronous refund -> FINAL
```

## Reviewer Requirements

### Failure-atomic cancellation

`cancel_dispute` updates state and then performs a synchronous EVM transfer.
`EthSend(...).get()` propagates failure into the same GenVM execution, reverting
all storage writes. The case cannot report `FINAL` when refund delivery fails.

### Failure-atomic settlement

`finalize` calculates both awards, records settlement, and performs both
synchronous EVM transfers. If either transfer fails, the complete transaction
reverts, including prior storage writes and the first transfer leg.

### Failure-atomic fee collection

`collect_fees` clears the counter and performs a synchronous treasury transfer.
A transfer failure reverts the counter update, keeping the fees claimable.

### Appeal window before third-party finalization

`finalize` requires either:

- both parties accepted the verdict; or
- the appeal window has elapsed.

A third party and the winning party are both blocked while the losing party's
appeal right is open. One-sided acceptance does not unlock settlement.

### Immutable evidence commitments

The task specification and delivery each include a SHA-256 commitment at the
time they are pinned. A second delivery cannot replace the original commitment.

See [`docs/security.md`](docs/security.md) for the implementation audit.

## Contract Methods

| Method | Caller | Purpose |
|---|---|---|
| `file_dispute` | Plaintiff | Lock escrow and commit the task specification |
| `submit_delivery` | Defendant | Commit delivery URL, hash, and notes |
| `cancel_dispute` | Plaintiff | Cancel before delivery and atomically refund |
| `convene_trial` | Anyone | Run web and LLM judgment inside consensus |
| `accept_verdict` | Either party | Waive that party's appeal right |
| `appeal` | Either party | Post bond and vacate the current verdict |
| `finalize` | Anyone | Atomically split escrow after settlement unlocks |
| `collect_fees` | Treasury | Atomically collect appeal bonds |
| `get_dispute` | Anyone | Read the full case record |
| `get_verdict` | Anyone | Read the verdict |
| `evidence_commitments` | Anyone | Read immutable evidence commitments |
| `settlement_status` | Anyone | Read appeal and finalization state |
| `docket` | Anyone | Read all dispute IDs |
| `court_info` | Anyone | Read capabilities, fees, and case count |
| `debug_api_surface` | Anyone | Read the selected payout transport |

## Testing

Offline regression suite:

```bash
npm test
```

The suite includes:

- executable state-machine tests for transfer failure rollback;
- first-leg and second-leg settlement failure tests;
- cancellation and fee collection failure tests;
- finalize-versus-appeal race tests;
- no-clock strict settlement behavior;
- immutable commitment and access-control tests;
- static contract-source guards that reject asynchronous payout regression;
- deployment registry and environment consistency tests.

Live contract tests:

```bash
python -m pip install genlayer-test pytest
gltest --chain-type studionet tests/
```

Documentation:

- [`tests/README.md`](tests/README.md)
- [`docs/test.md`](docs/test.md)
- [`docs/live-test.md`](docs/live-test.md)
- [`docs/security.md`](docs/security.md)
- [`samples/README.md`](samples/README.md)

## Deploy The Audited Contract

### Studio

1. Open https://studio.genlayer.com.
2. Paste all of `contracts/agent_court.py` into a new contract.
3. Deploy with empty constructor arguments: `[]`.
4. Call `court_info()` and require `payout_mode = evm-direct`.
5. Call `debug_api_surface()` and require `synchronous = true` with
   `runner_command = EthSend`.
6. Update `.env`, `.env.example`, `deployments/studionet.json`, and Vercel.
7. Run `npm test` and `npm run build`.

### CLI

```bash
npm install -g genlayer
genlayer network studionet
genlayer deploy --contract contracts/agent_court.py
genlayer call 0xCOURT court_info
genlayer call 0xCOURT debug_api_surface
```

## Push To GitHub

New repository:

```bash
git init
git add .
git commit -m "AgentCourt: synchronous atomic payouts, appeal protection, and deployment docs"
git branch -M main
git remote add origin https://github.com/YOUR_USER/agent-court.git
git push -u origin main
```

Existing repository:

```bash
git status
git add .
git commit -m "Register Studionet deployment and complete the security audit"
git push origin main
```

## Deploy To Vercel

This is a static Vite dApp. It has no database.

1. Import the GitHub repository in Vercel.
2. Framework: **Vite**.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Add:

   ```env
   VITE_COURT_ADDRESS=0xaf96D67998A52d53c2551cE58e3E8a4c310B0e6A
   ```

6. Do not add `DATABASE_URL`, `POSTGRES_*`, or `PRISMA_*`.
7. Redeploy after every court-address change.

## Project Structure

```text
contracts/agent_court.py       Canonical Intelligent Contract
public/contracts/              Browser-deployable contract copy
deployments/                   Network registry and history
tests/                         Live GenLayer tests and instructions
samples/                       Public test evidence fixtures
docs/security.md               Security audit and payout semantics
docs/test.md                   Manual end-to-end test guide
docs/live-test.md              Studionet scenario runbook
src/lib/courtLogic.ts          Executable state-machine model
src/lib/contract.test.ts       Contract source regression guards
src/lib/courtLogic.test.ts     Atomicity and race-condition tests
src/components/LiveCourt.tsx   Live-only dApp console
```