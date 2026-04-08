import { useState } from "react";
import ChainStatus from "./components/ChainStatus";
import TimeControl from "./components/TimeControl";
import BlockControl from "./components/BlockControl";
import AccountManager from "./components/AccountManager";
import SnapshotManager from "./components/SnapshotManager";
import ForkManager from "./components/ForkManager";
import ContractDeployer from "./components/ContractDeployer";
import StateEditor from "./components/StateEditor";
import StateDump from "./components/StateDump";
import NodeConfig from "./components/NodeConfig";
import TxPool from "./components/TxPool";
import "./App.css";

function App() {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <div className="app">
      <header className="header">
        <h1>Virtual Testnet</h1>
        <span className="subtitle">Anvil Admin Interface</span>
      </header>

      <main className="dashboard">
        <ChainStatus />
        <TimeControl />
        <BlockControl />
        <AccountManager />
        <SnapshotManager />
        <ForkManager />
        <ContractDeployer />
      </main>

      <section className="advanced-section">
        <button
          className="advanced-toggle"
          onClick={() => setAdvancedOpen(!advancedOpen)}
        >
          <span className={`chevron ${advancedOpen ? "open" : ""}`}>&#9656;</span>
          Advanced
        </button>

        {advancedOpen && (
          <div className="dashboard">
            <NodeConfig />
            <StateEditor />
            <StateDump />
            <TxPool />
          </div>
        )}
      </section>
    </div>
  );
}

export default App;
