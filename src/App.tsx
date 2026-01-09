import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AccountProvider } from './components/account-provider';
import Layout from './components/Layout';
import ConnectorDetail from './pages/ConnectorDetail';
import ManageKeys from './pages/ManageKeys';
import CreateConfig from './pages/CreateConfig';
import GridStrikeConfig from './pages/GridStrikeConfig';
import CreateScriptConfig from './pages/CreateScriptConfig';
import BotDetail from './pages/BotDetail';
import DeployBot from './pages/DeployBot';
import ArchivedBots from './pages/ArchivedBots';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <AccountProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/bots/deploy" replace />} />
            {/* Connectors */}
            <Route path="connectors/keys" element={<ManageKeys />} />
            <Route path="connectors/:connectorName" element={<ConnectorDetail />} />
            {/* Strategies */}
            <Route path="controllers" element={<CreateConfig />} />
            <Route path="controllers/grid-strike" element={<GridStrikeConfig />} />
            <Route path="scripts" element={<CreateScriptConfig />} />
            {/* Bots */}
            <Route path="bots/:botName" element={<BotDetail />} />
            <Route path="bots/deploy" element={<DeployBot />} />
            <Route path="bots/archived" element={<ArchivedBots />} />
          </Route>
        </Routes>
      </AccountProvider>
    </BrowserRouter>
  );
}

export default App;
