import { useState } from "react";
import { mine, setAutomine as rpcSetAutomine, getAutomine } from "../lib/rpc";

export default function BlockControl() {
  const [count, setCount] = useState("1");
  const [status, setStatus] = useState("");
  const [automine, setAutomine] = useState<boolean | null>(null);

  const doMine = async () => {
    const n = parseInt(count);
    if (!n || n <= 0) return;
    try {
      setStatus("Mining...");
      await mine(n);
      setStatus(`Mined ${n} block${n > 1 ? "s" : ""}`);
    } catch (e: unknown) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const toggleAutomine = async () => {
    try {
      const current = await getAutomine();
      await rpcSetAutomine(!current);
      setAutomine(!current);
      setStatus(`Automine ${!current ? "enabled" : "disabled"}`);
    } catch (e: unknown) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <div className="panel">
      <h2>Block Control</h2>

      <div className="field-group">
        <label>Mine Blocks</label>
        <div className="input-row">
          <input
            type="number"
            min="1"
            placeholder="Number of blocks"
            value={count}
            onChange={(e) => setCount(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doMine()}
          />
          <button onClick={doMine}>Mine</button>
        </div>
        <div className="presets">
          {[1, 10, 100, 1000].map((n) => (
            <button key={n} className="preset" onClick={() => setCount(String(n))}>
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="field-group">
        <label>Automine</label>
        <button onClick={toggleAutomine}>
          {automine != null ? (automine ? "Disable Automine" : "Enable Automine") : "Toggle Automine"}
        </button>
      </div>

      {status && <div className={`status ${status.startsWith("Error") ? "err" : ""}`}>{status}</div>}
    </div>
  );
}
