import { describe, expect, it } from "vitest";
import {
  stageIndex,
  isTerminal,
  isFailed,
  isValidAddress,
  parseVerdict,
  shortAddr,
  shortHash,
  getCourtAddress,
  setCourtAddress,
  clearCourtAddress,
} from "./genlayer";

describe("consensus stage mapping", () => {
  it("maps known stages to ordered indexes", () => {
    expect(stageIndex("PENDING")).toBe(0);
    expect(stageIndex("PROPOSING")).toBe(1);
    expect(stageIndex("COMMITTING")).toBe(2);
    expect(stageIndex("REVEALING")).toBe(3);
    expect(stageIndex("ACCEPTED")).toBe(4);
    expect(stageIndex("FINALIZED")).toBe(5);
  });
  it("handles prefixed and lowercase statuses", () => {
    expect(stageIndex("ACCEPTED_BY_APPEAL")).toBe(4);
    expect(stageIndex("finalized")).toBe(5);
  });
  it("falls back to 0 for unknown values", () => {
    expect(stageIndex("UNKNOWN")).toBe(0);
    expect(stageIndex(undefined)).toBe(0);
  });
});

describe("terminal and failure checks", () => {
  it("flags terminal statuses", () => {
    expect(isTerminal("ACCEPTED")).toBe(true);
    expect(isTerminal("FINALIZED")).toBe(true);
    expect(isTerminal("PROPOSING")).toBe(false);
  });
  it("flags failed statuses", () => {
    expect(isFailed("CANCELED")).toBe(true);
    expect(isFailed("UNDETERMINED")).toBe(true);
    expect(isFailed("FINALIZED")).toBe(false);
  });
});

describe("address and formatting helpers", () => {
  it("validates Ethereum addresses", () => {
    expect(isValidAddress("0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B")).toBe(true);
    expect(isValidAddress("0x12345")).toBe(false);
    expect(isValidAddress("notanaddress")).toBe(false);
  });
  it("trims the middle of hex strings", () => {
    const a = "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B";
    expect(shortAddr(a)).toBe("0xAb58…eC9B");
    expect(shortAddr("")).toBe("");
    expect(shortHash("1234567890abcdef_123456")).toBe("1234567890…123456");
  });
});

describe("verdict parsing", () => {
  it("parses a valid verdict JSON", () => {
    const raw = JSON.stringify({
      verdict: "PLAINTIFF_WINS",
      plaintiff_share: 100,
      rationale: "spec clause 3 failed",
    });
    const v = parseVerdict(raw);
    expect(v?.verdict).toBe("PLAINTIFF_WINS");
    expect(v?.plaintiff_share).toBe(100);
    expect(v?.rationale).toContain("clause 3");
  });
  it("parses a SPLIT verdict with partial share", () => {
    const v = parseVerdict(JSON.stringify({ verdict: "SPLIT", plaintiff_share: 50, rationale: "" }));
    expect(v?.plaintiff_share).toBe(50);
  });
  it("returns null for empty input", () => {
    expect(parseVerdict("")).toBeNull();
  });
  it("returns null for malformed JSON", () => {
    expect(parseVerdict("{not json")).toBeNull();
    expect(parseVerdict("\"a string\"")).toBeNull();
  });

  it("parses the WITHDRAWN verdict produced by cancel_dispute", () => {
    const raw = '{"verdict":"WITHDRAWN","plaintiff_share":100,"rationale":"case withdrawn by plaintiff before evidence"}';
    const v = parseVerdict(raw);
    expect(v?.verdict).toBe("WITHDRAWN");
    expect(v?.plaintiff_share).toBe(100);
  });
});

describe("court address storage", () => {
  it("round-trips through localStorage", () => {
    clearCourtAddress();
    expect(getCourtAddress()).toBe("");
    setCourtAddress("0x000000000000000000000000000000000000dEaD");
    expect(getCourtAddress()).toBe("0x000000000000000000000000000000000000dEaD");
  });
});
