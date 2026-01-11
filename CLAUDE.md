# CLAUDE.md

This file provides guidance for Claude Code when working on this project.

## Project Overview

This is **Condor Dashboard**, a browser-based frontend for managing Hummingbot trading bots. It syncs with the Condor Telegram Bot for mobile monitoring and control. The dashboard interfaces with the Hummingbot Backend API server.

## Tech Stack

- **Vite** - Build tool and dev server
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Styling with `@tailwindcss/vite` plugin
- **shadcn/ui** - Component library built on Radix UI primitives
- **React Router v7** - Client-side routing
- **Lucide React** - Icons

## Key Architecture Decisions

### Global Account Context
The selected account is managed globally via `AccountProvider` in `src/components/account-provider.tsx`:
- Account selection persists to localStorage (`condor-selected-account`)
- Timezone preference stored in `condor-timezone`
- Favorite pairs stored in `condor-favorites`
- Theme stored in `condor-ui-theme`
- Available via `useAccount()` hook
- Account selector is shown in the header (upper right)
- Pages use the global account instead of their own selectors

### Configuration
Environment variables are defined in `.env` (copy from `.env.example`):
- `VITE_API_URL` - API base URL (default: `/api` for dev proxy)
- `VITE_API_USERNAME` - Basic auth username
- `VITE_API_PASSWORD` - Basic auth password

Configuration is centralized in `src/config.ts`.

### API Client Pattern
All API calls go through `src/api/client.ts`. The client:
- Uses `config.api.baseUrl` from environment
- Adds Basic Auth header from environment credentials
- Handles JSON serialization
- Exports typed API modules: `connectors`, `accounts`, `controllers`, `scripts`, `bots`, `archivedBots`, `docker`, `portfolio`, `trading`, `marketData`

**Bot Orchestration API** (`bots.*`) - For bot lifecycle management:
- `getStatus()` - Get all active bots status
- `getBotStatus(botName)` - Get specific bot status
- `getBotHistory(botName, options?)` - Get bot history with `{ days?, verbose?, precision?, timeout? }`
- `startBot(config)` - Start bot with `{ bot_name, log_level?, script?, conf?, async_backend? }`
- `stopBot(config)` - Stop bot with `{ bot_name, skip_order_cancellation?, async_backend? }`
- `stopAndArchive(botName, options?)` - Stop and archive with `{ skip_order_cancellation?, archive_locally?, s3_bucket? }`
- `restartBot(botName, skipOrderCancellation?)` - Restart bot (stop then start)
- `deployV2Controllers(config)` - Deploy controller-based bot
- `deployV2Script(config)` - Deploy script-based bot
- `getBotRuns(filter?)` - Get bot runs with `{ bot_name?, account_name?, strategy_type?, run_status?, limit?, offset? }`

**Trading API** (`trading.*`) - For connector monitoring:
- `getActiveOrders(filter)` - Get in-flight orders
- `getOrders(filter)` - Get historical orders
- `getPositions(filter)` - Get open positions (perpetual only)
- `getTrades(filter)` - Get trade history
- `getFundingPayments(filter)` - Get funding payments (perpetual only)
- `placeOrder(request)` - Place a new order
- `cancelOrder(account, connector, orderId)` - Cancel an order
- `getPositionMode(account, connector)` - Get position mode (perpetual)
- `setPositionMode(account, connector, mode)` - Set position mode (perpetual)
- `setLeverage(account, connector, pair, leverage)` - Set leverage (perpetual)

### Component Library
Use **shadcn/ui** components from `src/components/ui/`. These are:
- Built on Radix UI primitives for accessibility
- Styled with Tailwind CSS using semantic color tokens
- Located in `src/components/ui/*.tsx`

Available components:
- `Alert`, `AlertDialog` - Notifications and confirmations
- `Badge` - Labels with variants (default, secondary, destructive, outline)
- `Button` - Actions with variants (default, destructive, outline, ghost)
- `Card` - Content containers
- `Combobox` - Searchable select (uses Command + Popover)
- `Command` - Command palette / search
- `Input`, `Label` - Form inputs
- `Popover` - Floating content
- `Select` - Dropdown selection
- `Separator` - Visual dividers
- `Sheet` - Slide-out drawer (mobile navigation, side panels)
- `Sidebar` - Navigation sidebar
- `Skeleton` - Loading placeholders
- `Sonner` - Toast notifications
- `Tabs` - Tabbed interfaces
- `Tooltip` - Hover hints

