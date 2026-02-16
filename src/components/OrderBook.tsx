import { memo } from 'react';
import { useOrderBook, useBinancePrice } from '@/hooks/useBinance';
import { ScrollArea } from '@/components/ui/scroll-area';

interface OrderBookProps {
  symbol: string;
}

export const OrderBook = memo(function OrderBook({ symbol }: OrderBookProps) {
  const { bids, asks } = useOrderBook(symbol, 15);
  const currentPrice = useBinancePrice(symbol);

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

  const maxTotal = Math.max(
    bids.length > 0 ? bids[bids.length - 1]?.total || 0 : 0,
    asks.length > 0 ? asks[asks.length - 1]?.total || 0 : 0
  );

  return (
    <div className="flex flex-col h-full bg-card rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-secondary/50">
        <span className="font-semibold text-sm">Order Book</span>
        <span className="text-xs text-muted-foreground">{symbol}/USDT</span>
      </div>

      {/* Column Headers */}
      <div className="flex items-center px-3 py-1.5 text-xs text-muted-foreground border-b border-border">
        <span className="flex-1 text-left">Price</span>
        <span className="flex-1 text-right">Amount</span>
        <span className="flex-1 text-right">Total</span>
      </div>

      {/* Asks (Sells) - Reversed to show highest first */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="flex flex-col-reverse">
            {asks.map((ask, i) => (
              <div
                key={`ask-${i}`}
                className="relative flex items-center px-3 py-0.5 text-xs font-mono"
              >
                {/* Background bar */}
                <div
                  className="absolute right-0 top-0 bottom-0 bg-red-500/10"
                  style={{ width: `${(ask.total / maxTotal) * 100}%` }}
                />
                <span className="flex-1 text-left text-red-500 relative z-10">
                  {formatPrice(ask.price)}
                </span>
                <span className="flex-1 text-right text-foreground relative z-10">
                  {formatAmount(ask.amount)}
                </span>
                <span className="flex-1 text-right text-muted-foreground relative z-10">
                  {formatPrice(ask.total)}
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Current Price */}
      <div className="flex items-center justify-center py-2 border-y border-border bg-secondary/30">
        <span
          className={`text-lg font-bold font-mono ${currentPrice > 0 ? 'text-green-500' : 'text-red-500'
            }`}
        >
          ${formatPrice(currentPrice)}
        </span>
      </div>

      {/* Bids (Buys) */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div>
            {bids.map((bid, i) => (
              <div
                key={`bid-${i}`}
                className="relative flex items-center px-3 py-0.5 text-xs font-mono"
              >
                {/* Background bar */}
                <div
                  className="absolute right-0 top-0 bottom-0 bg-green-500/10"
                  style={{ width: `${(bid.total / maxTotal) * 100}%` }}
                />
                <span className="flex-1 text-left text-green-500 relative z-10">
                  {formatPrice(bid.price)}
                </span>
                <span className="flex-1 text-right text-foreground relative z-10">
                  {formatAmount(bid.amount)}
                </span>
                <span className="flex-1 text-right text-muted-foreground relative z-10">
                  {formatPrice(bid.total)}
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
});
