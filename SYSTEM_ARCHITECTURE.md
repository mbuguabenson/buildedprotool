# SmartAuto24 - Complete System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      USER INTERFACE (React)                        │
├─────────────────────────────────────────────────────────────────────┤
│  SmartAuto24Tab                                                     │
│  ├─ Market Selector (R_10, R_25, R_50, R_75, R_100)               │
│  ├─ Live Price & Digit Display                                    │
│  ├─ Power Distribution Visualization                              │
│  ├─ Bot Signal Panels (4 x Bots)                                  │
│  ├─ Trade Execution Controls                                      │
│  ├─ Statistics & Metrics                                          │
│  └─ Trade Log & Journal                                           │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                   REACT INTEGRATION LAYER                          │
├─────────────────────────────────────────────────────────────────────┤
│  useSmartAuto24 Hook                                                │
│  ├─ State: currentDigit, snapshot, signals, tickCount              │
│  ├─ Callbacks: processTick, recordTradeResult, reset               │
│  └─ Bot Management: setBotsActive, getBotState                     │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│               SMARTAUTO24 ENGINE (JavaScript)                       │
├─────────────────────────────────────────────────────────────────────┤
│  SmartAuto24Engine                                                  │
│  ├─ Coordinate all systems                                         │
│  ├─ Process ticks through pipeline                                 │
│  ├─ Generate bot signals in parallel                               │
│  ├─ Manage active bots                                             │
│  └─ Record trade results for learning                              │
└─────────────────────────────────────────────────────────────────────┘
                ↓                ↓                ↓
     ┌──────────────┬──────────────┬──────────────┬──────────────┐
     │              │              │              │              │
     ▼              ▼              ▼              ▼              ▼
┌─────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Analytics   │ │ Even/Odd Bot │ │Over/Under Bot│ │ Differs Bot  │
│  Engine     │ │              │ │              │ │              │
├─────────────┤ ├──────────────┤ ├──────────────┤ ├──────────────┤
│•addTick()   │ │•analyze()    │ │•analyze()    │ │•analyze()    │
│•analyze()   │ │•recordWin()  │ │•recordWin()  │ │•recordWin()  │
│•getDigitPwr │ │•recordLoss() │ │•recordLoss() │ │•recordLoss() │
│•getPowers() │ │•getState()   │ │•getState()   │ │•getState()   │
│•getTrends() │ │              │ │              │ │              │
└─────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
     │              │              │              │              │
     └──────────────┴──────────────┴──────────────┴──────────────┘
                        ↓
              ┌──────────────────────┐
              │ BotSignal[] Generated │
              │ (Multiple Signals)    │
              └──────────────────────┘
                        ↓
           ┌────────────────────────────┐
           │ Matches Bot (4th Strategy) │
           │ High-frequency trading     │
           └────────────────────────────┘
                        ↓
         ┌──────────────────────────────────┐
         │ Trade Execution Engine           │
         │ ├─ Martingale Multiplier        │
         │ ├─ Stake Management             │
         │ ├─ Risk Limits                  │
         │ ├─ Trade History                │
         │ └─ Profit/Loss Tracking        │
         └──────────────────────────────────┘
                        ↓
         ┌──────────────────────────────────┐
         │ Deriv WebSocket API              │
         │ ├─ Buy Contract Request          │
         │ ├─ Receive Contract Reference    │
         │ ├─ Wait for Result               │
         │ └─ Record Profit/Loss            │
         └──────────────────────────────────┘
                        ↓
         ┌──────────────────────────────────┐
         │ Trading Journal                  │
         │ ├─ Trade Log Storage             │
         │ ├─ Performance Analytics         │
         │ └─ Export Functionality          │
         └──────────────────────────────────┘
```

## Data Flow Pipeline

```
TICK SUBSCRIPTION
       │
       ▼
