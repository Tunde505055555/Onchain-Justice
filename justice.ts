import { getReadClient, getWalletClient } from "./genlayer";

const CONTRACT_KEY = "onchain_justice_contract_address";
const DEFAULT_CONTRACT_ADDRESS = "0xe2456D3345Dcd811c140B657B990c8061C2c48a3";

export function getContractAddress(): string | null {
  if (typeof window === "undefined") return DEFAULT_CONTRACT_ADDRESS;
  return localStorage.getItem(CONTRACT_KEY) || DEFAULT_CONTRACT_ADDRESS;
}

export function setContractAddress(addr: string) {
  localStorage.setItem(CONTRACT_KEY, addr);
}

export function clearContractAddress() {
  localStorage.removeItem(CONTRACT_KEY);
}

export type Case = {
  id: number;
  payer: string;
  payee: string;
  agreement: string;
  amount: number;
  status: 0 | 1 | 2;
  payer_claim: string;
  payee_claim: string;
  payer_evidence: string[];
  payee_evidence: string[];
  ruling: string;
  payer_share: number;
  payee_share: number;
};

function requireAddress(): string {
  const a = getContractAddress();
  if (!a) throw new Error("Contract address not set. Deploy on Studio and add it.");
  return a;
}

export async function getTotalCases(): Promise<number> {
  const client = getReadClient();
  const res = await client.readContract({
    address: requireAddress() as `0x${string}`,
    functionName: "get_total_cases",
    args: [],
  });
  return Number(res);
}

export async function listCases(): Promise<Case[]> {
  const client = getReadClient();
  const res = (await client.readContract({
    address: requireAddress() as `0x${string}`,
    functionName: "list_cases",
    args: [],
  })) as string;
  if (!res) return [];
  try {
    return JSON.parse(res) as Case[];
  } catch {
    return [];
  }
}

export async function getCase(id: number): Promise<Case | null> {
  const client = getReadClient();
  const res = (await client.readContract({
    address: requireAddress() as `0x${string}`,
    functionName: "get_case",
    args: [BigInt(id)],
  })) as string;
  if (!res) return null;
  return JSON.parse(res) as Case;
}

async function write(functionName: string, args: any[], value: bigint = 0n) {
  const client = getWalletClient();
  const accounts: string[] = await window.ethereum.request({ method: "eth_accounts" });
  if (!accounts[0]) throw new Error("Connect your wallet first");
  const account = { address: accounts[0] as `0x${string}`, type: "json-rpc" as const };
  const tx = await client.writeContract({
    account: account as any,
    address: requireAddress() as `0x${string}`,
    functionName,
    args,
    value,
  });
  return tx;
}

export const createCase = (counterparty: string, agreement: string, amountWei: bigint) =>
  write("create_case", [counterparty, agreement], amountWei);

export const releaseFunds = (caseId: number) => write("release_funds", [BigInt(caseId)]);

export const raiseDispute = (caseId: number, claim: string) =>
  write("raise_dispute", [BigInt(caseId), claim]);

export const submitEvidence = (caseId: number, claim: string, evidence: string) =>
  write("submit_evidence", [BigInt(caseId), claim, evidence]);

export const resolveWithAi = (caseId: number) => write("resolve_with_ai", [BigInt(caseId)]);

export async function waitForTx(hash: string) {
  const client = getReadClient();
  return client.waitForTransactionReceipt({ hash: hash as any, retries: 60, interval: 3000 });
}
