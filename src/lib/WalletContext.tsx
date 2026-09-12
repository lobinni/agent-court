/* ──────────────────────────────────────────────────────────────
   Wallet context — MetaMask (EIP-1193) on GenLayer Studionet 61999
   ────────────────────────────────────────────────────────────── */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { formatEther } from "viem";
import { STUDIONET } from "./genlayer";

interface Eip1193 {
  request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>;
  on?: (event: string, cb: (...args: never[]) => void) => void;
  removeListener?: (event: string, cb: (...args: never[]) => void) => void;
  isMetaMask?: boolean;
}

declare global {
  interface Window {
    ethereum?: Eip1193 & { providers?: Eip1193[] };
  }
}

/**
 * Find the wallet provider. In multi-wallet browsers, window.ethereum
 * may hold an array of providers — prefer the MetaMask one, since a
 * chain switch in another wallet would otherwise be invisible to the dApp.
 */
const eth = (): Eip1193 | undefined => {
  if (typeof window === "undefined") return undefined;
  const w = window.ethereum;
  if (w?.providers?.length) {
    return w.providers.find((p) => p.isMetaMask) ?? w.providers[0];
  }
  return w;
};

export interface WalletState {
  address: string | null;
  chainId: number | null;
  balance: string | null;
  isStudionet: boolean;
  hasWallet: boolean;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  addOrSwitchStudionet: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletState | null>(null);

/** EIP-1193 returns hex, but some providers send decimals — normalize both. */
const parseChainId = (raw: unknown): number | null => {
  const s = String(raw);
  const n = s.startsWith("0x") || s.startsWith("0X")
    ? Number.parseInt(s, 16)
    : Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
};

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasWallet = typeof window !== "undefined" && !!window.ethereum;
  const isStudionet = chainId === STUDIONET.chainId;

  const refreshBalance = useCallback(async () => {
    const e = eth();
    if (!e || !address) return;
    try {
      const raw = (await e.request({ method: "eth_getBalance", params: [address, "latest"] })) as string;
      const num = Number.parseFloat(formatEther(BigInt(raw)));
      setBalance(num >= 1000 ? num.toLocaleString("en-US", { maximumFractionDigits: 0 }) : num.toPrecision(4).replace(/\.?0+$/, ""));
    } catch {
      /* keep stale balance */
    }
  }, [address]);

  const readChain = useCallback(async () => {
    const e = eth();
    if (!e) return;
    try {
      const id = parseChainId(await e.request({ method: "eth_chainId" }));
      if (id !== null) setChainId(id);
    } catch {
      /* noop */
    }
  }, []);

  const connect = useCallback(async () => {
    const e = eth();
    if (!e) {
      setError("MetaMask not detected — install it to enter the live court.");
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const accounts = (await e.request({ method: "eth_requestAccounts" })) as string[];
      if (accounts?.[0]) setAddress(accounts[0].toLowerCase());
      await readChain();
    } catch (err) {
      setError(err instanceof Error ? err.message : "connection rejected");
    } finally {
      setConnecting(false);
    }
  }, [readChain]);

  const addOrSwitchStudionet = useCallback(async () => {
    const e = eth();
    if (!e) {
      setError("MetaMask not detected.");
      return;
    }
    setError(null);
    try {
      await e.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: STUDIONET.chainIdHex }],
      });
    } catch (switchErr) {
      const code = (switchErr as { code?: number })?.code;
      if (code === 4902 || code === -32603) {
        try {
          await e.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: STUDIONET.chainIdHex,
                chainName: STUDIONET.name,
                rpcUrls: [STUDIONET.rpcUrl],
                nativeCurrency: { name: STUDIONET.symbol, symbol: STUDIONET.symbol, decimals: 18 },
                blockExplorerUrls: [],
              },
            ],
          });
        } catch (addErr) {
          setError(addErr instanceof Error ? addErr.message : "could not add Studionet");
        }
      } else if (code !== 4001) {
        setError((switchErr as Error).message ?? "could not switch network");
      }
    } finally {
      await readChain();
    }
  }, [readChain]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setBalance(null);
  }, []);

  /* silent reconnect + event wiring */
  useEffect(() => {
    const e = eth();
    if (!e) return;
    e.request({ method: "eth_accounts" })
      .then((accounts) => {
        const list = accounts as string[];
        if (list?.[0]) setAddress(list[0].toLowerCase());
      })
      .catch(() => {});
    readChain();

    const onAccounts = (...args: never[]) => {
      const list = args[0] as unknown as string[];
      setAddress(list?.[0] ? list[0].toLowerCase() : null);
    };
    const onChain = (...args: never[]) => {
      const id = parseChainId(args[0]);
      if (id !== null) setChainId(id);
    };
    e.on?.("accountsChanged", onAccounts);
    e.on?.("chainChanged", onChain);
    return () => {
      e.removeListener?.("accountsChanged", onAccounts);
      e.removeListener?.("chainChanged", onChain);
    };
  }, [readChain]);

  /*
   * Belt-and-braces sync: some wallets / mobile builds occasionally drop
   * chainChanged / accountsChanged events. A light 2.5s poll keeps the
   * app perfectly in sync with the wallet's real state.
   */
  useEffect(() => {
    let mounted = true;
    const tick = async () => {
      const e = eth();
      if (!e) return;
      try {
        const id = parseChainId(await e.request({ method: "eth_chainId" }));
        if (mounted && id !== null) setChainId(id);
      } catch { /* provider busy */ }
      try {
        const list = (await e.request({ method: "eth_accounts" })) as string[];
        if (mounted && Array.isArray(list)) {
          setAddress(list[0] ? list[0].toLowerCase() : null);
        }
      } catch { /* locked wallet */ }
    };
    tick();
    const t = setInterval(tick, 2500);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    refreshBalance();
    const t = setInterval(refreshBalance, 20_000);
    return () => clearInterval(t);
  }, [refreshBalance]);

  const value = useMemo<WalletState>(
    () => ({
      address,
      chainId,
      balance,
      isStudionet,
      hasWallet,
      connecting,
      error,
      connect,
      addOrSwitchStudionet,
      refreshBalance,
      disconnect,
    }),
    [address, chainId, balance, isStudionet, hasWallet, connecting, error, connect, addOrSwitchStudionet, refreshBalance, disconnect],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside <WalletProvider>");
  return ctx;
}
