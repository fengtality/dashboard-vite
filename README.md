# Condor Dashboard

A modern, browser-based dashboard for managing trading bots powered by [Hummingbot](https://hummingbot.org/). Condor Dashboard syncs with the Condor Telegram Bot for mobile monitoring and control.

## Overview

This dashboard provides a frontend interface for the Hummingbot API server, allowing you to:

- **Trade** - View market data (order book, price charts), place orders, and run trading bots on spot and perpetual markets
- **AMM Markets** - Swap tokens and manage liquidity positions on DEXs via Hummingbot Gateway
- **Manage Keys** - Add and remove exchange API keys for spot and perpetual connectors
- **Strategies** - Browse, create, and configure V2 controller strategies (Grid Strike, etc.)
- **Bots** - Deploy, monitor, start/stop, and archive trading bots
- **Settings** - Configure account preferences, Gateway server, and application settings

## Tech Stack

- **Framework**: [Vite](https://vite.dev/) + [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with CSS variables for theming
- **Components**: [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/) primitives
- **Routing**: [React Router v7](https://reactrouter.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

## Prerequisites

- Node.js 20.19+ or 22.12+
- A running [Hummingbot API](https://github.com/hummingbot/hummingbot-api) server

## Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/fengtality/dashboard-vite.git
cd dashboard-vite

# Install dependencies
npm install

# Copy environment config
cp .env.example .env
```

### Environment Variables

Configure the dashboard by editing `.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `/api` | Hummingbot API URL (use `/api` for dev proxy) |
| `VITE_API_USERNAME` | `admin` | Basic auth username |
| `VITE_API_PASSWORD` | `admin` | Basic auth password |
| `VITE_GATEWAY_URL` | `/gateway` | Gateway direct URL (use `/gateway` for dev proxy) |
| `VITE_GATEWAY_API_KEY` | | Optional Gateway API key |
| `VITE_TELEGRAM_BOT_USERNAME` | `condor_tg_bot` | Condor Telegram Bot username |

**Note:** The `.env` file is git-ignored to prevent committing credentials.

### Development

```bash
# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`. It proxies API requests to `http://localhost:8000` (the Hummingbot API server).

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── api/
│   ├── gateway/              # Direct Gateway client (localhost:15888)
│   │   ├── core/             # Config, fetch utilities, errors
│   │   ├── namespaces/       # API namespaces (config, chains, pools, etc.)
│   │   ├── types/            # TypeScript interfaces
│   │   └── index.ts          # GatewayClient class
│   ├── hummingbot-api.ts     # Hummingbot Backend API client
│   └── index.ts              # Unified API facade
├── components/
│   ├── ui/                   # shadcn/ui components
│   │   ├── alert.tsx
│   │   ├── alert-dialog.tsx
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── combobox.tsx
│   │   ├── command.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── popover.tsx
│   │   ├── select.tsx
│   │   ├── separator.tsx
│   │   ├── sidebar.tsx
│   │   ├── sonner.tsx
│   │   ├── tabs.tsx
│   │   └── tooltip.tsx
│   ├── account-provider.tsx  # Global account context
│   ├── account-selector.tsx  # Account selector component
│   ├── Layout.tsx            # Main layout with sidebar & header
│   └── theme-provider.tsx    # Dark/light theme context
├── lib/
│   └── utils.ts              # Utility functions (cn, etc.)
├── pages/
│   ├── ConnectorDetail.tsx   # Connector monitoring (orders, positions, trades)
│   ├── BotDetail.tsx         # Bot monitoring and control
│   ├── ManageKeys.tsx        # Add exchange API keys
│   ├── CreateConfig.tsx      # Create V2 controller configs
│   ├── CreateScriptConfig.tsx # Create script configs
│   ├── DeployBot.tsx         # Deploy bots (V2 controllers or scripts)
│   └── ArchivedBots.tsx      # View archived bot data
├── App.tsx                   # Routes configuration
├── main.tsx                  # App entry point
└── index.css                 # Global styles & theme variables
```

## Configuration

### API Proxy

The development server proxies API requests to backend services. Configure in `vite.config.ts`:

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, ''),
    },
    '/gateway': {
      target: 'http://localhost:15888',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/gateway/, ''),
    },
  },
},
```

### Theming

The app supports light and dark modes via CSS variables defined in `src/index.css`. Theme preference is persisted to localStorage.

Primary colors:
- Light mode: `#00B1BB` (teal)
- Dark mode: `#5FFFD7` (mint)

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Backend Services

### Hummingbot API

This dashboard requires the [Hummingbot API](https://github.com/hummingbot/hummingbot-api) server running at `localhost:8000`. The API provides endpoints for:

- `/connectors` - Exchange connector management
- `/accounts` - Account and credential management
- `/controllers` - V2 controller strategy configurations
- `/scripts` - Script strategy configurations
- `/trading` - Order management, positions, trades, and funding payments
- `/market-data` - Real-time and historical market data (candles, order books, prices)
- `/bot-orchestration` - Bot deployment and control
- `/archived-bots` - Historical bot data
- `/portfolio` - Portfolio state and balances
- `/docker` - Docker container management
- `/gateway/*` - Gateway server lifecycle and DEX execution

### Hummingbot Gateway

The dashboard connects directly to [Hummingbot Gateway](https://github.com/hummingbot/gateway) at `localhost:15888` for DEX operations:

- `/config` - Gateway configuration (chains, connectors, namespaces)
- `/chain/*` - Blockchain operations (balances, tokens, transactions)
- `/amm/*` - AMM pool operations
- `/clmm/*` - Concentrated liquidity operations
- `/router/*` - DEX aggregator quotes

Gateway is started/stopped via the Hummingbot API's Docker management endpoints.

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting PRs.

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.
