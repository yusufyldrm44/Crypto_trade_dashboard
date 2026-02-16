export interface FolderCoin {
  symbol: string;
  entryPrice: number;
  amount: number;
  addedAt: number;
}

export interface Folder {
  id: string;
  name: string;
  coins: FolderCoin[];
  createdAt: number;
  color: string;
}

export interface FolderPerformance {
  totalValue: number;
  totalCost: number;
  totalPnl: number;
  totalPnlPercent: number;
  coinPerformances: {
    symbol: string;
    currentPrice: number;
    entryPrice: number;
    amount: number;
    value: number;
    pnl: number;
    pnlPercent: number;
  }[];
}
