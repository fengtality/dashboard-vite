import { Loader2, Plus, Pencil, HelpCircle, Rocket } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';

interface SaveConfigCardProps {
  configId: string;
  onConfigIdChange: (id: string) => void;
  isEditing: boolean;
  isSubmitting: boolean;
  submittingAction?: 'save' | 'deploy';
  error: string | null;
  onSave: () => void;
  onSaveAndDeploy: () => void;
}

function FieldLabel({ htmlFor, children, help }: { htmlFor: string; children: React.ReactNode; help: string }) {
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <Label htmlFor={htmlFor} className="inline-flex items-center gap-1 cursor-help">
          {children}
          <HelpCircle size={12} className="text-muted-foreground" />
        </Label>
      </HoverCardTrigger>
      <HoverCardContent side="top" align="start" className="w-64 text-sm">
        {help}
      </HoverCardContent>
    </HoverCard>
  );
}

export function SaveConfigCard({
  configId,
  onConfigIdChange,
  isEditing,
  isSubmitting,
  submittingAction,
  error,
  onSave,
  onSaveAndDeploy,
}: SaveConfigCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Save Config</CardTitle>
        <CardDescription>Name and save your configuration</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid w-full items-center gap-1.5">
          <FieldLabel htmlFor="id" help="Unique identifier for this configuration. Used to reference and manage this config.">Config Name</FieldLabel>
          <Input
            id="id"
            type="text"
            value={configId}
            onChange={(e) => onConfigIdChange(e.target.value)}
            placeholder="my_config"
            disabled={isEditing}
          />
        </div>
        {error && (
          <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-3 text-destructive text-sm">
            {error}
          </div>
        )}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting || !configId.trim()}
            className="flex-1"
            onClick={onSave}
          >
            {isSubmitting && submittingAction === 'save' ? (
              <>
                <Loader2 className="animate-spin mr-2" size={18} />
                {isEditing ? 'Updating...' : 'Saving...'}
              </>
            ) : (
              <>
                {isEditing ? (
                  <>
                    <Pencil className="mr-2" size={18} />
                    Update
                  </>
                ) : (
                  <>
                    <Plus className="mr-2" size={18} />
                    Save
                  </>
                )}
              </>
            )}
          </Button>
          <Button
            type="button"
            disabled={isSubmitting || !configId.trim()}
            className="flex-1"
            onClick={onSaveAndDeploy}
          >
            {isSubmitting && submittingAction === 'deploy' ? (
              <>
                <Loader2 className="animate-spin mr-2" size={18} />
                {isEditing ? 'Updating...' : 'Saving...'}
              </>
            ) : (
              <>
                <Rocket className="mr-2" size={18} />
                {isEditing ? 'Update & Deploy' : 'Save & Deploy'}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
