const RPC_URL = import.meta.env.VITE_RPC_URL || "http://localhost:8545";

let requestId = 0;

async function rpc<T = unknown>(method: string, params: unknown[] = []): Promise<T> {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++requestId, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message ?? JSON.stringify(json.error));
  return json.result as T;
}

// --- Chain info ---

export async function getBlockNumber(): Promise<number> {
  const hex = await rpc<string>("eth_blockNumber");
  return parseInt(hex, 16);
}

export async function getChainId(): Promise<number> {
  const hex = await rpc<string>("eth_chainId");
  return parseInt(hex, 16);
}

export async function getGasPrice(): Promise<bigint> {
  const hex = await rpc<string>("eth_gasPrice");
  return BigInt(hex);
}

export interface Block {
  number: string;
  timestamp: string;
  hash: string;
  gasUsed: string;
  gasLimit: string;
  transactions: string[];
}

export async function getBlock(tag: string | number = "latest"): Promise<Block> {
  const blockTag = typeof tag === "number" ? "0x" + tag.toString(16) : tag;
  return rpc<Block>("eth_getBlockByNumber", [blockTag, false]);
}

export async function getBalance(address: string): Promise<bigint> {
  const hex = await rpc<string>("eth_getBalance", [address, "latest"]);
  return BigInt(hex);
}

// --- Time manipulation ---

export async function setNextBlockTimestamp(timestamp: number): Promise<void> {
  await rpc("evm_setNextBlockTimestamp", [timestamp]);
}

export async function increaseTime(seconds: number): Promise<void> {
  await rpc("evm_increaseTime", [seconds]);
}

// --- Block control ---

export async function mine(blocks = 1): Promise<void> {
  await rpc("anvil_mine", [blocks]);
}

// --- Account management ---

export async function setBalance(address: string, wei: bigint): Promise<void> {
  await rpc("anvil_setBalance", [address, "0x" + wei.toString(16)]);
}

export async function impersonateAccount(address: string): Promise<void> {
  await rpc("anvil_impersonateAccount", [address]);
}

export async function stopImpersonating(address: string): Promise<void> {
  await rpc("anvil_stopImpersonatingAccount", [address]);
}

// --- Snapshots ---

export async function snapshot(): Promise<string> {
  return rpc<string>("evm_snapshot");
}

export async function revert(id: string): Promise<boolean> {
  return rpc<boolean>("evm_revert", [id]);
}

// --- Fork management ---

export interface ResetParams {
  forking?: {
    jsonRpcUrl?: string;
    blockNumber?: number;
  };
}

export async function resetFork(params: ResetParams = {}): Promise<void> {
  await rpc("anvil_reset", [params]);
}

// --- Contract deployment ---

export async function deployContract(
  bytecode: string,
  from: string
): Promise<string> {
  const txHash = await rpc<string>("eth_sendTransaction", [
    {
      from,
      data: bytecode.startsWith("0x") ? bytecode : "0x" + bytecode,
      gas: "0x1312D00", // 20M gas
    },
  ]);
  await rpc("anvil_mine", [1]);
  const receipt = await rpc<{ contractAddress: string | null }>(
    "eth_getTransactionReceipt",
    [txHash]
  );
  if (!receipt?.contractAddress) throw new Error("Deployment failed - no contract address in receipt");
  return receipt.contractAddress;
}

// --- Automine ---

export async function getAutomine(): Promise<boolean> {
  return rpc<boolean>("anvil_getAutomine");
}

export async function setAutomine(enabled: boolean): Promise<void> {
  await rpc("evm_setAutomine", [enabled]);
}

// --- Advanced: State editing ---

export async function setCode(address: string, code: string): Promise<void> {
  await rpc("anvil_setCode", [address, code.startsWith("0x") ? code : "0x" + code]);
}

export async function setNonce(address: string, nonce: number): Promise<void> {
  await rpc("anvil_setNonce", [address, "0x" + nonce.toString(16)]);
}

export async function getNonce(address: string): Promise<number> {
  const hex = await rpc<string>("eth_getTransactionCount", [address, "latest"]);
  return parseInt(hex, 16);
}

export async function setStorageAt(address: string, slot: string, value: string): Promise<void> {
  const fmtSlot = slot.startsWith("0x") ? slot : "0x" + slot;
  const fmtValue = value.startsWith("0x") ? value : "0x" + value;
  await rpc("anvil_setStorageAt", [address, fmtSlot, fmtValue]);
}

export async function getStorageAt(address: string, slot: string): Promise<string> {
  const fmtSlot = slot.startsWith("0x") ? slot : "0x" + slot;
  return rpc<string>("eth_getStorageAt", [address, fmtSlot, "latest"]);
}

export async function getCode(address: string): Promise<string> {
  return rpc<string>("eth_getCode", [address, "latest"]);
}

// --- Advanced: State dump/load ---

export async function dumpState(): Promise<string> {
  return rpc<string>("anvil_dumpState");
}

export async function loadState(data: string): Promise<void> {
  await rpc("anvil_loadState", [data.startsWith("0x") ? data : "0x" + data]);
}

// --- Advanced: Node config ---

export interface NodeInfo {
  currentBlockNumber: string;
  currentBlockTimestamp: string;
  currentBlockHash: string;
  hardFork: string;
  transactionOrder: string;
  environment: {
    chainId: number;
    gasLimit: string;
    gasPrice: string;
  };
  forkConfig: {
    forkUrl: string | null;
    forkBlockNumber: number | null;
    forkRetryBackoff: number | null;
  };
}

export async function getNodeInfo(): Promise<NodeInfo> {
  return rpc<NodeInfo>("anvil_nodeInfo");
}

export async function setIntervalMining(seconds: number): Promise<void> {
  await rpc("evm_setIntervalMining", [seconds]);
}

export async function setNextBlockBaseFee(wei: bigint): Promise<void> {
  await rpc("anvil_setNextBlockBaseFeePerGas", ["0x" + wei.toString(16)]);
}

export async function setAutoImpersonate(enabled: boolean): Promise<void> {
  await rpc("anvil_autoImpersonateAccount", [enabled]);
}

export async function setCoinbase(address: string): Promise<void> {
  await rpc("anvil_setCoinbase", [address]);
}

export async function setBlockTimestampInterval(seconds: number): Promise<void> {
  await rpc("anvil_setBlockTimestampInterval", [seconds]);
}

export async function removeBlockTimestampInterval(): Promise<void> {
  await rpc("anvil_removeBlockTimestampInterval");
}

export async function dropTransaction(txHash: string): Promise<void> {
  await rpc("anvil_dropTransaction", [txHash]);
}

// --- Advanced: Txpool ---

export interface TxpoolStatus {
  pending: string;
  queued: string;
}

export async function txpoolStatus(): Promise<TxpoolStatus> {
  return rpc<TxpoolStatus>("txpool_status");
}

export async function txpoolContent(): Promise<Record<string, unknown>> {
  return rpc<Record<string, unknown>>("txpool_content");
}

// --- Helpers ---

export function formatEther(wei: bigint): string {
  const str = wei.toString().padStart(19, "0");
  const whole = str.slice(0, -18) || "0";
  const frac = str.slice(-18).replace(/0+$/, "").slice(0, 6);
  return frac ? `${whole}.${frac}` : whole;
}

export function parseEther(eth: string): bigint {
  const [whole = "0", frac = ""] = eth.split(".");
  const padded = (frac + "000000000000000000").slice(0, 18);
  return BigInt(whole) * 10n ** 18n + BigInt(padded);
}
