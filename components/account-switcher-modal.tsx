"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Wallet, LogOut, RefreshCcw, CheckCircle2 } from "lucide-react"

interface Account {
  id: string
  type: "Demo" | "Real"
  currency: string
  token?: string
}

interface AccountSwitcherModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts: Account[]
  activeLoginId: string | null
  onSwitch: (id: string, token: string) => void
  onResetDemo: () => void
  onLogout: () => void
}

export function AccountSwitcherModal({
  open,
  onOpenChange,
  accounts,
  activeLoginId,
  onSwitch,
  onResetDemo,
  onLogout,
}: AccountSwitcherModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] bg-[#0a0e27] border-blue-500/20 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Wallet className="h-5 w-5 text-blue-400" />
            Switch Account
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Manage your trading accounts and balances
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="grid gap-2">
            {accounts.map((acc) => {
              const isActive = acc.id === activeLoginId
              return (
                <div
                  key={acc.id}
                  onClick={() => !isActive && acc.token && onSwitch(acc.id, acc.token)}
                  className={`
                    group relative p-4 rounded-xl border transition-all cursor-pointer
                    ${isActive 
                      ? "bg-blue-600/20 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.2)]" 
                      : "bg-gray-900/40 border-gray-800 hover:border-gray-700 hover:bg-gray-800/40"}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isActive ? "bg-blue-500/20" : "bg-gray-800"}`}>
                        <Wallet className={`h-4 w-4 ${isActive ? "text-blue-400" : "text-gray-400"}`} />
                      </div>
                      <div>
                        <div className="text-sm font-bold flex items-center gap-2">
                          {acc.id}
                          {isActive && <CheckCircle2 className="h-3 w-3 text-green-400" />}
                        </div>
                        <div className="text-xs text-gray-400 uppercase tracking-wider">{acc.currency}</div>
                      </div>
                    </div>
                    <Badge variant={acc.type === "Demo" ? "outline" : "default"} className={acc.type === "Demo" ? "border-yellow-500/50 text-yellow-500" : "bg-green-600"}>
                      {acc.type}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              variant="outline"
              className="border-gray-800 bg-gray-900/40 hover:bg-gray-800 text-gray-300 gap-2 h-11"
              onClick={() => {
                onResetDemo()
                onOpenChange(false)
              }}
            >
              <RefreshCcw className="h-4 w-4" />
              Reset Demo
            </Button>
            <Button
              variant="destructive"
              className="bg-red-900/20 border border-red-500/20 hover:bg-red-900/40 text-red-400 gap-2 h-11"
              onClick={() => {
                onLogout()
                onOpenChange(false)
              }}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
