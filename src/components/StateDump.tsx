import { useState } from "react";
import { dumpState, loadState } from "../lib/rpc";

export default function StateDump() {
  const [stateData, setStateData] = useState("");
  const [status, setStatus] = useState("");

  const doDump = async () => {
    try {
      setStatus("Dumping state...");
      const data = await dumpState();
      setStateData(data);
      setStatus(`State dumped (${(data.length / 1024).toFixed(0)} KB)`);
    } catch (e: unknown) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const doLoad = async () => {
    if (!stateData.trim()) return;
    try {
      setStatus("Loading state...");
      await loadState(stateData.trim());
      setStatus("State loaded successfully");
    } catch (e: unknown) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const doCopy = async () => {
    if (!stateData) return;
    await navigator.clipboard.writeText(stateData);
    setStatus("Copied to clipboard");
  };

  const doDownload = () => {
    if (!stateData) return;
    const blob = new Blob([stateData], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `anvil-state-${Date.now()}.hex`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded");
  };

  const doUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".hex,.txt";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      setStateData(text.trim());
      setStatus(`Loaded file (${(text.length / 1024).toFixed(0)} KB)`);
    };
    input.click();
  };

  return (
    <div className="panel">
      <h2>State Dump / Load</h2>

      <div className="button-row">
        <button onClick={doDump}>Dump State</button>
        <button className="secondary" onClick={doLoad}>Load State</button>
      </div>

      {stateData && (
        <>
          <div className="code-display">
            {stateData.slice(0, 120)}... ({(stateData.length / 1024).toFixed(0)} KB)
          </div>
          <div className="button-row">
            <button className="preset" onClick={doCopy}>Copy</button>
            <button className="preset" onClick={doDownload}>Download</button>
          </div>
        </>
      )}

      <div className="field-group">
        <button className="secondary" onClick={doUpload}>Upload State File</button>
      </div>

      {status && <div className={`status ${status.startsWith("Error") ? "err" : ""}`}>{status}</div>}
    </div>
  );
}
