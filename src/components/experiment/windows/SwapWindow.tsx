import { useState, useEffect } from 'react';
import { Loader2, ArrowDownUp, RefreshCw } from 'lucide-react';
import { gatewaySwap, type SwapQuote } from '@/api/hummingbot-api';
import { gatewayClient } from '@/api/gateway';
import type { WindowContext } from '../ExperimentProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Combobox } from '@/components/ui/combobox';
import { toast } from 'sonner';

interface SwapWindowProps {
  context?: WindowContext;
}

export function SwapWindow({ context }: SwapWindowProps) {
  const connector = context?.connector; // e.g., "solana-mainnet-beta"

  // Parse chain and network from connector
  const [chain, network] = connector?.split('-') ?? ['', ''];
  const networkId = connector || '';

  const [tokens, setTokens] = useState<{ symbol: string; address: string }[]>([]);
  const [fromToken, setFromToken] = useState('');
  const [toToken, setToToken] = useState('');
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState(1);
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [dex, setDex] = useState('');
  const [dexOptions, setDexOptions] = useState<{ value: string; label: string }[]>([]);

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

  // Fetch tokens when network changes
  useEffect(() => {
    if (!chain || !network) {
      setTokens([]);
      return;
    }

    async function fetchTokens() {
      setLoadingTokens(true);
      try {
        const networkName = connector?.split('-').slice(1).join('-') || '';
        const response = await gatewayClient.chains.getTokens(chain, networkName);
        setTokens(response.tokens.map(t => ({ symbol: t.symbol, address: t.address })));
      } catch (err) {
        console.error('Failed to fetch tokens:', err);
        setTokens([]);
      } finally {
        setLoadingTokens(false);
      }
    }

    fetchTokens();
  }, [connector, chain, network]);

  // No connector configured
  if (!connector) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <ArrowDownUp className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No network selected</p>
        <p className="text-xs text-muted-foreground mt-1">
          Select a network to swap tokens
        </p>
      </div>
    );
  }

  const tokenOptions = tokens.map(t => ({ value: t.symbol, label: t.symbol }));

  const handleSwapDirection = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setQuote(null);
  };

  const handleGetQuote = async () => {
    if (!dex || !fromToken || !toToken || !amount) {
      toast.error('Please fill all fields');
      return;
    }

    setLoadingQuote(true);
    setQuote(null);
    try {
      const result = await gatewaySwap.getQuote({
        connector: dex,
        network: networkId,
        trading_pair: `${fromToken}-${toToken}`,
        side: 'BUY',
        amount: parseFloat(amount),
        slippage_pct: slippage,
      });
      setQuote(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to get quote');
    } finally {
      setLoadingQuote(false);
    }
  };

  const handleExecuteSwap = async () => {
    if (!quote || !dex) return;

    setExecuting(true);
    try {
      const result = await gatewaySwap.execute({
        connector: dex,
        network: networkId,
        trading_pair: `${fromToken}-${toToken}`,
        side: 'BUY',
        amount: parseFloat(amount),
        slippage_pct: slippage,
      });
      toast.success(`Swap submitted: ${result.tx_hash.slice(0, 8)}...`);
      setQuote(null);
      setAmount('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Swap failed');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Network info */}
      <div className="text-sm font-medium mb-3">{connector}</div>

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

      {/* From Token */}
      <div className="mb-2">
        <Label className="text-xs text-muted-foreground">From</Label>
        <div className="flex gap-2 mt-1">
          <Combobox
            options={tokenOptions}
            value={fromToken}
            onValueChange={(v) => { setFromToken(v); setQuote(null); }}
            placeholder={loadingTokens ? 'Loading...' : 'Token'}
            allowCustomValue
            className="w-32"
          />
          <Input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setQuote(null); }}
            className="flex-1"
          />
        </div>
      </div>

      {/* Swap Direction Button */}
      <div className="flex justify-center my-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-full"
          onClick={handleSwapDirection}
        >
          <ArrowDownUp className="h-4 w-4" />
        </Button>
      </div>

      {/* To Token */}
      <div className="mb-3">
        <Label className="text-xs text-muted-foreground">To</Label>
        <div className="flex gap-2 mt-1">
          <Combobox
            options={tokenOptions}
            value={toToken}
            onValueChange={(v) => { setToToken(v); setQuote(null); }}
            placeholder={loadingTokens ? 'Loading...' : 'Token'}
            allowCustomValue
            className="w-32"
          />
          <Input
            type="number"
            placeholder="Amount"
            value={quote ? quote.amount_out.toFixed(6) : ''}
            readOnly
            className="flex-1 bg-muted"
          />
        </div>
      </div>

      {/* Slippage */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <Label className="text-xs text-muted-foreground">Slippage Tolerance</Label>
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

      {/* Quote Details */}
      {quote && (
        <div className="text-xs space-y-1 mb-4 p-2 bg-muted rounded">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Price:</span>
            <span>{quote.price.toFixed(6)} {toToken}/{fromToken}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">You receive:</span>
            <span>{quote.amount_out.toFixed(6)} {toToken}</span>
          </div>
          {quote.gas_estimate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Est. Gas:</span>
              <span>{quote.gas_estimate}</span>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-auto space-y-2">
        {!quote ? (
          <Button
            className="w-full"
            onClick={handleGetQuote}
            disabled={!fromToken || !toToken || !amount || !dex || loadingQuote}
          >
            {loadingQuote ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Get Quote
          </Button>
        ) : (
          <Button
            className="w-full bg-primary"
            onClick={handleExecuteSwap}
            disabled={executing}
          >
            {executing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Swap {fromToken} → {toToken}
          </Button>
        )}
      </div>
    </div>
  );
}
