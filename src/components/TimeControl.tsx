import { useState } from "react";
import { increaseTime, setNextBlockTimestamp, mine } from "../lib/rpc";

export default function TimeControl() {
  const [seconds, setSeconds] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const [status, setStatus] = useState("");

  const skip = async () => {
    const s = parseInt(seconds);
    if (!s || s <= 0) return;
    try {
      setStatus("Skipping...");
      await increaseTime(s);
      await mine(1);
      setStatus(`Skipped ${s}s forward`);
      setSeconds("");
    } catch (e: unknown) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const setTs = async () => {
    const ts = parseInt(timestamp);
    if (!ts) return;
    try {
      setStatus("Setting timestamp...");
      await setNextBlockTimestamp(ts);
      await mine(1);
      setStatus(`Timestamp set to ${ts}`);
      setTimestamp("");
    } catch (e: unknown) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const presets = [
    { label: "1 min", value: 60 },
    { label: "1 hour", value: 3600 },
    { label: "1 day", value: 86400 },
    { label: "1 week", value: 604800 },
    { label: "30 days", value: 2592000 },
  ];

  return (
    <div className="panel">
      <h2>Time Control</h2>

      <div className="field-group">
        <label>Skip Forward (seconds)</label>
        <div className="input-row">
          <input
            type="number"
            placeholder="Seconds"
            value={seconds}
            onChange={(e) => setSeconds(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && skip()}
          />
          <button onClick={skip}>Skip</button>
        </div>
        <div className="presets">
          {presets.map((p) => (
            <button key={p.value} className="preset" onClick={() => { setSeconds(String(p.value)); }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field-group">
        <label>Set Timestamp (unix)</label>
        <div className="input-row">
          <input
            type="number"
            placeholder="Unix timestamp"
            value={timestamp}
            onChange={(e) => setTimestamp(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setTs()}
          />
          <button onClick={setTs}>Set</button>
        </div>
        <button className="preset" onClick={() => setTimestamp(String(Math.floor(Date.now() / 1000)))}>
          Now
        </button>
      </div>

      {status && <div className={`status ${status.startsWith("Error") ? "err" : ""}`}>{status}</div>}
    </div>
  );
}
