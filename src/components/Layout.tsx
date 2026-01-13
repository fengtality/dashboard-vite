import { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  Key,
  Plug,
  Bot,
  Zap,
  Sun,
  Moon,
  Settings,
  Menu,
  Droplets,
} from 'lucide-react';
import logoLight from '@/assets/condor-logo-trans-light.png';
import logoDark from '@/assets/condor-logo-trans-dark.png';
import { accounts } from '@/api/hummingbot-api';
import { useGatewayStatus } from '@/components/gateway-status-provider';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

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

const mobileNavLinkStyle = "flex items-center gap-3 rounded-md px-3 py-3 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground";

function NavLink({ to, children, isActive }: { to: string; children: React.ReactNode; isActive?: boolean }) {
  return (
    <Link to={to} className={cn(navLinkStyle, isActive && 'bg-accent/50')}>
      {children}
    </Link>
  );
}

function MobileNavLink({ to, children, isActive, onClick }: { to: string; children: React.ReactNode; isActive?: boolean; onClick?: () => void }) {
  return (
    <Link to={to} className={cn(mobileNavLinkStyle, isActive && 'bg-accent/50')} onClick={onClick}>
      {children}
    </Link>
  );
}


export default function Layout() {
  const location = useLocation();
  const { theme } = useTheme();
  const { status: gatewayStatus } = useGatewayStatus();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [apiRunning, setApiRunning] = useState<boolean | null>(null);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const logo = theme === 'dark' ? logoDark : logoLight;

  // Check API status periodically
  useEffect(() => {
    async function checkApi() {
      try {
        await accounts.list();
        setApiRunning(true);
      } catch {
        setApiRunning(false);
      }
    }

    checkApi();
    const interval = setInterval(checkApi, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top Navigation Bar */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4 md:px-6">
          {/* Logo */}
          <Link to="/" className="flex items-center mr-6">
            <img src={logo} alt="Condor" className="h-8 w-8" />
            <span className="text-lg font-bold">Condor</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/trade/spot" isActive={location.pathname === '/trade/spot'}>
              <Plug size={16} className="mr-2" />
              Spot Markets
            </NavLink>

            <NavLink to="/trade/perp" isActive={location.pathname === '/trade/perp'}>
              <Zap size={16} className="mr-2" />
              Perp Markets
            </NavLink>

            <NavLink to="/trade/amm" isActive={location.pathname === '/trade/amm'}>
              <Droplets size={16} className="mr-2" />
              AMM Markets
            </NavLink>

            <NavLink to="/bots" isActive={location.pathname.startsWith('/bots')}>
              <Bot size={16} className="mr-2" />
              Bots
            </NavLink>

            <NavLink to="/strategies" isActive={location.pathname.startsWith('/strategies')}>
              <Zap size={16} className="mr-2" />
              Strategies
            </NavLink>
          </nav>

          {/* Right side - Keys, Account & Theme */}
          <div className="ml-auto flex items-center gap-1">
            <div className="hidden md:flex items-center gap-1">
              <NavLink to="/keys" isActive={location.pathname === '/keys'}>
                <Key size={16} className="mr-2" />
                Keys
              </NavLink>
              <NavLink to="/settings" isActive={location.pathname.startsWith('/settings')}>
                <Settings size={16} className="mr-2" />
                Settings
              </NavLink>
            </div>
            {/* Theme toggle - desktop only */}
            <div className="hidden md:block">
              <ThemeToggle />
            </div>
            {/* Mobile Menu Button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu size={20} />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-0 flex flex-col">
                <SheetHeader className="border-b border-border px-4 py-4">
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col p-4 gap-1 flex-1">
                  <MobileNavLink to="/trade/spot" isActive={location.pathname === '/trade/spot'} onClick={closeMobileMenu}>
                    <Plug size={20} />
                    Spot Markets
                  </MobileNavLink>

                  <MobileNavLink to="/trade/perp" isActive={location.pathname === '/trade/perp'} onClick={closeMobileMenu}>
                    <Zap size={20} />
                    Perp Markets
                  </MobileNavLink>

                  <MobileNavLink to="/trade/amm" isActive={location.pathname === '/trade/amm'} onClick={closeMobileMenu}>
                    <Droplets size={20} />
                    AMM Markets
                  </MobileNavLink>

                  <MobileNavLink to="/bots" isActive={location.pathname.startsWith('/bots')} onClick={closeMobileMenu}>
                    <Bot size={20} />
                    Bots
                  </MobileNavLink>

                  <MobileNavLink to="/strategies" isActive={location.pathname.startsWith('/strategies')} onClick={closeMobileMenu}>
                    <Zap size={20} />
                    Strategies
                  </MobileNavLink>

                  <div className="border-t border-border my-2" />

                  <MobileNavLink to="/keys" isActive={location.pathname === '/keys'} onClick={closeMobileMenu}>
                    <Key size={20} />
                    Keys
                  </MobileNavLink>

                  <MobileNavLink to="/settings" isActive={location.pathname.startsWith('/settings')} onClick={closeMobileMenu}>
                    <Settings size={20} />
                    Settings
                  </MobileNavLink>

                  <div className="mt-auto pt-4 border-t border-border">
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-sm text-muted-foreground">Theme</span>
                      <ThemeToggle />
                    </div>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6 py-2">
        <div className="flex items-center justify-end text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            {/* API Status */}
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                {apiRunning ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                  </>
                ) : apiRunning === false ? (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
                ) : (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-muted-foreground animate-pulse"></span>
                )}
              </span>
              <span>Hummingbot API</span>
            </div>
            {/* Gateway Status */}
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                {gatewayStatus === 'running' ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                  </>
                ) : gatewayStatus === 'stopped' ? (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-muted-foreground"></span>
                ) : (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-muted-foreground animate-pulse"></span>
                )}
              </span>
              <span>Gateway</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
