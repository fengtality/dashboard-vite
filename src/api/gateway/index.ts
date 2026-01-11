/**
 * Gateway Client
 *
 * Direct client for Gateway server at localhost:15888.
 * Handles DEX operations and wallet management.
 *
 * This client is designed to be extractable to a standalone @hummingbot/gateway-client package.
 */

import { ConfigAPI } from './namespaces/config';
import { ChainAPI } from './namespaces/chains';
import { PoolAPI } from './namespaces/pools';
import { CLMMAPI } from './namespaces/clmm';
import { AMMAPI } from './namespaces/amm';
import { RouterAPI } from './namespaces/router';
import { TradingAPI } from './namespaces/trading';
import { WalletAPI } from './namespaces/wallet';
import { gatewayGet, gatewayPost } from './core/fetch';

// Re-export types
export * from './types';
export type { WalletInfo, AddWalletRequest, AddWalletResponse, RemoveWalletRequest, SetDefaultWalletRequest } from './namespaces/wallet';

// Re-export config utilities
export { getGatewayConfig, setGatewayConfig, resetGatewayConfig } from './core/config';
export type { GatewayClientConfig } from './core/config';

// Re-export error types
export { GatewayError, GatewayErrorCode } from './core/errors';

/**
 * Gateway API Client
 *
 * Organizes all API endpoints into logical namespaces.
 *
 * @example
 * ```typescript
 * import { GatewayClient } from '@/api/gateway';
 *
 * const gateway = new GatewayClient();
 *
 * // Configuration
 * const chains = await gateway.config.getChains();
 * const connectors = await gateway.config.getConnectors();
 *
 * // Chain operations
 * const balances = await gateway.chains.getBalances('solana', {
 *   network: 'mainnet-beta',
 *   address: walletAddress
 * });
 *
 * // Pool operations
 * const pools = await gateway.pools.list('raydium', 'mainnet-beta', 'clmm');
 * const poolInfo = await gateway.pools.getInfo('raydium', 'solana-mainnet-beta', poolAddress);
 *
 * // CLMM operations
 * const positions = await gateway.clmm.getPositionsOwned('raydium', 'solana-mainnet-beta', walletAddress);
 *
 * // Swap quotes
 * const quote = await gateway.trading.quoteSwap({
 *   chainNetwork: 'solana-mainnet-beta',
 *   connector: 'jupiter',
 *   baseToken: 'SOL',
 *   quoteToken: 'USDC',
 *   amount: 1,
 *   side: 'SELL'
 * });
 * ```
 */
export class GatewayClient {
  /** Configuration endpoints (chains, connectors, namespaces) */
  readonly config = new ConfigAPI();

  /** Chain endpoints (balances, tokens, status, transactions) */
  readonly chains = new ChainAPI();

  /** Pool endpoints (discovery, info, management) */
  readonly pools = new PoolAPI();

  /** CLMM endpoints (concentrated liquidity positions, quotes) */
  readonly clmm = new CLMMAPI();

  /** AMM endpoints (standard AMM pools, quotes) */
  readonly amm = new AMMAPI();

  /** Router endpoints (DEX aggregator quotes) */
  readonly router = new RouterAPI();

  /** Unified trading endpoints (works across all connector types) */
  readonly trading = new TradingAPI();

  /** Wallet management endpoints */
  readonly wallet = new WalletAPI();

  /**
   * Health check - ping Gateway server
   * @returns { status: 'ok' } if Gateway is running
   */
  async health(): Promise<{ status: string }> {
    return gatewayGet<{ status: string }>('/');
  }

  /**
   * Get Gateway server status info
   * @returns Status info including version, uptime, mode, pid
   */
  async status(): Promise<{
    status: string;
    version: string;
    uptime: number;
    mode: string;
    pid: number;
  }> {
    return gatewayGet('/status');
  }

  /**
   * Restart the Gateway server
   * Triggers a server restart via POST /restart
   */
  async restart(): Promise<{ message: string }> {
    return gatewayPost<{ message: string }>('/restart', {});
  }
}

/**
 * Default Gateway client instance
 */
export const gatewayClient = new GatewayClient();
