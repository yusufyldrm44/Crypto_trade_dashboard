import { useState } from 'react';
import { useAlerts } from '@/contexts/AlertsContext';
import { useBinancePrice } from '@/hooks/useBinance';
import { TrendingDown, Plus, Trash2, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface TrailingStopProps {
  symbol: string;
}

export function TrailingStopPanel({ symbol }: TrailingStopProps) {
  const { trailingStops, addTrailingStop, removeTrailingStop } = useAlerts();
  const currentPrice = useBinancePrice(symbol);
  const [isOpen, setIsOpen] = useState(false);
  const [entryPrice, setEntryPrice] = useState(currentPrice.toString());
  const [amount, setAmount] = useState('');
  const [trailingPercent, setTrailingPercent] = useState([5]);

  const symbolTrailingStops = trailingStops.filter(t => t.symbol === symbol);

  const handleAdd = () => {
    const entry = parseFloat(entryPrice);
    const amt = parseFloat(amount);

    if (isNaN(entry) || isNaN(amt) || amt <= 0) return;

    addTrailingStop({
      symbol,
      entryPrice: entry,
      amount: amt,
      trailingPercent: trailingPercent[0],
    });
    
    setEntryPrice(currentPrice.toString());
    setAmount('');
    setTrailingPercent([5]);
    setIsOpen(false);
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: price < 1 ? 6 : 2,
    });
  };

  const calculateProgress = (current: number, entry: number, stop: number) => {
    if (current <= stop) return 0;
    const range = entry - stop;
    const currentFromStop = current - stop;
    return Math.min(100, Math.max(0, (currentFromStop / range) * 100));
  };

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-secondary/50">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-sm">Trailing Stop</span>
          {symbolTrailingStops.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {symbolTrailingStops.length}
            </Badge>
          )}
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 pointer-events-auto relative z-10"
              type="button"
              onClick={() => console.log('Trailing Stop + clicked')}
            >
              <Plus className="h-4 w-4 pointer-events-none" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Set Trailing Stop for {symbol}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Current Price</span>
                <span className="font-mono font-medium">${formatPrice(currentPrice)}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Entry Price</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount ({symbol})</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Trailing Distance</label>
                  <span className="text-sm font-mono text-primary">{trailingPercent[0]}%</span>
                </div>
                <Slider
                  value={trailingPercent}
                  onValueChange={setTrailingPercent}
                  min={1}
                  max={20}
                  step={0.5}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1%</span>
                  <span>10%</span>
                  <span>20%</span>
                </div>
              </div>

              {/* Preview */}
              {entryPrice && amount && (
                <div className="p-3 bg-secondary/50 rounded-lg space-y-2">
                  <div className="text-sm font-medium">Initial Stop Price</div>
                  <div className="font-mono text-lg">
                    ${formatPrice(parseFloat(entryPrice) * (1 - trailingPercent[0] / 100))}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Stop will move up as price increases
                  </div>
                </div>
              )}

              <Button onClick={handleAdd} className="w-full">
                <TrendingDown className="h-4 w-4 mr-2" />
                Set Trailing Stop
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Trailing Stops List */}
      <ScrollArea className="h-48">
        {symbolTrailingStops.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <TrendingDown className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No trailing stops</p>
            <p className="text-xs">Lock in profits automatically</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {symbolTrailingStops.map((ts) => {
              const progress = calculateProgress(currentPrice, ts.entryPrice, ts.currentStopPrice);
              const profit = (currentPrice - ts.entryPrice) * ts.amount;
              
              return (
                <div
                  key={ts.id}
                  className={`px-3 py-3 ${ts.status === 'TRIGGERED' ? 'bg-primary/5' : ''}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {ts.amount} {symbol}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {ts.trailingPercent}%
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {ts.status === 'TRIGGERED' && (
                        <Badge variant="outline" className="text-xs text-red-500 border-red-500">
                          Triggered
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:bg-destructive/20 hover:text-destructive"
                        onClick={() => removeTrailingStop(ts.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {ts.status === 'ACTIVE' && (
                    <>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Stop: ${formatPrice(ts.currentStopPrice)}</span>
                        <span className={profit >= 0 ? 'text-green-500' : 'text-red-500'}>
                          {profit >= 0 ? '+' : ''}${profit.toFixed(2)}
                        </span>
                      </div>
                      <Progress value={progress} className="h-1" />
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Activity className="h-3 w-3" />
                        <span>High: ${formatPrice(ts.highestPrice)}</span>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
