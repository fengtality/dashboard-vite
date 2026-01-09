import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAccount } from '@/components/account-provider';
import { portfolio, trading } from '@/api/client';
import type { PortfolioBalance, PaginatedResponse } from '@/api/client';
import { Loader2, ArrowLeft, Wallet, FileText, TrendingUp, Clock, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Helper to check if connector is perpetual
function isPerpetualConnector(name: string): boolean {
  return name.endsWith('_perpetual') || name.endsWith('_perpetual_testnet');
}

// Helper to format connector name for display
function formatConnectorName(name: string): string {
  let displayName = name
    .replace(/_perpetual_testnet$/, '')
    .replace(/_perpetual$/, '');

  displayName = displayName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return displayName;
}

export default function ConnectorDetail() {
  const { connectorName } = useParams<{ connectorName: string }>();
  const { account } = useAccount();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [balances, setBalances] = useState<PortfolioBalance[]>([]);
  const [activeOrders, setActiveOrders] = useState<PaginatedResponse | null>(null);
  const [positions, setPositions] = useState<PaginatedResponse | null>(null);
  const [trades, setTrades] = useState<PaginatedResponse | null>(null);

  const isPerp = connectorName ? isPerpetualConnector(connectorName) : false;
  const displayName = connectorName ? formatConnectorName(connectorName) : '';

  useEffect(() => {
    async function fetchData() {
      if (!account || !connectorName) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch balances
        const state = await portfolio.getState([account], [connectorName]);
        const accountData = state[account];
        const balanceData = accountData?.[connectorName];
        if (balanceData) {
          setBalances(balanceData);
        }

        // Fetch active orders
        const ordersResult = await trading.getActiveOrders({
          account_names: [account],
          connector_names: [connectorName],
        });
        setActiveOrders(ordersResult);

        // Fetch positions (perpetual only)
        if (isPerp) {
          const positionsResult = await trading.getPositions({
            account_names: [account],
            connector_names: [connectorName],
          });
          setPositions(positionsResult);
        }

        // Fetch recent trades
        const tradesResult = await trading.getTrades({
          account_names: [account],
          connector_names: [connectorName],
          limit: 50,
        });
        setTrades(tradesResult);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [account, connectorName, isPerp]);

  if (!connectorName) {
    return (
      <div className="max-w-4xl">
        <Alert variant="destructive">
          <AlertDescription>No connector specified</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  // Calculate total balance value
  const totalValue = balances
    .filter(b => b.units > 0 && b.price > 0)
    .reduce((sum, b) => sum + b.value, 0);

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Link to="/connectors/keys">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft size={18} />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
          <Badge variant={isPerp ? 'secondary' : 'outline'}>
            {isPerp ? 'Perpetual' : 'Spot'}
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Connector: <code className="text-sm bg-muted px-1.5 py-0.5 rounded">{connectorName}</code>
          {account && (
            <span className="ml-3">
              Account: <span className="font-medium text-foreground">{account}</span>
            </span>
          )}
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!account && (
        <Alert className="mb-4">
          <AlertDescription>Please select an account from the header to view connector data.</AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Wallet size={16} />
              <span className="text-sm">Total Value</span>
            </div>
            <p className="text-2xl font-bold">
              ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <FileText size={16} />
              <span className="text-sm">Active Orders</span>
            </div>
            <p className="text-2xl font-bold">
              {activeOrders?.data.length ?? 0}
            </p>
          </CardContent>
        </Card>

        {isPerp && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp size={16} />
                <span className="text-sm">Open Positions</span>
              </div>
              <p className="text-2xl font-bold">
                {positions?.data.length ?? 0}
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock size={16} />
              <span className="text-sm">Recent Trades</span>
            </div>
            <p className="text-2xl font-bold">
              {trades?.data.length ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="balances" className="space-y-4">
        <TabsList>
          <TabsTrigger value="balances">Balances</TabsTrigger>
          <TabsTrigger value="orders">Orders ({activeOrders?.data.length ?? 0})</TabsTrigger>
          {isPerp && (
            <TabsTrigger value="positions">Positions ({positions?.data.length ?? 0})</TabsTrigger>
          )}
          <TabsTrigger value="trades">Trades</TabsTrigger>
          {isPerp && <TabsTrigger value="settings">Settings</TabsTrigger>}
        </TabsList>

        {/* Balances Tab */}
        <TabsContent value="balances">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Account Balances</CardTitle>
              <CardDescription>Current token holdings on this connector</CardDescription>
            </CardHeader>
            <CardContent>
              {balances.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No balances found</p>
              ) : (
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
                      {balances
                        .filter(b => b.units > 0)
                        .sort((a, b) => b.value - a.value || b.units - a.units)
                        .map((balance) => (
                          <tr key={balance.token} className="border-b border-border/50 hover:bg-muted/30">
                            <td className="py-2 px-3 font-medium text-foreground">{balance.token}</td>
                            <td className="py-2 px-3 text-right font-mono text-foreground">
                              {balance.units.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                              {balance.available_units.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                              {balance.price > 0
                                ? `$${balance.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
                                : '—'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-foreground">
                              {balance.price > 0
                                ? `$${balance.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : '—'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Active Orders</CardTitle>
              <CardDescription>Currently open orders on this connector</CardDescription>
            </CardHeader>
            <CardContent>
              {!activeOrders || activeOrders.data.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No active orders</p>
              ) : (
                <div className="text-sm text-muted-foreground">
                  <p>{activeOrders.data.length} active order(s)</p>
                  {/* TODO: Order table will be implemented here */}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Positions Tab (Perpetual only) */}
        {isPerp && (
          <TabsContent value="positions">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Open Positions</CardTitle>
                <CardDescription>Current perpetual positions with PnL</CardDescription>
              </CardHeader>
              <CardContent>
                {!positions || positions.data.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No open positions</p>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    <p>{positions.data.length} open position(s)</p>
                    {/* TODO: Positions table will be implemented here */}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Trades Tab */}
        <TabsContent value="trades">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Trades</CardTitle>
              <CardDescription>Trade history on this connector</CardDescription>
            </CardHeader>
            <CardContent>
              {!trades || trades.data.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No trades found</p>
              ) : (
                <div className="text-sm text-muted-foreground">
                  <p>{trades.data.length} trade(s) found</p>
                  {/* TODO: Trades table will be implemented here */}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab (Perpetual only) */}
        {isPerp && (
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings size={20} />
                  Perpetual Settings
                </CardTitle>
                <CardDescription>Configure position mode and leverage</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-4">
                  Position mode and leverage settings will be available here
                </p>
                {/* TODO: Position mode and leverage controls will be implemented here */}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
