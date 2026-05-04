// 4 Core Bot Engines for Deriv Trading
// Even/Odd, Over/Under, Differs, Matches

import type { AnalysisSnapshot, PowerTrend } from './core-analytics-engine'

export interface BotSignal {
  botType: 'even_odd' | 'over_under' | 'differs' | 'matches'
  action: 'trade' | 'wait' | 'skip'
  prediction: number | number[] // digit(s) to trade
  confidence: number // 0-100
  reason: string
  powerThreshold: boolean
  trendCondition: boolean
}

export interface BotState {
  isActive: boolean
  runsCount: number
  lastTradeDigit: number | null
  consecutiveWins: number
  consecutiveLosses: number
  lastSignal: BotSignal | null
}

// ==================== EVEN/ODD BOT ====================
export class EvenOddBot {
  private state: BotState = {
    isActive: false,
    runsCount: 0,
    lastTradeDigit: null,
    consecutiveWins: 0,
    consecutiveLosses: 0,
    lastSignal: null,
  }

  private powerThreshold = 55
  private maxRuns = 10

  analyze(snapshot: AnalysisSnapshot): BotSignal {
    const evenPower = snapshot.even.power
    const oddPower = snapshot.odd.power

    const dominant = evenPower > oddPower ? 'even' : 'odd'
    const dominantPower = Math.max(evenPower, oddPower)
    const trend = dominant === 'even' ? snapshot.even.trend : snapshot.odd.trend

    // Signal conditions
    const powerThresholdMet = dominantPower >= this.powerThreshold
    const trendPositive = trend > 0
    const hasPower = dominantPower >= 50

    let action: 'trade' | 'wait' | 'skip' = 'skip'
    let confidence = 0

    if (powerThresholdMet && trendPositive && hasPower) {
      action = 'trade'
      confidence = Math.min(dominantPower + Math.abs(trend), 100)
    } else if (powerThresholdMet) {
      action = 'wait'
      confidence = dominantPower
    }

    // Determine prediction (which even/odd digits)
    const lastDigits = snapshot.lastDigits
    const lastDigit = lastDigits[lastDigits.length - 1]
    
    let predictionDigits: number[]
    if (dominant === 'even') {
      predictionDigits = [0, 2, 4, 6, 8]
    } else {
      predictionDigits = [1, 3, 5, 7, 9]
    }

    const prediction = predictionDigits[Math.floor(Math.random() * predictionDigits.length)]

    const signal: BotSignal = {
      botType: 'even_odd',
      action,
      prediction,
      confidence: Math.round(confidence),
      reason:
        action === 'trade'
          ? `${dominant.toUpperCase()} power ${dominantPower.toFixed(1)}% with ${trend > 0 ? 'increasing' : 'neutral'} trend`
          : `Waiting for ${dominant.toUpperCase()} to exceed 55% (currently ${dominantPower.toFixed(1)}%)`,
      powerThreshold: powerThresholdMet,
      trendCondition: trendPositive,
    }

    this.state.lastSignal = signal
    return signal
  }

  getState(): BotState {
    return { ...this.state }
  }

  recordWin(): void {
    this.state.consecutiveWins++
    this.state.consecutiveLosses = 0
    this.state.runsCount++
  }

  recordLoss(): void {
    this.state.consecutiveLosses++
    this.state.consecutiveWins = 0
    this.state.runsCount++
  }

  reset(): void {
    this.state = {
      isActive: false,
      runsCount: 0,
      lastTradeDigit: null,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      lastSignal: null,
    }
  }
}

// ==================== OVER/UNDER BOT ====================
export class OverUnderBot {
  private state: BotState = {
    isActive: false,
    runsCount: 0,
    lastTradeDigit: null,
    consecutiveWins: 0,
    consecutiveLosses: 0,
    lastSignal: null,
  }

  private powerThreshold = 55

  analyze(snapshot: AnalysisSnapshot): BotSignal {
    const underPower = snapshot.under.power // 0-4
    const overPower = snapshot.over.power   // 5-9

    const dominant = overPower > underPower ? 'over' : 'under'
    const dominantPower = Math.max(underPower, overPower)
    const trend = dominant === 'over' ? snapshot.over.trend : snapshot.under.trend

    // Signal conditions
    const powerThresholdMet = dominantPower >= this.powerThreshold
    const trendPositive = trend > 0
    const hasPower = dominantPower >= 50

    let action: 'trade' | 'wait' | 'skip' = 'skip'
    let confidence = 0

    if (powerThresholdMet && trendPositive && hasPower) {
      action = 'trade'
      confidence = Math.min(dominantPower + Math.abs(trend), 100)
    } else if (powerThresholdMet) {
      action = 'wait'
      confidence = dominantPower
    }

    // Determine prediction digits
    const predictionDigits = dominant === 'over' ? [5, 6, 7, 8, 9] : [0, 1, 2, 3, 4]
    const prediction = predictionDigits[Math.floor(Math.random() * predictionDigits.length)]

    const signal: BotSignal = {
      botType: 'over_under',
      action,
      prediction,
      confidence: Math.round(confidence),
      reason:
        action === 'trade'
          ? `${dominant.toUpperCase()} power ${dominantPower.toFixed(1)}% with ${trend > 0 ? 'increasing' : 'neutral'} trend`
          : `Waiting for ${dominant.toUpperCase()} to exceed 55% (currently ${dominantPower.toFixed(1)}%)`,
      powerThreshold: powerThresholdMet,
      trendCondition: trendPositive,
    }

    this.state.lastSignal = signal
    return signal
  }

  getState(): BotState {
    return { ...this.state }
  }

  recordWin(): void {
    this.state.consecutiveWins++
    this.state.consecutiveLosses = 0
    this.state.runsCount++
  }

