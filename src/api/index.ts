/**
 * Condor Dashboard API
 *
 * Unified facade for all API clients:
 * - gateway: Gateway client (via /api/gateway-proxy/*) for DEX operations
 * - hummingbot: Hummingbot API client (/api/*) for server management and DB operations
 *
 * All Gateway operations are routed through the Hummingbot API proxy.
 */

// Gateway client (routed through /api/gateway-proxy/*)
export { GatewayClient, gatewayClient } from './gateway';
export { getGatewayConfig, setGatewayConfig, resetGatewayConfig } from './gateway';
export { GatewayError, GatewayErrorCode } from './gateway';
export type { GatewayClientConfig } from './gateway';

// Re-export gateway types
export type {
  // Config types
  ChainConfig,
  ChainsResponse,
  ConnectorConfig,
  ConnectorsResponse,
  NamespacesResponse,
  ConfigUpdateRequest,
  ConfigUpdateResponse,

  // Chain types
  BalanceRequest,
  BalanceResponse,
  TokenInfo,
  TokensRequest,
  TokensResponse,
  StatusRequest,
  StatusResponse,
  PollRequest,
  PollResponse,
  EstimateGasRequest,
  EstimateGasResponse,

  // Pool types
  PoolType,
  PoolTemplate,
  PoolGeckoData,
  PoolInfo,
  PoolListRequest,
  FindPoolsRequest,
  PoolAddRequest,
  PoolSuccessResponse,

  // CLMM types
  BinLiquidity,
  CLMMPoolInfo,
  MeteoraPoolInfo,
  CLMMPositionInfo,
  GetPositionsOwnedRequest,
  GetPositionInfoRequest,
  GetPoolInfoRequest,
  OpenPositionRequest,
  OpenPositionResponse,
  AddLiquidityRequest,
  AddLiquidityResponse,
  RemoveLiquidityRequest,
  RemoveLiquidityResponse,
  CollectFeesRequest,
  CollectFeesResponse,
  ClosePositionRequest,
  ClosePositionResponse,
  QuotePositionRequest,
  QuotePositionResponse,

  // AMM types
  AMMPoolInfo,
  AMMPositionInfo,
  AMMAddLiquidityRequest,
  AMMAddLiquidityResponse,
  AMMRemoveLiquidityRequest,
  AMMRemoveLiquidityResponse,

  // Swap types
  TradeSide,
  TransactionStatus,
  QuoteSwapRequest,
  QuoteSwapResponse,
  ExecuteSwapRequest,
  ExecuteSwapResponse,
  RouterQuoteSwapRequest,
  RouterExecuteQuoteRequest,

  // Trading types
  TradingQuoteSwapRequest,
  TradingCollectFeesRequest,
  TradingClosePositionRequest,

  // UI helper types
  PositionWithConnector,
  ExtendedPoolInfo,
} from './gateway';

// Hummingbot API client (server management, CEX trading, DB operations)
export {
  // Namespace exports
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
  api as hummingbotApi,
  api as default,
} from './hummingbot-api';

// Re-export Hummingbot API types
export type {
  TradingRule,
  ControllerConfig,
  ScriptConfig,
  BotStatus,
  V2ControllerDeployment,
  V2ScriptDeployment,
  StartBotRequest,
  StopBotRequest,
  StopAndArchiveOptions,
  BotHistoryOptions,
  BotRunsFilter,
  ArchivedBot,
  PerformanceData,
  PortfolioBalance,
  PortfolioState,
  PaginatedResponse,
  BaseFilterRequest,
  TimeRangeFilterRequest,
  ActiveOrderFilterRequest,
  OrderFilterRequest,
  TradeFilterRequest,
  PositionFilterRequest,
  FundingPaymentFilterRequest,
  TradeRequest,
  TradeResponse,
  CandlesRequest,
  HistoricalCandlesRequest,
  OrderBookRequest,
  OrderBookResponse,
  PriceRequest,
  PricesResponse,
  FundingInfoRequest,
  FundingInfoResponse,
  VolumeRequest,
  OrderBookQueryResult,
  GatewayStatus,
  GatewayStartConfig,
  GatewayNetwork,
  GatewayConnector,
  GatewayWallet,
  SwapQuoteRequest,
  SwapQuote,
  SwapExecuteRequest,
  SwapResult,
  SwapSearchRequest,
  CLMMPosition,
  CLMMSearchRequest,
  AddLiquidityRequest as HummingbotAddLiquidityRequest,
  RemoveLiquidityRequest as HummingbotRemoveLiquidityRequest,
  CollectFeesRequest as HummingbotCollectFeesRequest,
  PoolInfo as HummingbotPoolInfo,
} from './hummingbot-api';

// Import both clients
import { gatewayClient } from './gateway';
import { api as hummingbotApi } from './hummingbot-api';

/**
 * Unified API facade
 *
 * Usage:
 * ```typescript
 * import { api } from '@/api';
 *
 * // Gateway operations (via /api/gateway-proxy/*)
 * const chains = await api.gateway.config.getChains();
 * const balances = await api.gateway.chains.getBalances('solana', { network: 'mainnet-beta', address: '...' });
 * const quote = await api.gateway.trading.quoteSwap({ ... });
 *
 * // Hummingbot API operations (server management, DB writes)
 * const status = await api.hummingbot.gateway.getStatus();
 * await api.hummingbot.gateway.start({ passphrase: '...' });
 * const positions = await api.hummingbot.gatewayCLMM.searchPositions({ status: 'OPEN' });
 * ```
 */
export const api = {
  /** Gateway client for DEX operations (routed through API proxy) */
  gateway: gatewayClient,

  /** Hummingbot API client for server management and DB operations */
  hummingbot: hummingbotApi,
};
