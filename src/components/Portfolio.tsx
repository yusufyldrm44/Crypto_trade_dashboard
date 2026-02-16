import { useAlerts } from '@/contexts/AlertsContext';
import { Wallet, TrendingUp, TrendingDown, Package } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

export function Portfolio() {
  const { portfolio } = useAlerts();

  const totalValue = portfolio.reduce((sum, p) => sum + p.totalValue, 0);
  const totalPnl = portfolio.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  const totalPnlPercent = totalValue > 0 ? (totalPnl / (totalValue - totalPnl)) * 100 : 0;

  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: price < 1 ? 6 : 2,
    });
  };

  const formatAmount = (amount: number) => {
    if (amount >= 1000) return amount.toFixed(2);
    if (amount >= 1) return amount.toFixed(4);
    return amount.toFixed(6);
  };

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border bg-secondary/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-sm">Portfolio</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {portfolio.length} Assets
          </Badge>
        </div>
        
        {portfolio.length > 0 && (
          <div className="mt-2 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Total Value</div>
              <div className="text-lg font-bold">${formatPrice(totalValue)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Unrealized P&L</div>
              <div className={`text-lg font-bold flex items-center gap-1 ${totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {totalPnl >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {totalPnl >= 0 ? '+' : ''}${formatPrice(totalPnl)}
                <span className="text-sm">({totalPnlPercent >= 0 ? '+' : ''}{totalPnlPercent.toFixed(2)}%)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Portfolio List */}
      <ScrollArea className="h-64">
        {portfolio.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Package className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No positions</p>
            <p className="text-xs">Start trading to build your portfolio</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {portfolio.map((item) => (
              <div key={item.symbol} className="px-3 py-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.symbol}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatAmount(item.amount)}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-mono">${formatPrice(item.totalValue)}</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <div className="text-muted-foreground">
                    Avg: ${formatPrice(item.avgBuyPrice)} → Current: ${formatPrice(item.currentPrice)}
                  </div>
                  <div className={`flex items-center gap-1 ${item.unrealizedPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {item.unrealizedPnl >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {item.unrealizedPnl >= 0 ? '+' : ''}${formatPrice(item.unrealizedPnl)}
                    <span>({item.unrealizedPnlPercent >= 0 ? '+' : ''}{item.unrealizedPnlPercent.toFixed(2)}%)</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
