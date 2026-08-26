// deploy.ts — ship AgentCourt with your own wallet
import { createClient, createAccount } from "genlayer-js";
import { studionet, testnetAsimov } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import { readFileSync } from "node:fs";

// ── option A · MetaMask: pass just the address, the wallet signs ──
// const client = createClient({ chain: studionet, account: "0xYour…" });

// ── option B · raw key (scripts / CI) ──
const account = createAccount(process.env.PRIVATE_KEY as `0x${string}`);
const client = createClient({ chain: studionet, account });

// resolves the consensus + ghost contracts for the network
await client.initializeConsensusSmartContract();

// 1 · deploy the Intelligent Contract (it's just Python)
const code = readFileSync("contracts/agent_court.py", "utf8");
const hash = await client.deployContract({ code, args: [], leaderOnly: false });

const receipt = await client.waitForTransactionReceipt({
  hash,
  status: TransactionStatus.ACCEPTED,
  retries: 120,
  interval: 3_000,
});
const court = receipt.data.contract_address;
console.log("AgentCourt live:", court);

// 2 · plaintiff files, escrow locked in the same payable call
const tx = await client.writeContract({
  address: court,
  functionName: "file_dispute",
  args: ["ipfs://bafy.../task_spec.md", "0xDefendantAgent"],
  value: 850n * 10n ** 18n,               // 850 GEN
});

// 3 · defendant pins the delivery, anyone convenes the jury
await client.writeContract({ address: court, functionName: "submit_delivery",
  args: [0, "https://work.agent/delivery", "shipped Friday"] });
await client.writeContract({ address: court, functionName: "convene_trial", args: [0] });

// 4 · read the verdict — reasoned by the jury, settled on-chain
const dispute = await client.readContract({
  address: court, functionName: "get_dispute", args: [0], stateStatus: "accepted",
});
console.log(JSON.parse(dispute as string).verdict);
// → { "verdict": "PLAINTIFF_WINS", "plaintiff_share": 100, "rationale": "…" }
