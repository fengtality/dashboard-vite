/**
 * Gateway API Type Definitions
 *
 * Types derived from Gateway backend schemas (~/gateway/src/schemas/).
 * These types mirror the Gateway backend to provide type safety for API calls.
 */

// ==================== Common Types ====================

export type TradeSide = 'BUY' | 'SELL';

export const TransactionStatus = {
  PENDING: 0,
  CONFIRMED: 1,
  FAILED: -1,
} as const;

export type TransactionStatus = typeof TransactionStatus[keyof typeof TransactionStatus];

// ==================== Config Types ====================

export interface ChainConfig {
  chain: string;
  networks: string[];
}

export interface ChainsResponse {
  chains: ChainConfig[];
}

export interface ConnectorConfig {
  name: string;
  trading_types: string[];
  chain: string;
  networks: string[];
}

export interface ConnectorsResponse {
  connectors: ConnectorConfig[];
}

export interface NamespacesResponse {
  namespaces: string[];
}

export interface ConfigUpdateRequest {
  namespace: string;
  path: string;
  value: string | number | boolean | Record<string, unknown> | unknown[];
}

export interface ConfigUpdateResponse {
  message: string;
}

// ==================== Chain Types ====================

export interface BalanceRequest {
  network?: string;
  address?: string;
  tokens?: string[];
  fetchAll?: boolean;
}

export interface BalanceResponse {
  balances: Record<string, number>;
}

export interface TokenInfo {
  symbol: string;
  address: string;
  decimals: number;
  name: string;
}

export interface TokensRequest {
  network?: string;
  tokenSymbols?: string | string[];
}

export interface TokensResponse {
  tokens: TokenInfo[];
}

export interface StatusRequest {
  network?: string;
}

export interface StatusResponse {
  chain: string;
  network: string;
  rpcUrl: string;
  rpcProvider: string;
  currentBlockNumber: number;
  nativeCurrency: string;
  swapProvider: string;
}

export interface PollRequest {
  network?: string;
  signature: string;
  tokens?: string[];
  walletAddress?: string;
}

export interface PollResponse {
  currentBlock: number;
  signature: string;
  txBlock: number | null;
  txStatus: number;
  fee: number | null;
  tokenBalanceChanges?: Record<string, number>;
  txData: Record<string, unknown> | null;
  error?: string;
}

export interface EstimateGasRequest {
  network?: string;
}

export interface EstimateGasResponse {
  feePerComputeUnit: number;
  denomination: string;
  computeUnits: number;
  feeAsset: string;
  fee: number;
  timestamp: number;
  gasType?: string;
  maxFeePerGas?: number;
  maxPriorityFeePerGas?: number;
}

// ==================== Pool Types ====================

export type PoolType = 'amm' | 'clmm';

export interface PoolTemplate {
  type: PoolType;
  network: string;
  baseSymbol: string;
  quoteSymbol: string;
  address: string;
  baseTokenAddress: string;
  quoteTokenAddress: string;
  feePct: number;
  connector?: string;
}

export interface PoolGeckoData {
  volumeUsd24h: string;
  liquidityUsd: string;
  priceNative: string;
  priceUsd: string;
  buys24h: number;
  sells24h: number;
  apr?: number;
  timestamp: number;
}

export interface PoolInfo extends PoolTemplate {
  geckoData?: PoolGeckoData;
}

export interface PoolListRequest {
  connector: string;
  network?: string;
  type?: PoolType;
  search?: string;
}

export interface FindPoolsRequest {
  chainNetwork: string;
  connector?: string;
  type?: PoolType;
  tokenA?: string;
  tokenB?: string;
  pages?: number;
}

export interface PoolAddRequest {
  connector: string;
  type: PoolType;
  network: string;
  address: string;
  baseSymbol: string;
  quoteSymbol: string;
  baseTokenAddress: string;
  quoteTokenAddress: string;
  feePct?: number;
}

