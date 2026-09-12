/* ──────────────────────────────────────────────────────────────
   Contract source loader — repo root contract file is the single
   source of truth; paths probed in build and dev order.
   ────────────────────────────────────────────────────────────── */

const CANDIDATES = [
  "/contracts/agent_court.py",
  "contracts/agent_court.py",
];

let cache: string | null = null;

export async function fetchTextAsset(path: string): Promise<string | null> {
  try {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function fetchCircuitSource(): Promise<string | null> {
  if (cache) return cache;
  for (const path of CANDIDATES) {
    try {
      const res = await fetch(path, { cache: "no-store" });
      if (!res.ok) continue;
      const text = await res.text();
      if (text.includes("class AgentCourt")) {
        cache = text;
        return text;
      }
    } catch {
      /* next candidate */
    }
  }
  return null;
}
