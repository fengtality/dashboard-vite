import { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, Wallet, TrendingUp, X } from 'lucide-react';
import { useAccount } from '@/components/account-provider';
import { portfolio, trading, gatewayCLMM, type PortfolioBalance, type PaginatedResponse, type CLMMPosition } from '@/api/hummingbot-api';
import { gatewayClient } from '@/api/gateway';
import { BalancesTable } from '@/components/trade/balances-table';
import { PositionsTable } from '@/components/trade/positions-table';
import type { WindowContext } from '../ExperimentProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { isPerpetualConnector } from '@/lib/connectors';

interface PortfolioWindowProps {
  context?: WindowContext;
}

export function PortfolioWindow({ context }: PortfolioWindowProps) {
  const { account } = useAccount();
  const connector = context?.connector;
  const connectorType = context?.connectorType;

  // Determine what tabs to show based on connector type
  const isGateway = connectorType === 'gateway';
  const isPerp = connector ? isPerpetualConnector(connector) : false;

  // Balances state
  const [balances, setBalances] = useState<PortfolioBalance[]>([]);
  const [loadingBalances, setLoadingBalances] = useState(true);
  const [refreshingBalances, setRefreshingBalances] = useState(false);

  // Perp positions state
  const [perpPositions, setPerpPositions] = useState<PaginatedResponse | null>(null);
  const [loadingPerp, setLoadingPerp] = useState(false);

  // LP positions state
  const [lpPositions, setLpPositions] = useState<CLMMPosition[]>([]);
  const [loadingLP, setLoadingLP] = useState(false);
  const [refreshingLP, setRefreshingLP] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);

  // Gateway balances state
  const [gatewayBalances, setGatewayBalances] = useState<Array<{ token: string; balance: number }>>([]);

  // Fetch CEX balances
  const fetchBalances = useCallback(async (showLoading = true) => {
    if (!account || isGateway) {
      setLoadingBalances(false);
      return;
    }

    if (showLoading) setLoadingBalances(true);
    else setRefreshingBalances(true);

    try {
      const connectors = connector ? [connector] : [];
      const state = await portfolio.getState([account], connectors);
      const accountData = state[account];

      if (accountData) {
        const allBalances: PortfolioBalance[] = [];
        for (const connectorBalances of Object.values(accountData)) {
          allBalances.push(...connectorBalances);
        }
        // Deduplicate by token
        const balanceMap = new Map<string, PortfolioBalance>();
        for (const b of allBalances) {
          const existing = balanceMap.get(b.token);
          if (existing) {
            existing.units += b.units;
            existing.available_units += b.available_units;
            existing.value += b.value;
          } else {
            balanceMap.set(b.token, { ...b });
          }
        }
        setBalances(Array.from(balanceMap.values()));
      } else {
        setBalances([]);
      }
    } catch (err) {
      console.error('Failed to fetch balances:', err);
    } finally {
      setLoadingBalances(false);
      setRefreshingBalances(false);
    }
  }, [account, connector, isGateway]);

  // Fetch Gateway balances
  const fetchGatewayBalances = useCallback(async (showLoading = true) => {
    if (!isGateway || !connector) {
      return;
    }

    if (showLoading) setLoadingBalances(true);
    else setRefreshingBalances(true);

    try {
      const [chain, ...networkParts] = connector.split('-');
      const network = networkParts.join('-');

      // Get wallets to find default wallet address
      const wallets = await gatewayClient.wallet.list();
      const defaultWallet = wallets.find(w => w.chain === chain && w.isDefault);

      if (defaultWallet) {
        const response = await gatewayClient.chains.getBalances(chain, {
          network,
          address: defaultWallet.address,
        });

        const balanceList = Object.entries(response.balances || {}).map(([token, balance]) => ({
          token,
          balance: Number(balance),
        })).filter(b => b.balance > 0);

        setGatewayBalances(balanceList);
      }
    } catch (err) {
      console.error('Failed to fetch gateway balances:', err);
    } finally {
      setLoadingBalances(false);
      setRefreshingBalances(false);
    }
  }, [connector, isGateway]);

  // Fetch perp positions
  const fetchPerpPositions = useCallback(async () => {
    if (!account || !isPerp) return;

    setLoadingPerp(true);
    try {
      const result = await trading.getPositions({
        account_names: [account],
        connector_names: connector ? [connector] : undefined,
      });
      setPerpPositions(result);
    } catch (err) {
      console.error('Failed to fetch positions:', err);
    } finally {
      setLoadingPerp(false);
    }
  }, [account, connector, isPerp]);

  // Fetch LP positions
  const fetchLPPositions = useCallback(async (showLoading = true) => {
    if (!isGateway) return;

    if (showLoading) setLoadingLP(true);
    else setRefreshingLP(true);

    try {
      const res = await gatewayCLMM.searchPositions({
        status: 'OPEN',
        network: connector || undefined,
        refresh: true,
      });
      setLpPositions(res.data || []);
    } catch (err) {
      console.error('Failed to fetch LP positions:', err);
      setLpPositions([]);
    } finally {
      setLoadingLP(false);
      setRefreshingLP(false);
    }
  }, [connector, isGateway]);

  // Initial fetch
  useEffect(() => {
    if (isGateway) {
      fetchGatewayBalances();
      fetchLPPositions();
    } else {
      fetchBalances();
      if (isPerp) {
        fetchPerpPositions();
      }
    }
  }, [fetchBalances, fetchGatewayBalances, fetchPerpPositions, fetchLPPositions, isGateway, isPerp]);

  // LP position actions
  const handleClosePosition = async (position: CLMMPosition) => {
    setClosingId(position.position_id);
    try {
      await gatewayCLMM.removeLiquidity({
        connector: position.connector,
        network: position.network,
        position_id: position.position_id,
        decrease_percent: 100,
      });
      toast.success('Position closed');
      fetchLPPositions(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to close position');
    } finally {
      setClosingId(null);
    }
  };

  const handleCollectFees = async (position: CLMMPosition) => {
    try {
      await gatewayCLMM.collectFees({
        connector: position.connector,
        network: position.network,
        position_id: position.position_id,
      });
      toast.success('Fees collected');
      fetchLPPositions(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to collect fees');
    }
  };

  // Determine default tab
  const defaultTab = isGateway ? 'balances' : 'balances';

  // No connector selected
  if (!connector) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No market selected</p>
        <p className="text-xs text-muted-foreground mt-1">
          Select a connector to view portfolio
        </p>
      </div>
    );
  }

  return (
    <Tabs defaultValue={defaultTab} className="flex flex-col h-full">
      <TabsList className="shrink-0 w-full justify-start">
        <TabsTrigger value="balances" className="text-xs">
          Balances
        </TabsTrigger>
        {isPerp && (
          <TabsTrigger value="positions" className="text-xs">
            Positions
          </TabsTrigger>
        )}
        {isGateway && (
          <TabsTrigger value="lp" className="text-xs">
            LP Positions
          </TabsTrigger>
        )}
      </TabsList>

      {/* Balances Tab */}
      <TabsContent value="balances" className="flex-1 mt-3 overflow-hidden">
        {loadingBalances ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : isGateway ? (
          // Gateway balances
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                {gatewayBalances.length} token{gatewayBalances.length !== 1 ? 's' : ''}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchGatewayBalances(false)}
                disabled={refreshingBalances}
                className="h-7 px-2"
              >
                <RefreshCw className={cn('h-4 w-4', refreshingBalances && 'animate-spin')} />
              </Button>
            </div>
            {gatewayBalances.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground">
                <Wallet className="h-8 w-8 mb-2" />
                <p className="text-sm">No token balances</p>
              </div>
            ) : (
              <div className="flex-1 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="py-2 font-medium">Token</th>
                      <th className="py-2 font-medium text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gatewayBalances.map((b) => (
                      <tr key={b.token} className="border-b border-border/50">
                        <td className="py-2 font-medium">{b.token}</td>
                        <td className="py-2 text-right font-mono">{b.balance.toFixed(6)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          // CEX balances
          <BalancesTable
            balances={balances}
            refreshing={refreshingBalances}
            onRefresh={() => fetchBalances(false)}
          />
        )}
      </TabsContent>

      {/* Perp Positions Tab */}
      {isPerp && (
        <TabsContent value="positions" className="flex-1 mt-3 overflow-hidden">
          {loadingPerp ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <PositionsTable
              positions={perpPositions}
              markPrice={null}
              currentPrice={null}
            />
          )}
        </TabsContent>
      )}

      {/* LP Positions Tab */}
      {isGateway && (
        <TabsContent value="lp" className="flex-1 mt-3 overflow-hidden">
          {loadingLP ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  {lpPositions.length} position{lpPositions.length !== 1 ? 's' : ''}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchLPPositions(false)}
                  disabled={refreshingLP}
                  className="h-7 px-2"
                >
                  <RefreshCw className={cn('h-4 w-4', refreshingLP && 'animate-spin')} />
                </Button>
              </div>
              {lpPositions.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground">
                  <TrendingUp className="h-8 w-8 mb-2" />
                  <p className="text-sm">No open LP positions</p>
                </div>
              ) : (
                <div className="flex-1 overflow-auto space-y-2">
                  {lpPositions.map((pos) => (
                    <div key={pos.position_id} className="p-3 border rounded-lg bg-card text-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">{pos.base_token}/{pos.quote_token}</div>
                        <Badge variant={pos.in_range === 'IN_RANGE' ? 'default' : 'secondary'}>
                          {pos.in_range === 'IN_RANGE' ? 'In Range' : 'Out of Range'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                        <div>
                          <div className="text-muted-foreground">Lower</div>
                          <div className="font-mono">{pos.lower_price.toFixed(4)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground">Current</div>
                          <div className="font-mono">{pos.current_price.toFixed(4)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-muted-foreground">Upper</div>
                          <div className="font-mono">{pos.upper_price.toFixed(4)}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                        <div>
                          <div className="text-muted-foreground">{pos.base_token}</div>
                          <div className="font-mono">{pos.base_token_amount.toFixed(4)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-muted-foreground">{pos.quote_token}</div>
                          <div className="font-mono">{pos.quote_token_amount.toFixed(4)}</div>
                        </div>
                      </div>
                      {(pos.base_fee_pending > 0 || pos.quote_fee_pending > 0) && (
                        <div className="text-xs text-muted-foreground mb-2">
                          Fees: {pos.base_fee_pending.toFixed(4)} {pos.base_token} + {pos.quote_fee_pending.toFixed(4)} {pos.quote_token}
                        </div>
                      )}
                      {pos.pnl_summary && (
                        <div className={cn(
                          'text-xs font-medium mb-2',
                          pos.pnl_summary.total_pnl_quote >= 0 ? 'text-positive' : 'text-negative'
                        )}>
                          PnL: {pos.pnl_summary.total_pnl_quote >= 0 ? '+' : ''}{pos.pnl_summary.total_pnl_quote.toFixed(2)} {pos.quote_token}
                        </div>
                      )}
                      <div className="flex gap-2">
                        {(pos.base_fee_pending > 0 || pos.quote_fee_pending > 0) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-7 text-xs"
                            onClick={() => handleCollectFees(pos)}
                          >
                            Collect Fees
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex-1 h-7 text-xs"
                          onClick={() => handleClosePosition(pos)}
                          disabled={closingId === pos.position_id}
                        >
                          {closingId === pos.position_id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <><X className="h-3 w-3 mr-1" />Close</>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>
      )}
    </Tabs>
  );
}
