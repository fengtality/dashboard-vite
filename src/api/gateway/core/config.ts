/**
 * Gateway client configuration
 */

export interface GatewayClientConfig {
  /** Gateway server URL (default: /api/gateway-proxy - routed through API) */
  baseUrl: string;
  /** Optional API key for authentication */
  apiKey?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout: number;
}

// Default configuration from environment
// Uses /api/gateway-proxy to route through Hummingbot API, which forwards to Gateway.
// This allows dashboard to access Gateway without direct connection.
const defaultConfig: GatewayClientConfig = {
  baseUrl: import.meta.env.VITE_GATEWAY_URL || '/api/gateway-proxy',
  apiKey: import.meta.env.VITE_GATEWAY_API_KEY || '',
  timeout: 30000,
};

let currentConfig = { ...defaultConfig };

/**
 * Get current Gateway client configuration
 */
export function getGatewayConfig(): GatewayClientConfig {
  return { ...currentConfig };
}

/**
 * Update Gateway client configuration
 */
export function setGatewayConfig(config: Partial<GatewayClientConfig>): void {
  currentConfig = { ...currentConfig, ...config };
}

/**
 * Reset Gateway client configuration to defaults
 */
export function resetGatewayConfig(): void {
  currentConfig = { ...defaultConfig };
}
