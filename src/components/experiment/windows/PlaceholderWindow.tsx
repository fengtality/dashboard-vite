import { Construction } from 'lucide-react';

interface PlaceholderWindowProps {
  title: string;
  description: string;
}

export function PlaceholderWindow({ title, description }: PlaceholderWindowProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-4">
      <Construction className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
