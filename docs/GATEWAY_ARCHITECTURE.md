# Gateway Architecture

## Executive Summary

This document specifies how the Hummingbot API and Dashboard integrate with Gateway for DEX operations.

**Goal**: Dashboard calls only the Hummingbot API. API acts as a secure proxy to Gateway.

**Design Principles**:
1. **Security** - Gateway is internal-only; all user requests are authenticated through the API
2. **Flexibility** - Gateway URL is server-side config; works with local, Docker, or remote Gateway
3. **Simplicity** - Dashboard doesn't know where Gateway runs; API handles routing

---

## Security Model

```
┌─────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│             │     │                     │     │                     │
│  Dashboard  │────▶│  Hummingbot API     │────▶│  Gateway            │
│  (browser)  │     │  (authenticated)    │     │  (internal only)    │
│             │     │                     │     │                     │
└─────────────┘     └─────────────────────┘     └─────────────────────┘
       │                     │                           │
       │                     │                           │
   Basic Auth           GATEWAY_URL                 No external
   required             env variable                 exposure
```

**Security guarantees**:
- **Users authenticate with API** - Basic Auth required for all `/api/*` endpoints
- **Gateway is never exposed** - Dashboard cannot access Gateway directly
- **Gateway URL is server-side** - Users cannot see or modify Gateway location
- **Wallet keys stay internal** - Private keys are stored in Gateway, never sent to browser

**For production deployments**:
- Run Gateway in isolated network (Docker network, VPC, etc.)
- Never expose Gateway port (15888) externally
- Use Gateway passphrase for wallet encryption
- API is the only entry point for external requests

---

## Flexibility for Developers

The API's Gateway URL is configurable via environment variable:

```bash
# Local development (default)
GATEWAY_URL=http://localhost:15888

# Docker Compose (service name)
GATEWAY_URL=http://gateway:15888

# Remote Gateway
GATEWAY_URL=http://gateway.internal:15888
```

**This enables**:
- **Local dev**: Run Gateway locally on port 15888
- **Docker dev**: Run Gateway as Docker container in same network
- **Production**: Run Gateway on separate server/container
- **Testing**: Point to mock Gateway or testnet Gateway

**Dashboard doesn't care** - it always calls `/api/gateway-proxy/*` and the API routes to wherever Gateway is configured.

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
- **API**: Authentication, request routing, data persistence, CoinGecko integration
- **Dashboard**: UI only, calls API exclusively

---

## Implementation Details

### API: Gateway Proxy Router

The API includes a catch-all proxy at `/gateway-proxy/*` that forwards requests to Gateway:

```python
# routers/gateway_proxy.py
router = APIRouter(prefix="/gateway-proxy")

@router.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def forward_to_gateway(path: str, request: Request):
    """Forward request to Gateway unchanged."""
    gateway_url = settings.gateway.url  # From GATEWAY_URL env var
    target_url = f"{gateway_url}/{path}"

    # Forward request, return response unchanged
    response = await gateway_client.request(method, target_url, body, params)
    return response
```

**Key points**:
- Gateway URL comes from `GATEWAY_URL` environment variable
- Requests are forwarded unchanged (no schema transformation)
- Responses are returned unchanged
- All requests require Basic Auth (inherited from API)

### Dashboard: Gateway Client

The Dashboard's Gateway client routes through the API proxy:

```typescript
// src/api/gateway/core/config.ts
const defaultConfig = {
  baseUrl: '/api/gateway-proxy',  // Routes through API
};

// src/api/gateway/core/fetch.ts
const headers = {
  'Content-Type': 'application/json',
  'Authorization': getAuthHeader(),  // Basic Auth for API
};
```

**Key points**:
- Base URL is `/api/gateway-proxy` (not direct Gateway URL)
- Includes Basic Auth header for API authentication
- Dashboard never connects to Gateway directly

---

## Endpoint Mapping

### Gateway Endpoints (via `/api/gateway-proxy/*`)

| Dashboard Calls | API Forwards To | Purpose |
|-----------------|-----------------|---------|
| `GET /api/gateway-proxy/` | `GET /` | Health check |
| `GET /api/gateway-proxy/status` | `GET /status` | Server status |
| `GET /api/gateway-proxy/config` | `GET /config` | Configuration |
| `* /api/gateway-proxy/wallet/*` | `* /wallet/*` | Wallet management |
| `* /api/gateway-proxy/chain/*` | `* /chain/*` | Chain operations |
| `* /api/gateway-proxy/trading/*` | `* /trading/*` | DEX trading |

### Container Management (via `/api/gateway/*`)

These endpoints manage the Gateway Docker container (not proxied):

| Endpoint | Purpose |
|----------|---------|
| `GET /api/gateway/status` | Container status |
| `POST /api/gateway/start` | Start container |
| `POST /api/gateway/stop` | Stop container |
| `GET /api/gateway/logs` | Container logs |

### Native API Endpoints (not Gateway)

