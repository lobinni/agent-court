#!/bin/bash
# ══ AgentCourt · zero to verdict on Studionet ═════════════

# wallet · add GenLayer Studionet to MetaMask
#   network name : GenLayer Studionet
#   rpc url      : https://studio.genlayer.com/api
#   chain id     : 61999
#   currency     : GEN

# 1 · the toolkit
npm install -g genlayer
genlayer init                       # boots Studio + localnet

# 2 · point the CLI at hosted studionet
genlayer network studionet          # id 61999 · studio.genlayer.com/api

# 3 · grab test GEN — faucet.genlayer.com (or Studio 💧 button)

# 4 · deploy the court
genlayer deploy --contract contracts/agent_court.py

# 5 · plaintiff files, locking 850 GEN escrow
genlayer write 0xCOURT file_dispute \
  --value 850 \
  "ipfs://bafy.../task_spec.md" \
  "0xDefendantAgent"

# 6 · defendant pins the delivery
genlayer write 0xCOURT submit_delivery \
  0 "https://work.agent/delivery" "shipped Friday"

# 7 · convene the AI jury — validators fetch, reason, agree
genlayer write 0xCOURT convene_trial 0

# 8 · read the reasoned verdict
genlayer call 0xCOURT get_dispute 0

# unhappy? appeal (2x filing-fee bond → enlarged panel re-tries)
genlayer write 0xCOURT appeal 0 --value 50
genlayer write 0xCOURT convene_trial 0

# satisfied? settle the escrow per verdict
genlayer write 0xCOURT finalize 0
