# AgentCourt · Manual Testing Guide

End-to-end testing manual for the dApp + Intelligent Contract on GenLayer
Studionet. Goal: anyone should be able to run, verify, and re-trace every
fix without prior context.

- Reference court: `0x9048d2597D799746A39444bd64318Ff92896B667` (v1.2.0)
- Explorer: https://explorer-studio.genlayer.com/address/0x9048d2597D799746A39444bd64318Ff92896B667
- Network: **GenLayer Studionet · chain id 61999 · RPC `https://studio.genlayer.com/api` · GEN**

---

## A · Environment setup (5 minutes)

| # | Task | Command / Link |
|---|---|---|
| A1 | Node 18+, latest MetaMask extension | https://metamask.io |
| A2 | Install dependencies | `npm install` |
| A3 | Configure env | `cp .env.example .env` → set `VITE_COURT_ADDRESS` if you deploy your own court |
| A4 | Run the app | `npm run dev` → open `http://localhost:5173` |
| A5 | Add Studionet | Click **Connect** → "Add / switch to Studionet" (auto-fills chain id 61999) |
| A6 | Get test GEN | Open https://studio.genlayer.com → account selector → the **💧** button (the Studionet faucet lives inside Studio) |

> ⚠️ Note: `faucet.genlayer.com` only funds **Testnet Asimov**, not Studionet.
> If an older build of this app added a broken network (chain 62015),
> remove it: MetaMask → Settings → Networks → delete "GenLayer Studionet",
> then add it again via the in-app button.

---

## B · Automated tests (unit + contract schema)

```bash
npm test          # single run
npm run test:watch
```

The suite covers **every failure this project actually hit** — regressions are
not allowed back:

| File | What it verifies | Bug it guards |
|---|---|---|
| `src/lib/utils.test.ts` | consensus stage mapping (PENDING→ACCEPTED→FINALIZED), terminal/failed checks, address validation/formatting, verdict parsing (incl. WITHDRAWN), court address storage | wrong tracker UI state |
| `src/lib/contract.test.ts` | reads `contracts/agent_court.py` directly and enforces: |  |
| | pinned runner head `py-genlayer:1jb45aa…` | runner mismatch |
| | no public method named `__…` | `__receive__` → "Could not load contract schema" |
| | no `gl.message.sender` without `_address` | `AttributeError` at deploy time |
| | `__init__` assigns scalars only | schema sandbox crash from `TreeMap()` init |
| | all 11 public methods present, payable decorators correct | dApp calling missing functions |
| | integer-safe escrow math | dust loss / float errors |
| | `contracts/` ≡ `public/contracts/` byte-identical | CLI vs browser deploy drift |
| | settlement math + bond = 2× filing fee | wrong payout amounts |

Expected: **everything green**.

---

## C · Simulation mode (no wallet, 3 minutes)

Courtroom → keep the **Simulation** tab:

1. Select case `CFT-2026-0847` → **Convene the court**.
2. Watch the transcript: intake → exhibits → leader proposal → 5 validators vote 5/5.
3. The scales tilt toward the plaintiff; the settlement bar reads 100/0; stamp **PLAINTIFF WINS**.
4. Click **File appeal** → +2 validators join → appeal transcript → stamp flips to FINALIZED.
5. Switch to `CFT-2026-0912` (subjective) → result must be **SPLIT 50/50** with 2 dissents recorded.
6. Case `CFT-2026-0977` (SLA carve-out) → **DEFENDANT WINS** with 1 dissent.
7. **Fast-forward** accelerates the transcript ~5×; **Reset bench** clears state.

---

## D · Live workflow on Studionet (15–30 min, two accounts)

> Create **2 MetaMask accounts**: `A` = plaintiff, `B` = defendant. Switching
> accounts in MetaMask is picked up by the app within ≤ 2.5s — no refresh needed.
> (One account alone is enough for smoke testing: file the dispute with your
> own address as defendant — self-disputes are allowed on purpose.)
>
> Prepare two public text files for the jury to fetch from the web — e.g. a
> GitHub Gist ("Raw" link):
> - `task_spec.md`: "Landing page, 5 sections, responsive 375/768/1440, copy per outline."
> - `delivery.md`: describes the delivered work (deliberately omit 1–2 clauses to see breach).

### D1 · Gate states

| Wallet state | Expected screen |
|---|---|
| No MetaMask installed | "MetaMask required…" + download link |
| Not connected | "Connect to enter the live court" |
| Wrong chain (e.g. Ethereum) | "Wrong network" panel + **Add / switch to Studionet** button |
| On 61999 with GEN | Live console opens; court auto-attaches from `.env` |

### D2 · Court info

- The v1.1.0 court address is copyable; **refresh** reloads the docket.
- The line below displays the filing fee read live from `court_info()` (25 GEN).

### D3 · File a dispute (account A)

1. `Task spec URL` = raw Gist link · `Defendant` = B's address · `Escrow` = 10–50 GEN (start small).
2. **Lock escrow & open case** → sign in MetaMask → watch the tracker walk
   `PENDING → PROPOSING → COMMITTING → REVEALING → ACCEPTED`.
