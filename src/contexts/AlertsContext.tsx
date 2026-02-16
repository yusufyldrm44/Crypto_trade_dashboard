import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import type { PriceAlert, StopLossTakeProfit, TrailingStop, PortfolioItem, TradeHistory, Notification } from '@/types/alerts';
import { toast } from 'sonner';

interface AlertsContextType {
  alerts: PriceAlert[];
  stopLossTakeProfits: StopLossTakeProfit[];
  trailingStops: TrailingStop[];
  portfolio: PortfolioItem[];
  tradeHistory: TradeHistory[];
  notifications: Notification[];
  addAlert: (alert: Omit<PriceAlert, 'id' | 'createdAt' | 'status'>) => void;
  removeAlert: (id: string) => void;
  addStopLossTakeProfit: (sltp: Omit<StopLossTakeProfit, 'id' | 'createdAt' | 'status'>) => void;
  removeStopLossTakeProfit: (id: string) => void;
  addTrailingStop: (ts: Omit<TrailingStop, 'id' | 'createdAt' | 'status' | 'currentStopPrice' | 'highestPrice'>) => void;
  removeTrailingStop: (id: string) => void;
  addToPortfolio: (item: Omit<PortfolioItem, 'totalValue' | 'unrealizedPnl' | 'unrealizedPnlPercent'>) => void;
  removeFromPortfolio: (symbol: string) => void;
  markNotificationAsRead: (id: string) => void;
  clearAllNotifications: () => void;
  checkAlerts: (symbol: string, currentPrice: number) => void;
}

const AlertsContext = createContext<AlertsContextType | null>(null);

