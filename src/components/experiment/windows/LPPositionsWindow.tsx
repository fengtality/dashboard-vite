import { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, TrendingUp, X } from 'lucide-react';
import { gatewayCLMM, type CLMMPosition } from '@/api/hummingbot-api';
import type { WindowContext } from '../ExperimentProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface LPPositionsWindowProps {
  context?: WindowContext;
}

export function LPPositionsWindow({ context }: LPPositionsWindowProps) {
  const connector = context?.connector; // e.g., "solana-mainnet-beta"
  const networkId = connector || '';

  const [positions, setPositions] = useState<CLMMPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);

  const fetchPositions = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await gatewayCLMM.searchPositions({
        status: 'OPEN',
        network: networkId || undefined,
        refresh: true,
      });
      setPositions(res.data || []);
    } catch (err) {
      console.error('Failed to fetch positions:', err);
      setPositions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [networkId]);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  const handleClosePosition = async (position: CLMMPosition) => {
    setClosingId(position.position_id);
    try {
      await gatewayCLMM.removeLiquidity({
        connector: position.connector,
        network: position.network,
        position_id: position.position_id,
        decrease_percent: 100,
      });
      toast.success('Position closed');
      fetchPositions(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to close position');
    } finally {
      setClosingId(null);
    }
  };

  const handleCollectFees = async (position: CLMMPosition) => {
    try {
      await gatewayCLMM.collectFees({
        connector: position.connector,
        network: position.network,
        position_id: position.position_id,
      });
      toast.success('Fees collected');
      fetchPositions(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to collect fees');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium">
          {positions.length} Open Position{positions.length !== 1 ? 's' : ''}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchPositions(false)}
          disabled={refreshing}
          className="h-7 px-2"
        >
          <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
        </Button>
      </div>

      {/* Positions List */}
      {positions.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-center">
          <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No open LP positions</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add liquidity to see positions here
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto space-y-2">
          {positions.map((pos) => (
            <div
              key={pos.position_id}
              className="p-3 border rounded-lg bg-card text-sm"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">
                  {pos.base_token}/{pos.quote_token}
                </div>
                <Badge variant={pos.in_range === 'IN_RANGE' ? 'default' : 'secondary'}>
                  {pos.in_range === 'IN_RANGE' ? 'In Range' : 'Out of Range'}
                </Badge>
              </div>

              {/* Price Range */}
              <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                <div>
                  <div className="text-muted-foreground">Lower</div>
                  <div className="font-mono">{pos.lower_price.toFixed(4)}</div>
                </div>
                <div className="text-center">
                  <div className="text-muted-foreground">Current</div>
                  <div className="font-mono">{pos.current_price.toFixed(4)}</div>
                </div>
                <div className="text-right">
                  <div className="text-muted-foreground">Upper</div>
                  <div className="font-mono">{pos.upper_price.toFixed(4)}</div>
                </div>
              </div>

              {/* Amounts */}
              <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                <div>
                  <div className="text-muted-foreground">{pos.base_token}</div>
                  <div className="font-mono">{pos.base_token_amount.toFixed(4)}</div>
                </div>
                <div className="text-right">
                  <div className="text-muted-foreground">{pos.quote_token}</div>
                  <div className="font-mono">{pos.quote_token_amount.toFixed(4)}</div>
                </div>
              </div>

              {/* Fees */}
              {(pos.base_fee_pending > 0 || pos.quote_fee_pending > 0) && (
                <div className="text-xs text-muted-foreground mb-2">
                  Pending fees: {pos.base_fee_pending.toFixed(4)} {pos.base_token} + {pos.quote_fee_pending.toFixed(4)} {pos.quote_token}
                </div>
              )}

              {/* PnL */}
              {pos.pnl_summary && (
                <div className={cn(
                  'text-xs font-medium mb-2',
                  pos.pnl_summary.total_pnl_quote >= 0 ? 'text-positive' : 'text-negative'
                )}>
                  PnL: {pos.pnl_summary.total_pnl_quote >= 0 ? '+' : ''}{pos.pnl_summary.total_pnl_quote.toFixed(2)} {pos.quote_token}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {(pos.base_fee_pending > 0 || pos.quote_fee_pending > 0) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-7 text-xs"
                    onClick={() => handleCollectFees(pos)}
                  >
                    Collect Fees
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={() => handleClosePosition(pos)}
                  disabled={closingId === pos.position_id}
                >
                  {closingId === pos.position_id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <X className="h-3 w-3 mr-1" />
                      Close
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
