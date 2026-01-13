import { useState, useEffect, useMemo } from 'react';
import { Loader2, Droplets } from 'lucide-react';
import { gatewayCLMM } from '@/api/hummingbot-api';
import { gatewayClient } from '@/api/gateway';
import type { PoolTemplate } from '@/api/gateway';
import type { WindowContext } from '../ExperimentProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Combobox } from '@/components/ui/combobox';
import { toast } from 'sonner';

interface AddLiquidityWindowProps {
  context?: WindowContext;
}

export function AddLiquidityWindow({ context }: AddLiquidityWindowProps) {
  const connector = context?.connector; // e.g., "solana-mainnet-beta"

  // Parse chain and network from connector
  const [chain] = connector?.split('-') ?? [''];
  const networkId = connector || '';

  const [dex, setDex] = useState('');
  const [dexOptions, setDexOptions] = useState<{ value: string; label: string }[]>([]);
  const [pools, setPools] = useState<PoolTemplate[]>([]);
  const [poolAddress, setPoolAddress] = useState('');
  const [selectedPool, setSelectedPool] = useState<PoolTemplate | null>(null);
  const [loadingPools, setLoadingPools] = useState(false);

  // LP inputs
  const [lowerPrice, setLowerPrice] = useState('');
  const [upperPrice, setUpperPrice] = useState('');
  const [baseAmount, setBaseAmount] = useState('');
  const [quoteAmount, setQuoteAmount] = useState('');
  const [slippage, setSlippage] = useState(1);
  const [executing, setExecuting] = useState(false);

  // Fetch available DEX connectors for this network
  useEffect(() => {
    if (!chain) return;

    async function fetchConnectors() {
      try {
        const response = await gatewayClient.config.getConnectors();
        const ammConnectors = response.connectors
          .filter(c => c.trading_types?.includes('AMM_LP') && c.chain === chain)
          .map(c => ({ value: c.name, label: c.name }));
        setDexOptions(ammConnectors);
        if (ammConnectors.length > 0 && !dex) {
          setDex(ammConnectors[0].value);
        }
      } catch (err) {
        console.error('Failed to fetch connectors:', err);
      }
    }

    fetchConnectors();
  }, [chain]);

  // Fetch pools when DEX changes
  useEffect(() => {
    if (!dex || !networkId) {
      setPools([]);
      return;
    }

    async function fetchPools() {
      setLoadingPools(true);
      try {
        // pools.list returns PoolTemplate[] directly
        const poolList = await gatewayClient.pools.list(dex, networkId, 'clmm');
        setPools(poolList || []);
      } catch (err) {
        console.error('Failed to fetch pools:', err);
        setPools([]);
      } finally {
        setLoadingPools(false);
      }
    }

    fetchPools();
  }, [dex, networkId]);

  // Fetch pool info when address changes
  useEffect(() => {
    if (!poolAddress || !dex || !networkId) {
      setSelectedPool(null);
      return;
    }

    // Check if it's in our pools list first
    const existingPool = pools.find(p => p.address === poolAddress);
    if (existingPool) {
      setSelectedPool(existingPool);
      return;
    }

    // Otherwise fetch by address
    async function fetchPoolInfo() {
      try {
        const poolInfo = await gatewayClient.pools.getInfo(dex, networkId, poolAddress);
        // Convert CLMMPoolInfo to a PoolTemplate-like shape
        setSelectedPool({
          type: 'clmm',
          network: networkId,
          address: poolAddress,
          baseSymbol: poolInfo.baseTokenAddress.slice(0, 6),
          quoteSymbol: poolInfo.quoteTokenAddress.slice(0, 6),
          baseTokenAddress: poolInfo.baseTokenAddress,
          quoteTokenAddress: poolInfo.quoteTokenAddress,
          feePct: poolInfo.feePct,
          connector: dex,
        });
      } catch {
        setSelectedPool(null);
      }
    }

    const timeout = setTimeout(fetchPoolInfo, 500);
    return () => clearTimeout(timeout);
  }, [poolAddress, pools, dex, networkId]);

  // No connector configured
  if (!connector) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <Droplets className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No network selected</p>
        <p className="text-xs text-muted-foreground mt-1">
          Select a network to add liquidity
        </p>
      </div>
    );
  }

  const poolOptions = useMemo(() => {
    return pools.map(p => ({
      value: p.address,
      label: `${p.baseSymbol}/${p.quoteSymbol}${p.feePct ? ` (${p.feePct}%)` : ''}`,
    }));
  }, [pools]);

  const handleAddLiquidity = async () => {
    if (!dex || !networkId || !poolAddress) {
      toast.error('Please select a pool');
      return;
    }

    if (!lowerPrice || !upperPrice) {
      toast.error('Please set price range');
      return;
    }

    if (!baseAmount && !quoteAmount) {
      toast.error('Please enter at least one token amount');
      return;
    }

    setExecuting(true);
    try {
      const result = await gatewayCLMM.addLiquidity({
        connector: dex,
        network: networkId,
        pool_address: poolAddress,
        lower_price: parseFloat(lowerPrice),
        upper_price: parseFloat(upperPrice),
        base_token_amount: baseAmount ? parseFloat(baseAmount) : undefined,
        quote_token_amount: quoteAmount ? parseFloat(quoteAmount) : undefined,
        slippage_pct: slippage,
      });
      toast.success(`Liquidity added: ${result.tx_hash.slice(0, 8)}...`);
      setBaseAmount('');
      setQuoteAmount('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add liquidity');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="flex flex-col h-full text-sm">
      {/* Network info */}
      <div className="font-medium mb-3">{connector}</div>

      {/* DEX Selector */}
      <div className="mb-3">
        <Label className="text-xs text-muted-foreground">DEX</Label>
        <Combobox
          options={dexOptions}
          value={dex}
          onValueChange={setDex}
          placeholder="Select DEX"
          className="mt-1"
        />
      </div>

      {/* Pool Selector */}
      <div className="mb-3">
        <Label className="text-xs text-muted-foreground">Pool</Label>
        <Combobox
          options={poolOptions}
          value={poolAddress}
          onValueChange={setPoolAddress}
          placeholder={loadingPools ? 'Loading pools...' : 'Select or enter pool address'}
          allowCustomValue
          className="mt-1"
        />
      </div>

      {/* Pool Info */}
      {selectedPool && (
        <div className="text-xs p-2 bg-muted rounded mb-3">
          <div className="font-medium">{selectedPool.baseSymbol}/{selectedPool.quoteSymbol}</div>
          {selectedPool.feePct && (
            <div className="text-muted-foreground">Fee: {selectedPool.feePct}%</div>
          )}
        </div>
      )}

      {/* Price Range */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <Label className="text-xs text-muted-foreground">Lower Price</Label>
          <Input
            type="number"
            placeholder="0.00"
            value={lowerPrice}
            onChange={(e) => setLowerPrice(e.target.value)}
            className="mt-1 h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Upper Price</Label>
          <Input
            type="number"
            placeholder="0.00"
            value={upperPrice}
            onChange={(e) => setUpperPrice(e.target.value)}
            className="mt-1 h-8 text-sm"
          />
        </div>
      </div>

      {/* Token Amounts */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <Label className="text-xs text-muted-foreground">
            {selectedPool?.baseSymbol || 'Base'} Amount
          </Label>
          <Input
            type="number"
            placeholder="0.00"
            value={baseAmount}
            onChange={(e) => setBaseAmount(e.target.value)}
            className="mt-1 h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">
            {selectedPool?.quoteSymbol || 'Quote'} Amount
          </Label>
          <Input
            type="number"
            placeholder="0.00"
            value={quoteAmount}
            onChange={(e) => setQuoteAmount(e.target.value)}
            className="mt-1 h-8 text-sm"
          />
        </div>
      </div>

      {/* Slippage */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <Label className="text-xs text-muted-foreground">Slippage</Label>
          <span className="text-xs font-medium">{slippage}%</span>
        </div>
        <Slider
          value={[slippage]}
          onValueChange={([v]) => setSlippage(v)}
          min={0.1}
          max={5}
          step={0.1}
          className="w-full"
        />
      </div>

      {/* Add Button */}
      <Button
        className="w-full mt-auto"
        onClick={handleAddLiquidity}
        disabled={!poolAddress || !lowerPrice || !upperPrice || (!baseAmount && !quoteAmount) || executing}
      >
        {executing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        Add Liquidity
      </Button>
    </div>
  );
}
