/**
 * Connector-related utilities and helpers
 */

/**
 * Check if a connector is a perpetual/futures connector
 */
export function isPerpetualConnector(name: string): boolean {
  return name.endsWith('_perpetual') || name.endsWith('_perpetual_testnet');
}

/**
 * Check if a connector is a testnet connector
 */
export function isTestnetConnector(name: string): boolean {
  return name.endsWith('_testnet');
}

/**
 * Get the connector type (spot or perpetual)
 */
export function getConnectorType(name: string): 'spot' | 'perpetual' {
  return isPerpetualConnector(name) ? 'perpetual' : 'spot';
}

/**
 * Get the base connector name without testnet/perpetual suffixes
 * e.g., "binance_perpetual_testnet" -> "binance"
 */
export function getBaseConnectorName(name: string): string {
  return name
    .replace(/_perpetual_testnet$/, '')
    .replace(/_perpetual$/, '')
    .replace(/_testnet$/, '');
}

/**
 * Common connector configurations
 */
export const CONNECTOR_CONFIGS = {
  // Connectors that support perpetual trading
  perpetualConnectors: [
    'binance_perpetual',
    'hyperliquid_perpetual',
    'bybit_perpetual',
    'okx_perpetual',
  ],

  // Connectors that have testnet support
  testnetConnectors: [
    'binance_testnet',
    'binance_perpetual_testnet',
    'hyperliquid_testnet',
  ],

  // Default leverage limits by connector
  leverageLimits: {
    binance_perpetual: { min: 1, max: 125 },
    hyperliquid_perpetual: { min: 1, max: 50 },
    bybit_perpetual: { min: 1, max: 100 },
    default: { min: 1, max: 20 },
  } as Record<string, { min: number; max: number }>,
} as const;

/**
 * Get leverage limits for a connector
 */
export function getLeverageLimits(connectorName: string): { min: number; max: number } {
  const baseName = getBaseConnectorName(connectorName);
  const perpetualName = `${baseName}_perpetual`;
  return (
    CONNECTOR_CONFIGS.leverageLimits[perpetualName] ||
    CONNECTOR_CONFIGS.leverageLimits[baseName] ||
    CONNECTOR_CONFIGS.leverageLimits.default
  );
}
