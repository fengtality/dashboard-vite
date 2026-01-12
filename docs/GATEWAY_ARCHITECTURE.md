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

| Capability | Description |
|------------|-------------|
| **Address-First Schemas** | All operations keyed by blockchain address, not symbols or internal IDs. API resolves symbols via CoinGecko before calling Gateway. |
| **Blockchain Reads** | Read balances, positions, transactions via RPC nodes |
| **Blockchain Writes** | Submit transactions to blockchains via nodes |
| **DEX Translation** | Convert DEX APIs/SDKs/IDLs to standard REST endpoints |
| **Wallet Management** | Store/manage private keys, support hardware wallets |
| **Node Configuration** | Manage RPC endpoints, failover, rate limits |
| **DEX Configuration** | Store DEX-specific settings (Jupiter API key, slippage) |

### What Dashboard/API Should Implement Independently

These capabilities exist in Gateway for Hummingbot Client, but Dashboard/API should use **CoinGecko as a unified data provider**:

| Capability | Gateway (for Hummingbot Client) | API (for Dashboard) |
|------------|--------------------------------|---------------------|
| Token Data | `/tokens/*` - trading-focused lists | `/market-data/tokens` - CoinGecko registry |
| Pool Data | `/pools/*` - strategy discovery | `/market-data/pools` - CoinGecko pool stats |
| Price Data | Internal pricing for trades | Rate Oracle with CoinGecko ([PR #106](https://github.com/hummingbot/hummingbot-api/pull/106)) |
| Server Config | Logging, ports, infrastructure | API has its own config |

> **Why CoinGecko?** CoinGecko is essential for **symbol-to-address resolution**. Users search by symbol (e.g., "SOL", "USDC") or trading pair (e.g., "SOL/USDC"), but all API calls to Gateway use blockchain addresses. CoinGecko provides the lookup service to convert symbols to token addresses and pairs to pool addresses, plus unified token metadata, logos, prices, and pool statistics.

> **Address-First Flow**:
> - **Token**: User searches "SOL" → CoinGecko returns `So11111111111111111111111111111111111111112` → Gateway uses address
> - **Pool**: User searches "SOL/USDC" → CoinGecko returns pool address → Gateway uses address for LP operations

### Summary: What to Use from Gateway vs CoinGecko

| Need | Source | Endpoint |
|------|--------|----------|
| Wallet operations | Gateway (proxy) | `/api/gateway/wallet/*` |
| Chain balances | Gateway (proxy) | `/api/gateway/chain/*` |
| DEX swaps | Gateway (proxy) | `/api/gateway/swap/*` |
| CLMM positions | Gateway (proxy) | `/api/gateway/clmm/*` |
| AMM operations | Gateway (proxy) | `/api/gateway/amm/*` |
| Token prices | Rate Oracle (CoinGecko) | `/api/market-data/prices` |
| Token metadata | CoinGecko | `/api/market-data/tokens` |
| Pool statistics | CoinGecko | `/api/market-data/pools` |

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
│  ├── /market-data/*     - CoinGecko: prices, tokens, pools     │
│  └── /docker/*          - Container management                 │
├────────────────────────────────────────────────────────────────┤
│  Proxied to Gateway (Same Schema as Gateway)                   │
│  ├── /gateway/wallets/* - Wallet CRUD & signing                │
│  ├── /gateway/chain/*   - Chain status & balances              │
│  ├── /gateway/swap/*    - DEX swap quotes & execution          │
│  ├── /gateway/clmm/*    - CLMM position management             │
│  └── /gateway/amm/*     - AMM operations                       │
└────────────────────────────────────────────────────────────────┘
```

> **Market Data**: Prices, tokens, and pools are provided by CoinGecko as a unified data service—not from Gateway. Gateway's token/pool endpoints exist for Hummingbot Client trading but are not suitable for Dashboard display.

> **Gateway Proxy**: API proxies Gateway endpoints with **matching request/response schemas**. See Gateway docs at `localhost:15888/docs` for the canonical schemas. API routes like `/gateway/clmm/*`, `/gateway/swap/*` should match Gateway's `/clmm/*`, `/swap/*` schemas exactly.

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
5. **Clear Separation**: CoinGecko handles symbol→address resolution; Gateway handles address→blockchain operations

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

### Phase 3: Market Data Service (Medium-term)

Add CoinGecko as unified market data provider, with prices via Rate Oracle:

```python
# backend-api/services/market_data.py
class MarketDataService:
    """CoinGecko integration for prices, tokens, and pools"""

    async def get_prices(self, token_ids: list[str]) -> dict:
        """Fetch token prices via Rate Oracle (CoinGecko)"""
        # See PR #106: https://github.com/hummingbot/hummingbot-api/pull/106
        return await rate_oracle.get_prices(token_ids)

    async def get_tokens(self, chain: str = None) -> list[Token]:
        """Fetch token registry with metadata & logos"""
        return await coingecko.get_tokens(chain)

    async def get_pools(self, chain: str, dex: str = None) -> list[Pool]:
        """Fetch pool statistics"""
        return await coingecko.get_pools(chain, dex)
```

### Phase 4: Complete Migration (Long-term)

Finalize the architecture:

- **Gateway proxy**: All blockchain operations go through `/api/gateway/*` with matching schemas
- **Market data**: All display data (prices, tokens, pools) comes from `/api/market-data/*` via CoinGecko
- **Config**: User-facing config in API database; Gateway config is infrastructure-only
- **Dashboard**: Single API client, no direct Gateway calls

> **Note**: Gateway endpoints remain for Hummingbot Client—we don't remove them. Dashboard/API just uses the appropriate source for each data type.

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

  // Gateway proxy (same schemas as Gateway - see localhost:15888/docs)
  gateway: {
    wallets: WalletsAPI,    // /api/gateway/wallets → Gateway /wallet
    chain: ChainAPI,        // /api/gateway/chain → Gateway /chain
    swap: SwapAPI,          // /api/gateway/swap → Gateway /swap
    clmm: CLMMAPI,          // /api/gateway/clmm → Gateway /clmm
    amm: AMMAPI,            // /api/gateway/amm → Gateway /amm
  },

  // Market data (CoinGecko - unified data provider)
  marketData: {
    prices: PricesAPI,      // /api/market-data/prices
    tokens: TokensAPI,      // /api/market-data/tokens
    pools: PoolsAPI,        // /api/market-data/pools
  },
};
```

> **Schema Alignment**: Gateway proxy endpoints should use the **exact same request/response schemas** as Gateway. This allows Dashboard to seamlessly switch between direct Gateway calls (dev) and API proxy (production) without code changes.

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

**Gateway Proxy (same schemas as Gateway `localhost:15888/docs`):**
- [ ] Add `/api/gateway/wallet/*` proxy → Gateway `/wallet/*`
- [ ] Add `/api/gateway/chain/*` proxy → Gateway `/chain/*`
- [ ] Add `/api/gateway/swap/*` proxy → Gateway `/swap/*`
- [ ] Add `/api/gateway/clmm/*` proxy → Gateway `/clmm/*`
- [ ] Add `/api/gateway/amm/*` proxy → Gateway `/amm/*`
- [ ] Ensure request/response schemas match Gateway exactly

**Market Data (CoinGecko - unified data provider):**
- [ ] Add `/api/market-data/prices` - token prices via Rate Oracle ([PR #106](https://github.com/hummingbot/hummingbot-api/pull/106))
- [ ] Add `/api/market-data/tokens` - token registry & metadata
- [ ] Add `/api/market-data/pools` - pool discovery & stats

**Infrastructure:**
- [ ] Add Gateway health check endpoint
- [ ] Implement unified error handling

### Dashboard Changes

**Gateway Operations (via API proxy):**
- [ ] Remove `src/api/gateway/` direct client
- [ ] Update wallet/chain/swap/clmm/amm calls to use `/api/gateway/*`
- [ ] Remove Gateway proxy from `vite.config.ts`

**Market Data (via CoinGecko):**
- [ ] Update token display to use `/api/market-data/tokens`
- [ ] Update pool display to use `/api/market-data/pools`
- [ ] Update price display to use `/api/market-data/prices`

**Cleanup:**
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
