import { useState } from 'react';
import { useAlerts } from '@/contexts/AlertsContext';
import { useBinancePrice } from '@/hooks/useBinance';
import { Shield, Plus, Trash2, Target, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface StopLossTakeProfitProps {
  symbol: string;
}

export function StopLossTakeProfitPanel({ symbol }: StopLossTakeProfitProps) {
  const { stopLossTakeProfits, addStopLossTakeProfit, removeStopLossTakeProfit } = useAlerts();
  const currentPrice = useBinancePrice(symbol);
  const [isOpen, setIsOpen] = useState(false);
  const [entryPrice, setEntryPrice] = useState(currentPrice.toString());
  const [amount, setAmount] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');

  const symbolSLTP = stopLossTakeProfits.filter(s => s.symbol === symbol);

  const handleAdd = () => {
    const entry = parseFloat(entryPrice);
    const amt = parseFloat(amount);
    const sl = stopLoss ? parseFloat(stopLoss) : undefined;
    const tp = takeProfit ? parseFloat(takeProfit) : undefined;

    if (isNaN(entry) || isNaN(amt) || amt <= 0) return;
    if (!sl && !tp) return;

    addStopLossTakeProfit({
      symbol,
      entryPrice: entry,
      amount: amt,
      stopLoss: sl,
      takeProfit: tp,
    });
    
    setEntryPrice(currentPrice.toString());
    setAmount('');
    setStopLoss('');
    setTakeProfit('');
    setIsOpen(false);
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: price < 1 ? 6 : 2,
    });
  };

  const calculatePnL = (entry: number, exit: number, amount: number) => {
    return (exit - entry) * amount;
  };

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-secondary/50">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-sm">Stop Loss / Take Profit</span>
          {symbolSLTP.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {symbolSLTP.length}
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
              onClick={() => console.log('SL/TP + clicked')}
            >
              <Plus className="h-4 w-4 pointer-events-none" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Set Stop Loss / Take Profit for {symbol}</DialogTitle>
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-red-500">Stop Loss</label>
                  <Input
                    type="number"
                    placeholder="Optional"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    className="border-red-500/30 focus-visible:ring-red-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-green-500">Take Profit</label>
                  <Input
                    type="number"
                    placeholder="Optional"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value)}
                    className="border-green-500/30 focus-visible:ring-green-500"
                  />
                </div>
              </div>

              {/* Preview */}
              {(stopLoss || takeProfit) && entryPrice && amount && (
                <div className="p-3 bg-secondary/50 rounded-lg space-y-2">
                  <div className="text-sm font-medium">Estimated P&L</div>
                  {stopLoss && (
                    <div className="flex justify-between text-sm">
                      <span className="text-red-500">If Stop Loss:</span>
                      <span className="font-mono text-red-500">
                        ${calculatePnL(parseFloat(entryPrice), parseFloat(stopLoss), parseFloat(amount)).toFixed(2)}
                      </span>
                    </div>
                  )}
                  {takeProfit && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-500">If Take Profit:</span>
                      <span className="font-mono text-green-500">
                        +${calculatePnL(parseFloat(entryPrice), parseFloat(takeProfit), parseFloat(amount)).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <Button onClick={handleAdd} className="w-full">
                <Shield className="h-4 w-4 mr-2" />
                Set Protection
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* SL/TP List */}
      <ScrollArea className="h-48">
        {symbolSLTP.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Shield className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No protection set</p>
            <p className="text-xs">Protect your trades</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {symbolSLTP.map((sltp) => (
              <div
                key={sltp.id}
                className={`px-3 py-2 ${sltp.status === 'TRIGGERED' ? 'bg-primary/5' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {sltp.amount} {symbol}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      @ ${formatPrice(sltp.entryPrice)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {sltp.status === 'TRIGGERED' && sltp.triggeredType && (
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          sltp.triggeredType === 'STOP_LOSS' 
                            ? 'text-red-500 border-red-500' 
                            : 'text-green-500 border-green-500'
                        }`}
                      >
                        {sltp.triggeredType === 'STOP_LOSS' ? 'SL' : 'TP'} Hit
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 hover:bg-destructive/20 hover:text-destructive"
                      onClick={() => removeStopLossTakeProfit(sltp.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  {sltp.stopLoss && (
                    <div className="flex items-center gap-1 text-red-500">
                      <AlertTriangle className="h-3 w-3" />
                      SL: ${formatPrice(sltp.stopLoss)}
                    </div>
                  )}
                  {sltp.takeProfit && (
                    <div className="flex items-center gap-1 text-green-500">
                      <Target className="h-3 w-3" />
                      TP: ${formatPrice(sltp.takeProfit)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
