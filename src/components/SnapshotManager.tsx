import { useState } from "react";
import { snapshot, revert } from "../lib/rpc";

interface Snap {
  id: string;
  label: string;
  time: Date;
}

export default function SnapshotManager() {
  const [snapshots, setSnapshots] = useState<Snap[]>([]);
  const [status, setStatus] = useState("");

  const doSnapshot = async () => {
    try {
      const id = await snapshot();
      const snap: Snap = {
        id,
        label: `Snapshot #${snapshots.length + 1}`,
        time: new Date(),
      };
      setSnapshots((prev) => [...prev, snap]);
      setStatus(`Created ${snap.label} (id: ${id})`);
    } catch (e: unknown) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const doRevert = async (snap: Snap) => {
    try {
      setStatus(`Reverting to ${snap.label}...`);
      const ok = await revert(snap.id);
      if (ok) {
        setStatus(`Reverted to ${snap.label}`);
        setSnapshots((prev) => prev.filter((s) => parseInt(s.id, 16) <= parseInt(snap.id, 16)));
      } else {
        setStatus(`Revert failed - snapshot may have been consumed`);
      }
    } catch (e: unknown) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <div className="panel">
      <h2>Snapshots</h2>

      <button onClick={doSnapshot}>Take Snapshot</button>

      {snapshots.length > 0 && (
        <div className="snapshot-list">
          {snapshots.map((snap) => (
            <div key={snap.id} className="snapshot-item">
              <div>
                <strong>{snap.label}</strong>
                <span className="mono dim"> {snap.id}</span>
                <br />
                <span className="dim">{snap.time.toLocaleTimeString()}</span>
              </div>
              <button className="small" onClick={() => doRevert(snap)}>
                Revert
              </button>
            </div>
          ))}
        </div>
      )}

      {snapshots.length === 0 && <div className="dim">No snapshots yet</div>}

      {status && <div className={`status ${status.startsWith("Error") ? "err" : ""}`}>{status}</div>}
    </div>
  );
}
