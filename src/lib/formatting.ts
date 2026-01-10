/**
 * Shared formatting utilities used across the application
 */

/**
 * Format a connector name for display
 * e.g., "binance_perpetual_testnet" -> "Binance Perpetual Testnet"
 */
export function formatConnectorName(name: string): string {
  return name
    .replace(/_testnet$/, ' Testnet')
    .replace(/_perpetual$/, ' Perpetual')
    .replace(/_perpetual Testnet$/, ' Perpetual Testnet')
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format a bot name for display
 * e.g., "grid_strike_bot" -> "Grid Strike Bot"
 */
export function formatBotName(name: string): string {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format a strategy name for display
 * e.g., "grid_strike" -> "Grid Strike"
 */
export function formatStrategyName(name: string): string {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format a Python type annotation for display
 * e.g., "<class 'str'>" -> "string"
 * e.g., "typing.List[str]" -> "List[str]"
 */
export function formatType(typeStr: string): string {
  if (!typeStr) return 'any';

  // Handle Python class strings like "<class 'str'>"
  const classMatch = typeStr.match(/<class '(\w+)'>/);
  if (classMatch) {
    const pyType = classMatch[1];
    const typeMap: Record<string, string> = {
      str: 'string',
      int: 'integer',
      float: 'number',
      bool: 'boolean',
      list: 'array',
      dict: 'object',
    };
    return typeMap[pyType] || pyType;
  }

  // Handle typing module types like "typing.List[str]"
  if (typeStr.startsWith('typing.')) {
    return typeStr.replace('typing.', '');
  }

  return typeStr;
}

/**
 * Format a number as currency
 * @param value - The numeric value
 * @param decimals - Number of decimal places (default: 2)
 * @param showSign - Whether to show + for positive values
 */
export function formatCurrency(
  value: number,
  decimals: number = 2,
  showSign: boolean = false
): string {
  const formatted = Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const prefix = value < 0 ? '-$' : showSign && value > 0 ? '+$' : '$';
  return `${prefix}${formatted}`;
}

/**
 * Format a number with locale-aware separators
 * @param value - The numeric value
 * @param minDecimals - Minimum decimal places
 * @param maxDecimals - Maximum decimal places
 */
export function formatNumber(
  value: number,
  minDecimals: number = 2,
  maxDecimals: number = 6
): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  });
}

/**
 * Format a percentage value
 * @param value - The decimal value (e.g., 0.05 for 5%)
 * @param decimals - Number of decimal places
 */
export function formatPercent(value: number, decimals: number = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format a date/timestamp for display
 * @param timestamp - Unix timestamp in milliseconds or ISO string
 * @param options - Intl.DateTimeFormat options
 */
export function formatDate(
  timestamp: number | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp);
  return date.toLocaleString(undefined, options);
}

/**
 * Format a relative time (e.g., "2 hours ago")
 * @param timestamp - Unix timestamp in milliseconds or ISO string
 */
export function formatRelativeTime(timestamp: number | string): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

/**
 * Truncate a string with ellipsis
 * @param str - The string to truncate
 * @param maxLength - Maximum length before truncation
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}...`;
}

/**
 * Format a trading pair for display
 * e.g., "BTC-USDT" stays as is, but can be customized
 */
export function formatTradingPair(pair: string): string {
  return pair;
}
