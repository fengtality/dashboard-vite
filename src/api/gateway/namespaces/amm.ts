/**
 * Gateway AMM API
 *
 * Standard AMM (v2-style) operations - read-only.
 * Execute operations go through Hummingbot API.
 */

import { gatewayGet } from '../core/fetch';
import type {
  AMMPoolInfo,
  AMMPositionInfo,
  QuoteSwapResponse,
  TradeSide,
} from '../types';

/**
 * AMM API endpoints (read-only)
 */
export class AMMAPI {
  /**
   * Get pool info for an AMM pool
   * @param connector Connector name
   * @param chainNetwork Chain-network string
   * @param poolAddress Pool address
   */
  async getPoolInfo(
    connector: string,
    chainNetwork: string,
    poolAddress: string
  ): Promise<AMMPoolInfo> {
    const params = new URLSearchParams();
    params.append('connector', connector);
    params.append('chainNetwork', chainNetwork);
    params.append('poolAddress', poolAddress);

    return gatewayGet<AMMPoolInfo>(`/trading/amm/pool-info?${params}`);
  }

  /**
   * Get position info for a wallet in an AMM pool
   * @param connector Connector name
   * @param chainNetwork Chain-network string
   * @param poolAddress Pool address
   * @param walletAddress Wallet address
   */
  async getPositionInfo(
    connector: string,
    chainNetwork: string,
    poolAddress: string,
    walletAddress: string
  ): Promise<AMMPositionInfo> {
    const params = new URLSearchParams();
    params.append('connector', connector);
    params.append('chainNetwork', chainNetwork);
    params.append('poolAddress', poolAddress);
    params.append('walletAddress', walletAddress);

    return gatewayGet<AMMPositionInfo>(`/trading/amm/position-info?${params}`);
  }

  /**
   * Quote a swap on an AMM pool
   * @param connector Connector name
   * @param params Quote parameters
   */
  async quoteSwap(
    connector: string,
    params: {
      chainNetwork: string;
      poolAddress?: string;
      baseToken: string;
      quoteToken?: string;
      amount: number;
      side: TradeSide;
      slippagePct?: number;
    }
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

    return gatewayGet<QuoteSwapResponse>(`/trading/amm/quote-swap?${queryParams}`);
  }
}
