import { createClient, chains } from "genlayer-js";
import type { GenLayerClient } from "genlayer-js/types";

const STUDIO_CHAIN = {
  ...chains.studionet,
  id: 61999,
  name: "GenLayer Studio",
  rpcUrls: {
    default: { http: ["https://studio.genlayer.com/api"] },
  },
  nativeCurrency: { name: "GenLayer", symbol: "GEN", decimals: 18 },
  blockExplorers: {
    default: { name: "GenLayer Explorer", url: "https://explorer-studio.genlayer.com" },
  },
} as const;

export function getReadClient(): GenLayerClient<any> {
  return createClient({ chain: STUDIO_CHAIN as any });
}

export function getWalletClient(): GenLayerClient<any> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No Ethereum wallet detected. Please install MetaMask.");
  }
  return createClient({
    chain: STUDIO_CHAIN as any,
    provider: window.ethereum,
  });
}

export const STUDIO_CHAIN_HEX = "0x" + (61999).toString(16);

export async function ensureStudioNetwork() {
  if (!window.ethereum) throw new Error("No wallet found");
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: STUDIO_CHAIN_HEX }],
    });
  } catch (e: any) {
    if (e?.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: STUDIO_CHAIN_HEX,
            chainName: "GenLayer Studio",
            rpcUrls: ["https://studio.genlayer.com/api"],
            nativeCurrency: { name: "GenLayer", symbol: "GEN", decimals: 18 },
            blockExplorers: ["https://explorer-studio.genlayer.com"],
          },
        ],
      });
    } else {
      throw e;
    }
  }
}

export const EXPLORER_BASE = "https://explorer-studio.genlayer.com";
