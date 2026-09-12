import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

export type CourtCompatibility = "old-shape" | "wrong-contract";

export interface HealthyCourt {
  info: Record<string, unknown>;
  compatible: true;
}

export type CourtHealth =
  | { kind: "ok"; court: HealthyCourt }
  | { kind: "not-found"; address: string; message: string }
  | { kind: "old-shape"; address: string; info: Record<string, unknown>; message: string }
  | { kind: "wrong-contract"; address: string; message: string };

const normalizeError = (err: unknown, address: string): string => {
  const message = err instanceof Error ? err.message : String(err);
  if (/not found/i.test(message)) {
    return `${message}. Address ${address} is unavailable on Studionet (chain 61999).`;
  }
  return message;
};

const looksMissing = (err: unknown): boolean => {
  const message = err instanceof Error ? err.message : String(err);
  return /not found/i.test(message);
};

export async function checkCourt(address: string | undefined | null): Promise<CourtHealth> {
  if (!address) {
    return { kind: "not-found", address: "", message: "No contract address configured." };
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(address.trim())) {
    return {
      kind: "not-found",
      address: address.trim(),
      message: `Address ${address.trim()} is not a valid 42-character evm address.`,
    };
  }

  const client = createClient({ chain: studionet });
  try {
    const raw = await (client.readContract as (args: {
      address: string;
      functionName: string;
      args: unknown[];
      stateStatus?: string;
    }) => Promise<unknown>)({
      address,
      functionName: "court_info",
      args: [],
      stateStatus: "accepted",
    });

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(String(raw)) as Record<string, unknown>;
    } catch {
      return {
        kind: "wrong-contract",
        address,
        message: `Address ${address} responded, but the dApp could not parse court_info.`,
      };
    }

    const maxAppeals = Number(parsed.max_appeals);
    const appealBond = String(parsed.appeal_bond ?? "");
    const filingFee = String(parsed.filing_fee ?? "");
    const payoutMode = String(parsed.payout_mode ?? "");
    if (
      maxAppeals !== 2 ||
      appealBond === "" ||
      filingFee === "" ||
      payoutMode !== "evm-direct"
    ) {
      return {
        kind: "old-shape",
        address,
        info: parsed,
        message: `Address ${address} lacks a required capability (appeal window or synchronous evm-direct payout). Do not send escrow to it.`,
      };
    }
    return {
      kind: "ok",
      court: {
        info: parsed,
        compatible: true,
      },
    };
  } catch (err) {
    if (looksMissing(err)) {
      return {
        kind: "not-found",
        address,
        message: normalizeError(err, address),
      };
    }
    return {
      kind: "wrong-contract",
      address,
      message: normalizeError(err, address),
    };
  }
}
