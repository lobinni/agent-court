# Live Test Samples

Public evidence fixtures for the configured AgentCourt on GenLayer Studionet.

**Last updated:** 2026 — linked to court
`0xaf96D67998A52d53c2551cE58e3E8a4c310B0e6A`.

## Scenarios

| Directory | Purpose | Expected verdict |
|---|---|---|
| `s1-breach/` | Four objective clauses are violated | `PLAINTIFF_WINS`, plaintiff share `100` |
| `s2-compliant/` | Every objective clause is satisfied | `DEFENDANT_WINS`, plaintiff share `0` |
| `s3-subjective/` | Objective scope is delivered but quality is ambiguous | `SPLIT`, plaintiff share `1..99` |

Each directory contains `task_spec.md` and `delivery.md`.

## Publish The Fixtures

Validators require anonymous public HTTPS access. Push this repository to a
public GitHub project and use raw URLs:

```text
https://raw.githubusercontent.com/<account>/<repository>/main/samples/s1-breach/task_spec.md
https://raw.githubusercontent.com/<account>/<repository>/main/samples/s1-breach/delivery.md
```

Open both URLs in a private browser before filing. The dApp computes a SHA-256
commitment for each document; do not edit a fixture after its case is filed.

See `docs/live-test.md` for the full workflow.