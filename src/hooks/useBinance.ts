import { useState, useEffect, useRef, useCallback } from 'react';
import type { Coin, TickerData, BinanceKline, OrderBookEntry, Trade, PriceChangePeriod } from '@/types';

const BINANCE_API_URL = 'https://api.binance.com';
const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws';

// ─── Shared Price Cache ────────────────────────────────────────────────
// Single source of truth for latest prices — avoids duplicate WebSocket connections.
// useBinancePrice reads from here instead of opening its own WebSocket.
const sharedPriceCache: Record<string, number> = {};
const priceListeners = new Set<(prices: Record<string, number>) => void>();

function getSharedPrice(symbol: string): number {
  return sharedPriceCache[symbol] || 0;
}

function notifyPriceListeners() {
  priceListeners.forEach(fn => fn(sharedPriceCache));
}

// ─── Helpers ───────────────────────────────────────────────────────────

const getIntervalForPeriod = (period: PriceChangePeriod): string => {
  switch (period) {
    case '5m': return '1m';
    case '15m': return '5m';
    case '30m': return '5m';
    case '1h': return '15m';
    case '4h': return '1h';
    case '24h': return '4h';
    default: return '1h';
  }
};

const getLimitForPeriod = (period: PriceChangePeriod): number => {
  switch (period) {
    case '5m': return 5;
    case '15m': return 3;
    case '30m': return 6;
    case '1h': return 4;
    case '4h': return 4;
    case '24h': return 6;
    default: return 4;
  }
};

async function fetchPriceChangeForPeriod(symbol: string, period: PriceChangePeriod): Promise<number> {
  try {
    const interval = getIntervalForPeriod(period);
    const limit = getLimitForPeriod(period);
    const response = await fetch(
      `${BINANCE_API_URL}/api/v3/klines?symbol=${symbol}USDT&interval=${interval}&limit=${limit}`
    );
    if (!response.ok) return 0;
    const data = await response.json();
    if (!Array.isArray(data) || data.length < 2) return 0;
    const openPrice = parseFloat(data[0][1]);
    const closePrice = parseFloat(data[data.length - 1][4]);
    if (openPrice === 0) return 0;
    return ((closePrice - openPrice) / openPrice) * 100;
  } catch (err) {
    console.error('Failed to fetch price change:', err);
    return 0;
  }
}

// ─── useBinanceTickers ─────────────────────────────────────────────────
// OPTIMIZED: Buffers WebSocket messages, flushes state at most once per 1000ms

