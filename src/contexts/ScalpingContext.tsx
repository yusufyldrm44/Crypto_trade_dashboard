import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { toast } from 'sonner';

export interface ScalpingCoin {
  symbol: string;
  entryPrice: number;
  currentPrice: number;
  previousPrice: number;
  changeSpeed: number; // Değişim hızı (birim/saniye)
  totalChange: number; // Toplam değişim yüzdesi
  addedAt: number;
  lastUpdate: number;
}

export interface ScalpingFolder {
  id: string;
  name: string;
  coins: ScalpingCoin[];
  createdAt: number;
  timeWindow: number; // saniye cinsinden
}

export interface TradedCoin {
  symbol: string;
  entryPrice: number;
  exitPrice: number;
  amount: number;
  pnl: number;
  pnlPercent: number;
  tradeTime: number;
  folderId: string;
}

interface ScalpingContextType {
  folders: ScalpingFolder[];
  tradedCoins: TradedCoin[];
  activeFolderId: string | null;
  timeWindow: number;
  addFolder: (name: string, timeWindow: number) => void;
  removeFolder: (id: string) => void;
  addCoinToFolder: (folderId: string, symbol: string, entryPrice: number, amount: number) => void;
  removeCoinFromFolder: (folderId: string, symbol: string) => void;
  updateCoinPrices: (folderId: string, prices: Record<string, number>) => void;
  markAsTraded: (folderId: string, symbol: string, exitPrice: number) => void;
  setActiveFolderId: (id: string | null) => void;
  setTimeWindow: (seconds: number) => void;
  getSortedCoins: (folderId: string) => ScalpingCoin[];
  getFolderStats: (folderId: string) => { totalPnl: number; bestPerformer: string; worstPerformer: string } | null;
}

const ScalpingContext = createContext<ScalpingContextType | null>(null);

const TIME_WINDOWS = [
  { label: '1 Dakika', value: 60 },
  { label: '5 Dakika', value: 300 },
  { label: '15 Dakika', value: 900 },
  { label: '30 Dakika', value: 1800 },
  { label: '1 Saat', value: 3600 },
];

