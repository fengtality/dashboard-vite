import { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { controllers, marketData, accounts } from '../api/client';
import type { ControllerConfig } from '../api/client';
import { useAccount } from '@/components/account-provider';
import { Loader2, Plus, Zap, Pencil, Trash2, RotateCcw, RefreshCw } from 'lucide-react';
import { CandlestickChart } from '@/components/ui/candlestick-chart';
import type { Candle } from '@/components/ui/candlestick-chart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  take_profit: string;
  stop_loss: string;
  keep_position: boolean;
  coerce_tp_to_step: boolean;
  manual_kill_switch: boolean;
}

const defaultFormData: GridStrikeFormData = {
  id: '',
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
  take_profit: '0.001',
  stop_loss: '',
  keep_position: false,
  coerce_tp_to_step: false,
  manual_kill_switch: false,
};


// Helper to parse side from API format
function parseSide(value: unknown): 'BUY' | 'SELL' {
  const str = String(value);
  if (str.includes('SELL')) return 'SELL';
  return 'BUY';
}

// Helper to parse position mode from API format
function parsePositionMode(value: unknown): 'HEDGE' | 'ONEWAY' {
  const str = String(value);
  if (str.includes('ONEWAY') || str.includes('ONE_WAY')) return 'ONEWAY';
  return 'HEDGE';
}

