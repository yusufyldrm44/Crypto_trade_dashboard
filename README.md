# ScalpTracker Pro

A real-time cryptocurrency trading dashboard that connects to the Binance API for live market data, provides advanced charting with technical indicators, and supports MetaMask wallet integration. Built with React, TypeScript, and Vite.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Architecture](#architecture)
- [License](#license)

---

## Overview

ScalpTracker Pro is a browser-based trading dashboard designed for cryptocurrency scalpers and day traders. It provides a multi-panel, fully resizable interface with live price feeds, candlestick charts, order book visualization, momentum analysis tools, and portfolio tracking -- all powered by Binance WebSocket streams.

**Note:** This application does not execute real trades on exchanges. All trading actions are simulated locally for analysis and practice purposes.

---

## Features

### Market Data
- Live price streaming for all Binance USDT trading pairs via WebSocket
- Searchable and sortable coin list with favorites and configurable time periods (5m to 24h)
- Real-time order book with bid/ask depth visualization
- Live trade stream with buy/sell side coloring

### Charting
- Interactive candlestick charts powered by TradingView Lightweight Charts
- Eight time intervals: 1m, 3m, 5m, 15m, 30m, 1h, 4h, 1d
- Technical indicators: SMA, EMA, Bollinger Bands, VWAP
- Volume histogram overlay
- Multi-chart layout with add/remove capability
- Chart data export in CSV and JSON formats
- Click-to-fill price integration with the trading panel

### Trading Tools
- Limit and market order simulation with buy/sell sides
- Stop-loss and take-profit configuration with risk/reward ratio calculation
- Trailing stop orders with percentage-based distance tracking
- Per-symbol trade history logging

### Analysis
- Block-based momentum tracker with configurable window size and intervals
- Live momentum tracker with real-time velocity, R-squared trend strength, and trend direction classification
- Scalping tracker with folder-based coin grouping and momentum sorting

### Wallet Integration
- MetaMask wallet connect/disconnect with balance display
- Multi-chain support: Ethereum, BSC, Polygon, Arbitrum, Optimism, Avalanche, Fantom
- Network switching via the wallet dropdown

### Portfolio
- Asset holdings overview with total portfolio value
- Unrealized P&L calculation per position
- Price alert system with toast notifications (above/below target triggers)

---

## Tech Stack

| Category | Technology |
|---|---|
| Framework | React 19 |
| Language | TypeScript 5.9 |
| Build Tool | Vite 7 |
| Styling | Tailwind CSS 3, shadcn/ui (Radix UI primitives) |
| Charts | TradingView Lightweight Charts |
| Data Visualization | Recharts |
| Web3 | wagmi, viem, RainbowKit |
| State Management | React Context API |
| Form Handling | React Hook Form, Zod |
| Notifications | Sonner |

---

## Project Structure

```
src/
  components/
    Header.tsx                 -- Top navigation bar with wallet and tool access
    CoinList.tsx               -- Sidebar coin browser with search and favorites
    MultiChartManager.tsx      -- Multi-chart layout manager
    TradingChart.tsx           -- Candlestick chart with indicators
    AdvancedTradingPanel.tsx   -- Buy/sell order panel
    OrderBook.tsx              -- Live order book display
    RecentTrades.tsx           -- Live trade stream
    PriceAlerts.tsx            -- Price alert configuration
    StopLossTakeProfit.tsx     -- SL/TP order setup
    TrailingStop.tsx           -- Trailing stop configuration
    Portfolio.tsx              -- Holdings and P&L overview
    MomentumTracker.tsx        -- Block-based momentum analysis
    LiveMomentumTracker.tsx    -- Real-time momentum tracking
    ScalpingTracker.tsx        -- Scalping folder organizer
    FolderPopup.tsx            -- Coin folder management
    Notifications.tsx          -- Notification center
    ui/                        -- shadcn/ui base components
  contexts/
    AlertsContext.tsx           -- Alerts and portfolio state
    FolderContext.tsx           -- Coin folder state
    ScalpingContext.tsx         -- Scalping tracker state
  hooks/
    useBinance.ts              -- Binance REST and WebSocket integration
    useWallet.ts               -- MetaMask wallet connection
    useMomentum.ts             -- Block-based momentum calculations
    useLiveMomentum.ts         -- Live momentum calculations
    use-mobile.ts              -- Responsive breakpoint detection
  lib/
    utils.ts                   -- Utility functions
  types/
    index.ts                   -- Shared type definitions
    alerts.ts                  -- Alert type definitions
    folders.ts                 -- Folder type definitions
```

---

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm, yarn, or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/yusufyldrm44/Crypto_trade_dashboard.git
cd Crypto_trade_dashboard

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at `http://localhost:5173`.

### Build

```bash
# Type check and build for production
npm run build

# Preview the production build
npm run preview
```

---

## Usage

### Panel Layout

The interface is divided into resizable panels:

```
+----------+-------------------------+--------------------------+
| Coin     |                         | Trading Panel            |
| List     |   Chart Area            +-------------+------------+
|          |   (multi-chart)         | Alerts      | Trailing   |
|          |                         | SL/TP       | Portfolio  |
|          |                         +-------------+------------+
|          |                         | Order Book  | Trades     |
+----------+-------------------------+-------------+------------+
```

- **Left panel:** Browse and search coins, toggle favorites, select active symbol
- **Center panel:** View one or more candlestick charts simultaneously
- **Right panel:** Place orders, configure alerts, monitor the order book and recent trades

### Workflow

1. Select a trading pair from the coin list on the left
2. Analyze price action on the candlestick chart with technical indicators
3. Monitor order book depth and recent trade flow
4. Set price alerts or stop-loss/take-profit levels
5. Use the momentum tracker to identify trending pairs
6. Organize coins into folders for scalping sessions

### Wallet Connection

Click the wallet button in the header to connect MetaMask. The dashboard will display your wallet balance and detected network. Use the dropdown to switch between supported chains.

---

## Architecture

### Data Flow

The application uses a shared price cache pattern to avoid duplicate WebSocket connections. A single WebSocket connection to `wss://stream.binance.com` receives ticker updates for all pairs, and individual components subscribe to the cached data through a listener pattern.

### Performance Optimizations

- **WebSocket throttling:** Incoming messages are buffered and flushed to React state at controlled intervals (250ms) to prevent excessive re-renders
- **Memoized components:** High-frequency components like OrderBook and RecentTrades use `React.memo`
- **Batched updates:** Trade and depth streams are batched before state updates

### State Management

Three React Context providers manage application-wide state:
- `AlertsContext` -- Price alerts and portfolio holdings
- `FolderContext` -- Coin grouping folders
- `ScalpingContext` -- Scalping session tracking

All user data (alerts, folders, portfolio, trade history) is persisted in `localStorage`.

---

## License

This project is provided for educational and personal use.

