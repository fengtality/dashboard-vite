import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  Key,
  Zap,
  Bot,
  Rocket,
  Archive,
  ChevronDown,
  Sun,
  Moon,
  Plug,
  Square,
  FileCode,
  SlidersHorizontal,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import * as Collapsible from '@radix-ui/react-collapsible';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';
import { useAccount } from '@/components/account-provider';
import { AccountSelector } from '@/components/account-selector';
import { accounts, bots } from '@/api/client';
import type { BotStatus } from '@/api/client';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

// Helper to check if connector is perpetual
function isPerpetualConnector(name: string): boolean {
  return name.endsWith('_perpetual') || name.endsWith('_perpetual_testnet');
}

// Helper to format connector name for display
function formatConnectorName(name: string): string {
  let displayName = name
    .replace(/_perpetual_testnet$/, '')
    .replace(/_perpetual$/, '');

  displayName = displayName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return displayName;
}

// Helper to format bot name for display
function formatBotName(name: string): string {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const staticNavSections: NavSection[] = [
  {
    title: 'Strategies',
    items: [
      {
        label: 'Grid Strike',
        path: '/controllers/grid-strike',
        icon: <Zap size={18} />,
      },
      {
        label: 'Controllers',
        path: '/controllers',
        icon: <SlidersHorizontal size={18} />,
      },
      {
        label: 'Scripts',
        path: '/scripts',
        icon: <FileCode size={18} />,
      },
    ],
  },
];

function NavSectionComponent({ section }: { section: NavSection }) {
  const [isOpen, setIsOpen] = useState(true);
  const location = useLocation();

  return (
    <Collapsible.Root open={isOpen} onOpenChange={setIsOpen} className="mb-2">
      <Collapsible.Trigger asChild>
        <button
          className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
        >
          <span>{section.title}</span>
          <ChevronDown
            size={14}
            className={cn(
              'transition-transform duration-200',
              !isOpen && '-rotate-90'
            )}
          />
        </button>
      </Collapsible.Trigger>
      <Collapsible.Content className="data-[state=closed]:animate-collapse-up data-[state=open]:animate-collapse-down">
        <SidebarMenu>
          {section.items.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton asChild isActive={isActive}>
                  <Link to={item.path} className="flex items-center justify-between w-full">
                    <span className="flex items-center gap-2">
                      {item.icon}
                      {item.label}
                    </span>
                    {item.badge}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

function ConnectorsSection() {
  const [isOpen, setIsOpen] = useState(true);
  const [connectedConnectors, setConnectedConnectors] = useState<string[]>([]);
  const { account } = useAccount();
  const location = useLocation();

  useEffect(() => {
    async function fetchConnectors() {
      if (!account) {
        setConnectedConnectors([]);
        return;
      }
      try {
        const creds = await accounts.getCredentials(account);
        setConnectedConnectors(creds);
      } catch {
        setConnectedConnectors([]);
      }
    }
    fetchConnectors();
  }, [account]);

  // Build connector items with badges
  const connectorItems: NavItem[] = connectedConnectors
    .sort((a, b) => a.localeCompare(b))
    .map((connector) => {
      const isPerp = isPerpetualConnector(connector);
      const displayName = formatConnectorName(connector);
      return {
        label: displayName,
        path: `/connectors/${connector}`,
        icon: <Plug size={18} />,
        badge: (
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0"
          >
            {isPerp ? 'Perp' : 'Spot'}
          </Badge>
        ),
      };
    });

  // Always show "Add Keys" at the end
  const allItems: NavItem[] = [
    ...connectorItems,
    { label: 'Add Keys', path: '/connectors/keys', icon: <Key size={18} /> },
  ];

  return (
    <Collapsible.Root open={isOpen} onOpenChange={setIsOpen} className="mb-2">
      <Collapsible.Trigger asChild>
        <button
          className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
        >
          <span>Connectors</span>
          <ChevronDown
            size={14}
            className={cn(
              'transition-transform duration-200',
              !isOpen && '-rotate-90'
            )}
          />
        </button>
      </Collapsible.Trigger>
      <Collapsible.Content className="data-[state=closed]:animate-collapse-up data-[state=open]:animate-collapse-down">
        <SidebarMenu>
          {allItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            return (
              <SidebarMenuItem key={item.path + index}>
                <SidebarMenuButton asChild isActive={isActive}>
                  <Link to={item.path} className="flex items-center justify-between w-full">
                    <span className="flex items-center gap-2">
                      {item.icon}
                      {item.label}
                    </span>
                    {item.badge}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

function BotsSection() {
  const [isOpen, setIsOpen] = useState(true);
  const [activeBots, setActiveBots] = useState<Record<string, BotStatus>>({});
  const location = useLocation();

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

    // Refresh every 30 seconds
    const interval = setInterval(fetchBots, 30000);
    return () => clearInterval(interval);
  }, []);

  // Build bot items with status badges
  const botItems: NavItem[] = Object.entries(activeBots)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([botName, status]) => {
      const isRunning = status.status === 'running';
      return {
        label: formatBotName(botName),
        path: `/bots/${botName}`,
        icon: <Bot size={18} />,
        badge: (
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0"
          >
            {isRunning ? (
              <span className="flex items-center gap-1">
                <Square size={8} fill="currentColor" className="text-green-500" />
                Running
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Square size={8} fill="currentColor" />
                Stopped
              </span>
            )}
          </Badge>
        ),
      };
    });

  // Static items at the end
  const staticItems: NavItem[] = [
    { label: 'Deploy', path: '/bots/deploy', icon: <Rocket size={18} /> },
    { label: 'Archived', path: '/bots/archived', icon: <Archive size={18} /> },
  ];

  const allItems = [...botItems, ...staticItems];

  return (
    <Collapsible.Root open={isOpen} onOpenChange={setIsOpen} className="mb-2">
      <Collapsible.Trigger asChild>
        <button
          className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
        >
          <span>Bots</span>
          <ChevronDown
            size={14}
            className={cn(
              'transition-transform duration-200',
              !isOpen && '-rotate-90'
            )}
          />
        </button>
      </Collapsible.Trigger>
      <Collapsible.Content className="data-[state=closed]:animate-collapse-up data-[state=open]:animate-collapse-down">
        <SidebarMenu>
          {allItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            return (
              <SidebarMenuItem key={item.path + index}>
                <SidebarMenuButton asChild isActive={isActive}>
                  <Link to={item.path} className="flex items-center justify-between w-full">
                    <span className="flex items-center gap-2">
                      {item.icon}
                      {item.label}
                    </span>
                    {item.badge}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </Collapsible.Content>
    </Collapsible.Root>
  );
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

export default function Layout() {
  return (
    <div className="flex h-full bg-background">
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Bot size={24} className="text-primary" />
            <div>
              <h1 className="text-lg font-bold text-foreground">Hummingbot</h1>
              <p className="text-xs text-muted-foreground">Dashboard</p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          {/* Connectors Section - Dynamic */}
          <ConnectorsSection />

          {/* Static Nav Sections */}
          {staticNavSections.map((section) => (
            <NavSectionComponent key={section.title} section={section} />
          ))}

          {/* Bots Section - Dynamic */}
          <BotsSection />
        </SidebarContent>

        <SidebarFooter>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-xs text-muted-foreground">API: localhost:8000</span>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="flex flex-col h-full !overflow-auto">
        {/* Header with Account Selector */}
        <header className="flex items-center justify-between h-14 px-6 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0">
          <div className="flex items-center gap-4">
            {/* Placeholder for breadcrumbs or page title if needed */}
          </div>
          <div className="flex items-center gap-3">
            <AccountSelector />
            <ThemeToggle />
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </div>
  );
}
