import { HelpCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';

export interface FieldLabelProps {
  htmlFor: string;
  children: React.ReactNode;
  help: string;
  className?: string;
}

/**
 * Field label with hover card for help text
 * Provides consistent help tooltip pattern across forms
 */
export function FieldLabel({ htmlFor, children, help, className = '' }: FieldLabelProps) {
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <Label htmlFor={htmlFor} className={`inline-flex items-center gap-1 cursor-help ${className}`}>
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
