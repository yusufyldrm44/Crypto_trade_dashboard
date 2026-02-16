import { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from '@/components/Header';
import { CoinList } from '@/components/CoinList';
import { MultiChartManager } from '@/components/MultiChartManager';
import { OrderBook } from '@/components/OrderBook';
import { RecentTrades } from '@/components/RecentTrades';
import { AdvancedTradingPanel } from '@/components/AdvancedTradingPanel';
import { PriceAlerts } from '@/components/PriceAlerts';
import { StopLossTakeProfitPanel } from '@/components/StopLossTakeProfit';
import { TrailingStopPanel } from '@/components/TrailingStop';
import { Portfolio } from '@/components/Portfolio';
import { AlertsProvider, useAlerts } from '@/contexts/AlertsContext';
import { FolderProvider } from '@/contexts/FolderContext';
import { ScalpingProvider } from '@/contexts/ScalpingContext';
import { useBinanceTickers } from '@/hooks/useBinance';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

function AppContent() {
  const [selectedCoin, setSelectedCoin] = useState('BTC');
  const [selectedChartPrice, setSelectedChartPrice] = useState<{ price: number; type: 'limit' | 'stop_loss' | 'take_profit' } | null>(null);
  const { checkAlerts } = useAlerts();
  const { coins } = useBinanceTickers();
  const alertCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check alerts when prices change — throttled to once per 5 seconds
  useEffect(() => {
    if (alertCheckTimerRef.current) return; // Already scheduled
    alertCheckTimerRef.current = setTimeout(() => {
      alertCheckTimerRef.current = null;
      coins.forEach(coin => {
        checkAlerts(coin.symbol, coin.price);
      });
    }, 5000);
    return () => {
      if (alertCheckTimerRef.current) {
        clearTimeout(alertCheckTimerRef.current);
        alertCheckTimerRef.current = null;
      }
    };
  }, [coins, checkAlerts]);

  // Handle price selection from chart
  const handlePriceSelect = (price: number, type: 'limit' | 'stop_loss' | 'take_profit') => {
    setSelectedChartPrice({ price, type });
    toast.info(`Price $${price.toFixed(2)} selected from chart for ${type} order`);
  };

  // Handle quick trade from chart
  const handleQuickTrade = (side: 'buy' | 'sell', amount: number) => {
    toast.success(`Quick ${side.toUpperCase()} order: $${amount} worth of ${selectedCoin}`);
    // In a real app, this would execute the trade
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <Header onSelectCoin={setSelectedCoin} />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left Sidebar - Coin List */}
          <ResizablePanel defaultSize={15} minSize={12} maxSize={25} className="min-w-[200px]">
            <div className="h-full p-2">
              <CoinList onSelectCoin={setSelectedCoin} selectedCoin={selectedCoin} />
            </div>
          </ResizablePanel>

          <ResizableHandle className="w-1 bg-border hover:bg-primary/50 transition-colors" />

          {/* Center - Charts */}
          <ResizablePanel defaultSize={45} minSize={30}>
            <div className="h-full p-2">
              <MultiChartManager
                defaultSymbol={selectedCoin}
                onPriceSelect={handlePriceSelect}
                onQuickTrade={handleQuickTrade}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle className="w-1 bg-border hover:bg-primary/50 transition-colors" />

          {/* Right Sidebar */}
          <ResizablePanel defaultSize={40} minSize={30} maxSize={50}>
            <ResizablePanelGroup direction="vertical">
              {/* Trading Panel */}
              <ResizablePanel defaultSize={35} minSize={25}>
                <div className="h-full p-2">
                  <AdvancedTradingPanel
                    symbol={selectedCoin}
                    selectedChartPrice={selectedChartPrice}
                    onClearSelectedPrice={() => setSelectedChartPrice(null)}
                  />
                </div>
              </ResizablePanel>

              <ResizableHandle className="h-1 bg-border hover:bg-primary/50 transition-colors" />

              {/* Alerts & Portfolio */}
              <ResizablePanel defaultSize={35} minSize={25}>
                <ResizablePanelGroup direction="horizontal">
                  <ResizablePanel defaultSize={50}>
                    <div className="h-full p-2 overflow-auto">
                      <div className="space-y-2">
                        <PriceAlerts symbol={selectedCoin} />
                        <StopLossTakeProfitPanel symbol={selectedCoin} />
                      </div>
                    </div>
                  </ResizablePanel>

                  <ResizableHandle className="w-1 bg-border hover:bg-primary/50 transition-colors" />

                  <ResizablePanel defaultSize={50}>
                    <div className="h-full p-2 overflow-auto">
                      <div className="space-y-2">
                        <TrailingStopPanel symbol={selectedCoin} />
                        <Portfolio />
                      </div>
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              </ResizablePanel>

              <ResizableHandle className="h-1 bg-border hover:bg-primary/50 transition-colors" />

              {/* Order Book & Trades */}
              <ResizablePanel defaultSize={30} minSize={20}>
                <ResizablePanelGroup direction="horizontal">
                  <ResizablePanel defaultSize={50}>
                    <div className="h-full p-2">
                      <OrderBook symbol={selectedCoin} />
                    </div>
                  </ResizablePanel>

                  <ResizableHandle className="w-1 bg-border hover:bg-primary/50 transition-colors" />

                  <ResizablePanel defaultSize={50}>
                    <div className="h-full p-2">
                      <RecentTrades symbol={selectedCoin} />
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}

function App() {
  return (
    <AlertsProvider>
      <FolderProvider>
        <ScalpingProvider>
          <AppContent />
          <Toaster position="top-right" richColors />
        </ScalpingProvider>
      </FolderProvider>
    </AlertsProvider>
  );
}

export default App;