┌────────────────────────────────────────┐
│ Deriv WebSocket: wss://ws.derivws.com  │
│ (App ID: 106629, Real-time Digits)     │
└────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────┐
│ DerivWebSocketManager.subscribeTicks() │
│ ├─ Converts price to digit (0-9)       │
│ ├─ Handles subscription/unsubscription │
│ └─ Manages message routing             │
└────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────┐
│ SmartAuto24Engine.processTick()        │
│ ├─ Pass to CoreAnalyticsEngine         │
│ ├─ Generate signals from all bots      │
│ └─ Return { digit, snapshot, signals } │
└────────────────────────────────────────┘
       │
       ├─ 1. Add to digit history
       ├─ 2. Calculate digit powers
       ├─ 3. Update trends
       ├─ 4. Calculate entropy
       └─ 5. Generate AnalysisSnapshot
             │
             ├─→ EvenOddBot.analyze()
             ├─→ OverUnderBot.analyze()
             ├─→ DiffersBot.analyze()
             └─→ MatchesBot.analyze()
                   │
                   ▼
         ┌─────────────────────────┐
         │ BotSignal Generated:    │
         │ {                       │
         │   botType: string,      │
         │   action: 'trade'|...,  │
         │   prediction: number,   │
         │   confidence: 0-100,    │
         │   reason: string,       │
         │   powerThreshold: bool, │
         │   trendCondition: bool  │
         │ }                       │
         └─────────────────────────┘
                   │
                   ▼
         ┌─────────────────────────┐
         │ UI Display Signal        │
         │ ├─ Recommendation        │
         │ ├─ Confidence Level      │
         │ ├─ Reasoning             │
         │ └─ Action Buttons        │
         └─────────────────────────┘
                   │
                   ▼
         ┌─────────────────────────┐
         │ User Confirms Trade      │
         │ ├─ Click "Trade Once"    │
         │ ├─ Or "Auto Trade"       │
         │ └─ Or "Skip"             │
         └─────────────────────────┘
                   │
                   ▼
         ┌─────────────────────────┐
         │ Execute Trade:          │
         │ ├─ Calculate stake      │
         │ ├─ Apply Martingale     │
         │ ├─ Send to Deriv API    │
         │ └─ Get contract ref     │
         └─────────────────────────┘
                   │
                   ▼
         ┌─────────────────────────┐
         │ Wait for Result         │
         │ ├─ Contract Expires     │
         │ ├─ Receive Payout       │
         │ └─ Calculate Profit/Loss│
         └─────────────────────────┘
                   │
                   ▼
         ┌─────────────────────────┐
         │ recordTradeResult()     │
         │ ├─ Update bot state     │
         │ ├─ Update statistics    │
         │ ├─ Add to journal       │
         │ └─ Learn from result    │
         └─────────────────────────┘
```

## Analytics Engine Detail

```
CoreAnalyticsEngine
├─ Input: Price (e.g., 23456.78)
│
├─ Extract Last Digit: 8
│
├─ Maintain Rolling Window
│  └─ Keep last 100 digits
│
├─ Calculate Powers for Each Digit (0-9)
│  ├─ Count occurrences
│  ├─ Calculate: count / total * 100
│  └─ Result: power% for each digit
│
├─ Calculate Trends
│  ├─ Compare with previous snapshot
│  ├─ Power_trend = current_power - previous_power
│  └─ Detect increasing (↗) / decreasing (↘) / stable (→)
│
├─ Analyze Even vs Odd
│  ├─ Even digits: 0, 2, 4, 6, 8
│  ├─ Odd digits: 1, 3, 5, 7, 9
│  └─ Calculate power for each group
│
├─ Analyze Over vs Under
│  ├─ Under: 0-4 (lower half)
│  ├─ Over: 5-9 (upper half)
│  └─ Calculate power for each group
│
├─ Calculate Entropy
│  ├─ Formula: -Σ(p * log(p))
│  ├─ Low entropy (0): Biased distribution
│  └─ High entropy (1): Random distribution
│
├─ Identify Top 3 Digits
│  ├─ 1st: Strongest power
│  ├─ 2nd: 2nd strongest
│  └─ 3rd: 3rd strongest
│
└─ Output: AnalysisSnapshot
   ├─ currentDigit: 8
   ├─ lastDigits: [2, 7, 8, 3, ...]
   ├─ digitPowers: [power for 0-9]
   ├─ even: { count, power, trend }
   ├─ odd: { count, power, trend }
   ├─ under: { count, power, trend }
   ├─ over: { count, power, trend }
   ├─ entropy: 0-1 score
   └─ ... (and more fields)
```

## Bot Decision Tree

```
Bot Signal Generation
├─ EvenOddBot
│  ├─ Check: Max(even_power, odd_power) >= 55%?
│  ├─ Check: Trend > 0 (increasing)?
│  ├─ If YES → action='trade', confidence high
│  ├─ If MAYBE → action='wait', confidence medium
│  └─ If NO → action='skip', confidence low
│
├─ OverUnderBot
│  ├─ Check: Max(over_power, under_power) >= 55%?
│  ├─ Check: Trend > 0 (increasing)?
│  ├─ If YES → action='trade', predict 5-9 or 0-4
│  ├─ If MAYBE → action='wait'
│  └─ If NO → action='skip'
│
├─ DiffersBot (Contrarian)
│  ├─ Filter: Only digits 2-7
│  ├─ Remove: Top 3 appearing digits
│  ├─ Remove: Least appearing digit
│  ├─ Check: Remaining trend < 0 (decreasing)?
│  ├─ If YES → action='trade', predict filtered digit
│  └─ If NO → action='wait' or 'skip'
│
└─ MatchesBot (High Frequency)
   ├─ Check: Runs < 7?
   ├─ Get: Top 3 increasing digits
   ├─ If YES and trend > 0
   │  └─ action='trade', predict top digit
   └─ If NO or runs >= 7
      └─ action='skip', reset
