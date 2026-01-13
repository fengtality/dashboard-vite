# Gateway Architecture Redesign

## Executive Summary

This document specifies how to restructure the Hummingbot API and Dashboard to simplify Gateway integration.

**Goal**: Dashboard calls only the Hummingbot API. API handles two types of requests:
1. **Native endpoints** - implemented directly in API (accounts, bots, CEX trading, market data)
2. **Gateway endpoints** - forwarded to Gateway with identical schemas (wallets, chains, DEX trading)

**Key Terms**:
- **Expose**: Add endpoint to API's Swagger UI / OpenAPI spec
- **Forward**: Route request to Gateway and return response unchanged
- **Schema**: Request/response format - API uses Gateway's schemas exactly, no transformation

---

## Architecture Overview

```
┌─────────────┐     ┌─────────────────────┐     ┌─────────────┐
│             │     │                     │     │             │
│  Dashboard  │────▶│  Hummingbot API     │────▶│  Gateway    │
│             │     │  localhost:8000     │     │  (internal) │
└─────────────┘     └─────────────────────┘     └─────────────┘
                              │                        │
                              ▼                        ▼
                    ┌─────────────────┐     ┌─────────────────┐
                    │ CoinGecko       │     │ Blockchain      │
                    │ - prices        │     │ - RPC nodes     │
                    │ - tokens        │     │ - DEX SDKs      │
                    │ - pools         │     │ - wallets       │
                    └─────────────────┘     └─────────────────┘
```

**Responsibilities**:
- **Gateway**: Complex blockchain operations (RPC nodes, DEX SDKs, wallet signing, transaction building)
- **API**: Application logic (user management, data persistence, CoinGecko integration, request routing)
- **Dashboard**: UI only, calls API exclusively

---

## What Implementers Need to Do

### 1. API: Expose and Forward Gateway Endpoints

**Action**: Create routes in API that forward requests to Gateway. Use **identical request/response schemas** as Gateway.

| API Endpoint | Forwards To | Gateway Docs |
|--------------|-------------|--------------|
| `GET /api/gateway/config` | `GET /config` | `localhost:15888/docs` |
| `* /api/gateway/wallet/*` | `* /wallet/*` | `localhost:15888/docs` |
| `* /api/gateway/chain/solana/*` | `* /chain/solana/*` | `localhost:15888/docs` |
| `* /api/gateway/chain/ethereum/*` | `* /chain/ethereum/*` | `localhost:15888/docs` |
| `* /api/gateway/trading/swap/*` | `* /trading/swap/*` | `localhost:15888/docs` |
| `* /api/gateway/trading/clmm/*` | `* /trading/clmm/*` | `localhost:15888/docs` |
| `* /api/gateway/trading/amm/*` | `* /trading/amm/*` | `localhost:15888/docs` |

**Implementation Pattern**:

```python
# backend-api/routers/gateway.py
from fastapi import APIRouter, Request
import httpx

router = APIRouter(prefix="/gateway")
GATEWAY_URL = "http://localhost:15888"

@router.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def forward_to_gateway(path: str, request: Request):
    """
    Forward request to Gateway with identical schema.
    No transformation - Gateway's request/response format is the source of truth.
    """
    async with httpx.AsyncClient() as client:
        response = await client.request(
            method=request.method,
            url=f"{GATEWAY_URL}/{path}",
            content=await request.body(),
            headers={k: v for k, v in request.headers.items() if k.lower() != "host"},
        )
        return Response(
            content=response.content,
            status_code=response.status_code,
            headers=dict(response.headers),
        )
```

**Do NOT**:
- Transform request/response schemas
- Create different field names or structures
- Call connector-specific endpoints (e.g., `/connectors/orca/clmm/fetch-pools`)

**Do**:
- Copy Gateway's OpenAPI schemas into API's Swagger UI
- Forward requests unchanged
- Return responses unchanged

---

### 2. API: Remove Redundant Wallet Endpoints

**Action**: Delete these endpoints from API (they duplicate Gateway functionality):

```
DELETE: POST   /accounts/gateway/add-wallet
DELETE: DELETE /accounts/gateway/{chain}/{address}
DELETE: POST   /gateway/wallets/create
DELETE: GET    /gateway/wallets/show-private-key
DELETE: POST   /gateway/wallets/send
```

**Replace with**: Forward to Gateway `/wallet/*` endpoints (see above).

---

### 3. API: Implement Market Data Endpoints (CoinGecko)

**Action**: Create new endpoints that fetch from CoinGecko. These are NOT forwarded to Gateway.

| API Endpoint | Data Source | Purpose |
|--------------|-------------|---------|
| `GET /api/market-data/prices` | Rate Oracle / CoinGecko | Token prices |
| `GET /api/market-data/tokens` | CoinGecko | Token registry, metadata, logos |
| `GET /api/market-data/tokens/{symbol}` | CoinGecko | Symbol → address resolution |
| `GET /api/market-data/pools` | CoinGecko | Pool discovery, statistics |
| `GET /api/market-data/pools/{pair}` | CoinGecko | Pair → pool address resolution |

**Why CoinGecko instead of Gateway?**
- Users search by symbol ("SOL") or pair ("SOL/USDC")
- Gateway requires blockchain addresses
- CoinGecko provides symbol→address and pair→pool resolution
- CoinGecko provides unified metadata across all chains/DEXes

