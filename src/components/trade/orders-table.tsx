import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PaginatedResponse } from '@/api/client';

interface OrdersTableProps {
  orders: PaginatedResponse | null;
  cancellingOrderId: string | null;
  onCancelOrder: (orderId: string, connectorName: string) => void;
  selectedConnector: string;
}

export function OrdersTable({ orders, cancellingOrderId, onCancelOrder, selectedConnector }: OrdersTableProps) {
  if (!orders || orders.data.length === 0) {
    return <p className="text-muted-foreground text-center py-4">No active orders</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-3 text-muted-foreground font-medium">Time</th>
            <th className="text-left py-2 px-3 text-muted-foreground font-medium">Type</th>
            <th className="text-left py-2 px-3 text-muted-foreground font-medium">Pair</th>
            <th className="text-left py-2 px-3 text-muted-foreground font-medium">Direction</th>
            <th className="text-right py-2 px-3 text-muted-foreground font-medium">Size</th>
            <th className="text-right py-2 px-3 text-muted-foreground font-medium">Original Size</th>
            <th className="text-right py-2 px-3 text-muted-foreground font-medium">Order Value</th>
            <th className="text-right py-2 px-3 text-muted-foreground font-medium">Price</th>
            <th className="text-right py-2 px-3 text-muted-foreground font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {orders.data.map((order: Record<string, unknown>, i: number) => {
            const orderId = String(order.order_id || order.client_order_id || '');
            const connectorName = String(order.connector_name || selectedConnector || '');
            const pair = String(order.trading_pair || order.symbol || '-');
            const tradeType = String(order.trade_type || order.side || '').toUpperCase();
            const orderType = String(order.order_type || 'LIMIT');
            const amount = Number(order.amount || order.quantity || 0);
            const filledAmount = Number(order.filled_amount || order.filled || order.executed_quantity || 0);
            const price = Number(order.price || 0);
            const orderValue = amount * price;
            const isLong = tradeType === 'BUY';
            const createdAt = order.created_at || order.updated_at;
            const timeStr = createdAt
              ? new Date(String(createdAt)).toLocaleString('en-US', {
                  month: 'numeric',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false,
                }).replace(',', ' -')
              : '-';

            return (
              <tr key={i} className="border-b border-border hover:bg-muted/30">
                <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">{timeStr}</td>
                <td className="py-2 px-3">{orderType.charAt(0) + orderType.slice(1).toLowerCase()}</td>
                <td className="py-2 px-3 font-semibold">{pair}</td>
                <td className={`py-2 px-3 ${isLong ? 'text-positive' : 'text-negative'}`}>
                  {isLong ? 'Long' : 'Short'}
                </td>
                <td className="py-2 px-3 text-right font-mono">{filledAmount.toFixed(2)}</td>
                <td className="py-2 px-3 text-right font-mono">{amount.toFixed(2)}</td>
                <td className="py-2 px-3 text-right font-mono">{orderValue.toFixed(2)} USD</td>
                <td className="py-2 px-3 text-right font-mono">{price.toFixed(2)}</td>
                <td className="py-2 px-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                    onClick={() => onCancelOrder(orderId, connectorName)}
                    disabled={cancellingOrderId === orderId}
                  >
                    {cancellingOrderId === orderId ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      'Cancel'
                    )}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
