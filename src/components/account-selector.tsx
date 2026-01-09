import { useAccount } from './account-provider';
import { User, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function AccountSelector() {
  const { account, setAccount, accountsList, isLoading } = useAccount();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  if (accountsList.length === 0) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <User className="h-4 w-4" />
        <span className="text-sm">No accounts</span>
      </div>
    );
  }

  return (
    <Select value={account} onValueChange={setAccount}>
      <SelectTrigger className="w-full h-9">
        <User className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
        <span className="flex-1 text-left">
          <SelectValue placeholder="Select account" />
        </span>
      </SelectTrigger>
      <SelectContent>
        {accountsList.map((acc) => (
          <SelectItem key={acc} value={acc}>
            {acc}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
