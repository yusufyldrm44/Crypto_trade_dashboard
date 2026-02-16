import { useState, useEffect, useRef, useCallback } from 'react';

export interface MomentumCoin {
  symbol: string;
  prices: number[];        // Fiyat geçmişi (FIFO buffer)
  momentum: number;        // Hesaplanan momentum değeri
  velocity: number;        // Eğim (velocity)
  rSquared: number;        // Trend gücü (0-1)
  lastUpdate: number;
  addedAt: number;
}

export interface MomentumFolder {
  id: string;
  name: string;
  coins: MomentumCoin[];
  windowSize: number;      // Hesaplama penceresi (N)
  interval: number;        // Hesaplama sıklığı (saniye)
  createdAt: number;
  isActive: boolean;       // Hesaplama aktif mi?
}

export interface MomentumResult {
  symbol: string;
  momentum: number;
  velocity: number;
  rSquared: number;
  currentPrice: number;
  trend: 'STRONG_UP' | 'UP' | 'FLAT' | 'DOWN' | 'STRONG_DOWN';
}

// Linear Regression Momentum hesaplama
export function calculateMomentum(prices: number[]): { momentum: number; velocity: number; rSquared: number } {
  const N = prices.length;
  if (N < 3) {
    return { momentum: 0, velocity: 0, rSquared: 0 };
  }

  // Zaman indeksleri (1, 2, ..., N)
  const t = Array.from({ length: N }, (_, i) => i + 1);
  
  // Toplamlar
  const S_P = prices.reduce((a, b) => a + b, 0);
  const S_T = t.reduce((a, b) => a + b, 0);
  const S_TP = t.reduce((sum, ti, i) => sum + ti * prices[i], 0);
  const S_T2 = t.reduce((sum, ti) => sum + ti * ti, 0);
  
  // Eğim (velocity/slope) hesaplama
  const numerator = N * S_TP - S_T * S_P;
  const denominator = N * S_T2 - S_T * S_T;
  
  if (denominator === 0) {
    return { momentum: 0, velocity: 0, rSquared: 0 };
  }
  
  const velocity = numerator / denominator;
  
  // R-squared hesaplama (trend gücü)
  const meanP = S_P / N;
  const meanT = S_T / N;
  
  // Regresyon doğrusu için intercept
  const intercept = meanP - velocity * meanT;
  
  let ssRes = 0;  // Residual sum of squares
  let ssTot = 0;  // Total sum of squares
  
  for (let i = 0; i < N; i++) {
    const predicted = velocity * t[i] + intercept;
    ssRes += Math.pow(prices[i] - predicted, 2);
    ssTot += Math.pow(prices[i] - meanP, 2);
  }
  
  const rSquared = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;
  
  // Normalize edilmiş momentum (fiyata göre ölçeklendirme)
  const avgPrice = S_P / N;
  const normalizedVelocity = avgPrice > 0 ? velocity / avgPrice : 0;
  
  // Momentum = Velocity * R² (güven katsayısı ile çarpma)
  const momentum = normalizedVelocity * rSquared;
  
  return { momentum, velocity: normalizedVelocity, rSquared };
}

// Trend durumunu belirle
export function getTrendState(momentum: number, rSquared: number): MomentumResult['trend'] {
  const threshold = 0.001; // %0.1
  const strongThreshold = 0.005; // %0.5
  
  // R² düşükse (trend güçsüz), FLAT olarak kabul et
  if (rSquared < 0.3) return 'FLAT';
  
  if (momentum > strongThreshold) return 'STRONG_UP';
  if (momentum > threshold) return 'UP';
  if (momentum < -strongThreshold) return 'STRONG_DOWN';
  if (momentum < -threshold) return 'DOWN';
  return 'FLAT';
}