| Endpoint | Data Source | Purpose |
|----------|-------------|---------|
| `/api/accounts/*` | PostgreSQL | User accounts |
| `/api/bots/*` | Docker + PostgreSQL | Bot orchestration |
| `/api/trading/*` | CEX APIs | CEX trading |
| `/api/market-data/*` | CoinGecko | Token/pool metadata |

---

## Request Flow Examples

### Example 1: User Adds a Wallet

```
1. User enters private key in Dashboard
2. Dashboard calls: POST /api/gateway-proxy/wallet/add
   - Headers: { Authorization: "Basic ..." }
   - Body: { chain: "solana", privateKey: "..." }
3. API authenticates user (Basic Auth)
4. API forwards to Gateway: POST ${GATEWAY_URL}/wallet/add
5. Gateway stores encrypted key, returns: { address: "82Sgg..." }
6. API returns unchanged: { address: "82Sgg..." }
7. Dashboard displays wallet
```

### Example 2: Gateway Health Check (Footer)

```
1. Dashboard periodically calls: GET /api/gateway-proxy/
   - Headers: { Authorization: "Basic ..." }
2. API authenticates user
3. API forwards to Gateway: GET ${GATEWAY_URL}/
4. Gateway returns: { status: "ok" }
5. API returns unchanged: { status: "ok" }
6. Dashboard shows green indicator
```

### Example 3: User Executes Swap

```
1. User configures swap in Dashboard
2. Dashboard calls: POST /api/gateway-proxy/trading/swap/execute
   - Headers: { Authorization: "Basic ..." }
   - Body: { connector, network, baseToken, quoteToken, amount, ... }
3. API authenticates user
4. API forwards to Gateway: POST ${GATEWAY_URL}/trading/swap/execute
5. Gateway builds transaction, signs with wallet, submits to blockchain
6. Gateway returns: { txHash: "...", status: "confirmed" }
7. API returns unchanged
8. Dashboard displays success
```

---

## Configuration Reference

### Hummingbot API (server-side)

```bash
# .env or environment variables
GATEWAY_URL=http://localhost:15888    # Gateway location (internal)
```

### Dashboard (client-side)

```bash
# .env
VITE_API_URL=/api                     # API base URL
VITE_API_USERNAME=admin               # Basic Auth username
VITE_API_PASSWORD=admin               # Basic Auth password
VITE_GATEWAY_URL=/api/gateway-proxy   # Gateway proxy (through API)
```

---

## Implementation Checklist

### Phase 1: Gateway Proxy (Completed)

- [x] Create `/api/gateway-proxy/*` catch-all route in API
- [x] Configure Gateway URL via `GATEWAY_URL` environment variable
- [x] Update Dashboard Gateway client to use `/api/gateway-proxy`
- [x] Add Basic Auth to Gateway client requests
- [x] Remove `/gateway` proxy from `vite.config.ts`
- [x] Update documentation

### Phase 2: API Cleanup (Pending)

Remove redundant endpoints that duplicate Gateway functionality:

**Wallet endpoints to remove from API:**
```
DELETE: GET    /accounts/gateway/wallets     (use /gateway-proxy/wallet)
DELETE: POST   /gateway/wallets/create       (use /gateway-proxy/wallet/create)
DELETE: POST   /gateway/wallets/show-private-key  (use /gateway-proxy/wallet/show-private-key)
DELETE: POST   /gateway/wallets/send         (use /gateway-proxy/wallet/send)
```

**After removal:**
- All wallet operations go through `/gateway-proxy/wallet/*`
- Container management stays at `/gateway/start`, `/gateway/stop`, `/gateway/status`

### Phase 3: Market Data (Pending)

**API Team:**
- [ ] Implement `/api/market-data/tokens` via CoinGecko
  - Search tokens by symbol
  - Return address, logo, price, metadata
  - Symbol → address resolution
- [ ] Implement `/api/market-data/pools` via CoinGecko
  - Search pools by pair
  - Return pool address, TVL, volume
  - Pair → pool address resolution
- [ ] Integrate Rate Oracle for real-time prices ([PR #106](https://github.com/hummingbot/hummingbot-api/pull/106))

**Dashboard Team:**
- [ ] Update token search to use `/api/market-data/tokens`
- [ ] Update pool discovery to use `/api/market-data/pools`
- [ ] Display token logos and prices from market data

### Phase 4: Documentation (Pending)

- [ ] Copy Gateway OpenAPI schemas into API's Swagger UI
- [ ] Document which endpoints are proxied vs native
- [ ] Add authentication requirements to API docs
- [ ] Create deployment guide for production (network isolation, etc.)

### Phase 5: Testing (Pending)

- [ ] Test all proxied Gateway endpoints work correctly
- [ ] Test auth flow (Basic Auth → Gateway proxy)
- [ ] Test with Docker Gateway setup
- [ ] Test with local Gateway setup
- [ ] End-to-end testing of wallet, swap, and LP flows

---

## References

- [Gateway OpenAPI Docs](http://localhost:15888/docs) (when running locally)
- [Hummingbot API Repository](https://github.com/hummingbot/backend-api)
- [CoinGecko API](https://www.coingecko.com/en/api)
