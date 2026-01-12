# Gateway Architecture Redesign

## Executive Summary

This document outlines a redesign of the Gateway integration architecture to simplify the dashboard's API interactions. The goal is to consolidate all dashboard API calls through a single Hummingbot Backend API, with Gateway serving as middleware rather than a standalone server.

---

## Problem Statement

### Current Architecture Issues

The dashboard currently maintains **two separate API clients**:

```
┌─────────────┐     ┌─────────────────────┐
│             │────▶│ Hummingbot API      │  (CEX, bots, accounts)
│  Dashboard  │     │ localhost:8000      │
│             │────▶│ Gateway             │  (DEX, wallets, chains)
└─────────────┘     │ localhost:15888     │
                    └─────────────────────┘
```

**Problems:**

1. **Dual Client Maintenance**: Dashboard maintains two API clients (`src/api/hummingbot-api.ts` and `src/api/gateway/`) with different patterns, error handling, and authentication.

2. **CORS Complexity**: Requires separate Vite proxy configurations for both `/api` and `/gateway` endpoints.

3. **Inconsistent Data Models**: Gateway returns chain-grouped data (e.g., wallets grouped by chain) while the API uses flat structures.

4. **Split Configuration**: Some configs live in Gateway (`defaultWallet`), others in the API database, creating confusion about source of truth.

5. **Deployment Complexity**: Users must manage two services with different lifecycles, ports, and configurations.

6. **Authentication Inconsistency**: API uses basic auth while Gateway uses API keys, requiring different auth handling.

---

## Proposed Architecture

### Single API Entry Point

```
┌─────────────┐     ┌─────────────────────┐     ┌─────────────┐
│             │     │                     │     │             │
│  Dashboard  │────▶│  Hummingbot API     │────▶│  Gateway    │
│             │     │  localhost:8000     │     │  (internal) │
└─────────────┘     └─────────────────────┘     └─────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │  External Services  │
                    │  - CoinGecko        │
                    │  - Blockchain Nodes │
                    └─────────────────────┘
```

**Benefits:**
- Single API client in dashboard
- Unified authentication
- Consistent error handling
- Simplified deployment
- Clear separation of concerns

---

## Gateway Role Definition

### What Gateway Should Do (Core Focus)

| Capability | Description | Priority |
|------------|-------------|----------|
| **Address-First Schemas** | All operations keyed by blockchain address, not internal IDs | High |
| **Blockchain Reads** | Read balances, positions, transactions via RPC nodes | High |
| **Blockchain Writes** | Submit transactions to blockchains via nodes | High |
| **DEX Translation** | Convert DEX APIs/SDKs/IDLs to standard REST endpoints | High |
| **Wallet Management** | Store/manage private keys, support hardware wallets | High |
| **Node Configuration** | Manage RPC endpoints, failover, rate limits | Medium |
| **DEX Configuration** | Store DEX-specific settings (Jupiter API key, slippage) | Medium |

### What Gateway Should Keep (No New Development)

| Capability | Reason | Consumer |
|------------|--------|----------|
| Token Management | Existing token list functionality | Hummingbot Client |
| Pool Management | Pool discovery for trading strategies | Hummingbot Client |
| Server Configs | Logging, ports - not user-facing | Internal |

### What Gateway Should NOT Do (Remove/Migrate)

| Capability | Migration Target | Reason |
|------------|------------------|--------|
| CoinGecko Integration | Hummingbot API | Price data is app-level, not blockchain middleware |
| Direct Dashboard Access | Hummingbot API proxy | Dashboard should use single API |

---

## API Responsibility Matrix

### Hummingbot Backend API (Dashboard-Facing)

```
┌────────────────────────────────────────────────────────────────┐
│                    Hummingbot Backend API                      │
├────────────────────────────────────────────────────────────────┤
│  Native Endpoints (Direct Implementation)                      │
│  ├── /accounts/*        - Account management                   │
│  ├── /connectors/*      - CEX connector configs                │
│  ├── /bots/*            - Bot orchestration                    │
│  ├── /trading/*         - CEX order management                 │
│  ├── /portfolio/*       - Portfolio tracking                   │
│  ├── /strategies/*      - Strategy configs                     │
│  ├── /prices/*          - CoinGecko integration (NEW)          │
│  └── /docker/*          - Container management                 │
├────────────────────────────────────────────────────────────────┤
│  Proxied to Gateway (Pass-through)                             │
│  ├── /gateway/wallets/* - Wallet CRUD                          │
│  ├── /gateway/chains/*  - Chain configs & balances             │
│  ├── /gateway/swap/*    - DEX swap execution                   │
│  ├── /gateway/clmm/*    - CLMM position management             │
│  └── /gateway/amm/*     - AMM operations                       │
└────────────────────────────────────────────────────────────────┘
```

### Gateway (Middleware)

