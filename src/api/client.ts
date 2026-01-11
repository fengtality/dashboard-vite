import { config, getAuthHeader } from '../config';

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Authorization: getAuthHeader(),
    ...options.headers,
  };

  const response = await fetch(`${config.api.baseUrl}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Connectors Router
export interface TradingRule {
  min_order_size: number;
  max_order_size: number;
  min_price_increment: number;
  min_base_amount_increment: number;
  min_quote_amount_increment: number;
  min_notional_size: number;
  min_order_value: number;
  max_price_significant_digits: number;
  supports_limit_orders: boolean;
  supports_market_orders: boolean;
  buy_order_collateral_token?: string;
  sell_order_collateral_token?: string;
}

export const connectors = {
  list: () => request<string[]>('/connectors/'),
  getConfigMap: (connectorName: string) =>
    request<string[]>(`/connectors/${connectorName}/config-map`),
  getAllTradingRules: (connectorName: string) =>
    request<Record<string, TradingRule>>(`/connectors/${connectorName}/trading-rules`),
  getTradingRules: (connectorName: string, tradingPair: string) =>
    request<Record<string, TradingRule>>(
      `/connectors/${connectorName}/trading-rules?trading_pair=${tradingPair}`
    ),
  getOrderTypes: (connectorName: string) =>
    request<string[]>(`/connectors/${connectorName}/order-types`),
};

// Accounts Router
export const accounts = {
  list: () => request<string[]>('/accounts/'),
  getCredentials: (accountName: string) =>
    request<string[]>(`/accounts/${accountName}/credentials`),
  getBalances: (accountName: string) =>
    request<Record<string, Array<{ asset: string; available: number; total: number }>>>(
      `/accounts/${accountName}/balances`
    ),
  addAccount: (accountName: string) =>
    request<unknown>(`/accounts/add-account?account_name=${accountName}`, {
      method: 'POST',
    }),
  deleteAccount: (accountName: string) =>
    request<unknown>(`/accounts/delete-account?account_name=${accountName}`, {
      method: 'POST',
    }),
  addCredential: (
    accountName: string,
    connectorName: string,
    credentials: Record<string, string>
  ) =>
    request<unknown>(
      `/accounts/add-credential/${accountName}/${connectorName}`,
      {
        method: 'POST',
        body: JSON.stringify(credentials),
      }
    ),
  deleteCredential: (accountName: string, connectorName: string) =>
    request<unknown>(
      `/accounts/delete-credential/${accountName}/${connectorName}`,
      { method: 'POST' }
    ),
};

// Controllers Router
export interface ControllerConfig {
  id: string;
  controller_name: string;
  controller_type: string;
  [key: string]: unknown;
}

export const controllers = {
  list: () => request<Record<string, string[]>>('/controllers/'),
  listConfigs: () => request<ControllerConfig[]>('/controllers/configs/'),
  getConfig: (configName: string) =>
    request<ControllerConfig>(`/controllers/configs/${configName}`),
  createOrUpdateConfig: (configName: string, config: Record<string, unknown>) =>
    request<unknown>(`/controllers/configs/${configName}`, {
      method: 'POST',
      body: JSON.stringify(config),
    }),
  deleteConfig: (configName: string) =>
    request<unknown>(`/controllers/configs/${configName}`, { method: 'DELETE' }),
  getController: (controllerType: string, controllerName: string) =>
    request<Record<string, unknown>>(
      `/controllers/${controllerType}/${controllerName}`
    ),
  getConfigTemplate: (controllerType: string, controllerName: string) =>
    request<Record<string, unknown>>(
      `/controllers/${controllerType}/${controllerName}/config/template`
    ),
  validateConfig: (
    controllerType: string,
    controllerName: string,
    config: Record<string, unknown>
  ) =>
    request<unknown>(
      `/controllers/${controllerType}/${controllerName}/config/validate`,
      {
        method: 'POST',
        body: JSON.stringify(config),
      }
    ),
  getBotConfigs: (botName: string) =>
    request<Record<string, unknown>[]>(`/controllers/bots/${botName}/configs`),
  updateBotConfig: (botName: string, controllerName: string, config: Record<string, unknown>) =>
    request<unknown>(`/controllers/bots/${botName}/${controllerName}/config`, {
      method: 'POST',
      body: JSON.stringify(config),
    }),
};

// Scripts Router
export interface ScriptConfig {
  id: string;
  script_name: string;
  [key: string]: unknown;
}

export const scripts = {
  // List available scripts
  list: () => request<string[]>('/scripts/'),

  // List script configs
  listConfigs: () => request<ScriptConfig[]>('/scripts/configs/'),

  // Get a specific script config
  getConfig: (configName: string) =>
    request<ScriptConfig>(`/scripts/configs/${configName}`),

  // Create or update a script config
  createOrUpdateConfig: (configName: string, config: Record<string, unknown>) =>
    request<unknown>(`/scripts/configs/${configName}`, {
      method: 'POST',
      body: JSON.stringify(config),
    }),

  // Delete a script config
  deleteConfig: (configName: string) =>
    request<unknown>(`/scripts/configs/${configName}`, { method: 'DELETE' }),

  // Get script details
  getScript: (scriptName: string) =>
    request<Record<string, unknown>>(`/scripts/${scriptName}`),

  // Create or update a script
  createOrUpdateScript: (scriptName: string, script: Record<string, unknown>) =>
    request<unknown>(`/scripts/${scriptName}`, {
      method: 'POST',
      body: JSON.stringify(script),
    }),

  // Delete a script
  deleteScript: (scriptName: string) =>
    request<unknown>(`/scripts/${scriptName}`, { method: 'DELETE' }),

  // Get script config template
  getConfigTemplate: (scriptName: string) =>
    request<Record<string, unknown>>(`/scripts/${scriptName}/config/template`),
};

// Bot Orchestration Router
export interface BotStatus {
  bot_name: string;
  status: string;
  [key: string]: unknown;
}

export interface V2ControllerDeployment {
  instance_name: string;
  credentials_profile: string;
  controllers_config: string[];
  image?: string;
  max_global_drawdown_quote?: number;
  max_controller_drawdown_quote?: number;
  headless?: boolean;
}

export interface V2ScriptDeployment {
  instance_name: string;
  credentials_profile: string;
  script?: string;
  script_config?: string;
  image?: string;
  headless?: boolean;
}

export interface StartBotRequest {
  bot_name: string;
  log_level?: string;
  script?: string;
  conf?: string;
  async_backend?: boolean;
}

export interface StopBotRequest {
  bot_name: string;
  skip_order_cancellation?: boolean;
  async_backend?: boolean;
}

export interface StopAndArchiveOptions {
  skip_order_cancellation?: boolean;
  archive_locally?: boolean;
  s3_bucket?: string;
}

export interface BotHistoryOptions {
  days?: number;
  verbose?: boolean;
  precision?: number;
  timeout?: number;
}

export interface BotRunsFilter {
  bot_name?: string;
  account_name?: string;
  strategy_type?: string;
  strategy_name?: string;
  run_status?: string;
  deployment_status?: string;
  limit?: number;
  offset?: number;
}

export const bots = {
  getStatus: async () => {
    const response = await request<{ status: string; data: Record<string, BotStatus> }>('/bot-orchestration/status');
    return response.data || {};
  },
  getBotStatus: (botName: string) =>
    request<BotStatus>(`/bot-orchestration/${botName}/status`),
  getBotHistory: (botName: string, options?: BotHistoryOptions) => {
    const params = new URLSearchParams();
    if (options?.days !== undefined) params.append('days', options.days.toString());
    if (options?.verbose !== undefined) params.append('verbose', options.verbose.toString());
    if (options?.precision !== undefined) params.append('precision', options.precision.toString());
    if (options?.timeout !== undefined) params.append('timeout', options.timeout.toString());
    const queryString = params.toString();
    return request<unknown[]>(`/bot-orchestration/${botName}/history${queryString ? `?${queryString}` : ''}`);
  },
  getMqttStatus: () =>
    request<Record<string, unknown>>('/bot-orchestration/mqtt'),
  startBot: (config: StartBotRequest) =>
    request<unknown>('/bot-orchestration/start-bot', {
      method: 'POST',
      body: JSON.stringify(config),
    }),
  stopBot: (config: StopBotRequest) =>
    request<unknown>('/bot-orchestration/stop-bot', {
      method: 'POST',
      body: JSON.stringify(config),
    }),
  stopAndArchive: (botName: string, options?: StopAndArchiveOptions) => {
    const params = new URLSearchParams();
    // Default to skip_order_cancellation=true, archive_locally=true (same as Condor)
    params.append('skip_order_cancellation', (options?.skip_order_cancellation ?? true).toString());
    params.append('archive_locally', (options?.archive_locally ?? true).toString());
    if (options?.s3_bucket) params.append('s3_bucket', options.s3_bucket);
    return request<unknown>(`/bot-orchestration/stop-and-archive-bot/${botName}?${params.toString()}`, {
      method: 'POST',
    });
  },
  restartBot: async (botName: string, skipOrderCancellation: boolean = false) => {
    // Stop the bot first
    const stopResult = await bots.stopBot({
      bot_name: botName,
      skip_order_cancellation: skipOrderCancellation
    });
    // Then start it again
    const startResult = await bots.startBot({ bot_name: botName });
    return { stopResult, startResult };
  },
  deployV2Controllers: (config: V2ControllerDeployment) =>
    request<unknown>('/bot-orchestration/deploy-v2-controllers', {
      method: 'POST',
      body: JSON.stringify(config),
    }),
  deployV2Script: (config: V2ScriptDeployment) =>
    request<unknown>('/bot-orchestration/deploy-v2-script', {
      method: 'POST',
      body: JSON.stringify(config),
    }),
  getBotRuns: (filter?: BotRunsFilter) => {
    const params = new URLSearchParams();
    if (filter?.bot_name) params.append('bot_name', filter.bot_name);
    if (filter?.account_name) params.append('account_name', filter.account_name);
    if (filter?.strategy_type) params.append('strategy_type', filter.strategy_type);
    if (filter?.strategy_name) params.append('strategy_name', filter.strategy_name);
    if (filter?.run_status) params.append('run_status', filter.run_status);
    if (filter?.deployment_status) params.append('deployment_status', filter.deployment_status);
    if (filter?.limit !== undefined) params.append('limit', filter.limit.toString());
    if (filter?.offset !== undefined) params.append('offset', filter.offset.toString());
    const queryString = params.toString();
    return request<unknown[]>(`/bot-orchestration/bot-runs${queryString ? `?${queryString}` : ''}`);
  },
  getBotRunById: (botRunId: number) =>
    request<Record<string, unknown>>(`/bot-orchestration/bot-runs/${botRunId}`),
  getBotRunStats: () =>
    request<Record<string, unknown>>('/bot-orchestration/bot-runs/stats'),
};

// Archived Bots Router
export interface ArchivedBot {
  db_path: string;
  [key: string]: unknown;
}

export interface PerformanceData {
  total_pnl: number;
  total_volume: number;
  [key: string]: unknown;
}

export const archivedBots = {
  list: () => request<ArchivedBot[]>('/archived-bots/'),
  getStatus: (dbPath: string) =>
    request<Record<string, unknown>>(`/archived-bots/${encodeURIComponent(dbPath)}/status`),
  getSummary: (dbPath: string) =>
    request<Record<string, unknown>>(`/archived-bots/${encodeURIComponent(dbPath)}/summary`),
  getPerformance: (dbPath: string) =>
    request<PerformanceData>(`/archived-bots/${encodeURIComponent(dbPath)}/performance`),
  getTrades: (dbPath: string) =>
    request<unknown[]>(`/archived-bots/${encodeURIComponent(dbPath)}/trades`),
  getOrders: (dbPath: string) =>
    request<unknown[]>(`/archived-bots/${encodeURIComponent(dbPath)}/orders`),
  getExecutors: (dbPath: string) =>
    request<unknown[]>(`/archived-bots/${encodeURIComponent(dbPath)}/executors`),
  getPositions: (dbPath: string) =>
    request<unknown[]>(`/archived-bots/${encodeURIComponent(dbPath)}/positions`),
  getControllers: (dbPath: string) =>
    request<unknown[]>(`/archived-bots/${encodeURIComponent(dbPath)}/controllers`),
};

// Docker Router
export const docker = {
  isRunning: () => request<{ is_running: boolean }>('/docker/running'),
  getAvailableImages: (imageName?: string) =>
    request<string[]>(
      `/docker/available-images/${imageName ? `?image_name=${imageName}` : ''}`
    ),
  getActiveContainers: () =>
    request<unknown[]>('/docker/active-containers'),
  getExitedContainers: () =>
    request<unknown[]>('/docker/exited-containers'),
};

// Portfolio Router
export interface PortfolioBalance {
  token: string;
  units: number;
  price: number;
  value: number;
  available_units: number;
}

export interface PortfolioState {
  [accountName: string]: {
    [connectorName: string]: PortfolioBalance[];
  };
}

export const portfolio = {
  getState: (accountNames: string[], connectorNames: string[]) =>
    request<PortfolioState>('/portfolio/state', {
      method: 'POST',
      body: JSON.stringify({
        account_names: accountNames,
        connector_names: connectorNames,
      }),
    }),
};

// Trading Router
export interface PaginatedResponse<T = Record<string, unknown>> {
  data: T[];
  pagination: {
    has_more: boolean;
    limit: number;
    next_cursor?: string;
    total_count?: number;
  };
}

export interface BaseFilterRequest {
  limit?: number;
  cursor?: string;
  account_names?: string[];
  connector_names?: string[];
}

export interface TimeRangeFilterRequest extends BaseFilterRequest {
  start_time?: number; // Unix timestamp in milliseconds
  end_time?: number;
}

export interface ActiveOrderFilterRequest extends BaseFilterRequest {
  trading_pairs?: string[];
}

export interface OrderFilterRequest extends TimeRangeFilterRequest {
  trading_pairs?: string[];
}

export interface TradeFilterRequest extends TimeRangeFilterRequest {
  trading_pairs?: string[];
}

export interface PositionFilterRequest extends BaseFilterRequest {}

export interface FundingPaymentFilterRequest extends TimeRangeFilterRequest {}

export interface TradeRequest {
  account_name: string;
  connector_name: string;
  trading_pair: string;
  trade_type: 'BUY' | 'SELL';
  order_type: 'LIMIT' | 'MARKET';
  amount: number;
  price?: number;
  position_action?: 'OPEN' | 'CLOSE';
}

export interface TradeResponse {
  order_id: string;
  [key: string]: unknown;
}

export const trading = {
  // Place a new order
  placeOrder: (tradeRequest: TradeRequest) =>
    request<TradeResponse>('/trading/orders', {
      method: 'POST',
      body: JSON.stringify(tradeRequest),
    }),

  // Cancel an order
  cancelOrder: (accountName: string, connectorName: string, clientOrderId: string) =>
    request<unknown>(
      `/trading/${accountName}/${connectorName}/orders/${clientOrderId}/cancel`,
      { method: 'POST' }
    ),

  // Get active (in-flight) orders
  getActiveOrders: (filter: ActiveOrderFilterRequest = {}) =>
    request<PaginatedResponse>('/trading/orders/active', {
      method: 'POST',
      body: JSON.stringify(filter),
    }),

  // Get historical orders
  getOrders: (filter: OrderFilterRequest = {}) =>
    request<PaginatedResponse>('/trading/orders/search', {
      method: 'POST',
      body: JSON.stringify(filter),
    }),

  // Get positions (perpetual only)
  getPositions: (filter: PositionFilterRequest = {}) =>
    request<PaginatedResponse>('/trading/positions', {
      method: 'POST',
      body: JSON.stringify(filter),
    }),

  // Get trade history
  getTrades: (filter: TradeFilterRequest = {}) =>
    request<PaginatedResponse>('/trading/trades', {
      method: 'POST',
      body: JSON.stringify(filter),
    }),

  // Get funding payments (perpetual only)
  getFundingPayments: (filter: FundingPaymentFilterRequest = {}) =>
    request<PaginatedResponse>('/trading/funding-payments', {
      method: 'POST',
      body: JSON.stringify(filter),
    }),

  // Get position mode (perpetual only)
  getPositionMode: (accountName: string, connectorName: string) =>
    request<Record<string, unknown>>(
      `/trading/${accountName}/${connectorName}/position-mode`
    ),

  // Set position mode (perpetual only)
  setPositionMode: (accountName: string, connectorName: string, mode: string) =>
    request<unknown>(
      `/trading/${accountName}/${connectorName}/position-mode`,
      {
        method: 'POST',
        body: JSON.stringify({ position_mode: mode }),
      }
    ),

  // Set leverage (perpetual only)
  setLeverage: (
    accountName: string,
    connectorName: string,
    tradingPair: string,
    leverage: number
  ) =>
    request<unknown>(
      `/trading/${accountName}/${connectorName}/leverage`,
      {
        method: 'POST',
        body: JSON.stringify({ trading_pair: tradingPair, leverage }),
      }
    ),
};

// Market Data Router
export interface CandlesRequest {
  connector_name: string;
  trading_pair: string;
  interval?: string;
  max_records?: number;
}

export interface HistoricalCandlesRequest {
  connector_name: string;
  trading_pair: string;
  interval: string;
  start_time: number;
  end_time: number;
}

export interface OrderBookRequest {
  connector_name: string;
  trading_pair: string;
  depth?: number;
}

export interface OrderBookResponse {
  bids: Array<[number, number]>;
  asks: Array<[number, number]>;
  timestamp?: number;
}

export interface PriceRequest {
  connector_name: string;
  trading_pairs: string[];
}

export interface PricesResponse {
  prices: Record<string, number>;
}

export interface FundingInfoRequest {
  connector_name: string;
  trading_pair: string;
}

export interface FundingInfoResponse {
  trading_pair: string;
  index_price: number;
  mark_price: number;
  next_funding_utc_timestamp: number;
  rate: number;
  [key: string]: unknown;
}

export interface VolumeRequest {
  connector_name: string;
  trading_pair: string;
  volume: number;
  side: 'buy' | 'sell';
}

export interface OrderBookQueryResult {
  connector_name: string;
  trading_pair: string;
  side: string;
  result_price?: number;
  result_volume?: number;
  [key: string]: unknown;
}

export const marketData = {
  // Get real-time candles
  getCandles: (config: CandlesRequest) =>
    request<unknown>('/market-data/candles', {
      method: 'POST',
      body: JSON.stringify(config),
    }),

  // Get historical candles
  getHistoricalCandles: (config: HistoricalCandlesRequest) =>
    request<unknown>('/market-data/historical-candles', {
      method: 'POST',
      body: JSON.stringify(config),
    }),

  // Get order book snapshot
  getOrderBook: (req: OrderBookRequest) =>
    request<OrderBookResponse>('/market-data/order-book', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  // Get prices for trading pairs
  getPrices: (req: PriceRequest) =>
    request<PricesResponse>('/market-data/prices', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  // Get funding info (perpetual only)
  getFundingInfo: (req: FundingInfoRequest) =>
    request<FundingInfoResponse>('/market-data/funding-info', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  // Get active feeds
  getActiveFeeds: () =>
    request<Record<string, unknown>>('/market-data/active-feeds'),

  // Get available candle connectors
  getAvailableCandleConnectors: () =>
    request<string[]>('/market-data/available-candle-connectors'),

  // Get market data settings
  getSettings: () =>
    request<Record<string, unknown>>('/market-data/settings'),

  // Order book calculations
  getVwapForVolume: (req: VolumeRequest) =>
    request<OrderBookQueryResult>('/market-data/order-book/vwap-for-volume', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  getPriceForVolume: (req: VolumeRequest) =>
    request<OrderBookQueryResult>('/market-data/order-book/price-for-volume', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  getVolumeForPrice: (req: { connector_name: string; trading_pair: string; price: number; side: 'buy' | 'sell' }) =>
    request<OrderBookQueryResult>('/market-data/order-book/volume-for-price', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  getPriceForQuoteVolume: (req: VolumeRequest) =>
    request<OrderBookQueryResult>('/market-data/order-book/price-for-quote-volume', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  getQuoteVolumeForPrice: (req: { connector_name: string; trading_pair: string; price: number; side: 'buy' | 'sell' }) =>
    request<OrderBookQueryResult>('/market-data/order-book/quote-volume-for-price', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
};

// Gateway Router - Server Management
export interface GatewayStatus {
  status: string;
  gateway_version?: string;
  [key: string]: unknown;
}

export interface GatewayStartConfig {
  image?: string;
  port?: number;
  passphrase?: string;
  dev_mode?: boolean;
}

export interface GatewayNetwork {
  network_id: string;
  chain: string;
  network: string;
  nodeURL?: string;
  tokenSymbol?: string;
  nativeCurrencySymbol?: string;
  [key: string]: unknown;
}

export interface GatewayConnector {
  name: string;
  trading_types: string[];
  chain: string;
  networks: string[];
  [key: string]: unknown;
}

export interface GatewayWallet {
  chain: string;
  walletAddresses: string[];
}

export const gateway = {
  // Server management
  getStatus: () => request<GatewayStatus>('/gateway/status'),
  start: (config?: GatewayStartConfig) =>
    request<unknown>('/gateway/start', {
      method: 'POST',
      body: JSON.stringify(config || {}),
    }),
  stop: () => request<unknown>('/gateway/stop', { method: 'POST' }),
  restart: () => request<unknown>('/gateway/restart', { method: 'POST' }),
  getLogs: (tail?: number) =>
    request<{ logs: string[] }>(`/gateway/logs${tail ? `?tail=${tail}` : ''}`),

  // Network configuration
  listNetworks: () => request<{ networks: GatewayNetwork[] }>('/gateway/networks'),
  getNetworkConfig: (networkId: string) =>
    request<Record<string, unknown>>(`/gateway/networks/${networkId}/config`),
  updateNetworkConfig: (networkId: string, config: Record<string, unknown>) =>
    request<unknown>(`/gateway/networks/${networkId}/config`, {
      method: 'POST',
      body: JSON.stringify(config),
    }),
  getNetworkTokens: (networkId: string) =>
    request<{ tokens: Array<{ address: string; symbol: string; decimals: number; name?: string }> }>(
      `/gateway/networks/${networkId}/tokens`
    ),

  // Connector configuration
  listConnectors: () => request<{ connectors: GatewayConnector[] }>('/gateway/connectors'),
  getConnectorConfig: (connectorName: string) =>
    request<Record<string, unknown>>(`/gateway/connectors/${connectorName}/config`),
  updateConnectorConfig: (connectorName: string, config: Record<string, unknown>) =>
    request<unknown>(`/gateway/connectors/${connectorName}/config`, {
      method: 'POST',
      body: JSON.stringify(config),
    }),

  // Wallet management
  listWallets: () => request<GatewayWallet[]>('/gateway/wallets'),
  createWallet: (chain: string) =>
    request<{ address: string }>('/gateway/wallets', {
      method: 'POST',
      body: JSON.stringify({ chain }),
    }),
};

// Gateway Swap Router
export interface SwapQuoteRequest {
  connector: string;
  network: string;
  trading_pair: string;
  side: 'BUY' | 'SELL';
  amount: number;
  slippage_pct?: number;
}

export interface SwapQuote {
  price: number;
  amount_in: number;
  amount_out: number;
  gas_estimate?: number;
  [key: string]: unknown;
}

export interface SwapExecuteRequest extends SwapQuoteRequest {}

export interface SwapResult {
  tx_hash: string;
  status: string;
  [key: string]: unknown;
}

export interface SwapSearchRequest {
  limit?: number;
  offset?: number;
  trading_pair?: string;
  connector?: string;
  network?: string;
  status?: string;
}

export const gatewaySwap = {
  getQuote: (req: SwapQuoteRequest) =>
    request<SwapQuote>('/gateway/swap/quote', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
  execute: (req: SwapExecuteRequest) =>
    request<SwapResult>('/gateway/swap/execute', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
  getStatus: (txHash: string) =>
    request<SwapResult>(`/gateway/swap/status/${txHash}`),
  search: (req: SwapSearchRequest = {}) =>
    request<PaginatedResponse>('/gateway/swap/search', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
};

// Gateway CLMM Router (LP Positions)
export interface CLMMPosition {
  position_id: string;
  connector: string;
  network: string;
  pool_address: string;
  base_token: string;
  quote_token: string;
  lower_price: number;
  upper_price: number;
  current_price: number;
  liquidity: number;
  base_token_amount: number;
  quote_token_amount: number;
  in_range: 'IN_RANGE' | 'OUT_OF_RANGE';
  base_fee_pending: number;
  quote_fee_pending: number;
  base_fee_collected: number;
  quote_fee_collected: number;
  pnl_summary?: {
    total_pnl_quote: number;
    current_lp_value_quote: number;
    total_fees_value_quote: number;
    [key: string]: unknown;
  };
  status: 'OPEN' | 'CLOSED';
  opened_at: string;
  closed_at?: string;
  [key: string]: unknown;
}

export interface CLMMSearchRequest {
  limit?: number;
  offset?: number;
  status?: 'OPEN' | 'CLOSED';
  connector?: string;
  network?: string;
  refresh?: boolean;
}

export interface AddLiquidityRequest {
  connector: string;
  network: string;
  pool_address: string;
  base_token_amount?: number;
  quote_token_amount?: number;
  lower_price: number;
  upper_price: number;
  slippage_pct?: number;
}

export interface RemoveLiquidityRequest {
  connector: string;
  network: string;
  position_id: string;
  decrease_percent?: number;
  slippage_pct?: number;
}

export interface CollectFeesRequest {
  connector: string;
  network: string;
  position_id: string;
}

export const gatewayCLMM = {
  searchPositions: (req: CLMMSearchRequest = {}) =>
    request<PaginatedResponse<CLMMPosition>>('/gateway/clmm/positions/search', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
  getPosition: (positionId: string) =>
    request<CLMMPosition>(`/gateway/clmm/positions/${positionId}`),
  addLiquidity: (req: AddLiquidityRequest) =>
    request<{ tx_hash: string; position_id?: string }>('/gateway/clmm/add-liquidity', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
  removeLiquidity: (req: RemoveLiquidityRequest) =>
    request<{ tx_hash: string }>('/gateway/clmm/remove-liquidity', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
  collectFees: (req: CollectFeesRequest) =>
    request<{ tx_hash: string }>('/gateway/clmm/collect-fees', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
};

// Gateway AMM Router (for pool discovery)
export interface PoolInfo {
  address: string;
  connector: string;
  network: string;
  base_token: string;
  quote_token: string;
  fee_tier?: number;
  liquidity?: number;
  volume_24h?: number;
  [key: string]: unknown;
}

export const gatewayAMM = {
  getPools: (connector: string, network: string, tradingPair?: string) => {
    const params = new URLSearchParams({ connector, network });
    if (tradingPair) params.append('trading_pair', tradingPair);
    return request<{ pools: PoolInfo[] }>(`/gateway/amm/pools?${params}`);
  },
  getPoolInfo: (connector: string, network: string, poolAddress: string) =>
    request<PoolInfo>(`/gateway/amm/pool-info`, {
      method: 'POST',
      body: JSON.stringify({ connector, network, pool_address: poolAddress }),
    }),
};

export const api = {
  connectors,
  accounts,
  controllers,
  scripts,
  bots,
  archivedBots,
  docker,
  portfolio,
  trading,
  marketData,
  gateway,
  gatewaySwap,
  gatewayCLMM,
  gatewayAMM,
};

export default api;
