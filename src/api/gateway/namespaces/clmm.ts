/**
 * Gateway CLMM API
 *
 * Concentrated Liquidity Market Maker operations (read-only).
 * Execute operations go through Hummingbot API.
 */

import { gatewayGet } from '../core/fetch';
import type {
  CLMMPositionInfo,
  CLMMPoolInfo,
  QuotePositionRequest,
  QuotePositionResponse,
  QuoteSwapRequest,
  QuoteSwapResponse,
} from '../types';

/**
 * CLMM API endpoints (read-only)
 */
export class CLMMAPI {
  /**
   * Get all positions owned by a wallet (on-chain read)
   * @param connector Connector name (raydium, meteora, uniswap, etc.)
   * @param chainNetwork Chain-network string (e.g., solana-mainnet-beta)
   * @param walletAddress Wallet address
   */
  async getPositionsOwned(
    connector: string,
    chainNetwork: string,
    walletAddress: string
  ): Promise<CLMMPositionInfo[]> {
    const params = new URLSearchParams();
    params.append('connector', connector);
    params.append('chainNetwork', chainNetwork);
    params.append('walletAddress', walletAddress);

    return gatewayGet<CLMMPositionInfo[]>(`/trading/clmm/positions-owned?${params}`);
  }

  /**
   * Get position info for a specific position
   * @param connector Connector name
   * @param chainNetwork Chain-network string
   * @param positionAddress Position address
   * @param walletAddress Optional wallet address
   */
  async getPositionInfo(
    connector: string,
    chainNetwork: string,
    positionAddress: string,
    walletAddress?: string
  ): Promise<CLMMPositionInfo> {
    const params = new URLSearchParams();
    params.append('connector', connector);
    params.append('chainNetwork', chainNetwork);
    params.append('positionAddress', positionAddress);
    if (walletAddress) params.append('walletAddress', walletAddress);

    return gatewayGet<CLMMPositionInfo>(`/trading/clmm/position-info?${params}`);
  }

  /**
   * Get pool info
   * @param connector Connector name
   * @param chainNetwork Chain-network string
   * @param poolAddress Pool address
   */
  async getPoolInfo(
    connector: string,
    chainNetwork: string,
    poolAddress: string
  ): Promise<CLMMPoolInfo> {
    const params = new URLSearchParams();
    params.append('connector', connector);
    params.append('chainNetwork', chainNetwork);
    params.append('poolAddress', poolAddress);

    return gatewayGet<CLMMPoolInfo>(`/trading/clmm/pool-info?${params}`);
  }

  /**
   * Quote a position (calculate amounts for opening a position)
   * @param connector Connector name
   * @param params Quote position parameters
   */
  async quotePosition(
    connector: string,
    params: QuotePositionRequest & { chainNetwork: string }
  ): Promise<QuotePositionResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('connector', connector);
    queryParams.append('chainNetwork', params.chainNetwork);
    queryParams.append('poolAddress', params.poolAddress);
    queryParams.append('lowerPrice', String(params.lowerPrice));
    queryParams.append('upperPrice', String(params.upperPrice));
    if (params.baseTokenAmount !== undefined) {
      queryParams.append('baseTokenAmount', String(params.baseTokenAmount));
    }
    if (params.quoteTokenAmount !== undefined) {
      queryParams.append('quoteTokenAmount', String(params.quoteTokenAmount));
    }
    if (params.slippagePct !== undefined) {
      queryParams.append('slippagePct', String(params.slippagePct));
    }

    return gatewayGet<QuotePositionResponse>(`/trading/clmm/quote-position?${queryParams}`);
  }

  /**
   * Quote a swap on a CLMM pool
   * @param connector Connector name
   * @param params Quote swap parameters
   */
  async quoteSwap(
    connector: string,
    params: QuoteSwapRequest & { chainNetwork: string }
  ): Promise<QuoteSwapResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('connector', connector);
    queryParams.append('chainNetwork', params.chainNetwork);
    queryParams.append('baseToken', params.baseToken);
    queryParams.append('amount', String(params.amount));
    queryParams.append('side', params.side);
    if (params.poolAddress) queryParams.append('poolAddress', params.poolAddress);
    if (params.quoteToken) queryParams.append('quoteToken', params.quoteToken);
    if (params.slippagePct !== undefined) {
      queryParams.append('slippagePct', String(params.slippagePct));
    }

    return gatewayGet<QuoteSwapResponse>(`/trading/clmm/quote-swap?${queryParams}`);
  }
}
