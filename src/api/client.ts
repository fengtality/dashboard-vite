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
export const connectors = {
  list: () => request<string[]>('/connectors/'),
  getConfigMap: (connectorName: string) =>
    request<string[]>(`/connectors/${connectorName}/config-map`),
  getTradingRules: (connectorName: string, tradingPair: string) =>
    request<Record<string, unknown>>(
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

export const bots = {
  getStatus: () => request<Record<string, BotStatus>>('/bot-orchestration/status'),
  getBotStatus: (botName: string) =>
    request<BotStatus>(`/bot-orchestration/${botName}/status`),
  getBotHistory: (botName: string) =>
    request<unknown[]>(`/bot-orchestration/${botName}/history`),
  getMqttStatus: () =>
    request<Record<string, unknown>>('/bot-orchestration/mqtt'),
  startBot: (botName: string) =>
    request<unknown>('/bot-orchestration/start-bot', {
      method: 'POST',
      body: JSON.stringify({ bot_name: botName }),
    }),
  stopBot: (botName: string) =>
    request<unknown>('/bot-orchestration/stop-bot', {
      method: 'POST',
      body: JSON.stringify({ bot_name: botName }),
    }),
  stopAndArchive: (botName: string) =>
    request<unknown>(`/bot-orchestration/stop-and-archive-bot/${botName}`, {
      method: 'POST',
    }),
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
  getBotRuns: () => request<unknown[]>('/bot-orchestration/bot-runs'),
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
  side: 'buy' | 'sell';
  order_type: string;
  amount: number;
  price?: number;
  [key: string]: unknown;
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
};

export default api;
