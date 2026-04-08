import { useState } from "react";
import { resetFork } from "../lib/rpc";

export default function ForkManager() {
  const [rpcUrl, setRpcUrl] = useState("");
  const [blockNumber, setBlockNumber] = useState("");
  const [status, setStatus] = useState("");

  const doReset = async () => {
    try {
      setStatus("Resetting fork...");
      const params: { forking?: { jsonRpcUrl?: string; blockNumber?: number } } = {};
      if (rpcUrl || blockNumber) {
        params.forking = {};
        if (rpcUrl) params.forking.jsonRpcUrl = rpcUrl;
        if (blockNumber) params.forking.blockNumber = parseInt(blockNumber);
      }
      await resetFork(params);
      setStatus("Fork reset successfully");
    } catch (e: unknown) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const doResetToLatest = async () => {
    try {
      setStatus("Resetting to latest...");
      await resetFork({ forking: { jsonRpcUrl: rpcUrl || undefined } });
      setStatus("Reset to latest block");
    } catch (e: unknown) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <div className="panel">
      <h2>Fork Manager</h2>

      <div className="field-group">
        <label>RPC URL (optional, uses current if empty)</label>
        <input
          type="text"
          placeholder="https://..."
          value={rpcUrl}
          onChange={(e) => setRpcUrl(e.target.value)}
        />
      </div>

      <div className="field-group">
        <label>Block Number (optional, latest if empty)</label>
        <input
          type="number"
          placeholder="Block number"
          value={blockNumber}
          onChange={(e) => setBlockNumber(e.target.value)}
        />
      </div>

      <div className="button-row">
        <button onClick={doReset}>Reset Fork</button>
        <button className="secondary" onClick={doResetToLatest}>
          Reset to Latest
        </button>
      </div>

      {status && <div className={`status ${status.startsWith("Error") ? "err" : ""}`}>{status}</div>}
    </div>
  );
}
