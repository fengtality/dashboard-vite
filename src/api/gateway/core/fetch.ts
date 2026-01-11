/**
 * Gateway API fetch utilities
 *
 * Core HTTP utilities for making requests to the Gateway server.
 */

import { getGatewayConfig } from './config';
import { GatewayError } from './errors';

/**
 * Make a fetch request to the Gateway API
 */
export async function gatewayFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const config = getGatewayConfig();
  const url = `${config.baseUrl}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add API key if configured
  if (config.apiKey) {
    headers['X-API-Key'] = config.apiKey;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        ...headers,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw GatewayError.fromResponse(
        response.status,
        errorText || `Gateway API error: ${response.status}`
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof GatewayError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw GatewayError.timeout();
    }
    throw GatewayError.networkError(
      error instanceof Error ? error.message : 'Network error'
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Make a GET request to the Gateway API
 */
export async function gatewayGet<T>(endpoint: string): Promise<T> {
  return gatewayFetch<T>(endpoint, { method: 'GET' });
}

/**
 * Make a POST request to the Gateway API
 */
export async function gatewayPost<T>(
  endpoint: string,
  body?: unknown
): Promise<T> {
  return gatewayFetch<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Make a DELETE request to the Gateway API
 */
export async function gatewayDelete<T>(
  endpoint: string,
  body?: unknown
): Promise<T> {
  return gatewayFetch<T>(endpoint, {
    method: 'DELETE',
    body: body ? JSON.stringify(body) : undefined,
  });
}
