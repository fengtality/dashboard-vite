import { MarketSelector } from './MarketSelector';

export function WindowToolbar() {
  return (
    <div className="flex items-center border-b px-4 py-3 gap-2 bg-background">
      <MarketSelector />
    </div>
  );
}