export function useBinanceTickers(period: PriceChangePeriod = '24h') {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const periodRef = useRef<PriceChangePeriod>(period);
  const pendingUpdatesRef = useRef<Map<string, any>>(new Map());
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    periodRef.current = period;
  }, [period]);

  const updatePriceChanges = useCallback(async (coinsData: Coin[]) => {
    if (periodRef.current === '24h') return coinsData;
    const updatedCoins = await Promise.all(
      coinsData.map(async (coin) => {
        const priceChangePercent = await fetchPriceChangeForPeriod(coin.symbol, periodRef.current);
        return {
          ...coin,
          priceChangePercent24h: priceChangePercent,
          priceChange24h: (coin.price * priceChangePercent) / 100,
        };
      })
    );
    return updatedCoins;
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${BINANCE_API_URL}/api/v3/ticker/24hr`);
        const data: TickerData[] = await response.json();

        let usdtPairs = data
          .filter(t => t.symbol.endsWith('USDT'))
          .map(t => ({
            symbol: t.symbol.replace('USDT', ''),
            name: t.symbol.replace('USDT', ''),
            price: parseFloat(t.lastPrice),
            priceChange24h: parseFloat(t.priceChange),
            priceChangePercent24h: parseFloat(t.priceChangePercent),
            volume24h: parseFloat(t.volume),
            high24h: parseFloat(t.highPrice),
            low24h: parseFloat(t.lowPrice),
            lastUpdate: t.closeTime,
          }))
          .sort((a, b) => b.volume24h - a.volume24h);

        // Populate shared price cache
        usdtPairs.forEach(c => { sharedPriceCache[c.symbol] = c.price; });

        usdtPairs = await updatePriceChanges(usdtPairs);

        if (!isCancelled) {
          setCoins(usdtPairs);
          setLoading(false);
          notifyPriceListeners();
        }
      } catch (err) {
        if (!isCancelled) {
          setError('Failed to fetch ticker data');
          setLoading(false);
        }
      }
    };

    fetchInitialData();

    // WebSocket — buffer messages, flush at throttled intervals
    wsRef.current = new WebSocket(`${BINANCE_WS_URL}/!ticker@arr`);

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const tickers = Array.isArray(data) ? data : data.data ? [data.data] : [];
      if (tickers.length === 0) return;

      // Buffer updates
      tickers.forEach((ticker: any) => {
        if (!ticker.s || !ticker.s.endsWith('USDT')) return;
        pendingUpdatesRef.current.set(ticker.s, ticker);
        // Always update shared price cache immediately (cheap, no React re-render)
        sharedPriceCache[ticker.s.replace('USDT', '')] = parseFloat(ticker.c);
      });

      // Throttle: flush to React state at most once per 1000ms
      if (!throttleTimerRef.current) {
        throttleTimerRef.current = setTimeout(() => {
          throttleTimerRef.current = null;
          const updates = pendingUpdatesRef.current;
          if (updates.size === 0) return;

          setCoins(prev => {
            const updatedCoins = [...prev];
            let changed = false;

            updates.forEach((ticker: any, tickerSymbol: string) => {
              const symbol = tickerSymbol.replace('USDT', '');
              const coinIndex = updatedCoins.findIndex(c => c.symbol === symbol);
              if (coinIndex === -1) return;

              const currentPeriod = periodRef.current;
              let priceChangePercent = updatedCoins[coinIndex].priceChangePercent24h;
              let priceChange = updatedCoins[coinIndex].priceChange24h;

              if (currentPeriod === '24h') {
                priceChangePercent = parseFloat(ticker.P);
                priceChange = parseFloat(ticker.p);
              }

              updatedCoins[coinIndex] = {
                ...updatedCoins[coinIndex],
                price: parseFloat(ticker.c),
                priceChange24h: priceChange,
                priceChangePercent24h: priceChangePercent,
                high24h: parseFloat(ticker.h),
                low24h: parseFloat(ticker.l),
                volume24h: parseFloat(ticker.v),
                lastUpdate: Date.now(),
              };
              changed = true;
            });

            updates.clear();
            if (!changed) return prev;
            notifyPriceListeners();
            return updatedCoins;
          });
        }, 1000);
      }
    };

    return () => {
      isCancelled = true;
      if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [period, updatePriceChanges]);

  return { coins, loading, error };
}

// ─── useBinanceKlines ──────────────────────────────────────────────────
// OPTIMIZED: Live (in-progress) candle updates throttled to 500ms

export function useBinanceKlines(symbol: string, interval: string = '1h', limit: number = 500) {
  const [klines, setKlines] = useState<BinanceKline[]>([]);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const fetchKlines = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${BINANCE_API_URL}/api/v3/klines?symbol=${symbol}USDT&interval=${interval}&limit=${limit}`
        );
        const data = await response.json();

        const formattedKlines: BinanceKline[] = data.map((k: any[]) => ({
          openTime: k[0],
          open: k[1],
          high: k[2],
          low: k[3],
          close: k[4],
          volume: k[5],
          closeTime: k[6],
          quoteVolume: k[7],
          trades: k[8],
          takerBuyBaseVolume: k[9],
          takerBuyQuoteVolume: k[10],
        }));

        if (!isCancelled) {
          setKlines(formattedKlines);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch klines:', err);
        if (!isCancelled) setLoading(false);
      }
    };

    fetchKlines();

    const wsSymbol = symbol.toLowerCase() + 'usdt';
    wsRef.current = new WebSocket(`${BINANCE_WS_URL}/${wsSymbol}@kline_${interval}`);

    let liveUpdateTimer: ReturnType<typeof setTimeout> | null = null;
    let pendingLiveCandle: BinanceKline | null = null;

    wsRef.current.onmessage = (event) => {
      if (isCancelled) return;
      const data = JSON.parse(event.data);
      if (!data.k) return;

      const k = data.k;
      const kline: BinanceKline = {
        openTime: k.t,
        open: k.o,
        high: k.h,
        low: k.l,
        close: k.c,
        volume: k.v,
        closeTime: k.T,
        quoteVolume: k.q,
        trades: k.n,
        takerBuyBaseVolume: k.V,
        takerBuyQuoteVolume: k.Q,
      };

      if (k.x) {
        // Closed candle — apply immediately
        if (liveUpdateTimer) { clearTimeout(liveUpdateTimer); liveUpdateTimer = null; }
        pendingLiveCandle = null;
        setKlines(prev => {
          const filtered = prev.filter(p => p.openTime !== kline.openTime);
          return [...filtered, kline].sort((a, b) => a.openTime - b.openTime);
        });
      } else {
        // Live (in-progress) candle — throttle to 500ms
        pendingLiveCandle = kline;
        if (!liveUpdateTimer) {
          liveUpdateTimer = setTimeout(() => {
            liveUpdateTimer = null;
            if (pendingLiveCandle) {
              const candle = pendingLiveCandle;
              pendingLiveCandle = null;
              setKlines(prev => {
                const lastIdx = prev.length - 1;
                if (lastIdx >= 0 && prev[lastIdx].openTime === candle.openTime) {
                  const updated = [...prev];
                  updated[lastIdx] = candle;
                  return updated;
                }
                return [...prev, candle];
              });
            }
          }, 500);
        }
      }
    };

    return () => {
      isCancelled = true;
      if (liveUpdateTimer) clearTimeout(liveUpdateTimer);
      if (wsRef.current) wsRef.current.close();
    };
  }, [symbol, interval, limit]);

  return { klines, loading };
}

