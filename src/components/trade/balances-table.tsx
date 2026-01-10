import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PortfolioBalance } from '@/api/client';

interface BalancesTableProps {
  balances: PortfolioBalance[];
  refreshing: boolean;
  onRefresh: () => void;
}

export function BalancesTable({ balances, refreshing, onRefresh }: BalancesTableProps) {
  return (
    <div>
      <div className="flex justify-end mb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={refreshing}
          className="h-7 px-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      {balances.length === 0 ? (
        <p className="text-muted-foreground text-center py-4">No balances found</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Token</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Units</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Available</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Price</th>
                <th className="text-right py-2 px-3 text-muted-foreground font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {balances
                .filter(b => b.units > 0)
                .sort((a, b) => b.value - a.value || b.units - a.units)
                .map((balance) => (
                  <tr key={balance.token} className="border-b border-border hover:bg-muted/30">
                    <td className="py-2 px-3 font-medium text-foreground">{balance.token}</td>
                    <td className="py-2 px-3 text-right font-mono text-foreground">
                      {balance.units.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                      {balance.available_units.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-muted-foreground">
                      {balance.price > 0
                        ? `$${balance.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
                        : '—'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-foreground">
                      {balance.price > 0
                        ? `$${balance.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : '—'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
