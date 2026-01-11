export interface TripleBarrierValues {
  take_profit: string;
  stop_loss: string;
  trailing_stop: string;
  time_limit: string;
}

interface TripleBarrierVisualizationProps {
  values: TripleBarrierValues;
  emptyMessage?: string;
}

export function TripleBarrierVisualization({
  values,
  emptyMessage = 'Set take profit, stop loss, trailing stop, or time limit to see the barrier visualization',
}: TripleBarrierVisualizationProps) {
  const tp = parseFloat(values.take_profit) || 0;
  const sl = parseFloat(values.stop_loss) || 0;
  const ts = parseFloat(values.trailing_stop) || 0;
  const timeLimit = parseInt(values.time_limit) || 0;
  const hasTP = !!values.take_profit && tp > 0;
  const hasSL = !!values.stop_loss && sl > 0;
  const hasTS = !!values.trailing_stop && ts > 0;
  const hasTimeLimit = timeLimit > 0;

  // Show empty state if no barriers are set
  if (!hasTP && !hasSL && !hasTS && !hasTimeLimit) {
    return (
      <div className="mb-4 p-8 bg-muted/30 rounded-lg border border-border border-dashed text-center text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  // Calculate Y positions as percentages for the container
  const totalRange = tp + Math.max(sl, ts);
  let entryPct: number;
  if (hasTP && (hasSL || hasTS)) {
    entryPct = 15 + (tp / totalRange) * 70; // 15% to 85% range
  } else if (hasTP) {
    entryPct = 85;
  } else if (hasSL || hasTS) {
    entryPct = 15;
  } else {
    entryPct = 50;
  }

  const tpPct = 15;
  const slPct = 85;
  const tsPct = hasTS ? entryPct + (ts / Math.max(sl, ts)) * (85 - entryPct) : 50;

  // Line end position - if time limit, lines go to the time limit line position
  const lineEndPct = hasTimeLimit
    ? (timeLimit < 300 ? (timeLimit / 300) * 75 + 10 : 85)
    : 85;

  return (
    <div className="mb-4 p-4 bg-muted/30 rounded-lg border border-border">
      <div className="relative h-48 mx-2">
        {/* Take Profit */}
        {hasTP && (
          <>
            <div className="absolute text-sm font-semibold text-positive" style={{ top: `${tpPct}%`, left: 0, transform: 'translateY(-50%)' }}>Take Profit</div>
            <div className="absolute h-0.5 bg-positive" style={{ top: `${tpPct}%`, left: '110px', width: `calc(${lineEndPct}% - 110px)` }} />
            <div className="absolute text-sm font-semibold text-positive whitespace-nowrap" style={{ top: `${tpPct}%`, left: `calc(${lineEndPct}% + 8px)`, transform: 'translateY(-50%)' }}>+{(tp * 100).toFixed(2)}%</div>
          </>
        )}

        {/* Position Entry */}
        <div className="absolute text-sm text-muted-foreground" style={{ top: `${entryPct}%`, left: 0, transform: 'translateY(-50%)' }}>Position Entry</div>
        <div className="absolute h-0.5 border-t-2 border-dashed border-muted-foreground/50" style={{ top: `${entryPct}%`, left: '110px', width: `calc(${lineEndPct}% - 110px)` }} />

        {/* Trailing Stop */}
        {hasTS && (
          <>
            <div className="absolute text-sm font-semibold text-primary" style={{ top: `${tsPct}%`, left: 0, transform: 'translateY(-50%)' }}>Trailing Stop</div>
            <div className="absolute h-0.5 border-t-2 border-dashed border-primary" style={{ top: `${tsPct}%`, left: '110px', width: `calc(${lineEndPct}% - 110px)` }} />
            <div className="absolute text-sm font-semibold text-primary whitespace-nowrap" style={{ top: `${tsPct}%`, left: `calc(${lineEndPct}% + 8px)`, transform: 'translateY(-50%)' }}>-{(ts * 100).toFixed(2)}%</div>
          </>
        )}

        {/* Stop Loss */}
        {hasSL && (
          <>
            <div className="absolute text-sm font-semibold text-negative" style={{ top: `${slPct}%`, left: 0, transform: 'translateY(-50%)' }}>Stop Loss</div>
            <div className="absolute h-0.5 bg-negative" style={{ top: `${slPct}%`, left: '110px', width: `calc(${lineEndPct}% - 110px)` }} />
            <div className="absolute text-sm font-semibold text-negative whitespace-nowrap" style={{ top: `${slPct}%`, left: `calc(${lineEndPct}% + 8px)`, transform: 'translateY(-50%)' }}>-{(sl * 100).toFixed(2)}%</div>
          </>
        )}

        {/* Time Limit vertical line (right edge of box) */}
        {hasTimeLimit && (
          <>
            <div className="absolute text-sm font-semibold text-warning whitespace-nowrap" style={{ top: '2%', left: `calc(${lineEndPct}% - 30px)` }}>Time Limit</div>
            <div className="absolute w-0.5 border-l-2 border-dashed border-warning" style={{ top: `${hasTP ? tpPct : entryPct}%`, bottom: `${100 - (hasSL ? slPct : (hasTS ? tsPct : entryPct))}%`, left: `calc(${lineEndPct}%)` }} />
            <div className="absolute text-sm font-semibold text-warning whitespace-nowrap" style={{ top: `${(hasSL ? slPct : (hasTS ? tsPct : entryPct)) + 3}%`, left: `calc(${lineEndPct}% - 15px)` }}>{timeLimit}s</div>
          </>
        )}

        {/* Left edge */}
        <div className="absolute w-0.5 bg-muted-foreground/30" style={{ top: `${hasTP ? tpPct : entryPct}%`, bottom: `${100 - (hasSL ? slPct : (hasTS ? tsPct : entryPct))}%`, left: '110px' }} />
      </div>
    </div>
  );
}
