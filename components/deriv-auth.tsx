import { useState } from "react"
import { useDerivAuth } from "@/hooks/use-deriv-auth"
import { useDerivAPI } from "@/lib/deriv-api-context"
import { Button } from "@/components/ui/button"
import { Lock, ChevronDown } from "lucide-react"
import { AccountSwitcherModal } from "./account-switcher-modal"
interface DerivAuthProps {
  theme?: "light" | "dark"
}

export function DerivAuth({ theme = "dark" }: DerivAuthProps) {
  const { balance } = useDerivAPI()
  const {
    isLoggedIn,
    login,
    logout,
    accountType,
    accounts,
    switchAccount,
    activeLoginId,
    resetDemoBalance
  } = useDerivAuth()

  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false)

  if (!isLoggedIn) {
    return (
      <div className="flex items-center gap-3">
        <Button
          onClick={() => window.open("https://track.deriv.com/_1mHiO0UpCX6NhxmBqQyZL2Nd7ZgqdRLk/1/", "_blank")}
          variant="outline"
          className="hidden sm:flex border-blue-500/30 text-blue-400 hover:bg-blue-500/10 font-bold px-4 py-2 rounded-xl transition-all"
        >
          Sign Up
        </Button>
        <Button
          onClick={login}
          className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold px-6 py-2 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all hover:scale-105 active:scale-95 flex items-center gap-2 group"
        >
          <Lock className="h-4 w-4 group-hover:rotate-12 transition-transform" />
          Login 2.0
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4">
      {/* Balance Display */}
      <div className="flex flex-col items-end mr-1 sm:mr-2">
        <span className="text-[8px] sm:text-[10px] text-gray-500 uppercase tracking-widest font-bold">Balance</span>
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="text-sm sm:text-xl font-black text-white tracking-tight">
            {balance ? balance.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
          </span>
          <span className="text-[10px] sm:text-xs font-bold text-blue-400">{balance?.currency || "USD"}</span>
        </div>
      </div>

      {/* Account Info Badge / Switcher Trigger */}
      <button
        onClick={() => setIsSwitcherOpen(true)}
        className={`
          flex items-center gap-3 px-4 py-2 rounded-2xl border transition-all hover:scale-[1.02] active:scale-[0.98]
          ${accountType === "Demo"
            ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/20 shadow-[0_0_20px_rgba(234,179,8,0.05)]"
            : "bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.05)]"
          }
        `}
      >
        <div className="relative">
          <div className={`w-2.5 h-2.5 rounded-full ${accountType === "Demo" ? "bg-yellow-500" : "bg-green-500"} animate-pulse`} />
          <div className={`absolute -inset-1 blur-sm opacity-50 ${accountType === "Demo" ? "bg-yellow-500" : "bg-green-500"}`} />
        </div>
        
        <div className="flex flex-col items-start leading-none">
          <span className="text-[10px] font-bold opacity-70 uppercase tracking-tighter mb-0.5">{accountType} Account</span>
          <span className="text-sm font-bold tracking-tight font-mono">{activeLoginId}</span>
        </div>
        
        <ChevronDown className="h-4 w-4 opacity-50 ml-1" />
      </button>

      {/* Switcher Modal */}
      <AccountSwitcherModal
        open={isSwitcherOpen}
        onOpenChange={setIsSwitcherOpen}
        accounts={accounts}
        activeLoginId={activeLoginId}
        onSwitch={(id, token) => {
          switchAccount(id, token)
          setIsSwitcherOpen(false)
        }}
        onResetDemo={resetDemoBalance}
        onLogout={logout}
      />
    </div>
  )
}
