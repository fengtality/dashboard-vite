import { useState, useEffect } from 'react';
import { Loader2, Key } from 'lucide-react';
import { useAccount } from '@/components/account-provider';
import { accounts } from '@/api/hummingbot-api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export function KeysWindow() {
  const { account } = useAccount();

  const [credentials, setCredentials] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCredentials() {
      if (!account) {
        setError('No account selected');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const creds = await accounts.getCredentials(account);
        setCredentials(creds);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch credentials');
      } finally {
        setLoading(false);
      }
    }

    fetchCredentials();
  }, [account]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (credentials.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <Key className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No API keys configured</p>
        <p className="text-xs text-muted-foreground mt-1">
          Go to Settings &gt; Keys to add exchange API keys
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground mb-3">
        Connected exchanges for {account}
      </p>
      <div className="flex flex-wrap gap-2">
        {credentials.map((connector) => (
          <Badge key={connector} variant="secondary" className="text-sm">
            {connector.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </Badge>
        ))}
      </div>
    </div>
  );
}
