import { useState, useEffect } from 'react';
import { TradingChart } from './TradingChart';
import { Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

// Basit coin listesi
const DEFAULT_COINS = [
  { symbol: 'BTC', priceChangePercent24h: 2.5 },
  { symbol: 'ETH', priceChangePercent24h: -1.2 },
  { symbol: 'BNB', priceChangePercent24h: 0.8 },
  { symbol: 'SOL', priceChangePercent24h: 5.3 },
  { symbol: 'ADA', priceChangePercent24h: -2.1 },
  { symbol: 'DOT', priceChangePercent24h: 1.5 },
  { symbol: 'MATIC', priceChangePercent24h: -0.5 },
  { symbol: 'LINK', priceChangePercent24h: 3.2 },
  { symbol: 'AVAX', priceChangePercent24h: 1.8 },
  { symbol: 'UNI', priceChangePercent24h: -0.9 },
];

interface ChartConfig {
  id: string;
  symbol: string;
  interval: string;
}

interface MultiChartManagerProps {
  defaultSymbol: string;
  onPriceSelect?: (price: number, type: 'limit' | 'stop_loss' | 'take_profit') => void;
  onQuickTrade?: (side: 'buy' | 'sell', amount: number) => void;
}

export function MultiChartManager({ defaultSymbol, onPriceSelect, onQuickTrade }: MultiChartManagerProps) {
  const [charts, setCharts] = useState<ChartConfig[]>([{ id: '1', symbol: defaultSymbol || 'BTC', interval: '1h' }]);
  const [showDialog, setShowDialog] = useState(false);
  const [search, setSearch] = useState('');



  // Add new chart when coin is selected from sidebar (if not already exists)
  useEffect(() => {
    if (!defaultSymbol) return;
    
    setCharts(prev => {
      // Eğer bu coin için zaten bir chart varsa yeni ekleme
      const exists = prev.some(chart => chart.symbol === defaultSymbol);
      if (exists) return prev;
      
      // Yeni chart ekle
      const newChart: ChartConfig = {
        id: Date.now().toString(),
        symbol: defaultSymbol,
        interval: '1h'
      };
      return [...prev, newChart];
    });
  }, [defaultSymbol]);

  const addChart = (symbol: string) => {
    const newChart = { id: Date.now().toString(), symbol, interval: '1h' };
    setCharts(prev => [...prev, newChart]);
    setShowDialog(false);
    setSearch('');
  };

  const updateChartInterval = (id: string, interval: string) => {
    setCharts(prev => prev.map(c => c.id === id ? { ...c, interval } : c));
  };

  return (
    <div className="h-full flex flex-col" style={{ position: 'relative' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-1 shrink-0">
        <span className="text-sm text-muted-foreground">
          Charts ({charts.length}): {charts.map(c => c.symbol).join(', ')}
        </span>
        
        {/* ADD CHART BUTTON */}
        <button
          onClick={() => {
            console.log('[Button] Add Chart clicked');
            setShowDialog(true);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 12px',
            fontSize: '14px',
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px',
            cursor: 'pointer',
            zIndex: 999999,
            position: 'relative',
            pointerEvents: 'auto',
          }}
          type="button"
        >
          <Plus style={{ width: '16px', height: '16px' }} />
          Add Chart
        </button>
      </div>

      {/* Charts Grid */}
      <div 
        style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
          gap: '8px',
          flex: 1,
          overflow: 'auto',
          alignContent: 'start',
        }}
      >
        {charts.map((chart, index) => (
          <div 
            key={chart.id} 
            style={{ 
              position: 'relative', 
              minHeight: '250px',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Chart overlay blocker to prevent canvas from capturing all events */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40px', zIndex: 50, pointerEvents: 'none' }} />
            
            <div style={{ flex: 1, position: 'relative' }}>
              <TradingChart 
                key={chart.id}
                symbol={chart.symbol} 
                id={chart.id} 
                interval={chart.interval} 
                onIntervalChange={(newInterval) => updateChartInterval(chart.id, newInterval)}
                isMaximized={false}
                onPriceSelect={onPriceSelect}
                onQuickTrade={onQuickTrade}
              />
            </div>
            
            {charts.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setCharts(prev => prev.filter(c => c.id !== chart.id));
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  padding: '6px',
                  background: 'rgba(239, 68, 68, 0.8)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  zIndex: 9999,
                  border: 'none',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'auto',
                }}
                type="button"
                title="Remove chart"
              >
                <X style={{ width: '14px', height: '14px' }} />
              </button>
            )}
            <div style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              padding: '4px 8px',
              background: 'rgba(0,0,0,0.6)',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 'bold',
              zIndex: 100,
              color: 'white',
              pointerEvents: 'none',
            }}>
              #{index + 1} {chart.symbol}
            </div>
          </div>
        ))}
      </div>

      {/* DIALOG */}
      {showDialog && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            zIndex: 9999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              console.log('[Dialog] Backdrop clicked, closing');
              setShowDialog(false);
              setSearch('');
            }
          }}
        >
          <div 
            style={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '400px',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Dialog Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid hsl(var(--border))',
              backgroundColor: 'hsl(var(--muted))',
            }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Add New Chart</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', opacity: 0.7 }}>
                Select a coin to add
              </p>
            </div>

            {/* Dialog Content */}
            <div style={{ padding: '20px' }}>
              <Input
                placeholder="Search coin..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ marginBottom: '12px' }}
                autoFocus
              />
              
              <ScrollArea style={{ height: '250px', border: '1px solid hsl(var(--border))', borderRadius: '6px' }}>
                <div style={{ padding: '8px' }}>
                  {(() => {
                    const available = DEFAULT_COINS
                      .filter(c => !charts.some(ch => ch.symbol === c.symbol))
                      .filter(c => search ? c.symbol.toLowerCase().includes(search.toLowerCase()) : true);
                    
                    if (available.length === 0) {
                      return (
                        <div style={{ padding: '20px', textAlign: 'center', opacity: 0.7 }}>
                          {search ? 'No coins found' : 'All coins already added'}
                        </div>
                      );
                    }
                    
                    return available.map(coin => (
                      <div
                        key={coin.symbol}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('[Coin] Clicked:', coin.symbol);
                          addChart(coin.symbol);
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px',
                          marginBottom: '4px',
                          backgroundColor: 'hsl(var(--secondary))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          userSelect: 'none',
                          pointerEvents: 'auto',
                          zIndex: 99999999,
                        }}
                      >
                        <span style={{ fontWeight: 500 }}>{coin.symbol}</span>
                        <span style={{
                          color: coin.priceChangePercent24h >= 0 ? '#22c55e' : '#ef4444',
                          fontWeight: 500,
                        }}>
                          {coin.priceChangePercent24h >= 0 ? '+' : ''}{coin.priceChangePercent24h.toFixed(2)}%
                        </span>
                      </div>
                    ));
                  })()}
                </div>
              </ScrollArea>
            </div>

            {/* Dialog Footer */}
            <div style={{
              padding: '16px 20px',
              borderTop: '1px solid hsl(var(--border))',
              backgroundColor: 'hsl(var(--muted))',
              display: 'flex',
              justifyContent: 'flex-end',
              position: 'relative',
              zIndex: 10000,
            }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setShowDialog(false);
                  setSearch('');
                }}
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  position: 'relative',
                  zIndex: 10000,
                  pointerEvents: 'auto',
                }}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
