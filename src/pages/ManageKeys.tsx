import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { connectors, accounts, portfolio } from '../api/client';
import type { PortfolioBalance } from '../api/client';
import { useAccount } from '@/components/account-provider';
import { Loader2, Plus, Trash2, Key, Wallet, RefreshCw, AlertCircle, Coins, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type ConnectorType = 'spot' | 'perpetual';

export default function ManageKeys() {
  const { account } = useAccount();
  const [connectorList, setConnectorList] = useState<string[]>([]);
  const [selectedConnector, setSelectedConnector] = useState<string>('');
  const [connectorType, setConnectorType] = useState<ConnectorType>('spot');
  const [configMap, setConfigMap] = useState<string[]>([]);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [existingCredentials, setExistingCredentials] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Balance state
  const [balances, setBalances] = useState<Record<string, PortfolioBalance[]>>({});
  const [loadingBalances, setLoadingBalances] = useState<Record<string, boolean>>({});
  const [balanceErrors, setBalanceErrors] = useState<Record<string, string>>({});

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [connectorToDelete, setConnectorToDelete] = useState<string | null>(null);

  // Trigger to refresh credentials list
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function fetchConnectors() {
      try {
        const list = await connectors.list();
        setConnectorList(list);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch connectors');
      } finally {
        setLoading(false);
      }
    }
    fetchConnectors();
  }, []);

  useEffect(() => {
    async function fetchCredentials() {
      if (!account) return;
      try {
        const creds = await accounts.getCredentials(account);
        setExistingCredentials(creds);
      } catch {
        setExistingCredentials([]);
      }
    }
    fetchCredentials();
  }, [account, refreshKey]);

  useEffect(() => {
    async function fetchConfigMap() {
      if (!selectedConnector) {
        setConfigMap([]);
        setCredentials({});
        return;
      }
      try {
        const config = await connectors.getConfigMap(selectedConnector);
        setConfigMap(config);
        const initialCreds: Record<string, string> = {};
        config.forEach((field) => {
          initialCreds[field] = '';
        });
        setCredentials(initialCreds);
      } catch {
        setConfigMap([]);
      }
    }
    fetchConfigMap();
  }, [selectedConnector]);

  // Reset selected connector when type changes
  useEffect(() => {
    setSelectedConnector('');
  }, [connectorType]);

  // Clear balances when account changes
  useEffect(() => {
    setBalances({});
    setBalanceErrors({});
  }, [account]);

  async function fetchBalance(connectorName: string) {
    if (!account) return;

    setLoadingBalances(prev => ({ ...prev, [connectorName]: true }));
    setBalanceErrors(prev => ({ ...prev, [connectorName]: '' }));

    try {
      const state = await portfolio.getState([account], [connectorName]);

      // Access nested structure: state[accountName][connectorName]
      const accountData = state[account];
      const balanceData = accountData?.[connectorName];

      if (balanceData && balanceData.length > 0) {
        setBalances(prev => ({ ...prev, [connectorName]: balanceData }));
        setBalanceErrors(prev => ({ ...prev, [connectorName]: '' }));
      } else {
        setBalanceErrors(prev => ({
          ...prev,
          [connectorName]: 'No balances found'
        }));
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch balance';
      setBalanceErrors(prev => ({ ...prev, [connectorName]: errorMsg }));
    } finally {
      setLoadingBalances(prev => ({ ...prev, [connectorName]: false }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!account || !selectedConnector) return;

    setSubmitting(true);
    setError(null);

    try {
      const connectorName = selectedConnector;
      await accounts.addCredential(account, connectorName, credentials);
      toast.success(`Keys added for ${connectorName}`);

      // Refresh credentials list
      setRefreshKey(k => k + 1);

      // Fetch balance after adding credentials
      await fetchBalance(connectorName);

      setSelectedConnector('');
      setCredentials({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add keys');
    } finally {
      setSubmitting(false);
    }
  }

  function openDeleteDialog(connectorName: string) {
    setConnectorToDelete(connectorName);
    setDeleteDialogOpen(true);
  }

  async function handleDelete() {
    if (!connectorToDelete || !account) return;

    try {
      await accounts.deleteCredential(account, connectorToDelete);
      toast.success(`Keys deleted for ${connectorToDelete}`);

      // Refresh credentials list
      setRefreshKey(k => k + 1);

      // Clear balance for deleted connector
      setBalances(prev => {
        const newBalances = { ...prev };
        delete newBalances[connectorToDelete];
        return newBalances;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete keys');
    } finally {
      setDeleteDialogOpen(false);
      setConnectorToDelete(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  // Helper to check if connector is perpetual
  const isPerpetualConnector = (name: string) =>
    name.endsWith('_perpetual') || name.endsWith('_perpetual_testnet');

  // Helper to format field name for display (e.g., "ascend_ex_api_key" → "Api Key")
  const formatFieldLabel = (field: string, connector: string) => {
    // Remove connector prefix if present
    let label = field;
    if (field.startsWith(connector + '_')) {
      label = field.slice(connector.length + 1);
    }
    // Format the remaining part: api_key → Api Key (Title Case)
    return label
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Filter connectors based on type and sort alphabetically
  const filteredConnectors = connectorList
    .filter((c) => {
      const isPerpetual = isPerpetualConnector(c);
      return connectorType === 'perpetual' ? isPerpetual : !isPerpetual;
    })
    .sort((a, b) => a.localeCompare(b));

  const availableConnectors = filteredConnectors.filter(
    (c) => !existingCredentials.includes(c)
  );

  // Filter existing credentials by type for display and sort alphabetically
  const filteredExistingCredentials = existingCredentials
    .filter((c) => {
      const isPerpetual = isPerpetualConnector(c);
      return connectorType === 'perpetual' ? isPerpetual : !isPerpetual;
    })
    .sort((a, b) => a.localeCompare(b));

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Add Keys</h1>
        <p className="text-muted-foreground mt-1">
          Add or remove exchange API keys for <span className="font-medium text-foreground">{account || 'your account'}</span>
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!account && (
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Please select an account from the header to manage keys.</AlertDescription>
        </Alert>
      )}

      {/* Connector Type Toggle */}
      <div className="mb-6">
        <Tabs value={connectorType} onValueChange={(v) => setConnectorType(v as ConnectorType)}>
          <TabsList className="bg-background gap-1 border p-1">
            <TabsTrigger
              value="spot"
              className="data-[state=active]:bg-primary dark:data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:text-primary-foreground"
            >
              <Coins className="h-4 w-4 mr-2" />
              Spot
            </TabsTrigger>
            <TabsTrigger
              value="perpetual"
              className="data-[state=active]:bg-primary dark:data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:text-primary-foreground"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Perpetual
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Existing Keys */}
      {filteredExistingCredentials.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-medium text-foreground mb-4">
            Existing {connectorType === 'perpetual' ? 'Perpetual' : 'Spot'} Connector Keys
          </h2>
          <div className="space-y-2">
            {filteredExistingCredentials.map((cred) => (
              <Card key={cred}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Key className="text-green-500" size={18} />
                      <span className="text-foreground">{cred}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchBalance(cred)}
                        disabled={loadingBalances[cred] || !account}
                      >
                        {loadingBalances[cred] ? (
                          <Loader2 className="animate-spin" size={16} />
                        ) : (
                          <>
                            <RefreshCw className="mr-1" size={14} />
                            Balance
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(cred)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  </div>

                  {/* Balance Error */}
                  {balanceErrors[cred] && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-sm text-destructive">{balanceErrors[cred]}</p>
                    </div>
                  )}

                  {/* Balance Display */}
                  {balances[cred] && balances[cred].length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="flex items-center gap-2 mb-3 text-muted-foreground">
                        <Wallet size={16} />
                        <span className="text-sm font-medium">Balances</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-2 px-3 text-muted-foreground font-medium">Token</th>
                              <th className="text-right py-2 px-3 text-muted-foreground font-medium">Units</th>
                              <th className="text-right py-2 px-3 text-muted-foreground font-medium">Available</th>
                              <th className="text-right py-2 px-3 text-muted-foreground font-medium">Price</th>
                              <th className="text-right py-2 px-3 text-muted-foreground font-medium">Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {balances[cred]
                              .filter(b => b.units > 0)
                              .sort((a, b) => b.value - a.value || b.units - a.units)
                              .map((balance) => (
                                <tr key={balance.token} className="border-b border-border/50 hover:bg-muted/30">
                                  <td className="py-2 px-3 font-medium text-foreground">{balance.token}</td>
                                  <td className="py-2 px-3 text-right font-mono text-foreground">
                                    {balance.units.toLocaleString(undefined, {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 6,
                                    })}
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                                    {balance.available_units.toLocaleString(undefined, {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 6,
                                    })}
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                                    {balance.price > 0
                                      ? `$${balance.price.toLocaleString(undefined, {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 4,
                                        })}`
                                      : '—'}
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono text-foreground">
                                    {balance.price > 0
                                      ? `$${balance.value.toLocaleString(undefined, {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        })}`
                                      : '—'}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Add New Keys */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus size={20} />
            Add New {connectorType === 'perpetual' ? 'Perpetual' : 'Spot'} Connector Keys
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="connector">Select Connector</Label>
              <Combobox
                options={availableConnectors.map((connector) => ({
                  value: connector,
                  label: connector,
                }))}
                value={selectedConnector}
                onValueChange={setSelectedConnector}
                placeholder="Choose a connector..."
                searchPlaceholder="Search connectors..."
                emptyText="No connectors found."
                disabled={!account}
              />
            </div>

            {configMap.length > 0 && (
              <>
                {configMap.map((field) => {
                  const label = formatFieldLabel(field, selectedConnector);
                  return (
                    <div key={field} className="grid w-full items-center gap-1.5">
                      <Label htmlFor={field}>{label}</Label>
                      <Input
                        id={field}
                        type="text"
                        value={credentials[field] || ''}
                        onChange={(e) =>
                          setCredentials((prev) => ({
                            ...prev,
                            [field]: e.target.value,
                          }))
                        }
                        placeholder={field}
                      />
                    </div>
                  );
                })}

                <Button
                  type="submit"
                  disabled={submitting || !account}
                  className="w-full"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={18} />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2" size={18} />
                      Add Keys
                    </>
                  )}
                </Button>
              </>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Keys</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete keys for "{connectorToDelete}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
