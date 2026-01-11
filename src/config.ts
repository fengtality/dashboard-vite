// Application configuration from environment variables

export const config = {
  api: {
    baseUrl: import.meta.env.VITE_API_URL || '/api',
    username: import.meta.env.VITE_API_USERNAME || 'admin',
    password: import.meta.env.VITE_API_PASSWORD || 'admin',
  },
  gateway: {
    passphrase: import.meta.env.VITE_GATEWAY_PASSPHRASE || 'a',
  },
} as const;

// Helper to get Basic Auth header value
export function getAuthHeader(): string {
  return 'Basic ' + btoa(`${config.api.username}:${config.api.password}`);
}
