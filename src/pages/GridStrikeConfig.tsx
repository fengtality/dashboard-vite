import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { controllers, marketData, connectors } from '../api/client';
import type { ControllerConfig } from '../api/client';
import { Loader2, Plus, Zap, Pencil, Trash2, RefreshCw, HelpCircle } from 'lucide-react';
import { CandlestickChart } from '@/components/ui/candlestick-chart';
import type { Candle } from '@/components/ui/candlestick-chart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Field label with hover card for help text
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

interface GridStrikeFormData {
  id: string;
  connector_name: string;
  trading_pair: string;
  side: 'BUY' | 'SELL';
  total_amount_quote: string;
  leverage: number;
  position_mode: 'HEDGE' | 'ONEWAY';
  start_price: string;
  end_price: string;
  limit_price: string;
  min_spread_between_orders: string;
  min_order_amount_quote: string;
  max_open_orders: number;
  max_orders_per_batch: number;
  order_frequency: number;
  activation_bounds: string;
  // Triple barrier config
  take_profit: string;
  stop_loss: string;
  time_limit: string;
  trailing_stop: string;
  open_order_type: number;
  take_profit_order_type: number;
  stop_loss_order_type: number;
  time_limit_order_type: number;
  // Behavior
  keep_position: boolean;
  coerce_tp_to_step: boolean;
  manual_kill_switch: boolean;
}

// Generate random config name: adj + controller_name
const adjectives = [
  'swift', 'bold', 'calm', 'dark', 'bright', 'quick', 'slow', 'wild', 'gentle', 'fierce',
  'silent', 'loud', 'deep', 'high', 'low', 'warm', 'cool', 'sharp', 'soft', 'steady',
  'rapid', 'smooth', 'rough', 'light', 'heavy', 'fast', 'keen', 'prime', 'grand', 'noble',
  'vivid', 'pure', 'stark', 'rare', 'true', 'brave', 'wise', 'fair', 'fine', 'great',
];
function generateRandomConfigName(controllerName: string): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  return `${adj}_${controllerName}`;
}

const defaultFormData: GridStrikeFormData = {
  id: generateRandomConfigName('grid_strike'),
  connector_name: '',
  trading_pair: 'BTC-USDC',
  side: 'BUY',
  total_amount_quote: '1000',
  leverage: 20,
  position_mode: 'HEDGE',
  start_price: '',
  end_price: '',
  limit_price: '',
  min_spread_between_orders: '0.001',
  min_order_amount_quote: '5',
  max_open_orders: 2,
  max_orders_per_batch: 1,
  order_frequency: 3,
  activation_bounds: '',
  // Triple barrier config defaults
  take_profit: '0.001',
  stop_loss: '',
  time_limit: '',
  trailing_stop: '',
  open_order_type: 3,        // LIMIT_MAKER
  take_profit_order_type: 3, // LIMIT_MAKER
  stop_loss_order_type: 1,   // MARKET
  time_limit_order_type: 1,  // MARKET
  // Behavior
  keep_position: false,
  coerce_tp_to_step: false,
  manual_kill_switch: false,
};


// Helper to parse side from API format (numeric: 1=BUY, 2=SELL or string)
function parseSide(value: unknown): 'BUY' | 'SELL' {
  if (value === 2 || String(value).includes('SELL')) return 'SELL';
  return 'BUY';
}

// Helper to parse position mode from API format
function parsePositionMode(value: unknown): 'HEDGE' | 'ONEWAY' {
  const str = String(value);
  if (str.includes('ONEWAY') || str.includes('ONE_WAY')) return 'ONEWAY';
  return 'HEDGE';
}

