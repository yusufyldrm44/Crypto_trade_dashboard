import { useState, useEffect, useRef } from 'react';
import { useScalping, TIME_WINDOWS } from '@/contexts/ScalpingContext';
import { useBinanceTickers } from '@/hooks/useBinance';
import { 
  Play, Pause, Plus, Trash2, TrendingUp, TrendingDown, 
  Clock, Folder, CheckCircle, Zap 
} from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ScalpingTrackerProps {
  onSelectCoin: (symbol: string) => void;
}

export function ScalpingTracker({ onSelectCoin }: ScalpingTrackerProps) {
  const { 
    folders, 
    tradedCoins,
    activeFolderId, 
    setActiveFolderId,
    addFolder, 
    removeFolder, 
    addCoinToFolder, 
    removeCoinFromFolder,
    updateCoinPrices,
    markAsTraded,
    getSortedCoins,
    getFolderStats,
  } = useScalping();
  
  const { coins } = useBinanceTickers();
  const [isOpen, setIsOpen] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedTimeWindow, setSelectedTimeWindow] = useState(300);
  const [searchQuery, setSearchQuery] = useState('');
  const [newCoin, setNewCoin] = useState({ symbol: '', amount: '' });
  const [selectedTab, setSelectedTab] = useState('active');
  
  const trackingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pricesRef = useRef<Record<string, number>>({});

  // Fiyatları güncelle
  useEffect(() => {
    coins.forEach(c => {
      pricesRef.current[c.symbol] = c.price;
    });
  }, [coins]);

  // Tracking başlat/durdur
  useEffect(() => {
    if (isTracking && activeFolderId) {
      trackingRef.current = setInterval(() => {
        updateCoinPrices(activeFolderId, pricesRef.current);
      }, 1000); // Her saniye güncelle
    } else {
      if (trackingRef.current) {
        clearInterval(trackingRef.current);
      }
    }

    return () => {
      if (trackingRef.current) {
        clearInterval(trackingRef.current);
      }
    };
  }, [isTracking, activeFolderId, updateCoinPrices]);

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    addFolder(newFolderName, selectedTimeWindow);
    setNewFolderName('');
  };

  const handleAddCoin = (folderId: string) => {
    const amount = parseFloat(newCoin.amount);
    const price = pricesRef.current[newCoin.symbol];
    
    if (!newCoin.symbol || isNaN(amount) || !price) return;

    addCoinToFolder(folderId, newCoin.symbol, price, amount);
    setNewCoin({ symbol: '', amount: '' });
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: price < 1 ? 6 : 2,
    });
  };

  const formatSpeed = (speed: number) => {
    if (Math.abs(speed) < 0.001) return '0.00';
    return speed.toFixed(4);
  };

  const filteredCoins = coins.filter(c =>
    c.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedCoins = activeFolderId ? getSortedCoins(activeFolderId) : [];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Zap className="h-4 w-4 text-yellow-500" />
          <span className="hidden sm:inline">Scalping Tracker</span>
          {folders.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {folders.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Coin Scalping Tracker
            </DialogTitle>
            
            {/* Yeni Klasör Oluştur */}
            <div className="flex items-center gap-2">
              <Input
                placeholder="Klasör adı..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="w-32 h-8 text-sm"
              />
              <Select value={selectedTimeWindow.toString()} onValueChange={(v) => setSelectedTimeWindow(parseInt(v))}>
                <SelectTrigger className="w-28 h-8 text-sm">
                  <Clock className="h-3 w-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_WINDOWS.map(tw => (
                    <SelectItem key={tw.value} value={tw.value.toString()}>
                      {tw.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex-1">
          <TabsList className="mx-4 mt-2">
            <TabsTrigger value="active" className="gap-1">
              <Folder className="h-4 w-4" />
              Aktif Klasörler
              {folders.length > 0 && <span className="text-xs">({folders.length})</span>}
            </TabsTrigger>
            <TabsTrigger value="traded" className="gap-1">
              <CheckCircle className="h-4 w-4" />
              İşlem Yapılanlar
              {tradedCoins.length > 0 && <span className="text-xs">({tradedCoins.length})</span>}
            </TabsTrigger>
          </TabsList>

          {/* Aktif Klasörler */}
          <TabsContent value="active" className="m-0">
            <ScrollArea className="h-[60vh]">
              {folders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Folder className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">Henüz klasör yok</p>
                  <p className="text-sm">Yukarıdan yeni bir klasör oluşturun</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {folders.map((folder) => {
                    const isActive = activeFolderId === folder.id;
                    const sorted = isActive ? sortedCoins : folder.coins;
                    const stats = getFolderStats(folder.id);

                    return (
                      <div key={folder.id} className="bg-card">
                        {/* Klasör Başlığı */}
                        <div className="flex items-center justify-between px-4 py-3 bg-secondary/30">
                          <div className="flex items-center gap-3">
                            <Button
                              variant={isActive ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                setActiveFolderId(isActive ? null : folder.id);
                                if (!isActive) {
                                  setIsTracking(false);
                                }
                              }}
                            >
                              {isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                            </Button>
                            <div>
                              <span className="font-medium">{folder.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                ({folder.coins.length} coin)
                              </span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {TIME_WINDOWS.find(t => t.value === folder.timeWindow)?.label}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2">
                            {isActive && (
                              <Button
                                variant={isTracking ? "destructive" : "default"}
                                size="sm"
                                onClick={() => setIsTracking(!isTracking)}
                              >
                                {isTracking ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                                {isTracking ? 'Durdur' : 'Başlat'}
                              </Button>
                            )}

                            {/* Coin Ekle */}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                  <DialogTitle>{folder.name} - Coin Ekle</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-3 pt-4">
                                  <Input
                                    placeholder="Coin ara..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="h-9"
                                  />
                                  <ScrollArea className="h-40">
                                    <div className="space-y-1">
                                      {filteredCoins.slice(0, 15).map(coin => (
                                        <button
                                          key={coin.symbol}
                                          onClick={() => setNewCoin(prev => ({ ...prev, symbol: coin.symbol }))}
                                          className={cn(
                                            "w-full flex items-center justify-between p-2 rounded hover:bg-secondary text-left",
                                            newCoin.symbol === coin.symbol && "bg-primary/10"
                                          )}
                                        >
                                          <span className="font-medium">{coin.symbol}</span>
                                          <span className="text-sm text-muted-foreground">
                                            ${formatPrice(coin.price)}
                                          </span>
                                        </button>
                                      ))}
                                    </div>
                                  </ScrollArea>
                                  <Input
                                    placeholder="Miktar"
                                    type="number"
                                    value={newCoin.amount}
                                    onChange={(e) => setNewCoin(prev => ({ ...prev, amount: e.target.value }))}
                                  />
                                  <Button
                                    className="w-full"
                                    onClick={() => handleAddCoin(folder.id)}
                                    disabled={!newCoin.symbol || !newCoin.amount}
                                  >
                                    {newCoin.symbol || 'Coin'} Ekle
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-destructive/20 hover:text-destructive"
                              onClick={() => removeFolder(folder.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* İstatistikler */}
                        {stats && folder.coins.length > 0 && (
                          <div className="px-4 py-2 bg-secondary/10 flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground">Ort. P&L:</span>
                            <span className={cn(
                              "font-mono font-medium",
                              stats.totalPnl >= 0 ? 'text-green-500' : 'text-red-500'
                            )}>
                              {stats.totalPnl >= 0 ? '+' : ''}{stats.totalPnl.toFixed(2)}%
                            </span>
                            <span className="text-muted-foreground ml-4">En İyi:</span>
                            <span className="text-green-500 font-medium">{stats.bestPerformer}</span>
                            <span className="text-muted-foreground ml-4">En Kötü:</span>
                            <span className="text-red-500 font-medium">{stats.worstPerformer}</span>
                          </div>
                        )}

                        {/* Coin Listesi */}
                        {sorted.length > 0 && (
                          <div className="px-4 py-2">
                            <div className="bg-secondary/20 rounded-lg overflow-hidden">
                              {/* Başlıklar */}
                              <div className="grid grid-cols-8 gap-2 px-3 py-2 text-xs text-muted-foreground border-b border-border">
                                <span className="col-span-1">#</span>
                                <span className="col-span-1">Coin</span>
                                <span className="col-span-1 text-right">Giriş</span>
                                <span className="col-span-1 text-right">Anlık</span>
                                <span className="col-span-1 text-right">Değişim</span>
                                <span className="col-span-1 text-right">Hız</span>
                                <span className="col-span-1 text-right">P&L</span>
                                <span className="col-span-1 text-right">İşlem</span>
                              </div>

                              {/* Coinler */}
                              {sorted.map((coin, index) => (
                                <div
                                  key={coin.symbol}
                                  className="grid grid-cols-8 gap-2 px-3 py-2 text-sm hover:bg-secondary/30 items-center"
                                >
                                  <span className="col-span-1 text-muted-foreground">{index + 1}</span>
                                  <button
                                    className="col-span-1 font-medium text-left hover:text-primary"
                                    onClick={() => {
                                      onSelectCoin(coin.symbol);
                                      setIsOpen(false);
                                    }}
                                  >
                                    {coin.symbol}
                                  </button>
                                  <span className="col-span-1 text-right font-mono">${formatPrice(coin.entryPrice)}</span>
                                  <span className="col-span-1 text-right font-mono">${formatPrice(coin.currentPrice)}</span>
                                  <span className={cn(
                                    "col-span-1 text-right font-mono",
                                    coin.totalChange >= 0 ? 'text-green-500' : 'text-red-500'
                                  )}>
                                    {coin.totalChange >= 0 ? '+' : ''}{coin.totalChange.toFixed(2)}%
                                  </span>
                                  <span className={cn(
                                    "col-span-1 text-right font-mono flex items-center justify-end gap-1",
                                    coin.changeSpeed >= 0 ? 'text-green-500' : 'text-red-500'
                                  )}>
                                    {coin.changeSpeed >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                    {formatSpeed(coin.changeSpeed)}
                                  </span>
                                  <span className={cn(
                                    "col-span-1 text-right font-mono",
                                    coin.totalChange >= 0 ? 'text-green-500' : 'text-red-500'
                                  )}>
                                    {coin.totalChange >= 0 ? '+' : ''}{coin.totalChange.toFixed(2)}%
                                  </span>
                                  <div className="col-span-1 text-right flex items-center justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 hover:bg-green-500/20 hover:text-green-500"
                                      onClick={() => markAsTraded(folder.id, coin.symbol, coin.currentPrice)}
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 hover:bg-destructive/20 hover:text-destructive"
                                      onClick={() => removeCoinFromFolder(folder.id, coin.symbol)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* İşlem Yapılanlar */}
          <TabsContent value="traded" className="m-0">
            <ScrollArea className="h-[60vh]">
              {tradedCoins.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">Henüz işlem yapılmamış</p>
                  <p className="text-sm">Aktif klasörlerden coin işlemi yapın</p>
                </div>
              ) : (
                <div className="px-4 py-2 space-y-2">
                  {tradedCoins.map((trade, index) => (
                    <div
                      key={`${trade.symbol}-${index}`}
                      className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <span className="font-medium">{trade.symbol}</span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(trade.tradeTime).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-right">
                          <div className="text-muted-foreground text-xs">Giriş</div>
                          <div className="font-mono">${formatPrice(trade.entryPrice)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-muted-foreground text-xs">Çıkış</div>
                          <div className="font-mono">${formatPrice(trade.exitPrice)}</div>
                        </div>
                        <div className={cn(
                          "text-right",
                          trade.pnlPercent >= 0 ? 'text-green-500' : 'text-red-500'
                        )}>
                          <div className="text-xs">P&L</div>
                          <div className="font-mono font-medium">
                            {trade.pnlPercent >= 0 ? '+' : ''}{trade.pnlPercent.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
