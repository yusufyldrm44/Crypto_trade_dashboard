import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import type { Folder, FolderCoin, FolderPerformance } from '@/types/folders';
import { toast } from 'sonner';

interface FolderContextType {
  folders: Folder[];
  addFolder: (name: string, color?: string) => void;
  removeFolder: (id: string) => void;
  updateFolder: (id: string, updates: Partial<Folder>) => void;
  addCoinToFolder: (folderId: string, coin: Omit<FolderCoin, 'addedAt'>) => void;
  removeCoinFromFolder: (folderId: string, symbol: string) => void;
  updateCoinInFolder: (folderId: string, symbol: string, updates: Partial<FolderCoin>) => void;
  getFolderPerformance: (folderId: string, prices: Record<string, number>) => FolderPerformance | null;
}

const FolderContext = createContext<FolderContextType | null>(null);

const FOLDER_COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#ef4444', // red
  '#f59e0b', // yellow
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

export function FolderProvider({ children }: { children: React.ReactNode }) {
  const [folders, setFolders] = useState<Folder[]>(() => {
    const saved = localStorage.getItem('coinFolders');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('coinFolders', JSON.stringify(folders));
  }, [folders]);

  const addFolder = useCallback((name: string, color?: string) => {
    const newFolder: Folder = {
      id: Date.now().toString(),
      name,
      coins: [],
      createdAt: Date.now(),
      color: color || FOLDER_COLORS[Math.floor(Math.random() * FOLDER_COLORS.length)],
    };
    setFolders(prev => [...prev, newFolder]);
    toast.success(`Folder "${name}" created`);
  }, []);

  const removeFolder = useCallback((id: string) => {
    setFolders(prev => prev.filter(f => f.id !== id));
    toast.success('Folder deleted');
  }, []);

  const updateFolder = useCallback((id: string, updates: Partial<Folder>) => {
    setFolders(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  }, []);

  const addCoinToFolder = useCallback((folderId: string, coin: Omit<FolderCoin, 'addedAt'>) => {
    setFolders(prev => prev.map(f => {
      if (f.id === folderId) {
        const existing = f.coins.find(c => c.symbol === coin.symbol);
        if (existing) {
          toast.error(`${coin.symbol} already exists in this folder`);
          return f;
        }
        return {
          ...f,
          coins: [...f.coins, { ...coin, addedAt: Date.now() }],
        };
      }
      return f;
    }));
    toast.success(`${coin.symbol} added to folder`);
  }, []);

  const removeCoinFromFolder = useCallback((folderId: string, symbol: string) => {
    setFolders(prev => prev.map(f => {
      if (f.id === folderId) {
        return {
          ...f,
          coins: f.coins.filter(c => c.symbol !== symbol),
        };
      }
      return f;
    }));
    toast.success(`${symbol} removed from folder`);
  }, []);

  const updateCoinInFolder = useCallback((folderId: string, symbol: string, updates: Partial<FolderCoin>) => {
    setFolders(prev => prev.map(f => {
      if (f.id === folderId) {
        return {
          ...f,
          coins: f.coins.map(c => c.symbol === symbol ? { ...c, ...updates } : c),
        };
      }
      return f;
    }));
  }, []);

  const getFolderPerformance = useCallback((folderId: string, prices: Record<string, number>): FolderPerformance | null => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder || folder.coins.length === 0) return null;

    let totalValue = 0;
    let totalCost = 0;
    const coinPerformances = [];

    for (const coin of folder.coins) {
      const currentPrice = prices[coin.symbol] || coin.entryPrice;
      const value = currentPrice * coin.amount;
      const cost = coin.entryPrice * coin.amount;
      const pnl = value - cost;
      const pnlPercent = ((currentPrice - coin.entryPrice) / coin.entryPrice) * 100;

      totalValue += value;
      totalCost += cost;

      coinPerformances.push({
        symbol: coin.symbol,
        currentPrice,
        entryPrice: coin.entryPrice,
        amount: coin.amount,
        value,
        pnl,
        pnlPercent,
      });
    }

    const totalPnl = totalValue - totalCost;
    const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

    return {
      totalValue,
      totalCost,
      totalPnl,
      totalPnlPercent,
      coinPerformances,
    };
  }, [folders]);

  return (
    <FolderContext.Provider value={{
      folders,
      addFolder,
      removeFolder,
      updateFolder,
      addCoinToFolder,
      removeCoinFromFolder,
      updateCoinInFolder,
      getFolderPerformance,
    }}>
      {children}
    </FolderContext.Provider>
  );
}

export function useFolders() {
  const context = useContext(FolderContext);
  if (!context) {
    throw new Error('useFolders must be used within a FolderProvider');
  }
  return context;
}
