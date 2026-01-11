import { Badge } from '@/components/ui/badge';
import type { PaginatedResponse } from '@/api/client';

interface TradesTableProps {
  trades: PaginatedResponse | null;
}

export function TradesTable({ trades }: TradesTableProps) {
  if (!trades || trades.data.length === 0) {
    return <p className="text-muted-foreground text-center py-4">No trades found</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-3 text-muted-foreground font-medium">Time</th>
            <th className="text-left py-2 px-3 text-muted-foreground font-medium">Pair</th>
            <th className="text-left py-2 px-3 text-muted-foreground font-medium">Side</th>
            <th className="text-right py-2 px-3 text-muted-foreground font-medium">Price</th>
            <th className="text-right py-2 px-3 text-muted-foreground font-medium">Amount</th>
            <th className="text-right py-2 px-3 text-muted-foreground font-medium">Fee</th>
          </tr>
        </thead>
        <tbody>
          {trades.data.slice(0, 20).map((trade: Record<string, unknown>, i: number) => {
            const tradeType = String(trade.trade_type || trade.side || '-');
            const isBuy = tradeType.toUpperCase() === 'BUY';
            const feePaid = Number(trade.fee_paid || 0);
            const feeCurrency = String(trade.fee_currency || '');
            return (
              <tr key={String(trade.trade_id) || i} className="border-b border-border hover:bg-muted/30">
                <td className="py-2 px-3 text-muted-foreground">
                  {trade.timestamp ? new Date(String(trade.timestamp)).toLocaleString() : '-'}
                </td>
                <td className="py-2 px-3 font-medium text-foreground">{String(trade.trading_pair || trade.symbol || '-')}</td>
                <td className="py-2 px-3">
                  <Badge variant={isBuy ? 'default' : 'secondary'} className={isBuy ? 'bg-positive' : 'bg-negative'}>
                    {tradeType}
                  </Badge>
                </td>
                <td className="py-2 px-3 text-right font-mono">{Number(trade.price || 0).toFixed(4)}</td>
                <td className="py-2 px-3 text-right font-mono">{Number(trade.amount || trade.quantity || 0).toFixed(6)}</td>
                <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                  {feePaid > 0 ? `${feePaid.toFixed(6)} ${feeCurrency}` : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
