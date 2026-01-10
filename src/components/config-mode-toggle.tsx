import { Plus, Pencil } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ConfigModeToggleProps {
  mode: 'create' | 'edit';
  onModeChange: (mode: 'create' | 'edit') => void;
}

export function ConfigModeToggle({ mode, onModeChange }: ConfigModeToggleProps) {
  return (
    <div className="mb-6">
      <Tabs value={mode} onValueChange={(v) => onModeChange(v as 'create' | 'edit')}>
        <TabsList className="bg-background gap-1 border p-1">
          <TabsTrigger
            value="create"
            className="data-[state=active]:bg-primary dark:data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:text-primary-foreground"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Config
          </TabsTrigger>
          <TabsTrigger
            value="edit"
            className="data-[state=active]:bg-primary dark:data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:text-primary-foreground"
          >
            <Pencil className="h-4 w-4 mr-2" />
            Edit Config
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
