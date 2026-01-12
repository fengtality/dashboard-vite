# Gateway Architecture Redesign

## Executive Summary

This document outlines a redesign of the Gateway integration architecture to simplify the dashboard's API interactions. The goal is to consolidate all dashboard API calls through a single Hummingbot Backend API, with Gateway serving as **blockchain middleware** rather than a user-facing server.

**Key Principle**: Gateway's job is to handle the complex parts—RPC node connections, DEX SDK translations, wallet key management, and transaction signing. The API and Dashboard handle the simpler application-level concerns—data persistence, user management, UI presentation.

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
│             │     │  localhost:8000     │     │  (middleware)│
└─────────────┘     └─────────────────────┘     └─────────────┘
                              │                        │
                              ▼                        ▼
                    ┌─────────────────┐     ┌─────────────────┐
                    │ External APIs   │     │ Blockchain      │
                    │ - CoinGecko     │     │ - RPC Nodes     │
                    │ - CEX APIs      │     │ - DEX APIs/SDKs │
                    └─────────────────┘     └─────────────────┘
```

**Benefits:**
- Single API client in dashboard
- Unified authentication
- Gateway handles the complex parts: node connections, DEX SDK translations, wallet signing
- API handles the simple parts: data persistence, user management, orchestration
- Clear separation: API = application logic, Gateway = blockchain middleware

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

### What Dashboard/API Should Implement Independently

These capabilities exist in Gateway for the Hummingbot Client, but Dashboard and API should implement their own versions rather than relying on Gateway endpoints:

| Capability | Why Not Use Gateway | Implementation |
|------------|---------------------|----------------|
| Token Management | Gateway's token lists are for Hummingbot Client trading | API/Dashboard fetch from CoinGecko or maintain own token registry |
| Pool Management | Gateway's pool discovery is for Hummingbot Client strategies | API/Dashboard query DEX APIs directly for pool display |
| Server Configs | Gateway's logging/ports are internal infrastructure | API has its own config, Dashboard uses environment variables |

### What Dashboard/API Should NOT Use from Gateway

These capabilities exist in Gateway but Dashboard/API should implement independently:

| Capability | Dashboard/API Implementation | Reason |
|------------|------------------------------|--------|
| CoinGecko Prices | API fetches from CoinGecko directly | Price data is app-level concern, not blockchain middleware |
| Token Lists | API maintains own registry | Dashboard needs different token metadata than trading client |
| Pool Discovery | API queries DEX APIs | Dashboard display needs differ from trading client needs |
| Direct Gateway Access | API proxies all Gateway calls | Single entry point, unified auth |

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
│  ├── /tokens/*          - Token registry (NEW - not from GW)   │
│  ├── /pools/*           - Pool discovery (NEW - not from GW)   │
│  └── /docker/*          - Container management                 │
├────────────────────────────────────────────────────────────────┤
│  Proxied to Gateway (Blockchain Operations Only)               │
│  ├── /gateway/wallets/* - Wallet CRUD & signing                │
│  ├── /gateway/balances/*- On-chain balance queries             │
│  ├── /gateway/swap/*    - DEX swap execution                   │
│  ├── /gateway/clmm/*    - CLMM position management             │
│  └── /gateway/amm/*     - AMM operations                       │
└────────────────────────────────────────────────────────────────┘
```

> **Note**: Token and pool endpoints are implemented directly in the API (via CoinGecko, DEX APIs) rather than proxied from Gateway. Gateway's token/pool endpoints exist for the Hummingbot Client but are not used by Dashboard/API.

### Gateway (Blockchain Middleware)

Gateway handles the **complex blockchain interactions** that require specialized knowledge:

