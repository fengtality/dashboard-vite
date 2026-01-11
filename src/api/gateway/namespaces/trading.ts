/**
 * Gateway Trading API
 *
 * Unified trading endpoints that work across AMM/CLMM/Router.
 * Quote operations only - execute goes through Hummingbot API.
 */

import { gatewayGet } from '../core/fetch';
import type {
  QuoteSwapResponse,
  TradeSide,
} from '../types';

/**
 * Unified Trading API endpoints (read-only)
 */
export class TradingAPI {
  /**
   * Get a unified swap quote
   * Works with any connector type (router, amm, clmm)
   */
  async quoteSwap(params: {
    chainNetwork: string;
    connector: string;
    baseToken: string;
    quoteToken: string;
    amount: number;
    side: TradeSide;
    slippagePct?: number;
  }): Promise<QuoteSwapResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('chainNetwork', params.chainNetwork);
    queryParams.append('connector', params.connector);
    queryParams.append('baseToken', params.baseToken);
    queryParams.append('quoteToken', params.quoteToken);
    queryParams.append('amount', String(params.amount));
    queryParams.append('side', params.side);
    if (params.slippagePct !== undefined) {
      queryParams.append('slippagePct', String(params.slippagePct));
    }

    return gatewayGet<QuoteSwapResponse>(`/trading/swap/quote?${queryParams}`);
  }
}