export interface PoolSuccessResponse {
  message: string;
}

// ==================== CLMM Types ====================

export interface BinLiquidity {
  binId: number;
  price: number;
  baseTokenAmount: number;
  quoteTokenAmount: number;
}

export interface CLMMPoolInfo {
  address: string;
  baseTokenAddress: string;
  quoteTokenAddress: string;
  binStep?: number;
  feePct: number;
  price: number;
  baseTokenAmount: number;
  quoteTokenAmount: number;
  activeBinId: number;
}

export interface MeteoraPoolInfo extends CLMMPoolInfo {
  dynamicFeePct: number;
  minBinId: number;
  maxBinId: number;
  bins: BinLiquidity[];
}

export interface CLMMPositionInfo {
  address: string;
  poolAddress: string;
  baseTokenAddress: string;
  quoteTokenAddress: string;
  baseTokenAmount: number;
  quoteTokenAmount: number;
  baseFeeAmount: number;
  quoteFeeAmount: number;
  lowerBinId: number;
  upperBinId: number;
  lowerPrice: number;
  upperPrice: number;
  price: number;
  rewardTokenAddress?: string;
  rewardAmount?: number;
}

export interface GetPositionsOwnedRequest {
  network?: string;
  walletAddress: string;
}

export interface GetPositionInfoRequest {
  network?: string;
  positionAddress: string;
  walletAddress?: string;
}

export interface GetPoolInfoRequest {
  network?: string;
  poolAddress: string;
}

export interface OpenPositionRequest {
  network?: string;
  walletAddress?: string;
  lowerPrice: number;
  upperPrice: number;
  poolAddress: string;
  baseTokenAmount?: number;
  quoteTokenAmount?: number;
  slippagePct?: number;
}

export interface OpenPositionResponse {
  signature: string;
  status: number;
  data?: {
    fee: number;
    positionAddress: string;
    positionRent: number;
    baseTokenAmountAdded: number;
    quoteTokenAmountAdded: number;
  };
}

export interface AddLiquidityRequest {
  network?: string;
  walletAddress?: string;
  positionAddress: string;
  baseTokenAmount: number;
  quoteTokenAmount: number;
  slippagePct?: number;
}

export interface AddLiquidityResponse {
  signature: string;
  status: number;
  data?: {
    fee: number;
    baseTokenAmountAdded: number;
    quoteTokenAmountAdded: number;
  };
}

export interface RemoveLiquidityRequest {
  network?: string;
  walletAddress?: string;
  positionAddress: string;
  percentageToRemove: number;
}

export interface RemoveLiquidityResponse {
  signature: string;
  status: number;
  data?: {
    fee: number;
    baseTokenAmountRemoved: number;
    quoteTokenAmountRemoved: number;
  };
}

export interface CollectFeesRequest {
  network?: string;
  walletAddress?: string;
  positionAddress: string;
}

export interface CollectFeesResponse {
  signature: string;
  status: number;
  data?: {
    fee: number;
    baseFeeAmountCollected: number;
    quoteFeeAmountCollected: number;
  };
}

export interface ClosePositionRequest {
  network?: string;
  walletAddress?: string;
  positionAddress: string;
}

export interface ClosePositionResponse {
  signature: string;
  status: number;
  data?: {
    fee: number;
    positionRentRefunded: number;
    baseTokenAmountRemoved: number;
    quoteTokenAmountRemoved: number;
    baseFeeAmountCollected: number;
    quoteFeeAmountCollected: number;
  };
}

export interface QuotePositionRequest {
  network?: string;
  lowerPrice: number;
  upperPrice: number;
  poolAddress: string;
  baseTokenAmount?: number;
  quoteTokenAmount?: number;
  slippagePct?: number;
}

export interface QuotePositionResponse {
  baseLimited: boolean;
  baseTokenAmount: number;
  quoteTokenAmount: number;
  baseTokenAmountMax: number;
  quoteTokenAmountMax: number;
  liquidity?: unknown;
}

