# AgentCourt Security Review

**Last reviewed:** 2026 — configured Studionet deployment registered and payout
semantics re-audited against the pinned GenVM runner source.

This document answers the reviewer request:

> Make cancellation, settlement, and fee collection failure-atomic so state
> cannot report completion when a transfer fails; enforce an appeal window
> before third-party finalization; add runnable transfer-failure and race tests;
> add immutable evidence commitments.

## 1. Failure-Atomic Value Movement

### The asynchronous bug

`gl.get_contract_at(recipient).emit_transfer(value=amount)` is not synchronous.
On the pinned runner it creates a `PostMessage`. The parent method can commit
before the child message executes. A child transfer to an EOA can later fail at
`contract_not_found_handler` while the case already reports `FINAL`.

That design does **not** satisfy failure atomicity.

### The synchronous fix

The pinned runner also exposes an EVM contract-interface proxy. Its transfer
implementation is in:

```text
genlayerlabs/genvm
runners/genlayer-py-std/src/genlayer/gl/_internal/eth.py
```

`ContractProxy.emit_transfer()` executes:

```text
EthSend { address, calldata: b'', value }.get()
```

`.get()` waits inside the same GenVM execution. If the EVM transfer fails, the
exception propagates and the entire parent transaction reverts.

AgentCourt declares an empty native-value interface:

```python
@gl.evm.contract_interface
class NativeValueReceiver:
    class View:
        pass
    class Write:
        pass
```

All payouts use:

```python
NativeValueReceiver(recipient).emit_transfer(value=amount)
```

No exception is swallowed.

### State ordering

Each value-moving path follows checks → effects → synchronous interaction:

| Path | Effects | Final interaction |
|---|---|---|
| `cancel_dispute` | record withdrawn settlement and `FINAL` | refund plaintiff |
| `finalize` | record awards, `settled = true`, `FINAL` | transfer both awards |
| `collect_fees` | set `fees_collected = 0` | transfer treasury fees |

Because the interaction is synchronous, a failure rolls back all effects. A
second-leg split failure also rolls back the first leg as part of the same
transaction.

`court_info()` advertises `payout_mode = evm-direct`. The dApp refuses to send
escrow to a court without this capability.

## 2. Appeal Window And Finalization Race

`convene_trial` writes:

```text
status = ADJUDGED
adjudged_at = consensus clock
appeal_deadline = adjudged_at + window
accepted_plaintiff = false
accepted_defendant = false
```

Settlement is unlocked only when:

```text
both parties accepted OR appeal window elapsed
```

`finalize` asserts this gate before calculating awards. Therefore:

- a third party cannot finalize during the window;
- the winning party cannot finalize after only its own acceptance;
- the losing party retains the right to appeal;
- an appeal vacates the verdict and resets both acceptances;
- a party that accepted cannot later appeal that verdict;
- if the runner exposes no usable clock, both parties must accept.

`settlement_status()` exposes `window_closed`, `can_finalize`, deadline,
acceptances, and appeal count for the frontend.

## 3. Immutable Evidence Commitments

`file_dispute` stores:

```text
task_spec_url
task_spec_hash
```

`submit_delivery` stores:

```text
delivery_url
delivery_hash
```

Delivery can only be submitted while the case is `OPEN`, and the contract
asserts that `delivery_hash` is empty before writing. There is no method to
replace either commitment.

`evidence_commitments()` exposes both URL/hash pairs. The dApp computes SHA-256
before submitting each document **when the browser can reach the URL**
(CORS-allowed public host). Commitments are optional by design: an empty string
is valid and records "no client-side commitment" — validators still render the
evidence directly at trial time, so trials never block on client network
conditions. Once any hash is written, it cannot be overwritten.

## 4. Runnable Tests

### Offline

```bash
npm test
```

`src/lib/courtLogic.test.ts` covers:

- cancellation transfer failure rollback;
- first and second settlement transfer failure rollback;
- fee collection transfer failure rollback;
- third-party early-finalize rejection;
- winning-party front-run rejection;
- mutual acceptance and timed unlock;
- appeal reset and appeal limit;
- no-clock strict mode;
- evidence commitment immutability;
- exact escrow conservation.

`src/lib/contract.test.ts` reads the actual Python source and enforces:

- `NativeValueReceiver(...).emit_transfer(value=amount)` is used;
- asynchronous `gl.get_contract_at(...).emit_transfer()` is not used by
  `_payout`;
- no payout exception is swallowed;
- effects precede payout interaction;
- appeal and commitment guards exist;
- contract copies are byte-identical.

### Live

```bash
python -m pip install genlayer-test pytest
gltest --chain-type studionet tests/
```

See `tests/test_agent_court.py` and `tests/README.md`.

## 5. Deployment Capability Gate

Configured deployment:

```text
0xaf96D67998A52d53c2551cE58e3E8a4c310B0e6A
```

This address was supplied before the final synchronous payout audit. It must
pass:

```bash
genlayer call 0xaf96D67998A52d53c2551cE58e3E8a4c310B0e6A court_info
genlayer call 0xaf96D67998A52d53c2551cE58e3E8a4c310B0e6A debug_api_surface
```

Required values:

```text
payout_mode = evm-direct
runner_command = EthSend
synchronous = true
```

If absent, deploy the current source and replace the address before using real
escrow.

## 6. Known Limitations

- The appeal window is short for testnet demonstration. Production policy
  should scale it with value at stake.
- Evidence URLs must remain publicly available over HTTPS.
- Commitments make later changes detectable; validators do not recompute the
  browser-generated hash inside the nondeterministic jury callback because
  rendered representations can differ across validators.