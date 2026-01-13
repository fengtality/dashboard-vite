import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { useAccount } from '@/components/account-provider';
import { trading, type PaginatedResponse } from '@/api/hummingbot-api';
import { OrdersTable } from '@/components/trade/orders-table';
import type { WindowContext } from '../ExperimentProvider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface OrdersWindowProps {
  context?: WindowContext;
}

export function OrdersWindow({ context }: OrdersWindowProps) {
  const { account } = useAccount();
  const connector = context?.connector;

  const [orders, setOrders] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!account) {
      setError('No account selected');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await trading.getActiveOrders({
        account_names: [account],
        connector_names: connector ? [connector] : undefined,
      });
      setOrders(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, [account, connector]);

  useEffect(() => {
    fetchOrders();
    // Poll for updates every 10 seconds
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleCancelOrder = async (orderId: string, connectorName: string) => {
    if (!account) return;

    setCancellingOrderId(orderId);
    try {
      await trading.cancelOrder(account, connectorName, orderId);
      toast.success('Order cancelled');
      // Refresh orders
      fetchOrders();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel order');
    } finally {
      setCancellingOrderId(null);
    }
  };

  if (loading && !orders) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <OrdersTable
      orders={orders}
      cancellingOrderId={cancellingOrderId}
      onCancelOrder={handleCancelOrder}
      selectedConnector={connector || ''}
    />
  );
}