export default function GridStrikeConfig() {
  const { account } = useAccount();
  const [formData, setFormData] = useState<GridStrikeFormData>(defaultFormData);
  const [existingConfigs, setExistingConfigs] = useState<ControllerConfig[]>([]);
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loadingCandles, setLoadingCandles] = useState(false);

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

  // Load existing configs, template, and user's connectors on mount
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Fetch all controller configs and filter for grid_strike
        const allConfigs = await controllers.listConfigs();
        const gridStrikeConfigs = allConfigs.filter(
          (c) => c.controller_name === 'grid_strike'
        );
        setExistingConfigs(gridStrikeConfigs);

        // Load template for defaults (only if not editing)
        if (!editingConfig) {
          const newFormData = { ...defaultFormData };

          // Fetch user's connected connectors and use the first one as default
          if (account) {
            try {
              const credentials = await accounts.getCredentials(account);
              if (credentials.length > 0) {
                newFormData.connector_name = credentials[0];
              }
            } catch {
              // Ignore error, will use empty default
            }
          }

          // Load template defaults
          try {
            const template = await controllers.getConfigTemplate('generic', 'grid_strike') as Record<string, TemplateField>;
            if (template) {
              if (template.total_amount_quote?.default) newFormData.total_amount_quote = String(template.total_amount_quote.default);
              if (template.leverage?.default) newFormData.leverage = Number(template.leverage.default);
              if (template.min_spread_between_orders?.default) newFormData.min_spread_between_orders = String(template.min_spread_between_orders.default);
              if (template.min_order_amount_quote?.default) newFormData.min_order_amount_quote = String(template.min_order_amount_quote.default);
              if (template.max_open_orders?.default) newFormData.max_open_orders = Number(template.max_open_orders.default);
              if (template.max_orders_per_batch?.default) newFormData.max_orders_per_batch = Number(template.max_orders_per_batch.default);
              if (template.order_frequency?.default) newFormData.order_frequency = Number(template.order_frequency.default);
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
  }, [refreshKey, editingConfig, account]);

  // Fetch candles manually
  async function fetchCandles() {
    if (!formData.connector_name || !formData.trading_pair) {
      toast.error('Please enter connector and trading pair first');
      return;
    }

    setLoadingCandles(true);
    try {
      const response = await marketData.getCandles({
        connector_name: formData.connector_name,
        trading_pair: formData.trading_pair,
        interval: '1m',
        max_records: 120,
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
        // Calculate prices from candle data
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

        // Update form data with calculated prices
        setFormData(prev => ({
          ...prev,
          start_price: start.toFixed(4),
          end_price: end.toFixed(4),
          limit_price: limit.toFixed(4),
        }));

        // Set candles after prices are calculated
        setCandles(parsedCandles);
        toast.success('Chart updated');
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

  // Auto-fetch candles on load and when connector/pair changes
  useEffect(() => {
    if (formData.connector_name && formData.trading_pair && !loadingCandles) {
      fetchCandles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.connector_name, formData.trading_pair]);

  // Recalculate prices when side changes
  useEffect(() => {
    if (candles.length === 0) return;

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

  // Load a specific config for editing
  async function loadConfigForEditing(configId: string) {
    setLoading(true);
    setError(null);
    try {
      const config = await controllers.getConfig(configId);

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
        take_profit: '',
        stop_loss: '',
        keep_position: Boolean(config.keep_position),
        coerce_tp_to_step: Boolean(config.coerce_tp_to_step),
        manual_kill_switch: Boolean(config.manual_kill_switch),
      };

      // Parse triple barrier config if present
      const tbc = config.triple_barrier_config as Record<string, unknown> | undefined;
      if (tbc) {
        if (tbc.take_profit) newFormData.take_profit = String(tbc.take_profit);
        if (tbc.stop_loss) newFormData.stop_loss = String(tbc.stop_loss);
      }

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
    setFormData(defaultFormData);
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
      const config = {
        id: formData.id,
        controller_name: 'grid_strike',
        controller_type: 'generic',
        connector_name: formData.connector_name,
        trading_pair: formData.trading_pair,
        side: `TradeType.${formData.side}`,
        total_amount_quote: formData.total_amount_quote,
        leverage: formData.leverage,
        position_mode: `PositionMode.${formData.position_mode}`,
        start_price: formData.start_price,
        end_price: formData.end_price,
        limit_price: formData.limit_price,
        min_spread_between_orders: formData.min_spread_between_orders || null,
        min_order_amount_quote: formData.min_order_amount_quote || null,
        max_open_orders: formData.max_open_orders,
        max_orders_per_batch: formData.max_orders_per_batch || null,
        order_frequency: formData.order_frequency,
        activation_bounds: formData.activation_bounds || null,
        keep_position: formData.keep_position,
        coerce_tp_to_step: formData.coerce_tp_to_step,
        manual_kill_switch: formData.manual_kill_switch,
        triple_barrier_config: {
          take_profit: formData.take_profit || null,
          stop_loss: formData.stop_loss || null,
          time_limit: null,
          trailing_stop: null,
        },
      };

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

  // Calculate grid statistics
  const gridStats = useMemo(() => {
    const start = parseFloat(formData.start_price) || 0;
    const end = parseFloat(formData.end_price) || 0;
    const spread = parseFloat(formData.min_spread_between_orders) || 0.001;
    const totalAmount = parseFloat(formData.total_amount_quote) || 0;

    if (start === 0 || end === 0) return null;

    const gridRange = Math.abs(end - start);
    const gridRangePct = (gridRange / Math.min(start, end)) * 100;
    const estimatedLevels = spread > 0 ? Math.floor(gridRangePct / (spread * 100)) : 0;
    const amountPerLevel = estimatedLevels > 0 ? totalAmount / estimatedLevels : 0;

    return {
      gridRange: gridRange.toFixed(4),
      gridRangePct: gridRangePct.toFixed(2),
      estimatedLevels,
      amountPerLevel: amountPerLevel.toFixed(2),
    };
  }, [formData.start_price, formData.end_price, formData.min_spread_between_orders, formData.total_amount_quote]);

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

      {error && (
        <div className="mb-4 bg-destructive/10 border border-destructive/50 rounded-lg p-4 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Existing Configs */}
      {existingConfigs.length > 0 && (
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
                    className={`flex items-center justify-between p-2 rounded-lg border text-sm ${
                      editingConfig === config.id
                        ? 'bg-primary/10 border-primary'
                        : 'bg-background border-border hover:border-muted-foreground/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Zap size={14} className="text-primary" />
                      <span className="font-medium">{config.id}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => loadConfigForEditing(config.id)}
                        disabled={loading}
                        className="h-7 px-2"
                      >
                        <Pencil size={12} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(config.id)}
                        className="h-7 px-2 text-destructive hover:text-destructive"
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Form Header */}
      {editingConfig && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="text-xs">Editing</Badge>
            <span className="text-foreground font-medium text-sm">{editingConfig}</span>
          </div>
          <Button variant="outline" size="sm" onClick={resetForm} className="h-7 text-xs">
            <RotateCcw size={12} className="mr-1" />
            New
          </Button>
        </div>
      )}

      {/* Form and Sidebar Container */}
      <div className="flex gap-6 items-start">
        {/* Main Form Column */}
        <form onSubmit={handleSubmit} className="w-1/2 space-y-6">
          {/* Config Name */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Config Name</CardTitle>
              <CardDescription>Unique identifier for this configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                id="id"
                type="text"
                value={formData.id}
                onChange={(e) => updateField('id', e.target.value)}
                placeholder="my_grid_strike_config"
                disabled={!!editingConfig}
              />
            </CardContent>
          </Card>

          {/* Market */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Market</CardTitle>
              <CardDescription>Exchange connector and trading pair</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="connector_name">Connector</Label>
                <Input
                  id="connector_name"
                  type="text"
                  value={formData.connector_name}
                  onChange={(e) => updateField('connector_name', e.target.value)}
                  placeholder="binance_perpetual"
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="trading_pair">Trading Pair</Label>
                <Input
                  id="trading_pair"
                  type="text"
                  value={formData.trading_pair}
                  onChange={(e) => updateField('trading_pair', e.target.value)}
                  placeholder="WLD-USDT"
                />
              </div>
            </CardContent>
          </Card>

          {/* Grid Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Grid</CardTitle>
              <CardDescription>Price range and order spacing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="side">Side</Label>
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
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="start_price">Start Price</Label>
                <Input
                  id="start_price"
                  type="text"
                  value={formData.start_price}
                  onChange={(e) => updateField('start_price', e.target.value)}
                  placeholder="Auto-set from market"
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="end_price">End Price</Label>
                <Input
                  id="end_price"
                  type="text"
                  value={formData.end_price}
                  onChange={(e) => updateField('end_price', e.target.value)}
                  placeholder="Auto-set from market"
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="limit_price">Limit Price</Label>
                <Input
                  id="limit_price"
                  type="text"
                  value={formData.limit_price}
                  onChange={(e) => updateField('limit_price', e.target.value)}
                  placeholder="Auto-set from market"
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="min_spread_between_orders">Min Spread</Label>
                <Input
                  id="min_spread_between_orders"
                  type="text"
                  value={formData.min_spread_between_orders}
                  onChange={(e) => updateField('min_spread_between_orders', e.target.value)}
                  placeholder="0.001"
                />
              </div>
            </CardContent>
          </Card>

          {/* Position Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Position</CardTitle>
              <CardDescription>Size, leverage, and position mode</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="total_amount_quote">Total Amount (Quote)</Label>
                <Input
                  id="total_amount_quote"
                  type="text"
                  value={formData.total_amount_quote}
                  onChange={(e) => updateField('total_amount_quote', e.target.value)}
                  placeholder="1000"
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="leverage">Leverage</Label>
                <Input
                  id="leverage"
                  type="number"
                  value={formData.leverage}
                  onChange={(e) => updateField('leverage', parseInt(e.target.value) || 1)}
                  min={1}
                  max={125}
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="min_order_amount_quote">Min Order Amount</Label>
                <Input
                  id="min_order_amount_quote"
                  type="text"
                  value={formData.min_order_amount_quote}
                  onChange={(e) => updateField('min_order_amount_quote', e.target.value)}
                  placeholder="5"
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="position_mode">Position Mode</Label>
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
            </CardContent>
          </Card>

          {/* Order Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Orders</CardTitle>
              <CardDescription>Order limits and timing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="max_open_orders">Max Open Orders</Label>
                <Input
                  id="max_open_orders"
                  type="number"
                  value={formData.max_open_orders}
                  onChange={(e) => updateField('max_open_orders', parseInt(e.target.value) || 1)}
                  min={1}
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="order_frequency">Order Frequency (sec)</Label>
                <Input
                  id="order_frequency"
                  type="number"
                  value={formData.order_frequency}
                  onChange={(e) => updateField('order_frequency', parseInt(e.target.value) || 1)}
                  min={1}
                />
              </div>
            </CardContent>
          </Card>

          {/* Risk Management */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Risk</CardTitle>
              <CardDescription>Take profit and stop loss settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="take_profit">Take Profit (%)</Label>
                <Input
                  id="take_profit"
                  type="text"
                  value={formData.take_profit}
                  onChange={(e) => updateField('take_profit', e.target.value)}
                  placeholder="0.001"
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="stop_loss">Stop Loss (%)</Label>
                <Input
                  id="stop_loss"
                  type="text"
                  value={formData.stop_loss}
                  onChange={(e) => updateField('stop_loss', e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </CardContent>
          </Card>

          {/* Advanced Options */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Advanced</CardTitle>
              <CardDescription>Additional behavior options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="keep_position" className="text-sm">Keep Position</Label>
                <Switch
                  id="keep_position"
                  checked={formData.keep_position}
                  onCheckedChange={(checked) => updateField('keep_position', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="coerce_tp_to_step" className="text-sm">Coerce TP to Step</Label>
                <Switch
                  id="coerce_tp_to_step"
                  checked={formData.coerce_tp_to_step}
                  onCheckedChange={(checked) => updateField('coerce_tp_to_step', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="manual_kill_switch" className="text-sm">Manual Kill Switch</Label>
                <Switch
                  id="manual_kill_switch"
                  checked={formData.manual_kill_switch}
                  onCheckedChange={(checked) => updateField('manual_kill_switch', checked)}
                />
              </div>
            </CardContent>
          </Card>

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
        </form>

        {/* Right Sidebar - Sticky */}
        <div className="w-1/2 self-start sticky top-0 space-y-6">
        {/* Chart Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">{formData.trading_pair || 'Select Pair'}</CardTitle>
                  <Badge variant="outline">
                    {formData.side === 'BUY' ? 'Long' : 'Short'}
                  </Badge>
                </div>
                <CardDescription>
                  {formData.connector_name || 'Select connector'}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={fetchCandles}
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
          </CardHeader>
          <CardContent>
            <CandlestickChart
              candles={candles}
              height={400}
              priceLines={[
                { id: 'start', price: parseFloat(formData.start_price) || 0, color: '#22c55e', title: 'Start', lineStyle: 'dashed' as const },
                { id: 'end', price: parseFloat(formData.end_price) || 0, color: '#3b82f6', title: 'End', lineStyle: 'dashed' as const },
                { id: 'limit', price: parseFloat(formData.limit_price) || 0, color: '#ef4444', title: 'Limit', lineStyle: 'solid' as const },
              ].filter(l => l.price > 0)}
            />
          </CardContent>
        </Card>

        {/* Config Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Config Preview</CardTitle>
            <CardDescription>Preview of the configuration file</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/30 rounded-lg p-3 font-mono text-xs space-y-1">
              <div><span className="text-muted-foreground">id:</span> {formData.id || 'unnamed'}</div>
              <div><span className="text-muted-foreground">controller_name:</span> grid_strike</div>
              <div><span className="text-muted-foreground">connector_name:</span> {formData.connector_name}</div>
              <div><span className="text-muted-foreground">trading_pair:</span> {formData.trading_pair}</div>
              <div><span className="text-muted-foreground">side:</span> TradeType.{formData.side}</div>
              <div><span className="text-muted-foreground">start_price:</span> {formData.start_price || 'null'}</div>
              <div><span className="text-muted-foreground">end_price:</span> {formData.end_price || 'null'}</div>
              <div><span className="text-muted-foreground">limit_price:</span> {formData.limit_price || 'null'}</div>
              <div><span className="text-muted-foreground">min_spread_between_orders:</span> {formData.min_spread_between_orders || 'null'}</div>
              <div><span className="text-muted-foreground">total_amount_quote:</span> {formData.total_amount_quote}</div>
              <div><span className="text-muted-foreground">leverage:</span> {formData.leverage}</div>
              <div><span className="text-muted-foreground">position_mode:</span> PositionMode.{formData.position_mode}</div>
              <div><span className="text-muted-foreground">min_order_amount_quote:</span> {formData.min_order_amount_quote || 'null'}</div>
              <div><span className="text-muted-foreground">max_open_orders:</span> {formData.max_open_orders}</div>
              <div><span className="text-muted-foreground">order_frequency:</span> {formData.order_frequency}</div>
              <div><span className="text-muted-foreground">take_profit:</span> {formData.take_profit || 'null'}</div>
              <div><span className="text-muted-foreground">stop_loss:</span> {formData.stop_loss || 'null'}</div>
              <div><span className="text-muted-foreground">keep_position:</span> {formData.keep_position.toString()}</div>
              <div><span className="text-muted-foreground">coerce_tp_to_step:</span> {formData.coerce_tp_to_step.toString()}</div>
              <div><span className="text-muted-foreground">manual_kill_switch:</span> {formData.manual_kill_switch.toString()}</div>
            </div>
            {gridStats && (
              <div className="mt-3 pt-3 border-t border-border text-xs space-y-1">
                <div className="text-muted-foreground mb-1">Calculated Values:</div>
                <div className="flex justify-between font-mono">
                  <span>Grid Range:</span>
                  <span>{gridStats.gridRange} ({gridStats.gridRangePct}%)</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span>Estimated Levels:</span>
                  <span>{gridStats.estimatedLevels}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span>Amount per Level:</span>
                  <span>${gridStats.amountPerLevel}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>

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
