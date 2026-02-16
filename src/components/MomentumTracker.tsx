import { useState, useEffect, useRef } from 'react';
import { useMomentum, type MomentumResult } from '@/hooks/useMomentum';
import { useBinanceTickers } from '@/hooks/useBinance';
import { 
  Play, Pause, Plus, Trash2, TrendingUp, TrendingDown, 
  Activity, BarChart3, ChevronRight, Clock,
  ArrowUpRight, ArrowDownRight, Minus, Calculator
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
import { toast } from 'sonner';

interface MomentumTrackerProps {
  onSelectCoin: (symbol: string) => void;
}

const WINDOW_SIZES = [
  { label: '10 Blok', value: 10 },
  { label: '20 Blok', value: 20 },
  { label: '50 Blok', value: 50 },
  { label: '100 Blok', value: 100 },
];

const INTERVALS = [
  { label: '5 Saniye', value: 5 },
  { label: '10 Saniye', value: 10 },
  { label: '30 Saniye', value: 30 },
  { label: '1 Dakika', value: 60 },
  { label: '5 Dakika', value: 300 },
];

// Trend ikonu
function TrendIcon({ trend }: { trend: MomentumResult['trend'] }) {
  switch (trend) {
    case 'STRONG_UP':
      return <ArrowUpRight className="h-5 w-5 text-green-600" />;
    case 'UP':
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    case 'STRONG_DOWN':
      return <ArrowDownRight className="h-5 w-5 text-red-600" />;
    case 'DOWN':
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    default:
      return <Minus className="h-4 w-4 text-gray-400" />;
  }
}

// Trend rengi
function getTrendColor(trend: MomentumResult['trend']): string {
  switch (trend) {
    case 'STRONG_UP':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'UP':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'STRONG_DOWN':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'DOWN':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

// Trend metni
function getTrendText(trend: MomentumResult['trend']): string {
  switch (trend) {
    case 'STRONG_UP':
      return 'Güçlü Yükseliş';
    case 'UP':
      return 'Yükseliş';
    case 'STRONG_DOWN':
      return 'Güçlü Düşüş';
    case 'DOWN':
      return 'Düşüş';
    default:
      return 'Yatay';
  }
}

export function MomentumTracker({ onSelectCoin }: MomentumTrackerProps) {
  const { 
    folders,
    addFolder, 
    removeFolder, 
    addCoinToFolder, 
    removeCoinFromFolder,
    toggleCalculation,
    setActivePrices,
    getSortedResults,
  } = useMomentum();
  
  const { coins } = useBinanceTickers();
  const pricesRef = useRef<Record<string, number>>({});
  
  const [isOpen, setIsOpen] = useState(false);
  const [isResultsOpen, setIsResultsOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedWindowSize, setSelectedWindowSize] = useState(20);
  const [selectedInterval, setSelectedInterval] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCoin, setSelectedCoin] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(() => folders[0]?.id || '');

  // Fiyatları güncelle ve hook'a gönder
  useEffect(() => {
    coins.forEach(c => {
      pricesRef.current[c.symbol] = c.price;
    });
    // Aktif hesaplama için fiyatları gönder
    setActivePrices(pricesRef.current);
  }, [coins, setActivePrices]);

  // Tab değiştiğinde aktif tab'ı güncelle
  useEffect(() => {
    if (folders.length > 0 && !folders.find(f => f.id === activeTab)) {
      setActiveTab(folders[0]?.id || '');
    }
  }, [folders, activeTab]);

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      toast.error('Klasör adı giriniz');
      return;
    }
    
    // Maksimum 7 klasör kontrolü
    if (folders.length >= 7) {
      toast.error('Maksimum 7 klasör oluşturabilirsiniz');
      return;
    }
    
    addFolder(newFolderName, selectedWindowSize, selectedInterval);
    setNewFolderName('');
    toast.success(`Klasör "${newFolderName}" oluşturuldu`);
  };

  const handleAddCoin = (folderId: string) => {
    if (!selectedCoin) {
      toast.error('Coin seçiniz');
      return;
    }
    
    const price = pricesRef.current[selectedCoin];
    if (!price) {
      toast.error('Coin fiyatı bulunamadı');
      return;
    }

    addCoinToFolder(folderId, selectedCoin, price);
    setSelectedCoin('');
    setSearchQuery('');
    toast.success(`${selectedCoin} klasöre eklendi`);
  };

  const handleToggleCalculation = (folderId: string) => {
    toggleCalculation(folderId, pricesRef.current);
    const folder = folders.find(f => f.id === folderId);
    if (folder) {
      if (folder.isActive) {
        toast.info(`"${folder.name}" hesaplama durduruldu`);
      } else {
        toast.success(`"${folder.name}" hesaplama başlatıldı`);
      }
    }
  };

  const handleShowResults = (folderId: string) => {
    setSelectedFolderId(folderId);
    setIsResultsOpen(true);
  };

  const formatNumber = (num: number, digits: number = 4) => {
    if (Math.abs(num) < 0.0001) return '0.0000';
    return num.toFixed(digits);
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: price < 1 ? 6 : 2,
    });
  };

  const filteredCoins = coins.filter(c =>
    c.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // const currentFolder = folders.find(f => f.id === activeTab);
  const currentResults = selectedFolderId ? getSortedResults(selectedFolderId) : [];

  return (
    <>
      {/* Ana Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <Calculator className="h-4 w-4 text-blue-500" />
            <span className="hidden sm:inline">Momentum Tracker</span>
            {folders.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {folders.length}/7
              </Badge>
            )}
          </Button>
        </DialogTrigger>
        
        <DialogContent className="sm:max-w-5xl max-h-[90vh] p-0">
          <DialogHeader className="px-4 py-3 border-b border-border">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                Linear Regression Momentum Tracker
                <span className="text-xs text-muted-foreground font-normal">
                  (Maks. 7 Klasör)
                </span>
              </DialogTitle>
              
              {/* Yeni Klasör Oluştur */}
              {folders.length < 7 && (
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Klasör adı..."
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="w-32 h-8 text-sm"
                  />
                  <Select value={selectedWindowSize.toString()} onValueChange={(v) => setSelectedWindowSize(parseInt(v))}>
                    <SelectTrigger className="w-28 h-8 text-sm">
                      <BarChart3 className="h-3 w-3 mr-1" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WINDOW_SIZES.map(w => (
                        <SelectItem key={w.value} value={w.value.toString()}>
                          {w.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedInterval.toString()} onValueChange={(v) => setSelectedInterval(parseInt(v))}>
                    <SelectTrigger className="w-28 h-8 text-sm">
                      <Clock className="h-3 w-3 mr-1" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INTERVALS.map(i => (
                        <SelectItem key={i.value} value={i.value.toString()}>
                          {i.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          {folders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Activity className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Henüz klasör yok</p>
              <p className="text-sm">Yukarıdan yeni bir momentum klasörü oluşturun</p>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
              <TabsList className="mx-4 mt-2 flex-wrap h-auto gap-1">
                {folders.map((folder) => (
                  <TabsTrigger 
                    key={folder.id} 
                    value={folder.id}
                    className="gap-1 text-xs"
                  >
                    {folder.name}
                    {folder.isActive && (
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      ({folder.coins.length})
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {folders.map((folder) => (
                <TabsContent key={folder.id} value={folder.id} className="m-0">
                  <ScrollArea className="h-[60vh]">
                    <div className="p-4 space-y-4">
                      {/* Klasör Başlığı ve Kontroller */}
                      <div className="flex items-center justify-between bg-secondary/30 p-3 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Button
                            variant={folder.isActive ? "destructive" : "default"}
                            size="sm"
                            onClick={() => handleToggleCalculation(folder.id)}
                            disabled={folder.coins.length === 0}
                          >
                            {folder.isActive ? (
                              <><Pause className="h-4 w-4 mr-1" /> Durdur</>
                            ) : (
                              <><Play className="h-4 w-4 mr-1" /> Başlat</>
                            )}
                          </Button>
                          
                          <div className="text-sm">
                            <span className="font-medium">{folder.name}</span>
                            <span className="text-muted-foreground ml-2">
                              Pencere: {folder.windowSize} | Interval: {folder.interval}s
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Coin Ekle Dialog */}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Plus className="h-4 w-4 mr-1" />
                                Coin Ekle
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
                                <ScrollArea className="h-40 border rounded-md">
                                  <div className="space-y-1 p-2">
                                    {filteredCoins.slice(0, 20).map(coin => (
                                      <button
                                        key={coin.symbol}
                                        onClick={() => setSelectedCoin(coin.symbol)}
                                        className={cn(
                                          "w-full flex items-center justify-between p-2 rounded hover:bg-secondary text-left",
                                          selectedCoin === coin.symbol && "bg-primary/10"
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
                                <Button
                                  className="w-full"
                                  onClick={() => handleAddCoin(folder.id)}
                                  disabled={!selectedCoin}
                                >
                                  {selectedCoin || 'Coin'} Ekle
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>

                          {/* Sonuçları Görüntüle */}
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={() => handleShowResults(folder.id)}
                            disabled={folder.coins.length === 0}
                          >
                            <BarChart3 className="h-4 w-4 mr-1" />
                            Sonuçlar
                          </Button>

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

                      {/* Coin Listesi */}
                      {folder.coins.length > 0 ? (
                        <div className="bg-card rounded-lg border overflow-hidden">
                          {/* Başlıklar */}
                          <div className="grid grid-cols-7 gap-2 px-3 py-2 text-xs text-muted-foreground border-b bg-secondary/20">
                            <span className="col-span-1">Coin</span>
                            <span className="col-span-1 text-right">Fiyat</span>
                            <span className="col-span-1 text-right">Momentum</span>
                            <span className="col-span-1 text-right">Velocity</span>
                            <span className="col-span-1 text-right">R²</span>
                            <span className="col-span-1 text-center">Trend</span>
                            <span className="col-span-1 text-right">İşlem</span>
                          </div>

                          {/* Coinler */}
                          {folder.coins.map((coin) => {
                            const currentPrice = pricesRef.current[coin.symbol] || coin.prices[coin.prices.length - 1] || 0;
                            
                            return (
                              <div
                                key={coin.symbol}
                                className="grid grid-cols-7 gap-2 px-3 py-2 text-sm hover:bg-secondary/30 items-center border-b last:border-b-0"
                              >
                                <button
                                  className="col-span-1 font-medium text-left hover:text-primary"
                                  onClick={() => {
                                    onSelectCoin(coin.symbol);
                                    setIsOpen(false);
                                  }}
                                >
                                  {coin.symbol}
                                </button>
                                <span className="col-span-1 text-right font-mono">
                                  ${formatPrice(currentPrice)}
                                </span>
                                <span className={cn(
                                  "col-span-1 text-right font-mono",
                                  coin.momentum > 0 ? 'text-green-600' : coin.momentum < 0 ? 'text-red-600' : 'text-gray-500'
                                )}>
                                  {formatNumber(coin.momentum)}
                                </span>
                                <span className={cn(
                                  "col-span-1 text-right font-mono",
                                  coin.velocity > 0 ? 'text-green-600' : coin.velocity < 0 ? 'text-red-600' : 'text-gray-500'
                                )}>
                                  {formatNumber(coin.velocity)}
                                </span>
                                <span className="col-span-1 text-right font-mono text-muted-foreground">
                                  {(coin.rSquared * 100).toFixed(1)}%
                                </span>
                                <div className="col-span-1 flex justify-center">
                                  <Badge variant="outline" className={cn("text-xs", getTrendColor(getTrendState(coin.momentum, coin.rSquared)))}>
                                    {getTrendText(getTrendState(coin.momentum, coin.rSquared))}
                                  </Badge>
                                </div>
                                <div className="col-span-1 text-right">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 hover:bg-destructive/20 hover:text-destructive"
                                    onClick={() => removeCoinFromFolder(folder.id, coin.symbol)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>Henüz coin eklenmemiş</p>
                          <p className="text-sm">"Coin Ekle" butonundan coin ekleyin</p>
                        </div>
                      )}

                      {/* Formül Bilgisi */}
                      <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                        <p className="font-medium mb-1">Formül:</p>
                        <code className="block bg-background p-2 rounded">
                          m = [N·Σ(t·P) - Σt·ΣP] / [N·Σ(t²) - (Σt)²]
                        </code>
                        <p className="mt-2">
                          N = {folder.windowSize} (pencere) | Interval = {folder.interval}s
                        </p>
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Sonuçlar Dialog */}
      <Dialog open={isResultsOpen} onOpenChange={setIsResultsOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              Momentum Sonuçları - {folders.find(f => f.id === selectedFolderId)?.name}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="h-[50vh]">
            {currentResults.length > 0 ? (
              <div className="space-y-2">
                {/* Sıralama başlığı */}
                <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
                  <span>Momentum'a göre sıralanmıştır (En yüksekten en düşüğe)</span>
                  <span>Toplam: {currentResults.length} coin</span>
                </div>

                {/* Sonuç kartları */}
                {currentResults.map((result, index) => (
                  <div
                    key={result.symbol}
                    className="flex items-center justify-between p-3 bg-card border rounded-lg hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground font-mono w-6">#{index + 1}</span>
                      <div>
                        <div className="font-medium">{result.symbol}</div>
                        <div className="text-xs text-muted-foreground">
                          ${formatPrice(result.currentPrice)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Momentum</div>
                        <div className={cn(
                          "font-mono font-medium",
                          result.momentum > 0 ? 'text-green-600' : result.momentum < 0 ? 'text-red-600' : 'text-gray-500'
                        )}>
                          {result.momentum > 0 ? '+' : ''}{formatNumber(result.momentum)}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Velocity</div>
                        <div className={cn(
                          "font-mono",
                          result.velocity > 0 ? 'text-green-600' : result.velocity < 0 ? 'text-red-600' : 'text-gray-500'
                        )}>
                          {formatNumber(result.velocity)}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Güven (R²)</div>
                        <div className="font-mono">{(result.rSquared * 100).toFixed(1)}%</div>
                      </div>

                      <Badge className={cn("gap-1", getTrendColor(result.trend))}>
                        <TrendIcon trend={result.trend} />
                        {getTrendText(result.trend)}
                      </Badge>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          onSelectCoin(result.symbol);
                          setIsResultsOpen(false);
                          setIsOpen(false);
                        }}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Henüz hesaplama yapılmamış</p>
                <p className="text-sm">Hesaplamayı başlatın ve veri toplaması için bekleyin</p>
              </div>
            )}
          </ScrollArea>

          {/* Özet İstatistikler */}
          {currentResults.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t">
              <div className="bg-green-50 p-2 rounded text-center">
                <div className="text-xs text-green-700">Yükseliş</div>
                <div className="font-bold text-green-800">
                  {currentResults.filter(r => r.momentum > 0.001).length}
                </div>
              </div>
              <div className="bg-red-50 p-2 rounded text-center">
                <div className="text-xs text-red-700">Düşüş</div>
                <div className="font-bold text-red-800">
                  {currentResults.filter(r => r.momentum < -0.001).length}
                </div>
              </div>
              <div className="bg-blue-50 p-2 rounded text-center">
                <div className="text-xs text-blue-700">En Güçlü</div>
                <div className="font-bold text-blue-800 text-xs truncate">
                  {currentResults[0]?.symbol || '-'}
                </div>
              </div>
              <div className="bg-purple-50 p-2 rounded text-center">
                <div className="text-xs text-purple-700">Ort. R²</div>
                <div className="font-bold text-purple-800">
                  {(currentResults.reduce((a, b) => a + b.rSquared, 0) / currentResults.length * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// Trend yardımcı fonksiyonları
function getTrendState(momentum: number, rSquared: number): MomentumResult['trend'] {
  const threshold = 0.001;
  const strongThreshold = 0.005;
  
  if (rSquared < 0.3) return 'FLAT';
  if (momentum > strongThreshold) return 'STRONG_UP';
  if (momentum > threshold) return 'UP';
  if (momentum < -strongThreshold) return 'STRONG_DOWN';
  if (momentum < -threshold) return 'DOWN';
  return 'FLAT';
}
