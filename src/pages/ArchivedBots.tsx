import { useEffect, useState } from 'react';
import { archivedBots } from '../api/client';
import type { ArchivedBot, PerformanceData } from '../api/client';
import {
  Loader2,
  Archive,
  TrendingUp,
  TrendingDown,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Activity,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function ArchivedBotsPage() {
  const [bots, setBots] = useState<ArchivedBot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedBot, setExpandedBot] = useState<string | null>(null);
  const [botData, setBotData] = useState<{
    summary: Record<string, unknown> | null;
    performance: PerformanceData | null;
  }>({ summary: null, performance: null });
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    async function fetchBots() {
      try {
        const data = await archivedBots.list();
        setBots(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch archived bots');
      } finally {
        setLoading(false);
      }
    }
    fetchBots();
  }, []);

  async function handleExpand(dbPath: string) {
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Archived Bots</h1>
        <p className="text-muted-foreground mt-1">
          View historical performance data from archived trading bots
        </p>
      </div>

      {bots.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Archive className="text-muted-foreground mb-4" size={48} />
            <p className="text-muted-foreground">No archived bots found</p>
            <p className="text-muted-foreground/70 text-sm mt-1">
              Archived bots will appear here after you stop and archive them
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {bots.map((bot) => {
            const dbPath = bot.db_path;
            const botName = dbPath.split('/').pop()?.replace('.db', '') || dbPath;

            return (
              <Card key={dbPath} className="overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50"
                  onClick={() => handleExpand(dbPath)}
                >
                  <div className="flex items-center gap-3">
                    {expandedBot === dbPath ? (
                      <ChevronDown className="text-muted-foreground" size={20} />
                    ) : (
                      <ChevronRight className="text-muted-foreground" size={20} />
                    )}
                    <Archive className="text-purple-500" size={20} />
                    <div>
                      <span className="font-medium text-foreground">{botName}</span>
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                        {dbPath}
                      </p>
                    </div>
                  </div>
                  <BarChart3 className="text-muted-foreground" size={20} />
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
    </div>
  );
}

function MetricCard({
  label,
  value,
  format,
}: {
  label: string;
  value: number | unknown;
  format?: 'currency' | 'percent';
}) {
  const numValue = typeof value === 'number' ? value : 0;
  const isPositive = numValue >= 0;

  let displayValue: string;
  if (format === 'currency') {
    displayValue = `$${numValue.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  } else if (format === 'percent') {
    displayValue = `${(numValue * 100).toFixed(2)}%`;
  } else {
    displayValue = typeof value === 'number' ? value.toLocaleString() : String(value);
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <p className="text-xs text-muted-foreground uppercase mb-1">{label}</p>
      <div className="flex items-center gap-2">
        {format === 'currency' && (
          <>
            {isPositive ? (
              <TrendingUp className="text-green-500" size={16} />
            ) : (
              <TrendingDown className="text-red-500" size={16} />
            )}
          </>
        )}
        <span
          className={`text-lg font-semibold ${
            format === 'currency'
              ? isPositive
                ? 'text-green-500'
                : 'text-red-500'
              : 'text-foreground'
          }`}
        >
          {displayValue}
        </span>
      </div>
    </div>
  );
}
