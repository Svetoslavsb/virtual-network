import { useState } from "react";
import {
  getBalance,
  setBalance,
  impersonateAccount,
  stopImpersonating,
  formatEther,
  parseEther,
} from "../lib/rpc";

export default function AccountManager() {
  const [address, setAddress] = useState("");
  const [balance, setBalanceDisplay] = useState<string | null>(null);
  const [ethAmount, setEthAmount] = useState("");
  const [impersonated, setImpersonated] = useState<string[]>([]);
  const [status, setStatus] = useState("");

  const fetchBalance = async () => {
    if (!address) return;
    try {
      const bal = await getBalance(address);
      setBalanceDisplay(formatEther(bal));
    } catch (e: unknown) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const doSetBalance = async () => {
    if (!address || !ethAmount) return;
    try {
      setStatus("Setting balance...");
      const wei = parseEther(ethAmount);
      await setBalance(address, wei);
      setStatus(`Set ${address.slice(0, 10)}... to ${ethAmount} ETH`);
      setBalanceDisplay(ethAmount);
      setEthAmount("");
    } catch (e: unknown) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const doImpersonate = async () => {
    if (!address) return;
    try {
      await impersonateAccount(address);
      setImpersonated((prev) => [...new Set([...prev, address])]);
      setStatus(`Impersonating ${address.slice(0, 10)}...`);
    } catch (e: unknown) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const doStopImpersonating = async (addr: string) => {
    try {
      await stopImpersonating(addr);
      setImpersonated((prev) => prev.filter((a) => a !== addr));
      setStatus(`Stopped impersonating ${addr.slice(0, 10)}...`);
    } catch (e: unknown) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const fundPresets = [
    { label: "1 ETH", value: "1" },
    { label: "10 ETH", value: "10" },
    { label: "100 ETH", value: "100" },
    { label: "1000 ETH", value: "1000" },
    { label: "10000 ETH", value: "10000" },
  ];

  return (
    <div className="panel">
      <h2>Account Manager</h2>

      <div className="field-group">
        <label>Address</label>
        <div className="input-row">
          <input
            type="text"
            placeholder="0x..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <button onClick={fetchBalance}>Balance</button>
        </div>
        {balance != null && <div className="info">{balance} ETH</div>}
      </div>

      <div className="field-group">
        <label>Set Balance (ETH)</label>
        <div className="input-row">
          <input
            type="text"
            placeholder="Amount in ETH"
            value={ethAmount}
            onChange={(e) => setEthAmount(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doSetBalance()}
          />
          <button onClick={doSetBalance}>Set</button>
        </div>
        <div className="presets">
          {fundPresets.map((p) => (
            <button key={p.value} className="preset" onClick={() => setEthAmount(p.value)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field-group">
        <button onClick={doImpersonate}>Impersonate</button>
      </div>

      {impersonated.length > 0 && (
        <div className="field-group">
          <label>Impersonated Accounts</label>
          <ul className="impersonated-list">
            {impersonated.map((addr) => (
              <li key={addr}>
                <span className="mono">{addr}</span>
                <button className="small danger" onClick={() => doStopImpersonating(addr)}>
                  Stop
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {status && <div className={`status ${status.startsWith("Error") ? "err" : ""}`}>{status}</div>}
    </div>
  );
}
