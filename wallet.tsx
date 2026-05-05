import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { ensureStudioNetwork, getWalletClient } from "./genlayer";

type WalletCtx = {
  address: string | null;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  hasWallet: boolean;
};

const Ctx = createContext<WalletCtx | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [hasWallet, setHasWallet] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setHasWallet(!!window.ethereum);
    if (!window.ethereum) return;

    window.ethereum
      .request({ method: "eth_accounts" })
      .then((accs: string[]) => {
        if (accs?.[0]) setAddress(accs[0]);
      })
      .catch(() => {});

    const onAccounts = (accs: string[]) => setAddress(accs?.[0] ?? null);
    window.ethereum.on?.("accountsChanged", onAccounts);
    return () => window.ethereum.removeListener?.("accountsChanged", onAccounts);
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      window.open("https://metamask.io/download/", "_blank");
      throw new Error("Please install MetaMask");
    }
    setConnecting(true);
    try {
      const accs: string[] = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      await ensureStudioNetwork();
      // touch the client so it caches
      try {
        getWalletClient();
      } catch {}
      setAddress(accs[0]);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => setAddress(null), []);

  return (
    <Ctx.Provider value={{ address, connecting, connect, disconnect, hasWallet }}>
      {children}
    </Ctx.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWallet must be used inside WalletProvider");
  return ctx;
}

export function shortAddr(a?: string | null) {
  if (!a) return "";
  return a.slice(0, 6) + "…" + a.slice(-4);
}
