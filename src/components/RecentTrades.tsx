import { memo } from 'react';
import { useRecentTrades } from '@/hooks/useBinance';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RecentTradesProps {
  symbol: string;
}

export const RecentTrades = memo(function RecentTrades({ symbol }: RecentTradesProps) {
  const trades = useRecentTrades(symbol);

  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: price < 1 ? 6 : 2,
    });
  };

  const formatAmount = (amount: number) => {
    if (amount >= 1000) {
      return amount.toFixed(2);
    } else if (amount >= 1) {
      return amount.toFixed(4);
    }
    return amount.toFixed(6);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-secondary/50">
        <span className="font-semibold text-sm">Recent Trades</span>
        <span className="text-xs text-muted-foreground">{symbol}/USDT</span>
      </div>

      {/* Column Headers */}
      <div className="flex items-center px-3 py-1.5 text-xs text-muted-foreground border-b border-border">
        <span className="flex-1 text-left">Time</span>
        <span className="flex-1 text-right">Price</span>
        <span className="flex-1 text-right">Amount</span>
      </div>

      {/* Trades */}
      <ScrollArea className="flex-1">
        <div className="divide-y divide-border/50">
          {trades.map((trade, i) => (
            <div
              key={trade.id}
              className={`flex items-center px-3 py-1.5 text-xs font-mono animate-in fade-in slide-in-from-top-1 duration-200 ${i === 0 ? 'bg-primary/5' : ''
                }`}
            >
              <span className="flex-1 text-left text-muted-foreground">
                {formatTime(trade.time)}
              </span>
              <span
                className={`flex-1 text-right ${trade.isBuyerMaker ? 'text-red-500' : 'text-green-500'
                  }`}
              >
                {formatPrice(trade.price)}
              </span>
              <span className="flex-1 text-right text-foreground">
                {formatAmount(trade.amount)}
              </span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
});
