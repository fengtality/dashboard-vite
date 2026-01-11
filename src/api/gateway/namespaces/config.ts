/**
 * Gateway Config API
 *
 * Configuration endpoints for chains, connectors, and namespaces.
 */

import { gatewayGet, gatewayPost } from '../core/fetch';
import type {
  ChainsResponse,
  ConnectorsResponse,
  NamespacesResponse,
  ConfigUpdateRequest,
  ConfigUpdateResponse,
} from '../types';

/**
 * Configuration API endpoints
 */
export class ConfigAPI {
  /**
   * Get available blockchain networks
   */
  async getChains(): Promise<ChainsResponse> {
    return gatewayGet<ChainsResponse>('/config/chains');
  }

  /**
   * Get available DEX connectors
   */
  async getConnectors(): Promise<ConnectorsResponse> {
    return gatewayGet<ConnectorsResponse>('/config/connectors');
  }

  /**
   * Get all configuration namespaces
   */
  async getNamespaces(): Promise<NamespacesResponse> {
    return gatewayGet<NamespacesResponse>('/config/namespaces');
  }

  /**
   * Get all configuration values
   * @param namespace Optional namespace to filter by
   */
  async getAll(namespace?: string): Promise<Record<string, unknown>> {
    const query = namespace ? `?namespace=${encodeURIComponent(namespace)}` : '';
    return gatewayGet<Record<string, unknown>>(`/config${query}`);
  }

  /**
   * Update a configuration value
   */
  async update(params: ConfigUpdateRequest): Promise<ConfigUpdateResponse> {
    return gatewayPost<ConfigUpdateResponse>('/config/update', params);
  }
}
