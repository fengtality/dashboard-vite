import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AccountProvider } from './components/account-provider';
import { GatewayStatusProvider } from './components/gateway-status-provider';
import Layout from './components/Layout';
import Home from './pages/Home';
import TradePage from './pages/TradePage';
import AMMPage from './pages/AMMPage';
import ManageKeys from './pages/ManageKeys';
import CreateConfig from './pages/CreateConfig';
import GridStrikeConfig from './pages/GridStrikeConfig';
import StrategiesPage from './pages/StrategiesPage';
import BotsPage from './pages/BotsPage';
import BotDetail from './pages/BotDetail';
import DeployBot from './pages/DeployBot';
import AccountPage from './pages/AccountPage';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <AccountProvider>
        <GatewayStatusProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            {/* Trade */}
            <Route path="trade/spot" element={<TradePage type="spot" />} />
            <Route path="trade/perp" element={<TradePage type="perp" />} />
            <Route path="trade/amm" element={<AMMPage />} />
            {/* Keys */}
            <Route path="keys" element={<ManageKeys />} />
            {/* Strategies */}
            <Route path="strategies" element={<StrategiesPage />} />
            <Route path="strategies/config" element={<CreateConfig />} />
            <Route path="strategies/grid-strike" element={<GridStrikeConfig />} />
            {/* Bots */}
            <Route path="bots" element={<BotsPage />} />
            <Route path="bots/:botName" element={<BotDetail />} />
            <Route path="bots/deploy" element={<DeployBot />} />
            {/* Settings */}
            <Route path="settings" element={<AccountPage />} />
          </Route>
        </Routes>
        </GatewayStatusProvider>
      </AccountProvider>
    </BrowserRouter>
  );
}

export default App;
