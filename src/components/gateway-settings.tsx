import { useState, useEffect } from 'react';
import { gatewayClient } from '@/api/gateway';
import { gateway, docker } from '@/api/hummingbot-api';
import { Loader2, Play, Square, RefreshCw, Server, Globe, Plug, Key, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface GatewayConfig {
  [namespace: string]: Record<string, unknown>;
}

interface ChainInfo {
  chain: string;
  networks: string[];
}

interface ConnectorInfo {
  name: string;
  trading_types: string[];
  chain: string;
  networks: string[];
}

export function GatewaySettings() {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [status, setStatus] = useState<'running' | 'stopped' | 'unknown'>('unknown');
  const [version, setVersion] = useState<string | null>(null);

  // Config data
  const [config, setConfig] = useState<GatewayConfig>({});
  const [chains, setChains] = useState<ChainInfo[]>([]);
  const [connectors, setConnectors] = useState<ConnectorInfo[]>([]);

  // Selection state
  const [selectedNetwork, setSelectedNetwork] = useState<string>('');
  const [selectedConnector, setSelectedConnector] = useState<string>('');

  // Edit state
  const [editedValues, setEditedValues] = useState<Record<string, Record<string, string>>>({});
  const [saving, setSaving] = useState(false);

  // Start config state
  const [passphrase, setPassphrase] = useState('');
  const [selectedImage, setSelectedImage] = useState('hummingbot/gateway:latest');
  const [availableImages, setAvailableImages] = useState<string[]>(['hummingbot/gateway:latest']);
  const [devMode, setDevMode] = useState(true);

  // Fetch all Gateway data
  async function fetchGatewayData() {
    setLoading(true);
    try {
      // Check if Gateway is running
      const health = await gatewayClient.health();
      const isRunning = health.status === 'ok';
      setStatus(isRunning ? 'running' : 'stopped');

      if (isRunning) {
        // Fetch version
        const statusInfo = await gatewayClient.status().catch(() => null);
        setVersion(statusInfo?.version || null);

        // Fetch all config, chains, and connectors in parallel
        const [configRes, chainsRes, connectorsRes] = await Promise.all([
          gatewayClient.config.getAll(),
          gatewayClient.config.getChains(),
          gatewayClient.config.getConnectors(),
        ]);

        setConfig(configRes as GatewayConfig);
        setChains(chainsRes.chains || []);
        setConnectors(connectorsRes.connectors || []);

        // Set default selections - prefer solana chain
        const chainsList = chainsRes.chains || [];
        const solanaChain = chainsList.find((c: ChainInfo) => c.chain === 'solana');
        if (solanaChain) {
          setSelectedNetwork('solana');
        } else if (chainsList.length > 0) {
          setSelectedNetwork(chainsList[0].chain);
        }
        if (connectorsRes.connectors?.length > 0) {
          setSelectedConnector(connectorsRes.connectors[0].name);
        }
      }
    } catch {
      setStatus('stopped');
    } finally {
      setLoading(false);
    }
  }

  // Fetch available Gateway images
  async function fetchAvailableImages() {
    try {
      const images = await docker.getAvailableImages('gateway');
      if (images.length > 0) {
        setAvailableImages(images);
        // Default to latest if available
        if (images.includes('hummingbot/gateway:latest')) {
          setSelectedImage('hummingbot/gateway:latest');
        } else {
          setSelectedImage(images[0]);
        }
      }
    } catch {
      // Keep default if fetch fails
    }
  }

  useEffect(() => {
    fetchGatewayData();
    fetchAvailableImages();
  }, []);

  // Gateway control actions
  async function handleStart() {
    if (!passphrase.trim()) {
      toast.error('Please enter a passphrase');
      return;
    }
    setActionLoading(true);
    try {
      await gateway.start({ passphrase, image: selectedImage, dev_mode: devMode });
      toast.success('Gateway started');
      await fetchGatewayData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start Gateway');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleStop() {
    setActionLoading(true);
    try {
      await gateway.stop();
      toast.success('Gateway stopped');
      setStatus('stopped');
      setConfig({});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to stop Gateway');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRestart() {
    setActionLoading(true);
    try {
      await gatewayClient.restart();
      toast.success('Gateway restarted');
      // Wait a moment for Gateway to restart before fetching data
      await new Promise(resolve => setTimeout(resolve, 2000));
      await fetchGatewayData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to restart Gateway');
    } finally {
      setActionLoading(false);
    }
  }

  // Save a config value
  async function saveConfigValue(namespace: string, path: string, value: string) {
    setSaving(true);
    try {
      // Try to parse as number or boolean
      let parsedValue: string | number | boolean = value;
      if (value === 'true') parsedValue = true;
      else if (value === 'false') parsedValue = false;
      else if (!isNaN(Number(value)) && value.trim() !== '') parsedValue = Number(value);

      await gatewayClient.config.update({ namespace, path, value: parsedValue });
      toast.success(`Updated ${namespace}.${path}`);

      // Refresh config
      const newConfig = await gatewayClient.config.getAll();
      setConfig(newConfig as GatewayConfig);

      // Clear edited value
      setEditedValues(prev => {
        const updated = { ...prev };
        if (updated[namespace]) {
          delete updated[namespace][path];
          if (Object.keys(updated[namespace]).length === 0) {
            delete updated[namespace];
          }
        }
        return updated;
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update config');
    } finally {
      setSaving(false);
    }
  }

  // Get network options (chains + chain-networks), sorted with Solana first
  const sortedChains = [...chains].sort((a, b) => {
    if (a.chain === 'solana') return -1;
    if (b.chain === 'solana') return 1;
    return a.chain.localeCompare(b.chain);
  });

  const networkOptions = sortedChains.flatMap(c => [
    { value: c.chain, label: c.chain, isChain: true },
    ...c.networks.map(n => ({
      value: `${c.chain}-${n}`,
      label: `${c.chain}-${n}`,
      isChain: false,
    })),
  ]);

  // Cancel edit for a specific field
  function cancelEdit(namespace: string, key: string) {
    setEditedValues(prev => {
      const updated = { ...prev };
      if (updated[namespace]) {
        delete updated[namespace][key];
        if (Object.keys(updated[namespace]).length === 0) {
          delete updated[namespace];
        }
      }
      return updated;
    });
  }

  // Render config fields for a namespace
  function renderConfigFields(namespace: string) {
    const namespaceConfig = config[namespace];
    if (!namespaceConfig || typeof namespaceConfig !== 'object') {
      return <p className="text-muted-foreground text-sm">No configuration available</p>;
    }

    return (
      <div className="space-y-3">
        {Object.entries(namespaceConfig).map(([key, value]) => {
          const originalValue = String(value ?? '');
          const currentValue = editedValues[namespace]?.[key] ?? originalValue;
          const hasChanges = editedValues[namespace]?.[key] !== undefined &&
                            editedValues[namespace]?.[key] !== originalValue;

          return (
            <div key={key} className="flex items-center gap-2">
              <Label className="w-48 text-sm shrink-0">{key}</Label>
              <div className="flex-1 relative">
                <Input
                  value={currentValue}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    if (newValue === originalValue) {
                      // If value matches original, remove from edited state
                      cancelEdit(namespace, key);
                    } else {
                      setEditedValues(prev => ({
                        ...prev,
                        [namespace]: {
                          ...prev[namespace],
                          [key]: newValue,
                        },
                      }));
                    }
                  }}
                  className={cn(
                    'h-8 text-sm pr-20',
                    hasChanges && 'border-primary'
                  )}
                />
                {hasChanges && (
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => saveConfigValue(namespace, key, currentValue)}
                      disabled={saving}
                      className="h-6 w-6 text-primary hover:text-primary hover:bg-primary/10"
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => cancelEdit(namespace, key)}
                      disabled={saving}
                      className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <X size={14} />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="animate-spin text-primary" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Server Info */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Host</span>
          <p className="font-mono text-xs sm:text-sm">localhost</p>
        </div>
        <div>
          <span className="text-muted-foreground">Port</span>
          <p className="font-mono">15888</p>
        </div>
        <div>
          <span className="text-muted-foreground">Status</span>
          <p className="flex items-center gap-2">
            <span className={cn('h-2 w-2 rounded-full', status === 'running' ? 'bg-success' : 'bg-muted-foreground')} />
            {status === 'running' ? 'Running' : 'Stopped'}
          </p>
        </div>
        <div>
          <span className="text-muted-foreground">Version</span>
          <p className="font-mono text-xs sm:text-sm">{version || '—'}</p>
        </div>
      </div>

      {/* Server Controls */}
      {status === 'running' ? (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleRestart} disabled={actionLoading}>
            <RefreshCw size={14} className={cn('mr-1', actionLoading && 'animate-spin')} />
            Restart
          </Button>
          <Button size="sm" variant="destructive" onClick={handleStop} disabled={actionLoading}>
            <Square size={14} className="mr-1" />
            Stop
          </Button>
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Start Gateway</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="passphrase">Passphrase</Label>
                <Input
                  id="passphrase"
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Enter passphrase"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="image">Docker Image</Label>
                <Select value={selectedImage} onValueChange={setSelectedImage}>
                  <SelectTrigger id="image">
                    <SelectValue placeholder="Select image" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableImages.map(img => (
                      <SelectItem key={img} value={img}>
                        {img}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Switch id="devMode" checked={devMode} onCheckedChange={setDevMode} />
                <Label htmlFor="devMode" className="cursor-pointer">Dev Mode</Label>
              </div>
              <Button onClick={handleStart} disabled={actionLoading || !passphrase.trim()}>
                {actionLoading ? (
                  <Loader2 size={14} className="mr-2 animate-spin" />
                ) : (
                  <Play size={14} className="mr-2" />
                )}
                Start Gateway
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Tabs (only when running) */}
      {status === 'running' && (
        <Tabs defaultValue="apiKeys" className="w-full">
          <TabsList className="w-full bg-transparent border-b border-border rounded-none h-auto p-0 gap-0">
            <TabsTrigger
              value="apiKeys"
              className="flex-1 text-sm py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground"
            >
              <Key size={14} className="mr-2" />
              API Keys
            </TabsTrigger>
            <TabsTrigger
              value="networks"
              className="flex-1 text-sm py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground"
            >
              <Globe size={14} className="mr-2" />
              Networks
            </TabsTrigger>
            <TabsTrigger
              value="connectors"
              className="flex-1 text-sm py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground"
            >
              <Plug size={14} className="mr-2" />
              Connectors
            </TabsTrigger>
            <TabsTrigger
              value="server"
              className="flex-1 text-sm py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground"
            >
              <Server size={14} className="mr-2" />
              Server
            </TabsTrigger>
          </TabsList>

          {/* Networks Tab */}
          <TabsContent value="networks" className="mt-4 space-y-4">
            <div className="flex items-center gap-2">
              <Label className="shrink-0">Network:</Label>
              <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select network" />
                </SelectTrigger>
                <SelectContent>
                  {networkOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                      {opt.isChain && <Badge variant="outline" className="ml-2 text-xs">chain</Badge>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedNetwork && (
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-medium">{selectedNetwork}</span>
                  {chains.find(c => c.chain === selectedNetwork) && (
                    <Badge variant="outline" className="text-xs">chain</Badge>
                  )}
                </div>
                {renderConfigFields(selectedNetwork)}
              </div>
            )}
          </TabsContent>

          {/* Connectors Tab */}
          <TabsContent value="connectors" className="mt-4 space-y-4">
            <div className="flex items-center gap-2">
              <Label className="shrink-0">Connector:</Label>
              <Select value={selectedConnector} onValueChange={setSelectedConnector}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select connector" />
                </SelectTrigger>
                <SelectContent>
                  {connectors.map(c => (
                    <SelectItem key={c.name} value={c.name}>
                      {c.name}
                      <Badge variant="outline" className="ml-2 text-xs">{c.chain}</Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedConnector && (() => {
              const connector = connectors.find(c => c.name === selectedConnector);
              return (
                <div className="pt-2 space-y-4">
                  {/* Connector Info */}
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{selectedConnector}</span>
                    <Badge variant="outline">{connector?.chain}</Badge>
                  </div>

                  {/* Trading Types */}
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">Trading Types</Label>
                    <div className="flex items-center gap-2">
                      {connector?.trading_types.map(type => (
                        <Badge key={type} variant="secondary" className="uppercase text-xs">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Config Fields */}
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">Configuration</Label>
                    {renderConfigFields(selectedConnector)}
                  </div>
                </div>
              );
            })()}
          </TabsContent>

          {/* API Keys Tab */}
          <TabsContent value="apiKeys" className="mt-4">
            {renderConfigFields('apiKeys')}
          </TabsContent>

          {/* Server Tab */}
          <TabsContent value="server" className="mt-4">
            {renderConfigFields('server')}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
