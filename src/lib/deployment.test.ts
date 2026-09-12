import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const COURT = "0xaf96D67998A52d53c2551cE58e3E8a4c310B0e6A";
const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8");
const json = (file: string) => JSON.parse(read(file));

describe("configured Studionet deployment", () => {
  it("uses canonical Studionet network settings", () => {
    const d = json("deployments/studionet.json");
    expect(d.network).toBe("GenLayer Studionet");
    expect(d.chainId).toBe(61999);
    expect(d.chainIdHex).toBe("0xf22f");
    expect(d.rpcUrl).toBe("https://studio.genlayer.com/api");
    expect(d.contractAddress).toBe(COURT);
    expect(d.explorerUrl).toContain(COURT);
  });

  it("keeps environment, README, docs, tests, and samples in sync", () => {
    for (const file of [
      ".env.example",
      "README.md",
      "deployments/README.md",
      "docs/test.md",
      "docs/live-test.md",
      "docs/security.md",
      "tests/README.md",
      "samples/README.md",
      "samples/manifest.json",
    ]) {
      expect(read(file), `${file} must include configured court`).toContain(COURT);
    }
  });

  it("marks the supplied address as capability-check-required", () => {
    const d = json("deployments/studionet.json");
    expect(d.status).toBe("deployed-candidate");
    expect(d.requiredCapabilities).toContain("synchronous evm-direct payout");
    expect(d.note).toContain("court_info.payout_mode=evm-direct");
  });

  it("binds samples to the same court and network", () => {
    const m = json("samples/manifest.json");
    expect(m.network).toBe("GenLayer Studionet");
    expect(m.chainId).toBe(61999);
    expect(m.configuredCourt).toBe(COURT);
    expect(m.scenarios).toHaveLength(3);
  });

  it("derives chain-id hex correctly", () => {
    expect(`0x${(61999).toString(16)}`).toBe("0xf22f");
  });

  it("keeps previous payout failures in history", () => {
    const h = json("deployments/history.json");
    const previous = h.deployments.find(
      (entry: { contractAddress: string }) =>
        entry.contractAddress === "0xa431512E3dB90d9236E9c2f0ddA72e3Efc5c2EdA",
    );
    expect(previous.status).toBe("superseded");
    expect(previous.notes).toContain("contract_not_found_handler");
  });
});