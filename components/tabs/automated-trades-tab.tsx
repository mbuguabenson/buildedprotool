"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Play, Square, TrendingUp } from "lucide-react"
import { useDerivAPI } from "@/lib/deriv-api-context"
import { useDerivAuth } from "@/hooks/use-deriv-auth"
import { AutomatedTradesBot, type MarketAnalysis, type TradingSignal } from "@/lib/automated-trades-bots"
import { DerivWebSocketManager } from "@/lib/deriv-websocket-manager"

interface AutomatedTradesTabProps {
  theme?: "light" | "dark"
}

export function AutomatedTradesTab({ theme = "dark" }: AutomatedTradesTabProps) {
  const { apiClient, isConnected, isAuthorized, balance } = useDerivAPI()
  const { accounts, activeLoginId } = useDerivAuth()

  const activeAccount = accounts.find(a => a.id === activeLoginId)
  const accountInfo = activeAccount ? {
    loginid: activeAccount.id,
    currency: activeAccount.currency,
    balance: balance?.amount || 0
  } : null
  const [bot, setBot] = useState<AutomatedTradesBot | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [currentAnalysis, setCurrentAnalysis] = useState<MarketAnalysis | null>(null)
  const [currentSignal, setCurrentSignal] = useState<TradingSignal | null>(null)
  const [allMarketAnalyses, setAllMarketAnalyses] = useState<MarketAnalysis[]>([])
  const [totalProfit, setTotalProfit] = useState(0)
  const [tradesCount, setTradesCount] = useState(0)
  const [selectedStrategy, setSelectedStrategy] = useState<string>("auto")
  const [marketPrice, setMarketPrice] = useState<number>(0)
  const [marketPayout, setMarketPayout] = useState<number>(0)

  const balance = accountInfo?.balance || 1000
  const targetProfit = (balance * 10) / 100
  const profitProgress = Math.min((totalProfit / targetProfit) * 100, 100)

  useEffect(() => {
    if (!isConnected || !isAuthorized || !apiClient) return

    const initBot = new AutomatedTradesBot(apiClient, {
      accountBalance: balance,
      targetProfitPercent: 10,
      minStakePercent: 2,
      maxStakePercent: 5,
      duration: 1,
      durationUnit: "t",
    })
    setBot(initBot)
  }, [apiClient, isConnected, isAuthorized, balance])

  const handleStart = async () => {
    if (!bot) return
    setIsRunning(true)

    const analysisInterval = setInterval(async () => {
      try {
        const analyses = await Promise.all(
          [
            "R_10",
            "R_25",
            "R_50",
            "R_75",
            "R_100",
            "1HZ10V",
            "1HZ15V",
            "1HZ25V",
            "1HZ30V",
            "1HZ50V",
            "1HZ75V",
            "1HZ90V",
            "1HZ100V",
          ].map((market) => bot.analyzeMarket(market)),
        )

        setAllMarketAnalyses(analyses)

        const bestMarket =
          selectedStrategy === "auto"
            ? await bot.findBestMarket()
            : analyses.find((a) => {
                if (selectedStrategy === "differs") return a.trends.differs > 65
                if (selectedStrategy === "over0") return a.trends.over0 > 65
                if (selectedStrategy === "over1") return a.trends.over1 > 65
                if (selectedStrategy === "over2") return a.trends.over2 > 65
                if (selectedStrategy === "under7") return a.trends.under7 > 65
                if (selectedStrategy === "under8") return a.trends.under8 > 65
                if (selectedStrategy === "under9") return a.trends.under9 > 65
                return false
              }) || (await bot.findBestMarket())

        setCurrentAnalysis(bestMarket)

        if (bestMarket && bestMarket.confidence > 65) {
          const signal = await bot.generateSignalForStrategy(bestMarket, selectedStrategy)
          if (signal) {
            setCurrentSignal(signal)
            await bot.executeTradeSignal(signal)
            setTradesCount((prev) => prev + 1)
            const profit = signal.expectedPayout - signal.stake
            setTotalProfit((prev) => prev + profit)
          }
        }
      } catch (error) {
        console.error("[v0] Analysis error:", error)
      }
    }, 15000)

    return () => clearInterval(analysisInterval)
  }

  const handleStop = () => {
    setIsRunning(false)
    if (bot) bot.stop()
  }

  useEffect(() => {
    if (!currentAnalysis) return

    const unsubscribe = DerivWebSocketManager.subscribe(currentAnalysis.symbol, (data) => {
      if (data.quote) {
        setMarketPrice(data.quote)
      }
    })

    const fetchPayout = async () => {
      if (!apiClient || !currentSignal) return
      try {
        const proposal = await apiClient.getProposal({
          symbol: currentAnalysis.symbol,
          contract_type: currentSignal.contractType,
          amount: currentSignal.stake,
          basis: "stake",
          duration: 1,
          duration_unit: "t",
          currency: "USD",
        })
        if (proposal) {
          setMarketPayout(proposal.payout || 0)
        }
      } catch (error) {
        console.error("[v0] Failed to fetch payout:", error)
      }
    }

    fetchPayout()

    return () => {
      unsubscribe()
    }
  }, [currentAnalysis, apiClient, currentSignal])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card
          className={
            theme === "dark"
              ? "bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/30"
              : "bg-blue-50 border-blue-200"
          }
        >
          <CardHeader className="pb-2">
            <CardTitle className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
              Account Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              ${balance.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card
          className={
            theme === "dark"
              ? "bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/30"
              : "bg-green-50 border-green-200"
          }
        >
          <CardHeader className="pb-2">
            <CardTitle className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
              Total Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-3xl font-bold flex items-center gap-2 ${theme === "dark" ? "text-green-400" : "text-green-600"}`}
            >
              <TrendingUp className="w-6 h-6" />${totalProfit.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card
          className={
            theme === "dark"
              ? "bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/30"
              : "bg-purple-50 border-purple-200"
          }
        >
          <CardHeader className="pb-2">
            <CardTitle className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
              Trades Executed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              {tradesCount}
            </div>
          </CardContent>
        </Card>

        <Card
          className={
            theme === "dark"
              ? "bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/30"
              : "bg-orange-50 border-orange-200"
          }
        >
          <CardHeader className="pb-2">
            <CardTitle className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
              Target Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              {profitProgress.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Card
        className={
          theme === "dark"
            ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-cyan-500/20"
            : "bg-white border-gray-200"
        }
      >
        <CardHeader>
          <CardTitle className={theme === "dark" ? "text-cyan-400" : "text-cyan-600"}>
            Automated Trading Control
          </CardTitle>
          <CardDescription className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
            Bot automatically analyzes all 13 markets and places high-confidence trades
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className={`text-sm font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
              Trading Strategy
            </label>
            <Select value={selectedStrategy} onValueChange={setSelectedStrategy} disabled={isRunning}>
              <SelectTrigger
                className={theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300"}
              >
                <SelectValue placeholder="Select strategy" />
              </SelectTrigger>
              <SelectContent className={theme === "dark" ? "bg-[#0a0e27] border-cyan-500/30" : "bg-white"}>
                <SelectItem value="auto">Auto (Best Available Market)</SelectItem>
                <SelectItem value="differs">DIFFERS Bot</SelectItem>
                <SelectItem value="over0">OVER 0 Bot</SelectItem>
                <SelectItem value="over1">OVER 1 Bot</SelectItem>
                <SelectItem value="over2">OVER 2 Bot</SelectItem>
                <SelectItem value="under7">UNDER 7 Bot</SelectItem>
                <SelectItem value="under8">UNDER 8 Bot</SelectItem>
                <SelectItem value="under9">UNDER 9 Bot</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                Stake Range: {((balance * 2) / 100).toFixed(2)} - {((balance * 5) / 100).toFixed(2)} USD
              </p>
              <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                Target Profit: ${targetProfit.toFixed(2)}
              </p>
            </div>
            {isRunning ? (
              <Button onClick={handleStop} variant="destructive" className="gap-2">
                <Square className="w-4 h-4" />
                Stop Bot
              </Button>
            ) : (
              <Button
                onClick={handleStart}
                className="bg-green-500 hover:bg-green-600 gap-2"
                disabled={!isConnected || !isAuthorized}
              >
                <Play className="w-4 h-4" />
                Start Bot
              </Button>
            )}
          </div>

          <Progress value={profitProgress} className="h-2" />
        </CardContent>
      </Card>

      {currentAnalysis && (
        <Card
          className={
            theme === "dark"
              ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20"
              : "bg-white border-gray-200"
          }
        >
          <CardHeader>
            <CardTitle className={theme === "dark" ? "text-white" : "text-gray-900"}>
              Best Market: {currentAnalysis.symbol}
            </CardTitle>
            <CardDescription className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
              <Badge
                className={
                  currentAnalysis.recommendation === "EXCELLENT"
                    ? "bg-green-500"
                    : currentAnalysis.recommendation === "GOOD"
                      ? "bg-blue-500"
                      : "bg-yellow-500"
                }
              >
                {currentAnalysis.recommendation} - {currentAnalysis.confidence.toFixed(1)}% Confidence
              </Badge>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-3 rounded-lg bg-purple-500/10">
                <p className="text-xs text-gray-400">Market Price</p>
                <p className="text-2xl font-bold text-white">{marketPrice > 0 ? marketPrice.toFixed(5) : "0.00000"}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-blue-500/10">
                <p className="text-xs text-gray-400">Last Digit</p>
                <p className="text-2xl font-bold text-white">{currentAnalysis.lastDigit}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-green-500/10">
                <p className="text-xs text-gray-400">Score</p>
                <p className="text-2xl font-bold text-green-400">{currentAnalysis.score.toFixed(1)}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-orange-500/10">
                <p className="text-xs text-gray-400">Payout</p>
                <p className="text-2xl font-bold text-orange-400">
                  ${marketPayout > 0 ? marketPayout.toFixed(2) : "0.00"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {allMarketAnalyses.length > 0 && (
        <Card
          className={
            theme === "dark"
              ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20"
              : "bg-white border-gray-200"
          }
        >
          <CardHeader>
            <CardTitle className={theme === "dark" ? "text-white" : "text-gray-900"}>All Markets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {allMarketAnalyses.map((analysis) => (
                <div
                  key={analysis.symbol}
                  className={`p-3 rounded-lg border ${
                    analysis.symbol === currentAnalysis?.symbol
                      ? theme === "dark"
                        ? "bg-green-500/20 border-green-500"
                        : "bg-green-100 border-green-500"
                      : theme === "dark"
                        ? "bg-gray-800/50 border-gray-700"
                        : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className={`font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                      {analysis.symbol}
                    </p>
                    <Badge
                      className={
                        analysis.recommendation === "EXCELLENT"
                          ? "bg-green-500"
                          : analysis.recommendation === "GOOD"
                            ? "bg-blue-500"
                            : "bg-yellow-500"
                      }
                    >
                      {analysis.confidence.toFixed(0)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
