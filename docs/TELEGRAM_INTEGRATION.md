# Telegram Integration Implementation Guide

> **Status: Implemented** - Deep link flow is complete. See setup instructions below.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CONDOR                                   │
│                  (Telegram Bot Server)                           │
│                                                                  │
│   config.yml:                                                    │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ servers:                                                 │   │
│   │   user_a_server:                                        │   │
│   │     host: user-a.example.com                            │   │
│   │     port: 8000                                          │   │
│   │     username: admin                                     │   │
│   │     password: ****                                      │   │
│   │                                                         │   │
│   │ server_access:                                          │   │
│   │   user_a_server:                                        │   │
│   │     owner_id: 123456789  # telegram_id                  │   │
│   │                                                         │   │
│   │ users:                                                  │   │
│   │   123456789:             # telegram_id                  │   │
│   │     role: user                                          │   │
│   │     username: fengtality                                │   │
│   └─────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────┘
                               │
           Telegram Bot API    │    REST API (NEW)
           (existing)          │    (to be added)
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ User A's     │    │ User B's         │    │ User C's         │
│ Telegram     │    │ Telegram         │    │ Telegram         │
│ App          │    │ App              │    │ App              │
└──────────────┘    └──────────────────┘    └──────────────────┘
        │                      │                      │
        │ (same user)         │                      │
        ▼                      ▼                      ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ User A's Setup   │  │ User B's Setup   │  │ User C's Setup   │
│ ┌──────────────┐ │  │ ┌──────────────┐ │  │ ┌──────────────┐ │
│ │  Dashboard   │ │  │ │  Dashboard   │ │  │ │  Dashboard   │ │
│ └──────┬───────┘ │  │ └──────────────┘ │  │ └──────────────┘ │
│        │         │  │                  │  │                  │
│ ┌──────▼───────┐ │  │ ┌──────────────┐ │  │ ┌──────────────┐ │
│ │  API Server  │ │  │ │  API Server  │ │  │ │  API Server  │ │
│ └──────────────┘ │  │ └──────────────┘ │  │ └──────────────┘ │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

## Current State (Condor)

### How Servers Are Registered Today (via Telegram)

1. User opens Telegram bot
2. Clicks "Servers" → "Add Server"
3. Enters: name, host, port, username, password
4. Condor stores in `config.yml` and associates with user's `telegram_id`

### Condor Data Structures

```yaml
# config.yml
servers:
  my_server:
    host: localhost
    port: 8000
    username: admin
    password: secret

users:
  123456789:                    # telegram_id
    user_id: 123456789
    username: fengtality
    role: user
    created_at: 1736450000

server_access:
  my_server:
    owner_id: 123456789         # telegram_id of owner
    created_at: 1736450000
    shared_with: {}
```

---

## Proposed Implementation

### Option A: Add REST API to Condor (Recommended)

Add a simple REST API to Condor that the Dashboard can call to register servers.

#### New Condor Endpoints

```
POST /api/servers/register
Authorization: Telegram Login Widget hash verification

Request Body:
{
  "telegram_auth": {
    "id": 123456789,
    "first_name": "Michael",
    "username": "fengtality",
    "auth_date": 1736450000,
    "hash": "abc123..."           # For verification
  },
  "server": {
    "name": "my_server",
    "host": "localhost",
    "port": 8000,
    "username": "admin",
    "password": "secret"
  }
}

Response:
{
  "success": true,
  "server_name": "my_server"
}
```

```
GET /api/servers/status
Authorization: Telegram auth hash

Request:
?telegram_id=123456789&auth_date=1736450000&hash=abc123...

Response:
{
  "connected": true,
  "telegram_username": "fengtality",
  "servers": ["my_server", "prod_server"]
}
```

```
DELETE /api/servers/{server_name}/unlink
Authorization: Telegram auth hash

Response:
{
  "success": true
}
```

#### Condor Code Changes