export function useMomentum() {
  const [folders, setFolders] = useState<MomentumFolder[]>(() => {
    const saved = localStorage.getItem('momentumFolders');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [results, setResults] = useState<Record<string, MomentumResult[]>>({});
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  
  const intervalsRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const priceBuffersRef = useRef<Record<string, number[]>>({});
  const updatePricesRef = useRef<((folderId: string, prices: Record<string, number>) => void) | null>(null);

  // LocalStorage'a kaydet
  useEffect(() => {
    localStorage.setItem('momentumFolders', JSON.stringify(folders));
  }, [folders]);

  // Klasör ekle
  const addFolder = useCallback((name: string, windowSize: number, interval: number) => {
    const newFolder: MomentumFolder = {
      id: Date.now().toString(),
      name,
      coins: [],
      windowSize,
      interval,
      createdAt: Date.now(),
      isActive: false,
    };
    setFolders(prev => [...prev, newFolder]);
  }, []);

  // Klasör sil
  const removeFolder = useCallback((id: string) => {
    // Aktif interval'ı temizle
    if (intervalsRef.current[id]) {
      clearInterval(intervalsRef.current[id]);
      delete intervalsRef.current[id];
    }
    setFolders(prev => prev.filter(f => f.id !== id));
    setResults(prev => {
      const newResults = { ...prev };
      delete newResults[id];
      return newResults;
    });
  }, []);

  // Coin ekle
  const addCoinToFolder = useCallback((folderId: string, symbol: string, currentPrice: number) => {
    setFolders(prev => prev.map(f => {
      if (f.id === folderId) {
        const existing = f.coins.find(c => c.symbol === symbol);
        if (existing) return f;
        
        const now = Date.now();
        const newCoin: MomentumCoin = {
          symbol,
          prices: [currentPrice],
          momentum: 0,
          velocity: 0,
          rSquared: 0,
          lastUpdate: now,
          addedAt: now,
        };
        
        // Fiyat buffer'ını başlat
        if (!priceBuffersRef.current[symbol]) {
          priceBuffersRef.current[symbol] = [currentPrice];
        }
        
        return { ...f, coins: [...f.coins, newCoin] };
      }
      return f;
    }));
  }, []);

  // Coin sil
  const removeCoinFromFolder = useCallback((folderId: string, symbol: string) => {
    setFolders(prev => prev.map(f => {
      if (f.id === folderId) {
        return { ...f, coins: f.coins.filter(c => c.symbol !== symbol) };
      }
      return f;
    }));
    // Buffer'ı temizle
    delete priceBuffersRef.current[symbol];
  }, []);

  // Fiyat güncelle ve momentum hesapla
  const updatePrices = useCallback((folderId: string, prices: Record<string, number>) => {
    let updatedCoinsData: { symbol: string; momentum: number; velocity: number; rSquared: number; currentPrice: number }[] = [];

    setFolders(prev => {
      const folder = prev.find(f => f.id === folderId);
      if (!folder) return prev;

      return prev.map(f => {
        if (f.id === folderId) {
          const updatedCoins = f.coins.map(coin => {
            const currentPrice = prices[coin.symbol];
            if (!currentPrice) return coin;

            // Fiyat buffer'ını güncelle (FIFO)
            let buffer = priceBuffersRef.current[coin.symbol] || [];
            buffer.push(currentPrice);
            
            // Pencere boyutunu aşan eski verileri sil
            if (buffer.length > f.windowSize) {
              buffer = buffer.slice(-f.windowSize);
            }
            
            priceBuffersRef.current[coin.symbol] = buffer;

            // Momentum hesapla
            const { momentum, velocity, rSquared } = calculateMomentum(buffer);

            // Sonuçları sakla
            updatedCoinsData.push({
              symbol: coin.symbol,
              momentum,
              velocity,
              rSquared,
              currentPrice,
            });

            return {
              ...coin,
              prices: buffer,
              momentum,
              velocity,
              rSquared,
              lastUpdate: Date.now(),
            };
          });

          return { ...f, coins: updatedCoins };
        }
        return f;
      });
    });

    // Sonuçları güncelle (hesaplanan verileri kullan)
    if (updatedCoinsData.length > 0) {
      const folderResults: MomentumResult[] = updatedCoinsData.map(coin => ({
        symbol: coin.symbol,
        momentum: coin.momentum,
        velocity: coin.velocity,
        rSquared: coin.rSquared,
        currentPrice: coin.currentPrice,
        trend: getTrendState(coin.momentum, coin.rSquared),
      }));

      setResults(prev => ({ ...prev, [folderId]: folderResults }));
    }
  }, []);

  // updatePrices fonksiyonunu ref'e ata (stale closure'u önlemek için)
  useEffect(() => {
    updatePricesRef.current = updatePrices;
  }, [updatePrices]);

  // Aktif hesaplama fonksiyonu - güncel fiyatları dışarıdan alır
  const activePricesRef = useRef<Record<string, number>>({});
  
  const setActivePrices = useCallback((prices: Record<string, number>) => {
    activePricesRef.current = prices;
  }, []);

  // Hesaplamayı başlat/durdur
  const toggleCalculation = useCallback((folderId: string, prices?: Record<string, number>) => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;

    if (folder.isActive) {
      // Durdur
      if (intervalsRef.current[folderId]) {
        clearInterval(intervalsRef.current[folderId]);
        delete intervalsRef.current[folderId];
      }
      setFolders(prev => prev.map(f => 
        f.id === folderId ? { ...f, isActive: false } : f
      ));
    } else {
      // Başlat
      setActiveFolderId(folderId);
      
      // İlk hesaplama (eğer fiyat verildiyse)
      if (prices) {
        activePricesRef.current = prices;
        updatePrices(folderId, prices);
      }
      
      // Periyodik hesaplama - güncel fiyatları ref'ten al
      intervalsRef.current[folderId] = setInterval(() => {
        if (updatePricesRef.current) {
          updatePricesRef.current(folderId, activePricesRef.current);
        }
      }, folder.interval * 1000);
      
      setFolders(prev => prev.map(f => 
        f.id === folderId ? { ...f, isActive: true } : f
      ));
    }
  }, [folders, updatePrices]);

  // Tüm hesaplamaları durdur (cleanup)
  useEffect(() => {
    return () => {
      Object.values(intervalsRef.current).forEach(interval => {
        clearInterval(interval);
      });
    };
  }, []);

  const getSortedResults = useCallback((folderId: string): MomentumResult[] => {
    const folderResults = results[folderId] || [];
    return [...folderResults].sort((a, b) => b.momentum - a.momentum);
  }, [results]);

  return {
    folders,
    results,
    activeFolderId,
    addFolder,
    removeFolder,
    addCoinToFolder,
    removeCoinFromFolder,
    updatePrices,
    toggleCalculation,
    setActivePrices,
    getSortedResults,
  };
}