3. The docket shows case #0 as **OPEN**; A's balance dropped by the escrow.

### D4 · Cancel path (optional, still account A)

- The **Cancel · refund escrow** button is visible to the plaintiff only.
- Sign → case becomes **FINAL** with verdict `WITHDRAWN`; escrow returns to A.
- File a new case to continue.

### D5 · Submit delivery (account B)

1. The defendant form appears **only for B** on OPEN cases. Paste the delivery URL + notes.
2. Sign → status becomes **EVIDENCE**. A's Cancel button is now gone (delivery locked).

### D6 · Convene trial (any account — permissionless)

1. **Convene the trial — jury reasons live** → sign.
2. This is the slowest tx (~2–5 min): 5 LLM validators fetch both URLs,
   reason independently, then commit-reveal. The tracker still walks all stages.
3. Once ACCEPTED: the verdict card shows the stamp (`PLAINTIFF WINS` if the
   delivery missed clauses / `DEFENDANT WINS` / `SPLIT`), the share bar, and
   the jury's **rationale**.

### D7 · Appeal (status ADJUDGED, parties only)

1. Click **Appeal · 50 GEN bond** — the bond is read live from
   `court_info.appeal_bond` (= 2 × filing fee).
2. Case returns to **EVIDENCE** (badge `appeals ×1`) → **Convene trial** again
   for the enlarged panel.
3. Two appeals max; the button disappears on the third.

### D8 · Finalize (status ADJUDGED)

1. Click **Finalize & settle escrow** → case becomes **FINAL**.
2. Verify:
   - the card shows `settled → X GEN to plaintiff · Y GEN to defendant`;
   - both wallets' balances changed per the split (MetaMask may take a few
     seconds; use the balance refresh in the dropdown too).

### D9 · Explorer cross-check

Every tx hash in the session log (`tx submitted 0x…`) is inspectable at
https://explorer-studio.genlayer.com — final status must be ACCEPTED/FINALIZED.

---

## E · Test via GenLayer Studio & CLI (optional)

### Studio (run-debug)

1. https://studio.genlayer.com → New contract → paste **all of**
   `contracts/agent_court.py` → Deploy with args `[]`.
2. Copy the new court address → set `VITE_COURT_ADDRESS` → `npm run build`
   (or use "Attach an existing court" in the app — no rebuild needed).
3. Studio can also invoke `docket()`, `file_dispute(...)` directly.

### CLI

```bash
npm install -g genlayer
genlayer network studionet
genlayer deploy --contract contracts/agent_court.py
genlayer call 0xCOURT docket
genlayer write 0xCOURT file_dispute --value 10 "https://…/task_spec.md" "0xDefendant"
genlayer write 0xCOURT convene_trial 0
genlayer call 0xCOURT get_dispute 0
genlayer write 0xCOURT appeal 0 --value 50
genlayer write 0xCOURT convene_trial 0
genlayer write 0xCOURT finalize 0
```

---

## F · Expected-results cheat sheet

| Action | PASS signal |
|---|---|
| `npm test` | all tests green |
| Deploy on Studio | schema shows 13 methods, no "Could not load contract schema" |
| Add network | MetaMask network is **61999**, RPC studio.genlayer.com/api |
| File dispute | docket has the case, status OPEN, A's balance reduced |
| Cancel | status FINAL, verdict WITHDRAWN, escrow back to A |
| Trial | status ADJUDGED + valid verdict JSON (≥3 validators agreed) |
| Appeal | status EVIDENCE, `appeals: 1`, +50 GEN into `fees_collected` |
| Finalize | status FINAL, settlement matches `plaintiff_share`, balances move |
| Switch account/chain in MetaMask | app updates within ≤2.5s, no refresh |

---

## G · Failure history & how to recognize each fix

| Failure | Symptom | Fix | Guarded by |
|---|---|---|---|
| Deploy dies in `__init__` | `AttributeError: 'MessageType' object has no attribute 'sender'` | `gl.message.sender_address` | `contract.test.ts` |
| "Could not load contract schema" | crash even with correct sender, cause: `TreeMap()` assigned in `__init__` | scalar-only `__init__` | `contract.test.ts` |
| "Could not load contract schema" (2) | `__receive__` rejected by `get_schema` | no dunder public hooks | `contract.test.ts` |
| Trial fails with `SystemError: 6: forbidden` | `gl.nondet.web.render` called directly by `convene_trial` | run web + LLM calls inside the callback passed to `prompt_comparative` | `contract.test.ts` |
| Finalize fails with `AttributeError: emit_transfer` | Studio runner ships an older `genlayer.py.evm` without that name | `_payout` resolves the primitive via `getattr` with fallbacks | `contract.test.ts` |
| App never sees the network switch | wrong chainIdHex `0xf23f` (62015) | `0xf22f` (61999) + 2.5s background sync | README §Troubleshooting |
| GEN funded on the wrong network | faucet.genlayer.com only serves Asimov | Studio 💧 for Studionet | UI labels |
