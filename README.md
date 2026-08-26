# AgentCourt — The Court System for the Agent Economy

A decentralized dispute-resolution protocol for AI agents on **GenLayer**.
Agent agents sue agent agents; a jury of LLM validators reads the spec from
the live web, reasons the verdict through **Optimistic Democracy**, and the
escrow splits exactly by the jury's `plaintiff_share`.

> Not just escrow. Judgment.

## Deployed reference court

| | |
|---|---|
| Contract | `0x9048d2597D799746A39444bd64318Ff92896B667` (**v1.2.0**) |
| Network | GenLayer StudioNet · chain id **61999** |
| RPC | `https://studio.genlayer.com/api` |
| Engine | head pinned `py-genlayer:1jb45aa…` (GenVM runner) |
| Explorer | https://explorer-studio.genlayer.com/address/0x9048d2597D799746A39444bd64318Ff92896B667 |
| Source | `contracts/agent_court.py` |

The dApp reads `VITE_COURT_ADDRESS` from `.env` at build time and auto-attaches
this court. You can also detach and attach any other court address at runtime
(no rebuild needed).

## Quick start

```bash
npm install
npm test        # vitest suite — utils + contract schema guards
npm run dev     # http://localhost:5173
```

Then: **Courtroom** → flip to **Live · Studionet 61999** → **Connect MetaMask**
(one click adds the network) → get GEN from the Studio's built-in faucet 💧 →
the court is already loaded.

## The workflow on-chain

```
file_dispute → OPEN → submit_delivery → EVIDENCE → convene_trial → ADJUDGED
     │                                                                  │
     │                                        appeal (2× fee bond) ─────┤
     │                                                                  ▼
     ▼                                                            finalize → FINAL
cancel_dispute (plaintiff, pre-delivery)                    escrow split per
(full refund of the escrow)                                 plaintiff_share
```

| Method | Who | What it does |
|---|---|---|
| `file_dispute` (payable) | plaintiff | locks the whole escrow, stores the task-spec URL |
| `submit_delivery` | defendant | pins the delivered-work URL, moves case to EVIDENCE |
| `cancel_dispute` | plaintiff | pre-delivery withdrawal — full escrow refund |
| `convene_trial` | anyone | LLM jury fetch + vote via `prompt_comparative` |
| `appeal` (payable, ≤2) | party | 50 GEN bond → status back to EVIDENCE for re-trial |
| `finalize` | anyone | settlement JSON + escrow payout via `_payout` |
| `collect_fees` | treasury | sweeps filing fees + appeal bonds |

## Environment — the court address

```bash
cp .env.example .env
```

`.env` already points to the deployed v1.2.0 court. To move to another court:

```bash
VITE_COURT_ADDRESS=0xYourNewCourtAddress
```

then `npm run build` (Vite inlines env vars at build time).

## Testing

| Suite | Covers |
|---|---|
| `npm test` | consensus stage mapping, terminal/failed checks, address utils, verdict parsing (incl. WITHDRAWN), settlement math, no dust |
| `src/lib/contract.test.ts` | reads `contracts/agent_court.py` directly and guards every rule we hit in production: pinned head, no `__…` public methods, `self.sender_address` usage, scalar-only `__init__`, HTTPS-only evidence URLs, jury must live inside the equivalence callback, payouts must go through `_payout` (runner-agnostic), `contracts/` ≡ `public/contracts/` byte-identical |

Manual guides:
- **End-to-end live workflow**: [docs/test.md](docs/test.md)
- **On-chain golden scenarios with expected verdicts**: [docs/live-test.md](docs/live-test.md) (fixtures in `samples/`)

## Deploying a fresh court

1. Open https://studio.genlayer.com → New contract → paste the full contents
   of `contracts/agent_court.py` → Deploy with empty args `[]`.
2. Copy the new contract address (top-right of the contract panel).
3. Update `VITE_COURT_ADDRESS` in `.env` and rebuild.

Or via CLI:

```bash
npm install -g genlayer
genlayer network studionet
genlayer deploy --contract contracts/agent_court.py
# then read the address from the explorer or the CLI output
```

## Push to GitHub

```bash
git init
git add .
git commit -m "AgentCourt — dApp + Intelligent Contract v1.2.0 on GenLayer"
git branch -M main
git remote add origin https://github.com/YOUR_USER/agent-court.git
git push -u origin main
```

Subsequent pushes:

```bash
git add .
git commit -m "your message"
git push
```

## Deploy on Vercel — no DATABASE_URL error

This dApp is fully stateless: React + chain RPC only. There is **no database**.

1. Push the repo to GitHub, then on https://vercel.com → New Project → import.
2. Framework: **Vite** · Build command: `npm run build` · Output: `dist`
   (already pinned in `vercel.json`).
3. Environment Variables — add exactly one key:

   ```
   VITE_COURT_ADDRESS = 0x9048d2597D799746A39444bd64318Ff92896B667
   ```

   Leave everything else empty. **Do not** add `DATABASE_URL`, `POSTGRES_*`,
   `PRISMA_*` or any backend secret — a leftover env var of that kind is the
   classic "database url" Vercel build failure.
4. Deploy. To swap the court later: change the env value → **Redeploy**.

If a previous deployment failed with a database-related error: open Project
Settings → Environment Variables, delete every key named like
`DATABASE_URL`/`POSTGRES_URL`/`PRISMA_*`, then **Redeploy → Clear build cache**.

## Phantom pitfalls (history of failures fixed)

| Symptom | Root cause | Fix |
|---|---|---|
| `AttributeError: 'MessageType' object has no attribute 'sender'` | `gl.message.sender` | `gl.message.sender_address` |
| `Could not load contract schema` | `self.disputes = TreeMap()` inside `__init__` | scalar-only `__init__` |
| `Could not load contract schema` (2nd) | public method `__receive__` rejected by `get_schema` | no dunder public methods |
| `SystemError: 6: forbidden` on `convene_trial` | `gl.nondet.web.render` called directly in a public method | jury moved inside the `prompt_comparative` callback |
| `AttributeError: emit_transfer` on `finalize` | Studio runner ships an older `py.evm` module | `_payout` resolves the primitive via `getattr` with fallbacks |
| dApp never saw the network switch | wrong chainIdHex `0xf23f` (62015) | `0xF22F` (61999) + 2.5s background sync |
| GEN from wrong faucet | `faucet.genlayer.com` only funds Asimov | Studionet faucet lives in Studio 💧 |

## Project layout

```
contracts/agent_court.py     ← Intelligent Contract (pinned GenVM runner)
public/contracts/…           ← byte-identical copy served to the browser deploy
scripts/deploy.ts            ← genlayer-js deploy script
scripts/quickstart.sh        ← CLI reference
samples/                     ← 3 public-test fixtures (spec ↔ delivery)
docs/test.md                 ← manual end-to-end guide
docs/live-test.md            ← on-chain golden scenarios
.env / .env.example          ← VITE_COURT_ADDRESS
vercel.json                  ← fully static build
src/lib/genlayer.ts          ← Studionet 61999 helpers + env + tx tracking
src/lib/WalletContext.tsx    ← MetaMask EIP-1193 wiring + background sync
src/lib/utils.test.ts        ← utils unit tests
src/lib/contract.test.ts     ← contract schema & payout guards
src/components/LiveCourt.tsx ← on-chain console (file → trial → appeal → settle)
src/components/HowItWorks.tsx← architecture & circuit internals
```
