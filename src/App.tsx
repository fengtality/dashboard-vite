import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AccountProvider } from './components/account-provider';
import Layout from './components/Layout';
import Home from './pages/Home';
import TradePage from './pages/TradePage';
import ManageKeys from './pages/ManageKeys';
import CreateConfig from './pages/CreateConfig';
import GridStrikeConfig from './pages/GridStrikeConfig';
import BotDetail from './pages/BotDetail';
import DeployBot from './pages/DeployBot';
import ArchivedBots from './pages/ArchivedBots';
import AccountPage from './pages/AccountPage';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <AccountProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            {/* Trade */}
            <Route path="trade/spot" element={<TradePage type="spot" />} />
            <Route path="trade/perp" element={<TradePage type="perp" />} />
            {/* Keys */}
            <Route path="keys" element={<ManageKeys />} />
            {/* Strategies */}
            <Route path="controllers" element={<CreateConfig />} />
            <Route path="controllers/grid-strike" element={<GridStrikeConfig />} />
            {/* Bots */}
            <Route path="bots/:botName" element={<BotDetail />} />
            <Route path="bots/deploy" element={<DeployBot />} />
            <Route path="bots/archived" element={<ArchivedBots />} />
            {/* Account */}
            <Route path="account" element={<AccountPage />} />
          </Route>
        </Routes>
      </AccountProvider>
    </BrowserRouter>
  );
}

export default App;