**Implementation**: See [PR #106](https://github.com/hummingbot/hummingbot-api/pull/106) for Rate Oracle integration.

---

### 4. Dashboard: Use Single API Client

**Action**: Remove direct Gateway calls. All requests go through API.

**Before** (two clients):
```typescript
import { gatewayClient } from '@/api/gateway';
import { api } from '@/api/hummingbot-api';

// Direct Gateway call
const wallets = await gatewayClient.wallet.list();
// API call
const accounts = await api.accounts.list();
```

**After** (single client):
```typescript
import { api } from '@/api';

// All through API
const wallets = await api.gateway.wallet.list();  // API forwards to Gateway
const accounts = await api.accounts.list();        // API handles directly
const tokens = await api.marketData.tokens.search("SOL");  // API calls CoinGecko
```

**Files to delete from Dashboard**:
```
src/api/gateway/           # Entire directory
vite.config.ts             # Remove /gateway proxy
```

---

## Request Flow Examples

### Example 1: User Adds a Wallet

```
1. User enters private key in Dashboard
2. Dashboard calls: POST /api/gateway/wallet/add { chain: "solana", privateKey: "..." }
3. API forwards unchanged to: POST localhost:15888/wallet/add { chain: "solana", privateKey: "..." }
4. Gateway stores key, returns: { address: "82Sgg..." }
5. API returns unchanged: { address: "82Sgg..." }
6. Dashboard displays wallet
```

### Example 2: User Searches for Token

```
1. User types "SOL" in search box
2. Dashboard calls: GET /api/market-data/tokens?search=SOL
3. API calls CoinGecko, returns: [{ symbol: "SOL", address: "So111...", logo: "...", price: 150.00 }]
4. Dashboard displays token with logo and price
```

### Example 3: User Executes Swap

```
1. User selects SOL → USDC swap
2. Dashboard has addresses from earlier token search
3. Dashboard calls: POST /api/gateway/trading/swap { ... addresses ... }
4. API forwards unchanged to: POST localhost:15888/trading/swap { ... }
5. Gateway builds transaction, signs with wallet, submits to blockchain
6. Gateway returns: { txHash: "...", status: "confirmed" }
7. API returns unchanged: { txHash: "...", status: "confirmed" }
8. Dashboard displays success
```

---

## Endpoint Reference

### Gateway Endpoints (Forwarded by API)

These endpoints are **exposed in API's Swagger UI** and **forwarded to Gateway unchanged**:

| Category | API Route | Gateway Route | Method |
|----------|-----------|---------------|--------|
| Config | `/api/gateway/config` | `/config` | GET, POST |
| Wallet | `/api/gateway/wallet` | `/wallet` | GET |
| Wallet | `/api/gateway/wallet/add` | `/wallet/add` | POST |
| Wallet | `/api/gateway/wallet/remove` | `/wallet/remove` | DELETE |
| Chain | `/api/gateway/chain/solana/*` | `/chain/solana/*` | * |
| Chain | `/api/gateway/chain/ethereum/*` | `/chain/ethereum/*` | * |
| Swap | `/api/gateway/trading/swap/*` | `/trading/swap/*` | * |
| CLMM | `/api/gateway/trading/clmm/*` | `/trading/clmm/*` | * |
| AMM | `/api/gateway/trading/amm/*` | `/trading/amm/*` | * |

**Schema source**: Gateway OpenAPI spec at `localhost:15888/docs`

### Native API Endpoints (Not Gateway)

These endpoints are **implemented directly in API**:

| Category | Route | Data Source |
|----------|-------|-------------|
| Accounts | `/api/accounts/*` | PostgreSQL |
| Bots | `/api/bots/*` | Docker + PostgreSQL |
| CEX Trading | `/api/trading/*` | CEX APIs |
| Market Data | `/api/market-data/prices` | CoinGecko / Rate Oracle |
| Market Data | `/api/market-data/tokens` | CoinGecko |
| Market Data | `/api/market-data/pools` | CoinGecko |

---

## Implementation Checklist

### API Team

**Gateway Forwarding:**
- [ ] Create `/api/gateway/*` catch-all route that forwards to Gateway
- [ ] Copy Gateway OpenAPI schemas into API's Swagger UI
- [ ] Test that requests/responses pass through unchanged
- [ ] Remove old wallet endpoints (`/accounts/gateway/*`, `/gateway/wallets/*`)

**Market Data:**
- [ ] Implement `/api/market-data/prices` via Rate Oracle ([PR #106](https://github.com/hummingbot/hummingbot-api/pull/106))
- [ ] Implement `/api/market-data/tokens` via CoinGecko
- [ ] Implement `/api/market-data/pools` via CoinGecko
- [ ] Add symbol→address resolution endpoint
- [ ] Add pair→pool resolution endpoint

### Dashboard Team

- [ ] Delete `src/api/gateway/` directory
- [ ] Remove `/gateway` proxy from `vite.config.ts`
- [ ] Update all Gateway calls to use `/api/gateway/*`
- [ ] Update token/pool display to use `/api/market-data/*`
- [ ] Test end-to-end flows

### Gateway Team

No code changes required. Documentation updates only:
- [ ] Document which endpoints API will forward
- [ ] Ensure schemas are stable for API consumption

---

## References

- [Gateway OpenAPI Docs](http://localhost:15888/docs)
- [Hummingbot API Repository](https://github.com/hummingbot/backend-api)
- [Rate Oracle PR #106](https://github.com/hummingbot/hummingbot-api/pull/106)
- [CoinGecko API](https://www.coingecko.com/en/api)
