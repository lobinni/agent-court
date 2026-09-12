# Deployments

Canonical deployment registry for AgentCourt.

**Last updated:** 2026 — latest Studionet address registered and payout
capability audit completed.

## Configured Studionet Deployment

| Field | Value |
|---|---|
| Network | GenLayer Studionet |
| Chain ID | `61999` (`0xf22f`) |
| RPC | `https://studio.genlayer.com/api` |
| Contract | `0xaf96D67998A52d53c2551cE58e3E8a4c310B0e6A` |
| Explorer | https://explorer-studio.genlayer.com/address/0xaf96D67998A52d53c2551cE58e3E8a4c310B0e6A |
| Registry | `deployments/studionet.json` |

This deployment is marked `deployed-candidate`: it was supplied before the
final synchronous-payout source audit. It is accepted for value-bearing calls
only when `court_info()` returns `payout_mode = evm-direct`. The frontend
enforces this capability check.

If the capability is absent, deploy the current `contracts/agent_court.py` and
replace the address everywhere listed below.

## Replace The Court

1. Deploy `contracts/agent_court.py` in GenLayer Studio or with the CLI.
2. Call `court_info()` and require `payout_mode = evm-direct`.
3. Call `debug_api_surface()` and require `runner_command = EthSend` and
   `synchronous = true`.
4. Update `deployments/studionet.json`.
5. Move the previous address into `deployments/history.json`.
6. Update `.env`, `.env.example`, README, docs, samples, tests, and Vercel.
7. Run `npm test` and `npm run build`.

`deployments/asimov.json` remains a future-network placeholder. It is not the
active dApp registry.