"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { DERIV_CONFIG, DERIV_API } from "@/lib/deriv-config"
import { DerivAPIClient } from "@/lib/deriv-api"

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Balance {
  amount: number
  currency: string
}

interface Account {
  id: string
  type: "Demo" | "Real"
  currency: string
  token?: string
}

// ─── PKCE Utils ────────────────────────────────────────────────────────────────

async function generatePKCE() {
  const array = crypto.getRandomValues(new Uint8Array(64))
  const codeVerifier = Array.from(array)
    .map((v) => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~"[v % 66])
    .join("")

  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier))
  const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")

  const state = crypto.getRandomValues(new Uint8Array(16)).reduce((s, b) => s + b.toString(16).padStart(2, "0"), "")

  return { codeVerifier, codeChallenge, state }
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useDerivAuth() {
  const [token, setToken] = useState<string>("")
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [accountType, setAccountType] = useState<"Demo" | "Real" | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [activeLoginId, setActiveLoginId] = useState<string | null>(null)
  const [showTokenModal, setShowTokenModal] = useState(false)

  const clientRef = useRef<DerivAPIClient | null>(null)
  const balanceSubIdRef = useRef<string | null>(null)

  const _initClient = useCallback((): DerivAPIClient => {
    if (!clientRef.current) {
      clientRef.current = new DerivAPIClient({
        appId: DERIV_CONFIG.APP_ID,
      })
    }
    return clientRef.current
  }, [])

  const _disconnectClient = useCallback(async () => {
    if (balanceSubIdRef.current && clientRef.current) {
      try { await clientRef.current.forget(balanceSubIdRef.current) } catch (e) {}
      balanceSubIdRef.current = null
    }
    if (clientRef.current) {
      await clientRef.current.disconnect()
      clientRef.current = null
    }
  }, [])

  const connectWithToken = useCallback(
    async (apiToken: string, accountId?: string) => {
      if (!apiToken) return

      try {
        await _disconnectClient()
        const client = _initClient()
        
        console.log(`[ProfitHub] 🔌 Authenticating for ${accountId || "primary account"}...`)
        
        // In New Options API, authorize re-connects via OTP
        const auth = await client.authorize(apiToken, accountId || "")

        setToken(apiToken)
        setAccountType(auth.is_virtual ? "Demo" : "Real")
        setActiveLoginId(auth.loginid)
        setIsLoggedIn(true)
        setShowTokenModal(false)
        
        localStorage.setItem("deriv_api_token", apiToken)
        localStorage.setItem("deriv_account_id", auth.loginid)

        // Fetch real accounts list
        try {
          const restAccounts = await client.fetchAccounts()
          setAccounts(restAccounts.map(acc => ({
            id: acc.account_id,
            type: acc.account_type === "demo" ? "Demo" : "Real",
            currency: acc.currency,
            token: apiToken
          })))
        } catch (e) {
          console.error("[ProfitHub] Failed to fetch accounts:", e)
          setAccounts([{ id: auth.loginid, type: auth.is_virtual ? "Demo" : "Real", currency: auth.currency, token: apiToken }])
        }

      } catch (err: any) {
        console.error("[ProfitHub] ❌ Auth failed:", err)
        setShowTokenModal(true)
      }
    },
    [_initClient, _disconnectClient],
  )

  const resetDemoBalance = async () => {
    if (!activeLoginId || !clientRef.current || accountType !== "Demo") return
    try {
      await clientRef.current.resetDemoBalance(activeLoginId)
      console.log("[ProfitHub] ✅ Demo balance reset successful")
    } catch (e) {
      console.error("[ProfitHub] ❌ Reset failed:", e)
    }
  }

  const login = async () => {
    const { codeVerifier, codeChallenge, state } = await generatePKCE()
    
    sessionStorage.setItem("pkce_code_verifier", codeVerifier)
    sessionStorage.setItem("oauth_state", state)

    const params = new URLSearchParams({
      response_type: "code",
      client_id: DERIV_CONFIG.APP_ID,
      redirect_uri: DERIV_CONFIG.REDIRECT_URL,
      scope: "trade account_manage",
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    })

    const authUrl = `${DERIV_API.AUTH_URL}?${params.toString()}`
    console.log("[ProfitHub] 🚀 Redirecting to Deriv OAuth...")
    window.location.href = authUrl
  }

  const logout = useCallback(async () => {
    localStorage.removeItem("deriv_api_token")
    localStorage.removeItem("deriv_account_id")
    setToken("")
    setIsLoggedIn(false)
    setBalance(null)
    setAccountType(null)
    setActiveLoginId(null)
    setAccounts([])
    await _disconnectClient()
    setShowTokenModal(true)
  }, [_disconnectClient])

  // ── Bootstrap ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (typeof window === "undefined") return

    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get("code")
      const state = urlParams.get("state")
      
      if (code) {
        const storedState = sessionStorage.getItem("oauth_state")
        const codeVerifier = sessionStorage.getItem("pkce_code_verifier")

        if (state !== storedState) {
          console.error("[ProfitHub] ❌ OAuth State Mismatch!")
          return
        }

        console.log("[ProfitHub] 🪙 Exchanging code for token...")
        try {
          const res = await fetch("/api/auth/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code,
              code_verifier: codeVerifier,
              client_id: DERIV_CONFIG.APP_ID,
              redirect_uri: DERIV_CONFIG.REDIRECT_URL,
            }),
          })

          const data = await res.json()
          if (data.access_token) {
            console.log("[ProfitHub] ✅ Token exchange successful")
            sessionStorage.removeItem("pkce_code_verifier")
            sessionStorage.removeItem("oauth_state")
            
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname)
            
            connectWithToken(data.access_token)
          } else {
            throw new Error(data.error || "Token exchange failed")
          }
        } catch (err) {
          console.error("[ProfitHub] ❌ Token Exchange Failed:", err)
        }
      } else {
        // Restore existing session
        const storedToken = localStorage.getItem("deriv_api_token")
        const storedAcct = localStorage.getItem("deriv_account_id")
        if (storedToken) {
          connectWithToken(storedToken, storedAcct || undefined)
        } else {
          setShowTokenModal(true)
        }
      }
    }

    handleOAuthCallback()

    return () => { _disconnectClient() }
  }, [])

  return {
    token,
    isLoggedIn,
    balance,
    accountType,
    accounts,
    activeLoginId,
    showTokenModal,
    setShowTokenModal,
    login,
    logout,
    resetDemoBalance,
    switchAccount: (loginId: string, token: string) => connectWithToken(token, loginId),
  }
}