```
┌────────────────────────────────────────────────────────────────┐
│                         Gateway                                │
├────────────────────────────────────────────────────────────────┤
│  Blockchain Operations                                         │
│  ├── Wallet key storage & signing                              │
│  ├── Transaction building & submission                         │
│  ├── Balance queries via RPC                                   │
│  └── Transaction status tracking                               │
├────────────────────────────────────────────────────────────────┤
│  DEX Integrations                                              │
│  ├── Jupiter (Solana swaps)                                    │
│  ├── Raydium (CLMM, AMM)                                       │
│  ├── Orca (CLMM)                                               │
│  ├── Uniswap (EVM swaps, LP)                                   │
│  └── [Other DEX connectors]                                    │
├────────────────────────────────────────────────────────────────┤
│  Configuration                                                 │
│  ├── RPC node endpoints                                        │
│  ├── DEX-specific settings                                     │
│  └── Default wallets per chain                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## Data Model Changes

### Current: Chain-Grouped (Gateway)

```json
// GET /wallet
[
  {
    "chain": "solana",
    "walletAddresses": ["82Sgg...", "9xKm..."]
  },
  {
    "chain": "ethereum",
    "walletAddresses": ["0xDA50..."]
  }
]
```

### Proposed: Address-First (API)

```json
// GET /gateway/wallets
{
  "wallets": [
    {
      "address": "82SggYRE2Vo4jN4a2pk3aQ4SET4ctafZJGbowmCqyHx5",
      "chain": "solana",
      "isDefault": true,
      "label": "Main Trading",
      "createdAt": "2024-01-15T10:30:00Z"
    },
    {
      "address": "0xDA50C69342216b538Daf06FfECDa7363E0B96684",
      "chain": "ethereum",
      "isDefault": true,
      "label": "ETH Main",
      "createdAt": "2024-01-10T08:00:00Z"
    }
  ]
}
```

### Benefits of Address-First

1. **Unique Identifiers**: Addresses are globally unique, no composite keys needed
2. **Direct Lookups**: `GET /gateway/wallets/{address}` instead of `GET /wallet?chain=solana&address=...`
3. **Cross-Chain Operations**: Easy to query "all wallets" without chain filtering
4. **Consistent with Blockchain**: Matches how blockchains identify accounts

---

## Migration Plan

### Phase 1: API Proxy Layer (Short-term)

Add Gateway proxy endpoints to Hummingbot API:

```python
# backend-api/routers/gateway.py
@router.get("/gateway/wallets")
async def list_wallets():
    """Proxy to Gateway /wallet with data transformation"""
    response = await gateway_client.get("/wallet")
    config = await gateway_client.get("/config")
    return transform_to_address_first(response, config)

@router.post("/gateway/wallets")
async def add_wallet(request: AddWalletRequest):
    """Proxy to Gateway /wallet/add"""
    return await gateway_client.post("/wallet/add", request)
```

### Phase 2: Dashboard Migration (Short-term)

Update dashboard to use single API:

```typescript
// Before: Two clients
import { gatewayClient } from '@/api/gateway';
import { accounts } from '@/api/hummingbot-api';

const wallets = await gatewayClient.wallet.list();
const creds = await accounts.getCredentials(account);

// After: Single client
import { api } from '@/api';

const wallets = await api.gateway.wallets.list();
const creds = await api.accounts.getCredentials(account);
```

### Phase 3: CoinGecko Migration (Medium-term)

Move CoinGecko integration from Gateway to API:

```python
# backend-api/services/prices.py
class PriceService:
    async def get_prices(self, tokens: list[str]) -> dict:
        """Fetch prices from CoinGecko"""
        # Caching, rate limiting, fallbacks
        return await coingecko_client.get_prices(tokens)
```

### Phase 4: Gateway Cleanup (Long-term)

Remove deprecated Gateway endpoints:
- `/price` endpoints (moved to API)
- Direct dashboard access patterns
- Legacy response formats

---

## API Endpoint Mapping

### Wallet Operations

| Dashboard Action | Current | Proposed |
|------------------|---------|----------|
| List wallets | `GET gateway/wallet` | `GET /api/gateway/wallets` |
| Add wallet | `POST gateway/wallet/add` | `POST /api/gateway/wallets` |
| Remove wallet | `DELETE gateway/wallet/remove` | `DELETE /api/gateway/wallets/{address}` |
| Set default | `POST gateway/config/update` | `PATCH /api/gateway/wallets/{address}` |
| Get balances | `POST gateway/chain/balances` | `GET /api/gateway/wallets/{address}/balances` |

### Swap Operations

| Dashboard Action | Current | Proposed |
|------------------|---------|----------|
| Get quote | `POST gateway/swap/quote` | `POST /api/gateway/swap/quote` |
| Execute swap | `POST api/gateway-swap/execute` | `POST /api/gateway/swap/execute` |
| Swap history | `GET api/gateway-swap/search` | `GET /api/gateway/swap/history` |

### CLMM Operations

| Dashboard Action | Current | Proposed |
|------------------|---------|----------|
| List positions | `POST gateway/clmm/positions` | `GET /api/gateway/clmm/positions` |
| Open position | `POST api/gateway-clmm/open` | `POST /api/gateway/clmm/positions` |
| Close position | `POST api/gateway-clmm/close` | `DELETE /api/gateway/clmm/positions/{id}` |

---

## Configuration Consolidation

### Current State (Split)

```yaml
# Gateway config (gateway/conf/server.yml)
solana:
  defaultNetwork: mainnet-beta
  defaultWallet: "82Sgg..."
  rpcProvider: helius

