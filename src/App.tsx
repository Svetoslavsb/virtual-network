import ChainStatus from "./components/ChainStatus";
import TimeControl from "./components/TimeControl";
import BlockControl from "./components/BlockControl";
import AccountManager from "./components/AccountManager";
import SnapshotManager from "./components/SnapshotManager";
import ForkManager from "./components/ForkManager";
import ContractDeployer from "./components/ContractDeployer";
import "./App.css";

function App() {
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
    </div>
  );
}

export default App;
