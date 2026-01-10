import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAccount } from '@/components/account-provider';
import { portfolio, trading, connectors, marketData, accounts, controllers } from '@/api/client';
import type { PortfolioBalance, PaginatedResponse, TradingRule, TradeRequest } from '@/api/client';
import { Loader2, Grid3X3, Activity, Settings, Rocket, RefreshCw, Info, Key } from 'lucide-react';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Combobox } from '@/components/ui/combobox';
import { CandlestickChart } from '@/components/ui/candlestick-chart';
import type { Candle, PriceLine } from '@/components/ui/candlestick-chart';
import { Skeleton } from '@/components/ui/skeleton';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';

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

// Helper to calculate price decimals from min_base_amount_increment
// 0.00001 → 0, 0.0001 → 1, 0.001 → 2, 0.01 → 3, etc.
function getPriceDecimals(minBaseAmountIncrement: number | undefined): number {
  if (!minBaseAmountIncrement || minBaseAmountIncrement <= 0) return 2;
  return Math.max(0, Math.round(5 + Math.log10(minBaseAmountIncrement)));
}

interface TradePageProps {
  type: 'spot' | 'perp';
}

export default function TradePage({ type }: TradePageProps) {
  const navigate = useNavigate();
  const { account, timezone } = useAccount();

  // Selected connector state
  const [selectedConnector, setSelectedConnector] = useState<string>('');

  // Data state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [balances, setBalances] = useState<PortfolioBalance[]>([]);
  const [activeOrders, setActiveOrders] = useState<PaginatedResponse | null>(null);
  const [positions, setPositions] = useState<PaginatedResponse | null>(null);
  const [trades, setTrades] = useState<PaginatedResponse | null>(null);

  // Trading pair state
  const [tradingPairs, setTradingPairs] = useState<string[]>([]);
  const [selectedPair, setSelectedPair] = useState<string>('');
  const [loadingPairs, setLoadingPairs] = useState(false);
  const [tradingRule, setTradingRule] = useState<TradingRule | null>(null);

  // Chart panel tab state
  const [chartPanelTab, setChartPanelTab] = useState<'orderbook' | 'chart'>('orderbook');

  // Chart state
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loadingCandles, setLoadingCandles] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [chartTimeframe, setChartTimeframe] = useState<'1m' | '5m' | '1h'>('1m');

  // Market data state
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);

  // Order book state - flexible type to handle different API formats
  const [orderBook, setOrderBook] = useState<{ bids: unknown[]; asks: unknown[] } | null>(null);
  const [loadingOrderBook, setLoadingOrderBook] = useState(false);
  const [orderBookCumulative, setOrderBookCumulative] = useState(true);
  
  // Funding info state (perp only)
  const [fundingInfo, setFundingInfo] = useState<{ funding_rate: number; next_funding_time: number; mark_price: number; index_price: number } | null>(null);
  const [fundingCountdown, setFundingCountdown] = useState<string>('');

  // Connector selection state
  const [allConnectors, setAllConnectors] = useState<string[]>([]);
  const [connectedConnectors, setConnectedConnectors] = useState<string[]>([]);

  // Actions panel state
  const [actionTab, setActionTab] = useState<'trade' | 'grid'>('trade');

  // Leverage state (shared between trade and grid)
  const [leverage, setLeverage] = useState<number>(5);

  // Position mode state (perp only)
  const [positionMode, setPositionMode] = useState<'ONEWAY' | 'HEDGE'>('ONEWAY');
  const [togglingPositionMode, setTogglingPositionMode] = useState(false);
  const [settingLeverage, setSettingLeverage] = useState(false);

  // Trade form state
  const [tradeType, setTradeType] = useState<'limit' | 'market'>('limit');
  const [tradeAmount, setTradeAmount] = useState<string>('100');
  const [tradePrice, setTradePrice] = useState<string>('');

  // Grid Bot form state
  const [gridSide, setGridSide] = useState<'BUY' | 'SELL'>('BUY');
  const [gridStartPrice, setGridStartPrice] = useState<string>('');
  const [gridEndPrice, setGridEndPrice] = useState<string>('');
  const [gridLimitPrice, setGridLimitPrice] = useState<string>('');
  const [gridAmount, setGridAmount] = useState<string>('1000');
  const [gridMinSpread, setGridMinSpread] = useState<string>('0.001');
  const [gridMaxOrders, setGridMaxOrders] = useState<number>(2);
  const [gridTakeProfit, setGridTakeProfit] = useState<string>('0.001');
  const [deploying, setDeploying] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  const isPerp = type === 'perp';

  // Reset state when switching between spot and perp
  useEffect(() => {
    setSelectedConnector('');
    setSelectedPair('');
    setBalances([]);
    setActiveOrders(null);
    setPositions(null);
    setTrades(null);
    setTradingPairs([]);
    setCandles([]);
    setCurrentPrice(null);
    setError(null);
    setChartError(null);
    setTradePrice('');
    setGridStartPrice('');
    setGridEndPrice('');
    setGridLimitPrice('');
    setChartPanelTab('orderbook');
    setOrderBook(null);
    setFundingInfo(null);
  }, [type]);
  const priceDecimals = getPriceDecimals(tradingRule?.min_base_amount_increment);

  // Fetch all connectors and connected connectors
  useEffect(() => {
    async function fetchAllConnectors() {
      try {
        const list = await connectors.list();
        setAllConnectors(list);
      } catch {
        setAllConnectors([]);
      }
    }
    fetchAllConnectors();
  }, []);

  useEffect(() => {
    async function fetchConnectedConnectors() {
      if (!account) {
        setConnectedConnectors([]);
        return;
      }
      try {
        const creds = await accounts.getCredentials(account);
        setConnectedConnectors(creds);

        // Auto-select first connected connector of this type if none selected
        if (!selectedConnector) {
          const filteredCreds = creds.filter(c =>
            isPerp ? isPerpetualConnector(c) : !isPerpetualConnector(c)
          );
          if (filteredCreds.length > 0) {
            setSelectedConnector(filteredCreds[0]);
          }
        }
      } catch {
        setConnectedConnectors([]);
      }
    }
    fetchConnectedConnectors();
  }, [account, selectedConnector, isPerp]);

  // Reset account-related data when connector changes
  useEffect(() => {
    setBalances([]);
    setActiveOrders(null);
    setPositions(null);
    setTrades(null);
    setCurrentPrice(null);
    setOrderBook(null);
    setCandles([]);
    setFundingInfo(null);
    setTradePrice('');
    setGridStartPrice('');
    setGridEndPrice('');
    setGridLimitPrice('');
  }, [selectedConnector]);

  // Fetch trading pairs when connector changes
  useEffect(() => {
    // Clear previous state when connector changes
    setSelectedPair('');
    setTradingPairs([]);

    async function fetchTradingPairs() {
      if (!selectedConnector) return;

      setLoadingPairs(true);
      try {
        const rules = await connectors.getAllTradingRules(selectedConnector);
        const pairs = Object.keys(rules).sort();
        setTradingPairs(pairs);
      } catch (err) {
        console.error('Failed to fetch trading pairs:', err);
        setTradingPairs([]);
      } finally {
        setLoadingPairs(false);
      }
    }

    fetchTradingPairs();
  }, [selectedConnector]);

  // Fetch trading rule when pair changes
  useEffect(() => {
    if (!selectedConnector || !selectedPair) {
      setTradingRule(null);
      return;
    }

    async function fetchTradingRule() {
      try {
        const rules = await connectors.getTradingRules(selectedConnector!, selectedPair);
        if (rules[selectedPair]) {
          setTradingRule(rules[selectedPair]);
        }
      } catch (err) {
        console.error('Failed to fetch trading rule:', err);
        setTradingRule(null);
      }
    }

    fetchTradingRule();
  }, [selectedConnector, selectedPair]);

  // Fetch price and order book data
  const fetchPriceAndOrderBook = async () => {
    if (!selectedConnector || !selectedPair) return;

    setLoadingOrderBook(true);
    try {
      // Fetch price
      const priceResponse = await marketData.getPrices({
        connector_name: selectedConnector,
        trading_pairs: [selectedPair],
      });
      const priceData = priceResponse as { prices: Record<string, number> };
      if (priceData.prices?.[selectedPair]) {
        setCurrentPrice(priceData.prices[selectedPair]);
      }

      // Fetch order book with depth
      const obResponse = await marketData.getOrderBook({
        connector_name: selectedConnector,
        trading_pair: selectedPair,
        depth: 10,
      });
      setOrderBook({
        bids: obResponse.bids || [],
        asks: obResponse.asks || [],
      });
    } catch (err) {
      console.error('Failed to fetch price/order book:', err);
    } finally {
      setLoadingOrderBook(false);
    }
  };

  // Initial fetch when pair or depth changes
  useEffect(() => {
    if (!selectedConnector || !selectedPair) {
      setCurrentPrice(null);
      setOrderBook(null);
      return;
    }

    fetchPriceAndOrderBook();
  }, [selectedConnector, selectedPair]);

  // Fetch candles only when chart tab is selected
  useEffect(() => {
    if (!selectedConnector || !selectedPair || chartPanelTab !== 'chart') {
      return;
    }

    // Timeframe config: interval and max_records
    const timeframeConfig: Record<string, { interval: string; max_records: number }> = {
      '1m': { interval: '1m', max_records: 120 },
      '5m': { interval: '5m', max_records: 120 },
      '1h': { interval: '1h', max_records: 120 },
    };
    const config = timeframeConfig[chartTimeframe];
    const { interval, max_records } = config;

    async function fetchCandles() {
      setLoadingCandles(true);
      setChartError(null);
      try {
        const response = await marketData.getCandles({
          connector_name: selectedConnector!,
          trading_pair: selectedPair,
          interval,
          max_records,
        });

        interface CandleResponse {
          timestamp: number;
          open: number;
          high: number;
          low: number;
          close: number;
          volume: number;
        }
        const data = response as CandleResponse[];
        if (Array.isArray(data) && data.length > 0) {
          const parsedCandles: Candle[] = data
            .map((c) => {
              // Detect if timestamp is in milliseconds (13+ digits) or seconds (10 digits)
              const timestampMs = c.timestamp > 9999999999 ? c.timestamp : c.timestamp * 1000;
              return {
                timestamp: timestampMs,
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
                volume: c.volume,
              };
            })
            .sort((a, b) => a.timestamp - b.timestamp);

          setCandles(parsedCandles);
          setChartError(null);
        } else {
          setCandles([]);
          setChartError('No candle data available for this pair');
        }
      } catch (err) {
        console.error('Failed to fetch candles:', err);
        setCandles([]);
        setChartError(err instanceof Error ? err.message : 'Failed to fetch candle data');
      } finally {
        setLoadingCandles(false);
      }
    }

    fetchCandles();
  }, [selectedConnector, selectedPair, chartTimeframe, chartPanelTab]);

  // Fetch funding info when pair is selected (perp only)
  useEffect(() => {
    if (!selectedConnector || !selectedPair || !isPerp) {
      setFundingInfo(null);
      return;
    }

    async function fetchFundingInfo() {
      try {
        const response = await marketData.getFundingInfo({
          connector_name: selectedConnector!,
          trading_pair: selectedPair,
        });
        // Map API response to our expected format
        setFundingInfo({
          funding_rate: response.rate ?? response.funding_rate ?? 0,
          next_funding_time: response.next_funding_utc_timestamp ?? response.next_funding_time ?? 0,
          mark_price: response.mark_price ?? 0,
          index_price: response.index_price ?? 0,
        });
      } catch (err) {
        console.error('Failed to fetch funding info:', err);
        setFundingInfo(null);
      }
    }

    fetchFundingInfo();
    // Refresh funding info every 30 seconds
    const interval = setInterval(fetchFundingInfo, 30000);
    return () => clearInterval(interval);
  }, [selectedConnector, selectedPair, isPerp]);

  // Fetch position mode when connector changes (perp only)
  useEffect(() => {
    if (!selectedConnector || !account || !isPerp) {
      return;
    }

    async function fetchPositionMode() {
      try {
        const response = await trading.getPositionMode(account!, selectedConnector!);
        const mode = response.position_mode as 'ONEWAY' | 'HEDGE';
        if (mode === 'ONEWAY' || mode === 'HEDGE') {
          setPositionMode(mode);
        }
      } catch (err) {
        console.error('Failed to fetch position mode:', err);
      }
    }

    fetchPositionMode();
  }, [selectedConnector, account, isPerp]);

  // Set position mode handler
  async function handleSetPositionMode(newMode: 'ONEWAY' | 'HEDGE') {
    if (!selectedConnector || !account || newMode === positionMode) return;

    setTogglingPositionMode(true);
    try {
      await trading.setPositionMode(account, selectedConnector, newMode);
      setPositionMode(newMode);
      toast.success(`Position mode changed to ${newMode}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to change position mode');
    } finally {
      setTogglingPositionMode(false);
    }
  }

  // Set leverage handler
  async function handleSetLeverage(newLeverage: number) {
    if (!selectedConnector || !account || !selectedPair || !isPerp) return;

    setSettingLeverage(true);
    try {
      await trading.setLeverage(account, selectedConnector, selectedPair, newLeverage);
      setLeverage(newLeverage);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to set leverage');
    } finally {
      setSettingLeverage(false);
    }
  }

  // Set initial leverage when trading pair is selected (perp only)
  useEffect(() => {
    if (!selectedConnector || !account || !selectedPair || !isPerp) return;

    // Set default leverage of 5x when user lands on a new trading pair
    async function setInitialLeverage() {
      try {
        await trading.setLeverage(account!, selectedConnector!, selectedPair, 5);
        setLeverage(5);
      } catch (err) {
        console.error('Failed to set initial leverage:', err);
      }
    }

    setInitialLeverage();
  }, [selectedConnector, selectedPair, account, isPerp]);

  // Update funding countdown every second
  useEffect(() => {
    if (!fundingInfo?.next_funding_time) {
      setFundingCountdown('');
      return;
    }

    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = fundingInfo.next_funding_time - now;
      if (diff <= 0) {
        setFundingCountdown('0:00:00');
        return;
      }
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;
      setFundingCountdown(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [fundingInfo?.next_funding_time]);

  // Fetch account data
  useEffect(() => {
    async function fetchData() {
      if (!account || !selectedConnector) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch balances
        const state = await portfolio.getState([account], [selectedConnector]);
        const accountData = state[account];
        const balanceData = accountData?.[selectedConnector];
        if (balanceData) {
          setBalances(balanceData);
        }

        // Fetch active orders
        const ordersResult = await trading.getActiveOrders({
          account_names: [account],
          connector_names: [selectedConnector],
        });
        setActiveOrders(ordersResult);

        // Fetch positions (perpetual only)
        if (isPerp) {
          const positionsResult = await trading.getPositions({
            account_names: [account],
            connector_names: [selectedConnector],
          });
          setPositions(positionsResult);
        }

        // Fetch recent trades
        const tradesResult = await trading.getTrades({
          account_names: [account],
          connector_names: [selectedConnector],
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
  }, [account, selectedConnector, isPerp]);

  // Auto-calculate grid prices when candles change and in grid tab
  useEffect(() => {
    if (candles.length === 0 || actionTab !== 'grid') return;

    const highestHigh = Math.max(...candles.map(c => c.high));
    const lowestLow = Math.min(...candles.map(c => c.low));
    const range = highestHigh - lowestLow;

    let start: number, end: number, limit: number;
    if (gridSide === 'BUY') {
      start = lowestLow;
      end = highestHigh;
      limit = start - (range * 0.2);
    } else {
      start = highestHigh;
      end = lowestLow;
      limit = start + (range * 0.2);
    }

    // Only set if not already set
    if (!gridStartPrice) setGridStartPrice(start.toFixed(2));
    if (!gridEndPrice) setGridEndPrice(end.toFixed(2));
    if (!gridLimitPrice) setGridLimitPrice(limit.toFixed(2));
  }, [candles, actionTab, gridSide, gridStartPrice, gridEndPrice, gridLimitPrice]);

  // Set trade price from current price when pair changes
  useEffect(() => {
    if (currentPrice) {
      setTradePrice(currentPrice.toFixed(2));
    }
  }, [currentPrice, selectedPair]);

  // Place a trade order
  async function handlePlaceOrder(side: 'BUY' | 'SELL') {
    if (!selectedConnector || !selectedPair || !account) {
      toast.error('Please select a trading pair and account');
      return;
    }

    const amount = parseFloat(tradeAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const price = parseFloat(tradePrice);
    if (tradeType === 'limit' && (!price || price <= 0)) {
      toast.error('Please enter a valid price for limit order');
      return;
    }

    setPlacingOrder(true);
    try {
      const orderRequest: TradeRequest = {
        account_name: account,
        connector_name: selectedConnector,
        trading_pair: selectedPair,
        trade_type: side,
        order_type: tradeType === 'limit' ? 'LIMIT' : 'MARKET',
        amount: amount,
        ...(tradeType === 'limit' && { price }),
        ...(isPerp && { position_action: 'OPEN' }),
      };

      const response = await trading.placeOrder(orderRequest);
      toast.success(`${side} order placed successfully (ID: ${response.order_id})`);

      // Refresh active orders
      const ordersResult = await trading.getActiveOrders({
        account_names: [account],
        connector_names: [selectedConnector],
      });
      setActiveOrders(ordersResult);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to place order');
    } finally {
      setPlacingOrder(false);
    }
  }

  // Cancel an order
  async function handleCancelOrder(orderId: string, connectorName: string) {
    if (!account) return;

    setCancellingOrderId(orderId);
    try {
      await trading.cancelOrder(account, connectorName, orderId);
      toast.success('Order cancelled');

      // Refresh active orders
      const ordersResult = await trading.getActiveOrders({
        account_names: [account],
        connector_names: [selectedConnector || connectorName],
      });
      setActiveOrders(ordersResult);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel order');
    } finally {
      setCancellingOrderId(null);
    }
  }

  // Generate random config name
  function generateConfigName(): string {
    const adjectives = ['swift', 'bold', 'calm', 'bright', 'quick', 'wild', 'gentle', 'fierce'];
    const colors = ['red', 'blue', 'green', 'gold', 'silver', 'amber', 'jade', 'ruby'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const pair = selectedPair.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `${adj}-${color}-${pair}`;
  }

  // Deploy grid bot
  async function handleDeployGrid() {
    if (!selectedConnector || !selectedPair || !account) {
      toast.error('Please select a trading pair and account');
      return;
    }

    setDeploying(true);
    try {
      const configId = generateConfigName();
      const config = {
        id: configId,
        controller_name: 'grid_strike',
        controller_type: 'generic',
        connector_name: selectedConnector,
        trading_pair: selectedPair,
        side: gridSide === 'BUY' ? 1 : 2,
        total_amount_quote: parseFloat(gridAmount) || 1000,
        leverage: leverage,
        position_mode: 'HEDGE',
        start_price: parseFloat(gridStartPrice) || 0,
        end_price: parseFloat(gridEndPrice) || 0,
        limit_price: parseFloat(gridLimitPrice) || 0,
        min_spread_between_orders: parseFloat(gridMinSpread) || 0.001,
        min_order_amount_quote: 5,
        max_open_orders: gridMaxOrders,
        max_orders_per_batch: 1,
        order_frequency: 3,
        triple_barrier_config: {
          take_profit: parseFloat(gridTakeProfit) || 0.001,
          stop_loss: null,
          time_limit: null,
          trailing_stop: null,
          open_order_type: 3,
          take_profit_order_type: 3,
          stop_loss_order_type: 1,
          time_limit_order_type: 1,
        },
      };

      await controllers.createOrUpdateConfig(configId, config);
      toast.success(`Grid config "${configId}" created`);
      navigate(`/bots/deploy?controller=grid_strike&config=${encodeURIComponent(configId)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to deploy grid');
    } finally {
      setDeploying(false);
    }
  }

  // Build price lines for chart when in grid tab
  const chartPriceLines: PriceLine[] = actionTab === 'grid' ? [
    { id: 'start', price: parseFloat(gridStartPrice) || 0, color: '#22c55e', title: 'Start', lineStyle: 'dashed' as const, draggable: true },
    { id: 'end', price: parseFloat(gridEndPrice) || 0, color: '#3b82f6', title: 'End', lineStyle: 'dashed' as const, draggable: true },
    { id: 'limit', price: parseFloat(gridLimitPrice) || 0, color: '#ef4444', title: 'Limit', lineStyle: 'solid' as const, draggable: true },
  ].filter(l => l.price > 0) : [];

  return (
    <div className="-m-6">
      {/* Header Row - Exchange & Pair Selectors */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border">
        <h1 className="text-lg font-semibold">{isPerp ? 'Perp Markets' : 'Spot Markets'}</h1>
        <div className="w-52">
          <Combobox
            options={(() => {
              // Filter connectors by current type (spot/perp)
              const filtered = allConnectors.filter(c =>
                isPerp ? isPerpetualConnector(c) : !isPerpetualConnector(c)
              );
              // Sort with connected connectors first
              return filtered
                .sort((a, b) => {
                  const aConnected = connectedConnectors.includes(a);
                  const bConnected = connectedConnectors.includes(b);
                  if (aConnected && !bConnected) return -1;
                  if (!aConnected && bConnected) return 1;
                  return a.localeCompare(b);
                })
                .map(c => ({
                  value: c,
                  label: connectedConnectors.includes(c)
                    ? <span className="flex items-center gap-1.5">{formatConnectorName(c)} <Key size={12} /></span>
                    : formatConnectorName(c),
                  searchValue: formatConnectorName(c),
                }));
            })()}
            value={selectedConnector}
            onValueChange={setSelectedConnector}
            placeholder="Select exchange..."
            searchPlaceholder="Search exchanges..."
            emptyText="No exchanges found."
          />
        </div>
        <div className="w-48">
          <Combobox
            options={tradingPairs.map((p) => ({ value: p, label: p }))}
            value={selectedPair}
            onValueChange={setSelectedPair}
            placeholder={loadingPairs ? 'Loading...' : 'Select pair...'}
            searchPlaceholder="Search or enter pair..."
            emptyText="No pairs found."
            disabled={loadingPairs || !selectedConnector}
            allowCustomValue
          />
        </div>

        {/* Trading rules hover card */}
        {tradingRule && (
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Info size={16} />
              </Button>
            </HoverCardTrigger>
            <HoverCardContent className="w-72" align="start">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Trading Rules</h4>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <span className="text-muted-foreground">Min Order Size</span>
                  <span className="font-mono text-right">{tradingRule.min_order_size}</span>
                  <span className="text-muted-foreground">Max Order Size</span>
                  <span className="font-mono text-right">{tradingRule.max_order_size}</span>
                  <span className="text-muted-foreground">Min Price Increment</span>
                  <span className="font-mono text-right">{tradingRule.min_price_increment}</span>
                  <span className="text-muted-foreground">Min Base Increment</span>
                  <span className="font-mono text-right">{tradingRule.min_base_amount_increment}</span>
                  <span className="text-muted-foreground">Min Quote Increment</span>
                  <span className="font-mono text-right">{tradingRule.min_quote_amount_increment}</span>
                  <span className="text-muted-foreground">Min Notional Size</span>
                  <span className="font-mono text-right">{tradingRule.min_notional_size}</span>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        )}

        {/* Perp funding info - shown next to pair selector */}
        {isPerp && fundingInfo && (
          <div className="flex items-center gap-6 text-sm ml-4 border-l pl-4 border-border">
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs">Mark</span>
              <span className="font-mono">{fundingInfo.mark_price.toLocaleString()}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs">Oracle</span>
              <span className="font-mono">{fundingInfo.index_price.toLocaleString()}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs">Funding / Countdown</span>
              <div className="flex items-center gap-2">
                <span className={`font-mono ${(fundingInfo.funding_rate ?? 0) >= 0 ? 'text-teal-500' : 'text-red-500'}`}>
                  {((fundingInfo.funding_rate ?? 0) * 100).toFixed(4)}%
                </span>
                <span className="font-mono">{fundingCountdown || '--:--:--'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="mx-6 mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!account && (
        <Alert className="mx-6 mt-4">
          <AlertDescription>Please select an account from the header to view exchange data.</AlertDescription>
        </Alert>
      )}

      {/* Resizable Panel Layout */}
      <ResizablePanelGroup direction="vertical" className="flex-1" style={{ minHeight: 'calc(100vh - 140px)' }}>
        {/* Top Section - Chart & Actions */}
        <ResizablePanel defaultSize={60} minSize={30}>
          <ResizablePanelGroup direction="horizontal">
            {/* Chart Panel */}
            <ResizablePanel defaultSize={75} minSize={50}>
              <div className="h-full px-6 py-4 flex flex-col overflow-hidden">
                {/* Tab Navigation with Pair & Price centered */}
                <Tabs value={chartPanelTab} onValueChange={(v) => setChartPanelTab(v as 'orderbook' | 'chart')} className="flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-3">
                    <TabsList className="bg-background gap-1 border p-1 h-auto">
                      <TabsTrigger value="orderbook" className="text-xs px-3 py-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Order Book</TabsTrigger>
                      <TabsTrigger value="chart" className="text-xs px-3 py-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Chart</TabsTrigger>
                    </TabsList>

                    {/* Centered Pair */}
                    {selectedPair && (
                      <span className="text-2xl font-semibold">{selectedPair}</span>
                    )}

                    <div className="flex items-center gap-2">
                      {/* Cumulative toggle and refresh button for order book tab */}
                      {chartPanelTab === 'orderbook' && (
                        <>
                          <Button
                            variant={orderBookCumulative ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setOrderBookCumulative(!orderBookCumulative)}
                            className="h-7 px-2 text-xs"
                          >
                            Cumulative
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchPriceAndOrderBook}
                            disabled={loadingOrderBook || !selectedPair}
                            className="h-7 px-2"
                          >
                            <RefreshCw size={14} className={loadingOrderBook ? 'animate-spin' : ''} />
                          </Button>
                        </>
                      )}

                      {/* Timeframe selector for chart tab */}
                      {chartPanelTab === 'chart' && (
                        <>
                          <Tabs value={chartTimeframe} onValueChange={(v) => setChartTimeframe(v as '1m' | '5m' | '1h')}>
                            <TabsList className="bg-background gap-1 border p-1 h-auto">
                              <TabsTrigger value="1m" className="text-xs px-2 py-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">1m</TabsTrigger>
                              <TabsTrigger value="5m" className="text-xs px-2 py-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">5m</TabsTrigger>
                              <TabsTrigger value="1h" className="text-xs px-2 py-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">1h</TabsTrigger>
                            </TabsList>
                          </Tabs>
                          {loadingCandles && <Loader2 className="animate-spin text-muted-foreground" size={16} />}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Order Book Tab */}
                  <TabsContent value="orderbook" className="flex-1 m-0 min-h-0 overflow-auto">
                    {!selectedPair ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        Select a trading pair
                      </div>
                    ) : (
                      <div className="flex flex-col h-full gap-4">
                        {/* Order Book Table */}
                        {orderBook && (() => {
                          // Parse all bids and asks returned from API
                          const parsedBids = orderBook.bids.map((bid) => {
                            let price = 0, qty = 0;
                            if (Array.isArray(bid)) {
                              [price, qty] = bid;
                            } else if (bid && typeof bid === 'object') {
                              const b = bid as Record<string, unknown>;
                              price = Number(b.price ?? b.p ?? 0);
                              qty = Number(b.quantity ?? b.amount ?? b.q ?? 0);
                            }
                            return { price: Number(price), qty: Number(qty) };
                          });

                          const parsedAsks = orderBook.asks.map((ask) => {
                            let price = 0, qty = 0;
                            if (Array.isArray(ask)) {
                              [price, qty] = ask;
                            } else if (ask && typeof ask === 'object') {
                              const a = ask as Record<string, unknown>;
                              price = Number(a.price ?? a.p ?? 0);
                              qty = Number(a.quantity ?? a.amount ?? a.q ?? 0);
                            }
                            return { price: Number(price), qty: Number(qty) };
                          });

                          const totalBids = parsedBids.reduce((sum, b) => sum + b.qty, 0);
                          const totalAsks = parsedAsks.reduce((sum, a) => sum + a.qty, 0);

                          // Calculate mid price for bps calculation
                          const bestBid = parsedBids[0]?.price || 0;
                          const bestAsk = parsedAsks[0]?.price || 0;
                          const midPrice = (bestBid + bestAsk) / 2 || currentPrice || 1;

                          // For depth chart: calculate bps from mid price for all levels (no rounding)
                          const depthBids = parsedBids.map((bid) => {
                            const bps = ((bid.price - midPrice) / midPrice) * 10000;
                            return { bps, qty: bid.qty, price: bid.price };
                          });

                          const depthAsks = parsedAsks.map((ask) => {
                            const bps = ((ask.price - midPrice) / midPrice) * 10000;
                            return { bps, qty: ask.qty, price: ask.price };
                          });

                          // Calculate cumulative quantities (from best bid/ask outward)
                          let bidCumulative = 0;
                          const cumulativeBids = depthBids.map((d) => {
                            bidCumulative += d.qty;
                            return { ...d, cumQty: bidCumulative };
                          });

                          let askCumulative = 0;
                          const cumulativeAsks = depthAsks.map((d) => {
                            askCumulative += d.qty;
                            return { ...d, cumQty: askCumulative };
                          });

                          // Calculate actual range from data
                          const minBps = depthBids.length > 0 ? Math.min(...depthBids.map(d => d.bps)) : 0;
                          const maxBps = depthAsks.length > 0 ? Math.max(...depthAsks.map(d => d.bps)) : 0;
                          const chartRange = Math.max(Math.abs(minBps), Math.abs(maxBps), 0.1);

                          // Use cumulative or absolute max based on toggle
                          const maxQty = orderBookCumulative
                            ? Math.max(bidCumulative, askCumulative, 1)
                            : Math.max(
                                ...depthBids.map(d => d.qty),
                                ...depthAsks.map(d => d.qty),
                                1
                              );

                          const depthTotalBids = depthBids.reduce((a, b) => a + b.qty, 0);
                          const depthTotalAsks = depthAsks.reduce((a, b) => a + b.qty, 0);
                          const imbalance = depthTotalBids + depthTotalAsks > 0
                            ? ((depthTotalBids - depthTotalAsks) / (depthTotalBids + depthTotalAsks)) * 100
                            : 0;

                          return (
                            <div className="flex h-full gap-4">
                              {/* Left: Depth Chart */}
                              <div className="flex-1 flex flex-col min-w-0">
                                {/* Summary */}
                                <div className="text-xs text-muted-foreground mb-2">
                                  <span>Depth (±{chartRange.toFixed(1)} bps) | </span>
                                  <span className="text-green-500">Bids: {depthTotalBids.toFixed(2)}</span>
                                  <span> | </span>
                                  <span className="text-red-500">Asks: {depthTotalAsks.toFixed(2)}</span>
                                  <span> | </span>
                                  <span className={imbalance >= 0 ? 'text-green-500' : 'text-red-500'}>
                                    {imbalance >= 0 ? '+' : ''}{imbalance.toFixed(1)}%
                                  </span>
                                </div>

                                {/* Chart with Y-axis */}
                                <div className="flex-1 flex min-h-[150px]">
                                  {/* Y-axis */}
                                  <div className="flex flex-col justify-between text-xs text-muted-foreground pr-2 py-1 text-right w-16">
                                    <span>{maxQty.toFixed(2)}</span>
                                    <span>{(maxQty / 2).toFixed(2)}</span>
                                    <span>0 {selectedPair.split('-')[0]}</span>
                                  </div>
                                  {/* Chart - bids on left, asks on right */}
                                  <div className="flex-1 flex items-end gap-px">
                                    {/* Bids (sorted so highest bid is near center) */}
                                    {[...cumulativeBids].reverse().map((d, i) => {
                                      const displayQty = orderBookCumulative ? d.cumQty : d.qty;
                                      const height = maxQty > 0 ? (displayQty / maxQty) * 100 : 0;
                                      return (
                                        <div
                                          key={`bid-${i}`}
                                          className="flex-1 bg-green-500/70 transition-all"
                                          style={{ height: `${Math.max(height, 2)}%` }}
                                          title={`${d.bps.toFixed(2)} bps ($${d.price.toFixed(2)}): ${displayQty.toFixed(4)}${orderBookCumulative ? ' (cum)' : ''}`}
                                        />
                                      );
                                    })}
                                    {/* Center gap */}
                                    <div className="w-1 h-full bg-border" />
                                    {/* Asks (sorted so lowest ask is near center) */}
                                    {cumulativeAsks.map((d, i) => {
                                      const displayQty = orderBookCumulative ? d.cumQty : d.qty;
                                      const height = maxQty > 0 ? (displayQty / maxQty) * 100 : 0;
                                      return (
                                        <div
                                          key={`ask-${i}`}
                                          className="flex-1 bg-red-500/70 transition-all"
                                          style={{ height: `${Math.max(height, 2)}%` }}
                                          title={`+${d.bps.toFixed(2)} bps ($${d.price.toFixed(2)}): ${displayQty.toFixed(4)}${orderBookCumulative ? ' (cum)' : ''}`}
                                        />
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* X-axis labels - bps and price */}
                                <div className="flex text-xs text-muted-foreground mt-1">
                                  {/* Spacer for Y-axis */}
                                  <div className="w-16 pr-2" />
                                  {/* X-axis content */}
                                  <div className="flex-1 flex justify-between">
                                    <div className="text-left">
                                      <div>-{chartRange.toFixed(1)} bps</div>
                                      <div className="text-green-500">{(midPrice * (1 - chartRange / 10000)).toFixed(priceDecimals)}</div>
                                    </div>
                                    <div className="text-center">
                                      <div>0</div>
                                      <div>{midPrice.toFixed(priceDecimals)}</div>
                                    </div>
                                    <div className="text-right">
                                      <div>+{chartRange.toFixed(1)} bps</div>
                                      <div className="text-red-500">{(midPrice * (1 + chartRange / 10000)).toFixed(priceDecimals)}</div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Right: Order Book Table (Asks above Bids) */}
                              <div className="w-64 flex flex-col text-xs font-mono overflow-auto">
                                {/* Asks (reversed so lowest ask is at bottom, near spread) */}
                                <div className="flex-1 flex flex-col justify-end">
                                  <div className="grid grid-cols-2 text-muted-foreground border-b border-border pb-1 mb-1">
                                    <span>Price</span>
                                    <span className="text-right">Size</span>
                                  </div>
                                  {[...parsedAsks].slice(0, 10).reverse().map((a, i) => (
                                    <div key={i} className="grid grid-cols-2 py-0.5">
                                      <span className="text-red-500">{a.price.toFixed(priceDecimals)}</span>
                                      <span className="text-right">{a.qty.toFixed(4)}</span>
                                    </div>
                                  ))}
                                </div>

                                {/* Spread / Mid Price */}
                                <div className="py-2 text-center border-y border-border my-1">
                                  <span className="text-muted-foreground">Spread: </span>
                                  <span>{((bestAsk - bestBid) / midPrice * 10000).toFixed(2)} bps</span>
                                </div>

                                {/* Bids */}
                                <div className="flex-1">
                                  {parsedBids.slice(0, 10).map((b, i) => (
                                    <div key={i} className="grid grid-cols-2 py-0.5">
                                      <span className="text-green-500">{b.price.toFixed(priceDecimals)}</span>
                                      <span className="text-right">{b.qty.toFixed(4)}</span>
                                    </div>
                                  ))}
                                </div>

                                {/* Totals */}
                                <div className="border-t border-border pt-1 mt-1 grid grid-cols-2 text-muted-foreground">
                                  <span className="text-green-500">{totalBids.toFixed(2)}</span>
                                  <span className="text-right text-red-500">{totalAsks.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {!orderBook && !loadingOrderBook && (
                          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                            No order book data
                          </div>
                        )}

                        {loadingOrderBook && (
                          <div className="flex items-center justify-center h-32">
                            <Loader2 className="animate-spin text-primary" size={24} />
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>

                  {/* Chart Tab */}
                  <TabsContent value="chart" className="flex-1 m-0 min-h-0 overflow-hidden relative">
                    {loadingCandles && (
                      <div className="absolute inset-0 z-10 flex flex-col gap-2 p-4 bg-background/80">
                        <Skeleton className="flex-1 w-full" />
                      </div>
                    )}
                    {!selectedPair ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        Select a trading pair
                      </div>
                    ) : chartError ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                        {chartError}
                      </div>
                    ) : candles.length === 0 && !loadingCandles ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                        No candle data
                      </div>
                    ) : (
                      <CandlestickChart
                        candles={candles}
                        emptyMessage="No candle data available"
                        priceLines={chartPriceLines}
                        timezone={timezone}
                        onPriceLineChange={(id, newPrice) => {
                          if (id === 'start') setGridStartPrice(newPrice.toFixed(2));
                          else if (id === 'end') setGridEndPrice(newPrice.toFixed(2));
                          else if (id === 'limit') setGridLimitPrice(newPrice.toFixed(2));
                        }}
                      />
                    )}
                  </TabsContent>

                                  </Tabs>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Actions Panel */}
            <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
              <div className="h-full px-6 py-4 overflow-y-auto">
                {selectedConnector && !connectedConnectors.includes(selectedConnector) ? (
                  <Empty className="h-full">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Key size={24} className="text-muted-foreground" />
                      </EmptyMedia>
                      <EmptyTitle>No Keys Connected</EmptyTitle>
                      <EmptyDescription>
                        Connect your {formatConnectorName(selectedConnector)} API keys to start trading.
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button onClick={() => navigate('/keys')}>
                        <Key size={16} className="mr-2" />
                        Manage Keys
                      </Button>
                    </EmptyContent>
                  </Empty>
                ) : (
                  <>
                {/* Leverage and Position Mode settings (perp only) */}
                {isPerp && (
                  <div className="flex gap-2 mb-4">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button size="lg" className="flex-1 justify-center font-medium bg-accent text-accent-foreground hover:bg-accent/80 border border-border">
                          {settingLeverage ? <Loader2 className="animate-spin" size={16} /> : `${leverage}x`}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64" align="center">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Leverage</span>
                            <span className="text-sm font-mono font-bold">{leverage}x</span>
                          </div>
                          <Slider
                            value={[leverage]}
                            onValueChange={(v) => setLeverage(v[0])}
                            onValueCommit={(v) => handleSetLeverage(v[0])}
                            min={1}
                            max={20}
                            step={1}
                            className="w-full"
                            disabled={settingLeverage}
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>1x</span>
                            <span>10x</span>
                            <span>20x</span>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button size="lg" className="flex-1 justify-center font-medium bg-accent text-accent-foreground hover:bg-accent/80 border border-border">
                          {togglingPositionMode ? <Loader2 className="animate-spin" size={16} /> : positionMode}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48" align="center">
                        <div className="space-y-2">
                          <div className="text-sm font-medium mb-3">Position Mode</div>
                          <Button
                            variant={positionMode === 'ONEWAY' ? 'default' : 'outline'}
                            className="w-full justify-center"
                            onClick={() => handleSetPositionMode('ONEWAY')}
                            disabled={togglingPositionMode}
                          >
                            ONEWAY
                          </Button>
                          <Button
                            variant={positionMode === 'HEDGE' ? 'default' : 'outline'}
                            className="w-full justify-center"
                            onClick={() => handleSetPositionMode('HEDGE')}
                            disabled={togglingPositionMode}
                          >
                            HEDGE
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                <Tabs value={actionTab} onValueChange={(v) => setActionTab(v as 'trade' | 'grid')}>
                  <TabsList className="w-full bg-background border p-1 mb-4">
                    <TabsTrigger value="trade" className="flex-1 gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <Activity size={14} />
                      Trade
                    </TabsTrigger>
                    <TabsTrigger value="grid" className="flex-1 gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <Grid3X3 size={14} />
                      Grid Bot
                    </TabsTrigger>
                  </TabsList>

                  {/* Trade Tab */}
                  <TabsContent value="trade" className="space-y-3 mt-0">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Order Type</Label>
                      <Select value={tradeType} onValueChange={(v) => setTradeType(v as 'limit' | 'market')}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="limit">Limit</SelectItem>
                          <SelectItem value="market">Market</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {tradeType === 'limit' && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Price</Label>
                        <Input
                          type="text"
                          value={tradePrice}
                          onChange={(e) => setTradePrice(e.target.value)}
                          placeholder="0.00"
                          className="h-8 text-sm"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label className="text-xs">Amount (USD)</Label>
                      <Input
                        type="text"
                        value={tradeAmount}
                        onChange={(e) => setTradeAmount(e.target.value)}
                        placeholder="100"
                        className="h-8 text-sm"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        disabled={!selectedPair || placingOrder}
                        size="sm"
                        onClick={() => handlePlaceOrder('BUY')}
                      >
                        {placingOrder ? <Loader2 className="animate-spin" size={14} /> : 'Buy'}
                      </Button>
                      <Button
                        className="flex-1 bg-red-600 hover:bg-red-700"
                        disabled={!selectedPair || placingOrder}
                        size="sm"
                        onClick={() => handlePlaceOrder('SELL')}
                      >
                        {placingOrder ? <Loader2 className="animate-spin" size={14} /> : 'Sell'}
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Grid Bot Tab */}
                  <TabsContent value="grid" className="space-y-3 mt-0">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Side</Label>
                      <Select value={gridSide} onValueChange={(v) => setGridSide(v as 'BUY' | 'SELL')}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BUY">Long (BUY)</SelectItem>
                          <SelectItem value="SELL">Short (SELL)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-green-500">Start</Label>
                        <Input
                          type="text"
                          value={gridStartPrice}
                          onChange={(e) => setGridStartPrice(e.target.value)}
                          placeholder="0.00"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-blue-500">End</Label>
                        <Input
                          type="text"
                          value={gridEndPrice}
                          onChange={(e) => setGridEndPrice(e.target.value)}
                          placeholder="0.00"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-red-500">Limit</Label>
                        <Input
                          type="text"
                          value={gridLimitPrice}
                          onChange={(e) => setGridLimitPrice(e.target.value)}
                          placeholder="0.00"
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Amount (USD)</Label>
                      <Input
                        type="text"
                        value={gridAmount}
                        onChange={(e) => setGridAmount(e.target.value)}
                        placeholder="1000"
                        className="h-8 text-sm"
                      />
                    </div>

                    {/* Advanced Settings Popover */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full gap-2">
                          <Settings size={14} />
                          Advanced Settings
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64" align="start">
                        <div className="space-y-3">
                          <h4 className="font-medium text-sm">Grid Parameters</h4>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Min Spread</Label>
                            <Input
                              type="text"
                              value={gridMinSpread}
                              onChange={(e) => setGridMinSpread(e.target.value)}
                              placeholder="0.001"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Max Open Orders</Label>
                            <Input
                              type="number"
                              value={gridMaxOrders}
                              onChange={(e) => setGridMaxOrders(parseInt(e.target.value) || 2)}
                              min={1}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Take Profit</Label>
                            <Input
                              type="text"
                              value={gridTakeProfit}
                              onChange={(e) => setGridTakeProfit(e.target.value)}
                              placeholder="0.001"
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>

                    <Button
                      className="w-full gap-2"
                      disabled={!selectedPair || deploying}
                      onClick={handleDeployGrid}
                    >
                      {deploying ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <Rocket size={16} />
                      )}
                      Deploy Grid Bot
                    </Button>
                  </TabsContent>
                </Tabs>
                  </>
                )}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Bottom Section - Tabs */}
        <ResizablePanel defaultSize={40} minSize={20}>
          <div className="h-full px-6 py-4 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="animate-spin text-primary" size={24} />
              </div>
            ) : (
              <Tabs defaultValue="balances" className="h-full">
          <TabsList className="bg-background gap-1 border p-1">
            <TabsTrigger
              value="balances"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Balances
            </TabsTrigger>
            <TabsTrigger
              value="orders"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Orders ({activeOrders?.data.length ?? 0})
            </TabsTrigger>
            <TabsTrigger
              value="trades"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Trades
            </TabsTrigger>
            {isPerp && (
              <TabsTrigger
                value="positions"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Positions ({positions?.data.length ?? 0})
              </TabsTrigger>
            )}
          </TabsList>

          {/* Balances Tab */}
          <TabsContent value="balances">
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
                        <tr key={balance.token} className="border-b border-border hover:bg-muted/30">
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
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            {!activeOrders || activeOrders.data.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No active orders</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Time</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Type</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Pair</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Direction</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">Size</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">Original Size</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">Order Value</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">Price</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeOrders.data.map((order: Record<string, unknown>, i: number) => {
                      const orderId = String(order.order_id || order.client_order_id || '');
                      const connectorName = String(order.connector_name || selectedConnector || '');
                      const pair = String(order.trading_pair || order.symbol || '-');
                      const tradeType = String(order.trade_type || order.side || '').toUpperCase();
                      const orderType = String(order.order_type || 'LIMIT');
                      const amount = Number(order.amount || order.quantity || 0);
                      const filledAmount = Number(order.filled_amount || order.filled || order.executed_quantity || 0);
                      const price = Number(order.price || 0);
                      const orderValue = amount * price;
                      const isLong = tradeType === 'BUY';
                      const createdAt = order.created_at || order.updated_at;
                      const timeStr = createdAt
                        ? new Date(String(createdAt)).toLocaleString('en-US', {
                            month: 'numeric',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: false,
                          }).replace(',', ' -')
                        : '-';

                      return (
                        <tr key={i} className="border-b border-border hover:bg-muted/30">
                          <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">{timeStr}</td>
                          <td className="py-2 px-3">{orderType.charAt(0) + orderType.slice(1).toLowerCase()}</td>
                          <td className="py-2 px-3 font-semibold">{pair}</td>
                          <td className={`py-2 px-3 ${isLong ? 'text-green-500' : 'text-red-500'}`}>
                            {isLong ? 'Long' : 'Short'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono">{filledAmount.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-mono">{amount.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-mono">{orderValue.toFixed(2)} USD</td>
                          <td className="py-2 px-3 text-right font-mono">{price.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                              onClick={() => handleCancelOrder(orderId, connectorName)}
                              disabled={cancellingOrderId === orderId}
                            >
                              {cancellingOrderId === orderId ? (
                                <Loader2 className="animate-spin" size={14} />
                              ) : (
                                'Cancel'
                              )}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* Trades Tab */}
          <TabsContent value="trades">
            {!trades || trades.data.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No trades found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Time</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Pair</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Side</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">Price</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.data.slice(0, 20).map((trade: Record<string, unknown>, i: number) => (
                      <tr key={i} className="border-b border-border hover:bg-muted/30">
                        <td className="py-2 px-3 text-muted-foreground">
                          {trade.timestamp ? new Date(Number(trade.timestamp)).toLocaleString() : '-'}
                        </td>
                        <td className="py-2 px-3 font-medium text-foreground">{String(trade.trading_pair || trade.symbol || '-')}</td>
                        <td className="py-2 px-3">
                          <Badge variant={String(trade.side).toLowerCase() === 'buy' ? 'default' : 'secondary'}>
                            {String(trade.side || '-')}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-right font-mono">{Number(trade.price || 0).toFixed(4)}</td>
                        <td className="py-2 px-3 text-right font-mono">{Number(trade.amount || trade.quantity || 0).toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* Positions Tab (Perpetual only) */}
          {isPerp && (
            <TabsContent value="positions">
              {!positions || positions.data.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No open positions</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 text-muted-foreground font-medium">Coin</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium">Size</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium">Position Value</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium">Entry Price</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium">Mark Price</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium">PNL (ROE %)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.data.map((pos: Record<string, unknown>, i: number) => {
                        const pair = String(pos.trading_pair || pos.symbol || '-');
                        const baseSymbol = pair.split('-')[0];
                        const side = String(pos.side || '').toUpperCase();
                        const amount = Number(pos.amount || pos.size || 0);
                        const entryPrice = Number(pos.entry_price || 0);
                        const posLeverage = Number(pos.leverage || 1);
                        const pnl = Number(pos.unrealized_pnl || 0);
                        const markPrice = fundingInfo?.mark_price || currentPrice || entryPrice;
                        const positionValue = Math.abs(amount) * markPrice;
                        const initialMargin = positionValue / posLeverage;
                        const roe = initialMargin > 0 ? (pnl / initialMargin) * 100 : 0;
                        const isLong = side === 'LONG';

                        return (
                          <tr key={i} className="border-b border-border hover:bg-muted/30">
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <span className={`w-1 h-6 rounded ${isLong ? 'bg-green-500' : 'bg-red-500'}`} />
                                <span className="font-semibold">{baseSymbol}</span>
                                <span className="text-muted-foreground text-xs">{posLeverage}x</span>
                              </div>
                            </td>
                            <td className="py-2 px-3 text-right font-mono">
                              {Math.abs(amount).toFixed(2)} {baseSymbol}
                            </td>
                            <td className="py-2 px-3 text-right font-mono">
                              {positionValue.toFixed(2)} USD
                            </td>
                            <td className="py-2 px-3 text-right font-mono">
                              {entryPrice.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono">
                              {markPrice.toFixed(2)}
                            </td>
                            <td className={`py-2 px-3 text-right font-mono ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} ({roe >= 0 ? '+' : ''}{roe.toFixed(1)}%)
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          )}
              </Tabs>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
