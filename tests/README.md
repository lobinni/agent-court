# Contract Test Guide

**Last updated:** 2026 — Studionet deployment and synchronous payout audit.

## Offline Tests

```bash
npm install
npm test
```

Coverage includes:

- failure-atomic cancellation, settlement, and fee collection;
- first- and second-transfer failure rollback;
- finalize-versus-appeal race prevention;
- mutual verdict acceptance and timed settlement unlock;
- no-clock strict behavior;
- immutable evidence commitments;
- access control and dust-free escrow arithmetic;
- static guards requiring synchronous `EthSend`, never asynchronous
  `PostMessage`, in `_payout`;
- network, environment, docs, and deployment-registry consistency.

## Live GenLayer Tests

```bash
python -m pip install genlayer-test pytest
gltest --chain-type studionet tests/
```

Configured deployment:

```text
0xaf96D67998A52d53c2551cE58e3E8a4c310B0e6A
```

Preflight before sending GEN:

```bash
genlayer network studionet
genlayer call 0xaf96D67998A52d53c2551cE58e3E8a4c310B0e6A court_info
genlayer call 0xaf96D67998A52d53c2551cE58e3E8a4c310B0e6A debug_api_surface
genlayer call 0xaf96D67998A52d53c2551cE58e3E8a4c310B0e6A docket
```

Required output:

- `court_info.payout_mode = evm-direct`
- `debug_api_surface.payout[0].runner_command = EthSend`
- `debug_api_surface.payout[0].synchronous = true`

If these fields are absent, do not send escrow. Deploy the current contract
source and replace the configured address.

## Reviewer Acceptance Tests

1. Force a cancellation transfer failure: state remains `OPEN`.
2. Force either settlement leg to fail: state remains `ADJUDGED` and no leg
   persists.
3. Force fee transfer failure: `fees_collected` remains unchanged.
4. Third-party finalize during the appeal window fails.
5. Winning-party finalize after one-sided acceptance fails.
6. Mutual acceptance enables immediate finalization.
7. Appeal vacates the verdict and returns the case to `EVIDENCE`.
8. Evidence commitments cannot be overwritten.

The live jury tests can take several minutes. Run offline tests on every commit
and live tests before activating a replacement deployment.