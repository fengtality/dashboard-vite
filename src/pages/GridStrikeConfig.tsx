import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { controllers } from '../api/client';
import type { ControllerConfig } from '../api/client';
import { Loader2, Plus, Zap, Pencil, Trash2, RotateCcw } from 'lucide-react';
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
  connector_name: 'binance_perpetual',
  trading_pair: 'WLD-USDT',
  side: 'BUY',
  total_amount_quote: '1000',
  leverage: 20,
  position_mode: 'HEDGE',
  start_price: '0.58',
  end_price: '0.95',
  limit_price: '0.55',
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

// Field descriptions for user guidance
const fieldDescriptions: Record<string, string> = {
  id: 'Unique identifier for this configuration.',
  connector_name: 'The exchange connector to use (e.g., binance_perpetual, hyperliquid_perpetual).',
  trading_pair: 'The trading pair in format BASE-QUOTE (e.g., WLD-USDT, BTC-USDT).',
  side: 'Trade direction. BUY for long grid, SELL for short grid.',
  total_amount_quote: 'Total amount in quote currency to allocate for all grid orders.',
  leverage: 'Leverage multiplier for perpetual trading (1-125x depending on exchange).',
  position_mode: 'HEDGE allows both long and short positions. ONEWAY only allows one direction.',
  start_price: 'The starting price of the grid (nearest to current price).',
  end_price: 'The ending price of the grid (furthest from current price).',
  limit_price: 'Stop-loss price. Grid will close all positions if price crosses this level.',
  min_spread_between_orders: 'Minimum percentage spread between grid orders (e.g., 0.001 = 0.1%).',
  min_order_amount_quote: 'Minimum order size in quote currency per grid level.',
  max_open_orders: 'Maximum number of open orders at any time.',
  max_orders_per_batch: 'Maximum orders to place in each batch/cycle.',
  order_frequency: 'Time in seconds between order placement cycles.',
  activation_bounds: 'Price deviation threshold to activate the grid. Leave empty to start immediately.',
  take_profit: 'Take profit percentage per position (e.g., 0.001 = 0.1%).',
  stop_loss: 'Stop loss percentage per position. Leave empty to disable.',
  keep_position: 'Keep positions open when grid is stopped instead of closing them.',
  coerce_tp_to_step: 'Align take profit levels to grid step sizes.',
  manual_kill_switch: 'Enable to manually control when to stop the strategy.',
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
  const [formData, setFormData] = useState<GridStrikeFormData>(defaultFormData);
  const [existingConfigs, setExistingConfigs] = useState<ControllerConfig[]>([]);
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Load existing configs and template on mount
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
          const template = await controllers.getConfigTemplate('generic', 'grid_strike') as Record<string, TemplateField>;
          if (template) {
            const newFormData = { ...defaultFormData };
            if (template.connector_name?.default) newFormData.connector_name = String(template.connector_name.default);
            if (template.trading_pair?.default) newFormData.trading_pair = String(template.trading_pair.default);
            if (template.total_amount_quote?.default) newFormData.total_amount_quote = String(template.total_amount_quote.default);
            if (template.leverage?.default) newFormData.leverage = Number(template.leverage.default);
            if (template.start_price?.default) newFormData.start_price = String(template.start_price.default);
            if (template.end_price?.default) newFormData.end_price = String(template.end_price.default);
            if (template.limit_price?.default) newFormData.limit_price = String(template.limit_price.default);
            if (template.min_spread_between_orders?.default) newFormData.min_spread_between_orders = String(template.min_spread_between_orders.default);
            if (template.min_order_amount_quote?.default) newFormData.min_order_amount_quote = String(template.min_order_amount_quote.default);
            if (template.max_open_orders?.default) newFormData.max_open_orders = Number(template.max_open_orders.default);
            if (template.max_orders_per_batch?.default) newFormData.max_orders_per_batch = Number(template.max_orders_per_batch.default);
            if (template.order_frequency?.default) newFormData.order_frequency = Number(template.order_frequency.default);
            setFormData(newFormData);
          }
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [refreshKey, editingConfig]);

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

  if (loading && existingConfigs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={24} className="text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Grid Strike Config</h1>
        </div>
        <p className="text-muted-foreground">
          Create and manage Grid Strike strategies for automated grid trading on perpetual markets.
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-destructive/10 border border-destructive/50 rounded-lg p-4 text-destructive">
          {error}
        </div>
      )}

      {/* Existing Configs */}
      {existingConfigs.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Existing Configs</CardTitle>
            <CardDescription>Select a config to edit or create a new one</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {existingConfigs.map((config) => (
                <div
                  key={config.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    editingConfig === config.id
                      ? 'bg-primary/10 border-primary'
                      : 'bg-background border-border hover:border-muted-foreground/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Zap size={18} className="text-primary" />
                    <div>
                      <span className="font-medium text-foreground">{config.id}</span>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {String(config.connector_name || 'unknown')}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {String(config.trading_pair || 'unknown')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadConfigForEditing(config.id)}
                      disabled={loading}
                    >
                      <Pencil size={14} className="mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDeleteDialog(config.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 size={18} />
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
            <Badge variant="default">Editing</Badge>
            <span className="text-foreground font-medium">{editingConfig}</span>
          </div>
          <Button variant="outline" size="sm" onClick={resetForm}>
            <RotateCcw size={14} className="mr-1" />
            Create New
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Config Name */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Config Name</CardTitle>
            <CardDescription>{fieldDescriptions.id}</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              type="text"
              value={formData.id}
              onChange={(e) => updateField('id', e.target.value)}
              placeholder="my_grid_strike_config"
              disabled={!!editingConfig}
            />
            {editingConfig && (
              <p className="text-xs text-muted-foreground mt-2">
                Config name cannot be changed when editing. Create a new config instead.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Market Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Market Settings</CardTitle>
            <CardDescription>Configure the exchange, trading pair, and direction</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="connector_name">Connector</Label>
                <Input
                  id="connector_name"
                  type="text"
                  value={formData.connector_name}
                  onChange={(e) => updateField('connector_name', e.target.value)}
                  placeholder="binance_perpetual"
                />
                <p className="text-xs text-muted-foreground">{fieldDescriptions.connector_name}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="trading_pair">Trading Pair</Label>
                <Input
                  id="trading_pair"
                  type="text"
                  value={formData.trading_pair}
                  onChange={(e) => updateField('trading_pair', e.target.value)}
                  placeholder="WLD-USDT"
                />
                <p className="text-xs text-muted-foreground">{fieldDescriptions.trading_pair}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
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
                <p className="text-xs text-muted-foreground">{fieldDescriptions.side}</p>
              </div>

              <div className="space-y-2">
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
                <p className="text-xs text-muted-foreground">{fieldDescriptions.position_mode}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grid Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Grid Settings</CardTitle>
            <CardDescription>Configure the grid price range and levels</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_price">Start Price</Label>
                <Input
                  id="start_price"
                  type="text"
                  value={formData.start_price}
                  onChange={(e) => updateField('start_price', e.target.value)}
                  placeholder="0.58"
                />
                <p className="text-xs text-muted-foreground">{fieldDescriptions.start_price}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_price">End Price</Label>
                <Input
                  id="end_price"
                  type="text"
                  value={formData.end_price}
                  onChange={(e) => updateField('end_price', e.target.value)}
                  placeholder="0.95"
                />
                <p className="text-xs text-muted-foreground">{fieldDescriptions.end_price}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="limit_price">Limit Price (Stop Loss)</Label>
                <Input
                  id="limit_price"
                  type="text"
                  value={formData.limit_price}
                  onChange={(e) => updateField('limit_price', e.target.value)}
                  placeholder="0.55"
                />
                <p className="text-xs text-muted-foreground">{fieldDescriptions.limit_price}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min_spread_between_orders">Min Spread Between Orders</Label>
                <Input
                  id="min_spread_between_orders"
                  type="text"
                  value={formData.min_spread_between_orders}
                  onChange={(e) => updateField('min_spread_between_orders', e.target.value)}
                  placeholder="0.001"
                />
                <p className="text-xs text-muted-foreground">{fieldDescriptions.min_spread_between_orders}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="activation_bounds">Activation Bounds (Optional)</Label>
                <Input
                  id="activation_bounds"
                  type="text"
                  value={formData.activation_bounds}
                  onChange={(e) => updateField('activation_bounds', e.target.value)}
                  placeholder="Leave empty to start immediately"
                />
                <p className="text-xs text-muted-foreground">{fieldDescriptions.activation_bounds}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Position Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Position Settings</CardTitle>
            <CardDescription>Configure position size and leverage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="total_amount_quote">Total Amount (Quote)</Label>
                <Input
                  id="total_amount_quote"
                  type="text"
                  value={formData.total_amount_quote}
                  onChange={(e) => updateField('total_amount_quote', e.target.value)}
                  placeholder="1000"
                />
                <p className="text-xs text-muted-foreground">{fieldDescriptions.total_amount_quote}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="leverage">Leverage</Label>
                <Input
                  id="leverage"
                  type="number"
                  value={formData.leverage}
                  onChange={(e) => updateField('leverage', parseInt(e.target.value) || 1)}
                  min={1}
                  max={125}
                />
                <p className="text-xs text-muted-foreground">{fieldDescriptions.leverage}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="min_order_amount_quote">Min Order Amount (Quote)</Label>
                <Input
                  id="min_order_amount_quote"
                  type="text"
                  value={formData.min_order_amount_quote}
                  onChange={(e) => updateField('min_order_amount_quote', e.target.value)}
                  placeholder="5"
                />
                <p className="text-xs text-muted-foreground">{fieldDescriptions.min_order_amount_quote}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Order Settings</CardTitle>
            <CardDescription>Configure order placement behavior</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_open_orders">Max Open Orders</Label>
                <Input
                  id="max_open_orders"
                  type="number"
                  value={formData.max_open_orders}
                  onChange={(e) => updateField('max_open_orders', parseInt(e.target.value) || 1)}
                  min={1}
                />
                <p className="text-xs text-muted-foreground">{fieldDescriptions.max_open_orders}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_orders_per_batch">Max Orders Per Batch</Label>
                <Input
                  id="max_orders_per_batch"
                  type="number"
                  value={formData.max_orders_per_batch}
                  onChange={(e) => updateField('max_orders_per_batch', parseInt(e.target.value) || 1)}
                  min={1}
                />
                <p className="text-xs text-muted-foreground">{fieldDescriptions.max_orders_per_batch}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="order_frequency">Order Frequency (seconds)</Label>
                <Input
                  id="order_frequency"
                  type="number"
                  value={formData.order_frequency}
                  onChange={(e) => updateField('order_frequency', parseInt(e.target.value) || 1)}
                  min={1}
                />
                <p className="text-xs text-muted-foreground">{fieldDescriptions.order_frequency}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk Management */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Risk Management</CardTitle>
            <CardDescription>Configure take profit and stop loss settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="take_profit">Take Profit (%)</Label>
                <Input
                  id="take_profit"
                  type="text"
                  value={formData.take_profit}
                  onChange={(e) => updateField('take_profit', e.target.value)}
                  placeholder="0.001"
                />
                <p className="text-xs text-muted-foreground">{fieldDescriptions.take_profit}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stop_loss">Stop Loss (%) (Optional)</Label>
                <Input
                  id="stop_loss"
                  type="text"
                  value={formData.stop_loss}
                  onChange={(e) => updateField('stop_loss', e.target.value)}
                  placeholder="Leave empty to disable"
                />
                <p className="text-xs text-muted-foreground">{fieldDescriptions.stop_loss}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Options */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Advanced Options</CardTitle>
            <CardDescription>Additional configuration options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="keep_position">Keep Position</Label>
                <p className="text-xs text-muted-foreground">{fieldDescriptions.keep_position}</p>
              </div>
              <Switch
                id="keep_position"
                checked={formData.keep_position}
                onCheckedChange={(checked) => updateField('keep_position', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="coerce_tp_to_step">Coerce TP to Step</Label>
                <p className="text-xs text-muted-foreground">{fieldDescriptions.coerce_tp_to_step}</p>
              </div>
              <Switch
                id="coerce_tp_to_step"
                checked={formData.coerce_tp_to_step}
                onCheckedChange={(checked) => updateField('coerce_tp_to_step', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="manual_kill_switch">Manual Kill Switch</Label>
                <p className="text-xs text-muted-foreground">{fieldDescriptions.manual_kill_switch}</p>
              </div>
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
