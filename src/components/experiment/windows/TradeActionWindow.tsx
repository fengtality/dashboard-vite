import { useState } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import type { WindowContext } from '../ExperimentProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface TradeActionWindowProps {
  context?: WindowContext;
}

export function TradeActionWindow({ context }: TradeActionWindowProps) {
  const connector = context?.connector;
  const pair = context?.pair;

  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'limit' | 'market'>('limit');
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');

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

  const baseAsset = pair.split('-')[0];
  const quoteAsset = pair.split('-')[1] || 'USD';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="text-sm font-medium mb-3">{pair}</div>

      {/* Side Toggle */}
      <div className="flex gap-1 mb-4">
        <Button
          variant={side === 'buy' ? 'default' : 'outline'}
          className={cn(
            'flex-1',
            side === 'buy' && 'bg-positive hover:bg-positive/90'
          )}
          onClick={() => setSide('buy')}
        >
          Buy
        </Button>
        <Button
          variant={side === 'sell' ? 'default' : 'outline'}
          className={cn(
            'flex-1',
            side === 'sell' && 'bg-negative hover:bg-negative/90'
          )}
          onClick={() => setSide('sell')}
        >
          Sell
        </Button>
      </div>

      {/* Order Type Toggle */}
      <div className="flex gap-1 mb-4">
        <Button
          variant={orderType === 'limit' ? 'secondary' : 'ghost'}
          size="sm"
          className="flex-1"
          onClick={() => setOrderType('limit')}
        >
          Limit
        </Button>
        <Button
          variant={orderType === 'market' ? 'secondary' : 'ghost'}
          size="sm"
          className="flex-1"
          onClick={() => setOrderType('market')}
        >
          Market
        </Button>
      </div>

      {/* Price Input (Limit only) */}
      {orderType === 'limit' && (
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
      {orderType === 'limit' && price && amount && (
        <div className="text-xs text-muted-foreground mb-4">
          Total: ~{(parseFloat(price) * parseFloat(amount)).toFixed(2)} {quoteAsset}
        </div>
      )}

      {/* Submit Button */}
      <Button
        className={cn(
          'w-full mt-auto',
          side === 'buy' ? 'bg-positive hover:bg-positive/90' : 'bg-negative hover:bg-negative/90'
        )}
        disabled={!amount || (orderType === 'limit' && !price)}
      >
        {side === 'buy' ? 'Buy' : 'Sell'} {baseAsset}
      </Button>

      <p className="text-xs text-muted-foreground text-center mt-2">
        Trading not yet implemented in experimental mode
      </p>
    </div>
  );
}