  recordLoss(): void {
    this.state.consecutiveLosses++
    this.state.consecutiveWins = 0
    this.state.runsCount++
  }

  reset(): void {
    this.state = {
      isActive: false,
      runsCount: 0,
      lastTradeDigit: null,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      lastSignal: null,
    }
  }
}

// ==================== DIFFERS BOT (SMART FILTER) ====================
export class DiffersBot {
  private state: BotState = {
    isActive: false,
    runsCount: 0,
    lastTradeDigit: null,
    consecutiveWins: 0,
    consecutiveLosses: 0,
    lastSignal: null,
  }

  analyze(snapshot: AnalysisSnapshot): BotSignal {
    // Rules:
    // - Only digits 2-7
    // - NOT most appearing
    // - NOT 2nd most appearing
    // - NOT least appearing
    // - Power must be DECREASING

    const allowedDigits = [2, 3, 4, 5, 6, 7]
    const top3Digits = snapshot.digitPowers.slice(0, 3).map(dp => dp.digit)
    const leastDigit = snapshot.weakest.digit

    let action: 'trade' | 'wait' | 'skip' = 'skip'
    let confidence = 0
    let selectedDigit: number | null = null

    // Find eligible digits
    const eligible = allowedDigits.filter(
      d => !top3Digits.includes(d) && d !== leastDigit
    )

    if (eligible.length > 0) {
      // Select digit with decreasing power
      let bestDigit = eligible[0]
      let bestDecline = -Infinity

      eligible.forEach(d => {
        const power = snapshot.digitPowers.find(dp => dp.digit === d)
        if (power && power.trend < 0) {
          if (power.trend < bestDecline || bestDecline === -Infinity) {
            bestDecline = power.trend
            bestDigit = d
          }
        }
      })

      const selectedPower = snapshot.digitPowers.find(dp => dp.digit === bestDigit)
      if (selectedPower && selectedPower.trend < 0) {
        action = 'trade'
        confidence = Math.min(Math.abs(selectedPower.trend) * 5, 85)
        selectedDigit = bestDigit
      } else {
        action = 'wait'
      }
    }

    const signal: BotSignal = {
      botType: 'differs',
      action,
      prediction: selectedDigit || 4,
      confidence: Math.round(confidence),
      reason:
        action === 'trade'
          ? `Digit ${selectedDigit} is in allowed range (2-7) and power is decreasing`
          : 'No eligible digits with decreasing power in range 2-7',
      powerThreshold: eligible.length > 0,
      trendCondition: ((selectedDigit && snapshot.digitPowers.find(dp => dp.digit === selectedDigit)?.trend) ?? 0) < 0,
    }

    this.state.lastSignal = signal
    return signal
  }

  getState(): BotState {
    return { ...this.state }
  }

  recordWin(): void {
    this.state.consecutiveWins++
    this.state.consecutiveLosses = 0
    this.state.runsCount++
  }

  recordLoss(): void {
    this.state.consecutiveLosses++
    this.state.consecutiveWins = 0
    this.state.runsCount++
  }

  reset(): void {
    this.state = {
      isActive: false,
      runsCount: 0,
      lastTradeDigit: null,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      lastSignal: null,
    }
  }
}

// ==================== MATCHES BOT (HIGH FREQUENCY) ====================
export class MatchesBot {
  private state: BotState = {
    isActive: false,
    runsCount: 0,
    lastTradeDigit: null,
    consecutiveWins: 0,
    consecutiveLosses: 0,
    lastSignal: null,
  }

  private maxRuns = 7

  analyze(snapshot: AnalysisSnapshot): BotSignal {
    // Rules:
    // - Uses latest ticks only
    // - Top 3 increasing digits
    // - Trades EVERY tick
    // - No skipping
    // - Stops if digit power drops
    // - Max runs = 7

    const top3 = snapshot.digitPowers.slice(0, 3)
    const currentDigit = snapshot.currentDigit

    let action: 'trade' | 'wait' | 'skip' = 'skip'
    let confidence = 80
    let prediction = currentDigit

    // Check if we should continue
    if (this.state.runsCount >= this.maxRuns) {
      action = 'skip'
      confidence = 0
    } else if (top3.some(d => d.digit === currentDigit && d.trend > 0)) {
      // Current digit is in top 3 and increasing
      action = 'trade'
      prediction = currentDigit
    } else {
      // Predict based on top 3
      const bestOfTop3 = top3[0]
      if (bestOfTop3.trend > 0) {
        action = 'trade'
        prediction = bestOfTop3.digit
        confidence = Math.min(bestOfTop3.power + Math.abs(bestOfTop3.trend), 95)
      }
    }

    const signal: BotSignal = {
      botType: 'matches',
      action,
      prediction,
      confidence: Math.round(confidence),
      reason:
        action === 'trade'
          ? `High-frequency match on digit ${prediction} (Runs: ${this.state.runsCount}/${this.maxRuns})`
          : `${this.state.runsCount >= this.maxRuns ? 'Max runs reached' : 'No increasing top 3 digits'}`,
      powerThreshold: this.state.runsCount < this.maxRuns,
      trendCondition: top3.some(d => d.trend > 0),
    }

    this.state.lastSignal = signal
    return signal
  }

  getState(): BotState {
    return { ...this.state }
  }

  recordWin(): void {
    this.state.consecutiveWins++
    this.state.consecutiveLosses = 0
    this.state.runsCount++
  }

  recordLoss(): void {
    this.state.consecutiveLosses++
    this.state.consecutiveWins = 0
    this.state.runsCount++
    if (this.state.runsCount >= this.maxRuns) {
      this.reset()
    }
  }

  reset(): void {
    this.state = {
      isActive: false,
      runsCount: 0,
      lastTradeDigit: null,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      lastSignal: null,
    }
  }
}
