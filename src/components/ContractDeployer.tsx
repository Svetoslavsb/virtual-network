import { useState } from "react";
import { deployContract } from "../lib/rpc";

const DEFAULT_DEPLOYER = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

export default function ContractDeployer() {
  const [bytecode, setBytecode] = useState("");
  const [from, setFrom] = useState(DEFAULT_DEPLOYER);
  const [deployed, setDeployed] = useState<string[]>([]);
  const [status, setStatus] = useState("");

  const doDeploy = async () => {
    if (!bytecode.trim()) return;
    try {
      setStatus("Deploying...");
      const addr = await deployContract(bytecode.trim(), from);
      setDeployed((prev) => [addr, ...prev]);
      setStatus(`Deployed at ${addr}`);
      setBytecode("");
    } catch (e: unknown) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <div className="panel">
      <h2>Contract Deployer</h2>

      <div className="field-group">
        <label>Deployer Address</label>
        <input
          type="text"
          placeholder="0x..."
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
      </div>

      <div className="field-group">
        <label>Bytecode</label>
        <textarea
          placeholder="0x6080604052..."
          value={bytecode}
          onChange={(e) => setBytecode(e.target.value)}
          rows={5}
        />
      </div>

      <button onClick={doDeploy}>Deploy</button>

      {deployed.length > 0 && (
        <div className="field-group">
          <label>Deployed Contracts</label>
          <ul className="deployed-list">
            {deployed.map((addr, i) => (
              <li key={i} className="mono">
                {addr}
              </li>
            ))}
          </ul>
        </div>
      )}

      {status && <div className={`status ${status.startsWith("Error") ? "err" : ""}`}>{status}</div>}
    </div>
  );
}