export function AlertsProvider({ children }: { children: React.ReactNode }) {
  const [alerts, setAlerts] = useState<PriceAlert[]>(() => {
    const saved = localStorage.getItem('priceAlerts');
    return saved ? JSON.parse(saved) : [];
  });
  const [stopLossTakeProfits, setStopLossTakeProfits] = useState<StopLossTakeProfit[]>(() => {
    const saved = localStorage.getItem('stopLossTakeProfits');
    return saved ? JSON.parse(saved) : [];
  });
  const [trailingStops, setTrailingStops] = useState<TrailingStop[]>(() => {
    const saved = localStorage.getItem('trailingStops');
    return saved ? JSON.parse(saved) : [];
  });
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(() => {
    const saved = localStorage.getItem('portfolio');
    return saved ? JSON.parse(saved) : [];
  });
  const [tradeHistory] = useState<TradeHistory[]>(() => {
    const saved = localStorage.getItem('tradeHistory');
    return saved ? JSON.parse(saved) : [];
  });
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const saved = localStorage.getItem('notifications');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('priceAlerts', JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    localStorage.setItem('stopLossTakeProfits', JSON.stringify(stopLossTakeProfits));
  }, [stopLossTakeProfits]);

  useEffect(() => {
    localStorage.setItem('trailingStops', JSON.stringify(trailingStops));
  }, [trailingStops]);

  useEffect(() => {
    localStorage.setItem('portfolio', JSON.stringify(portfolio));
  }, [portfolio]);

  useEffect(() => {
    localStorage.setItem('tradeHistory', JSON.stringify(tradeHistory));
  }, [tradeHistory]);

  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
  }, [notifications]);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: Date.now(),
      read: false,
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, 100));
  }, []);

  const addAlert = useCallback((alert: Omit<PriceAlert, 'id' | 'createdAt' | 'status'>) => {
    const newAlert: PriceAlert = {
      ...alert,
      id: Date.now().toString(),
      createdAt: Date.now(),
      status: 'ACTIVE',
    };
    setAlerts(prev => [...prev, newAlert]);
    toast.success(`Price alert set for ${alert.symbol} at $${alert.targetPrice}`);
  }, []);

  const removeAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const addStopLossTakeProfit = useCallback((sltp: Omit<StopLossTakeProfit, 'id' | 'createdAt' | 'status'>) => {
    const newSltp: StopLossTakeProfit = {
      ...sltp,
      id: Date.now().toString(),
      createdAt: Date.now(),
      status: 'ACTIVE',
    };
    setStopLossTakeProfits(prev => [...prev, newSltp]);
    toast.success(`Stop Loss/Take Profit set for ${sltp.symbol}`);
  }, []);

  const removeStopLossTakeProfit = useCallback((id: string) => {
    setStopLossTakeProfits(prev => prev.filter(s => s.id !== id));
  }, []);

  const addTrailingStop = useCallback((ts: Omit<TrailingStop, 'id' | 'createdAt' | 'status' | 'currentStopPrice' | 'highestPrice'>) => {
    const newTs: TrailingStop = {
      ...ts,
      id: Date.now().toString(),
      createdAt: Date.now(),
      status: 'ACTIVE',
      currentStopPrice: ts.entryPrice * (1 - ts.trailingPercent / 100),
      highestPrice: ts.entryPrice,
    };
    setTrailingStops(prev => [...prev, newTs]);
    toast.success(`Trailing Stop set for ${ts.symbol} at ${ts.trailingPercent}%`);
  }, []);

  const removeTrailingStop = useCallback((id: string) => {
    setTrailingStops(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToPortfolio = useCallback((item: Omit<PortfolioItem, 'totalValue' | 'unrealizedPnl' | 'unrealizedPnlPercent'>) => {
    const totalValue = item.amount * item.currentPrice;
    const unrealizedPnl = (item.currentPrice - item.avgBuyPrice) * item.amount;
    const unrealizedPnlPercent = ((item.currentPrice - item.avgBuyPrice) / item.avgBuyPrice) * 100;
    
    const newItem: PortfolioItem = {
      ...item,
      totalValue,
      unrealizedPnl,
      unrealizedPnlPercent,
    };
    
    setPortfolio(prev => {
      const existing = prev.find(p => p.symbol === item.symbol);
      if (existing) {
        return prev.map(p => p.symbol === item.symbol ? newItem : p);
      }
      return [...prev, newItem];
    });
  }, []);

  const removeFromPortfolio = useCallback((symbol: string) => {
    setPortfolio(prev => prev.filter(p => p.symbol !== symbol));
  }, []);

  const markNotificationAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const checkAlerts = useCallback((symbol: string, currentPrice: number) => {
    alerts.filter(a => a.symbol === symbol && a.status === 'ACTIVE').forEach(alert => {
      const triggered = alert.type === 'ABOVE' 
        ? currentPrice >= alert.targetPrice 
        : currentPrice <= alert.targetPrice;
      
      if (triggered) {
        setAlerts(prev => prev.map(a => 
          a.id === alert.id 
            ? { ...a, status: 'TRIGGERED', triggeredAt: Date.now() } 
            : a
        ));
        
        const message = alert.type === 'ABOVE'
          ? `${symbol} reached $${currentPrice.toFixed(2)} (above target $${alert.targetPrice})`
          : `${symbol} dropped to $${currentPrice.toFixed(2)} (below target $${alert.targetPrice})`;
        
        toast.info(message, { duration: 10000 });
        addNotification({
          type: 'ALERT',
          title: 'Price Alert Triggered',
          message,
        });
      }
    });

    stopLossTakeProfits.filter(s => s.symbol === symbol && s.status === 'ACTIVE').forEach(sltp => {
      let triggered = false;
      let triggeredType: 'STOP_LOSS' | 'TAKE_PROFIT' | undefined;

      if (sltp.stopLoss && currentPrice <= sltp.stopLoss) {
        triggered = true;
        triggeredType = 'STOP_LOSS';
      } else if (sltp.takeProfit && currentPrice >= sltp.takeProfit) {
        triggered = true;
        triggeredType = 'TAKE_PROFIT';
      }

      if (triggered) {
        setStopLossTakeProfits(prev => prev.map(s => 
          s.id === sltp.id 
            ? { ...s, status: 'TRIGGERED', triggeredAt: Date.now(), triggeredType } 
            : s
        ));

        const message = triggeredType === 'STOP_LOSS'
          ? `Stop Loss triggered for ${symbol} at $${currentPrice.toFixed(2)}`
          : `Take Profit triggered for ${symbol} at $${currentPrice.toFixed(2)}`;
        
        toast.success(message, { duration: 10000 });
        addNotification({
          type: 'ORDER',
          title: `${triggeredType === 'STOP_LOSS' ? 'Stop Loss' : 'Take Profit'} Executed`,
          message,
        });
      }
    });

    trailingStops.filter(t => t.symbol === symbol && t.status === 'ACTIVE').forEach(ts => {
      if (currentPrice > ts.highestPrice) {
        const newHighestPrice = currentPrice;
        const newStopPrice = newHighestPrice * (1 - ts.trailingPercent / 100);
        
        setTrailingStops(prev => prev.map(t => 
          t.id === ts.id 
            ? { ...t, highestPrice: newHighestPrice, currentStopPrice: newStopPrice } 
            : t
        ));
      }

      if (currentPrice <= ts.currentStopPrice) {
        setTrailingStops(prev => prev.map(t => 
          t.id === ts.id 
            ? { ...t, status: 'TRIGGERED', triggeredAt: Date.now() } 
            : t
        ));

        const message = `Trailing Stop triggered for ${symbol} at $${currentPrice.toFixed(2)} (stop was $${ts.currentStopPrice.toFixed(2)})`;
        toast.warning(message, { duration: 10000 });
        addNotification({
          type: 'ORDER',
          title: 'Trailing Stop Executed',
          message,
        });
      }
    });

    setPortfolio(prev => prev.map(p => {
      if (p.symbol === symbol) {
        const totalValue = p.amount * currentPrice;
        const unrealizedPnl = (currentPrice - p.avgBuyPrice) * p.amount;
        const unrealizedPnlPercent = ((currentPrice - p.avgBuyPrice) / p.avgBuyPrice) * 100;
        return { ...p, currentPrice, totalValue, unrealizedPnl, unrealizedPnlPercent };
      }
      return p;
    }));
  }, [alerts, stopLossTakeProfits, trailingStops, addNotification]);

  return (
    <AlertsContext.Provider value={{
      alerts,
      stopLossTakeProfits,
      trailingStops,
      portfolio,
      tradeHistory,
      notifications,
      addAlert,
      removeAlert,
      addStopLossTakeProfit,
      removeStopLossTakeProfit,
      addTrailingStop,
      removeTrailingStop,
      addToPortfolio,
      removeFromPortfolio,
      markNotificationAsRead,
      clearAllNotifications,
      checkAlerts,
    }}>
      {children}
    </AlertsContext.Provider>
  );
}

export function useAlerts() {
  const context = useContext(AlertsContext);
  if (!context) {
    throw new Error('useAlerts must be used within an AlertsProvider');
  }
  return context;
}
