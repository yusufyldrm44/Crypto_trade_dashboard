// Zaman periyodu tipleri
export type PriceChangePeriod = '5m' | '15m' | '30m' | '1h' | '4h' | '24h';

export interface Coin {
  symbol: string;
  name: string;
  price: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  marketCap?: number;
  lastUpdate: number;
}

export interface ChartConfig {
  id: string;
  symbol: string;
  interval: string;
  title: string;
}

export interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
}

export interface Trade {
  id: string;
  symbol: string;
  price: number;
  amount: number;
  time: number;
  isBuyerMaker: boolean;
}

export interface TickerData {
  symbol: string;
  price: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  prevClosePrice: string;
  lastPrice: string;
  lastQty: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
}

export interface BinanceKline {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteVolume: string;
  trades: number;
  takerBuyBaseVolume: string;
  takerBuyQuoteVolume: string;
}

export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'LIMIT' | 'MARKET' | 'STOP_LOSS' | 'STOP_LOSS_LIMIT' | 'TAKE_PROFIT' | 'TAKE_PROFIT_LIMIT';

export interface Order {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  price: number;
  amount: number;
  filled: number;
  status: 'NEW' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED' | 'REJECTED' | 'EXPIRED';
  time: number;
}

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  balance: string;
}
