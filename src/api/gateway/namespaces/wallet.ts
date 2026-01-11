/**
 * Gateway Wallet API
 *
 * Wallet management endpoints for adding, removing, and listing wallets.
 */

import { gatewayGet, gatewayPost, gatewayDelete } from '../core/fetch';

/** Raw response from Gateway /wallet endpoint */
export interface WalletChainInfo {
  chain: string;
  walletAddresses: string[];
}

/** Flattened wallet info for UI display */
export interface WalletInfo {
  chain: string;
  address: string;
  isDefault?: boolean;
}

/** Chain config with default wallet */
interface ChainConfig {
  defaultWallet?: string;
  defaultNetwork?: string;
  [key: string]: unknown;
}

/** Gateway config response */
interface GatewayConfig {
  solana?: ChainConfig;
  ethereum?: ChainConfig;
  [key: string]: unknown;
}

export interface AddWalletRequest {
  chain: string;
  privateKey: string;
}

export interface AddWalletResponse {
  address: string;
}

export interface RemoveWalletRequest {
  chain: string;
  address: string;
}

export interface SetDefaultWalletRequest {
  chain: string;
  address: string;
}

/**
 * Wallet API endpoints
 */
export class WalletAPI {
  /**
   * List all wallets with default status
   */
  async list(): Promise<WalletInfo[]> {
    const [chains, config] = await Promise.all([
      gatewayGet<WalletChainInfo[]>('/wallet'),
      gatewayGet<GatewayConfig>('/config'),
    ]);

    // Get default wallets from config
    const defaults: Record<string, string> = {};
    if (config.solana?.defaultWallet) {
      defaults['solana'] = config.solana.defaultWallet;
    }
    if (config.ethereum?.defaultWallet) {
      defaults['ethereum'] = config.ethereum.defaultWallet;
    }

    // Flatten chain-grouped response into individual wallet entries
    const wallets: WalletInfo[] = [];
    for (const chainInfo of chains) {
      for (const address of chainInfo.walletAddresses) {
        wallets.push({
          chain: chainInfo.chain,
          address,
          isDefault: defaults[chainInfo.chain] === address,
        });
      }
    }
    return wallets;
  }

  /**
   * Add a new wallet from private key
   */
  async add(params: AddWalletRequest): Promise<AddWalletResponse> {
    return gatewayPost<AddWalletResponse>('/wallet/add', params);
  }

  /**
   * Remove a wallet
   */
  async remove(params: RemoveWalletRequest): Promise<{ message: string }> {
    return gatewayDelete<{ message: string }>('/wallet/remove', params);
  }

  /**
   * Set a wallet as the default for a chain
   */
  async setDefault(params: SetDefaultWalletRequest): Promise<{ message: string }> {
    return gatewayPost<{ message: string }>('/config/update', {
      namespace: params.chain,
      path: 'defaultWallet',
      value: params.address,
    });
  }
}
