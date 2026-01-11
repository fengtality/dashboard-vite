import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { connectors, accounts, portfolio } from '../api/hummingbot-api';
import type { PortfolioBalance } from '../api/hummingbot-api';
import { gatewayClient } from '@/api/gateway';
import type { WalletInfo } from '@/api/gateway';
import { useAccount } from '@/components/account-provider';
import { isPerpetualConnector } from '@/lib/connectors';
import { Loader2, Plus, Trash2, Key, Wallet, RefreshCw, AlertCircle, Coins, TrendingUp, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

type ConnectorType = 'spot' | 'perpetual' | 'gateway';

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

  // Gateway wallet state
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [loadingWallets, setLoadingWallets] = useState(false);
  const [selectedChain, setSelectedChain] = useState<string>('solana');
  const [privateKey, setPrivateKey] = useState<string>('');
  const [walletToDelete, setWalletToDelete] = useState<{ chain: string; address: string } | null>(null);

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

  // Fetch Gateway wallets when tab is selected
  useEffect(() => {
    if (connectorType === 'gateway') {
      fetchWallets();
    }
  }, [connectorType, refreshKey]);

  async function fetchWallets() {
    setLoadingWallets(true);
    try {
      const walletList = await gatewayClient.wallet.list();
      setWallets(walletList);
    } catch {
      setWallets([]);
    } finally {
      setLoadingWallets(false);
    }
  }

  async function handleAddWallet(e: React.FormEvent) {
    e.preventDefault();
    if (!privateKey.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await gatewayClient.wallet.add({
        chain: selectedChain,
        privateKey: privateKey.trim(),
      });
      toast.success(`Wallet added: ${result.address.slice(0, 8)}...${result.address.slice(-6)}`);
      setPrivateKey('');
      setRefreshKey(k => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add wallet');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemoveWallet() {
    if (!walletToDelete) return;

    try {
      await gatewayClient.wallet.remove({
        chain: walletToDelete.chain,
        address: walletToDelete.address,
      });
      toast.success('Wallet removed');
      setRefreshKey(k => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove wallet');
    } finally {
      setDeleteDialogOpen(false);
      setWalletToDelete(null);
    }
  }

  async function handleSetDefault(chain: string, address: string) {
    try {
      await gatewayClient.wallet.setDefault({ chain, address });
      toast.success('Default wallet updated');
      setRefreshKey(k => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to set default');
    }
  }

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
        <h1 className="text-2xl font-bold text-foreground">Keys</h1>
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
          <TabsList className="bg-transparent h-auto p-0 gap-0 border-b border-border rounded-none w-full justify-start">
            <TabsTrigger
              value="spot"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3"
            >
              <Coins className="h-4 w-4 mr-2" />
              Spot
            </TabsTrigger>
            <TabsTrigger
              value="perpetual"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Perpetual
            </TabsTrigger>
            <TabsTrigger
              value="gateway"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3"
            >
              <Wallet className="h-4 w-4 mr-2" />
              Wallets
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Gateway Wallets */}
      {connectorType === 'gateway' ? (
        <>
          {/* Existing Wallets */}
          {loadingWallets ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="animate-spin text-primary" size={24} />
            </div>
          ) : (
            <div className="space-y-6 mb-8">
              {/* Solana Wallets */}
              {wallets.filter(w => w.chain === 'solana').length > 0 && (
                <div>
                  <h2 className="text-lg font-medium text-foreground mb-3">Solana Wallets</h2>
                  <div className="space-y-2">
                    {wallets.filter(w => w.chain === 'solana').map((wallet) => (
                      <Card key={`${wallet.chain}-${wallet.address}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <Wallet className="text-success shrink-0" size={18} />
                              <span className="text-foreground text-sm sm:text-base truncate">
                                {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {wallet.isDefault ? (
                                <span className="flex items-center gap-1 text-warning text-sm">
                                  <Star size={14} fill="currentColor" />
                                  <span className="hidden sm:inline">Default</span>
                                </span>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSetDefault(wallet.chain, wallet.address)}
                                >
                                  <Star className="mr-1" size={14} />
                                  <span className="hidden sm:inline">Set Default</span>
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setWalletToDelete({ chain: wallet.chain, address: wallet.address });
                                  setDeleteDialogOpen(true);
                                }}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 size={18} />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Ethereum Wallets */}
              {wallets.filter(w => w.chain === 'ethereum').length > 0 && (
                <div>
                  <h2 className="text-lg font-medium text-foreground mb-3">Ethereum Wallets</h2>
                  <div className="space-y-2">
                    {wallets.filter(w => w.chain === 'ethereum').map((wallet) => (
                      <Card key={`${wallet.chain}-${wallet.address}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <Wallet className="text-success shrink-0" size={18} />
                              <span className="text-foreground text-sm sm:text-base truncate">
                                {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {wallet.isDefault ? (
                                <span className="flex items-center gap-1 text-warning text-sm">
                                  <Star size={14} fill="currentColor" />
                                  <span className="hidden sm:inline">Default</span>
                                </span>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSetDefault(wallet.chain, wallet.address)}
                                >
                                  <Star className="mr-1" size={14} />
                                  <span className="hidden sm:inline">Set Default</span>
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setWalletToDelete({ chain: wallet.chain, address: wallet.address });
                                  setDeleteDialogOpen(true);
                                }}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 size={18} />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Add New Wallet */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus size={20} />
                Add New Wallet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddWallet} className="space-y-4">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="chain">Chain</Label>
                  <Select value={selectedChain} onValueChange={setSelectedChain}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select chain" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solana">Solana</SelectItem>
                      <SelectItem value="ethereum">Ethereum</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="privateKey">Private Key</Label>
                  <Input
                    id="privateKey"
                    type="password"
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    placeholder="Enter private key"
                  />
                </div>
                <Button type="submit" disabled={submitting || !privateKey.trim()} className="w-full">
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={18} />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2" size={18} />
                      Add Wallet
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <Key className="text-success shrink-0" size={18} />
                      <span className="text-foreground text-sm sm:text-base truncate">{cred}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
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
                            <span className="hidden sm:inline">Balance</span>
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
                              <th className="text-left py-2 px-2 md:px-3 text-muted-foreground font-medium text-xs md:text-sm">Token</th>
                              <th className="text-right py-2 px-2 md:px-3 text-muted-foreground font-medium text-xs md:text-sm">Units</th>
                              <th className="hidden sm:table-cell text-right py-2 px-3 text-muted-foreground font-medium text-sm">Available</th>
                              <th className="hidden md:table-cell text-right py-2 px-3 text-muted-foreground font-medium">Price</th>
                              <th className="text-right py-2 px-2 md:px-3 text-muted-foreground font-medium text-xs md:text-sm">Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {balances[cred]
                              .filter(b => b.units > 0)
                              .sort((a, b) => b.value - a.value || b.units - a.units)
                              .map((balance) => (
                                <tr key={balance.token} className="border-b border-border/50 hover:bg-muted/30">
                                  <td className="py-2 px-2 md:px-3 font-medium text-foreground text-xs md:text-sm">{balance.token}</td>
                                  <td className="py-2 px-2 md:px-3 text-right font-mono text-foreground text-xs md:text-sm">
                                    {balance.units.toLocaleString(undefined, {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 6,
                                    })}
                                  </td>
                                  <td className="hidden sm:table-cell py-2 px-3 text-right font-mono text-muted-foreground">
                                    {balance.available_units.toLocaleString(undefined, {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 6,
                                    })}
                                  </td>
                                  <td className="hidden md:table-cell py-2 px-3 text-right font-mono text-muted-foreground">
                                    {balance.price > 0
                                      ? `$${balance.price.toLocaleString(undefined, {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 4,
                                        })}`
                                      : '—'}
                                  </td>
                                  <td className="py-2 px-2 md:px-3 text-right font-mono text-foreground text-xs md:text-sm">
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
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {walletToDelete ? 'Remove Wallet' : 'Delete Keys'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {walletToDelete
                ? `Are you sure you want to remove wallet ${walletToDelete.address.slice(0, 8)}...${walletToDelete.address.slice(-6)}?`
                : `Are you sure you want to delete keys for "${connectorToDelete}"?`}
              {' '}This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setWalletToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={walletToDelete ? handleRemoveWallet : handleDelete}>
              {walletToDelete ? 'Remove' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
