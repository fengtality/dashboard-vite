import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface DepthLevel {
  price: number;
  qty: number;
  bps: number;
  cumQty: number;
}

interface OrderDepthChartProps {
  bids: Array<{ price: number; qty: number }>;
  asks: Array<{ price: number; qty: number }>;
  midPrice?: number;
  baseSymbol?: string;
  priceDecimals?: number;
  className?: string;
}

export function OrderDepthChart({
  bids,
  asks,
  midPrice: propMidPrice,
  baseSymbol = '',
  priceDecimals = 2,
  className,
}: OrderDepthChartProps) {
  const [cumulative, setCumulative] = useState(true);

  // Calculate mid price if not provided
  const bestBid = bids.length > 0 ? bids[0].price : 0;
  const bestAsk = asks.length > 0 ? asks[0].price : 0;
  const midPrice = propMidPrice || (bestBid && bestAsk ? (bestBid + bestAsk) / 2 : bestBid || bestAsk || 1);

  // Calculate bps from mid price and cumulative quantities
  let bidCumulative = 0;
  const depthBids: DepthLevel[] = bids.map((bid) => {
    const bps = ((bid.price - midPrice) / midPrice) * 10000;
    bidCumulative += bid.qty;
    return { price: bid.price, qty: bid.qty, bps, cumQty: bidCumulative };
  });

  let askCumulative = 0;
  const depthAsks: DepthLevel[] = asks.map((ask) => {
    const bps = ((ask.price - midPrice) / midPrice) * 10000;
    askCumulative += ask.qty;
    return { price: ask.price, qty: ask.qty, bps, cumQty: askCumulative };
  });

  // Calculate chart range
  const minBps = depthBids.length > 0 ? Math.min(...depthBids.map(d => d.bps)) : 0;
  const maxBps = depthAsks.length > 0 ? Math.max(...depthAsks.map(d => d.bps)) : 0;
  const chartRange = Math.max(Math.abs(minBps), Math.abs(maxBps), 0.1);

  // Calculate max quantity for scaling
  const maxQty = cumulative
    ? Math.max(bidCumulative, askCumulative, 1)
    : Math.max(
        ...depthBids.map(d => d.qty),
        ...depthAsks.map(d => d.qty),
        1
      );

  const totalBids = depthBids.reduce((a, b) => a + b.qty, 0);
  const totalAsks = depthAsks.reduce((a, b) => a + b.qty, 0);
  const imbalance = totalBids + totalAsks > 0
    ? ((totalBids - totalAsks) / (totalBids + totalAsks)) * 100
    : 0;

  if (bids.length === 0 && asks.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-full text-muted-foreground text-sm", className)}>
        No order book data
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header with toggle and summary */}
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="text-xs text-muted-foreground">
          <span>Depth (±{chartRange.toFixed(1)} bps) | </span>
          <span className="text-positive">Bids: {totalBids.toFixed(2)}</span>
          <span> | </span>
          <span className="text-negative">Asks: {totalAsks.toFixed(2)}</span>
          <span> | </span>
          <span className={imbalance >= 0 ? 'text-positive' : 'text-negative'}>
            {imbalance >= 0 ? '+' : ''}{imbalance.toFixed(1)}%
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => setCumulative(!cumulative)}
        >
          {cumulative ? 'Cumulative' : 'Individual'}
        </Button>
      </div>

      {/* Chart with Y-axis */}
      <div className="flex-1 flex min-h-[100px]">
        {/* Y-axis */}
        <div className="flex flex-col justify-between text-xs text-muted-foreground pr-2 py-1 text-right w-16 shrink-0">
          <span>{maxQty.toFixed(2)}</span>
          <span>{(maxQty / 2).toFixed(2)}</span>
          <span>0 {baseSymbol}</span>
        </div>
        {/* Chart - bids on left, asks on right */}
        <div className="flex-1 flex items-end gap-px">
          {/* Bids (sorted so highest bid is near center) */}
          {[...depthBids].reverse().map((d, i) => {
            const displayQty = cumulative ? d.cumQty : d.qty;
            const height = maxQty > 0 ? (displayQty / maxQty) * 100 : 0;
            return (
              <div
                key={`bid-${i}`}
                className="flex-1 bg-positive/70 transition-all hover:bg-positive"
                style={{ height: `${Math.max(height, 2)}%` }}
                title={`${d.bps.toFixed(2)} bps ($${d.price.toFixed(priceDecimals)}): ${displayQty.toFixed(4)}${cumulative ? ' (cum)' : ''}`}
              />
            );
          })}
          {/* Center gap */}
          <div className="w-1 h-full bg-border shrink-0" />
          {/* Asks (sorted so lowest ask is near center) */}
          {depthAsks.map((d, i) => {
            const displayQty = cumulative ? d.cumQty : d.qty;
            const height = maxQty > 0 ? (displayQty / maxQty) * 100 : 0;
            return (
              <div
                key={`ask-${i}`}
                className="flex-1 bg-negative/70 transition-all hover:bg-negative"
                style={{ height: `${Math.max(height, 2)}%` }}
                title={`+${d.bps.toFixed(2)} bps ($${d.price.toFixed(priceDecimals)}): ${displayQty.toFixed(4)}${cumulative ? ' (cum)' : ''}`}
              />
            );
          })}
        </div>
      </div>

      {/* X-axis labels - bps and price */}
      <div className="flex text-xs text-muted-foreground mt-1 shrink-0">
        {/* Spacer for Y-axis */}
        <div className="w-16 pr-2 shrink-0" />
        {/* X-axis content */}
        <div className="flex-1 flex justify-between">
          <div className="text-left">
            <div>-{chartRange.toFixed(1)} bps</div>
            <div className="text-positive">{(midPrice * (1 - chartRange / 10000)).toFixed(priceDecimals)}</div>
          </div>
          <div className="text-center">
            <div>0</div>
            <div>{midPrice.toFixed(priceDecimals)}</div>
          </div>
          <div className="text-right">
            <div>+{chartRange.toFixed(1)} bps</div>
            <div className="text-negative">{(midPrice * (1 + chartRange / 10000)).toFixed(priceDecimals)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