export default function GridStrikeConfig() {
  const [formData, setFormData] = useState<GridStrikeFormData>(defaultFormData);
  const [existingConfigs, setExistingConfigs] = useState<ControllerConfig[]>([]);
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loadingCandles, setLoadingCandles] = useState(false);
  const [chartTimeframe, setChartTimeframe] = useState<'1h' | '1d' | '7d'>('1d');

  // Connector list
  const [connectorList, setConnectorList] = useState<string[]>([]);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<string | null>(null);

  // Refresh trigger
  const [refreshKey, setRefreshKey] = useState(0);

  // Template field type
  interface TemplateField {
    default: unknown;
    type: string;
    required: boolean;
  }

  // Load existing configs, template, and connectors on mount
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Fetch all controller configs and filter for grid_strike
        const [allConfigs, allConnectors] = await Promise.all([
          controllers.listConfigs(),
          connectors.list(),
        ]);
        const gridStrikeConfigs = allConfigs.filter(
          (c) => c.controller_name === 'grid_strike'
        );
        setExistingConfigs(gridStrikeConfigs);
        setConnectorList(allConnectors);

        // Load template for defaults (only if not editing)
        if (!editingConfig) {
          const newFormData = { ...defaultFormData, id: generateRandomConfigName('grid_strike') };

          // Load template defaults
          try {
            const template = await controllers.getConfigTemplate('generic', 'grid_strike') as Record<string, TemplateField>;
            if (template) {
              // Basic settings
              if (template.total_amount_quote?.default) newFormData.total_amount_quote = String(template.total_amount_quote.default);
              if (template.leverage?.default) newFormData.leverage = Number(template.leverage.default);
              if (template.min_spread_between_orders?.default) newFormData.min_spread_between_orders = String(template.min_spread_between_orders.default);
              if (template.min_order_amount_quote?.default) newFormData.min_order_amount_quote = String(template.min_order_amount_quote.default);
              if (template.max_open_orders?.default) newFormData.max_open_orders = Number(template.max_open_orders.default);
              if (template.max_orders_per_batch?.default) newFormData.max_orders_per_batch = Number(template.max_orders_per_batch.default);
              if (template.order_frequency?.default) newFormData.order_frequency = Number(template.order_frequency.default);
              if (template.connector_name?.default) newFormData.connector_name = String(template.connector_name.default);
              if (template.trading_pair?.default) newFormData.trading_pair = String(template.trading_pair.default);
              if (template.position_mode?.default) newFormData.position_mode = parsePositionMode(template.position_mode.default);

              // Triple barrier config
              const tbc = template.triple_barrier_config?.default as Record<string, unknown> | undefined;
              if (tbc) {
                if (tbc.take_profit !== null && tbc.take_profit !== undefined) newFormData.take_profit = String(tbc.take_profit);
                if (tbc.stop_loss !== null && tbc.stop_loss !== undefined) newFormData.stop_loss = String(tbc.stop_loss);
                if (tbc.time_limit !== null && tbc.time_limit !== undefined) newFormData.time_limit = String(tbc.time_limit);
                if (tbc.open_order_type !== null && tbc.open_order_type !== undefined) newFormData.open_order_type = Number(tbc.open_order_type);
                if (tbc.take_profit_order_type !== null && tbc.take_profit_order_type !== undefined) newFormData.take_profit_order_type = Number(tbc.take_profit_order_type);
                if (tbc.stop_loss_order_type !== null && tbc.stop_loss_order_type !== undefined) newFormData.stop_loss_order_type = Number(tbc.stop_loss_order_type);
                if (tbc.time_limit_order_type !== null && tbc.time_limit_order_type !== undefined) newFormData.time_limit_order_type = Number(tbc.time_limit_order_type);
                // Trailing stop is an object with trailing_delta
                const ts = tbc.trailing_stop as { trailing_delta?: number } | undefined;
                if (ts?.trailing_delta !== null && ts?.trailing_delta !== undefined) newFormData.trailing_stop = String(ts.trailing_delta);
              }

              // Behavior flags
              if (template.keep_position?.default !== undefined) newFormData.keep_position = Boolean(template.keep_position.default);
              if (template.coerce_tp_to_step?.default !== undefined) newFormData.coerce_tp_to_step = Boolean(template.coerce_tp_to_step.default);
              if (template.manual_kill_switch?.default !== undefined) newFormData.manual_kill_switch = Boolean(template.manual_kill_switch.default);
            }
          } catch {
            // Ignore template error
          }

          setFormData(newFormData);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [refreshKey, editingConfig]);

  // Fetch candles - updatePrices controls whether to recalculate grid prices
  async function fetchCandles(updatePrices = true) {
    if (!formData.connector_name || !formData.trading_pair) {
      toast.error('Please enter connector and trading pair first');
      return;
    }

    // Map timeframe to candle interval and count
    // 1h = 1m × 60, 1d = 5m × 288, 7d = 1h × 168
    const timeframeConfig = {
      '1h': { interval: '1m', max_records: 60 },
      '1d': { interval: '5m', max_records: 288 },
      '7d': { interval: '1h', max_records: 168 },
    };
    const { interval, max_records } = timeframeConfig[chartTimeframe];

    setLoadingCandles(true);
    try {
      const response = await marketData.getCandles({
        connector_name: formData.connector_name,
        trading_pair: formData.trading_pair,
        interval,
        max_records,
      });

      // Parse candle data - API returns array of objects
      interface CandleResponse {
        timestamp: number;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
      }
      const data = response as CandleResponse[];
      if (Array.isArray(data) && data.length > 0) {
        const parsedCandles: Candle[] = data.map((c) => ({
          timestamp: c.timestamp * 1000, // Convert seconds to milliseconds
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume,
        }));

        // Only calculate prices on initial load, not when changing timeframe
        if (updatePrices) {
          const highestHigh = Math.max(...parsedCandles.map(c => c.high));
          const lowestLow = Math.min(...parsedCandles.map(c => c.low));
          const range = highestHigh - lowestLow;

          // BUY (long): start at low, end at high, limit 20% below start
          // SELL (short): start at high, end at low, limit 20% above start
          let start: number, end: number, limit: number;
          if (formData.side === 'BUY') {
            start = lowestLow;
            end = highestHigh;
            limit = start - (range * 0.2);
          } else {
            start = highestHigh;
            end = lowestLow;
            limit = start + (range * 0.2);
          }

          setFormData(prev => ({
            ...prev,
            start_price: start.toFixed(4),
            end_price: end.toFixed(4),
            limit_price: limit.toFixed(4),
          }));
        }

        setCandles(parsedCandles);
      } else {
        toast.error('No candle data returned');
        setCandles([]);
      }
    } catch (err) {
      console.error('Failed to fetch candles:', err);
      toast.error('Failed to fetch candles');
      setCandles([]);
    } finally {
      setLoadingCandles(false);
    }
  }

  // Recalculate prices when side changes (only in create mode, not when editing)
  useEffect(() => {
    if (candles.length === 0 || editingConfig) return;

    const highestHigh = Math.max(...candles.map(c => c.high));
    const lowestLow = Math.min(...candles.map(c => c.low));
    const range = highestHigh - lowestLow;

    let start: number, end: number, limit: number;
    if (formData.side === 'BUY') {
      start = lowestLow;
      end = highestHigh;
      limit = start - (range * 0.2);
    } else {
      start = highestHigh;
      end = lowestLow;
      limit = start + (range * 0.2);
    }

    setFormData(prev => ({
      ...prev,
      start_price: start.toFixed(4),
      end_price: end.toFixed(4),
      limit_price: limit.toFixed(4),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.side]);

  // Auto-fetch candles and calculate prices when connector/pair changes (only in create mode)
  // Debounced to avoid rate limits when typing
  useEffect(() => {
    if (!formData.connector_name || !formData.trading_pair || editingConfig) return;

    const timer = setTimeout(() => {
      fetchCandles(true);
    }, 800);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.connector_name, formData.trading_pair]);

  // Refresh chart when timeframe changes (don't update prices)
  useEffect(() => {
    if (!formData.connector_name || !formData.trading_pair || candles.length === 0) return;
    fetchCandles(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartTimeframe]);

  // Load a specific config for editing
  async function loadConfigForEditing(configId: string) {
    setLoading(true);
    setError(null);
    try {
      const config = await controllers.getConfig(configId);

      // Parse triple barrier config if present
      const tbc = config.triple_barrier_config as Record<string, unknown> | undefined;

      // Map API config to form data
      const newFormData: GridStrikeFormData = {
        id: config.id || configId,
        connector_name: String(config.connector_name || defaultFormData.connector_name),
        trading_pair: String(config.trading_pair || defaultFormData.trading_pair),
        side: parseSide(config.side),
        total_amount_quote: String(config.total_amount_quote || defaultFormData.total_amount_quote),
        leverage: Number(config.leverage) || defaultFormData.leverage,
        position_mode: parsePositionMode(config.position_mode),
        start_price: String(config.start_price || defaultFormData.start_price),
        end_price: String(config.end_price || defaultFormData.end_price),
        limit_price: String(config.limit_price || defaultFormData.limit_price),
        min_spread_between_orders: String(config.min_spread_between_orders || ''),
        min_order_amount_quote: String(config.min_order_amount_quote || ''),
        max_open_orders: Number(config.max_open_orders) || defaultFormData.max_open_orders,
        max_orders_per_batch: Number(config.max_orders_per_batch) || defaultFormData.max_orders_per_batch,
        order_frequency: Number(config.order_frequency) || defaultFormData.order_frequency,
        activation_bounds: config.activation_bounds ? String(config.activation_bounds) : '',
        // Triple barrier config
        take_profit: tbc?.take_profit ? String(tbc.take_profit) : '',
        stop_loss: tbc?.stop_loss ? String(tbc.stop_loss) : '',
        time_limit: tbc?.time_limit ? String(tbc.time_limit) : '',
        trailing_stop: tbc?.trailing_stop ? String((tbc.trailing_stop as { trailing_delta?: number })?.trailing_delta || '') : '',
        open_order_type: Number(tbc?.open_order_type) || defaultFormData.open_order_type,
        take_profit_order_type: Number(tbc?.take_profit_order_type) || defaultFormData.take_profit_order_type,
        stop_loss_order_type: Number(tbc?.stop_loss_order_type) || defaultFormData.stop_loss_order_type,
        time_limit_order_type: Number(tbc?.time_limit_order_type) || defaultFormData.time_limit_order_type,
        // Behavior
        keep_position: Boolean(config.keep_position),
        coerce_tp_to_step: Boolean(config.coerce_tp_to_step),
        manual_kill_switch: Boolean(config.manual_kill_switch),
      };

      setFormData(newFormData);
      setEditingConfig(configId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load config');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setEditingConfig(null);
    setFormData({ ...defaultFormData, id: generateRandomConfigName('grid_strike') });
    setCandles([]);
    setRefreshKey((k) => k + 1);
  }

  function updateField<K extends keyof GridStrikeFormData>(field: K, value: GridStrikeFormData[K]) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.id.trim()) {
      setError('Please enter a config name');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Build the config object for the API
      // side: 1 = BUY, 2 = SELL
      // position_mode: "HEDGE" or "ONEWAY" (no prefix)
      const config = {
        id: formData.id,
        controller_name: 'grid_strike',
        controller_type: 'generic',
        connector_name: formData.connector_name,
        trading_pair: formData.trading_pair,
        side: formData.side === 'BUY' ? 1 : 2,
        total_amount_quote: parseFloat(formData.total_amount_quote) || 0,
        leverage: formData.leverage,
        position_mode: formData.position_mode,
        start_price: parseFloat(formData.start_price) || 0,
        end_price: parseFloat(formData.end_price) || 0,
        limit_price: parseFloat(formData.limit_price) || 0,
        min_spread_between_orders: formData.min_spread_between_orders ? parseFloat(formData.min_spread_between_orders) : null,
        min_order_amount_quote: formData.min_order_amount_quote ? parseFloat(formData.min_order_amount_quote) : null,
        max_open_orders: formData.max_open_orders,
        max_orders_per_batch: formData.max_orders_per_batch || null,
        order_frequency: formData.order_frequency,
        activation_bounds: formData.activation_bounds ? parseFloat(formData.activation_bounds) : null,
        keep_position: formData.keep_position,
        coerce_tp_to_step: formData.coerce_tp_to_step,
        manual_kill_switch: formData.manual_kill_switch,
        triple_barrier_config: {
          take_profit: formData.take_profit ? parseFloat(formData.take_profit) : null,
          stop_loss: formData.stop_loss ? parseFloat(formData.stop_loss) : null,
          time_limit: formData.time_limit ? parseInt(formData.time_limit) : null,
          trailing_stop: formData.trailing_stop ? {
            activation_price: null,
            trailing_delta: parseFloat(formData.trailing_stop),
          } : null,
          open_order_type: formData.open_order_type,
          take_profit_order_type: formData.take_profit_order_type,
          stop_loss_order_type: formData.stop_loss_order_type,
          time_limit_order_type: formData.time_limit_order_type,
        },
      };

      // Validate config before saving
      await controllers.validateConfig('generic', 'grid_strike', config);

      await controllers.createOrUpdateConfig(formData.id, config);

      if (editingConfig) {
        toast.success(`Grid Strike config "${formData.id}" updated successfully`);
      } else {
        toast.success(`Grid Strike config "${formData.id}" created successfully`);
      }

      // Reset and refresh
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save config');
    } finally {
      setSubmitting(false);
    }
  }

  function openDeleteDialog(configId: string) {
    setConfigToDelete(configId);
    setDeleteDialogOpen(true);
  }

  async function handleDelete() {
    if (!configToDelete) return;

    try {
      await controllers.deleteConfig(configToDelete);
      toast.success(`Config "${configToDelete}" deleted`);

      // If we were editing the deleted config, reset form
      if (editingConfig === configToDelete) {
        resetForm();
      } else {
        setRefreshKey((k) => k + 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete config');
    } finally {
      setDeleteDialogOpen(false);
      setConfigToDelete(null);
    }
  }

  if (loading && existingConfigs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={24} className="text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Grid Strike</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Configure Grid Strike strategies for automated grid trading.
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="mb-6">
        <Tabs value={mode} onValueChange={(v) => {
          setMode(v as 'create' | 'edit');
          if (v === 'create') {
            resetForm();
          }
        }}>
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

      {/* Existing Configs - Only show in Edit mode */}
      {mode === 'edit' && existingConfigs.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Saved Configs</CardTitle>
            <CardDescription>Edit or delete existing configurations</CardDescription>
          </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {existingConfigs.map((config) => (
                  <div
                    key={config.id}
                    onClick={() => loadConfigForEditing(config.id)}
                    className={`flex items-center justify-between p-2 rounded-lg border text-sm cursor-pointer ${
                      editingConfig === config.id
                        ? 'bg-primary/10 border-primary'
                        : 'bg-background border-border hover:border-muted-foreground/50 hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Zap size={14} className="text-primary" />
                      <span className="font-medium">{config.id}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); openDeleteDialog(config.id); }}
                      className="h-7 px-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      {/* No configs message in edit mode */}
      {mode === 'edit' && existingConfigs.length === 0 && (
        <Card className="mb-6">
          <CardContent className="py-8 text-center text-muted-foreground">
            No saved configs. Switch to Create Config to make one.
          </CardContent>
        </Card>
      )}

      {/* Form Header - show when editing */}
      {mode === 'edit' && editingConfig && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="text-xs">Editing</Badge>
            <span className="text-foreground font-medium text-sm">{editingConfig}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => { resetForm(); setMode('create'); }} className="h-7 text-xs">
            <Plus size={12} className="mr-1" />
            Create New
          </Button>
        </div>
      )}

      {/* Form and Sidebar Container - Show when creating or when editing a selected config */}
      {(mode === 'create' || (mode === 'edit' && editingConfig)) && (
      <div className="flex gap-6 items-start min-w-0">
        {/* Main Form Column */}
        <form onSubmit={handleSubmit} className="flex-1 min-w-0 space-y-6">
          {/* Market */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Market</CardTitle>
              <CardDescription>Exchange connector and trading pair</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="connector_name" help="The exchange connector name to use for trading (e.g., binance_perpetual, kucoin_perpetual).">Connector</FieldLabel>
                  <Combobox
                    options={connectorList.map((c) => ({ value: c, label: c }))}
                    value={formData.connector_name}
                    onValueChange={(v) => updateField('connector_name', v)}
                    placeholder="Select connector..."
                    searchPlaceholder="Search connectors..."
                    emptyText="No connectors found."
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="trading_pair" help="Trading pair in Base-Quote format (e.g., BTC-USDT, ETH-USDC).">Trading Pair</FieldLabel>
                  <Input
                    id="trading_pair"
                    type="text"
                    value={formData.trading_pair}
                    onChange={(e) => updateField('trading_pair', e.target.value)}
                    placeholder="BTC-USDT"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Grid Settings with Chart */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Grid</CardTitle>
                  <CardDescription>Price range and grid direction</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Tabs value={chartTimeframe} onValueChange={(v) => setChartTimeframe(v as '1h' | '1d' | '7d')}>
                    <TabsList className="bg-background gap-1 border p-1 h-auto">
                      <TabsTrigger value="1h" className="text-xs px-2 py-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">1h</TabsTrigger>
                      <TabsTrigger value="1d" className="text-xs px-2 py-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">1d</TabsTrigger>
                      <TabsTrigger value="7d" className="text-xs px-2 py-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">7d</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => fetchCandles(false)}
                    disabled={loadingCandles}
                    className="h-8 w-8"
                  >
                    {loadingCandles ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <RefreshCw size={16} />
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <FieldLabel htmlFor="side" help="Grid direction: BUY creates a long grid (profit when price rises), SELL creates a short grid (profit when price falls).">Side</FieldLabel>
                <Select value={formData.side} onValueChange={(v) => updateField('side', v as 'BUY' | 'SELL')}>
                  <SelectTrigger id="side">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUY">BUY (Long Grid)</SelectItem>
                    <SelectItem value="SELL">SELL (Short Grid)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full overflow-hidden relative">
                {loadingCandles && (
                  <div className="absolute inset-0 z-10 flex flex-col gap-2 p-4 bg-background/80">
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="flex-1 w-full min-h-[250px]" />
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-3 w-12" />
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  </div>
                )}
                <CandlestickChart
                  candles={candles}
                  height={300}
                  priceLines={[
                    { id: 'start', price: parseFloat(formData.start_price) || 0, color: '#22c55e', title: 'Start', lineStyle: 'dashed' as const, draggable: true },
                    { id: 'end', price: parseFloat(formData.end_price) || 0, color: '#3b82f6', title: 'End', lineStyle: 'dashed' as const, draggable: true },
                    { id: 'limit', price: parseFloat(formData.limit_price) || 0, color: '#ef4444', title: 'Limit', lineStyle: 'solid' as const, draggable: true },
                  ].filter(l => l.price > 0)}
                  onPriceLineChange={(id, newPrice) => {
                    if (id === 'start') {
                      updateField('start_price', newPrice.toString());
                    } else if (id === 'end') {
                      updateField('end_price', newPrice.toString());
                    } else if (id === 'limit') {
                      updateField('limit_price', newPrice.toString());
                    }
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Drag price lines to adjust values
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="start_price" help="The price where the grid begins placing orders. For BUY grids, this is typically the lower bound.">Start Price</FieldLabel>
                  <Input
                    id="start_price"
                    type="text"
                    value={formData.start_price}
                    onChange={(e) => updateField('start_price', e.target.value)}
                    placeholder="Auto-set"
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="end_price" help="The price where the grid stops placing orders. For BUY grids, this is typically the upper bound.">End Price</FieldLabel>
                  <Input
                    id="end_price"
                    type="text"
                    value={formData.end_price}
                    onChange={(e) => updateField('end_price', e.target.value)}
                    placeholder="Auto-set"
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="limit_price" help="Stop-loss limit price. Orders will not be placed beyond this price to limit downside risk.">Limit Price</FieldLabel>
                  <Input
                    id="limit_price"
                    type="text"
                    value={formData.limit_price}
                    onChange={(e) => updateField('limit_price', e.target.value)}
                    placeholder="Auto-set"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Amount Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Amount</CardTitle>
              <CardDescription>Size and leverage settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="total_amount_quote" help="Total position size in quote currency (e.g., USDT). This is distributed across all grid levels.">Total Amount (Quote)</FieldLabel>
                  <Input
                    id="total_amount_quote"
                    type="text"
                    value={formData.total_amount_quote}
                    onChange={(e) => updateField('total_amount_quote', e.target.value)}
                    placeholder="1000"
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="leverage" help="Position leverage multiplier (1-125x). Higher leverage increases both potential profit and risk.">Leverage</FieldLabel>
                  <Input
                    id="leverage"
                    type="number"
                    value={formData.leverage}
                    onChange={(e) => updateField('leverage', parseInt(e.target.value) || 1)}
                    min={1}
                    max={125}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Orders */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Orders</CardTitle>
              <CardDescription>Order limits and timing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="max_open_orders" help="Maximum number of open orders at any time. Limits exposure and exchange rate limits.">Max Open Orders</FieldLabel>
                  <Input
                    id="max_open_orders"
                    type="number"
                    value={formData.max_open_orders}
                    onChange={(e) => updateField('max_open_orders', parseInt(e.target.value) || 1)}
                    min={1}
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="order_frequency" help="Minimum seconds between order placements. Prevents hitting exchange rate limits.">Order Frequency (sec)</FieldLabel>
                  <Input
                    id="order_frequency"
                    type="number"
                    value={formData.order_frequency}
                    onChange={(e) => updateField('order_frequency', parseInt(e.target.value) || 1)}
                    min={1}
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="max_orders_per_batch" help="Maximum number of orders to place in a single batch. Helps manage rate limits.">Max Orders/Batch</FieldLabel>
                  <Input
                    id="max_orders_per_batch"
                    type="number"
                    value={formData.max_orders_per_batch}
                    onChange={(e) => updateField('max_orders_per_batch', parseInt(e.target.value) || 1)}
                    min={1}
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="activation_bounds" help="Price bounds for strategy activation as decimal. Strategy only activates when price is within this range.">Activation Bounds</FieldLabel>
                  <Input
                    id="activation_bounds"
                    type="text"
                    value={formData.activation_bounds}
                    onChange={(e) => updateField('activation_bounds', e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="min_spread_between_orders" help="Minimum price spread between grid levels as decimal (e.g., 0.001 = 0.1%). Controls grid density.">Min Spread</FieldLabel>
                  <Input
                    id="min_spread_between_orders"
                    type="text"
                    value={formData.min_spread_between_orders}
                    onChange={(e) => updateField('min_spread_between_orders', e.target.value)}
                    placeholder="0.001"
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="min_order_amount_quote" help="Minimum order size per grid level in quote currency. Must meet exchange minimums.">Min Order Amount</FieldLabel>
                  <Input
                    id="min_order_amount_quote"
                    type="text"
                    value={formData.min_order_amount_quote}
                    onChange={(e) => updateField('min_order_amount_quote', e.target.value)}
                    placeholder="5"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Triple Barrier Config */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Triple Barrier</CardTitle>
              <CardDescription>Take profit, stop loss, and exit conditions</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Triple Barrier Visualization */}
              {(() => {
                const tp = parseFloat(formData.take_profit) || 0;
                const sl = parseFloat(formData.stop_loss) || 0;
                const ts = parseFloat(formData.trailing_stop) || 0;
                const timeLimit = parseInt(formData.time_limit) || 0;
                const hasTP = !!formData.take_profit && tp > 0;
                const hasSL = !!formData.stop_loss && sl > 0;
                const hasTS = !!formData.trailing_stop && ts > 0;
                const hasTimeLimit = timeLimit > 0;

                // Only show visualization if at least one barrier is set
                if (!hasTP && !hasSL && !hasTS && !hasTimeLimit) {
                  return (
                    <div className="mb-4 p-8 bg-muted/30 rounded-lg border border-border border-dashed text-center text-muted-foreground">
                      Set take profit, stop loss, trailing stop, or time limit to see the barrier visualization
                    </div>
                  );
                }

                // Calculate Y positions as percentages for the container
                const totalRange = tp + Math.max(sl, ts);
                let entryPct: number;
                if (hasTP && (hasSL || hasTS)) {
                  entryPct = 15 + (tp / totalRange) * 70; // 15% to 85% range
                } else if (hasTP) {
                  entryPct = 85;
                } else if (hasSL || hasTS) {
                  entryPct = 15;
                } else {
                  entryPct = 50;
                }

                const tpPct = 15;
                const slPct = 85;
                const tsPct = hasTS ? entryPct + (ts / Math.max(sl, ts)) * (85 - entryPct) : 50;

                // Line end position - if time limit, lines go to the time limit line position
                const lineEndPct = hasTimeLimit
                  ? (timeLimit < 300 ? (timeLimit / 300) * 75 + 10 : 85)
                  : 85;

                return (
                  <div className="mb-4 p-4 bg-muted/30 rounded-lg border border-border">
                    <div className="relative h-48 mx-2">
                      {/* Take Profit */}
                      {hasTP && (
                        <>
                          <div className="absolute text-sm font-semibold text-green-500" style={{ top: `${tpPct}%`, left: 0, transform: 'translateY(-50%)' }}>Take Profit</div>
                          <div className="absolute h-0.5 bg-green-500" style={{ top: `${tpPct}%`, left: '110px', width: `calc(${lineEndPct}% - 110px)` }} />
                          <div className="absolute text-sm font-semibold text-green-500 whitespace-nowrap" style={{ top: `${tpPct}%`, left: `calc(${lineEndPct}% + 8px)`, transform: 'translateY(-50%)' }}>+{(tp * 100).toFixed(2)}%</div>
                        </>
                      )}

                      {/* Position Entry */}
                      <div className="absolute text-sm text-muted-foreground" style={{ top: `${entryPct}%`, left: 0, transform: 'translateY(-50%)' }}>Position Entry</div>
                      <div className="absolute h-0.5 border-t-2 border-dashed border-muted-foreground/50" style={{ top: `${entryPct}%`, left: '110px', width: `calc(${lineEndPct}% - 110px)` }} />

                      {/* Trailing Stop */}
                      {hasTS && (
                        <>
                          <div className="absolute text-sm font-semibold text-violet-500" style={{ top: `${tsPct}%`, left: 0, transform: 'translateY(-50%)' }}>Trailing Stop</div>
                          <div className="absolute h-0.5 border-t-2 border-dashed border-violet-500" style={{ top: `${tsPct}%`, left: '110px', width: `calc(${lineEndPct}% - 110px)` }} />
                          <div className="absolute text-sm font-semibold text-violet-500 whitespace-nowrap" style={{ top: `${tsPct}%`, left: `calc(${lineEndPct}% + 8px)`, transform: 'translateY(-50%)' }}>-{(ts * 100).toFixed(2)}%</div>
                        </>
                      )}

                      {/* Stop Loss */}
                      {hasSL && (
                        <>
                          <div className="absolute text-sm font-semibold text-red-500" style={{ top: `${slPct}%`, left: 0, transform: 'translateY(-50%)' }}>Stop Loss</div>
                          <div className="absolute h-0.5 bg-red-500" style={{ top: `${slPct}%`, left: '110px', width: `calc(${lineEndPct}% - 110px)` }} />
                          <div className="absolute text-sm font-semibold text-red-500 whitespace-nowrap" style={{ top: `${slPct}%`, left: `calc(${lineEndPct}% + 8px)`, transform: 'translateY(-50%)' }}>-{(sl * 100).toFixed(2)}%</div>
                        </>
                      )}

                      {/* Time Limit vertical line (right edge of box) */}
                      {hasTimeLimit && (
                        <>
                          <div className="absolute text-sm font-semibold text-amber-500 whitespace-nowrap" style={{ top: '2%', left: `calc(${lineEndPct}% - 30px)` }}>Time Limit</div>
                          <div className="absolute w-0.5 border-l-2 border-dashed border-amber-500" style={{ top: `${hasTP ? tpPct : entryPct}%`, bottom: `${100 - (hasSL ? slPct : (hasTS ? tsPct : entryPct))}%`, left: `calc(${lineEndPct}%)` }} />
                          <div className="absolute text-sm font-semibold text-amber-500 whitespace-nowrap" style={{ top: `${(hasSL ? slPct : (hasTS ? tsPct : entryPct)) + 3}%`, left: `calc(${lineEndPct}% - 15px)` }}>{timeLimit}s</div>
                        </>
                      )}

                      {/* Left edge */}
                      <div className="absolute w-0.5 bg-muted-foreground/30" style={{ top: `${hasTP ? tpPct : entryPct}%`, bottom: `${100 - (hasSL ? slPct : (hasTS ? tsPct : entryPct))}%`, left: '110px' }} />
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="take_profit" help="Profit target as decimal (e.g., 0.01 = 1%). Position closes when this profit is reached.">Take Profit</FieldLabel>
                  <Input
                    id="take_profit"
                    type="text"
                    value={formData.take_profit}
                    onChange={(e) => updateField('take_profit', e.target.value)}
                    placeholder="0.001"
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="stop_loss" help="Maximum loss as decimal (e.g., 0.05 = 5%). Position closes when this loss is reached.">Stop Loss</FieldLabel>
                  <Input
                    id="stop_loss"
                    type="text"
                    value={formData.stop_loss}
                    onChange={(e) => updateField('stop_loss', e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="time_limit" help="Time limit in seconds for the position. Position closes after this duration.">Time Limit (sec)</FieldLabel>
                  <Input
                    id="time_limit"
                    type="text"
                    value={formData.time_limit}
                    onChange={(e) => updateField('time_limit', e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="trailing_stop" help="Trailing stop as decimal. Adjusts stop loss as price moves in your favor.">Trailing Stop</FieldLabel>
                  <Input
                    id="trailing_stop"
                    type="text"
                    value={formData.trailing_stop}
                    onChange={(e) => updateField('trailing_stop', e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="open_order_type" help="Order type for opening positions. 1=Market, 2=Limit, 3=Limit Maker.">Open Order Type</FieldLabel>
                  <Select value={String(formData.open_order_type)} onValueChange={(v) => updateField('open_order_type', parseInt(v))}>
                    <SelectTrigger id="open_order_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Market</SelectItem>
                      <SelectItem value="2">Limit</SelectItem>
                      <SelectItem value="3">Limit Maker</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="take_profit_order_type" help="Order type for take profit orders. 1=Market, 2=Limit, 3=Limit Maker.">TP Order Type</FieldLabel>
                  <Select value={String(formData.take_profit_order_type)} onValueChange={(v) => updateField('take_profit_order_type', parseInt(v))}>
                    <SelectTrigger id="take_profit_order_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Market</SelectItem>
                      <SelectItem value="2">Limit</SelectItem>
                      <SelectItem value="3">Limit Maker</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="stop_loss_order_type" help="Order type for stop loss orders. 1=Market, 2=Limit, 3=Limit Maker.">SL Order Type</FieldLabel>
                  <Select value={String(formData.stop_loss_order_type)} onValueChange={(v) => updateField('stop_loss_order_type', parseInt(v))}>
                    <SelectTrigger id="stop_loss_order_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Market</SelectItem>
                      <SelectItem value="2">Limit</SelectItem>
                      <SelectItem value="3">Limit Maker</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="time_limit_order_type" help="Order type for time limit exits. 1=Market, 2=Limit, 3=Limit Maker.">Time Limit Order Type</FieldLabel>
                  <Select value={String(formData.time_limit_order_type)} onValueChange={(v) => updateField('time_limit_order_type', parseInt(v))}>
                    <SelectTrigger id="time_limit_order_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Market</SelectItem>
                      <SelectItem value="2">Limit</SelectItem>
                      <SelectItem value="3">Limit Maker</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Advanced Options */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Advanced</CardTitle>
              <CardDescription>Additional behavior options</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="position_mode" help="Exchange position mode. Hedge allows both long/short positions simultaneously. One-Way only allows one direction.">Position Mode</FieldLabel>
                  <Select value={formData.position_mode} onValueChange={(v) => updateField('position_mode', v as 'HEDGE' | 'ONEWAY')}>
                    <SelectTrigger id="position_mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HEDGE">Hedge Mode</SelectItem>
                      <SelectItem value="ONEWAY">One-Way Mode</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="keep_position" help="When enabled, keeps the position open after the grid completes instead of closing it.">Keep Position</FieldLabel>
                  <div className="flex items-center h-10">
                    <Switch
                      id="keep_position"
                      checked={formData.keep_position}
                      onCheckedChange={(checked) => updateField('keep_position', checked)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="coerce_tp_to_step" help="Aligns take profit levels to grid step sizes for cleaner order placement.">Coerce TP to Step</FieldLabel>
                  <div className="flex items-center h-10">
                    <Switch
                      id="coerce_tp_to_step"
                      checked={formData.coerce_tp_to_step}
                      onCheckedChange={(checked) => updateField('coerce_tp_to_step', checked)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="manual_kill_switch" help="Emergency stop switch. When enabled, immediately stops the strategy and cancels all open orders.">Kill Switch</FieldLabel>
                  <div className="flex items-center h-10">
                    <Switch
                      id="manual_kill_switch"
                      checked={formData.manual_kill_switch}
                      onCheckedChange={(checked) => updateField('manual_kill_switch', checked)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Config */}
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
                  value={formData.id}
                  onChange={(e) => updateField('id', e.target.value)}
                  placeholder="my_grid_strike_config"
                  disabled={!!editingConfig}
                />
              </div>
              {error && (
                <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-3 text-destructive text-sm">
                  {error}
                </div>
              )}
              <Button
                type="submit"
                disabled={submitting || !formData.id.trim()}
                className="w-full"
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={18} />
                    {editingConfig ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    {editingConfig ? (
                      <>
                        <Pencil className="mr-2" size={18} />
                        Update Config
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2" size={18} />
                        Create Config
                      </>
                    )}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </form>

        {/* Right Sidebar - Fixed Width, Sticky */}
        <div className="w-80 shrink-0 self-start sticky top-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Config Preview</CardTitle>
              <CardDescription>Preview of the configuration file</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/30 rounded-lg p-3 font-mono text-xs space-y-1">
                <div><span className="text-muted-foreground">id:</span> {formData.id || 'unnamed'}</div>
                <div><span className="text-muted-foreground">controller_name:</span> grid_strike</div>
                <div><span className="text-muted-foreground">controller_type:</span> generic</div>
                <div><span className="text-muted-foreground">connector_name:</span> {formData.connector_name}</div>
                <div><span className="text-muted-foreground">trading_pair:</span> {formData.trading_pair}</div>
                <div><span className="text-muted-foreground">side:</span> {formData.side === 'BUY' ? 1 : 2}</div>
                <div><span className="text-muted-foreground">total_amount_quote:</span> {parseFloat(formData.total_amount_quote) || 0}</div>
                <div><span className="text-muted-foreground">leverage:</span> {formData.leverage}</div>
                <div><span className="text-muted-foreground">position_mode:</span> {formData.position_mode}</div>
                <div><span className="text-muted-foreground">start_price:</span> {parseFloat(formData.start_price) || 'null'}</div>
                <div><span className="text-muted-foreground">end_price:</span> {parseFloat(formData.end_price) || 'null'}</div>
                <div><span className="text-muted-foreground">limit_price:</span> {parseFloat(formData.limit_price) || 'null'}</div>
                <div><span className="text-muted-foreground">min_spread_between_orders:</span> {formData.min_spread_between_orders ? parseFloat(formData.min_spread_between_orders) : 'null'}</div>
                <div><span className="text-muted-foreground">min_order_amount_quote:</span> {formData.min_order_amount_quote ? parseFloat(formData.min_order_amount_quote) : 'null'}</div>
                <div><span className="text-muted-foreground">max_open_orders:</span> {formData.max_open_orders}</div>
                <div><span className="text-muted-foreground">max_orders_per_batch:</span> {formData.max_orders_per_batch || 'null'}</div>
                <div><span className="text-muted-foreground">order_frequency:</span> {formData.order_frequency}</div>
                <div><span className="text-muted-foreground">activation_bounds:</span> {formData.activation_bounds ? parseFloat(formData.activation_bounds) : 'null'}</div>
                <div><span className="text-muted-foreground">keep_position:</span> {String(formData.keep_position)}</div>
                <div><span className="text-muted-foreground">coerce_tp_to_step:</span> {String(formData.coerce_tp_to_step)}</div>
                <div><span className="text-muted-foreground">manual_kill_switch:</span> {String(formData.manual_kill_switch)}</div>
                <div className="pt-1 border-t border-border/50 mt-1">
                  <span className="text-muted-foreground">triple_barrier_config:</span>
                </div>
                <div className="pl-2">
                  <div><span className="text-muted-foreground">take_profit:</span> {formData.take_profit ? parseFloat(formData.take_profit) : 'null'}</div>
                  <div><span className="text-muted-foreground">stop_loss:</span> {formData.stop_loss ? parseFloat(formData.stop_loss) : 'null'}</div>
                  <div><span className="text-muted-foreground">time_limit:</span> {formData.time_limit ? parseInt(formData.time_limit) : 'null'}</div>
                  <div><span className="text-muted-foreground">trailing_stop:</span> {formData.trailing_stop ? parseFloat(formData.trailing_stop) : 'null'}</div>
                  <div><span className="text-muted-foreground">open_order_type:</span> {formData.open_order_type}</div>
                  <div><span className="text-muted-foreground">take_profit_order_type:</span> {formData.take_profit_order_type}</div>
                  <div><span className="text-muted-foreground">stop_loss_order_type:</span> {formData.stop_loss_order_type}</div>
                  <div><span className="text-muted-foreground">time_limit_order_type:</span> {formData.time_limit_order_type}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Config</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete config "{configToDelete}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
