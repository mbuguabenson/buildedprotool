"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DerivWebSocketManager } from "@/lib/deriv-websocket-manager"

interface MarketSelectorStandaloneProps {
  onMarketChange?: (symbol: string, price: number, lastDigit: number) => void
  theme?: "light" | "dark"
  defaultSymbol?: string
}

const VOLATILITY_MARKETS = [
  { symbol: "R_10", name: "Volatility 10 (1s)", interval: "1s" },
  { symbol: "R_25", name: "Volatility 25 (1s)", interval: "1s" },
  { symbol: "R_50", name: "Volatility 50 (1s)", interval: "1s" },
  { symbol: "R_75", name: "Volatility 75 (1s)", interval: "1s" },
  { symbol: "R_100", name: "Volatility 100 (1s)", interval: "1s" },
  { symbol: "1HZ10V", name: "Volatility 10 Index", interval: "1s" },
  { symbol: "1HZ25V", name: "Volatility 25 Index", interval: "1s" },
  { symbol: "1HZ50V", name: "Volatility 50 Index", interval: "1s" },
  { symbol: "1HZ75V", name: "Volatility 75 Index", interval: "1s" },
  { symbol: "1HZ100V", name: "Volatility 100 Index", interval: "1s" },
]

export function MarketSelectorStandalone({
  onMarketChange,
  theme = "dark",
  defaultSymbol = "R_100",
}: MarketSelectorStandaloneProps) {
  const [selectedSymbol, setSelectedSymbol] = useState(defaultSymbol)
  const [currentPrice, setCurrentPrice] = useState<number>(0)
  const [lastDigit, setLastDigit] = useState<number>(0)
  const [ticks, setTicks] = useState<number>(0)
  const [isConnected, setIsConnected] = useState(false)
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null)

  useEffect(() => {
    const ws = DerivWebSocketManager.getInstance()

    const connectAndSubscribe = async () => {
      try {
        if (!ws.isConnected()) {
          await ws.connect()
        }
        setIsConnected(true)

        // Unsubscribe from previous symbol
        if (subscriptionId) {
          await ws.unsubscribe(subscriptionId)
        }

        // Subscribe to new symbol
        const subId = await ws.subscribeTicks(selectedSymbol, (tick) => {
          setCurrentPrice(tick.quote)
          setLastDigit(tick.lastDigit)
          setTicks((prev) => prev + 1)

          if (onMarketChange) {
            onMarketChange(tick.symbol, tick.quote, tick.lastDigit)
          }
        })

        setSubscriptionId(subId)
      } catch (error) {
        console.error("[v0] Failed to connect:", error)
        setIsConnected(false)
      }
    }

    connectAndSubscribe()

    return () => {
      if (subscriptionId) {
        ws.unsubscribe(subscriptionId)
      }
    }
  }, [selectedSymbol])

  const handleSymbolChange = (symbol: string) => {
    setSelectedSymbol(symbol)
    setTicks(0)
  }

  const selectedMarket = VOLATILITY_MARKETS.find((m) => m.symbol === selectedSymbol)

  return (
    <div
      className={`space-y-4 p-4 rounded-lg border ${
        theme === "dark"
          ? "bg-gradient-to-br from-slate-900/80 to-slate-800/80 border-slate-700"
          : "bg-white border-gray-200"
      }`}
    >
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex-1 w-full sm:w-auto">
          <label className={`text-sm font-medium mb-2 block ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
            Select Market
          </label>
          <Select value={selectedSymbol} onValueChange={handleSymbolChange}>
            <SelectTrigger
              className={`w-full ${
                theme === "dark" ? "bg-slate-800 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"
              }`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VOLATILITY_MARKETS.map((market) => (
                <SelectItem key={market.symbol} value={market.symbol}>
                  {market.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-4 w-full sm:w-auto">
          <div
            className={`flex-1 sm:flex-none text-center p-3 rounded-lg ${
              theme === "dark" ? "bg-blue-500/10 border border-blue-500/20" : "bg-blue-50 border border-blue-200"
            }`}
          >
            <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"} mb-1`}>Price</div>
            <div className={`text-lg font-bold ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}>
              {currentPrice.toFixed(5)}
            </div>
          </div>

          <div
            className={`flex-1 sm:flex-none text-center p-3 rounded-lg ${
              theme === "dark" ? "bg-green-500/10 border border-green-500/20" : "bg-green-50 border border-green-200"
            }`}
          >
            <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"} mb-1`}>Last Digit</div>
            <div className={`text-2xl font-bold ${theme === "dark" ? "text-green-400" : "text-green-600"}`}>
              {lastDigit}
            </div>
          </div>

          <div
            className={`flex-1 sm:flex-none text-center p-3 rounded-lg ${
              theme === "dark"
                ? "bg-purple-500/10 border border-purple-500/20"
                : "bg-purple-50 border border-purple-200"
            }`}
          >
            <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"} mb-1`}>Ticks</div>
            <div className={`text-lg font-bold ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`}>
              {ticks}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
          <span className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
        <span className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-500"}`}>
          Symbol: {selectedMarket?.symbol}
        </span>
      </div>
    </div>
  )
}
