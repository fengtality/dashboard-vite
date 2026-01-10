import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { config } from '@/config';
import { generateTelegramDeepLink, generateServerName } from '@/lib/deeplink';
import { useAccount } from '@/components/account-provider';
import { Send, Server, Loader2, User } from 'lucide-react';
import { toast } from 'sonner';

const PUBLIC_BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'CondorHummingbot';

export default function AccountPage() {
  const { account, setAccount, accountsList } = useAccount();
  const [loading, setLoading] = useState(false);
  const [botUsername, setBotUsername] = useState(PUBLIC_BOT_USERNAME);
  const [isEditingBot, setIsEditingBot] = useState(false);

  // Parse API URL to get host and port
  const apiUrl = config.api.baseUrl;
  const urlMatch = apiUrl.match(/^(https?:\/\/)?([^:/]+)(?::(\d+))?/);
  const host = urlMatch?.[2] || 'localhost';
  const port = urlMatch?.[3] ? parseInt(urlMatch[3]) : 8000;
  const [serverName, setServerName] = useState(() => generateServerName(host));

  function handleConnectTelegram() {
    if (!botUsername) {
      toast.error('Please enter a bot username');
      return;
    }

    setLoading(true);
    try {
      const link = generateTelegramDeepLink(botUsername, {
        name: serverName,
        host,
        port,
        username: config.api.username,
        password: config.api.password,
      });

      // Open in new tab
      window.open(link, '_blank');

      toast.success('Opening Telegram...');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate link');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Account</h1>

      <Tabs defaultValue="account">
        <TabsList className="mb-4">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-6">
          {/* Trading Account Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User size={20} />
                Trading Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select the trading account to use for orders and portfolio tracking.
              </p>
              {accountsList.length > 0 ? (
                <Select value={account} onValueChange={setAccount}>
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accountsList.map((acc) => (
                      <SelectItem key={acc} value={acc}>
                        {acc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">No accounts available</p>
              )}
            </CardContent>
          </Card>

          {/* API Server Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server size={20} />
                API Server
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Host</span>
                  <p className="font-mono">{host}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Port</span>
                  <p className="font-mono">{port}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Username</span>
                  <p className="font-mono">{config.api.username}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <p className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    Connected
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Telegram Integration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send size={20} />
                Connect Telegram
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <p className="text-muted-foreground">
                  Connect your Telegram account to use the Condor bot for trading,
                  portfolio monitoring, and notifications on mobile.
                </p>

                {/* Condor Bot Name */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="botUsername">Condor Bot Name</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      id="botUsername"
                      value={botUsername}
                      onChange={(e) => setBotUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                      disabled={!isEditingBot}
                      className="max-w-xs font-mono"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (isEditingBot) {
                          // Reset to default when done editing
                          if (!botUsername) setBotUsername(PUBLIC_BOT_USERNAME);
                        }
                        setIsEditingBot(!isEditingBot);
                      }}
                    >
                      {isEditingBot ? 'Done' : 'Change'}
                    </Button>
                  </div>
                </div>

                {/* Server Name Input */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="serverName">Server Name</Label>
                  <Input
                    id="serverName"
                    value={serverName}
                    onChange={(e) => setServerName(e.target.value.replace(/[^a-zA-Z0-9_]/g, '_'))}
                    placeholder="my_server"
                    className="max-w-xs font-mono"
                  />
                </div>

                {/* Connect Button */}
                <Button
                  onClick={handleConnectTelegram}
                  disabled={loading || !serverName || !botUsername}
                  className="w-fit"
                  size="lg"
                >
                  {loading ? (
                    <Loader2 className="animate-spin mr-2" size={18} />
                  ) : (
                    <Send className="mr-2" size={18} />
                  )}
                  Connect to Telegram
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Security settings coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">General settings coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
