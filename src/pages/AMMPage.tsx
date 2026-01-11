import { useEffect, useState, useLayoutEffect, useMemo } from 'react';
import { gatewayClient } from '@/api/gateway';
import type { ConnectorConfig } from '@/api/gateway';
import { gatewaySwap, gatewayCLMM } from '@/api/hummingbot-api';
import type { SwapQuote, CLMMPosition, PoolInfo, PaginatedResponse } from '@/api/hummingbot-api';
import { Loader2, RefreshCw, Info, ArrowDownUp, Droplets, Wallet, History, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Combobox } from '@/components/ui/combobox';
import { Slider } from '@/components/ui/slider';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Hook to detect mobile screens
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useLayoutEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < breakpoint);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);

  return isMobile;
}

// Common networks
const COMMON_NETWORKS = [
  { id: 'solana-mainnet-beta', chain: 'solana', label: 'Solana Mainnet' },
  { id: 'ethereum-mainnet', chain: 'ethereum', label: 'Ethereum Mainnet' },
  { id: 'arbitrum-one', chain: 'arbitrum', label: 'Arbitrum One' },
  { id: 'base-mainnet', chain: 'base', label: 'Base Mainnet' },
  { id: 'polygon-mainnet', chain: 'polygon', label: 'Polygon Mainnet' },
];

