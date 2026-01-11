import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { bots, controllers } from '@/api/client';
import type { BotStatus } from '@/api/client';
import {
  Loader2,
  ArrowLeft,
  Bot,
  Play,
  Square,
  Archive,
  RefreshCw,
  Activity,
  Settings,
  History,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatBotName } from '@/lib/formatting';

export default function BotDetail() {
  const { botName } = useParams<{ botName: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [botHistory, setBotHistory] = useState<unknown[]>([]);
  const [botConfigs, setBotConfigs] = useState<Record<string, unknown>[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  const displayName = botName ? formatBotName(botName) : '';
  const isRunning = botStatus?.status === 'running';

  async function fetchData() {
    if (!botName) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch bot status
      const status = await bots.getBotStatus(botName);
      setBotStatus(status);

      // Fetch bot history
      const history = await bots.getBotHistory(botName);
      setBotHistory(history);

      // Fetch bot configs
      const configs = await controllers.getBotConfigs(botName);
      setBotConfigs(configs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bot data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    // Refresh every 10 seconds when running
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [botName]);

  async function handleStart() {
    if (!botName) return;
    setActionLoading(true);
    try {
      await bots.startBot({ bot_name: botName });
      await fetchData();
      toast.success(`Bot "${botName}" started`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start bot');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleStop() {
    if (!botName) return;
    setActionLoading(true);
    try {
      await bots.stopBot(botName);
      await fetchData();
      toast.success(`Bot "${botName}" stopped`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to stop bot');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleStopAndArchive() {
    if (!botName) return;
    if (!confirm(`Stop and archive bot "${botName}"? This will save the bot's data.`)) {
      return;
    }
    setActionLoading(true);
    try {
      await bots.stopAndArchive(botName);
      toast.success(`Bot "${botName}" archived`);
      // Redirect to archived bots page after archiving
      window.location.href = '/bots/archived';
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to archive bot');
      setActionLoading(false);
    }
  }

  if (!botName) {
    return (
      <div className="max-w-4xl">
        <Alert variant="destructive">
          <AlertDescription>No bot specified</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading && !botStatus) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Link to="/bots/deploy">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft size={18} />
            </Button>
          </Link>
          <Bot size={24} className={isRunning ? 'text-success' : 'text-muted-foreground'} />
          <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
          <Badge variant={isRunning ? 'default' : 'secondary'}>
            <span className="flex items-center gap-1">
              {isRunning ? (
                <>
                  <Play size={10} fill="currentColor" />
                  Running
                </>
              ) : (
                <>
                  <Square size={10} fill="currentColor" />
                  {botStatus?.status || 'Stopped'}
                </>
              )}
            </span>
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Bot: <code className="text-sm bg-muted px-1.5 py-0.5 rounded">{botName}</code>
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 mb-6">
        {actionLoading ? (
          <Button disabled>
            <Loader2 className="animate-spin mr-2" size={16} />
            Processing...
          </Button>
        ) : (
          <>
            {!isRunning && (
              <Button
                onClick={handleStart}
                className="bg-success hover:bg-success/90"
              >
                <Play className="mr-2" size={16} />
                Start Bot
              </Button>
            )}
            {isRunning && (
              <Button
                variant="outline"
                onClick={handleStop}
                className="text-warning hover:text-warning/80 hover:bg-warning/10"
              >
                <Square className="mr-2" size={16} />
                Stop Bot
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleStopAndArchive}
            >
              <Archive className="mr-2" size={16} />
              Stop & Archive
            </Button>
            <Button variant="ghost" onClick={fetchData}>
              <RefreshCw size={16} />
            </Button>
          </>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Activity size={16} />
              <span className="text-sm">Status</span>
            </div>
            <p className={`text-2xl font-bold capitalize ${isRunning ? 'text-success' : ''}`}>
              {botStatus?.status || 'Unknown'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <FileText size={16} />
              <span className="text-sm">Controllers</span>
            </div>
            <p className="text-2xl font-bold">
              {botConfigs.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <History size={16} />
              <span className="text-sm">History Events</span>
            </div>
            <p className="text-2xl font-bold">
              {botHistory.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Settings size={16} />
              <span className="text-sm">Bot Type</span>
            </div>
            <p className="text-2xl font-bold">
              V2
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="controllers">Controllers ({botConfigs.length})</TabsTrigger>
          <TabsTrigger value="history">History ({botHistory.length})</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bot Status</CardTitle>
              <CardDescription>Current bot state and runtime information</CardDescription>
            </CardHeader>
            <CardContent>
              {botStatus ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(botStatus)
                    .filter(([key]) => key !== 'bot_name')
                    .map(([key, value]) => (
                      <div key={key} className="border border-border rounded-lg p-3">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">
                          {key.replace(/_/g, ' ')}
                        </p>
                        <p className="text-sm text-foreground font-mono mt-1">
                          {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                        </p>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No status data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Controllers Tab */}
        <TabsContent value="controllers">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Controller Configurations</CardTitle>
              <CardDescription>Active controller strategies for this bot</CardDescription>
            </CardHeader>
            <CardContent>
              {botConfigs.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No controllers configured</p>
              ) : (
                <div className="space-y-4">
                  {botConfigs.map((config, index) => (
                    <div key={index} className="border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-foreground">
                          {String(config.controller_name || `Controller ${index + 1}`)}
                        </h4>
                        <Badge variant="outline">
                          {String(config.controller_type || 'Unknown')}
                        </Badge>
                      </div>
                      <pre className="text-xs text-muted-foreground bg-muted p-2 rounded overflow-x-auto">
                        {JSON.stringify(config, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bot History</CardTitle>
              <CardDescription>Recent events and state changes</CardDescription>
            </CardHeader>
            <CardContent>
              {botHistory.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No history available</p>
              ) : (
                <div className="space-y-2">
                  {botHistory.map((event, index) => (
                    <div key={index} className="border border-border rounded-lg p-3">
                      <pre className="text-xs text-muted-foreground overflow-x-auto">
                        {JSON.stringify(event, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings size={20} />
                Bot Settings
              </CardTitle>
              <CardDescription>Configure bot parameters and behavior</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-4">
                Bot settings and configuration controls will be available here
              </p>
              {/* TODO: Bot settings controls will be implemented here */}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
