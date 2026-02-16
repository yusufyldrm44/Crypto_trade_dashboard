import { useState } from 'react';
import { useAlerts } from '@/contexts/AlertsContext';
import { useBinancePrice } from '@/hooks/useBinance';
import { Bell, Plus, Trash2, TrendingUp, TrendingDown, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface PriceAlertsProps {
  symbol: string;
}

export function PriceAlerts({ symbol }: PriceAlertsProps) {
  const { alerts, addAlert, removeAlert } = useAlerts();
  const currentPrice = useBinancePrice(symbol);
  const [isOpen, setIsOpen] = useState(false);
  const [targetPrice, setTargetPrice] = useState('');
  const [alertType, setAlertType] = useState<'ABOVE' | 'BELOW'>('ABOVE');

  const symbolAlerts = alerts.filter(a => a.symbol === symbol);

  const handleAddAlert = () => {
    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) return;

    addAlert({
      symbol,
      targetPrice: price,
      currentPrice,
      type: alertType,
    });
    setTargetPrice('');
    setIsOpen(false);
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: price < 1 ? 6 : 2,
    });
  };

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-secondary/50">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-sm">Price Alerts</span>
          {symbolAlerts.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {symbolAlerts.length}
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
              onClick={() => console.log('Price Alerts + clicked')}
            >
              <Plus className="h-4 w-4 pointer-events-none" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Set Price Alert for {symbol}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Current Price</span>
                <span className="font-mono font-medium">${formatPrice(currentPrice)}</span>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Alert Type</label>
                <Select value={alertType} onValueChange={(v) => setAlertType(v as 'ABOVE' | 'BELOW')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ABOVE">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        Price goes above
                      </div>
                    </SelectItem>
                    <SelectItem value="BELOW">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-red-500" />
                        Price goes below
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Target Price (USDT)</label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    className="pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    USDT
                  </span>
                </div>
              </div>

              <Button onClick={handleAddAlert} className="w-full">
                <BellRing className="h-4 w-4 mr-2" />
                Set Alert
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Alerts List */}
      <ScrollArea className="h-48">
        {symbolAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Bell className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No alerts set</p>
            <p className="text-xs">Click + to add an alert</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {symbolAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-center justify-between px-3 py-2 ${
                  alert.status === 'TRIGGERED' ? 'bg-primary/5' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  {alert.type === 'ABOVE' ? (
                    <TrendingUp className={`h-4 w-4 ${
                      alert.status === 'TRIGGERED' ? 'text-green-500' : 'text-muted-foreground'
                    }`} />
                  ) : (
                    <TrendingDown className={`h-4 w-4 ${
                      alert.status === 'TRIGGERED' ? 'text-red-500' : 'text-muted-foreground'
                    }`} />
                  )}
                  <div>
                    <div className="text-sm font-medium">
                      ${formatPrice(alert.targetPrice)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {alert.type === 'ABOVE' ? 'Above' : 'Below'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {alert.status === 'TRIGGERED' && (
                    <Badge variant="outline" className="text-xs text-green-500 border-green-500">
                      Triggered
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 hover:bg-destructive/20 hover:text-destructive"
                    onClick={() => removeAlert(alert.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
