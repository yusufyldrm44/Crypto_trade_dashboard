import { useState, useEffect } from 'react';
import { useAlerts } from '@/contexts/AlertsContext';
import { useBinancePrice } from '@/hooks/useBinance';
import { useWallet } from '@/hooks/useWallet';
import { Wallet, TrendingUp, TrendingDown, History, MousePointerClick, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
// TradeHistory type is used in the component

interface AdvancedTradingPanelProps {
  symbol: string;
  selectedChartPrice?: { price: number; type: 'limit' | 'stop_loss' | 'take_profit' } | null;
  onClearSelectedPrice?: () => void;
}

type OrderType = 'limit' | 'market';

export function AdvancedTradingPanel({ symbol, selectedChartPrice, onClearSelectedPrice }: AdvancedTradingPanelProps) {
  const { isConnected, balance, connect, isConnecting } = useWallet();
  const { addToPortfolio, tradeHistory } = useAlerts();
  const currentPrice = useBinancePrice(symbol);
  
  const [orderType, setOrderType] = useState<OrderType>('limit');
  const [buyPrice, setBuyPrice] = useState('');
  const [buyAmount, setBuyAmount] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  const [buySliderValue, setBuySliderValue] = useState([0]);
  const [sellSliderValue, setSellSliderValue] = useState([0]);
  const [activeTab, setActiveTab] = useState('buy');

  const symbolTrades = tradeHistory.filter(t => t.symbol === symbol).slice(0, 10);

  // Handle price selection from chart
  useEffect(() => {
    if (selectedChartPrice) {
      const priceStr = selectedChartPrice.price.toString();
      
      if (selectedChartPrice.type === 'limit') {
        // For limit orders, set the price based on which tab is active
        if (activeTab === 'buy') {
          setBuyPrice(priceStr);
          setOrderType('limit');
        } else if (activeTab === 'sell') {
          setSellPrice(priceStr);
          setOrderType('limit');
        }
      } else if (selectedChartPrice.type === 'stop_loss') {
        // Stop loss is typically for sell orders
        setActiveTab('sell');
        setSellPrice(priceStr);
        toast.info(`Stop Loss price set to $${selectedChartPrice.price.toFixed(2)}`);
      } else if (selectedChartPrice.type === 'take_profit') {
        // Take profit is typically for sell orders
        setActiveTab('sell');
        setSellPrice(priceStr);
        toast.info(`Take Profit price set to $${selectedChartPrice.price.toFixed(2)}`);
      }
      
      onClearSelectedPrice?.();
    }
  }, [selectedChartPrice, activeTab, onClearSelectedPrice]);

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
    const mockBalance = 1.5;
    const amount = (mockBalance * value[0]) / 100;
    setSellAmount(amount.toFixed(6));
    if (orderType === 'market') {
      setSellPrice(currentPrice.toString());
    }
  };

  const executeBuy = () => {
    const price = orderType === 'market' ? currentPrice : parseFloat(buyPrice);
    const amount = parseFloat(buyAmount);
    
    if (!price || !amount || amount <= 0) {
      toast.error('Please enter valid price and amount');
      return;
    }

    // Add to portfolio
    addToPortfolio({
      symbol,
      amount,
      avgBuyPrice: price,
      currentPrice,
    });

    toast.success(`Bought ${amount} ${symbol} at $${price.toFixed(2)}`);
    setBuyAmount('');
    setBuySliderValue([0]);
  };

  const executeSell = () => {
    const price = orderType === 'market' ? currentPrice : parseFloat(sellPrice);
    const amount = parseFloat(sellAmount);
    
    if (!price || !amount || amount <= 0) {
      toast.error('Please enter valid price and amount');
      return;
    }

    toast.success(`Sold ${amount} ${symbol} at $${price.toFixed(2)}`);
    setSellAmount('');
    setSellSliderValue([0]);
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: price < 1 ? 6 : 2,
    });
  };

  // Quick preset buttons
  const quickPresets = [25, 50, 75, 100];

  return (
    <div className="flex flex-col h-full bg-card rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-secondary/50">
        <span className="font-semibold text-sm">Spot Trading</span>
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {isConnected ? `${parseFloat(balance).toFixed(4)} USDT` : 'Not Connected'}
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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 mx-3 w-auto">
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
          <TabsTrigger
            value="history"
            className="text-xs"
          >
            <History className="h-3 w-3 mr-1" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Buy Content */}
        <TabsContent value="buy" className="flex-1 flex flex-col m-0 mt-2 px-3 pb-3">
          <div className="space-y-3 flex-1">
            {/* Chart Price Indicator */}
            {buyPrice && (
              <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-md">
                <MousePointerClick className="h-4 w-4 text-primary" />
                <span className="text-xs text-primary">
                  Chart price selected: ${parseFloat(buyPrice).toFixed(2)}
                </span>
                <button 
                  onClick={() => setBuyPrice('')}
                  className="ml-auto hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

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

            {/* Quick Preset Buttons */}
            <div className="flex gap-1">
              {quickPresets.map((preset) => (
                <Button
                  key={preset}
                  variant="outline"
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={() => {
                    if (isConnected && currentPrice > 0) {
                      const maxAmount = parseFloat(balance) / currentPrice;
                      const amount = (maxAmount * preset) / 100;
                      setBuyAmount(amount.toFixed(6));
                      setBuySliderValue([preset]);
                    }
                  }}
                >
                  {preset}%
                </Button>
              ))}
            </div>

            <div className="flex justify-between items-center py-2 border-t border-border">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="font-mono text-sm">
                {calculateTotal(
                  orderType === 'market' ? currentPrice.toString() : buyPrice,
                  buyAmount
                )} USDT
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Available</span>
              <span className="font-mono">
                {isConnected ? `${parseFloat(balance).toFixed(4)} USDT` : '--'}
              </span>
            </div>
          </div>

          {isConnected ? (
            <Button
              className="w-full mt-3 bg-green-500 hover:bg-green-600 text-white"
              size="lg"
              onClick={executeBuy}
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
            {/* Chart Price Indicator */}
            {sellPrice && (
              <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-md">
                <MousePointerClick className="h-4 w-4 text-primary" />
                <span className="text-xs text-primary">
                  Chart price selected: ${parseFloat(sellPrice).toFixed(2)}
                </span>
                <button 
                  onClick={() => setSellPrice('')}
                  className="ml-auto hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

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

            {/* Quick Preset Buttons */}
            <div className="flex gap-1">
              {quickPresets.map((preset) => (
                <Button
                  key={preset}
                  variant="outline"
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={() => {
                    const mockBalance = 1.5;
                    const amount = (mockBalance * preset) / 100;
                    setSellAmount(amount.toFixed(6));
                    setSellSliderValue([preset]);
                  }}
                >
                  {preset}%
                </Button>
              ))}
            </div>

            <div className="flex justify-between items-center py-2 border-t border-border">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="font-mono text-sm">
                {calculateTotal(
                  orderType === 'market' ? currentPrice.toString() : sellPrice,
                  sellAmount
                )} USDT
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Available</span>
              <span className="font-mono">1.5000 {symbol}</span>
            </div>
          </div>

          {isConnected ? (
            <Button
              className="w-full mt-3 bg-red-500 hover:bg-red-600 text-white"
              size="lg"
              onClick={executeSell}
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

        {/* History Content */}
        <TabsContent value="history" className="flex-1 flex flex-col m-0 mt-2 px-3 pb-3">
          <ScrollArea className="flex-1">
            {symbolTrades.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <History className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No trades yet</p>
                <p className="text-xs">Your trading history will appear here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {symbolTrades.map((trade) => (
                  <div key={trade.id} className="flex items-center justify-between p-2 bg-secondary/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={trade.side === 'BUY' ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {trade.side}
                      </Badge>
                      <div>
                        <div className="text-sm font-medium">{trade.amount} {trade.symbol}</div>
                        <div className="text-xs text-muted-foreground">
                          @ ${formatPrice(trade.price)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono">${formatPrice(trade.total)}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(trade.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
