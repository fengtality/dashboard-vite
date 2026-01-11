import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { config } from '@/config';
import { generateTelegramDeepLink, generateServerName } from '@/lib/deeplink';
import { useAccount } from '@/components/account-provider';
import { cn } from '@/lib/utils';
import { Send, Server, Loader2, User, Star, X, Waypoints, Play, Square, RefreshCw, ChevronDown, Globe, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { FieldLabel } from '@/components/field-label';
import { formatConnectorName } from '@/lib/formatting';
import { isPerpetualConnector } from '@/lib/connectors';
import { gateway } from '@/api/client';
import type { GatewayNetwork, GatewayWallet } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import * as Collapsible from '@radix-ui/react-collapsible';

const PUBLIC_BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'condor_tg_bot';

const sections = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'favorites', label: 'Favorites', icon: Star },
  { id: 'gateway', label: 'Gateway', icon: Waypoints },
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

  // Gateway state
  const [gatewayStatus, setGatewayStatus] = useState<'running' | 'stopped' | 'unknown'>('unknown');
  const [gatewayVersion, setGatewayVersion] = useState<string | null>(null);
  const [gatewayLoading, setGatewayLoading] = useState(false);
  const [gatewayActionLoading, setGatewayActionLoading] = useState(false);
  const [networks, setNetworks] = useState<GatewayNetwork[]>([]);
  const [wallets, setWallets] = useState<GatewayWallet[]>([]);
  const [expandedNetwork, setExpandedNetwork] = useState<string | null>(null);
  const [networkConfigs, setNetworkConfigs] = useState<Record<string, Record<string, unknown>>>({});
  const [editingNodeUrl, setEditingNodeUrl] = useState<Record<string, string>>({});

  // Parse API URL to get host and port
  const apiUrl = config.api.baseUrl;
  const urlMatch = apiUrl.match(/^(https?:\/\/)?([^:/]+)(?::(\d+))?/);
  const host = urlMatch?.[2] || 'localhost';
  const port = urlMatch?.[3] ? parseInt(urlMatch[3]) : 8000;
  const [serverName, setServerName] = useState(() => generateServerName(host));

  // Fetch Gateway status and data
  async function fetchGatewayData() {
    setGatewayLoading(true);
    try {
      const status = await gateway.getStatus();
      setGatewayStatus(status.status === 'running' ? 'running' : 'stopped');
      setGatewayVersion(status.gateway_version || null);

      if (status.status === 'running') {
        // Fetch networks and wallets
        const [networksRes, walletsRes] = await Promise.all([
          gateway.listNetworks().catch(() => ({ networks: [] })),
          gateway.listWallets().catch(() => []),
        ]);
        setNetworks(networksRes.networks || []);
        setWallets(walletsRes || []);
      }
    } catch {
      setGatewayStatus('stopped');
      setNetworks([]);
      setWallets([]);
    } finally {
      setGatewayLoading(false);
    }
  }

  // Fetch on mount when gateway section is active
  useEffect(() => {
    if (activeSection === 'gateway') {
      fetchGatewayData();
    }
  }, [activeSection]);

  async function handleGatewayStart() {
    setGatewayActionLoading(true);
    try {
      await gateway.start();
      toast.success('Gateway started');
      await fetchGatewayData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start Gateway');
    } finally {
      setGatewayActionLoading(false);
    }
  }

  async function handleGatewayStop() {
    setGatewayActionLoading(true);
    try {
      await gateway.stop();
      toast.success('Gateway stopped');
      setGatewayStatus('stopped');
      setNetworks([]);
      setWallets([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to stop Gateway');
    } finally {
      setGatewayActionLoading(false);
    }
  }

  async function handleGatewayRestart() {
    setGatewayActionLoading(true);
    try {
      await gateway.restart();
      toast.success('Gateway restarted');
      await fetchGatewayData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to restart Gateway');
    } finally {
      setGatewayActionLoading(false);
    }
  }

  async function fetchNetworkConfig(networkId: string) {
    try {
      const config = await gateway.getNetworkConfig(networkId);
      setNetworkConfigs(prev => ({ ...prev, [networkId]: config }));
      if (config.nodeURL) {
        setEditingNodeUrl(prev => ({ ...prev, [networkId]: config.nodeURL as string }));
      }
    } catch (err) {
      console.error('Failed to fetch network config:', err);
    }
  }

  async function handleUpdateNodeUrl(networkId: string) {
    const newUrl = editingNodeUrl[networkId];
    if (!newUrl) return;

    try {
      await gateway.updateNetworkConfig(networkId, { nodeURL: newUrl });
      toast.success(`Updated ${networkId} node URL`);
      setNetworkConfigs(prev => ({
        ...prev,
        [networkId]: { ...prev[networkId], nodeURL: newUrl }
      }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update node URL');
    }
  }

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

        {activeSection === 'gateway' && (
          <div className="space-y-8">
            {/* Gateway Status & Controls */}
            <div>
              <h2 className="text-xl font-semibold mb-1">Gateway Server</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Manage the Hummingbot Gateway server for DEX trading.
              </p>

              {gatewayLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="animate-spin" size={16} />
                  <span>Loading Gateway status...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Status */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "h-2.5 w-2.5 rounded-full",
                        gatewayStatus === 'running' ? "bg-success" : "bg-muted-foreground"
                      )} />
                      <span className="font-medium capitalize">{gatewayStatus}</span>
                      {gatewayVersion && (
                        <Badge variant="secondary" className="text-xs">v{gatewayVersion}</Badge>
                      )}
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex flex-wrap gap-2">
                    {gatewayStatus === 'running' ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleGatewayStop}
                          disabled={gatewayActionLoading}
                        >
                          {gatewayActionLoading ? (
                            <Loader2 className="animate-spin mr-2" size={14} />
                          ) : (
                            <Square size={14} className="mr-2" />
                          )}
                          Stop
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleGatewayRestart}
                          disabled={gatewayActionLoading}
                        >
                          <RefreshCw size={14} className="mr-2" />
                          Restart
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={handleGatewayStart}
                        disabled={gatewayActionLoading}
                      >
                        {gatewayActionLoading ? (
                          <Loader2 className="animate-spin mr-2" size={14} />
                        ) : (
                          <Play size={14} className="mr-2" />
                        )}
                        Start Gateway
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={fetchGatewayData}
                      disabled={gatewayLoading}
                    >
                      <RefreshCw size={14} />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Networks */}
            {gatewayStatus === 'running' && networks.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                  <Globe size={18} />
                  Networks
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Configure RPC endpoints for each blockchain network.
                </p>
                <div className="space-y-2">
                  {networks.map((network) => (
                    <Collapsible.Root
                      key={network.network_id}
                      open={expandedNetwork === network.network_id}
                      onOpenChange={(open) => {
                        setExpandedNetwork(open ? network.network_id : null);
                        if (open && !networkConfigs[network.network_id]) {
                          fetchNetworkConfig(network.network_id);
                        }
                      }}
                    >
                      <Collapsible.Trigger asChild>
                        <button className="w-full flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-xs font-semibold uppercase">
                              {network.chain?.slice(0, 2) || '??'}
                            </span>
                            <div className="text-left">
                              <p className="font-medium">{network.network_id}</p>
                              <p className="text-xs text-muted-foreground">{network.chain} • {network.network}</p>
                            </div>
                          </div>
                          <ChevronDown
                            size={16}
                            className={cn(
                              "text-muted-foreground transition-transform",
                              expandedNetwork === network.network_id && "rotate-180"
                            )}
                          />
                        </button>
                      </Collapsible.Trigger>
                      <Collapsible.Content className="mt-2 p-4 rounded-lg border border-border bg-muted/30">
                        {networkConfigs[network.network_id] ? (
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm text-muted-foreground">Node URL (RPC Endpoint)</label>
                              <div className="flex gap-2 mt-1">
                                <Input
                                  value={editingNodeUrl[network.network_id] || ''}
                                  onChange={(e) => setEditingNodeUrl(prev => ({
                                    ...prev,
                                    [network.network_id]: e.target.value
                                  }))}
                                  placeholder="https://..."
                                  className="font-mono text-sm"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateNodeUrl(network.network_id)}
                                  disabled={editingNodeUrl[network.network_id] === networkConfigs[network.network_id]?.nodeURL}
                                >
                                  Save
                                </Button>
                              </div>
                            </div>
                            {network.nativeCurrencySymbol && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">Native Currency: </span>
                                <span className="font-medium">{network.nativeCurrencySymbol}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="animate-spin" size={14} />
                            <span className="text-sm">Loading config...</span>
                          </div>
                        )}
                      </Collapsible.Content>
                    </Collapsible.Root>
                  ))}
                </div>
              </div>
            )}

            {/* Wallets */}
            {gatewayStatus === 'running' && wallets.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                  <Wallet size={18} />
                  Wallets
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Connected wallet addresses by chain.
                </p>
                <div className="space-y-3">
                  {wallets.map((wallet) => (
                    <div key={wallet.chain} className="p-3 rounded-lg border border-border bg-card">
                      <p className="font-medium capitalize mb-2">{wallet.chain}</p>
                      <div className="space-y-1">
                        {wallet.walletAddresses.map((addr) => (
                          <p key={addr} className="font-mono text-xs text-muted-foreground truncate">
                            {addr}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state when Gateway is stopped */}
            {gatewayStatus !== 'running' && !gatewayLoading && (
              <div className="text-center py-8 text-muted-foreground">
                <Waypoints size={48} className="mx-auto mb-4 opacity-50" />
                <p>Start the Gateway server to configure networks and wallets.</p>
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