```
┌────────────────────────────────────────────────────────────────┐
│                    Gateway (Middleware)                        │
├────────────────────────────────────────────────────────────────┤
│  Complex: Blockchain Operations                                │
│  ├── Wallet key storage & transaction signing                  │
│  ├── Transaction building (chain-specific formats)             │
│  ├── Transaction submission & confirmation                     │
│  ├── Balance queries via RPC nodes                             │
│  └── Hardware wallet integration                               │
├────────────────────────────────────────────────────────────────┤
│  Complex: DEX SDK/API Translation                              │
│  ├── Jupiter SDK (Solana swaps, routing)                       │
│  ├── Raydium SDK (CLMM positions, AMM pools)                   │
│  ├── Orca SDK (Whirlpool positions)                            │
│  ├── Uniswap SDK (EVM swaps, LP positions)                     │
│  └── [Other DEX connectors with complex SDKs]                  │
├────────────────────────────────────────────────────────────────┤
│  Configuration (Blockchain Infrastructure)                     │
│  ├── RPC node endpoints & failover                             │
│  ├── DEX-specific settings (API keys, slippage)                │
│  └── Default wallets per chain                                 │
├────────────────────────────────────────────────────────────────┤
│  Kept for Hummingbot Client (NOT used by Dashboard/API)        │
│  ├── Token lists & metadata                                    │
│  ├── Pool discovery & caching                                  │
│  └── Price feeds (moving to API)                               │
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

### Phase 4: API Independence (Long-term)

Implement independent functionality in API (Gateway endpoints remain for Hummingbot Client):

- **Prices**: API fetches from CoinGecko directly (don't use Gateway `/price`)
- **Tokens**: API maintains own token registry (don't use Gateway `/tokens`)
- **Pools**: API queries DEX APIs directly for display (don't use Gateway `/pools`)
- **Config**: API manages user-facing config in database (Gateway config is infrastructure-only)

> **Note**: We don't remove these endpoints from Gateway—they're still used by Hummingbot Client. We just don't rely on them from Dashboard/API.

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
  // Existing (CEX & Bot Management)
  accounts: AccountsAPI,
  bots: BotsAPI,
  trading: TradingAPI,
  portfolio: PortfolioAPI,

  // Gateway operations (proxied - blockchain operations only)
  gateway: {
    wallets: WalletsAPI,    // /api/gateway/wallets - key management, signing
    balances: BalancesAPI,  // /api/gateway/balances - on-chain queries
    swap: SwapAPI,          // /api/gateway/swap - DEX execution
    clmm: CLMMAPI,          // /api/gateway/clmm - position management
    amm: AMMAPI,            // /api/gateway/amm - LP operations
  },

  // New (implemented by API, NOT from Gateway)
  prices: PricesAPI,        // /api/prices - CoinGecko integration
  tokens: TokensAPI,        // /api/tokens - token registry
  pools: PoolsAPI,          // /api/pools - pool discovery via DEX APIs
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

- [ ] Add `/api/gateway/*` proxy routes (wallets, balances, swap, clmm, amm)
- [ ] Implement address-first data transformations for Gateway responses
- [ ] Add `/api/prices` - CoinGecko integration (independent, not from Gateway)
- [ ] Add `/api/tokens` - Token registry (independent, not from Gateway)
- [ ] Add `/api/pools` - Pool discovery via DEX APIs (independent, not from Gateway)
- [ ] Add Gateway health check endpoint
- [ ] Implement unified error handling

### Dashboard Changes

- [ ] Remove `src/api/gateway/` direct client
- [ ] Update wallet/swap/clmm/amm calls to use `/api/gateway/*` proxy
- [ ] Update token display to use `/api/tokens` (not Gateway)
- [ ] Update pool display to use `/api/pools` (not Gateway)
- [ ] Update price display to use `/api/prices` (not Gateway)
- [ ] Remove Gateway proxy from `vite.config.ts`
- [ ] Update error handling for unified format
- [ ] Update CLAUDE.md documentation

### Gateway Changes

Gateway endpoints remain for Hummingbot Client; these are documentation/clarification changes:

- [ ] Document which endpoints are for Hummingbot Client vs API consumption
- [ ] Mark token/pool/price endpoints as "Hummingbot Client only" in docs
- [ ] Ensure API-consumed endpoints have stable, address-first schemas
- [ ] Document internal-only access pattern (not exposed to internet)

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
