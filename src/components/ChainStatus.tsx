import { useEffect, useState } from "react";
import { getBlockNumber, getBlock, getChainId, getGasPrice, getAutomine, formatEther, type Block } from "../lib/rpc";

export default function ChainStatus() {
  const [blockNumber, setBlockNumber] = useState<number | null>(null);
  const [block, setBlock] = useState<Block | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [gasPrice, setGasPrice] = useState<bigint | null>(null);
  const [automine, setAutomine] = useState<boolean | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const [bn, cid, gp, am] = await Promise.all([
          getBlockNumber(),
          getChainId(),
          getGasPrice(),
          getAutomine(),
        ]);
        if (!active) return;
        setBlockNumber(bn);
        setChainId(cid);
        setGasPrice(gp);
        setAutomine(am);
        setConnected(true);
        const b = await getBlock("latest");
        if (active) setBlock(b);
      } catch {
        if (active) setConnected(false);
      }
    };
    poll();
    const id = setInterval(poll, 3000);
    return () => { active = false; clearInterval(id); };
  }, []);

  const ts = block ? new Date(parseInt(block.timestamp, 16) * 1000) : null;

  return (
    <div className="panel status-panel">
      <h2>Chain Status</h2>
      <div className={`connection-dot ${connected ? "ok" : "err"}`}>
        {connected ? "Connected" : "Disconnected"}
      </div>
      <div className="status-grid">
        <div className="stat">
          <span className="label">Block</span>
          <span className="value">{blockNumber?.toLocaleString() ?? "..."}</span>
        </div>
        <div className="stat">
          <span className="label">Timestamp</span>
          <span className="value">{ts ? ts.toLocaleString() : "..."}</span>
        </div>
        <div className="stat">
          <span className="label">Chain ID</span>
          <span className="value">{chainId ?? "..."}</span>
        </div>
        <div className="stat">
          <span className="label">Gas Price</span>
          <span className="value">{gasPrice != null ? formatEther(gasPrice) + " ETH" : "..."}</span>
        </div>
        <div className="stat">
          <span className="label">Automine</span>
          <span className="value">{automine != null ? (automine ? "ON" : "OFF") : "..."}</span>
        </div>
        <div className="stat">
          <span className="label">Block Hash</span>
          <span className="value mono">{block ? block.hash : "..."}</span>
        </div>
        <div className="stat">
          <span className="label">Txns in Block</span>
          <span className="value">{block ? block.transactions.length : "..."}</span>
        </div>
        <div className="stat">
          <span className="label">Gas Used</span>
          <span className="value">{block ? parseInt(block.gasUsed, 16).toLocaleString() : "..."}</span>
        </div>
      </div>
    </div>
  );
}
