import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { config } from '@/config';
import { generateTelegramDeepLink, generateServerName } from '@/lib/deeplink';
import { useAccount } from '@/components/account-provider';
import { cn } from '@/lib/utils';
import { Send, Server, Loader2, User, Star, X } from 'lucide-react';
import { toast } from 'sonner';
import { FieldLabel } from '@/components/field-label';
import { formatConnectorName } from '@/lib/formatting';
import { isPerpetualConnector } from '@/lib/connectors';

const PUBLIC_BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'condor_tg_bot';

const sections = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'favorites', label: 'Favorites', icon: Star },
  { id: 'api-server', label: 'API Server', icon: Server },
  { id: 'telegram', label: 'Telegram Bot', icon: Send },
];

export default function AccountPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSection = searchParams.get('section') || 'account';

  const { account, setAccount, accountsList, timezone, setTimezone, favorites, removeFavorite } = useAccount();

  // Common timezones for the selector
  const timezones = [
    { value: Intl.DateTimeFormat().resolvedOptions().timeZone, label: `Local (${Intl.DateTimeFormat().resolvedOptions().timeZone})` },
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'New York (EST/EDT)' },
    { value: 'America/Chicago', label: 'Chicago (CST/CDT)' },
    { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
    { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
    { value: 'Asia/Dubai', label: 'Dubai (GST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
  ];
  const [loading, setLoading] = useState(false);
  const [botUsername, setBotUsername] = useState(PUBLIC_BOT_USERNAME);
  const [isEditingBot, setIsEditingBot] = useState(false);

  // Parse API URL to get host and port
  const apiUrl = config.api.baseUrl;
  const urlMatch = apiUrl.match(/^(https?:\/\/)?([^:/]+)(?::(\d+))?/);
  const host = urlMatch?.[2] || 'localhost';
  const port = urlMatch?.[3] ? parseInt(urlMatch[3]) : 8000;
  const [serverName, setServerName] = useState(() => generateServerName(host));

  function handleConnectTelegram() {
    if (!botUsername) {
      toast.error('Please enter a bot username');
      return;
    }

    setLoading(true);
    try {
      const link = generateTelegramDeepLink(botUsername, {
        name: serverName,
        host,
        port,
        username: config.api.username,
        password: config.api.password,
      });

      // Open in new tab
      window.open(link, '_blank');

      toast.success('Opening Telegram...');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate link');
    } finally {
      setLoading(false);
    }
  }

  function setActiveSection(section: string) {
    setSearchParams({ section });
  }

  return (
    <div className="flex flex-col md:flex-row -mt-4 md:-mt-6 -mx-4 md:-ml-6 md:mr-0 min-h-[calc(100vh-theme(spacing.14)-theme(spacing.10))]">
      {/* Mobile Section Tabs */}
      <div className="md:hidden px-4 pb-4 border-b border-border">
        <h1 className="text-lg font-semibold mb-3">Settings</h1>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-xs rounded-md whitespace-nowrap transition-colors',
                activeSection === section.id
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <section.icon size={14} />
              {section.label}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:block w-56 shrink-0 p-6 border-r border-border">
        <h1 className="text-lg font-semibold mb-4">Settings</h1>
        <nav className="flex flex-col gap-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-sm rounded-md text-left transition-colors',
                activeSection === section.id
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <section.icon size={16} />
              {section.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 p-4 md:p-6">
        {activeSection === 'account' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold mb-1">Trading Account</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Select the trading account to use for orders and portfolio tracking.
              </p>
              {accountsList.length > 0 ? (
                <Select value={account} onValueChange={setAccount}>
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accountsList.map((acc) => (
                      <SelectItem key={acc} value={acc}>
                        {acc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">No accounts available</p>
              )}
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-1">Time Zone</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Set the time zone for charts and timestamps.
              </p>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {activeSection === 'favorites' && (
          <div>
            <h2 className="text-xl font-semibold mb-1">Favorite Pairs</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Manage your favorite trading pairs for quick access.
            </p>
            {favorites.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No favorites yet. Click the star icon next to a trading pair to add it to your favorites.
              </p>
            ) : (
              <div className="space-y-6">
                {/* Spot Favorites */}
                {favorites.filter(f => !isPerpetualConnector(f.connector)).length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">Spot</h3>
                    <div className="space-y-2">
                      {favorites
                        .filter(f => !isPerpetualConnector(f.connector))
                        .map((fav) => (
                          <div
                            key={`${fav.connector}-${fav.pair}`}
                            className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-sm font-semibold">
                                {formatConnectorName(fav.connector).charAt(0)}
                              </span>
                              <div>
                                <p className="font-medium">{fav.pair}</p>
                                <p className="text-xs text-muted-foreground">{formatConnectorName(fav.connector)}</p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => removeFavorite(fav.connector, fav.pair)}
                            >
                              <X size={16} />
                            </Button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Perp Favorites */}
                {favorites.filter(f => isPerpetualConnector(f.connector)).length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">Perpetual</h3>
                    <div className="space-y-2">
                      {favorites
                        .filter(f => isPerpetualConnector(f.connector))
                        .map((fav) => (
                          <div
                            key={`${fav.connector}-${fav.pair}`}
                            className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-sm font-semibold">
                                {formatConnectorName(fav.connector).charAt(0)}
                              </span>
                              <div>
                                <p className="font-medium">{fav.pair}</p>
                                <p className="text-xs text-muted-foreground">{formatConnectorName(fav.connector)}</p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => removeFavorite(fav.connector, fav.pair)}
                            >
                              <X size={16} />
                            </Button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeSection === 'api-server' && (
          <div>
            <h2 className="text-xl font-semibold mb-1">API Server</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Connection details for the Hummingbot backend server.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Host</span>
                <p className="font-mono text-xs sm:text-sm truncate">{host}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Port</span>
                <p className="font-mono">{port}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Username</span>
                <p className="font-mono text-xs sm:text-sm truncate">{config.api.username}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Status</span>
                <p className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-success" />
                  Connected
                </p>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'telegram' && (
          <div>
            <h2 className="text-xl font-semibold mb-1">Telegram Bot</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Connect this API server to the Condor Telegram bot to deploy and manage your trading bots from anywhere.
            </p>
            <div className="space-y-6">
                {/* Condor Bot Username */}
                <div className="flex flex-col gap-1.5">
                  <FieldLabel htmlFor="botUsername" help="The Telegram username of the Condor bot you want to connect to. Use the default public bot or enter your own private Condor bot username.">
                    Condor Bot Username
                  </FieldLabel>
                  <div className="flex gap-2 items-center">
                    <Input
                      id="botUsername"
                      value={botUsername}
                      onChange={(e) => setBotUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                      disabled={!isEditingBot}
                      className="max-w-xs font-mono"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (isEditingBot) {
                          // Reset to default when done editing
                          if (!botUsername) setBotUsername(PUBLIC_BOT_USERNAME);
                        }
                        setIsEditingBot(!isEditingBot);
                      }}
                    >
                      {isEditingBot ? 'Done' : 'Change'}
                    </Button>
                  </div>
                </div>

                {/* Server Name Input */}
                <div className="flex flex-col gap-1.5">
                  <FieldLabel htmlFor="serverName" help="A unique name to identify this API server in Condor. This helps you manage multiple servers from the same Telegram bot.">
                    Server Name
                  </FieldLabel>
                  <Input
                    id="serverName"
                    value={serverName}
                    onChange={(e) => setServerName(e.target.value.replace(/[^a-zA-Z0-9_]/g, '_'))}
                    placeholder="my_server"
                    className="max-w-xs font-mono"
                  />
                </div>

              {/* Connect Button */}
              <Button
                onClick={handleConnectTelegram}
                disabled={loading || !serverName || !botUsername}
                className="w-fit"
                size="lg"
              >
                {loading ? (
                  <Loader2 className="animate-spin mr-2" size={18} />
                ) : (
                  <Send className="mr-2" size={18} />
                )}
                Connect to Telegram
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
