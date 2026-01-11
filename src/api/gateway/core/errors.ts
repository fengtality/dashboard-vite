/**
 * Gateway API error handling
 */

export const GatewayErrorCode = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  UNKNOWN: 'UNKNOWN',
} as const;

export type GatewayErrorCode = typeof GatewayErrorCode[keyof typeof GatewayErrorCode];

/**
 * Custom error class for Gateway API errors
 */
export class GatewayError extends Error {
  readonly code: GatewayErrorCode;
  readonly statusCode?: number;
  readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: GatewayErrorCode = GatewayErrorCode.UNKNOWN,
    statusCode?: number,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'GatewayError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  /**
   * Create a GatewayError from an HTTP response
   */
  static fromResponse(statusCode: number, message: string): GatewayError {
    const code = mapStatusToErrorCode(statusCode);
    return new GatewayError(message, code, statusCode);
  }

  /**
   * Create a GatewayError from a network error
   */
  static networkError(message: string): GatewayError {
    return new GatewayError(message, GatewayErrorCode.NETWORK_ERROR);
  }

  /**
   * Create a GatewayError from a timeout
   */
  static timeout(): GatewayError {
    return new GatewayError('Request timed out', GatewayErrorCode.TIMEOUT);
  }
}

function mapStatusToErrorCode(status: number): GatewayErrorCode {
  if (status === 401 || status === 403) return GatewayErrorCode.AUTHENTICATION_FAILED;
  if (status === 404) return GatewayErrorCode.NOT_FOUND;
  if (status === 422 || status === 400) return GatewayErrorCode.VALIDATION_ERROR;
  if (status >= 500) return GatewayErrorCode.SERVER_ERROR;
  return GatewayErrorCode.UNKNOWN;
}
