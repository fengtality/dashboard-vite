import { useState } from 'react';
import { Loader2, ArrowRightLeft } from 'lucide-react';
import { useAccount } from '@/components/account-provider';
import { trading, type TradeRequest } from '@/api/hummingbot-api';
import type { WindowContext } from '../ExperimentProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TradeSpotWindowProps {
  context?: WindowContext;
}

export function TradeSpotWindow({ context }: TradeSpotWindowProps) {
  const { account } = useAccount();
  const connector = context?.connector;
  const pair = context?.pair;

  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'LIMIT' | 'MARKET'>('LIMIT');
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);

  // No connector/pair configured
  if (!connector || !pair) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <ArrowRightLeft className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No market selected</p>
        <p className="text-xs text-muted-foreground mt-1">
          Select a connector and trading pair to place trades
        </p>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <ArrowRightLeft className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No account selected</p>
        <p className="text-xs text-muted-foreground mt-1">
          Select an account to place trades
        </p>
      </div>
    );
  }

  const baseAsset = pair.split('-')[0];
  const quoteAsset = pair.split('-')[1] || 'USD';

  const handlePlaceOrder = async () => {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const priceNum = parseFloat(price);
    if (orderType === 'LIMIT' && (!priceNum || priceNum <= 0)) {
      toast.error('Please enter a valid price for limit order');
      return;
    }

    setPlacingOrder(true);
    try {
      const orderRequest: TradeRequest = {
        account_name: account,
        connector_name: connector,
        trading_pair: pair,
        trade_type: side,
        order_type: orderType,
        amount: amountNum,
        ...(orderType === 'LIMIT' && { price: priceNum }),
      };

      const response = await trading.placeOrder(orderRequest);
      toast.success(`${side} order placed (ID: ${response.order_id})`);

      // Clear form
      setAmount('');
      if (orderType === 'LIMIT') setPrice('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to place order');
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="text-sm font-medium mb-3">{pair}</div>

      {/* Side Toggle */}
      <div className="flex gap-1 mb-4">
        <Button
          variant={side === 'BUY' ? 'default' : 'outline'}
          className={cn(
            'flex-1',
            side === 'BUY' && 'bg-positive hover:bg-positive/90'
          )}
          onClick={() => setSide('BUY')}
        >
          Buy
        </Button>
        <Button
          variant={side === 'SELL' ? 'default' : 'outline'}
          className={cn(
            'flex-1',
            side === 'SELL' && 'bg-negative hover:bg-negative/90'
          )}
          onClick={() => setSide('SELL')}
        >
          Sell
        </Button>
      </div>

      {/* Order Type Toggle */}
      <div className="flex gap-1 mb-4">
        <Button
          variant={orderType === 'LIMIT' ? 'secondary' : 'ghost'}
          size="sm"
          className="flex-1"
          onClick={() => setOrderType('LIMIT')}
        >
          Limit
        </Button>
        <Button
          variant={orderType === 'MARKET' ? 'secondary' : 'ghost'}
          size="sm"
          className="flex-1"
          onClick={() => setOrderType('MARKET')}
        >
          Market
        </Button>
      </div>

      {/* Price Input (Limit only) */}
      {orderType === 'LIMIT' && (
        <div className="mb-3">
          <Label className="text-xs text-muted-foreground">Price ({quoteAsset})</Label>
          <Input
            type="number"
            placeholder="0.00"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="mt-1"
          />
        </div>
      )}

      {/* Amount Input */}
      <div className="mb-4">
        <Label className="text-xs text-muted-foreground">Amount ({baseAsset})</Label>
        <Input
          type="number"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-1"
        />
      </div>

      {/* Total (Estimate) */}
      {orderType === 'LIMIT' && price && amount && (
        <div className="text-xs text-muted-foreground mb-4">
          Total: ~{(parseFloat(price) * parseFloat(amount)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {quoteAsset}
        </div>
      )}

      {/* Submit Button */}
      <Button
        className={cn(
          'w-full mt-auto',
          side === 'BUY' ? 'bg-positive hover:bg-positive/90' : 'bg-negative hover:bg-negative/90'
        )}
        disabled={!amount || (orderType === 'LIMIT' && !price) || placingOrder}
        onClick={handlePlaceOrder}
      >
        {placingOrder ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : null}
        {side === 'BUY' ? 'Buy' : 'Sell'} {baseAsset}
      </Button>
    </div>
  );
}
