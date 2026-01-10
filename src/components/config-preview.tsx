import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type ConfigValue = string | number | boolean | null | undefined | ConfigValue[] | { [key: string]: ConfigValue };

interface ConfigPreviewProps {
  config: Record<string, unknown>;
  title?: string;
  description?: string;
}

function renderValue(value: ConfigValue): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value || 'null';
  return JSON.stringify(value);
}

function renderConfigLine(key: string, value: ConfigValue, indent: number = 0): React.ReactNode[] {
  const paddingClass = indent > 0 ? `pl-${indent * 2}` : '';

  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const result: React.ReactNode[] = [
      <div key={key} className={`${paddingClass} pt-1 ${indent === 0 ? 'border-t border-border/50 mt-1' : ''}`}>
        <span className="text-muted-foreground">{key}:</span>
      </div>
    ];

    Object.entries(value).forEach(([childKey, childValue]) => {
      result.push(...renderConfigLine(childKey, childValue, indent + 1));
    });

    return result;
  }

  return [
    <div key={key} className={paddingClass}>
      <span className="text-muted-foreground">{key}:</span> {renderValue(value)}
    </div>
  ];
}

// Sort config entries: priority fields first, then alphabetical
function sortConfigEntries(entries: [string, unknown][]): [string, unknown][] {
  const priorityFields = ['connector_name', 'trading_pair', 'total_amount_quote'];

  return entries.sort((a, b) => {
    const aIndex = priorityFields.indexOf(a[0]);
    const bIndex = priorityFields.indexOf(b[0]);

    // Both are priority fields - sort by priority order
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    // Only a is priority - a comes first
    if (aIndex !== -1) return -1;
    // Only b is priority - b comes first
    if (bIndex !== -1) return 1;
    // Neither is priority - sort alphabetically
    return a[0].localeCompare(b[0]);
  });
}

export function ConfigPreview({
  config,
  title = 'Config Preview',
  description = 'Preview of the configuration file',
}: ConfigPreviewProps) {
  const sortedEntries = sortConfigEntries(Object.entries(config));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="bg-muted/30 rounded-lg p-3 font-mono text-xs space-y-1">
          {sortedEntries.map(([key, value]) => renderConfigLine(key, value as ConfigValue))}
        </div>
      </CardContent>
    </Card>
  );
}