### Layout Structure
- **Sidebar** - Collapsible navigation with sections:
  - Connectors: Dynamic list of connected exchanges with Spot/Perp badges + Add Keys link
  - Controllers: Strategy configuration pages
  - Bots: Active bots, deploy, and archived bots
- **Header** - Account selector (right) and theme toggle
- **Main Content** - Page content via React Router Outlet

### Theming
- CSS variables in `src/index.css` define colors for light/dark modes
- `ThemeProvider` in `src/components/theme-provider.tsx` manages theme state
- Use semantic color classes: `bg-background`, `text-foreground`, `border-border`, etc.
- Primary colors: `#00B1BB` (light), `#5FFFD7` (dark)

**Semantic Trading Colors** (use these instead of hardcoded colors):
- `text-positive`, `bg-positive` - Green for buy, success, bullish, profit
- `text-negative`, `bg-negative` - Red for sell, error, bearish, loss
- `text-warning`, `bg-warning` - Amber for warnings, caution
- `text-success`, `bg-success` - Same as positive (for UI feedback)

Example usage:
```tsx
// Good - uses semantic colors
<span className="text-positive">+$123.45</span>
<span className="text-negative">-$50.00</span>
<Button className="bg-positive hover:bg-positive/90">Buy</Button>

// Bad - hardcoded colors
<span className="text-green-500">+$123.45</span>
```

### Routing
Routes defined in `src/App.tsx`:
- `/connectors/keys` - ManageKeys (manage API keys)
- `/connectors/:connectorName` - ConnectorDetail (monitor orders, positions, trades)
- `/controllers/grid-strike` - CreateConfig
- `/bots` - ActiveBots
- `/bots/deploy` - DeployBot
- `/bots/archived` - ArchivedBots

## Responsive Design Patterns

The app is **desktop-first** but usable on mobile. Use these consistent patterns:

### Breakpoints
- `sm:` - 640px+ (small tablets, large phones in landscape)
- `md:` - 768px+ (tablets)
- `lg:` - 1024px+ (laptops)

### Layout Patterns

**Navigation:**
- Desktop: Full horizontal nav in header
- Mobile: Hamburger menu with Sheet component (slide-out drawer)
```tsx
// Layout.tsx pattern
<Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
  <SheetTrigger asChild>
    <Button variant="ghost" size="icon" className="md:hidden mr-2">
      <Menu size={20} />
    </Button>
  </SheetTrigger>
  <SheetContent side="left">...</SheetContent>
</Sheet>
<nav className="hidden md:flex">...</nav>
```

**Settings/Multi-section pages:**
- Desktop: Sidebar navigation
- Mobile: Horizontal scrollable tabs
```tsx
// Mobile tabs
<div className="md:hidden flex gap-1 overflow-x-auto">
  {sections.map(s => <button className="whitespace-nowrap">...</button>)}
</div>
// Desktop sidebar
<div className="hidden md:block w-56 border-r">...</div>
```

**Grid Layouts:**
```tsx
// 2-column → 1-column on mobile
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

// 3-column → 1-column on mobile
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

// 4-column → 2-column on mobile
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
```

### Component Patterns

**Headers with actions:**
```tsx
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
  <div>Title/Info</div>
  <div className="flex items-center gap-2 shrink-0">Actions</div>
</div>
```

**Buttons with text:**
```tsx
// Icon only on mobile, icon+text on desktop
<Button size="sm">
  <Play className="sm:mr-2" size={16} />
  <span className="hidden sm:inline">Start</span>
</Button>
```

**Tables:**
```tsx
// Hide less important columns on mobile
<th className="hidden md:table-cell">Price</th>
<td className="hidden md:table-cell">{price}</td>

// Smaller text/padding on mobile
<td className="py-2 px-2 md:px-3 text-xs md:text-sm">
```

**Tab Labels:**
```tsx
// Abbreviated labels on mobile
<TabsTrigger className="text-xs md:text-sm">
  <span className="hidden sm:inline">Controllers</span>
  <span className="sm:hidden">Ctrl</span>
  <span className="ml-1">({count})</span>
</TabsTrigger>
```

