import { useState, useEffect } from 'react';
import { useBinanceTickers } from '@/hooks/useBinance';
import { Search, Star, TrendingUp, TrendingDown, Clock, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PriceChangePeriod, Coin } from '@/types';

interface CoinListProps {
  onSelectCoin: (symbol: string) => void;
  selectedCoin: string;
}

const timePeriods: { value: PriceChangePeriod; label: string }[] = [
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '30m', label: '30m' },
  { value: '1h', label: '1h' },
  { value: '4h', label: '4h' },
  { value: '24h', label: '24h' },
];

type SortKey = 'price' | 'change';
type SortDirection = 'asc' | 'desc';

export function CoinList({ onSelectCoin, selectedCoin }: CoinListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PriceChangePeriod>('24h');
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [displayCoins, setDisplayCoins] = useState<Coin[]>([]);
  
  const { coins, loading } = useBinanceTickers(selectedPeriod);

  // Coins değiştiğinde veya sıralama değiştiğinde listeyi güncelle
  useEffect(() => {
    let result = [...coins];
    
    // Arama filtresi
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        c =>
          c.symbol.toLowerCase().includes(query) ||
          c.name.toLowerCase().includes(query)
      );
    }
    
    // Sıralama
    if (sortKey) {
      result.sort((a, b) => {
        let comparison = 0;
        if (sortKey === 'price') {
          comparison = a.price - b.price;
        } else if (sortKey === 'change') {
          comparison = a.priceChangePercent24h - b.priceChangePercent24h;
        }
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }
    
    setDisplayCoins(result);
  }, [coins, searchQuery, sortKey, sortDirection]);

  const toggleFavorite = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev =>
      prev.includes(symbol)
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol]
    );
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

  const formatVolume = (volume: number) => {
    if (volume >= 1e9) {
      return `${(volume / 1e9).toFixed(2)}B`;
    } else if (volume >= 1e6) {
      return `${(volume / 1e6).toFixed(2)}M`;
    } else if (volume >= 1e3) {
      return `${(volume / 1e3).toFixed(2)}K`;
    }
    return volume.toFixed(2);
  };

  // Sıralama fonksiyonları
  const handleSortPrice = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (sortKey === 'price') {
      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey('price');
      setSortDirection('desc');
    }
  };

  const handleSortChange = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (sortKey === 'change') {
      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey('change');
      setSortDirection('desc');
    }
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-lg border border-border overflow-hidden pointer-events-auto">
      {/* Header */}
      <div className="p-3 border-b border-border space-y-2 pointer-events-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search coin..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-background border-border"
          />
        </div>
        
        {/* Time Period Selector */}
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <Select
            value={selectedPeriod}
            onValueChange={(value) => setSelectedPeriod(value as PriceChangePeriod)}
          >
            <SelectTrigger className="h-7 text-xs bg-background border-border flex-1">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {timePeriods.map((period) => (
                <SelectItem key={period.value} value={period.value} className="text-xs">
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Column Headers - Yüksek z-index ve görünür tıklama alanı */}
      <div className="flex items-center px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border bg-secondary/30 pointer-events-auto relative z-50">
        <span className="w-6 flex-shrink-0"></span>
        <span className="flex-1">Coin</span>
        
        <button
          type="button"
          onClick={handleSortPrice}
          className="flex items-center justify-end gap-1 px-3 py-1.5 rounded hover:bg-accent hover:text-accent-foreground cursor-pointer select-none active:scale-95 transition-all bg-transparent border border-transparent hover:border-border"
        >
          <span className="text-right">Price</span>
          <span className="w-4 flex justify-center">
            {sortKey === 'price' ? (
              sortDirection === 'desc' ? (
                <ArrowDown className="h-3 w-3 text-primary" />
              ) : (
                <ArrowUp className="h-3 w-3 text-primary" />
              )
            ) : (
              <ArrowUpDown className="h-3 w-3 opacity-40" />
            )}
          </span>
        </button>
        
        <button
          type="button"
          onClick={handleSortChange}
          className="flex items-center justify-end gap-1 px-3 py-1.5 rounded hover:bg-accent hover:text-accent-foreground cursor-pointer select-none active:scale-95 transition-all bg-transparent border border-transparent hover:border-border ml-1"
        >
          <span className="text-right">{selectedPeriod}</span>
          <span className="w-4 flex justify-center">
            {sortKey === 'change' ? (
              sortDirection === 'desc' ? (
                <ArrowDown className="h-3 w-3 text-primary" />
              ) : (
                <ArrowUp className="h-3 w-3 text-primary" />
              )
            ) : (
              <ArrowUpDown className="h-3 w-3 opacity-40" />
            )}
          </span>
        </button>
      </div>
      
      {/* Debug info - test için */}
      {sortKey && (
        <div className="px-3 py-1 text-xs bg-primary/10 text-primary border-b border-border">
          Sıralama: {sortKey === 'price' ? 'Fiyat' : 'Değişim'} ({sortDirection === 'desc' ? 'Büyük→Küçük' : 'Küçük→Büyük'})
        </div>
      )}

      {/* Coin List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {displayCoins.map(coin => (
              <div
                key={coin.symbol}
                onClick={() => onSelectCoin(coin.symbol)}
                className={`flex items-center px-3 py-2.5 hover:bg-secondary/50 transition-colors cursor-pointer ${
                  selectedCoin === coin.symbol ? 'bg-primary/10' : ''
                }`}
              >
                <div
                  className="h-6 w-6 mr-2 flex items-center justify-center rounded-md hover:bg-accent"
                  onClick={e => toggleFavorite(coin.symbol, e)}
                >
                  <Star
                    className={`h-3.5 w-3.5 cursor-pointer ${
                      favorites.includes(coin.symbol)
                        ? 'fill-yellow-500 text-yellow-500'
                        : 'text-muted-foreground'
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{coin.symbol}</div>
                  <div className="text-xs text-muted-foreground">
                    Vol ${formatVolume(coin.volume24h)}
                  </div>
                </div>
                <div className="w-16 text-right mr-4">
                  <div className="font-mono text-sm">${formatPrice(coin.price)}</div>
                </div>
                <div
                  className={`w-16 text-right flex items-center justify-end gap-1 text-xs font-medium ${
                    coin.priceChangePercent24h >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}
                >
                  {coin.priceChangePercent24h >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {Math.abs(coin.priceChangePercent24h).toFixed(2)}%
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