```

## State Management

```
SmartAuto24Tab Component State
├─ Market Selection
│  ├─ market: "R_50" | "R_100" | etc.
│  ├─ allMarkets: [...loaded from API...]
│  └─ loadingMarkets: boolean
│
├─ Configuration
│  ├─ stake: "0.35"
│  ├─ targetProfit: "1"
│  ├─ analysisTimeMinutes: "30"
│  ├─ selectedStrategy: "Even/Odd" | "Over/Under" | "Differs" | "Matches"
│  └─ martingaleRatios: { per strategy }
│
├─ Real-Time Data
│  ├─ marketPrice: number
│  ├─ lastDigit: number
│  ├─ digitFrequencies: number[10]
│  ├─ overUnderAnalysis: { over, under, total }
│  ├─ ticksCollected: number
│  └─ consecutiveEvenCount, consecutiveOddCount
│
├─ Analysis Progress
│  ├─ isRunning: boolean
│  ├─ status: "idle" | "analyzing" | "trading" | "completed"
│  ├─ analysisProgress: 0-100
│  ├─ timeLeft: seconds
│  └─ analysisLog: AnalysisLogEntry[]
│
├─ Trade Results
│  ├─ sessionProfit: number
│  ├─ sessionTrades: number
│  ├─ tradeHistory: Trade[]
│  ├─ journalLog: JournalEntry[]
│  └─ stats: BotStats
│
└─ Engine
   └─ SmartAuto24Engine (via useSmartAuto24 hook)
      ├─ CoreAnalyticsEngine
      ├─ 4x Bot Engines
      └─ TradeExecutionEngine
```

## Error Handling & Recovery

```
Connection Error
├─ Detect: onclose or onerror
├─ Log: Error message
├─ Wait: Exponential backoff (2s → 30s)
├─ Retry: Up to 10 times
└─ Notify: User of connection status

Tick Processing Error
├─ Try-Catch: Wraps tick handler
├─ Log: Error details
├─ Continue: Processing next tick
└─ Graceful: Never crashes

Signal Generation Error
├─ Try-Catch: Wraps bot analysis
├─ Fallback: Return 'skip' action
├─ Log: Error details
└─ Recover: Try again next tick

Trade Execution Error
├─ Detect: API error response
├─ Log: Trade failure
├─ Notify: User
└─ Continue: Next opportunity

Message Parsing Error
├─ Try-Catch: JSON.parse()
├─ Log: Invalid message
├─ Skip: Move to next message
└─ Warn: User in console
```

## Performance Optimization

```
Optimization Strategies
├─ Rolling Window (100 ticks max)
│  └─ Memory: O(1), Time: O(1)
│
├─ Lazy Calculation
│  └─ Only calc powers when needed
│
├─ Event Routing
│  └─ Direct message to handlers
│
├─ Parallel Bot Analysis
│  └─ All 4 bots run in parallel
│
├─ Efficient State Updates
│  └─ Batch updates, avoid re-renders
│
└─ Message Queue
   └─ Buffer offline messages
```

## File Structure

```
/lib
├─ core-analytics-engine.ts ......... Main analytics
├─ bot-engines.ts .................. 4 Bot implementations
├─ trade-execution-engine.ts ....... Trade logic
├─ smartauto24-engine-integration.ts  Unified engine
├─ deriv-websocket-manager.ts ...... WebSocket connection
├─ market-data-debugger.ts ......... Debug monitoring
├─ unified-trading-engine.ts ....... Global engine
└─ theme-provider-advanced.tsx ...... Theme system

/components
├─ tabs/smartauto24-tab.tsx ........ Main UI component
├─ unified-trading-dashboard.tsx ... Dashboard UI
├─ market-data-monitor.tsx ......... Debug monitor
├─ premium-ui-components.tsx ....... 15+ reusable components
├─ theme-toggle-advanced.tsx ....... Theme toggle button
└─ ui/* ............................. shadcn components

/hooks
├─ use-smartauto24.ts .............. Engine integration hook
└─ use-deriv.ts .................... Deriv API hook

/styles
└─ premium-design-system.css ....... Design tokens & effects

/app
├─ page.tsx ........................ Main app page
├─ layout.tsx ...................... App layout with theme
└─ globals.css ..................... Global styles
```

---

**Complete system architecture for production trading engine**
