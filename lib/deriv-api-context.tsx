"use client"

import type React from "react"
import { createContext, useContext, useEffect, useRef, useState } from "react"
import { DerivAPIClient, type ConnectionStatus } from "./deriv-api"
import { DERIV_APP_ID } from "./deriv-config"
import { useDerivAuth } from "@/hooks/use-deriv-auth"

// ─── Context Types ─────────────────────────────────────────────────────────────

export interface Balance {
  amount: number
  currency: string
}

interface DerivAPIContextType {
  apiClient: DerivAPIClient | null
  isConnected: boolean
  isAuthorized: boolean
  balance: Balance | null
  error: string | null
  connectionStatus: ConnectionStatus
  reconnect: () => void
}

const DerivAPIContext = createContext<DerivAPIContextType>({
  apiClient: null,
  isConnected: false,
  isAuthorized: false,
  balance: null,
  error: null,
  connectionStatus: "disconnected",
  reconnect: () => {},
})

// Singleton client so it survives React StrictMode double-mounts
let globalAPIClient: DerivAPIClient | null = null

// ─── Provider ─────────────────────────────────────────────────────────────────

export function DerivAPIProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [balance, setBalance] = useState<Balance | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected")

  const clientRef = useRef<DerivAPIClient | null>(null)
  const balanceSubIdRef = useRef<string | null>(null)
  const initAttemptRef = useRef(0)
  const isMountedRef = useRef(true)
  const { token, isLoggedIn, activeLoginId } = useDerivAuth()

  const safeSetStatus = (status: ConnectionStatus) => {
    if (!isMountedRef.current) return
    setConnectionStatus(status)
    setIsConnected(status === "connected")
    if (status !== "connected") {
      setIsAuthorized(false)
      setBalance(null)
    }
  }

  const cleanupSubscriptions = async () => {
    if (balanceSubIdRef.current && clientRef.current) {
      try { await clientRef.current.forget(balanceSubIdRef.current) } catch (e) {}
      balanceSubIdRef.current = null
    }
  }

  const attemptConnection = async (client: DerivAPIClient, tok: string, accountId?: string) => {
    try {
      initAttemptRef.current++
      console.log(`[ProfitHub] Connection attempt ${initAttemptRef.current}`)

      await cleanupSubscriptions()
      await client.connect()
      const account = await client.authorize(tok, accountId || "")
      console.log(`[ProfitHub] Authorized — ${account.loginid} (${account.currency})`)

      if (isMountedRef.current) {
        setIsAuthorized(true)
        setError(null)
        initAttemptRef.current = 0

        // Subscribe to balance
        try {
          const subId = await client.subscribeBalance((bal) => {
            setBalance({ amount: bal.balance, currency: bal.currency })
          })
          balanceSubIdRef.current = subId
        } catch (e) {
          console.error("[ProfitHub] Balance subscription failed:", e)
        }
      }
    } catch (err: any) {
      console.error("[ProfitHub] Connection/Auth failed:", err)
      if (isMountedRef.current) {
        const msg = err?.message ?? "Failed to connect"
        setError(msg)
        if (initAttemptRef.current >= 10) {
          setError("Failed to connect after 10 attempts. Please verify your API token.")
          safeSetStatus("disconnected")
        }
      }
    }
  }

  const reconnect = () => {
    if (!clientRef.current || !token) return
    initAttemptRef.current = 0
    setError(null)
    attemptConnection(clientRef.current, token, activeLoginId || "")
  }

  useEffect(() => {
    isMountedRef.current = true

    if (token && isLoggedIn && token.length > 10) {
      if (!globalAPIClient) {
        console.log("[ProfitHub] Creating DerivAPIClient")
        globalAPIClient = new DerivAPIClient({
          appId: DERIV_APP_ID.toString(),
          token,
        })

        // Register status/error callbacks
        globalAPIClient.setStatusCallback((status) => {
          safeSetStatus(status)
        })

        globalAPIClient.setErrorCallback((err) => {
          console.error("[ProfitHub] API error:", err)
          if (isMountedRef.current) {
            setError(err?.message ?? JSON.stringify(err))
          }
        })
      }

      clientRef.current = globalAPIClient

      attemptConnection(globalAPIClient, token, activeLoginId || "")
    }

    return () => {
      isMountedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isLoggedIn])

  return (
    <DerivAPIContext.Provider
      value={{
        apiClient: clientRef.current,
        isConnected,
        isAuthorized,
        balance,
        error,
        connectionStatus,
        reconnect,
      }}
    >
      {children}
    </DerivAPIContext.Provider>
  )
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useDerivAPI() {
  const context = useContext(DerivAPIContext)
  if (!context) {
    throw new Error("useDerivAPI must be used within a <DerivAPIProvider>")
  }
  return context
}
