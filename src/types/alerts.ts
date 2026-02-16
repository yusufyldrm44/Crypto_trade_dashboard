export interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  currentPrice: number;
  type: 'ABOVE' | 'BELOW';
  status: 'ACTIVE' | 'TRIGGERED' | 'DISABLED';
  createdAt: number;
  triggeredAt?: number;
  message?: string;
}

export interface StopLossTakeProfit {
  id: string;
  symbol: string;
  entryPrice: number;
  amount: number;
  stopLoss?: number;
  takeProfit?: number;
  status: 'ACTIVE' | 'TRIGGERED' | 'CANCELLED';
  createdAt: number;
  triggeredAt?: number;
  triggeredType?: 'STOP_LOSS' | 'TAKE_PROFIT';
}

export interface TrailingStop {
  id: string;
  symbol: string;
  entryPrice: number;
  currentStopPrice: number;
  trailingPercent: number;
  amount: number;
  highestPrice: number;
  status: 'ACTIVE' | 'TRIGGERED' | 'CANCELLED';
  createdAt: number;
  triggeredAt?: number;
}

export interface PortfolioItem {
  symbol: string;
  amount: number;
  avgBuyPrice: number;
  currentPrice: number;
  totalValue: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
}

export interface TradeHistory {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'TAKE_PROFIT' | 'TRAILING_STOP';
  price: number;
  amount: number;
  total: number;
  fee: number;
  timestamp: number;
  pnl?: number;
}

export interface Notification {
  id: string;
  type: 'ALERT' | 'ORDER' | 'PRICE' | 'SYSTEM';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}
