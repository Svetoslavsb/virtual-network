import { useState, useEffect } from "react";
import {
  getNodeInfo,
  setIntervalMining,
  setNextBlockBaseFee,
  setAutoImpersonate,
  setCoinbase,
  setBlockTimestampInterval,
  removeBlockTimestampInterval,
  dropTransaction,
  parseEther,
  type NodeInfo,
} from "../lib/rpc";

export default function NodeConfig() {
  const [nodeInfo, setNodeInfo] = useState<NodeInfo | null>(null);
  const [status, setStatus] = useState("");

  // Interval mining
  const [interval, setInterval_] = useState("");
  // Base fee
  const [baseFee, setBaseFee] = useState("");
  // Coinbase
  const [coinbase, setCoinbase_] = useState("");
  // Timestamp interval
  const [tsInterval, setTsInterval] = useState("");
  // Drop tx
  const [txHash, setTxHash] = useState("");

  useEffect(() => {
    getNodeInfo().then(setNodeInfo).catch(() => {});
  }, []);

  const doSetIntervalMining = async () => {
    const s = parseInt(interval);
    if (isNaN(s)) return;
    try {
      await setIntervalMining(s);
      setStatus(s === 0 ? "Interval mining disabled" : `Mining every ${s}s`);
      setInterval_("");
    } catch (e: unknown) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const doSetBaseFee = async () => {
    if (!baseFee) return;
    try {
      await setNextBlockBaseFee(parseEther(baseFee));
      setStatus(`Base fee set to ${baseFee} ETH`);
      setBaseFee("");
    } catch (e: unknown) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const doSetCoinbase = async () => {
    if (!coinbase) return;
    try {
      await setCoinbase(coinbase);
      setStatus(`Coinbase set to ${coinbase.slice(0, 10)}...`);
      setCoinbase_("");
    } catch (e: unknown) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const doSetTsInterval = async () => {
    const s = parseInt(tsInterval);
    if (isNaN(s)) return;
    try {
      if (s === 0) {
        await removeBlockTimestampInterval();
        setStatus("Timestamp interval removed");
      } else {
        await setBlockTimestampInterval(s);
        setStatus(`Timestamp interval set to ${s}s`);
      }
      setTsInterval("");
    } catch (e: unknown) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const doAutoImpersonate = async (enabled: boolean) => {
    try {
      await setAutoImpersonate(enabled);
      setStatus(`Auto-impersonate ${enabled ? "enabled" : "disabled"}`);
    } catch (e: unknown) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const doDropTx = async () => {
    if (!txHash) return;
    try {
      await dropTransaction(txHash);
      setStatus(`Dropped ${txHash.slice(0, 14)}...`);
      setTxHash("");
    } catch (e: unknown) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <div className="panel">
      <h2>Node Config</h2>

      {nodeInfo && (
        <div className="node-info-grid">
          <div className="stat">
            <span className="label">Hard Fork</span>
            <span className="value">{nodeInfo.hardFork}</span>
          </div>
          <div className="stat">
            <span className="label">Tx Order</span>
            <span className="value">{nodeInfo.transactionOrder}</span>
          </div>
          <div className="stat">
            <span className="label">Fork URL</span>
            <span className="value mono">{nodeInfo.forkConfig.forkUrl ?? "none"}</span>
          </div>
          <div className="stat">
            <span className="label">Fork Block</span>
            <span className="value">{nodeInfo.forkConfig.forkBlockNumber?.toLocaleString() ?? "latest"}</span>
          </div>
        </div>
      )}

      <div className="field-group">
        <label>Interval Mining (seconds, 0 = disable)</label>
        <div className="input-row">
          <input
            type="number"
            placeholder="0"
            value={interval}
            onChange={(e) => setInterval_(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doSetIntervalMining()}
          />
          <button onClick={doSetIntervalMining}>Set</button>
        </div>
      </div>

      <div className="field-group">
        <label>Next Block Base Fee (ETH)</label>
        <div className="input-row">
          <input
            type="text"
            placeholder="0.000000001"
            value={baseFee}
            onChange={(e) => setBaseFee(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doSetBaseFee()}
          />
          <button onClick={doSetBaseFee}>Set</button>
        </div>
      </div>

      <div className="field-group">
        <label>Block Timestamp Interval (seconds, 0 = remove)</label>
        <div className="input-row">
          <input
            type="number"
            placeholder="12"
            value={tsInterval}
            onChange={(e) => setTsInterval(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doSetTsInterval()}
          />
          <button onClick={doSetTsInterval}>Set</button>
        </div>
      </div>

      <div className="field-group">
        <label>Coinbase Address</label>
        <div className="input-row">
          <input
            type="text"
            placeholder="0x..."
            value={coinbase}
            onChange={(e) => setCoinbase_(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doSetCoinbase()}
          />
          <button onClick={doSetCoinbase}>Set</button>
        </div>
      </div>

      <div className="field-group">
        <label>Auto-Impersonate All Senders</label>
        <div className="button-row">
          <button className="preset" onClick={() => doAutoImpersonate(true)}>Enable</button>
          <button className="preset" onClick={() => doAutoImpersonate(false)}>Disable</button>
        </div>
      </div>

      <div className="field-group">
        <label>Drop Transaction</label>
        <div className="input-row">
          <input
            type="text"
            placeholder="0x..."
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doDropTx()}
          />
          <button className="danger" onClick={doDropTx}>Drop</button>
        </div>
      </div>

      {status && <div className={`status ${status.startsWith("Error") ? "err" : ""}`}>{status}</div>}
    </div>
  );
}