```python
# condor/api_server.py (NEW FILE)
from aiohttp import web
import hashlib
import hmac
from config_manager import get_config_manager

TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_TOKEN')

def verify_telegram_auth(auth_data: dict) -> bool:
    """Verify Telegram Login Widget authentication."""
    check_hash = auth_data.pop('hash')

    # Create data check string
    data_check_string = '\n'.join(
        f"{k}={v}" for k, v in sorted(auth_data.items())
    )

    # Create secret key from bot token
    secret_key = hashlib.sha256(TELEGRAM_BOT_TOKEN.encode()).digest()

    # Calculate HMAC
    calculated_hash = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256
    ).hexdigest()

    # Verify hash matches
    if calculated_hash != check_hash:
        return False

    # Verify auth_date is recent (within 24 hours)
    if time.time() - auth_data['auth_date'] > 86400:
        return False

    return True

async def register_server(request):
    data = await request.json()

    # Verify Telegram authentication
    if not verify_telegram_auth(data['telegram_auth'].copy()):
        return web.json_response({'error': 'Invalid authentication'}, status=401)

    telegram_id = data['telegram_auth']['id']
    username = data['telegram_auth'].get('username')
    server = data['server']

    cm = get_config_manager()

    # Register user if new
    if not cm.get_user_role(telegram_id):
        cm.register_pending(telegram_id, username)
        cm.approve_user(telegram_id, telegram_id)  # Auto-approve from dashboard

    # Add server
    success = cm.add_server(
        name=server['name'],
        host=server['host'],
        port=server['port'],
        username=server['username'],
        password=server['password'],
        owner_id=telegram_id
    )

    return web.json_response({'success': success, 'server_name': server['name']})

async def get_status(request):
    telegram_id = int(request.query.get('telegram_id'))
    auth_data = {
        'id': telegram_id,
        'auth_date': int(request.query.get('auth_date')),
        'hash': request.query.get('hash')
    }

    if not verify_telegram_auth(auth_data.copy()):
        return web.json_response({'error': 'Invalid authentication'}, status=401)

    cm = get_config_manager()
    servers = cm.get_accessible_servers(telegram_id)
    user = cm._data['users'].get(telegram_id, {})

    return web.json_response({
        'connected': len(servers) > 0,
        'telegram_username': user.get('username'),
        'servers': list(servers.keys())
    })

# Add to main.py
app = web.Application()
app.router.add_post('/api/servers/register', register_server)
app.router.add_get('/api/servers/status', get_status)
app.router.add_delete('/api/servers/{name}/unlink', unlink_server)

# Run alongside Telegram bot
web.run_app(app, port=8080)
```

---

### Option B: Deep Link Flow (No Condor Changes)

Use Telegram deep links to trigger registration in the bot itself.

#### Flow

1. Dashboard gets `telegram_id` via Telegram Login Widget
2. Dashboard generates a deep link:
   ```
   https://t.me/YourBotName?start=register_SERVER-NAME_HOST_PORT_USER_PASS
   ```
3. User clicks link → opens Telegram → bot receives `/start register_...`
4. Bot parses params and registers server

#### Pros/Cons
- **Pro**: No changes to Condor's architecture
- **Con**: User has to click through to Telegram
- **Con**: Sensitive data (password) in URL (can be encrypted)
- **Con**: Less seamless UX

---

## Dashboard Implementation

### 1. Environment Variables

```env
# .env
VITE_TELEGRAM_BOT_USERNAME=YourBotName
VITE_CONDOR_API_URL=https://condor.example.com/api
```

### 2. Telegram Login Widget Component

```tsx
// src/components/TelegramLoginButton.tsx
import { useEffect, useRef } from 'react';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface Props {
  botName: string;
  onAuth: (user: TelegramUser) => void;
  buttonSize?: 'large' | 'medium' | 'small';
}

export function TelegramLoginButton({ botName, onAuth, buttonSize = 'large' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Create callback function
    const callbackName = 'onTelegramAuth';
    (window as any)[callbackName] = (user: TelegramUser) => {
      onAuth(user);
    };

    // Create and inject script
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botName);
    script.setAttribute('data-size', buttonSize);
    script.setAttribute('data-onauth', `${callbackName}(user)`);
    script.setAttribute('data-request-access', 'write');
    script.async = true;

    containerRef.current?.appendChild(script);

    return () => {
      delete (window as any)[callbackName];
      script.remove();
    };
  }, [botName, buttonSize, onAuth]);

  return <div ref={containerRef} />;
}
```

### 3. API Client Extensions