// ==================== AMM Types ====================

export interface AMMPoolInfo {
  address: string;
  baseTokenAddress: string;
  quoteTokenAddress: string;
  feePct: number;
  price: number;
  baseTokenAmount: number;
  quoteTokenAmount: number;
}

export interface AMMPositionInfo {
  poolAddress: string;
  walletAddress: string;
  baseTokenAddress: string;
  quoteTokenAddress: string;
  lpTokenAmount: number;
  baseTokenAmount: number;
  quoteTokenAmount: number;
  price: number;
}

export interface AMMAddLiquidityRequest {
  network?: string;
  walletAddress?: string;
  poolAddress: string;
  baseTokenAmount: number;
  quoteTokenAmount: number;
  slippagePct?: number;
}

export interface AMMAddLiquidityResponse {
  signature: string;
  status: number;
  data?: {
    fee: number;
    baseTokenAmountAdded: number;
    quoteTokenAmountAdded: number;
  };
}

export interface AMMRemoveLiquidityRequest {
  network?: string;
  walletAddress?: string;
  poolAddress: string;
  percentageToRemove: number;
}

export interface AMMRemoveLiquidityResponse {
  signature: string;
  status: number;
  data?: {
    fee: number;
    baseTokenAmountRemoved: number;
    quoteTokenAmountRemoved: number;
  };
}

// ==================== Swap Types (Common for AMM/CLMM/Router) ====================

export interface QuoteSwapRequest {
  network?: string;
  poolAddress?: string;
  baseToken: string;
  quoteToken?: string;
  amount: number;
  side: TradeSide;
  slippagePct?: number;
}

export interface QuoteSwapResponse {
  poolAddress?: string;
  quoteId?: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  amountOut: number;
  price: number;
  slippagePct?: number;
  minAmountOut: number;
  maxAmountIn: number;
  priceImpactPct: number;
}

export interface ExecuteSwapRequest {
  walletAddress?: string;
  network?: string;
  poolAddress?: string;
  baseToken: string;
  quoteToken?: string;
  amount: number;
  side: TradeSide;
  slippagePct?: number;
}

export interface ExecuteSwapResponse {
  signature: string;
  status: number;
  data?: {
    tokenIn: string;
    tokenOut: string;
    amountIn: number;
    amountOut: number;
    fee: number;
    baseTokenBalanceChange: number;
    quoteTokenBalanceChange: number;
  };
}

// Router-specific types (for DEX aggregators like Jupiter)
export interface RouterQuoteSwapRequest {
  network?: string;
  baseToken: string;
  quoteToken: string;
  amount: number;
  side: TradeSide;
  slippagePct?: number;
}

export interface RouterExecuteQuoteRequest {
  walletAddress?: string;
  network?: string;
  quoteId: string;
}

// ==================== Trading API Types (Unified endpoints) ====================

export interface TradingQuoteSwapRequest {
  chainNetwork: string;
  connector: string;
  baseToken: string;
  quoteToken: string;
  amount: number;
  side: TradeSide;
  slippagePct?: number;
}

export interface TradingCollectFeesRequest {
  connector: string;
  chainNetwork: string;
  walletAddress: string;
  positionAddress: string;
}

export interface TradingClosePositionRequest {
  connector: string;
  chainNetwork: string;
  walletAddress: string;
  positionAddress: string;
}

// ==================== UI Helper Types ====================

/**
 * Position with connector field for UI tracking
 */
export interface PositionWithConnector extends CLMMPositionInfo {
  connector: string;
}

/**
 * Extended pool info with all possible fields from different pool types
 */
export interface ExtendedPoolInfo extends CLMMPoolInfo {
  // Uniswap V3 specific
  sqrtPriceX64?: string;
  tick?: number;
  liquidity?: string;
  // Meteora specific
  dynamicFeePct?: number;
  minBinId?: number;
  maxBinId?: number;
  bins?: BinLiquidity[];
}
