import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAccount } from '@/components/account-provider';
import { accounts, bots } from '@/api/client';
import type { BotStatus } from '@/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plug, Bot, Zap, Key, Rocket, Square } from 'lucide-react';
import { formatConnectorName, formatBotName } from '@/lib/formatting';
import { isPerpetualConnector } from '@/lib/connectors';

export default function Home() {
  const { account } = useAccount();
  const [connectedConnectors, setConnectedConnectors] = useState<string[]>([]);
  const [activeBots, setActiveBots] = useState<Record<string, BotStatus>>({});

  useEffect(() => {
    async function fetchData() {
      if (account) {
        try {
          const creds = await accounts.getCredentials(account);
          setConnectedConnectors(creds);
        } catch {
          setConnectedConnectors([]);
        }
      }

      try {
        const status = await bots.getStatus();
        setActiveBots(status);
      } catch {
        setActiveBots({});
      }
    }
    fetchData();
  }, [account]);

  const runningBots = Object.entries(activeBots)
    .filter(([, status]) => status.status === 'running');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to Hummingbot Dashboard</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Connected Exchanges */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Exchanges</CardTitle>
            <Plug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{connectedConnectors.length}</div>
            <p className="text-xs text-muted-foreground">Connected exchanges</p>
            {connectedConnectors.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {connectedConnectors.slice(0, 4).map((c) => (
                  <Badge key={c} variant="secondary" className="text-xs">
                    {formatConnectorName(c)}
                    <span className="ml-1 text-[10px] opacity-70">
                      {isPerpetualConnector(c) ? 'P' : 'S'}
                    </span>
                  </Badge>
                ))}
                {connectedConnectors.length > 4 && (
                  <Badge variant="outline" className="text-xs">
                    +{connectedConnectors.length - 4}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Running Bots */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Running Bots</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{runningBots.length}</div>
            <p className="text-xs text-muted-foreground">Active trading bots</p>
            {runningBots.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {runningBots.slice(0, 3).map(([name]) => (
                  <Badge key={name} variant="secondary" className="text-xs">
                    <Square size={8} fill="currentColor" className="text-green-500 mr-1" />
                    {formatBotName(name)}
                  </Badge>
                ))}
                {runningBots.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{runningBots.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start" asChild>
              <Link to="/connectors/keys">
                <Key size={14} className="mr-2" />
                Manage Keys
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start" asChild>
              <Link to="/bots/deploy">
                <Rocket size={14} className="mr-2" />
                Deploy Bot
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start" asChild>
              <Link to="/controllers/grid-strike">
                <Zap size={14} className="mr-2" />
                Grid Strike
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity or Getting Started */}
      {connectedConnectors.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>Set up your first exchange connection</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              To start trading, you'll need to connect an exchange by adding your API keys.
            </p>
            <Button asChild>
              <Link to="/connectors/keys">
                <Key size={16} className="mr-2" />
                Add Exchange Keys
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
