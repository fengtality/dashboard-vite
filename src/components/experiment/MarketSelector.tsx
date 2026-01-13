import { useState, useEffect } from 'react';
import { Loader2, Key, Wallet } from 'lucide-react';
import { connectors as connectorsApi, accounts } from '@/api/hummingbot-api';
import { gatewayClient } from '@/api/gateway';
import type { WalletInfo } from '@/api/gateway';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useExperiment, type ConnectorType } from './ExperimentProvider';
import { useAccount } from '@/components/account-provider';

function ConnectorLabel({ name, type }: { name: string; type: string }) {
  return (
    <span className="flex items-center justify-between w-full gap-2">
      <span className="truncate">{name}</span>
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 shrink-0 font-normal">
        {type}
      </Badge>
    </span>
  );
}

interface ConnectorOption extends ComboboxOption {
  connectorType: ConnectorType;
}

export function MarketSelector() {
  const {
    selectedConnector,
    selectedConnectorType,
    selectedPair,
    setSelectedConnector,
    setSelectedPair,
  } = useExperiment();
  const { favorites, account } = useAccount();

  const [connectorOptions, setConnectorOptions] = useState<ConnectorOption[]>([]);
  const [pairOptions, setPairOptions] = useState<ComboboxOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPairs, setLoadingPairs] = useState(false);
  const [credentials, setCredentials] = useState<string[]>([]);
  const [wallets, setWallets] = useState<WalletInfo[]>([]);

  // Fetch connectors from both Hummingbot and Gateway
  useEffect(() => {
    async function fetchConnectors() {
      setLoading(true);
      const options: ConnectorOption[] = [];

      try {
        // Fetch Hummingbot connectors (exclude router/gateway connectors)
        const hbConnectors = await connectorsApi.list();
        for (const connector of hbConnectors) {
          // Skip router connectors (these are Gateway-based)
          if (connector.includes('/')) continue;
          const isPerp = connector.includes('perpetual');
          options.push({
            value: connector,
            label: <ConnectorLabel name={connector} type={isPerp ? 'perp' : 'spot'} />,
            searchValue: connector,
            connectorType: 'hummingbot',
          });
        }
      } catch (err) {
        console.error('Failed to fetch Hummingbot connectors:', err);
      }

      try {
        // Fetch Gateway chains (not connectors)
        const gwResponse = await gatewayClient.config.getChains();
        for (const chain of gwResponse.chains) {
          // Create entries for each chain-network combination
          for (const network of chain.networks) {
            const value = `${chain.chain}-${network}`;
            options.push({
              value,
              label: <ConnectorLabel name={value} type="network" />,
              searchValue: value,
              connectorType: 'gateway',
            });
          }
        }
      } catch (err) {
        console.error('Failed to fetch Gateway chains:', err);
      }

      // Sort alphabetically
      options.sort((a, b) => a.value.localeCompare(b.value));
      setConnectorOptions(options);
      setLoading(false);
    }

    fetchConnectors();
  }, []);

  // Fetch credentials for the account
  useEffect(() => {
    if (!account) {
      setCredentials([]);
      return;
    }
    async function fetchCredentials() {
      try {
        const creds = await accounts.getCredentials(account);
        setCredentials(creds);
      } catch (err) {
        console.error('Failed to fetch credentials:', err);
        setCredentials([]);
      }
    }
    fetchCredentials();
  }, [account]);

  // Fetch wallets for Gateway
  useEffect(() => {
    async function fetchWallets() {
      try {
        const walletList = await gatewayClient.wallet.list();
        setWallets(walletList);
      } catch (err) {
        console.error('Failed to fetch wallets:', err);
        setWallets([]);
      }
    }
    fetchWallets();
  }, []);

  // Fetch trading pairs when connector changes
  useEffect(() => {
    if (!selectedConnector) {
      setPairOptions([]);
      return;
    }

    async function fetchPairs() {
      setLoadingPairs(true);
      setPairOptions([]);

      try {
        if (selectedConnectorType === 'gateway') {
          // Gateway connector format: chain-network (e.g., solana-mainnet-beta)
          const parts = selectedConnector.split('-');
          const chain = parts[0];
          const network = parts.slice(1).join('-');

          const response = await gatewayClient.chains.getTokens(chain, network);
          const options: ComboboxOption[] = response.tokens.map(token => ({
            value: token.symbol,
            label: token.symbol,
          }));
          // Sort alphabetically
          options.sort((a, b) => a.value.localeCompare(b.value));
          setPairOptions(options);
        } else {
          // Hummingbot connector - fetch trading rules (keys are trading pairs)
          const tradingRules = await connectorsApi.getAllTradingRules(selectedConnector);
          const pairs = Object.keys(tradingRules);
          const options: ComboboxOption[] = pairs.map(pair => ({
            value: pair,
            label: pair,
          }));
          // Sort alphabetically
          options.sort((a, b) => a.value.localeCompare(b.value));
          setPairOptions(options);
        }
      } catch (err) {
        console.error('Failed to fetch pairs:', err);
        // Keep empty options so user can still type custom value
      } finally {
        setLoadingPairs(false);
      }
    }

    fetchPairs();
  }, [selectedConnector, selectedConnectorType]);

  const handleConnectorChange = (value: string) => {
    // Find the connector type from options, or default to hummingbot for custom values
    const option = connectorOptions.find(o => o.value === value);
    const type: ConnectorType = option?.connectorType ||
      (value.includes('-') && (value.includes('mainnet') || value.includes('testnet'))
        ? 'gateway'
        : 'hummingbot');

    setSelectedConnector(value, type);
    // Clear pair when connector changes
    setSelectedPair('');
  };

  // Determine placeholder text based on connector type
  const pairPlaceholder = selectedConnectorType === 'gateway'
    ? 'Token or pool'
    : 'Trading pair';

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading connectors...</span>
      </div>
    );
  }

  const handleFavoriteClick = (connector: string, pair: string) => {
    // Find connector type
    const option = connectorOptions.find(o => o.value === connector);
    const type: ConnectorType = option?.connectorType ||
      (connector.includes('-') && (connector.includes('mainnet') || connector.includes('testnet'))
        ? 'gateway'
        : 'hummingbot');

    setSelectedConnector(connector, type);
    setSelectedPair(pair);
  };

  // Get the active credential or wallet for the selected connector
  const getActiveKeyOrWallet = (): { type: 'key' | 'wallet'; value: string } | null => {
    if (!selectedConnector) return null;

    if (selectedConnectorType === 'gateway') {
      // For gateway, find the default wallet for the chain
      const chain = selectedConnector.split('-')[0]; // e.g., "solana" from "solana-mainnet-beta"
      const defaultWallet = wallets.find(w => w.chain === chain && w.isDefault);
      if (defaultWallet) {
        // Shorten address: first 4 + last 4 chars
        const short = `${defaultWallet.address.slice(0, 6)}...${defaultWallet.address.slice(-4)}`;
        return { type: 'wallet', value: short };
      }
    } else {
      // For hummingbot, check if we have a credential for this connector
      // Credentials format is typically "connector_name" matching the connector
      const baseConnector = selectedConnector.replace('_perpetual', '');
      const hasCredential = credentials.some(c =>
        c.toLowerCase().includes(baseConnector.toLowerCase()) ||
        baseConnector.toLowerCase().includes(c.toLowerCase())
      );
      if (hasCredential) {
        return { type: 'key', value: 'API Key' };
      }
    }
    return null;
  };

  const activeKeyOrWallet = getActiveKeyOrWallet();

  return (
    <div className="flex items-center gap-3 w-full">
      <Combobox
        options={connectorOptions}
        value={selectedConnector}
        onValueChange={handleConnectorChange}
        placeholder="Exchanges and chains"
        searchPlaceholder="Search exchanges and chains..."
        emptyText="No exchanges or chains found"
        allowCustomValue
        className="w-[280px] h-9"
      />
      <Combobox
        options={pairOptions}
        value={selectedPair}
        onValueChange={setSelectedPair}
        placeholder={loadingPairs ? 'Loading pairs...' : pairPlaceholder}
        searchPlaceholder="Search pairs..."
        emptyText={loadingPairs ? 'Loading...' : 'No pairs found'}
        allowCustomValue
        className="w-[200px] h-9"
        disabled={!selectedConnector || loadingPairs}
      />

      {/* Favorite pairs as buttons */}
      {favorites.length > 0 && (
        <>
          <div className="w-px h-7 bg-border mx-1" />
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {favorites.map((fav) => {
              const initial = fav.connector.charAt(0).toUpperCase();
              const isActive = selectedConnector === fav.connector && selectedPair === fav.pair;
              return (
                <Button
                  key={`${fav.connector}-${fav.pair}`}
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  className="h-9 px-3 text-sm whitespace-nowrap"
                  onClick={() => handleFavoriteClick(fav.connector, fav.pair)}
                  title={`${fav.connector} - ${fav.pair}`}
                >
                  <span className="w-5 h-5 rounded bg-muted text-muted-foreground flex items-center justify-center text-xs font-semibold mr-2">
                    {initial}
                  </span>
                  {fav.pair}
                </Button>
              );
            })}
          </div>
        </>
      )}

      {/* Spacer to push wallet/key to right */}
      <div className="flex-1" />

      {/* Active wallet or API key indicator */}
      {activeKeyOrWallet && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
          {activeKeyOrWallet.type === 'wallet' ? (
            <>
              <Wallet className="h-4 w-4" />
              <span className="font-mono text-xs">{activeKeyOrWallet.value}</span>
            </>
          ) : (
            <>
              <Key className="h-4 w-4" />
              <span className="text-xs">{activeKeyOrWallet.value}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
