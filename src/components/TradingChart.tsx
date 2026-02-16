import { useEffect, useRef, useState, useCallback, memo } from 'react';
import { createChart, type IChartApi, type ISeriesApi, type CandlestickData, type HistogramData, type LineData, type Time, type MouseEventParams } from 'lightweight-charts';
import { useBinanceKlines, exportKlinesToCSV, exportKlinesToJSON } from '@/hooks/useBinance';
import { X, Maximize2, Minimize2, Activity, Download, FileSpreadsheet, FileJson, TrendingUp, TrendingDown, Target, MousePointerClick, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface TradingChartProps {
  symbol: string;
  id: string;
  interval?: string;
  onIntervalChange?: (interval: string) => void;
  onRemove?: (id: string) => void;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  onPriceSelect?: (price: number, type: 'limit' | 'stop_loss' | 'take_profit') => void;
  onQuickTrade?: (side: 'buy' | 'sell', amount: number) => void;
}

interface ChartOrder {
  id: string;
  price: number;
  type: 'limit_buy' | 'limit_sell' | 'stop_loss' | 'take_profit';
  amount?: number;
}

const intervals = [
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '30m', label: '30m' },
  { value: '1h', label: '1h' },
  { value: '4h', label: '4h' },
  { value: '1d', label: '1D' },
  { value: '1w', label: '1W' },
];

// Technical indicators
function calculateSMA(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j];
      }
      result.push(sum / period);
    }
  }
  return result;
}

function calculateEMA(data: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push(data[i]);
    } else {
      const ema = (data[i] - result[i - 1]) * multiplier + result[i - 1];
      result.push(ema);
    }
  }
  return result;
}

function calculateRSI(data: number[], period: number = 14): number[] {
  const result: number[] = [];
  let gains = 0;
  let losses = 0;

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push(50);
      continue;
    }

    const change = data[i] - data[i - 1];
    if (change > 0) gains += change;
    else losses -= change;

    if (i >= period) {
      const avgGain = gains / period;
      const avgLoss = losses / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));
      result.push(rsi);

      const oldChange = data[i - period + 1] - data[i - period];
      if (oldChange > 0) gains -= oldChange;
      else losses += oldChange;
    } else {
      result.push(50);
    }
  }
  return result;
}

function calculateBollingerBands(data: number[], period: number = 20, stdDev: number = 2) {
  const sma = calculateSMA(data, period);
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upper.push(NaN);
      lower.push(NaN);
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += Math.pow(data[i - j] - sma[i], 2);
      }
      const standardDeviation = Math.sqrt(sum / period);
      upper.push(sma[i] + stdDev * standardDeviation);
      lower.push(sma[i] - stdDev * standardDeviation);
    }
  }

  return { upper, middle: sma, lower };
}

