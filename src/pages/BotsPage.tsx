import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { bots, archivedBots } from '@/api/hummingbot-api';
import type { BotStatus, ArchivedBot, PerformanceData } from '@/api/hummingbot-api';
import {
  Loader2,
  Bot,
  Archive,
  Rocket,
  Play,
  Square,
  ChevronDown,
  ChevronRight,
  Activity,
  Zap,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty';
import { MetricCard } from '@/components/metric-card';
import { formatBotName } from '@/lib/formatting';
import { toast } from 'sonner';

export default function BotsPage() {
  const navigate = useNavigate();
  const [activeBots, setActiveBots] = useState<Record<string, BotStatus>>({});
  const [archivedBotsList, setArchivedBotsList] = useState<ArchivedBot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Archived bot expansion state
  const [expandedBot, setExpandedBot] = useState<string | null>(null);
  const [botData, setBotData] = useState<{
    summary: Record<string, unknown> | null;
    performance: PerformanceData | null;
  }>({ summary: null, performance: null });
  const [loadingData, setLoadingData] = useState(false);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const [status, archived] = await Promise.all([
        bots.getStatus(),
        archivedBots.list(),
      ]);
      setActiveBots(status);
      setArchivedBotsList(archived);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bots');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function handleStart(botName: string) {
    setActionLoading(botName);
    try {
      await bots.startBot({ bot_name: botName });
      await fetchData();
      toast.success(`Bot "${botName}" started`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start bot');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleStop(botName: string) {
    setActionLoading(botName);
    try {
      await bots.stopBot({ bot_name: botName });
      await fetchData();
      toast.success(`Bot "${botName}" stopped`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to stop bot');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleExpandArchived(dbPath: string) {
    if (expandedBot === dbPath) {
      setExpandedBot(null);
      setBotData({ summary: null, performance: null });
      return;
    }

    setExpandedBot(dbPath);
    setLoadingData(true);
    try {
      const [summary, performance] = await Promise.all([
        archivedBots.getSummary(dbPath),
        archivedBots.getPerformance(dbPath),
      ]);
      setBotData({ summary, performance });
    } catch {
      setBotData({ summary: null, performance: null });
    } finally {
      setLoadingData(false);
    }
  }

  const botEntries = Object.entries(activeBots).sort(([a], [b]) => a.localeCompare(b));
  const runningBots = botEntries.filter(([, status]) => status.status === 'running');
  const stoppedBots = botEntries.filter(([, status]) => status.status !== 'running');
  const hasActiveBots = botEntries.length > 0;
  const hasArchivedBots = archivedBotsList.length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-4 text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Bots</h1>
        <p className="text-muted-foreground mt-1">
          Manage your trading bots
        </p>
      </div>

      <Tabs defaultValue="active">
        <TabsList className="bg-transparent h-auto p-0 gap-0 border-b border-border rounded-none w-full justify-start mb-6">
          <TabsTrigger
            value="active"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3"
          >
            <Bot className="h-4 w-4 mr-2" />
            Active ({botEntries.length})
          </TabsTrigger>
          <TabsTrigger
            value="archived"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3"
          >
            <Archive className="h-4 w-4 mr-2" />
            Archived ({archivedBotsList.length})
          </TabsTrigger>
        </TabsList>

        {/* Active Bots Tab */}
        <TabsContent value="active">
          {!hasActiveBots ? (
            <Card>
              <CardContent className="p-0">
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Bot size={24} className="text-muted-foreground" />
                    </EmptyMedia>
                    <EmptyTitle>No Bots Yet</EmptyTitle>
                    <EmptyDescription>
                      Deploy your first trading bot to get started with automated trading.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <div className="flex gap-2">
                      <Button onClick={() => navigate('/bots/deploy')}>
                        <Rocket size={16} className="mr-2" />
                        Deploy Bot
                      </Button>
                      <Button variant="outline" onClick={() => navigate('/strategies/grid-strike')}>
                        <Zap size={16} className="mr-2" />
                        Create Strategy
                      </Button>
                    </div>
                  </EmptyContent>
                </Empty>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {/* Running Bots */}
              {runningBots.map(([botName, status]) => (
                <BotCard
                  key={botName}
                  botName={botName}
                  status={status}
                  isLoading={actionLoading === botName}
                  onStart={() => handleStart(botName)}
                  onStop={() => handleStop(botName)}
                />
              ))}

              {/* Stopped Bots */}
              {stoppedBots.map(([botName, status]) => (
                <BotCard
                  key={botName}
                  botName={botName}
                  status={status}
                  isLoading={actionLoading === botName}
                  onStart={() => handleStart(botName)}
                  onStop={() => handleStop(botName)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Archived Bots Tab */}
        <TabsContent value="archived">
          {!hasArchivedBots ? (
            <Card>
              <CardContent className="p-0">
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Archive size={24} className="text-muted-foreground" />
                    </EmptyMedia>
                    <EmptyTitle>No Archived Bots</EmptyTitle>
                    <EmptyDescription>
                      Archived bots will appear here after you stop and archive them.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {archivedBotsList.map((bot) => {
                const dbPath = bot.db_path;
                const botName = dbPath.split('/').pop()?.replace('.db', '') || dbPath;

                return (
                  <Card key={dbPath} className="overflow-hidden">
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50"
                      onClick={() => handleExpandArchived(dbPath)}
                    >
                      <div className="flex items-center gap-3">
                        {expandedBot === dbPath ? (
                          <ChevronDown className="text-muted-foreground" size={20} />
                        ) : (
                          <ChevronRight className="text-muted-foreground" size={20} />
                        )}
                        <Archive className="text-purple-500" size={20} />
                        <div>
                          <span className="font-medium text-foreground">{formatBotName(botName)}</span>
                          <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                            {dbPath}
                          </p>
                        </div>
                      </div>
                    </div>

                    {expandedBot === dbPath && (
                      <div className="border-t border-border p-4 bg-muted/30">
                        {loadingData ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="animate-spin text-muted-foreground" size={24} />
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {/* Performance Metrics */}
                            {botData.performance && (
                              <div>
                                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                                  <Activity size={16} />
                                  Performance Metrics
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <MetricCard
                                    label="Total PnL"
                                    value={botData.performance.total_pnl}
                                    format="currency"
                                  />
                                  <MetricCard
                                    label="Total Volume"
                                    value={botData.performance.total_volume}
                                    format="currency"
                                  />
                                  {Object.entries(botData.performance)
                                    .filter(
                                      ([key]) =>
                                        !['total_pnl', 'total_volume'].includes(key)
                                    )
                                    .slice(0, 2)
                                    .map(([key, value]) => (
                                      <MetricCard
                                        key={key}
                                        label={key.replace(/_/g, ' ')}
                                        value={value as number}
                                      />
                                    ))}
                                </div>
                              </div>
                            )}

                            {/* Summary */}
                            {botData.summary && (
                              <div>
                                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                                  Summary
                                </h3>
                                <pre className="text-sm text-foreground bg-muted p-4 rounded-lg overflow-x-auto">
                                  {JSON.stringify(botData.summary, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BotCard({
  botName,
  status,
  isLoading,
  onStart,
  onStop,
}: {
  botName: string;
  status: BotStatus;
  isLoading: boolean;
  onStart: () => void;
  onStop: () => void;
}) {
  const isRunning = status.status === 'running';

  return (
    <Card>
      <CardContent className="p-3 md:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <Link to={`/bots/${botName}`} className="flex items-center gap-3 hover:opacity-80 min-w-0">
            <Bot className={isRunning ? 'text-success' : 'text-muted-foreground'} size={20} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-foreground text-sm md:text-base truncate">{formatBotName(botName)}</span>
                <Badge variant={isRunning ? 'default' : 'secondary'} className="text-xs">
                  {isRunning ? 'Running' : 'Stopped'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate">{botName}</p>
            </div>
          </Link>

          <div className="flex items-center gap-2 shrink-0 ml-8 sm:ml-0">
            {isRunning ? (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  onStop();
                }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Square size={16} className="sm:mr-1" />
                )}
                <span className="hidden sm:inline">Stop</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  onStart();
                }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Play size={16} className="sm:mr-1" />
                )}
                <span className="hidden sm:inline">Start</span>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