# API database (PostgreSQL)
accounts:
  - name: "main"
    credentials: {...}
```

### Proposed State (API as Source of Truth)

```yaml
# API manages all user-facing config
# Gateway config is infrastructure-only

# API Database
wallets:
  - address: "82Sgg..."
    chain: solana
    isDefault: true
    label: "Main Trading"

gateway_config:
  - chain: solana
    rpcEndpoint: "https://..."
    rpcProvider: helius
```

---

## Error Handling Standardization

### Current: Inconsistent Errors

```typescript
// Gateway errors
{ "statusCode": 400, "error": "Validation Error", "message": "..." }

// API errors
{ "detail": "Not found" }
```

### Proposed: Unified Error Format

```typescript
interface APIError {
  code: string;           // Machine-readable: "WALLET_NOT_FOUND"
  message: string;        // Human-readable: "Wallet not found"
  details?: unknown;      // Additional context
  source?: "api" | "gateway" | "blockchain";
}
```

---

## Dashboard Code Changes

### Remove Gateway Client

```diff
- src/api/gateway/
-   core/
-   namespaces/
-   types/
-   index.ts
```

### Unified API Client

```typescript
// src/api/index.ts
export const api = {
  // Existing
  accounts: AccountsAPI,
  bots: BotsAPI,
  trading: TradingAPI,

  // Gateway operations (proxied)
  gateway: {
    wallets: WalletsAPI,    // /api/gateway/wallets
    swap: SwapAPI,          // /api/gateway/swap
    clmm: CLMMAPI,          // /api/gateway/clmm
    amm: AMMAPI,            // /api/gateway/amm
    chains: ChainsAPI,      // /api/gateway/chains
  },

  // New
  prices: PricesAPI,        // /api/prices (CoinGecko)
};
```

---

## Security Considerations

### Current Issues

1. **Exposed Gateway Port**: Gateway accessible on port 15888, requires separate firewall rules
2. **No Auth on Gateway**: Gateway relies on IP whitelist, dashboard bypasses via proxy
3. **Key Storage**: Private keys in Gateway, API has no visibility

### Proposed Improvements

1. **Internal Gateway**: Gateway only accessible from API server (localhost/docker network)
2. **API Auth for All**: All dashboard requests authenticated via API
3. **Audit Trail**: API logs all Gateway operations with user context

---

## Implementation Checklist

### Backend API Changes

- [ ] Add `/api/gateway/*` proxy routes
- [ ] Implement address-first data transformations
- [ ] Add CoinGecko integration to `/api/prices`
- [ ] Add Gateway health check endpoint
- [ ] Implement unified error handling

### Dashboard Changes

- [ ] Remove `src/api/gateway/` client
- [ ] Update all Gateway calls to use API proxy
- [ ] Remove Gateway proxy from `vite.config.ts`
- [ ] Update error handling for unified format
- [ ] Update CLAUDE.md documentation

### Gateway Changes

- [ ] Deprecate direct dashboard access
- [ ] Remove CoinGecko endpoints
- [ ] Update response formats for API consumption
- [ ] Document internal-only access pattern

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| API clients in dashboard | 2 | 1 |
| Proxy configurations | 2 | 1 |
| Auth mechanisms | 2 | 1 |
| Exposed ports | 2 | 1 |
| Error format types | 2+ | 1 |

---

## Appendix: Current File Structure

```
src/api/
├── gateway/                    # TO BE REMOVED
│   ├── core/
│   │   ├── config.ts
│   │   ├── errors.ts
│   │   └── fetch.ts
│   ├── namespaces/
│   │   ├── amm.ts
│   │   ├── chains.ts
│   │   ├── clmm.ts
│   │   ├── config.ts
│   │   ├── pools.ts
│   │   ├── router.ts
│   │   ├── trading.ts
│   │   └── wallet.ts
│   ├── types/
│   │   └── index.ts
│   └── index.ts
├── hummingbot-api.ts           # TO BE EXPANDED
└── index.ts
```

---

## References

- [Hummingbot Gateway Repository](https://github.com/hummingbot/gateway)
- [Hummingbot Backend API Repository](https://github.com/hummingbot/backend-api)
- [Current Dashboard CLAUDE.md](./CLAUDE.md)
