import { useState } from "react";
import { txpoolStatus, txpoolContent } from "../lib/rpc";

export default function TxPool() {
  const [pending, setPending] = useState<number | null>(null);
  const [queued, setQueued] = useState<number | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  const doStatus = async () => {
    try {
      const s = await txpoolStatus();
      setPending(parseInt(s.pending, 16));
      setQueued(parseInt(s.queued, 16));
    } catch (e: unknown) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const doContent = async () => {
    try {
      setStatus("Fetching pool content...");
      const c = await txpoolContent();
      const json = JSON.stringify(c, null, 2);
      setContent(json);
      setStatus(`Pool content fetched (${(json.length / 1024).toFixed(1)} KB)`);
    } catch (e: unknown) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <div className="panel">
      <h2>Transaction Pool</h2>

      <div className="button-row">
        <button onClick={doStatus}>Refresh Status</button>
        <button className="secondary" onClick={doContent}>View Content</button>
      </div>

      {pending != null && (
        <div className="status-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div className="stat">
            <span className="label">Pending</span>
            <span className="value">{pending}</span>
          </div>
          <div className="stat">
            <span className="label">Queued</span>
            <span className="value">{queued}</span>
          </div>
        </div>
      )}

      {content != null && (
        <div className="code-display scrollable">
          <pre>{content.length > 2000 ? content.slice(0, 2000) + "\n..." : content}</pre>
        </div>
      )}

      {status && <div className={`status ${status.startsWith("Error") ? "err" : ""}`}>{status}</div>}
    </div>
  );
}
