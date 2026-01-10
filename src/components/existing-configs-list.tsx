import { Zap, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Config {
  id: string;
  controller_name?: string;
  [key: string]: unknown;
}

interface ExistingConfigsListProps {
  configs: Config[];
  editingConfig: string | null;
  onSelectConfig: (configId: string) => void;
  onDeleteConfig: (configId: string) => void;
  emptyMessage?: string;
  icon?: React.ReactNode;
}

export function ExistingConfigsList({
  configs,
  editingConfig,
  onSelectConfig,
  onDeleteConfig,
  emptyMessage = 'No saved configs. Switch to Create Config to make one.',
  icon = <Zap size={14} className="text-primary" />,
}: ExistingConfigsListProps) {
  if (configs.length === 0) {
    return (
      <Card className="mb-6">
        <CardContent className="py-8 text-center text-muted-foreground">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Saved Configs</CardTitle>
        <CardDescription>Edit or delete existing configurations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {configs.map((config) => (
            <div
              key={config.id}
              onClick={() => onSelectConfig(config.id)}
              className={`flex items-center justify-between p-2 rounded-lg border text-sm cursor-pointer ${
                editingConfig === config.id
                  ? 'bg-primary/10 border-primary'
                  : 'bg-background border-border hover:border-muted-foreground/50 hover:bg-muted/30'
              }`}
            >
              <div className="flex items-center gap-2">
                {icon}
                <span className="font-medium">{config.id}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onDeleteConfig(config.id); }}
                className="h-7 px-2 text-destructive hover:text-destructive"
              >
                <Trash2 size={12} />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