// ─── useOrderBook ──────────────────────────────────────────────────────
// OPTIMIZED: Throttled to max 1 state update per 250ms

export function useOrderBook(symbol: string, limit: number = 20) {
  const [bids, setBids] = useState<OrderBookEntry[]>([]);
  const [asks, setAsks] = useState<OrderBookEntry[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const wsSymbol = symbol.toLowerCase() + 'usdt';
    wsRef.current = new WebSocket(`${BINANCE_WS_URL}/${wsSymbol}@depth`);

    let pendingData: { b: string[][]; a: string[][] } | null = null;
    let throttleTimer: ReturnType<typeof setTimeout> | null = null;

    const processEntries = (entries: string[][]): OrderBookEntry[] => {
      let total = 0;
      return entries.slice(0, limit).map(([price, amount]) => {
        const amt = parseFloat(amount);
        total += amt * parseFloat(price);
        return { price: parseFloat(price), amount: amt, total };
      });
    };

    const flush = () => {
      throttleTimer = null;
      if (!pendingData) return;
      const data = pendingData;
      pendingData = null;
      setBids(processEntries(data.b));
      setAsks(processEntries(data.a).reverse());
    };

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (!data.b || !data.a) return;
      pendingData = data;
      if (!throttleTimer) {
        throttleTimer = setTimeout(flush, 250);
      }
    };

    return () => {
      if (throttleTimer) clearTimeout(throttleTimer);
      if (wsRef.current) wsRef.current.close();
    };
  }, [symbol, limit]);

  return { bids, asks };
}

// ─── useRecentTrades ───────────────────────────────────────────────────
// OPTIMIZED: Batches trades and flushes at 250ms intervals

export function useRecentTrades(symbol: string) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const wsSymbol = symbol.toLowerCase() + 'usdt';
    wsRef.current = new WebSocket(`${BINANCE_WS_URL}/${wsSymbol}@trade`);

    let pendingTrades: Trade[] = [];
    let throttleTimer: ReturnType<typeof setTimeout> | null = null;

    const flush = () => {
      throttleTimer = null;
      if (pendingTrades.length === 0) return;
      const batch = pendingTrades;
      pendingTrades = [];
      setTrades(prev => [...batch, ...prev].slice(0, 50));
    };

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const newTrade: Trade = {
        id: data.t?.toString() || Date.now().toString(),
        symbol: data.s?.replace('USDT', '') || symbol,
        price: parseFloat(data.p),
        amount: parseFloat(data.q),
        time: data.T || Date.now(),
        isBuyerMaker: data.m || false,
      };

      pendingTrades.push(newTrade);
      if (!throttleTimer) {
        throttleTimer = setTimeout(flush, 250);
      }
    };

    return () => {
      if (throttleTimer) clearTimeout(throttleTimer);
      if (wsRef.current) wsRef.current.close();
    };
  }, [symbol]);

  return trades;
}

// ─── useBinancePrice ───────────────────────────────────────────────────
// OPTIMIZED: Reads from the shared price cache populated by useBinanceTickers.
// NO WebSocket connection — eliminates 3+ duplicate @ticker WebSockets.

export function useBinancePrice(symbol: string) {
  const [price, setPrice] = useState<number>(() => getSharedPrice(symbol));
  const symbolRef = useRef(symbol);
  symbolRef.current = symbol;

  useEffect(() => {
    // Set initial price from cache
    const cached = getSharedPrice(symbol);
    if (cached > 0) setPrice(cached);

    // Listen for updates from the shared ticker WebSocket
    const listener = (_prices: Record<string, number>) => {
      const p = _prices[symbolRef.current];
      if (p !== undefined && p > 0) {
        setPrice(p);
      }
    };

    priceListeners.add(listener);
    return () => { priceListeners.delete(listener); };
  }, [symbol]);

  return price;
}

// Tüm kline verilerini dışa aktarma fonksiyonu
export function exportKlinesToCSV(klines: BinanceKline[], _symbol: string, _interval: string): string {
  const headers = ['Time', 'Open', 'High', 'Low', 'Close', 'Volume', 'Trades'];
  const rows = klines.map(k => [
    new Date(k.openTime).toISOString(),
    k.open,
    k.high,
    k.low,
    k.close,
    k.volume,
    k.trades,
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  return csvContent;
}

export function exportKlinesToJSON(klines: BinanceKline[], symbol: string, interval: string): string {
  const data = {
    symbol,
    interval,
    exportedAt: new Date().toISOString(),
    data: klines.map(k => ({
      time: new Date(k.openTime).toISOString(),
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
      volume: k.volume,
      trades: k.trades,
    })),
  };

  return JSON.stringify(data, null, 2);
}
