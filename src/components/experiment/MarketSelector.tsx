import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { connectors as connectorsApi } from '@/api/hummingbot-api';
import { gatewayClient } from '@/api/gateway';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Button } from '@/components/ui/button';
import { useExperiment, type ConnectorType } from './ExperimentProvider';
import { useAccount } from '@/components/account-provider';
import { formatConnectorName } from '@/lib/formatting';

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
  const { favorites } = useAccount();

  const [connectorOptions, setConnectorOptions] = useState<ConnectorOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch connectors from both Hummingbot and Gateway
  useEffect(() => {
    async function fetchConnectors() {
      setLoading(true);
      const options: ConnectorOption[] = [];

      try {
        // Fetch Hummingbot connectors
        const hbConnectors = await connectorsApi.list();
        for (const connector of hbConnectors) {
          options.push({
            value: connector,
            label: formatConnectorName(connector),
            searchValue: connector,
            connectorType: 'hummingbot',
          });
        }
      } catch (err) {
        console.error('Failed to fetch Hummingbot connectors:', err);
      }

      try {
        // Fetch Gateway connectors
        const gwResponse = await gatewayClient.config.getConnectors();
        for (const connector of gwResponse.connectors) {
          // Create entries for each chain-network combination
          for (const network of connector.networks) {
            const value = `${connector.chain}-${network}`;
            options.push({
              value,
              label: `${connector.name} (${connector.chain}/${network})`,
              searchValue: `${connector.name} ${connector.chain} ${network}`,
              connectorType: 'gateway',
            });
          }
        }
      } catch (err) {
        console.error('Failed to fetch Gateway connectors:', err);
      }

      setConnectorOptions(options);
      setLoading(false);
    }

    fetchConnectors();
  }, []);

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

  return (
    <div className="flex items-center gap-2">
      <Combobox
        options={connectorOptions}
        value={selectedConnector}
        onValueChange={handleConnectorChange}
        placeholder="Select connector..."
        searchPlaceholder="Search connectors..."
        emptyText="No connectors found"
        allowCustomValue
        className="w-[200px] h-8 text-sm"
      />
      <Combobox
        options={[]}
        value={selectedPair}
        onValueChange={setSelectedPair}
        placeholder={pairPlaceholder}
        searchPlaceholder="Enter pair..."
        emptyText="Type to enter value"
        allowCustomValue
        className="w-[180px] h-8 text-sm"
        disabled={!selectedConnector}
      />

      {/* Favorite pairs as buttons */}
      {favorites.length > 0 && (
        <>
          <div className="w-px h-6 bg-border" />
          <div className="flex items-center gap-1 overflow-x-auto">
            {favorites.map((fav) => {
              const exchangeName = formatConnectorName(fav.connector, true);
              const initial = exchangeName.charAt(0).toUpperCase();
              const isActive = selectedConnector === fav.connector && selectedPair === fav.pair;
              return (
                <Button
                  key={`${fav.connector}-${fav.pair}`}
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 px-2 text-xs whitespace-nowrap"
                  onClick={() => handleFavoriteClick(fav.connector, fav.pair)}
                  title={`${exchangeName} - ${fav.pair}`}
                >
                  <span className="w-4 h-4 rounded bg-muted text-muted-foreground flex items-center justify-center text-[10px] font-semibold mr-1.5">
                    {initial}
                  </span>
                  {fav.pair}
                </Button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
