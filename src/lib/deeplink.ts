/**
 * Deep link utilities for Telegram bot registration.
 * Uses compact pipe-delimited format to stay under Telegram's 64-char limit.
 */

// Base64 URL-safe encoding
function base64UrlEncode(str: string): string {
  const base64 = btoa(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export interface ServerRegistrationData {
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
}

/**
 * Generate a deep link URL for Telegram bot registration.
 * Uses compact format: name|host|port|user|pass (base64 encoded)
 * Total must be under 64 chars for Telegram deep links.
 *
 * @param botUsername - Telegram bot username (without @)
 * @param data - Server registration data
 * @returns Deep link URL to open in Telegram
 */
export function generateTelegramDeepLink(
  botUsername: string,
  data: ServerRegistrationData
): string {
  // Compact pipe-delimited format
  const payload = `${data.name}|${data.host}|${data.port}|${data.username}|${data.password}`;

  // Base64 URL-safe encode
  const encoded = base64UrlEncode(payload);

  // Check length (Telegram limit is 64 chars for start parameter)
  const param = `r_${encoded}`;
  if (param.length > 64) {
    throw new Error(`Deep link too long (${param.length} chars). Use shorter server name/credentials.`);
  }

  // Return deep link URL
  return `https://t.me/${botUsername}?start=${param}`;
}

/**
 * Generate a server name from the host.
 */
export function generateServerName(host: string): string {
  // Remove protocol if present
  let name = host.replace(/^https?:\/\//, '');
  // Remove port if present
  name = name.split(':')[0];
  // Replace dots and special chars with underscores
  name = name.replace(/[^a-zA-Z0-9]/g, '_');
  // Truncate if too long
  if (name.length > 20) {
    name = name.slice(0, 20);
  }
  return name || 'my_server';
}
