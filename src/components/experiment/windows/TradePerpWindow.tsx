import { useState, useEffect } from 'react';
import { Loader2, ArrowRightLeft, Info } from 'lucide-react';
import { useAccount } from '@/components/account-provider';
import { trading, marketData, type TradeRequest } from '@/api/hummingbot-api';
import type { WindowContext } from '../ExperimentProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface FundingInfo {
  funding_rate: number;
  next_funding_time: number;
  mark_price: number;
  index_price: number;
}

interface TradePerpWindowProps {
  context?: WindowContext;
}

export function TradePerpWindow({ context }: TradePerpWindowProps) {
  const { account } = useAccount();
  const connector = context?.connector;
  const pair = context?.pair;

  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'LIMIT' | 'MARKET'>('LIMIT');
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);

  // Perp-specific state
  const [leverage, setLeverage] = useState(5);
  const [positionMode, setPositionMode] = useState<'ONEWAY' | 'HEDGE'>('ONEWAY');
  const [positionAction, setPositionAction] = useState<'OPEN' | 'CLOSE'>('OPEN');
  const [fundingInfo, setFundingInfo] = useState<FundingInfo | null>(null);
  const [fundingCountdown, setFundingCountdown] = useState('');
  const [settingLeverage, setSettingLeverage] = useState(false);
  const [togglingMode, setTogglingMode] = useState(false);

  // Fetch funding info
  useEffect(() => {
    if (!connector || !pair) {
      setFundingInfo(null);
      return;
    }

    async function fetchFundingInfo() {
      try {
        const response = await marketData.getFundingInfo({
          connector_name: connector!,
          trading_pair: pair!,
        });
        setFundingInfo({
          funding_rate: response.rate ?? response.funding_rate ?? 0,
          next_funding_time: response.next_funding_utc_timestamp ?? response.next_funding_time ?? 0,
          mark_price: response.mark_price ?? 0,
          index_price: response.index_price ?? 0,
        });
      } catch (err) {
        console.error('Failed to fetch funding info:', err);
        setFundingInfo(null);
      }
    }

    fetchFundingInfo();
    const interval = setInterval(fetchFundingInfo, 30000);
    return () => clearInterval(interval);
  }, [connector, pair]);

  // Fetch position mode
  useEffect(() => {
    if (!connector || !account) return;

    async function fetchPositionMode() {
      try {
        const response = await trading.getPositionMode(account!, connector!);
        const mode = response.position_mode as 'ONEWAY' | 'HEDGE';
        if (mode === 'ONEWAY' || mode === 'HEDGE') {
          setPositionMode(mode);
        }
      } catch (err) {
        console.error('Failed to fetch position mode:', err);
      }
    }

    fetchPositionMode();
  }, [connector, account]);

  // Funding countdown
  useEffect(() => {
    if (!fundingInfo?.next_funding_time) {
      setFundingCountdown('');
      return;
    }

    function updateCountdown() {
      const now = Date.now();
      const target = fundingInfo!.next_funding_time * 1000;
      const diff = target - now;

      if (diff <= 0) {
        setFundingCountdown('Now');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setFundingCountdown(`${hours}h ${minutes}m ${seconds}s`);
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [fundingInfo?.next_funding_time]);

  // No connector/pair configured
  if (!connector || !pair) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <ArrowRightLeft className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No market selected</p>
        <p className="text-xs text-muted-foreground mt-1">
          Select a perpetual connector and trading pair
        </p>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <ArrowRightLeft className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No account selected</p>
      </div>
    );
  }

  const baseAsset = pair.split('-')[0];
  const quoteAsset = pair.split('-')[1] || 'USD';

  const handleSetLeverage = async (newLeverage: number) => {
    setSettingLeverage(true);
    try {
      await trading.setLeverage(account, connector, pair, newLeverage);
      setLeverage(newLeverage);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to set leverage');
    } finally {
      setSettingLeverage(false);
    }
  };

  const handleSetPositionMode = async (newMode: 'ONEWAY' | 'HEDGE') => {
    if (newMode === positionMode) return;
    setTogglingMode(true);
    try {
      await trading.setPositionMode(account, connector, newMode);
      setPositionMode(newMode);
      toast.success(`Position mode changed to ${newMode}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to change position mode');
    } finally {
      setTogglingMode(false);
    }
  };

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
        position_action: positionAction,
      };

      const response = await trading.placeOrder(orderRequest);
      toast.success(`${side} order placed (ID: ${response.order_id})`);

      setAmount('');
      if (orderType === 'LIMIT') setPrice('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to place order');
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <div className="flex flex-col h-full text-sm">
      {/* Header with pair and funding info */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium">{pair}</span>
        {fundingInfo && (
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                <Info className="h-3 w-3 mr-1" />
                {(fundingInfo.funding_rate * 100).toFixed(4)}%
              </Button>
            </HoverCardTrigger>
            <HoverCardContent className="w-56 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Funding Rate:</span>
                  <span className={fundingInfo.funding_rate >= 0 ? 'text-positive' : 'text-negative'}>
                    {(fundingInfo.funding_rate * 100).toFixed(4)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Next Funding:</span>
                  <span>{fundingCountdown}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mark Price:</span>
                  <span>{fundingInfo.mark_price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Index Price:</span>
                  <span>{fundingInfo.index_price.toLocaleString()}</span>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        )}
      </div>

      {/* Leverage Slider */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <Label className="text-xs text-muted-foreground">Leverage</Label>
          <span className="text-xs font-medium">{leverage}x</span>
        </div>
        <Slider
          value={[leverage]}
          onValueChange={([v]) => setLeverage(v)}
          onValueCommit={([v]) => handleSetLeverage(v)}
          min={1}
          max={125}
          step={1}
          disabled={settingLeverage}
          className="w-full"
        />
      </div>

      {/* Position Mode */}
      <div className="flex gap-1 mb-3">
        <Button
          variant={positionMode === 'ONEWAY' ? 'secondary' : 'ghost'}
          size="sm"
          className="flex-1 text-xs h-7"
          onClick={() => handleSetPositionMode('ONEWAY')}
          disabled={togglingMode}
        >
          One-Way
        </Button>
        <Button
          variant={positionMode === 'HEDGE' ? 'secondary' : 'ghost'}
          size="sm"
          className="flex-1 text-xs h-7"
          onClick={() => handleSetPositionMode('HEDGE')}
          disabled={togglingMode}
        >
          Hedge
        </Button>
      </div>

      {/* Side Toggle */}
      <div className="flex gap-1 mb-3">
        <Button
          variant={side === 'BUY' ? 'default' : 'outline'}
          size="sm"
          className={cn(
            'flex-1',
            side === 'BUY' && 'bg-positive hover:bg-positive/90'
          )}
          onClick={() => setSide('BUY')}
        >
          Long
        </Button>
        <Button
          variant={side === 'SELL' ? 'default' : 'outline'}
          size="sm"
          className={cn(
            'flex-1',
            side === 'SELL' && 'bg-negative hover:bg-negative/90'
          )}
          onClick={() => setSide('SELL')}
        >
          Short
        </Button>
      </div>

      {/* Position Action (Open/Close) */}
      <div className="flex gap-1 mb-3">
        <Button
          variant={positionAction === 'OPEN' ? 'secondary' : 'ghost'}
          size="sm"
          className="flex-1 text-xs h-7"
          onClick={() => setPositionAction('OPEN')}
        >
          Open
        </Button>
        <Button
          variant={positionAction === 'CLOSE' ? 'secondary' : 'ghost'}
          size="sm"
          className="flex-1 text-xs h-7"
          onClick={() => setPositionAction('CLOSE')}
        >
          Close
        </Button>
      </div>

      {/* Order Type */}
      <div className="flex gap-1 mb-3">
        <Button
          variant={orderType === 'LIMIT' ? 'secondary' : 'ghost'}
          size="sm"
          className="flex-1 text-xs h-7"
          onClick={() => setOrderType('LIMIT')}
        >
          Limit
        </Button>
        <Button
          variant={orderType === 'MARKET' ? 'secondary' : 'ghost'}
          size="sm"
          className="flex-1 text-xs h-7"
          onClick={() => setOrderType('MARKET')}
        >
          Market
        </Button>
      </div>

      {/* Price Input (Limit only) */}
      {orderType === 'LIMIT' && (
        <div className="mb-2">
          <Label className="text-xs text-muted-foreground">Price ({quoteAsset})</Label>
          <Input
            type="number"
            placeholder="0.00"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="mt-1 h-8 text-sm"
          />
        </div>
      )}

      {/* Amount Input */}
      <div className="mb-3">
        <Label className="text-xs text-muted-foreground">Amount ({baseAsset})</Label>
        <Input
          type="number"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-1 h-8 text-sm"
        />
      </div>

      {/* Submit Button */}
      <Button
        className={cn(
          'w-full mt-auto',
          side === 'BUY' ? 'bg-positive hover:bg-positive/90' : 'bg-negative hover:bg-negative/90'
        )}
        disabled={!amount || (orderType === 'LIMIT' && !price) || placingOrder}
        onClick={handlePlaceOrder}
      >
        {placingOrder && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        {positionAction === 'OPEN' ? 'Open' : 'Close'} {side === 'BUY' ? 'Long' : 'Short'}
      </Button>
    </div>
  );
}
