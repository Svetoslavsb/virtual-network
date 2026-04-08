const RPC_URL = "http://localhost:8545";

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
