/**
 * Gateway Router API
 *
 * DEX aggregator operations (Jupiter, 0x, etc.) - quote only.
 * Execute operations go through Hummingbot API.
 */

import { gatewayGet } from '../core/fetch';
import type {
  QuoteSwapResponse,
  TradeSide,
} from '../types';

/**
 * Router API endpoints (read-only)
 */
export class RouterAPI {
  /**
   * Get a swap quote from a DEX aggregator
   * @param connector Connector name (jupiter, 0x, etc.)
   * @param params Quote parameters
   */
  async quoteSwap(
    connector: string,
    params: {
      network: string;
      baseToken: string;
      quoteToken: string;
      amount: number;
      side: TradeSide;
      slippagePct?: number;
    }
  ): Promise<QuoteSwapResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('network', params.network);
    queryParams.append('baseToken', params.baseToken);
    queryParams.append('quoteToken', params.quoteToken);
    queryParams.append('amount', String(params.amount));
    queryParams.append('side', params.side);
    if (params.slippagePct !== undefined) {
      queryParams.append('slippagePct', String(params.slippagePct));
    }

    return gatewayGet<QuoteSwapResponse>(
      `/connectors/${connector}/router/quote-swap?${queryParams}`
    );
  }
}
