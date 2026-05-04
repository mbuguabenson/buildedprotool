/**
 * ProfitHub Deriv API Client
 * Upgraded for New Deriv Options API (v1)
 * REST OTP + WebSocket flow.
 */

import { DERIV_API } from "./deriv-config"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DerivAPIConfig {
  appId: string
  token?: string
  accountId?: string
}

export interface AuthorizeResponse {
  loginid: string
  balance: number
  currency: string
  is_virtual: boolean
  email: string
}

export interface ActiveSymbol {
  symbol: string
  display_name: string
  market: string
  market_display_name: string
}

export interface ProposalResponse {
  id: string
  ask_price: number | string
  payout: number | string
  spot: number | string
  spot_time: number | string
  longcode: string
}

export interface TickData {
  symbol: string
  quote: number | string
  epoch: number | string
}

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "reconnecting"

// ─── DerivAPIClient ────────────────────────────────────────────────────────────

export class DerivAPIClient {
  private ws: WebSocket | null = null
  private reqId = 0
  private pendingRequests = new Map<
    number,
    { resolve: (value: any) => void; reject: (reason: any) => void; timer: ReturnType<typeof setTimeout> }
  >()
  private subscriptions = new Map<string, (data: any) => void>()
  private config: DerivAPIConfig
  private isAuthorised = false
  private messageQueue: any[] = []
  private onErrorCallback?: (error: any) => void
  private onStatusChangeCallback?: (status: ConnectionStatus) => void
  private isConnecting = false
  private connectionPromise: Promise<void> | null = null
  private _status: ConnectionStatus = "disconnected"

  constructor(config: DerivAPIConfig) {
    this.config = { ...config }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private setStatus(status: ConnectionStatus) {
    this._status = status
    this.onStatusChangeCallback?.(status)
  }

  private async fetchOTP(accountId: string, token: string): Promise<string> {
    const url = `${DERIV_API.REST_BASE}/trading/v1/options/accounts/${accountId}/otp`
    console.log(`[ProfitHub] 🔑 Fetching OTP for ${accountId}...`)

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Deriv-App-ID": this.config.appId,
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.errors?.[0]?.message || `OTP request failed (${response.status})`)
    }

    const { data } = await response.json()
    return data.url
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  setStatusCallback(cb: (s: ConnectionStatus) => void) { this.onStatusChangeCallback = cb }
  setErrorCallback(cb: (e: any) => void) { this.onErrorCallback = cb }

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) return Promise.resolve()
    if (this.connectionPromise) return this.connectionPromise

    this.connectionPromise = new Promise(async (resolve, reject) => {
      this.isConnecting = true
      this.setStatus("connecting")

      try {
        let wsUrl = DERIV_API.PUBLIC_WS

        if (this.config.token && this.config.accountId) {
          try {
            wsUrl = await this.fetchOTP(this.config.accountId, this.config.token)
            this.isAuthorised = true
          } catch (e) {
            console.error("[ProfitHub] OTP Error:", e)
            wsUrl = DERIV_API.PUBLIC_WS
          }
        }

        console.log(`[ProfitHub] 🔌 Connecting to ${wsUrl.split("?")[0]}`)
        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          console.log("[ProfitHub] ✅ Connected")
          this.isConnecting = false
          this.connectionPromise = null
          this.setStatus("connected")
          while (this.messageQueue.length > 0) {
            const m = this.messageQueue.shift()
            if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(m))
          }
          resolve()
        }

        this.ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data)
            this.handleMessage(msg)
          } catch (err) {
            console.error("[ProfitHub] WS JSON Error", err)
          }
        }

        this.ws.onerror = (err) => {
          this.setStatus("disconnected")
          this.isConnecting = false
          this.connectionPromise = null
          reject(err)
        }

        this.ws.onclose = () => {
          this.setStatus("disconnected")
          this.isConnecting = false
          this.connectionPromise = null
        }
      } catch (err) {
        this.setStatus("disconnected")
        this.isConnecting = false
        this.connectionPromise = null
        reject(err)
      }
    })

    return this.connectionPromise
  }

  private handleMessage(msg: any) {
    console.log("[ProfitHub] WS Received:", JSON.stringify(msg))
    if (msg.req_id && this.pendingRequests.has(msg.req_id)) {
      const { resolve, timer } = this.pendingRequests.get(msg.req_id)!
      clearTimeout(timer)
      resolve(msg)
      this.pendingRequests.delete(msg.req_id)
    }

    if (msg.msg_type === "tick" && msg.subscription?.id) {
      const cb = this.subscriptions.get(msg.subscription.id)
      if (cb) cb(msg)
    }
  }

  async send(request: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const req_id = ++this.reqId
      const payload = { ...request, req_id }
      
      const timer = setTimeout(() => {
        if (this.pendingRequests.has(req_id)) {
          this.pendingRequests.delete(req_id)
          reject(new Error("Timeout"))
        }
      }, 30000)

      this.pendingRequests.set(req_id, { resolve, reject, timer })

      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(payload))
      } else {
        this.messageQueue.push(payload)
      }
    })
  }

  async authorize(token: string, accountId: string): Promise<AuthorizeResponse> {
    this.config.token = token
    this.config.accountId = accountId
    await this.disconnect()
    await this.connect()
    return {
      loginid: accountId,
      balance: 0,
      currency: "USD",
      is_virtual: accountId.startsWith("VRT") || accountId.startsWith("DOT"),
      email: "",
    }
  }

  async getActiveSymbols(): Promise<ActiveSymbol[]> {
    const res = await this.send({ active_symbols: "brief" })
    return res.active_symbols || []
  }

  async subscribeTicks(symbol: string, cb: (tick: any) => void): Promise<string> {
    const res = await this.send({ ticks: symbol, subscribe: 1 })
    const subId = res.subscription.id
    this.subscriptions.set(subId, (msg) => {
      if (msg.tick) cb(msg.tick)
    })
    return subId
  }

  async disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.isAuthorised = false
    this.setStatus("disconnected")
  }
}
