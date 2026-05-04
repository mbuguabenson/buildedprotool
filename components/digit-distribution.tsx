"use client"

interface DigitDistributionProps {
  frequencies: Record<number, { count: number; percentage: number }>
  currentDigit: number | null
  theme: "light" | "dark"
}

export function DigitDistribution({ frequencies, currentDigit, theme }: DigitDistributionProps) {
  // Split digits into two rows: 0-4 and 5-9
  const row1Digits = [0, 1, 2, 3, 4]
  const row2Digits = [5, 6, 7, 8, 9]

  const getMaxPercentage = () => {
    return Math.max(...Object.values(frequencies).map((f) => f.percentage))
  }

  const maxPercentage = getMaxPercentage()

  const renderDigitBar = (digit: number) => {
    const freq = frequencies[digit] || { count: 0, percentage: 0 }
    const isCurrentDigit = currentDigit === digit
    const heightPercentage = maxPercentage > 0 ? (freq.percentage / maxPercentage) * 100 : 0

    return (
      <div key={digit} className="flex flex-col items-center gap-2">
        <div className="relative w-full h-32 sm:h-40 flex flex-col justify-end">
          <div
            className={`w-full rounded-t-lg transition-all duration-500 ease-out ${
              isCurrentDigit
                ? theme === "dark"
                  ? "bg-gradient-to-t from-orange-500 to-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.6)] border-2 border-orange-400"
                  : "bg-gradient-to-t from-orange-500 to-orange-400 shadow-lg border-2 border-orange-400"
                : theme === "dark"
                  ? "bg-gradient-to-t from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400"
                  : "bg-gradient-to-t from-blue-500 to-blue-400 hover:from-blue-600 hover:to-blue-500"
            }`}
            style={{ height: `${heightPercentage}%` }}
          />
        </div>
        <div
          className={`text-center ${
            isCurrentDigit
              ? theme === "dark"
                ? "text-orange-400 font-bold text-lg"
                : "text-orange-600 font-bold text-lg"
              : theme === "dark"
                ? "text-gray-300"
                : "text-gray-700"
          }`}
        >
          <div className="text-xl font-bold">{digit}</div>
          <div className="text-xs">{freq.percentage.toFixed(1)}%</div>
          <div className="text-xs opacity-75">{freq.count}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Row 1: Digits 0-4 */}
      <div>
        <h4
          className={`text-sm font-semibold mb-3 text-center ${
            theme === "dark" ? "text-gray-400" : "text-gray-600"
          }`}
        >
          Digits 0-4
        </h4>
        <div className="grid grid-cols-5 gap-2 sm:gap-4">{row1Digits.map(renderDigitBar)}</div>
      </div>

      {/* Row 2: Digits 5-9 */}
      <div>
        <h4
          className={`text-sm font-semibold mb-3 text-center ${
            theme === "dark" ? "text-gray-400" : "text-gray-600"
          }`}
        >
          Digits 5-9
        </h4>
        <div className="grid grid-cols-5 gap-2 sm:gap-4">{row2Digits.map(renderDigitBar)}</div>
      </div>
    </div>
  )
}
