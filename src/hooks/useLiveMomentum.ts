import { useState, useEffect, useRef, useCallback } from 'react';

export interface LiveMomentumCoin {
  symbol: string;
  prices: { price: number; timestamp: number }[];
  momentum: number;
  velocity: number;
  rSquared: number;
  currentPrice: number;
  lastUpdate: number;
}

export interface LiveMomentumFolder {
  id: string;
  name: string;
  coins: LiveMomentumCoin[];
  timeWindow: number;
  createdAt: number;
}

export interface LiveMomentumResult {
  symbol: string;
  momentum: number;
  velocity: number;
  rSquared: number;
  currentPrice: number;
  dataPointCount: number;
  trend: 'STRONG_UP' | 'UP' | 'FLAT' | 'DOWN' | 'STRONG_DOWN';
}

// Persisted folder structure (no price history)
interface PersistedFolder {
  id: string;
  name: string;
  coinSymbols: string[];
  timeWindow: number;
  createdAt: number;
}

// Linear Regression Momentum hesaplama
export function calculateLinearRegressionMomentum(
  priceData: { price: number; timestamp: number }[]
): { momentum: number; velocity: number; rSquared: number } {
  const N = priceData.length;
  if (N < 3) {
    return { momentum: 0, velocity: 0, rSquared: 0 };
  }

  const t = Array.from({ length: N }, (_, i) => i + 1);
  const prices = priceData.map(d => d.price);

  const S_P = prices.reduce((a, b) => a + b, 0);
  const S_T = t.reduce((a, b) => a + b, 0);
  const S_TP = t.reduce((sum, ti, i) => sum + ti * prices[i], 0);
  const S_T2 = t.reduce((sum, ti) => sum + ti * ti, 0);

  const numerator = N * S_TP - S_T * S_P;
  const denominator = N * S_T2 - S_T * S_T;

  if (denominator === 0) {
    return { momentum: 0, velocity: 0, rSquared: 0 };
  }

  const slope = numerator / denominator;

  const meanP = S_P / N;
  const intercept = meanP - slope * (S_T / N);

  let ssRes = 0;
  let ssTot = 0;

  for (let i = 0; i < N; i++) {
    const predicted = slope * t[i] + intercept;
    ssRes += Math.pow(prices[i] - predicted, 2);
    ssTot += Math.pow(prices[i] - meanP, 2);
  }

  const rSquared = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;

  const avgPrice = S_P / N;
  const normalizedVelocity = avgPrice > 0 ? slope / avgPrice : 0;

  const momentum = normalizedVelocity * rSquared;

  return { momentum, velocity: normalizedVelocity, rSquared };
}

// Trend durumunu belirle
export function getTrendState(momentum: number, rSquared: number): LiveMomentumResult['trend'] {
  const threshold = 0.0001;
  const strongThreshold = 0.001;

  if (rSquared < 0.2) return 'FLAT';

  if (momentum > strongThreshold) return 'STRONG_UP';
  if (momentum > threshold) return 'UP';
  if (momentum < -strongThreshold) return 'STRONG_DOWN';
  if (momentum < -threshold) return 'DOWN';
  return 'FLAT';
}

// Load only folder structure from localStorage (no price history)
function loadFoldersFromStorage(): LiveMomentumFolder[] {
  try {
    const saved = localStorage.getItem('liveMomentumFolders_v2');
    if (!saved) {
      // Try migrating from old format
      const oldSaved = localStorage.getItem('liveMomentumFolders');
      if (oldSaved) {
        const oldFolders: LiveMomentumFolder[] = JSON.parse(oldSaved);
        // Migrate: keep structure, discard price history
        const migrated = oldFolders.map(f => ({
          ...f,
          coins: f.coins.map(c => ({
            ...c,
            prices: [],
            momentum: 0,
            velocity: 0,
            rSquared: 0,
          })),
        }));
        localStorage.removeItem('liveMomentumFolders');
        return migrated;
      }
      return [];
    }
    const persisted: PersistedFolder[] = JSON.parse(saved);
    return persisted.map(pf => ({
      id: pf.id,
      name: pf.name,
      timeWindow: pf.timeWindow,
      createdAt: pf.createdAt,
      coins: pf.coinSymbols.map(symbol => ({
        symbol,
        prices: [],
        momentum: 0,
        velocity: 0,
        rSquared: 0,
        currentPrice: 0,
        lastUpdate: 0,
      })),
    }));
  } catch {
    return [];
  }
}