export function ScalpingProvider({ children }: { children: React.ReactNode }) {
  const [folders, setFolders] = useState<ScalpingFolder[]>(() => {
    const saved = localStorage.getItem('scalpingFolders');
    return saved ? JSON.parse(saved) : [];
  });
  const [tradedCoins, setTradedCoins] = useState<TradedCoin[]>(() => {
    const saved = localStorage.getItem('tradedCoins');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [timeWindow, setTimeWindow] = useState<number>(300); // Default 5 dakika
  const priceHistoryRef = useRef<Record<string, number[]>>({});

  useEffect(() => {
    localStorage.setItem('scalpingFolders', JSON.stringify(folders));
  }, [folders]);

  useEffect(() => {
    localStorage.setItem('tradedCoins', JSON.stringify(tradedCoins));
  }, [tradedCoins]);

  const addFolder = useCallback((name: string, timeWindow: number) => {
    const newFolder: ScalpingFolder = {
      id: Date.now().toString(),
      name,
      coins: [],
      createdAt: Date.now(),
      timeWindow,
    };
    setFolders(prev => [...prev, newFolder]);
    toast.success(`Klasör "${name}" oluşturuldu`);
  }, []);

  const removeFolder = useCallback((id: string) => {
    setFolders(prev => prev.filter(f => f.id !== id));
    toast.success('Klasör silindi');
  }, []);

  const addCoinToFolder = useCallback((folderId: string, symbol: string, entryPrice: number, _amount: number) => {
    setFolders(prev => prev.map(f => {
      if (f.id === folderId) {
        const existing = f.coins.find(c => c.symbol === symbol);
        if (existing) {
          toast.error(`${symbol} zbu klasörde mevcut`);
          return f;
        }
        const now = Date.now();
        const newCoin: ScalpingCoin = {
          symbol,
          entryPrice,
          currentPrice: entryPrice,
          previousPrice: entryPrice,
          changeSpeed: 0,
          totalChange: 0,
          addedAt: now,
          lastUpdate: now,
        };
        return { ...f, coins: [...f.coins, newCoin] };
      }
      return f;
    }));
    toast.success(`${symbol} klasöre eklendi`);
  }, []);

  const removeCoinFromFolder = useCallback((folderId: string, symbol: string) => {
    setFolders(prev => prev.map(f => {
      if (f.id === folderId) {
        return { ...f, coins: f.coins.filter(c => c.symbol !== symbol) };
      }
      return f;
    }));
    toast.success(`${symbol} klasörden çıkarıldı`);
  }, []);

  const updateCoinPrices = useCallback((folderId: string, prices: Record<string, number>) => {
    const now = Date.now();
    
    setFolders(prev => prev.map(f => {
      if (f.id === folderId) {
        const updatedCoins = f.coins.map(coin => {
          const currentPrice = prices[coin.symbol];
          if (!currentPrice) return coin;

          const timeDiff = (now - coin.lastUpdate) / 1000; // saniye
          const priceDiff = currentPrice - coin.previousPrice;
          const changeSpeed = timeDiff > 0 ? priceDiff / timeDiff : 0;
          const totalChange = ((currentPrice - coin.entryPrice) / coin.entryPrice) * 100;

          // Fiyat geçmişini güncelle
          if (!priceHistoryRef.current[coin.symbol]) {
            priceHistoryRef.current[coin.symbol] = [];
          }
          priceHistoryRef.current[coin.symbol].push(currentPrice);
          
          // Zaman penceresine göre eski verileri temizle
          priceHistoryRef.current[coin.symbol] = priceHistoryRef.current[coin.symbol].filter(
            (_, i, arr) => i >= arr.length - Math.min(arr.length, 100)
          );

          return {
            ...coin,
            currentPrice,
            previousPrice: coin.currentPrice,
            changeSpeed,
            totalChange,
            lastUpdate: now,
          };
        });

        return { ...f, coins: updatedCoins };
      }
      return f;
    }));
  }, []);

  const markAsTraded = useCallback((folderId: string, symbol: string, exitPrice: number) => {
    const folder = folders.find(f => f.id === folderId);
    const coin = folder?.coins.find(c => c.symbol === symbol);
    
    if (!coin) return;

    const pnl = (exitPrice - coin.entryPrice);
    const pnlPercent = ((exitPrice - coin.entryPrice) / coin.entryPrice) * 100;

    const tradedCoin: TradedCoin = {
      symbol,
      entryPrice: coin.entryPrice,
      exitPrice,
      amount: 1, // Varsayılan miktar
      pnl,
      pnlPercent,
      tradeTime: Date.now(),
      folderId,
    };

    setTradedCoins(prev => [tradedCoin, ...prev]);
    
    // Coin'i klasörden kaldır
    setFolders(prev => prev.map(f => {
      if (f.id === folderId) {
        return { ...f, coins: f.coins.filter(c => c.symbol !== symbol) };
      }
      return f;
    }));

    toast.success(`${symbol} işlem yapıldı! P&L: ${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%`);
  }, [folders]);

  const getSortedCoins = useCallback((folderId: string): ScalpingCoin[] => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return [];
    
    return [...folder.coins].sort((a, b) => b.changeSpeed - a.changeSpeed);
  }, [folders]);

  const getFolderStats = useCallback((folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder || folder.coins.length === 0) return null;

    const totalPnl = folder.coins.reduce((sum, c) => sum + c.totalChange, 0) / folder.coins.length;
    const sorted = [...folder.coins].sort((a, b) => b.totalChange - a.totalChange);
    
    return {
      totalPnl,
      bestPerformer: sorted[0]?.symbol || '-',
      worstPerformer: sorted[sorted.length - 1]?.symbol || '-',
    };
  }, [folders]);

  return (
    <ScalpingContext.Provider value={{
      folders,
      tradedCoins,
      activeFolderId,
      timeWindow,
      addFolder,
      removeFolder,
      addCoinToFolder,
      removeCoinFromFolder,
      updateCoinPrices,
      markAsTraded,
      setActiveFolderId,
      setTimeWindow,
      getSortedCoins,
      getFolderStats,
    }}>
      {children}
    </ScalpingContext.Provider>
  );
}

export function useScalping() {
  const context = useContext(ScalpingContext);
  if (!context) {
    throw new Error('useScalping must be used within a ScalpingProvider');
  }
  return context;
}

export { TIME_WINDOWS };
