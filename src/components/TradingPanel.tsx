import { useState } from 'react';
import { useBinancePrice } from '@/hooks/useBinance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';

interface TradingPanelProps {
  symbol: string;
}

type OrderType = 'limit' | 'market';

export function TradingPanel({ symbol }: TradingPanelProps) {
  const { isConnected, balance, connect, isConnecting } = useWallet();
  const currentPrice = useBinancePrice(symbol);
  const [orderType, setOrderType] = useState<OrderType>('limit');
  const [buyPrice, setBuyPrice] = useState('');
  const [buyAmount, setBuyAmount] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  const [buySliderValue, setBuySliderValue] = useState([0]);
  const [sellSliderValue, setSellSliderValue] = useState([0]);

  const calculateTotal = (price: string, amount: string) => {
    const p = parseFloat(price) || 0;
    const a = parseFloat(amount) || 0;
    return (p * a).toFixed(2);
  };

  const handleBuySliderChange = (value: number[]) => {
    setBuySliderValue(value);
    if (isConnected && currentPrice > 0) {
      const maxAmount = parseFloat(balance) / currentPrice;
      const amount = (maxAmount * value[0]) / 100;
      setBuyAmount(amount.toFixed(6));
      if (orderType === 'market') {
        setBuyPrice(currentPrice.toString());
      }
    }
  };

  const handleSellSliderChange = (value: number[]) => {
    setSellSliderValue(value);
    // Mock balance for demo
    const mockBalance = 1.5;
    const amount = (mockBalance * value[0]) / 100;
    setSellAmount(amount.toFixed(6));
    if (orderType === 'market') {
      setSellPrice(currentPrice.toString());
    }
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-secondary/50">
        <span className="font-semibold text-sm">Spot Trading</span>
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {isConnected ? `${parseFloat(balance).toFixed(4)} ETH` : 'Not Connected'}
          </span>
        </div>
      </div>

      {/* Order Type Tabs */}
      <div className="px-3 py-2">
        <Tabs value={orderType} onValueChange={(v) => setOrderType(v as OrderType)}>
          <TabsList className="grid w-full grid-cols-2 h-8">
            <TabsTrigger value="limit" className="text-xs">Limit</TabsTrigger>
            <TabsTrigger value="market" className="text-xs">Market</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Buy/Sell Tabs */}
      <Tabs defaultValue="buy" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 mx-3 w-auto">
          <TabsTrigger
            value="buy"
            className="text-xs data-[state=active]:bg-green-500 data-[state=active]:text-white"
          >
            <TrendingUp className="h-3 w-3 mr-1" />
            Buy
          </TabsTrigger>
          <TabsTrigger
            value="sell"
            className="text-xs data-[state=active]:bg-red-500 data-[state=active]:text-white"
          >
            <TrendingDown className="h-3 w-3 mr-1" />
            Sell
          </TabsTrigger>
        </TabsList>

        {/* Buy Content */}
        <TabsContent value="buy" className="flex-1 flex flex-col m-0 mt-2 px-3 pb-3">
          <div className="space-y-3 flex-1">
            {/* Price Input */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Price (USDT)</label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder={orderType === 'market' ? 'Market Price' : '0.00'}
                  value={orderType === 'market' ? currentPrice.toString() : buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value)}
                  disabled={orderType === 'market'}
                  className="h-9 pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  USDT
                </span>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Amount ({symbol})</label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={buyAmount}
                  onChange={(e) => setBuyAmount(e.target.value)}
                  className="h-9 pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {symbol}
                </span>
              </div>
            </div>

            {/* Slider */}
            <div className="space-y-1">
              <Slider
                value={buySliderValue}
                onValueChange={handleBuySliderChange}
                max={100}
                step={1}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center py-2 border-t border-border">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="font-mono text-sm">
                {calculateTotal(
                  orderType === 'market' ? currentPrice.toString() : buyPrice,
                  buyAmount
                )} USDT
              </span>
            </div>

            {/* Available */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Available</span>
              <span className="font-mono">
                {isConnected ? `${parseFloat(balance).toFixed(4)} USDT` : '--'}
              </span>
            </div>
          </div>

          {/* Buy Button */}
          {isConnected ? (
            <Button
              className="w-full mt-3 bg-green-500 hover:bg-green-600 text-white"
              size="lg"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Buy {symbol}
            </Button>
          ) : (
            <Button
              className="w-full mt-3"
              size="lg"
              onClick={connect}
              disabled={isConnecting}
            >
              <Wallet className="h-4 w-4 mr-2" />
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </Button>
          )}
        </TabsContent>

        {/* Sell Content */}
        <TabsContent value="sell" className="flex-1 flex flex-col m-0 mt-2 px-3 pb-3">
          <div className="space-y-3 flex-1">
            {/* Price Input */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Price (USDT)</label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder={orderType === 'market' ? 'Market Price' : '0.00'}
                  value={orderType === 'market' ? currentPrice.toString() : sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  disabled={orderType === 'market'}
                  className="h-9 pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  USDT
                </span>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Amount ({symbol})</label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={sellAmount}
                  onChange={(e) => setSellAmount(e.target.value)}
                  className="h-9 pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {symbol}
                </span>
              </div>
            </div>

            {/* Slider */}
            <div className="space-y-1">
              <Slider
                value={sellSliderValue}
                onValueChange={handleSellSliderChange}
                max={100}
                step={1}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center py-2 border-t border-border">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="font-mono text-sm">
                {calculateTotal(
                  orderType === 'market' ? currentPrice.toString() : sellPrice,
                  sellAmount
                )} USDT
              </span>
            </div>

            {/* Available */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Available</span>
              <span className="font-mono">1.5000 {symbol}</span>
            </div>
          </div>

          {/* Sell Button */}
          {isConnected ? (
            <Button
              className="w-full mt-3 bg-red-500 hover:bg-red-600 text-white"
              size="lg"
            >
              <TrendingDown className="h-4 w-4 mr-2" />
              Sell {symbol}
            </Button>
          ) : (
            <Button
              className="w-full mt-3"
              size="lg"
              onClick={connect}
              disabled={isConnecting}
            >
              <Wallet className="h-4 w-4 mr-2" />
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </Button>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
