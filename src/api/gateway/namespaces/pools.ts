/**
 * Gateway Pool API
 *
 * Pool discovery, search, and management.
 */

import { gatewayGet, gatewayPost, gatewayDelete } from '../core/fetch';
import type {
  PoolTemplate,
  PoolInfo,
  PoolAddRequest,
  PoolSuccessResponse,
  CLMMPoolInfo,
} from '../types';

/**
 * Pool API endpoints
 */
export class PoolAPI {
  /**
   * List pools from templates
   * @param connector Connector name (raydium, meteora, uniswap, etc.)
   * @param network Network name (mainnet-beta, mainnet, etc.)
   * @param type Optional pool type filter (amm or clmm)
   * @param search Optional search term (token symbol or address)
   */
  async list(
    connector: string,
    network: string,
    type?: 'amm' | 'clmm',
    search?: string
  ): Promise<PoolTemplate[]> {
    const params = new URLSearchParams();
    params.append('connector', connector);
    params.append('network', network);
    if (type) params.append('type', type);
    if (search) params.append('search', search);

    return gatewayGet<PoolTemplate[]>(`/pools?${params}`);
  }

  /**
   * Find pools with GeckoTerminal data
   * @param chainNetwork Chain and network in format: chain-network (e.g., solana-mainnet-beta)
   * @param connector Optional connector filter
   * @param type Optional pool type filter
   * @param tokenA Optional first token filter
   * @param tokenB Optional second token filter
   * @param pages Number of GeckoTerminal pages to fetch (1-10)
   */
  async find(
    chainNetwork: string,
    connector?: string,
    type?: 'amm' | 'clmm',
    tokenA?: string,
    tokenB?: string,
    pages?: number
  ): Promise<PoolInfo[]> {
    const params = new URLSearchParams();
    params.append('chainNetwork', chainNetwork);
    if (connector) params.append('connector', connector);
    if (type) params.append('type', type);
    if (tokenA) params.append('tokenA', tokenA);
    if (tokenB) params.append('tokenB', tokenB);
    if (pages) params.append('pages', String(pages));

    return gatewayGet<PoolInfo[]>(`/pools/find?${params}`);
  }

  /**
   * Get detailed pool info from on-chain
   * @param connector Connector name
   * @param chainNetwork Chain-network string (e.g., solana-mainnet-beta)
   * @param poolAddress Pool contract address
   */
  async getInfo(
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
   * Add a pool to templates
   */
  async add(params: PoolAddRequest): Promise<PoolSuccessResponse> {
    return gatewayPost<PoolSuccessResponse>('/pools/add', params);
  }

  /**
   * Delete a pool from templates
   * @param connector Connector name
   * @param type Pool type (amm or clmm)
   * @param network Network name
   * @param address Pool address
   */
  async delete(
    connector: string,
    type: 'amm' | 'clmm',
    network: string,
    address: string
  ): Promise<PoolSuccessResponse> {
    const params = new URLSearchParams();
    params.append('connector', connector);
    params.append('type', type);
    params.append('network', network);

    return gatewayDelete<PoolSuccessResponse>(`/pools/${address}?${params}`);
  }
}
