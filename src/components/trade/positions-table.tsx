import type { PaginatedResponse } from '@/api/client';

interface PositionsTableProps {
  positions: PaginatedResponse | null;
  markPrice: number | null;
  currentPrice: number | null;
}

export function PositionsTable({ positions, markPrice, currentPrice }: PositionsTableProps) {
  if (!positions || positions.data.length === 0) {
    return <p className="text-muted-foreground text-center py-4">No open positions</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-3 text-muted-foreground font-medium">Coin</th>
            <th className="text-right py-2 px-3 text-muted-foreground font-medium">Size</th>
            <th className="text-right py-2 px-3 text-muted-foreground font-medium">Position Value</th>
            <th className="text-right py-2 px-3 text-muted-foreground font-medium">Entry Price</th>
            <th className="text-right py-2 px-3 text-muted-foreground font-medium">Mark Price</th>
            <th className="text-right py-2 px-3 text-muted-foreground font-medium">PNL (ROE %)</th>
          </tr>
        </thead>
        <tbody>
          {positions.data.map((pos: Record<string, unknown>, i: number) => {
            const pair = String(pos.trading_pair || pos.symbol || '-');
            const baseSymbol = pair.split('-')[0];
            const side = String(pos.side || '').toUpperCase();
            const amount = Number(pos.amount || pos.size || 0);
            const entryPrice = Number(pos.entry_price || 0);
            const posLeverage = Number(pos.leverage || 1);
            const pnl = Number(pos.unrealized_pnl || 0);
            const displayMarkPrice = markPrice || currentPrice || entryPrice;
            const positionValue = Math.abs(amount) * displayMarkPrice;
            const initialMargin = positionValue / posLeverage;
            const roe = initialMargin > 0 ? (pnl / initialMargin) * 100 : 0;
            const isLong = side === 'LONG';

            return (
              <tr key={i} className="border-b border-border hover:bg-muted/30">
                <td className="py-2 px-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-1 h-6 rounded ${isLong ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="font-semibold">{baseSymbol}</span>
                    <span className="text-muted-foreground text-xs">{posLeverage}x</span>
                  </div>
                </td>
                <td className="py-2 px-3 text-right font-mono">
                  {Math.abs(amount).toFixed(2)} {baseSymbol}
                </td>
                <td className="py-2 px-3 text-right font-mono">
                  {positionValue.toFixed(2)} USD
                </td>
                <td className="py-2 px-3 text-right font-mono">
                  {entryPrice.toFixed(2)}
                </td>
                <td className="py-2 px-3 text-right font-mono">
                  {displayMarkPrice.toFixed(2)}
                </td>
                <td className={`py-2 px-3 text-right font-mono ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} ({roe >= 0 ? '+' : ''}{roe.toFixed(1)}%)
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