**Long content:**
```tsx
// Truncate with ellipsis
<span className="truncate">{longText}</span>

// Allow wrapping
<div className="flex flex-wrap items-center gap-2">
```

### Spacing Patterns
```tsx
// Responsive padding
className="px-4 md:px-6 py-3 md:py-4"

// Responsive gaps
className="gap-2 md:gap-4"

// Responsive text sizes
className="text-base md:text-lg"
className="text-xs md:text-sm"
```

### Hide/Show Patterns
```tsx
// Hide on mobile
className="hidden md:block"
className="hidden md:flex"

// Hide on desktop (mobile only)
className="md:hidden"
```

### Complex Layouts (TradePage)
For pages with resizable panels:
- Hide sidebar panels on mobile (order book)
- Use `lg:flex` for sidebars that need more space
- Content is accessible via tabs when hidden

```tsx
// Sidebar visible only on large screens
<div className="hidden lg:flex w-48 flex-col border-l">
```

## Code Style Guidelines

### Component Structure
```tsx
import { useState, useEffect } from 'react';
import { apiModule } from '../api/client';
import { useAccount } from '@/components/account-provider';
import { ComponentName } from '@/components/ui/component-name';

export default function PageName() {
  const { account } = useAccount();
  const [data, setData] = useState<Type[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const result = await apiModule.method();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <Loader2 className="animate-spin" />;
  if (error) return <Alert variant="destructive">{error}</Alert>;

  return (/* JSX */);
}
```

### Import Aliases
Use `@/` alias for src imports:
```tsx
import { Button } from '@/components/ui/button';
import { useAccount } from '@/components/account-provider';
import { cn } from '@/lib/utils';
```

### Styling
- Use Tailwind utility classes
- Use `cn()` helper for conditional classes
- Prefer semantic tokens over hardcoded colors
- Example: `className={cn('bg-card text-card-foreground', isActive && 'bg-primary')}`

### Shared Utilities
Located in `src/lib/`:
- `utils.ts` - General utilities (`cn()` for className merging)
- `formatting.ts` - Display formatting functions:
  - `formatConnectorName(name, stripPerpetual?)` - Format connector for display (e.g., "binance_perpetual" → "Binance Perpetual")
  - `formatBotName(name)` - Format bot name for display
  - `formatCurrency(value, decimals?, showSign?)` - Format as currency
  - `formatNumber(value, minDecimals?, maxDecimals?)` - Format with locale separators
  - `formatPercent(value, decimals?)` - Format as percentage
  - `formatDate(timestamp, options?)` - Format date/time
  - `formatRelativeTime(timestamp)` - Format as "2h ago", "3d ago", etc.
- `connectors.ts` - Connector utilities:
  - `isPerpetualConnector(name)` - Check if connector is perpetual
  - `isTestnetConnector(name)` - Check if connector is testnet

## Common Tasks

### Adding a New Page
1. Create component in `src/pages/NewPage.tsx`
2. Add route in `src/App.tsx`
3. Add navigation item in `src/components/Layout.tsx`
4. Use `useAccount()` hook if the page needs account context

### Adding a New UI Component
1. Check https://ui.shadcn.com/docs/components for existing patterns
2. Create in `src/components/ui/component-name.tsx`
3. Follow shadcn/ui patterns (forwardRef, cn utility, semantic colors)
4. Export from the file

### Adding an API Endpoint
1. Add types and methods to `src/api/client.ts`
2. Follow existing patterns for request/response handling
3. Reference `openapi.json` for exact request/response structures

## Build & Development

```bash
npm run dev      # Start dev server (http://localhost:5173)
npm run build    # Production build
npm run lint     # Run ESLint
```

The dev server proxies `/api/*` to `http://localhost:8000` (Backend API).

## Important Notes

- **No fallback data** - Always fetch from API, throw clear errors
- **No deprecated methods** - Update all references instead
- **Dynamic data** - Prefer real-time fetching over hardcoded values
- **Keep it simple** - Avoid over-engineering, only add what's needed
- **Use existing components** - Check `src/components/ui/` before creating new ones
- **Check shadcn/ui docs** - When adding new UI components, check https://ui.shadcn.com/docs/components for existing patterns and copy their implementation to ensure consistency with other components in the project
- **Use global account** - Pages should use `useAccount()` hook instead of their own account selectors
- **Terminology** - Use "Keys" instead of "Credentials" for API key management