```typescript
// src/api/client.ts

// Condor API for Telegram integration
const CONDOR_API_URL = import.meta.env.VITE_CONDOR_API_URL;

export interface TelegramAuthData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export interface TelegramStatus {
  connected: boolean;
  telegram_username?: string;
  servers: string[];
}

export const telegram = {
  // Register server with Condor
  registerServer: async (
    telegramAuth: TelegramAuthData,
    server: {
      name: string;
      host: string;
      port: number;
      username: string;
      password: string;
    }
  ) => {
    const response = await fetch(`${CONDOR_API_URL}/servers/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telegram_auth: telegramAuth,
        server,
      }),
    });
    return response.json();
  },

  // Get connection status
  getStatus: async (telegramAuth: TelegramAuthData): Promise<TelegramStatus> => {
    const params = new URLSearchParams({
      telegram_id: String(telegramAuth.id),
      auth_date: String(telegramAuth.auth_date),
      hash: telegramAuth.hash,
    });
    const response = await fetch(`${CONDOR_API_URL}/servers/status?${params}`);
    return response.json();
  },

  // Unlink server
  unlinkServer: async (telegramAuth: TelegramAuthData, serverName: string) => {
    const response = await fetch(`${CONDOR_API_URL}/servers/${serverName}/unlink`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegram_auth: telegramAuth }),
    });
    return response.json();
  },
};
```

### 4. Account Page Component

```tsx
// src/pages/AccountPage.tsx
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TelegramLoginButton } from '@/components/TelegramLoginButton';
import { telegram, TelegramAuthData, TelegramStatus } from '@/api/client';
import { config } from '@/config';
import { CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AccountPage() {
  const [telegramAuth, setTelegramAuth] = useState<TelegramAuthData | null>(null);
  const [telegramStatus, setTelegramStatus] = useState<TelegramStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME;

  // Check if already connected (from localStorage)
  useEffect(() => {
    const saved = localStorage.getItem('telegramAuth');
    if (saved) {
      const auth = JSON.parse(saved);
      setTelegramAuth(auth);
      checkStatus(auth);
    }
  }, []);

  async function checkStatus(auth: TelegramAuthData) {
    try {
      const status = await telegram.getStatus(auth);
      setTelegramStatus(status);
    } catch (err) {
      console.error('Failed to check Telegram status:', err);
    }
  }

  async function handleTelegramAuth(user: TelegramAuthData) {
    setLoading(true);
    try {
      // Store auth data
      setTelegramAuth(user);
      localStorage.setItem('telegramAuth', JSON.stringify(user));

      // Register server with Condor
      const result = await telegram.registerServer(user, {
        name: `dashboard_${user.id}`,
        host: window.location.hostname,
        port: parseInt(config.api.baseUrl.split(':')[2]) || 8000,
        username: config.api.username,
        password: config.api.password,
      });

      if (result.success) {
        toast.success('Telegram connected successfully');
        await checkStatus(user);
      } else {
        toast.error(result.error || 'Failed to connect Telegram');
      }
    } catch (err) {
      toast.error('Failed to connect Telegram');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUnlink() {
    if (!telegramAuth || !telegramStatus) return;

    setLoading(true);
    try {
      for (const server of telegramStatus.servers) {
        await telegram.unlinkServer(telegramAuth, server);
      }
      setTelegramAuth(null);
      setTelegramStatus(null);
      localStorage.removeItem('telegramAuth');
      toast.success('Telegram disconnected');
    } catch (err) {
      toast.error('Failed to disconnect Telegram');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Account</h1>

      <Tabs defaultValue="account">
        <TabsList className="mb-4">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-6">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Username</span>
                <span className="font-mono">{config.api.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">API Server</span>
                <span className="font-mono">{config.api.baseUrl}</span>
              </div>
            </CardContent>
          </Card>

          {/* Telegram Integration Card */}
          <Card>
            <CardHeader>
              <CardTitle>Connect Telegram</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Left: Description */}
                <div className="flex-1 space-y-4">
                  <div>
                    <h3 className="font-semibold">Link account</h3>
                    <p className="text-sm text-muted-foreground">
                      Connect a Telegram account to submit orders and receive updates.
                    </p>
                  </div>

                  {telegramStatus?.connected && (
                    <div>
                      <h3 className="font-semibold">Telegram Notifications</h3>
                      <p className="text-sm text-muted-foreground">
                        Manage which notifications you'd like to receive.
                        You can turn these off at any time.
                      </p>
                    </div>
                  )}
                </div>

                {/* Right: Connection Status / Widget */}
                <div className="flex-1">
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="animate-spin" />
                      <span>Connecting...</span>
                    </div>
                  ) : telegramStatus?.connected ? (
                    <div className="space-y-6">
                      {/* Connected User */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="text-green-500" size={20} />
                          <span className="font-medium">
                            {telegramStatus.telegram_username || telegramAuth?.first_name}
                          </span>
                        </div>
                        <Button variant="outline" onClick={handleUnlink}>
                          Unlink
                        </Button>
                      </div>

                      {/* Notification Toggles */}
                      <div className="space-y-4">
                        {[
                          { key: 'order_completion', label: 'Order Completion', desc: 'Receive a notification when orders finish' },
                          { key: 'partially_filled', label: 'Partially Filled', desc: 'Receive a notification when an order finishes partially filled' },
                          { key: 'first_fill', label: 'First Fill', desc: 'Receive a notification for the first fill of an order' },
                          { key: 'order_progress', label: 'Order Progress', desc: 'Receive a notification for order progress on 25%, 50%, 75%' },
                          { key: 'order_overfill', label: 'Order Overfill', desc: 'Receive a notification when an order overfills' },
                          { key: 'order_pause', label: 'Order Pause', desc: 'Receive a notification when an order pauses' },
                          { key: 'order_resume', label: 'Order Resume', desc: 'Receive a notification when an order resumes' },
                        ].map((item) => (
                          <div key={item.key} className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{item.label}</div>
                              <div className="text-sm text-muted-foreground">{item.desc}</div>
                            </div>
                            <Switch />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <TelegramLoginButton
                      botName={botUsername}
                      onAuth={handleTelegramAuth}
                      buttonSize="large"
                    />
                  )}
                </div>
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
```

### 5. Add Route

```tsx
// src/App.tsx
import AccountPage from './pages/AccountPage';

// Add to routes:
<Route path="account" element={<AccountPage />} />
```

### 6. Add to Navigation

```tsx
// In Layout.tsx navbar
<Link to="/account">Account</Link>
```

---

## Security Considerations

### 1. Telegram Auth Verification
- **Always verify the hash** on the server side (Condor)
- Check `auth_date` is within 24 hours to prevent replay attacks
- Never trust client-side verification alone

### 2. Server Credentials
- Passwords are sent to Condor over HTTPS
- Condor stores passwords in `config.yml` (consider encryption at rest)
- Dashboard should only send credentials over secure connections

### 3. CORS Configuration
- Condor API must allow requests from Dashboard origin
- Use specific origins, not wildcard `*`

```python
# Condor CORS setup
from aiohttp_cors import setup as cors_setup, ResourceOptions

cors = cors_setup(app, defaults={
    "https://your-dashboard.com": ResourceOptions(
        allow_credentials=True,
        allow_headers="*",
        allow_methods="*"
    )
})
```

---

## Testing Checklist

- [ ] Telegram Login Widget loads correctly
- [ ] Auth callback receives user data with valid hash
- [ ] Server registration succeeds in Condor
- [ ] Status endpoint returns connected state
- [ ] Unlink properly removes server from Condor
- [ ] Bot commands work after linking (/portfolio, /balance, etc.)
- [ ] Notification preferences are saved and respected

---

## Environment Setup Summary

### Dashboard (.env)
```env
VITE_TELEGRAM_BOT_USERNAME=HummingbotCondorBot
VITE_CONDOR_API_URL=https://condor.example.com/api
```

### Condor (.env)
```env
TELEGRAM_TOKEN=123456:ABC-DEF...
ADMIN_USER_ID=456181693
API_PORT=8080
ALLOWED_ORIGINS=https://your-dashboard.com
```

### BotFather Setup
1. Create bot: `/newbot`
2. Set domain: `/setdomain` → enter your dashboard domain
3. Get token and add to Condor `.env`

---

## Quick Start (Implemented Deep Link Flow)

The deep link flow has been implemented. Here's how to test:

### 1. Configure Dashboard

Add to your `.env`:
```env
VITE_TELEGRAM_BOT_USERNAME=YourBotName
# Optional: shared secret (defaults to first 32 chars of bot token)
# VITE_DASHBOARD_SECRET=your_secret
```

### 2. Configure Condor

The bot token is used as the shared secret by default. No additional config needed unless you want a custom secret:
```env
# Optional: custom secret (must match VITE_DASHBOARD_SECRET)
# DASHBOARD_SECRET=your_secret
```

### 3. Start Both Services

```bash
# Terminal 1: Start Condor
cd ~/condor
python main.py

# Terminal 2: Start Dashboard
cd ~/dashboard-vite
npm run dev
```

### 4. Test the Flow

1. Open Dashboard → Account page (`/account`)
2. Enter a server name
3. Click "Connect to Telegram"
4. Telegram opens with the bot
5. Bot registers your server automatically
6. Try `/portfolio` or `/trade` in Telegram

### Files Changed

**Condor:**
- `utils/config.py` - Added `DASHBOARD_SECRET`
- `utils/deeplink.py` - New file for encoding/decoding deep links
- `main.py` - Added `_handle_dashboard_registration()` handler

**Dashboard:**
- `src/lib/deeplink.ts` - Deep link generation utility
- `src/pages/AccountPage.tsx` - Account settings page
- `src/App.tsx` - Added `/account` route
- `src/components/Layout.tsx` - Added Account nav link
- `.env.example` - Added Telegram config vars
