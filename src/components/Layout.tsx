import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  Key,
  Plug,
  Bot,
  Zap,
  Sun,
  Moon,
  Rocket,
  Archive,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';
import { AccountSelector } from '@/components/account-selector';
import { bots } from '@/api/client';
import type { BotStatus } from '@/api/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function formatBotName(name: string): string {
  return name
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="h-8 w-8"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

const navLinkStyle = "inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none";

function NavLink({ to, children, isActive }: { to: string; children: React.ReactNode; isActive?: boolean }) {
  return (
    <Link to={to} className={cn(navLinkStyle, isActive && 'bg-accent/50')}>
      {children}
    </Link>
  );
}

function BotsDropdown() {
  const [activeBots, setActiveBots] = useState<Record<string, BotStatus>>({});

  useEffect(() => {
    async function fetchBots() {
      try {
        const status = await bots.getStatus();
        setActiveBots(status);
      } catch {
        setActiveBots({});
      }
    }
    fetchBots();
    const interval = setInterval(fetchBots, 30000);
    return () => clearInterval(interval);
  }, []);

  const runningBots = Object.entries(activeBots)
    .filter(([, status]) => status.status === 'running')
    .sort(([a], [b]) => a.localeCompare(b));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(navLinkStyle, 'gap-1')}>
        <Bot size={16} />
        Bots
        <ChevronDown size={14} className="opacity-50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {runningBots.length > 0 && (
          <>
            {runningBots.map(([botName]) => (
              <DropdownMenuItem key={botName} asChild>
                <Link to={`/bots/${botName}`} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  {formatBotName(botName)}
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem asChild>
          <Link to="/bots/deploy" className="flex items-center gap-2">
            <Rocket size={14} />
            Deploy
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/bots/archived" className="flex items-center gap-2">
            <Archive size={14} />
            Archived
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function StrategiesDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(navLinkStyle, 'gap-1')}>
        <Zap size={16} />
        Strategies
        <ChevronDown size={14} className="opacity-50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem asChild>
          <Link to="/controllers/grid-strike" className="flex items-center gap-2">
            <Zap size={14} />
            Grid Strike
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/controllers" className="flex items-center gap-2">
            <SlidersHorizontal size={14} />
            Configs
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Layout() {
  const location = useLocation();

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top Navigation Bar */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 mr-6">
            <Bot size={24} className="text-primary" />
            <span className="text-lg font-bold">Hummingbot</span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            <NavLink to="/keys" isActive={location.pathname === '/keys'}>
              <Key size={16} className="mr-2" />
              Keys
            </NavLink>

            <NavLink to="/trade/spot" isActive={location.pathname === '/trade/spot'}>
              <Plug size={16} className="mr-2" />
              Spot Markets
            </NavLink>

            <NavLink to="/trade/perp" isActive={location.pathname === '/trade/perp'}>
              <Zap size={16} className="mr-2" />
              Perp Markets
            </NavLink>

            <BotsDropdown />
            <StrategiesDropdown />
          </nav>

          {/* Right side - Account & Theme */}
          <div className="ml-auto flex items-center gap-3">
            <AccountSelector />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30 px-6 py-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span>API: localhost:8000</span>
          </div>
          <span>Hummingbot Dashboard v1.0</span>
        </div>
      </footer>
    </div>
  );
}
