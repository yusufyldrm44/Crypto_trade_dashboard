import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLiveMomentum, type LiveMomentumResult } from '@/hooks/useLiveMomentum';
import { useBinanceTickers } from '@/hooks/useBinance';
import {
  Plus, Trash2, TrendingUp, TrendingDown,
  Activity, ArrowUpRight, ArrowDownRight, Minus,
  Clock, X, ChevronUp, ChevronDown, BarChart3,
  Target, Zap, Maximize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface LiveMomentumTrackerProps {
  onSelectCoin: (symbol: string) => void;
}

const TIME_WINDOWS = [
  { label: '1 Dakika', value: 60 },
  { label: '3 Dakika', value: 180 },
  { label: '5 Dakika', value: 300 },
  { label: '10 Dakika', value: 600 },
  { label: '15 Dakika', value: 900 },
  { label: '30 Dakika', value: 1800 },
];

// Trend ikonu
function TrendIcon({ trend }: { trend: LiveMomentumResult['trend'] }) {
  switch (trend) {
    case 'STRONG_UP':
      return <ArrowUpRight className="h-4 w-4 text-green-400" />;
    case 'UP':
      return <TrendingUp className="h-3 w-3 text-green-300" />;
    case 'STRONG_DOWN':
      return <ArrowDownRight className="h-4 w-4 text-red-400" />;
    case 'DOWN':
      return <TrendingDown className="h-3 w-3 text-red-300" />;
    default:
      return <Minus className="h-3 w-3 text-gray-400" />;
  }
}

// Trend badge rengi
function getTrendBadgeColor(trend: LiveMomentumResult['trend']): string {
  switch (trend) {
    case 'STRONG_UP':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'UP':
      return 'bg-green-400/10 text-green-300 border-green-400/20';
    case 'STRONG_DOWN':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'DOWN':
      return 'bg-red-400/10 text-red-300 border-red-400/20';
    default:
      return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  }
}

export function LiveMomentumTracker({ onSelectCoin }: LiveMomentumTrackerProps) {
  const {
    folders,
    addFolder,
    removeFolder,
    addCoinToFolder,
    removeCoinFromFolder,
    updateAllPrices,
  } = useLiveMomentum();

  const { coins } = useBinanceTickers();
  const pricesRef = useRef<Record<string, number>>({});

  // Ref to track folder IDs for price updates without causing re-renders
  const foldersRef = useRef(folders);
  foldersRef.current = folders;

  // Throttle ref to prevent excessive updates
  const lastUpdateRef = useRef<number>(0);
  const updateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedTimeWindow, setSelectedTimeWindow] = useState(300);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCoin, setSelectedCoin] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showAddCoinModal, setShowAddCoinModal] = useState(false);

  // CRITICAL FIX: Only depend on `coins` — NOT on `folders` or `updateAllPrices`
  // Using refs for folders to avoid the infinite loop:
  // folders change → effect runs → updateAllPrices → setFolders → folders change → ∞
  useEffect(() => {
    if (coins.length === 0) return;

    const currentPrices: Record<string, number> = {};
    coins.forEach(c => {
      currentPrices[c.symbol] = c.price;
      pricesRef.current[c.symbol] = c.price;
    });

    // Throttle updates to max once per second
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;

    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
    }

    const doUpdate = () => {
      lastUpdateRef.current = Date.now();
      foldersRef.current.forEach(folder => {
        if (folder.coins.length > 0) {
          updateAllPrices(folder.id, currentPrices);
        }
      });
    };

    if (timeSinceLastUpdate >= 1000) {
      doUpdate();
    } else {
      updateTimerRef.current = setTimeout(doUpdate, 1000 - timeSinceLastUpdate);
    }

    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
    };
  }, [coins, updateAllPrices]);

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      toast.error('Klasör adı giriniz');
      return;
    }

    if (folders.length >= 10) {
      toast.error('Maksimum 10 klasör oluşturabilirsiniz');
      return;
    }

    addFolder(newFolderName, selectedTimeWindow);
    setNewFolderName('');
    toast.success(`Klasör "${newFolderName}" oluşturuldu`);
  };

  const handleAddCoin = () => {
    if (!selectedCoin || !selectedFolderId) {
      toast.error('Coin seçiniz');
      return;
    }

    const price = pricesRef.current[selectedCoin];
    if (!price) {
      toast.error('Coin fiyatı bulunamadı');
      return;
    }

    addCoinToFolder(selectedFolderId, selectedCoin, price);
    setSelectedCoin('');
    setSearchQuery('');
    setShowAddCoinModal(false);
    toast.success(`${selectedCoin} klasöre eklendi`);
  };

  const openAddCoinModal = (folderId: string) => {
    setSelectedFolderId(folderId);
    setShowAddCoinModal(true);
  };

  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (price >= 1) {
      return price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    } else {
      return price.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 8 });
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}dk`;
    return `${Math.floor(seconds / 3600)}s`;
  };

  // Momentum değerini yüzde formatında göster
  const formatMomentum = (momentum: number) => {
    const percent = momentum * 100;
    if (Math.abs(percent) < 0.001) return '0.00%';
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(3)}%`;
  };

  const filteredCoins = useMemo(() => {
    if (!searchQuery) return coins.slice(0, 50);
    const query = searchQuery.toLowerCase();
    return coins.filter(c => c.symbol.toLowerCase().includes(query)).slice(0, 30);
  }, [coins, searchQuery]);

  // Klasörleri momentum'a göre sırala (ortalama momentum)
  const sortedFolders = useMemo(() => {
    return [...folders].sort((a, b) => {
      const avgMomentumA = a.coins.length > 0
        ? a.coins.reduce((sum, c) => sum + c.momentum, 0) / a.coins.length
        : 0;
      const avgMomentumB = b.coins.length > 0
        ? b.coins.reduce((sum, c) => sum + c.momentum, 0) / b.coins.length
        : 0;
      return avgMomentumB - avgMomentumA; // Büyükten küçüğe
    });
  }, [folders]);

  // Klasör için coinleri momentum'a göre sırala
  const getSortedCoins = useCallback((folderCoins: typeof folders[0]['coins']) => {
    if (folderCoins.length === 0) return folderCoins;
    return [...folderCoins].sort((a, b) => b.momentum - a.momentum);
  }, []);

  // Klasör istatistikleri
  const getFolderStats = useCallback((folder: typeof folders[0]) => {
    if (!folder.coins || folder.coins.length === 0) return null;

    const avgMomentum = folder.coins.reduce((sum, c) => sum + c.momentum, 0) / folder.coins.length;
    const bestCoin = folder.coins.reduce((best, c) => c.momentum > best.momentum ? c : best, folder.coins[0]);
    const worstCoin = folder.coins.reduce((worst, c) => c.momentum < worst.momentum ? c : worst, folder.coins[0]);

    return { avgMomentum, bestCoin, worstCoin };
  }, []);

  return (
    <>
      {/* Ana Buton */}
      <Button
        variant="ghost"
        size="sm"
        className="gap-2"
        onClick={() => setIsOpen(true)}
      >
        <Activity className="h-4 w-4 text-blue-500" />
        <span className="hidden sm:inline">Live Momentum</span>
        {folders.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {folders.length}/10
          </Badge>
        )}
      </Button>

      {/* Full Screen Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          className="max-w-none w-[98vw] h-[96vh] p-0 gap-0 flex flex-col"
          style={{ maxWidth: '98vw' }}
        >
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b border-border bg-card flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <DialogTitle className="flex items-center gap-3 text-xl">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="font-bold">Live Momentum Tracker</div>
                    <div className="text-xs text-muted-foreground font-normal">
                      Gerçek zamanlı linear regression analizi
                    </div>
                  </div>
                </DialogTitle>

                {/* Özet İstatistikler */}
                {folders.length > 0 && (
                  <div className="flex items-center gap-4 ml-8">
                    <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
                      <Target className="h-3.5 w-3.5 text-blue-400" />
                      <span className="text-sm">{folders.reduce((sum, f) => sum + f.coins.length, 0)} Coin</span>
                    </Badge>
                    <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
                      <BarChart3 className="h-3.5 w-3.5 text-purple-400" />
                      <span className="text-sm">{folders.length} Klasör</span>
                    </Badge>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Yeni Klasör Ekle */}
                {folders.length < 10 && (
                  <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1.5">
                    <Input
                      placeholder="Klasör adı..."
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      className="w-36 h-9 text-sm bg-background"
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                    />
                    <Select value={selectedTimeWindow.toString()} onValueChange={(v) => setSelectedTimeWindow(parseInt(v))}>
                      <SelectTrigger className="w-28 h-9 text-sm bg-background">
                        <Clock className="h-3.5 w-3.5 mr-1.5" />
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
                    <Button size="sm" onClick={handleCreateFolder} disabled={!newFolderName.trim()} className="h-9 px-3">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-9 w-9"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Main Content - Grid Layout */}
          <div className="flex-1 p-4 overflow-hidden bg-background/50">
            {folders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-6">
                  <Activity className="h-12 w-12 text-blue-400" />
                </div>
                <p className="text-2xl font-semibold mb-2">Henüz klasör yok</p>
                <p className="text-sm opacity-70">Yukarıdan yeni bir momentum klasörü oluşturun</p>
                <div className="mt-6 flex items-center gap-2 text-xs opacity-50">
                  <Maximize2 className="h-4 w-4" />
                  <span>10 klasöre kadar ekleyebilirsiniz</span>
                </div>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 pb-4">
                  {sortedFolders.map((folder, folderIndex) => {
                    const stats = getFolderStats(folder);
                    const sortedCoins = getSortedCoins(folder.coins);

                    return (
                      <div
                        key={folder.id}
                        className={cn(
                          "bg-card border rounded-xl overflow-hidden flex flex-col",
                          folderIndex === 0 && sortedCoins.length > 0 && sortedCoins[0].momentum > 0 && "border-green-500/30 shadow-lg shadow-green-500/5"
                        )}
                        style={{ minHeight: '320px' }}
                      >
                        {/* Klasör Header */}
                        <div className={cn(
                          "px-4 py-3 border-b flex items-center justify-between",
                          stats && stats.avgMomentum > 0 ? "bg-green-500/5" :
                            stats && stats.avgMomentum < 0 ? "bg-red-500/5" : "bg-muted/30"
                        )}>
                          <div className="flex items-center gap-3">
                            {/* Sıra Numarası */}
                            <div className={cn(
                              "w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold",
                              folderIndex === 0 ? "bg-yellow-500/20 text-yellow-500" :
                                folderIndex === 1 ? "bg-gray-400/20 text-gray-400" :
                                  folderIndex === 2 ? "bg-orange-600/20 text-orange-500" :
                                    "bg-muted text-muted-foreground"
                            )}>
                              {folderIndex + 1}
                            </div>

                            <div>
                              <div className="font-semibold text-sm">{folder.name}</div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {formatTime(folder.timeWindow)}
                                <span className="text-border">|</span>
                                <span>{folder.coins.length} coin</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Ortalama Momentum */}
                            {stats && (
                              <div className={cn(
                                "text-right px-2 py-1 rounded-md text-xs font-medium",
                                stats.avgMomentum > 0 ? "bg-green-500/10 text-green-400" :
                                  stats.avgMomentum < 0 ? "bg-red-500/10 text-red-400" : "bg-muted text-muted-foreground"
                              )}>
                                <div className="text-[10px] opacity-70">Ort.</div>
                                <div className="font-mono">{formatMomentum(stats.avgMomentum)}</div>
                              </div>
                            )}

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => removeFolder(folder.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Coin Listesi */}
                        <div className="flex-1 overflow-hidden">
                          {sortedCoins.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                              <Activity className="h-8 w-8 mb-2 opacity-30" />
                              <p className="text-sm">Henüz coin eklenmemiş</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="mt-2"
                                onClick={() => openAddCoinModal(folder.id)}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Coin Ekle
                              </Button>
                            </div>
                          ) : (
                            <ScrollArea className="h-[240px]">
                              <div className="p-2 space-y-1">
                                {sortedCoins.map((coin, coinIndex) => {
                                  const trend = coin.momentum > 0.001 ? 'STRONG_UP' :
                                    coin.momentum > 0.0001 ? 'UP' :
                                      coin.momentum < -0.001 ? 'STRONG_DOWN' :
                                        coin.momentum < -0.0001 ? 'DOWN' : 'FLAT';

                                  return (
                                    <div
                                      key={coin.symbol}
                                      className={cn(
                                        "flex items-center justify-between p-2.5 rounded-lg text-sm group cursor-pointer transition-all",
                                        coinIndex === 0 ? "bg-primary/5 border border-primary/10" : "hover:bg-muted/50 border border-transparent"
                                      )}
                                      onClick={() => {
                                        onSelectCoin(coin.symbol);
                                        setIsOpen(false);
                                      }}
                                    >
                                      {/* Sol: Sıra + Sembol + Fiyat */}
                                      <div className="flex items-center gap-2.5">
                                        <span className={cn(
                                          "w-5 h-5 rounded flex items-center justify-center text-[10px] font-medium",
                                          coinIndex === 0 ? "bg-yellow-500/20 text-yellow-500" :
                                            coinIndex === 1 ? "bg-gray-400/20 text-gray-400" :
                                              coinIndex === 2 ? "bg-orange-500/20 text-orange-500" :
                                                "text-muted-foreground"
                                        )}>
                                          {coinIndex + 1}
                                        </span>

                                        <div>
                                          <div className="font-semibold text-sm">{coin.symbol}</div>
                                          <div className="text-xs text-muted-foreground font-mono">
                                            ${formatPrice(coin.currentPrice)}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Sağ: Momentum + Trend */}
                                      <div className="flex items-center gap-3">
                                        <div className="text-right">
                                          <div className={cn(
                                            "text-xs font-mono font-semibold",
                                            coin.momentum > 0 ? "text-green-400" : coin.momentum < 0 ? "text-red-400" : "text-gray-400"
                                          )}>
                                            {coin.momentum > 0 ? <ChevronUp className="inline h-3 w-3" /> : coin.momentum < 0 ? <ChevronDown className="inline h-3 w-3" /> : null}
                                            {formatMomentum(coin.momentum)}
                                          </div>
                                          <div className="text-[10px] text-muted-foreground">
                                            R² {(coin.rSquared * 100).toFixed(0)}%
                                          </div>
                                        </div>

                                        <div className={cn("px-2 py-1 rounded-md border text-xs font-medium flex items-center gap-1", getTrendBadgeColor(trend))}>
                                          <TrendIcon trend={trend} />
                                        </div>

                                        {/* Sil Butonu (hover'da görünür) */}
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            removeCoinFromFolder(folder.id, coin.symbol);
                                          }}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </ScrollArea>
                          )}
                        </div>

                        {/* Footer - Add Coin Button */}
                        {sortedCoins.length > 0 && (
                          <div className="px-3 py-2 border-t bg-muted/20">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full h-8 text-xs"
                              onClick={() => openAddCoinModal(folder.id)}
                            >
                              <Plus className="h-3.5 w-3.5 mr-1.5" />
                              Bu Klasöre Coin Ekle
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Coin Modal */}
      <Dialog open={showAddCoinModal} onOpenChange={setShowAddCoinModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedFolderId && folders.find(f => f.id === selectedFolderId)?.name} - Coin Ekle
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-4">
            <Input
              placeholder="Coin ara... (örn: BTC, ETH)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10"
              autoFocus
            />
            <ScrollArea className="h-60 border rounded-lg">
              <div className="space-y-1 p-2">
                {filteredCoins.map(coin => (
                  <button
                    key={coin.symbol}
                    onClick={() => setSelectedCoin(coin.symbol)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-lg hover:bg-secondary text-left transition-colors",
                      selectedCoin === coin.symbol && "bg-primary/10 ring-1 ring-primary/30"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        coin.priceChangePercent24h >= 0 ? "bg-green-500" : "bg-red-500"
                      )} />
                      <span className="font-medium">{coin.symbol}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground font-mono">
                        ${formatPrice(coin.price)}
                      </div>
                      <div className={cn(
                        "text-xs",
                        coin.priceChangePercent24h >= 0 ? "text-green-400" : "text-red-400"
                      )}>
                        {coin.priceChangePercent24h >= 0 ? '+' : ''}{coin.priceChangePercent24h.toFixed(2)}%
                      </div>
                    </div>
                  </button>
                ))}
                {filteredCoins.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Coin bulunamadı</p>
                  </div>
                )}
              </div>
            </ScrollArea>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowAddCoinModal(false);
                  setSelectedCoin('');
                  setSearchQuery('');
                }}
              >
                İptal
              </Button>
              <Button
                className="flex-1"
                onClick={handleAddCoin}
                disabled={!selectedCoin}
              >
                {selectedCoin ? `${selectedCoin} Ekle` : 'Coin Seçin'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
