import { useState, useEffect, useMemo } from 'react';
import { Loader2, Star } from 'lucide-react';
import { connectors as connectorsApi } from '@/api/hummingbot-api';
import { gatewayClient } from '@/api/gateway';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
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

  // Get favorite pairs for the selected connector
  const pairOptions = useMemo(() => {
    if (!selectedConnector) return [];
    return favorites
      .filter(f => f.connector === selectedConnector)
      .map(f => ({
        value: f.pair,
        label: (
          <span className="flex items-center gap-2">
            <Star className="h-3 w-3 fill-current text-yellow-500" />
            {f.pair}
          </span>
        ),
        searchValue: f.pair,
      }));
  }, [selectedConnector, favorites]);

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
        options={pairOptions}
        value={selectedPair}
        onValueChange={setSelectedPair}
        placeholder={pairPlaceholder}
        searchPlaceholder="Search or enter..."
        emptyText="Type to enter value"
        allowCustomValue
        className="w-[180px] h-8 text-sm"
        disabled={!selectedConnector}
      />
    </div>
  );
}
