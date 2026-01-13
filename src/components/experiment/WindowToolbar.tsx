import { MarketSelector } from './MarketSelector';

export function WindowToolbar() {
  return (
    <div className="flex items-center border-b px-3 py-2 gap-2">
      <MarketSelector />
    </div>
  );
}
