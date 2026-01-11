/**
 * Gateway Chain API
 *
 * Chain operations: balances, tokens, status, transactions.
 */

import { gatewayGet, gatewayPost } from '../core/fetch';
import type {
  BalanceRequest,
  BalanceResponse,
  TokensResponse,
  StatusResponse,
  PollRequest,
  PollResponse,
  EstimateGasResponse,
} from '../types';

/**
 * Chain API endpoints
 */
export class ChainAPI {
  /**
   * Get token balances for a wallet
   */
  async getBalances(chain: string, params: BalanceRequest): Promise<BalanceResponse> {
    return gatewayPost<BalanceResponse>(`/chains/${chain}/balances`, params);
  }

  /**
   * Get token list for a chain/network
   */
  async getTokens(chain: string, network: string): Promise<TokensResponse> {
    return gatewayGet<TokensResponse>(
      `/chains/${chain}/tokens?network=${encodeURIComponent(network)}`
    );
  }

  /**
   * Get chain/network status
   */
  async getStatus(chain: string, network: string): Promise<StatusResponse> {
    return gatewayGet<StatusResponse>(
      `/chains/${chain}/status?network=${encodeURIComponent(network)}`
    );
  }

  /**
   * Poll transaction status
   */
  async poll(chain: string, params: PollRequest): Promise<PollResponse> {
    return gatewayPost<PollResponse>(`/chains/${chain}/poll`, params);
  }

  /**
   * Estimate gas fees
   */
  async estimateGas(chain: string, network: string): Promise<EstimateGasResponse> {
    return gatewayGet<EstimateGasResponse>(
      `/chains/${chain}/estimate-gas?network=${encodeURIComponent(network)}`
    );
  }
}
