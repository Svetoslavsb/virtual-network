import { useState } from "react";
import {
  setCode,
  getCode,
  setNonce,
  getNonce,
  setStorageAt,
  getStorageAt,
} from "../lib/rpc";

type Tab = "code" | "nonce" | "storage";

export default function StateEditor() {
  const [tab, setTab] = useState<Tab>("code");
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState("");

  // Code
  const [codeValue, setCodeValue] = useState("");
  const [currentCode, setCurrentCode] = useState<string | null>(null);

  // Nonce
  const [nonceValue, setNonceValue] = useState("");
  const [currentNonce, setCurrentNonce] = useState<number | null>(null);

  // Storage
  const [slot, setSlot] = useState("");
  const [storageValue, setStorageValue] = useState("");
  const [currentStorage, setCurrentStorage] = useState<string | null>(null);

  const doSetCode = async () => {
    if (!address || !codeValue) return;
    try {
      setStatus("Setting code...");
      await setCode(address, codeValue);
      setStatus(`Code set at ${address.slice(0, 10)}...`);
    } catch (e: unknown) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const doGetCode = async () => {
    if (!address) return;
    try {
      const code = await getCode(address);
      setCurrentCode(code === "0x" ? "(no code - EOA)" : code);
    } catch (e: unknown) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const doSetNonce = async () => {
    if (!address || !nonceValue) return;
    try {
      setStatus("Setting nonce...");
      await setNonce(address, parseInt(nonceValue));
      setStatus(`Nonce set to ${nonceValue}`);
    } catch (e: unknown) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const doGetNonce = async () => {
    if (!address) return;
    try {
      const n = await getNonce(address);
      setCurrentNonce(n);
    } catch (e: unknown) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const doSetStorage = async () => {
    if (!address || !slot || !storageValue) return;
    try {
      setStatus("Setting storage...");
      await setStorageAt(address, slot, storageValue);
      setStatus(`Storage slot ${slot.slice(0, 10)}... set`);
    } catch (e: unknown) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const doGetStorage = async () => {
    if (!address || !slot) return;
    try {
      const val = await getStorageAt(address, slot);
      setCurrentStorage(val);
    } catch (e: unknown) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <div className="panel">
      <h2>State Editor</h2>

      <div className="field-group">
        <label>Address</label>
        <input
          type="text"
          placeholder="0x..."
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>

      <div className="tab-row">
        {(["code", "nonce", "storage"] as Tab[]).map((t) => (
          <button
            key={t}
            className={`tab ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "code" && (
        <>
          <div className="field-group">
            <label>Bytecode</label>
            <textarea
              placeholder="0x6080..."
              value={codeValue}
              onChange={(e) => setCodeValue(e.target.value)}
              rows={3}
            />
          </div>
          <div className="button-row">
            <button onClick={doSetCode}>Set Code</button>
            <button className="secondary" onClick={doGetCode}>Get Code</button>
          </div>
          {currentCode != null && (
            <div className="code-display scrollable">{currentCode}</div>
          )}
        </>
      )}

      {tab === "nonce" && (
        <>
          <div className="field-group">
            <label>Nonce</label>
            <div className="input-row">
              <input
                type="number"
                placeholder="0"
                value={nonceValue}
                onChange={(e) => setNonceValue(e.target.value)}
              />
              <button onClick={doSetNonce}>Set</button>
              <button className="secondary" onClick={doGetNonce}>Get</button>
            </div>
          </div>
          {currentNonce != null && <div className="info">{currentNonce}</div>}
        </>
      )}

      {tab === "storage" && (
        <>
          <div className="field-group">
            <label>Slot</label>
            <input
              type="text"
              placeholder="0x0"
              value={slot}
              onChange={(e) => setSlot(e.target.value)}
            />
          </div>
          <div className="field-group">
            <label>Value (32 bytes)</label>
            <input
              type="text"
              placeholder="0x..."
              value={storageValue}
              onChange={(e) => setStorageValue(e.target.value)}
            />
          </div>
          <div className="button-row">
            <button onClick={doSetStorage}>Set Storage</button>
            <button className="secondary" onClick={doGetStorage}>Get Storage</button>
          </div>
          {currentStorage != null && <div className="code-display">{currentStorage}</div>}
        </>
      )}

      {status && <div className={`status ${status.startsWith("Error") ? "err" : ""}`}>{status}</div>}
    </div>
  );
}