// Save only folder structure to localStorage (no price history)
function saveFoldersToStorage(folders: LiveMomentumFolder[]) {
  const persisted: PersistedFolder[] = folders.map(f => ({
    id: f.id,
    name: f.name,
    coinSymbols: f.coins.map(c => c.symbol),
    timeWindow: f.timeWindow,
    createdAt: f.createdAt,
  }));
  localStorage.setItem('liveMomentumFolders_v2', JSON.stringify(persisted));
}

export function useLiveMomentum() {
  const [folders, setFolders] = useState<LiveMomentumFolder[]>(loadFoldersFromStorage);

  // Ref to avoid stale closures and prevent infinite loops
  const foldersRef = useRef(folders);
  foldersRef.current = folders;

  // Debounced localStorage save (only structure, not price data)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveFoldersToStorage(folders);
    }, 2000);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [folders]);

  // Klasör ekle
  const addFolder = useCallback((name: string, timeWindow: number) => {
    const newFolder: LiveMomentumFolder = {
      id: Date.now().toString(),
      name,
      coins: [],
      timeWindow,
      createdAt: Date.now(),
    };
    setFolders(prev => [...prev, newFolder]);
  }, []);

  // Klasör sil
  const removeFolder = useCallback((id: string) => {
    setFolders(prev => prev.filter(f => f.id !== id));
  }, []);

  // Coin ekle
  const addCoinToFolder = useCallback((folderId: string, symbol: string, currentPrice: number) => {
    const now = Date.now();

    setFolders(prev => prev.map(f => {
      if (f.id === folderId) {
        const existing = f.coins.find(c => c.symbol === symbol);
        if (existing) return f;

        const newCoin: LiveMomentumCoin = {
          symbol,
          prices: [{ price: currentPrice, timestamp: now }],
          momentum: 0,
          velocity: 0,
          rSquared: 0,
          currentPrice,
          lastUpdate: now,
        };

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
  }, []);

  // Tüm coinlerin fiyatlarını güncelle ve momentum hesapla
  // CRITICAL FIX: No dependency on `folders` — uses functional setFolders to avoid infinite loops
  const updateAllPrices = useCallback((folderId: string, prices: Record<string, number>) => {
    const now = Date.now();

    setFolders(prev => {
      const folder = prev.find(f => f.id === folderId);
      if (!folder || folder.coins.length === 0) return prev;

      // Check if any coin actually has a price update
      const hasRelevantPrices = folder.coins.some(c => prices[c.symbol] !== undefined);
      if (!hasRelevantPrices) return prev;

      return prev.map(f => {
        if (f.id !== folderId) return f;

        const updatedCoins = f.coins.map(coin => {
          const currentPrice = prices[coin.symbol];
          if (currentPrice === undefined || currentPrice === 0) return coin;

          // Skip update if price hasn't changed
          if (coin.currentPrice === currentPrice && coin.prices.length > 0) {
            return coin;
          }

          // Add new price data point
          const newPriceData = { price: currentPrice, timestamp: now };
          const cutoffTime = now - (f.timeWindow * 1000);
          const updatedPrices = [...coin.prices, newPriceData].filter(p => p.timestamp >= cutoffTime);

          // Calculate momentum
          const { momentum, velocity, rSquared } = calculateLinearRegressionMomentum(updatedPrices);

          return {
            ...coin,
            prices: updatedPrices,
            momentum,
            velocity,
            rSquared,
            currentPrice,
            lastUpdate: now,
          };
        });

        return { ...f, coins: updatedCoins };
      });
    });
  }, []); // No dependencies — stable reference, prevents infinite loops

  // Belirli klasörün coinlerini al
  const getFolderCoins = useCallback((folderId: string): LiveMomentumCoin[] => {
    const folder = foldersRef.current.find(f => f.id === folderId);
    return folder?.coins || [];
  }, []);

  return {
    folders,
    addFolder,
    removeFolder,
    addCoinToFolder,
    removeCoinFromFolder,
    updateAllPrices,
    getFolderCoins,
  };
}