export default function AMMPage() {
  const isMobile = useIsMobile();

  // Gateway status
  const [gatewayRunning, setGatewayRunning] = useState(false);
  const [loadingGateway, setLoadingGateway] = useState(true);

  // Network & connector selection (using gateway types)
  const [chains, setChains] = useState<{ chain: string; networks: string[] }[]>([]);
  const [connectors, setConnectors] = useState<ConnectorConfig[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<string>('');
  const [selectedConnector, setSelectedConnector] = useState<string>('');

  // Pool selection
  const [poolAddress, setPoolAddress] = useState<string>('');
  const [pools, setPools] = useState<PoolInfo[]>([]);
  const [selectedPool, setSelectedPool] = useState<PoolInfo | null>(null);
  const [loadingPools, setLoadingPools] = useState(false);
  const [loadingPoolInfo, setLoadingPoolInfo] = useState(false);

  // Swap state
  const [swapFromToken, setSwapFromToken] = useState<string>('');
  const [swapToToken, setSwapToToken] = useState<string>('');
  const [swapAmount, setSwapAmount] = useState<string>('');
  const [swapSlippage, setSwapSlippage] = useState<number>(1);
  const [swapQuote, setSwapQuote] = useState<SwapQuote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [executingSwap, setExecutingSwap] = useState(false);

  // LP state
  const [lpLowerPrice, setLpLowerPrice] = useState<string>('');
  const [lpUpperPrice, setLpUpperPrice] = useState<string>('');
  const [lpBaseAmount, setLpBaseAmount] = useState<string>('');
  const [lpQuoteAmount, setLpQuoteAmount] = useState<string>('');
  const [lpSlippage, setLpSlippage] = useState<number>(1);
  const [executingLP, setExecutingLP] = useState(false);

  // Bottom section data
  const [positions, setPositions] = useState<CLMMPosition[]>([]);
  const [swapHistory, setSwapHistory] = useState<PaginatedResponse | null>(null);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Error state
  const [error] = useState<string | null>(null);

  // Filter AMM connectors for selected network
  const ammConnectors = useMemo(() => {
    if (!selectedNetwork) return [];
    const networkParts = selectedNetwork.split('-');
    const chain = networkParts[0];

    return connectors.filter(c => {
      const hasAMM = c.trading_types.some(t => ['amm', 'clmm', 'router'].includes(t.toLowerCase()));
      const matchesChain = c.chain.toLowerCase() === chain.toLowerCase();
      return hasAMM && matchesChain;
    });
  }, [connectors, selectedNetwork]);

  // Check Gateway status and fetch config (no balances)
  useEffect(() => {
    async function checkGateway() {
      setLoadingGateway(true);
      try {
        // Use direct gateway health check
        const health = await gatewayClient.health();
        const running = health.status === 'ok';
        setGatewayRunning(running);

        if (running) {
          // Fetch chains and connectors directly from Gateway (no balance fetching)
          const [chainsRes, connectorsRes] = await Promise.all([
            gatewayClient.config.getChains().catch(() => ({ chains: [] })),
            gatewayClient.config.getConnectors().catch(() => ({ connectors: [] })),
          ]);
          setChains(chainsRes.chains || []);
          setConnectors(connectorsRes.connectors || []);
        }
      } catch {
        setGatewayRunning(false);
      } finally {
        setLoadingGateway(false);
      }
    }
    checkGateway();
  }, []);

  // Fetch pools when connector changes (using direct gateway client)
  useEffect(() => {
    if (!selectedNetwork || !selectedConnector) {
      setPools([]);
      return;
    }

    async function fetchPools() {
      setLoadingPools(true);
      try {
        // Extract network from chain-network format
        const networkParts = selectedNetwork.split('-');
        const network = networkParts.slice(1).join('-') || networkParts[0];
        const poolTemplates = await gatewayClient.pools.list(selectedConnector, network);
        // Convert PoolTemplate to PoolInfo format
        setPools(poolTemplates.map(p => ({
          address: p.address,
          connector: p.connector || selectedConnector,
          network: p.network,
          base_token: p.baseSymbol,
          quote_token: p.quoteSymbol,
          fee_tier: p.feePct,
        })));
      } catch {
        setPools([]);
      } finally {
        setLoadingPools(false);
      }
    }
    fetchPools();
  }, [selectedNetwork, selectedConnector]);

  // Fetch pool info when pool address changes (using direct gateway client)
  useEffect(() => {
    if (!selectedNetwork || !selectedConnector || !poolAddress) {
      setSelectedPool(null);
      return;
    }

    // Check if address matches a known pool
    const knownPool = pools.find(p => p.address.toLowerCase() === poolAddress.toLowerCase());
    if (knownPool) {
      setSelectedPool(knownPool);
      setSwapFromToken(knownPool.base_token);
      setSwapToToken(knownPool.quote_token);
      return;
    }

    // Fetch pool info for unknown address
    async function fetchPoolInfo() {
      setLoadingPoolInfo(true);
      try {
        const chainNetwork = selectedNetwork; // Already in chain-network format
        const poolInfo = await gatewayClient.pools.getInfo(selectedConnector, chainNetwork, poolAddress);
        const pool: PoolInfo = {
          address: poolInfo.address,
          connector: selectedConnector,
          network: selectedNetwork,
          base_token: poolInfo.baseTokenAddress,
          quote_token: poolInfo.quoteTokenAddress,
          fee_tier: poolInfo.feePct,
        };
        setSelectedPool(pool);
        setSwapFromToken(pool.base_token);
        setSwapToToken(pool.quote_token);
      } catch {
        // Address might be invalid or not a pool
        setSelectedPool(null);
      } finally {
        setLoadingPoolInfo(false);
      }
    }

    // Debounce the fetch
    const timeout = setTimeout(fetchPoolInfo, 500);
    return () => clearTimeout(timeout);
  }, [selectedNetwork, selectedConnector, poolAddress, pools]);

  // Fetch positions
  async function fetchPositions() {
    setLoadingPositions(true);
    try {
      const res = await gatewayCLMM.searchPositions({
        status: 'OPEN',
        network: selectedNetwork || undefined,
        connector: selectedConnector || undefined,
        refresh: true,
      });
      setPositions(res.data || []);
    } catch {
      setPositions([]);
    } finally {
      setLoadingPositions(false);
    }
  }

  // Fetch swap history
  async function fetchSwapHistory() {
    setLoadingHistory(true);
    try {
      const res = await gatewaySwap.search({
        limit: 50,
        network: selectedNetwork || undefined,
        connector: selectedConnector || undefined,
      });
      setSwapHistory(res);
    } catch {
      setSwapHistory(null);
    } finally {
      setLoadingHistory(false);
    }
  }

  // Get swap quote
  async function handleGetQuote() {
    if (!selectedConnector || !selectedNetwork || !swapFromToken || !swapToToken || !swapAmount) {
      return;
    }

    setLoadingQuote(true);
    setSwapQuote(null);
    try {
      const quote = await gatewaySwap.getQuote({
        connector: selectedConnector,
        network: selectedNetwork,
        trading_pair: `${swapFromToken}-${swapToToken}`,
        side: 'BUY',
        amount: parseFloat(swapAmount),
        slippage_pct: swapSlippage,
      });
      setSwapQuote(quote);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to get quote');
    } finally {
      setLoadingQuote(false);
    }
  }

  // Execute swap
  async function handleExecuteSwap() {
    if (!swapQuote || !selectedConnector || !selectedNetwork) return;

    setExecutingSwap(true);
    try {
      const result = await gatewaySwap.execute({
        connector: selectedConnector,
        network: selectedNetwork,
        trading_pair: `${swapFromToken}-${swapToToken}`,
        side: 'BUY',
        amount: parseFloat(swapAmount),
        slippage_pct: swapSlippage,
      });
      toast.success(`Swap submitted: ${result.tx_hash}`);
      setSwapQuote(null);
      setSwapAmount('');
      fetchSwapHistory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Swap failed');
    } finally {
      setExecutingSwap(false);
    }
  }

  // Add liquidity
  async function handleAddLiquidity() {
    if (!selectedConnector || !selectedNetwork || !selectedPool) {
      toast.error('Please select a pool');
      return;
    }

    if (!lpLowerPrice || !lpUpperPrice) {
      toast.error('Please set price range');
      return;
    }

    setExecutingLP(true);
    try {
      const result = await gatewayCLMM.addLiquidity({
        connector: selectedConnector,
        network: selectedNetwork,
        pool_address: selectedPool.address,
        lower_price: parseFloat(lpLowerPrice),
        upper_price: parseFloat(lpUpperPrice),
        base_token_amount: lpBaseAmount ? parseFloat(lpBaseAmount) : undefined,
        quote_token_amount: lpQuoteAmount ? parseFloat(lpQuoteAmount) : undefined,
        slippage_pct: lpSlippage,
      });
      toast.success(`Liquidity added: ${result.tx_hash}`);
      setLpBaseAmount('');
      setLpQuoteAmount('');
      fetchPositions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add liquidity');
    } finally {
      setExecutingLP(false);
    }
  }

  // Handle pool selection from list
  function handlePoolSelect(pool: PoolInfo) {
    setSelectedPool(pool);
    setPoolAddress(pool.address);
    setSwapFromToken(pool.base_token);
    setSwapToToken(pool.quote_token);
  }

  // Network options for combobox (built from chains data)
  const networkOptions = useMemo(() => {
    // Build network IDs from chains response (format: chain-network)
    const apiNetworkIds = new Set<string>();
    chains.forEach(c => {
      c.networks.forEach(network => {
        apiNetworkIds.add(`${c.chain}-${network}`);
      });
    });

    // Combine common networks with any additional from API
    const combined = [...COMMON_NETWORKS.filter(n => apiNetworkIds.has(n.id) || apiNetworkIds.size === 0)];

    // Add any networks from API not in common list
    chains.forEach(c => {
      c.networks.forEach(network => {
        const networkId = `${c.chain}-${network}`;
        if (!COMMON_NETWORKS.find(cn => cn.id === networkId)) {
          combined.push({ id: networkId, chain: c.chain, label: `${c.chain} ${network}` });
        }
      });
    });

    return combined.map(n => ({ value: n.id, label: n.label }));
  }, [chains]);

  // Connector options for combobox
  const connectorOptions = useMemo(() => {
    return ammConnectors.map(c => ({ value: c.name, label: c.name }));
  }, [ammConnectors]);

  // Pool options for combobox (allows custom entry)
  const poolOptions = useMemo(() => {
    return pools.map(p => ({
      value: p.address,
      label: `${p.base_token}/${p.quote_token}${p.fee_tier ? ` (${p.fee_tier}%)` : ''}`,
    }));
  }, [pools]);


  // Loading state
  if (loadingGateway) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  // Gateway not running
  if (!gatewayRunning) {
    return (
      <div className="max-w-2xl mx-auto mt-16">
        <Empty>
          <EmptyMedia variant="icon">
            <Info className="text-muted-foreground" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>Gateway Not Running</EmptyTitle>
            <EmptyDescription>
              The Hummingbot Gateway server is required for AMM trading. Start Gateway from Settings to continue.
            </EmptyDescription>
          </EmptyHeader>
          <Button asChild>
            <a href="/settings?section=gateway">Go to Gateway Settings</a>
          </Button>
        </Empty>
      </div>
    );
  }

  return (
    <div className="-m-4 md:-m-6 h-[calc(100vh-56px-36px)] overflow-hidden flex flex-col">
      {/* Header Row - Network, DEX & Pool Selectors */}
      <div className="flex flex-wrap items-center gap-2 md:gap-4 px-4 md:px-6 py-3 md:py-4 border-b border-border">
        <h1 className="text-base md:text-lg font-semibold">AMM Markets</h1>
        <div className="w-40 md:w-48">
          <Combobox
            options={networkOptions}
            value={selectedNetwork}
            onValueChange={(v: string) => {
              setSelectedNetwork(v);
              setSelectedConnector('');
              setPoolAddress('');
              setSelectedPool(null);
            }}
            placeholder="Select network..."
            searchPlaceholder="Search networks..."
            emptyText="No networks found"
          />
        </div>
        <div className="w-32 md:w-40">
          <Combobox
            options={connectorOptions}
            value={selectedConnector}
            onValueChange={(v: string) => {
              setSelectedConnector(v);
              setPoolAddress('');
              setSelectedPool(null);
            }}
            placeholder="Select DEX..."
            searchPlaceholder="Search DEXs..."
            emptyText="No DEXs found"
            disabled={!selectedNetwork}
          />
        </div>
        <div className="w-48 md:w-64">
          <Combobox
            options={poolOptions}
            value={poolAddress}
            onValueChange={(v: string) => setPoolAddress(v)}
            placeholder={loadingPools ? "Loading pools..." : "Select or enter pool..."}
            searchPlaceholder="Search pools or enter address..."
            emptyText="Enter pool address"
            disabled={!selectedConnector}
            allowCustomValue
          />
        </div>
        {loadingPoolInfo && (
          <Loader2 size={16} className="animate-spin text-muted-foreground" />
        )}
        {selectedPool && (
          <Badge variant="secondary" className="text-xs">
            {selectedPool.base_token}/{selectedPool.quote_token}
          </Badge>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="mx-4 md:mx-6 mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <ResizablePanelGroup direction="vertical" className="flex-1">
        {/* Top Section - Pools & Actions */}
        <ResizablePanel defaultSize={60} minSize={30}>
          {!selectedNetwork ? (
            <div className="h-full flex items-center justify-center">
              <Empty className="py-16">
                <EmptyMedia variant="icon">
                  <Droplets className="text-muted-foreground" />
                </EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>Select Network</EmptyTitle>
                  <EmptyDescription>
                    Choose a blockchain network to browse pools and start trading.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          ) : !selectedConnector ? (
            <div className="h-full flex items-center justify-center">
              <Empty className="py-16">
                <EmptyMedia variant="icon">
                  <Droplets className="text-muted-foreground" />
                </EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>Select DEX</EmptyTitle>
                  <EmptyDescription>
                    Choose a decentralized exchange to browse pools and start trading.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          ) : !selectedPool ? (
            <div className="h-full flex items-center justify-center">
              <Empty className="py-16">
                <EmptyMedia variant="icon">
                  <Droplets className="text-muted-foreground" />
                </EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>Select Pool</EmptyTitle>
                  <EmptyDescription>
                    Select a pool from the dropdown or enter a pool address to view pool data and start trading.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          ) : (
            <ResizablePanelGroup direction={isMobile ? "vertical" : "horizontal"}>
              {/* Pool List Panel */}
              <ResizablePanel defaultSize={isMobile ? 50 : 60} minSize={isMobile ? 30 : 40}>
                <div className="h-full flex flex-col px-4 md:px-6 py-3 md:py-4 overflow-hidden">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold">Available Pools</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        setLoadingPools(true);
                        try {
                          const networkParts = selectedNetwork.split('-');
                          const network = networkParts.slice(1).join('-') || networkParts[0];
                          const poolTemplates = await gatewayClient.pools.list(selectedConnector, network);
                          setPools(poolTemplates.map(p => ({
                            address: p.address,
                            connector: p.connector || selectedConnector,
                            network: p.network,
                            base_token: p.baseSymbol,
                            quote_token: p.quoteSymbol,
                            fee_tier: p.feePct,
                          })));
                        } catch {
                          setPools([]);
                        } finally {
                          setLoadingPools(false);
                        }
                      }}
                      disabled={loadingPools}
                    >
                      <RefreshCw size={14} className={loadingPools ? 'animate-spin' : ''} />
                    </Button>
                  </div>

                  {loadingPools ? (
                    <div className="flex-1 flex items-center justify-center">
                      <Loader2 className="animate-spin text-primary" size={24} />
                    </div>
                  ) : pools.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                      No pools found. Enter a pool address above.
                    </div>
                  ) : (
                    <div className="flex-1 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Pair</TableHead>
                            <TableHead className="text-right">Liquidity</TableHead>
                            <TableHead className="text-right">Volume 24h</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pools.map((pool) => (
                            <TableRow
                              key={pool.address}
                              className={cn(
                                "cursor-pointer hover:bg-muted/50",
                                selectedPool?.address === pool.address && "bg-muted"
                              )}
                              onClick={() => handlePoolSelect(pool)}
                            >
                              <TableCell>
                                <div>
                                  <span className="font-medium">{pool.base_token}/{pool.quote_token}</span>
                                  {pool.fee_tier && (
                                    <Badge variant="secondary" className="ml-2 text-xs">
                                      {pool.fee_tier}%
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground font-mono">
                                  {pool.address.slice(0, 8)}...{pool.address.slice(-6)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm">
                                {pool.liquidity ? `$${pool.liquidity.toLocaleString()}` : '-'}
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm">
                                {pool.volume_24h ? `$${pool.volume_24h.toLocaleString()}` : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Actions Panel */}
              <ResizablePanel defaultSize={isMobile ? 50 : 40} minSize={20} maxSize={isMobile ? 70 : 50}>
                <div className="h-full px-4 md:px-6 py-3 md:py-4 overflow-y-auto border-t md:border-t-0 md:border-l border-border">
                  <Tabs defaultValue="swap" className="h-full">
                    <TabsList className="w-full bg-transparent border-b border-border rounded-none h-auto p-0 gap-0 mb-4">
                      <TabsTrigger
                        value="swap"
                        className="flex-1 text-sm py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                      >
                        <ArrowDownUp size={14} className="mr-2" />
                        Swap
                      </TabsTrigger>
                      <TabsTrigger
                        value="lp"
                        className="flex-1 text-sm py-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                      >
                        <Droplets size={14} className="mr-2" />
                        LP
                      </TabsTrigger>
                    </TabsList>

                    {/* Swap Tab */}
                    <TabsContent value="swap" className="mt-0 space-y-4">
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">From</Label>
                          <div className="flex gap-2 mt-1">
                            <Input
                              value={swapFromToken}
                              onChange={(e) => setSwapFromToken(e.target.value.toUpperCase())}
                              placeholder="Token"
                              className="w-24"
                            />
                            <Input
                              value={swapAmount}
                              onChange={(e) => setSwapAmount(e.target.value)}
                              placeholder="0.00"
                              type="number"
                              className="flex-1"
                            />
                          </div>
                        </div>

                        <div className="flex justify-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            onClick={() => {
                              const temp = swapFromToken;
                              setSwapFromToken(swapToToken);
                              setSwapToToken(temp);
                            }}
                          >
                            <ArrowDownUp size={14} />
                          </Button>
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground">To</Label>
                          <div className="flex gap-2 mt-1">
                            <Input
                              value={swapToToken}
                              onChange={(e) => setSwapToToken(e.target.value.toUpperCase())}
                              placeholder="Token"
                              className="w-24"
                            />
                            <Input
                              value={swapQuote ? swapQuote.amount_out.toFixed(6) : ''}
                              placeholder="0.00"
                              readOnly
                              className="flex-1 bg-muted"
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground">Slippage: {swapSlippage}%</Label>
                          <Slider
                            value={[swapSlippage]}
                            onValueChange={([v]) => setSwapSlippage(v)}
                            min={0.1}
                            max={5}
                            step={0.1}
                            className="mt-2"
                          />
                        </div>

                        {swapQuote && (
                          <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Price</span>
                              <span className="font-mono">{swapQuote.price.toFixed(6)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">You receive</span>
                              <span className="font-mono">{swapQuote.amount_out.toFixed(6)} {swapToToken}</span>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={handleGetQuote}
                            disabled={loadingQuote || !swapFromToken || !swapToToken || !swapAmount}
                          >
                            {loadingQuote ? <Loader2 className="animate-spin" size={14} /> : 'Get Quote'}
                          </Button>
                          <Button
                            className="flex-1"
                            onClick={handleExecuteSwap}
                            disabled={executingSwap || !swapQuote}
                          >
                            {executingSwap ? <Loader2 className="animate-spin" size={14} /> : 'Swap'}
                          </Button>
                        </div>
                      </div>
                    </TabsContent>

                    {/* LP Tab */}
                    <TabsContent value="lp" className="mt-0 space-y-4">
                      {selectedPool ? (
                        <div className="space-y-3">
                          <div className="p-3 rounded-lg bg-muted/50">
                            <div className="font-medium">{selectedPool.base_token}/{selectedPool.quote_token}</div>
                            <div className="text-xs text-muted-foreground font-mono mt-1">
                              {selectedPool.address}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs text-muted-foreground">Lower Price</Label>
                              <Input
                                value={lpLowerPrice}
                                onChange={(e) => setLpLowerPrice(e.target.value)}
                                placeholder="0.00"
                                type="number"
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Upper Price</Label>
                              <Input
                                value={lpUpperPrice}
                                onChange={(e) => setLpUpperPrice(e.target.value)}
                                placeholder="0.00"
                                type="number"
                                className="mt-1"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs text-muted-foreground">{selectedPool.base_token} Amount</Label>
                              <Input
                                value={lpBaseAmount}
                                onChange={(e) => setLpBaseAmount(e.target.value)}
                                placeholder="0.00"
                                type="number"
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">{selectedPool.quote_token} Amount</Label>
                              <Input
                                value={lpQuoteAmount}
                                onChange={(e) => setLpQuoteAmount(e.target.value)}
                                placeholder="0.00"
                                type="number"
                                className="mt-1"
                              />
                            </div>
                          </div>

                          <div>
                            <Label className="text-xs text-muted-foreground">Slippage: {lpSlippage}%</Label>
                            <Slider
                              value={[lpSlippage]}
                              onValueChange={([v]) => setLpSlippage(v)}
                              min={0.1}
                              max={5}
                              step={0.1}
                              className="mt-2"
                            />
                          </div>

                          <Button
                            className="w-full"
                            onClick={handleAddLiquidity}
                            disabled={executingLP || !lpLowerPrice || !lpUpperPrice}
                          >
                            {executingLP ? (
                              <Loader2 className="animate-spin mr-2" size={14} />
                            ) : (
                              <Droplets size={14} className="mr-2" />
                            )}
                            Add Liquidity
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          Select a pool to add liquidity
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Bottom Section - Balances, LP Positions, Transactions */}
        <ResizablePanel defaultSize={40} minSize={20}>
          <div className="h-full px-4 md:px-6 py-3 md:py-4 overflow-auto">
            <Tabs defaultValue="balances" className="h-full">
              <TabsList className="w-full bg-transparent border-b border-border rounded-none h-auto p-0 gap-0">
                <TabsTrigger
                  value="balances"
                  className="flex-1 text-sm py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground"
                >
                  <Wallet size={14} className="mr-2" />
                  Balances
                </TabsTrigger>
                <TabsTrigger
                  value="positions"
                  className="flex-1 text-sm py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground"
                >
                  <TrendingUp size={14} className="mr-2" />
                  LP Positions ({positions.length})
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="flex-1 text-sm py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground"
                >
                  <History size={14} className="mr-2" />
                  Transactions ({swapHistory?.data?.length || 0})
                </TabsTrigger>
              </TabsList>

              {/* Balances Tab */}
              <TabsContent value="balances" className="mt-4">
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Wallet size={32} className="mx-auto mb-2 opacity-50" />
                  Connect a wallet to view balances
                </div>
              </TabsContent>

              {/* LP Positions Tab */}
              <TabsContent value="positions" className="mt-4">
                <div className="flex justify-end mb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchPositions}
                    disabled={loadingPositions}
                  >
                    <RefreshCw size={14} className={loadingPositions ? 'animate-spin' : ''} />
                  </Button>
                </div>
                {loadingPositions ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin text-primary" size={24} />
                  </div>
                ) : positions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No LP positions found
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pool</TableHead>
                        <TableHead>Range</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                        <TableHead className="text-right">Fees</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {positions.map((pos) => (
                        <TableRow key={pos.position_id}>
                          <TableCell>
                            <div className="font-medium">{pos.base_token}/{pos.quote_token}</div>
                            <div className="text-xs text-muted-foreground">{pos.connector}</div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {pos.lower_price.toFixed(4)} - {pos.upper_price.toFixed(4)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={pos.in_range === 'IN_RANGE' ? 'default' : 'secondary'}>
                              {pos.in_range === 'IN_RANGE' ? 'In Range' : 'Out of Range'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {pos.pnl_summary?.current_lp_value_quote?.toFixed(2) || '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {pos.pnl_summary?.total_fees_value_quote?.toFixed(2) || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              {/* Transactions Tab */}
              <TabsContent value="history" className="mt-4">
                <div className="flex justify-end mb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchSwapHistory}
                    disabled={loadingHistory}
                  >
                    <RefreshCw size={14} className={loadingHistory ? 'animate-spin' : ''} />
                  </Button>
                </div>
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin text-primary" size={24} />
                  </div>
                ) : !swapHistory?.data?.length ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No transactions found
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Pair</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {swapHistory.data.map((tx: Record<string, unknown>, i: number) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Badge variant="outline">{String(tx.side || 'SWAP')}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{String(tx.trading_pair || '-')}</TableCell>
                          <TableCell>
                            <Badge variant={tx.status === 'CONFIRMED' ? 'default' : 'secondary'}>
                              {String(tx.status || 'PENDING')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {tx.amount ? Number(tx.amount).toFixed(4) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