function TradingChartInner({
  symbol,
  id,
  interval: externalInterval,
  onIntervalChange,
  onRemove,
  isMaximized,
  onToggleMaximize,
  onPriceSelect,
  onQuickTrade
}: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const smaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const emaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbUpperRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbLowerRef = useRef<ISeriesApi<'Line'> | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const orderLinesRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());

  const [internalInterval, setInternalInterval] = useState(externalInterval || '1h');
  const interval = externalInterval || internalInterval;
  const [crosshairPrice, setCrosshairPrice] = useState<number | null>(null);
  const [chartOrder, setChartOrder] = useState<ChartOrder | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null);

  // externalInterval değiştiğinde internal state'i güncelle
  useEffect(() => {
    if (externalInterval && externalInterval !== internalInterval) {
      setInternalInterval(externalInterval);
    }
  }, [externalInterval]);

  const handleIntervalChange = useCallback((newInterval: string) => {
    setInternalInterval(newInterval);
    onIntervalChange?.(newInterval);
  }, [onIntervalChange]);

  const [indicators, setIndicators] = useState({
    sma: false,
    ema: false,
    bollinger: false,
    rsi: false,
  });
  const { klines, loading } = useBinanceKlines(symbol, interval);

  // Export data handlers
  const handleExportCSV = () => {
    if (klines.length === 0) return;
    const csvContent = exportKlinesToCSV(klines, symbol, interval);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${symbol}_${interval}_data.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleExportJSON = () => {
    if (klines.length === 0) return;
    const jsonContent = exportKlinesToJSON(klines, symbol, interval);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${symbol}_${interval}_data.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // Chart order management - only 1 order per coin
  const addOrderLine = useCallback((order: ChartOrder) => {
    if (!chartRef.current) return;

    // Remove existing line first (only 1 order per coin)
    orderLinesRef.current.forEach((line) => {
      chartRef.current?.removeSeries(line);
    });
    orderLinesRef.current.clear();

    const lineSeries = chartRef.current.addLineSeries({
      color: order.type === 'limit_buy' ? '#22c55e' :
        order.type === 'limit_sell' ? '#ef4444' :
          order.type === 'stop_loss' ? '#dc2626' : '#16a34a',
      lineWidth: 2,
      lineStyle: 2, // Dashed
      lastValueVisible: true,
      title: order.type.replace('_', ' ').toUpperCase(),
    });

    const timeRange = chartRef.current.timeScale().getVisibleLogicalRange();
    if (timeRange) {
      const from = Math.floor(timeRange.from);
      const to = Math.ceil(timeRange.to);

      lineSeries.setData([
        { time: from as Time, value: order.price },
        { time: to as Time, value: order.price },
      ]);
    }

    orderLinesRef.current.set(order.id, lineSeries);
  }, []);

  const removeOrderLine = useCallback(() => {
    orderLinesRef.current.forEach((line) => {
      chartRef.current?.removeSeries(line);
    });
    orderLinesRef.current.clear();
    setChartOrder(null);
  }, []);

  // Quick trade handlers
  const handleQuickBuy = (amount: number) => {
    onQuickTrade?.('buy', amount);
    toast.success(`Quick Buy: $${amount} worth of ${symbol}`);
  };

  const handleQuickSell = (amount: number) => {
    onQuickTrade?.('sell', amount);
    toast.success(`Quick Sell: $${amount} worth of ${symbol}`);
  };

  // Context menu handlers
  const handleContextMenuAction = (action: 'buy' | 'sell' | 'sl' | 'tp') => {
    if (!selectedPrice) return;

    const type = action === 'buy' ? 'limit' :
      action === 'sell' ? 'limit' :
        action === 'sl' ? 'stop_loss' : 'take_profit';

    onPriceSelect?.(selectedPrice, type);

    // Add visual line on chart
    const orderType = action === 'buy' ? 'limit_buy' :
      action === 'sell' ? 'limit_sell' :
        action === 'sl' ? 'stop_loss' : 'take_profit';

    const newOrder: ChartOrder = {
      id: `${orderType}_${Date.now()}`,
      price: selectedPrice,
      type: orderType,
    };

    // Replace old order with new one (only 1 order per coin)
    setChartOrder(newOrder);
    addOrderLine(newOrder);

    toast.success(`${action.toUpperCase()} order set at $${selectedPrice.toFixed(2)}`);
    setShowContextMenu(false);
  };

  // Keep a ref for indicators so ResizeObserver can read without re-creating chart
  const indicatorsRef = useRef(indicators);
  indicatorsRef.current = indicators;

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Main chart — created ONCE, never destroyed on indicator toggle
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: 'rgba(255, 255, 255, 0.2)',
          style: 2,
        },
        horzLine: {
          color: 'rgba(255, 255, 255, 0.2)',
          style: 2,
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: true,
      },
      handleScroll: {
        vertTouchDrag: false,
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: {
          time: true,
          price: true,
        },
        mouseWheel: true,
        pinch: true,
      },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    const volumeSeries = chart.addHistogramSeries({
      color: '#22c55e',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.85,
        bottom: 0,
      },
    });

    // Indicator series
    const smaSeries = chart.addLineSeries({
      color: '#3b82f6',
      lineWidth: 2,
      title: 'SMA 20',
    });

    const emaSeries = chart.addLineSeries({
      color: '#f59e0b',
      lineWidth: 2,
      title: 'EMA 12',
    });

    const bbUpper = chart.addLineSeries({
      color: 'rgba(139, 92, 246, 0.5)',
      lineWidth: 1,
      title: 'BB Upper',
    });

    const bbLower = chart.addLineSeries({
      color: 'rgba(139, 92, 246, 0.5)',
      lineWidth: 1,
      title: 'BB Lower',
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;
    volumeSeriesRef.current = volumeSeries;
    smaSeriesRef.current = smaSeries;
    emaSeriesRef.current = emaSeries;
    bbUpperRef.current = bbUpper;
    bbLowerRef.current = bbLower;

    // Hide indicator series initially
    smaSeries.applyOptions({ visible: false });
    emaSeries.applyOptions({ visible: false });
    bbUpper.applyOptions({ visible: false });
    bbLower.applyOptions({ visible: false });

    // Crosshair move handler — throttled to avoid excessive state updates
    let lastCrosshairUpdate = 0;
    chart.subscribeCrosshairMove((param: MouseEventParams) => {
      const now = Date.now();
      if (now - lastCrosshairUpdate < 50) return; // Max 20fps for crosshair
      lastCrosshairUpdate = now;
      if (param.point && param.point.y !== undefined) {
        const price = candlestickSeries.coordinateToPrice(param.point.y);
        if (price !== null) {
          setCrosshairPrice(price);
        }
      }
    });

    // Click handler for price selection
    chart.subscribeClick((param: MouseEventParams) => {
      if (param.point && param.point.y !== undefined) {
        const price = candlestickSeries.coordinateToPrice(param.point.y);
        if (price !== null) {
          setSelectedPrice(price);
        }
      }
    });

    // Context menu handler
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      const rect = chartContainerRef.current?.getBoundingClientRect();
      if (rect) {
        const y = e.clientY - rect.top;
        const price = candlestickSeries.coordinateToPrice(y);

        if (price !== null) {
          setSelectedPrice(price);
          setContextMenuPos({ x: e.clientX, y: e.clientY });
          setShowContextMenu(true);
        }
      }
    };

    chartContainerRef.current.addEventListener('contextmenu', handleContextMenu);

    // RSI Chart
    if (rsiContainerRef.current) {
      const rsiChart = createChart(rsiContainerRef.current, {
        height: 100,
        layout: {
          background: { color: 'transparent' },
          textColor: '#9ca3af',
        },
        grid: {
          vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
          horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
        },
        rightPriceScale: {
          borderColor: 'rgba(255, 255, 255, 0.1)',
        },
        timeScale: {
          visible: false,
        },
        handleScroll: {
          vertTouchDrag: false,
          mouseWheel: true,
          pressedMouseMove: true,
        },
        handleScale: {
          axisPressedMouseMove: {
            time: true,
            price: true,
          },
          mouseWheel: true,
          pinch: true,
        },
      });

      const rsiSeries = rsiChart.addLineSeries({
        color: '#ec4899',
        lineWidth: 2,
        title: 'RSI',
      });

      rsiSeries.applyOptions({ visible: false });
      rsiChartRef.current = rsiChart;
      rsiSeriesRef.current = rsiSeries;
    }

    // ResizeObserver — uses ref to read current indicator state
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({
            width: entry.contentRect.width,
            height: indicatorsRef.current.rsi
              ? entry.contentRect.height - 120
              : entry.contentRect.height,
          });
        }
        if (entry.target === rsiContainerRef.current && rsiChartRef.current) {
          rsiChartRef.current.applyOptions({
            width: entry.contentRect.width,
          });
        }
      }
    });

    if (chartContainerRef.current) {
      resizeObserver.observe(chartContainerRef.current);
    }
    if (rsiContainerRef.current) {
      resizeObserver.observe(rsiContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      chartContainerRef.current?.removeEventListener('contextmenu', handleContextMenu);
      chart.remove();
      rsiChartRef.current?.remove();
    };
  }, []); // FIXED: Empty deps — chart created once, never destroyed on indicator toggle

  // Interval değiştiğinde fitContent uygulamak için ref
  const prevIntervalRef = useRef(interval);
  const prevKlinesRef = useRef<typeof klines>([]);
  const prevSymbolRef = useRef(symbol);

  useEffect(() => {
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current || klines.length === 0) return;

    const candleData: CandlestickData<Time>[] = klines.map(k => ({
      time: (k.openTime / 1000) as Time,
      open: parseFloat(k.open),
      high: parseFloat(k.high),
      low: parseFloat(k.low),
      close: parseFloat(k.close),
    }));

    const volumeData: HistogramData<Time>[] = klines.map(k => ({
      time: (k.openTime / 1000) as Time,
      value: parseFloat(k.volume),
      color: parseFloat(k.close) >= parseFloat(k.open) ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
    }));

    const isSymbolChanged = prevSymbolRef.current !== symbol;
    const isIntervalChanged = prevIntervalRef.current !== interval;

    if (isSymbolChanged) prevSymbolRef.current = symbol;

    if (isSymbolChanged || isIntervalChanged || prevKlinesRef.current.length === 0) {
      candlestickSeriesRef.current.setData(candleData);
      volumeSeriesRef.current.setData(volumeData);
    } else {
      const prevKlines = prevKlinesRef.current;
      const lastCandleChanged = prevKlines.length > 0 && klines.length > 0 &&
        (prevKlines[prevKlines.length - 1].openTime !== klines[klines.length - 1].openTime ||
          prevKlines[prevKlines.length - 1].close !== klines[klines.length - 1].close);

      if (lastCandleChanged && klines.length === prevKlines.length) {
        const lastCandle = candleData[candleData.length - 1];
        const lastVolume = volumeData[volumeData.length - 1];
        candlestickSeriesRef.current.update(lastCandle);
        volumeSeriesRef.current.update(lastVolume);
      } else if (klines.length > prevKlines.length) {
        const lastCandle = candleData[candleData.length - 1];
        const lastVolume = volumeData[volumeData.length - 1];
        candlestickSeriesRef.current.update(lastCandle);
        volumeSeriesRef.current.update(lastVolume);
      } else {
        candlestickSeriesRef.current.setData(candleData);
        volumeSeriesRef.current.setData(volumeData);
      }
    }

    prevKlinesRef.current = klines;

    const closes = klines.map(k => parseFloat(k.close));
    const shouldUpdateAll = isSymbolChanged || isIntervalChanged || prevKlinesRef.current.length === 0 || klines.length !== prevKlinesRef.current.length;

    if (indicators.sma && smaSeriesRef.current) {
      const smaData = calculateSMA(closes, 20);
      const smaLineData: LineData<Time>[] = klines.map((k, i) => ({
        time: (k.openTime / 1000) as Time,
        value: smaData[i],
      }));
      if (shouldUpdateAll) {
        smaSeriesRef.current.setData(smaLineData);
      } else if (smaLineData.length > 0) {
        smaSeriesRef.current.update(smaLineData[smaLineData.length - 1]);
      }
      smaSeriesRef.current.applyOptions({ visible: true });
    } else if (smaSeriesRef.current) {
      smaSeriesRef.current.applyOptions({ visible: false });
    }

    if (indicators.ema && emaSeriesRef.current) {
      const emaData = calculateEMA(closes, 12);
      const emaLineData: LineData<Time>[] = klines.map((k, i) => ({
        time: (k.openTime / 1000) as Time,
        value: emaData[i],
      }));
      if (shouldUpdateAll) {
        emaSeriesRef.current.setData(emaLineData);
      } else if (emaLineData.length > 0) {
        emaSeriesRef.current.update(emaLineData[emaLineData.length - 1]);
      }
      emaSeriesRef.current.applyOptions({ visible: true });
    } else if (emaSeriesRef.current) {
      emaSeriesRef.current.applyOptions({ visible: false });
    }

    if (indicators.bollinger && bbUpperRef.current && bbLowerRef.current) {
      const bb = calculateBollingerBands(closes, 20, 2);
      const upperData: LineData<Time>[] = klines.map((k, i) => ({
        time: (k.openTime / 1000) as Time,
        value: bb.upper[i],
      }));
      const lowerData: LineData<Time>[] = klines.map((k, i) => ({
        time: (k.openTime / 1000) as Time,
        value: bb.lower[i],
      }));
      if (shouldUpdateAll) {
        bbUpperRef.current.setData(upperData);
        bbLowerRef.current.setData(lowerData);
      } else {
        if (upperData.length > 0) bbUpperRef.current.update(upperData[upperData.length - 1]);
        if (lowerData.length > 0) bbLowerRef.current.update(lowerData[lowerData.length - 1]);
      }
      bbUpperRef.current.applyOptions({ visible: true });
      bbLowerRef.current.applyOptions({ visible: true });
    } else if (bbUpperRef.current && bbLowerRef.current) {
      bbUpperRef.current.applyOptions({ visible: false });
      bbLowerRef.current.applyOptions({ visible: false });
    }

    if (indicators.rsi && rsiSeriesRef.current && rsiChartRef.current) {
      const rsiData = calculateRSI(closes, 14);
      const rsiLineData: LineData<Time>[] = klines.map((k, i) => ({
        time: (k.openTime / 1000) as Time,
        value: rsiData[i],
      }));
      if (shouldUpdateAll) {
        rsiSeriesRef.current.setData(rsiLineData);
      } else if (rsiLineData.length > 0) {
        rsiSeriesRef.current.update(rsiLineData[rsiLineData.length - 1]);
      }
      rsiSeriesRef.current.applyOptions({ visible: true });
      rsiChartRef.current.timeScale().fitContent();
    } else if (rsiSeriesRef.current) {
      rsiSeriesRef.current.applyOptions({ visible: false });
    }

    if (prevIntervalRef.current !== interval) {
      chartRef.current?.timeScale().fitContent();
      prevIntervalRef.current = interval;
    }
  }, [klines, indicators, interval]);

  const toggleIndicator = (key: keyof typeof indicators) => {
    setIndicators(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-secondary/50 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm">{symbol}/USDT</span>
          <Select value={interval} onValueChange={handleIntervalChange}>
            <SelectTrigger className="w-16 h-7 text-xs bg-background border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {intervals.map(i => (
                <SelectItem key={i.value} value={i.value} className="text-xs">
                  {i.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Quick Trade Buttons */}
          <div className="hidden md:flex items-center gap-1 ml-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs bg-green-500/10 hover:bg-green-500/20 text-green-500 border-green-500/30"
              onClick={() => handleQuickBuy(100)}
            >
              <TrendingUp className="h-3 w-3 mr-1" />
              Buy $100
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/30"
              onClick={() => handleQuickSell(100)}
            >
              <TrendingDown className="h-3 w-3 mr-1" />
              Sell $100
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Crosshair Price Display */}
          {crosshairPrice && (
            <Badge variant="secondary" className="mr-2 font-mono">
              <MousePointerClick className="h-3 w-3 mr-1" />
              ${crosshairPrice.toFixed(2)}
            </Badge>
          )}

          {/* Export Data Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1">
                <Download className="h-4 w-4" />
                <span className="text-xs hidden sm:inline">Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Export Data ({klines.length} candles)</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportCSV} disabled={klines.length === 0}>
                <FileSpreadsheet className="h-4 w-4 mr-2 text-green-500" />
                Download as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportJSON} disabled={klines.length === 0}>
                <FileJson className="h-4 w-4 mr-2 text-blue-500" />
                Download as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Indicators Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1">
                <Activity className="h-4 w-4" />
                <span className="text-xs hidden sm:inline">Indicators</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Technical Indicators</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={indicators.sma}
                onCheckedChange={() => toggleIndicator('sma')}
              >
                <span className="w-3 h-3 rounded-full bg-blue-500 mr-2" />
                SMA (20)
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={indicators.ema}
                onCheckedChange={() => toggleIndicator('ema')}
              >
                <span className="w-3 h-3 rounded-full bg-yellow-500 mr-2" />
                EMA (12)
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={indicators.bollinger}
                onCheckedChange={() => toggleIndicator('bollinger')}
              >
                <span className="w-3 h-3 rounded-full bg-purple-500 mr-2" />
                Bollinger Bands
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={indicators.rsi}
                onCheckedChange={() => toggleIndicator('rsi')}
              >
                <span className="w-3 h-3 rounded-full bg-pink-500 mr-2" />
                RSI (14)
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onToggleMaximize}
          >
            {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-destructive/20 hover:text-destructive"
              onClick={() => onRemove(id)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Chart Order Bar - Only 1 order per coin */}
      {chartOrder && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/30 border-b border-border">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Active Order:</span>
          <Badge
            variant="outline"
            className={`text-xs cursor-pointer hover:opacity-80 ${chartOrder.type === 'limit_buy' ? 'border-green-500 text-green-500' :
                chartOrder.type === 'limit_sell' ? 'border-red-500 text-red-500' :
                  chartOrder.type === 'stop_loss' ? 'border-orange-500 text-orange-500' :
                    'border-emerald-500 text-emerald-500'
              }`}
            onClick={removeOrderLine}
          >
            {chartOrder.type.replace('_', ' ').toUpperCase()} @ ${chartOrder.price.toFixed(2)}
            <XCircle className="h-3 w-3 ml-1" />
          </Badge>
        </div>
      )}

      {/* Chart Container */}
      <div className="flex-1 flex flex-col relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}
        <div
          ref={chartContainerRef}
          className="w-full flex-1"
          style={{ height: indicators.rsi ? 'calc(100% - 100px)' : '100%' }}
        />
        {indicators.rsi && (
          <div ref={rsiContainerRef} className="h-[100px] border-t border-border" />
        )}
      </div>

      {/* Click outside to close context menu - MUST be first in DOM */}
      {showContextMenu && (
        <div
          className="fixed inset-0 z-[100]"
          onClick={(e) => {
            e.stopPropagation();
            setShowContextMenu(false);
          }}
        />
      )}

      {/* Context Menu */}
      {showContextMenu && selectedPrice && (
        <div
          className="fixed z-[110] bg-card border border-border rounded-lg shadow-lg py-1 min-w-[200px] pointer-events-auto"
          style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border bg-secondary/30 font-mono">
            Price: ${selectedPrice.toFixed(2)}
          </div>
          <div className="py-1">
            <button
              type="button"
              className="w-full px-4 py-2.5 text-sm text-left hover:bg-green-500/10 flex items-center gap-3 text-green-500 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleContextMenuAction('buy');
              }}
            >
              <TrendingUp className="h-4 w-4" />
              <span>Buy Limit @ ${selectedPrice.toFixed(2)}</span>
            </button>
            <button
              type="button"
              className="w-full px-4 py-2.5 text-sm text-left hover:bg-red-500/10 flex items-center gap-3 text-red-500 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleContextMenuAction('sell');
              }}
            >
              <TrendingDown className="h-4 w-4" />
              <span>Sell Limit @ ${selectedPrice.toFixed(2)}</span>
            </button>
          </div>
          <div className="border-t border-border" />
          <div className="py-1">
            <button
              type="button"
              className="w-full px-4 py-2.5 text-sm text-left hover:bg-orange-500/10 flex items-center gap-3 text-orange-500 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleContextMenuAction('sl');
              }}
            >
              <Target className="h-4 w-4" />
              <span>Set Stop Loss</span>
            </button>
            <button
              type="button"
              className="w-full px-4 py-2.5 text-sm text-left hover:bg-emerald-500/10 flex items-center gap-3 text-emerald-500 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleContextMenuAction('tp');
              }}
            >
              <Target className="h-4 w-4" />
              <span>Set Take Profit</span>
            </button>
          </div>
          <div className="border-t border-border" />
          <div className="py-1">
            <button
              type="button"
              className="w-full px-4 py-2 text-sm text-left hover:bg-secondary flex items-center gap-3 text-muted-foreground transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setShowContextMenu(false);
              }}
            >
              <X className="h-4 w-4" />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Memoized export — prevents re-render when parent state changes (e.g. coin list price updates)
export const TradingChart = memo(TradingChartInner, (prevProps, nextProps) => {
  return (
    prevProps.symbol === nextProps.symbol &&
    prevProps.id === nextProps.id &&
    prevProps.interval === nextProps.interval &&
    prevProps.isMaximized === nextProps.isMaximized
  );
});
