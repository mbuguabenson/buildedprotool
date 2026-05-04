"use client"

import { DERIV_APP_ID, DERIV_API } from "./deriv-config"

// ─── Types ─────────────────────────────────────────────────────────────────────

type MessageHandler = (message: any) => void

export interface TickData {
  quote: number
  lastDigit: number
  epoch: number
  symbol: string
}

// ─── DerivWebSocketManager ─────────────────────────────────────────────────────
/**
 * Singleton WebSocket manager used by use-deriv.ts for anonymous (no-auth)
 * tick streaming and market data.
 *
 * Key fixes vs the old version:
 * - req_id is always a numeric integer (Deriv rejects strings)
 * - tick subscription matching uses the server-returned subscription.id UUID
 * - Removed bogus `{ pong: 1 }` response (Deriv handles keep-alive via ping)
 * - App ID reads from DERIV_APP_ID config instead of being hard-coded
 */
export class DerivWebSocketManager {
  private static instance: DerivWebSocketManager | null = null

  private ws: WebSocket | null = null
  private messageHandlers: Map<string, MessageHandler[]> = new Map()
  private reconnectAttempts = 0
  private readonly maxReconnectAttempts = 10
  private readonly reconnectDelay = 2000
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null
  private lastMessageTime = Date.now()
  private messageQueue: any[] = []

  // req_id → { resolve, reject } for one-shot requests
  private pendingRequests = new Map<
    number,
    { resolve: (v: any) => void; reject: (e: any) => void; timer: ReturnType<typeof setTimeout> }
  >()

  // subscriptionId (server UUID) → tick callback
  private tickSubscriptions = new Map<string, (tick: TickData) => void>()

  // user-facing subscriptionId alias → server UUID
  private subscriptionAliases = new Map<string, string>()

  private reqCounter = 0
  private isConnecting = false

  private constructor() {}

  public static getInstance(): DerivWebSocketManager {
    if (!DerivWebSocketManager.instance) {
      DerivWebSocketManager.instance = new DerivWebSocketManager()
    }
    return DerivWebSocketManager.instance
  }

  // ── Connection ──────────────────────────────────────────────────────────────

  public connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) return Promise.resolve()
    if (this.isConnecting) return Promise.resolve()

    this.isConnecting = true

    return new Promise((resolve, reject) => {
      const wsUrl = DERIV_API.PUBLIC_WS
      console.log("[ProfitHub] Connecting to New Options Public WS:", wsUrl)

      let ws: WebSocket
      try {
        ws = new WebSocket(wsUrl)
        this.ws = ws
      } catch (err) {
        this.isConnecting = false
        reject(err)
        return
      }

      const timeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.error("[ProfitHub] WS Manager connection timeout")
          ws.close()
          this.isConnecting = false
          reject(new Error("Connection timeout"))
        }
      }, 10_000)

      ws.onopen = () => {
        clearTimeout(timeout)
        console.log("[ProfitHub] WS Manager connected ✓")
        this.reconnectAttempts = 0
        this.isConnecting = false
        this.lastMessageTime = Date.now()
        // this.startHeartbeat() // Disable for now
        this.processMessageQueue()
        resolve()
      }

      ws.onmessage = (event) => {
        try {
          this.lastMessageTime = Date.now()
          this.routeMessage(JSON.parse(event.data))
        } catch (err) {
          console.error("[ProfitHub] WS parse error:", err)
        }
      }

      ws.onerror = (err) => {
        clearTimeout(timeout)
        console.error("[ProfitHub] WS error:", err)
        this.isConnecting = false
        reject(err)
      }

      ws.onclose = () => {
        clearTimeout(timeout)
        console.log("[ProfitHub] WS closed, reconnecting...")
        this.isConnecting = false
        this.stopHeartbeat()

        // Reject all pending one-shot requests
        this.pendingRequests.forEach(({ reject: r, timer }) => {
          clearTimeout(timer)
          r(new Error("WebSocket closed"))
        })
        this.pendingRequests.clear()

        this.handleReconnect()
      }
    })
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("[ProfitHub] WS Manager max reconnect attempts reached")
      return
    }
    this.reconnectAttempts++
    const delay = Math.min(this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts), 30_000)
    console.log(`[ProfitHub] Reconnecting in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempts})`)
    setTimeout(() => this.connect().catch(console.error), delay)
  }

  // ── Heartbeat ───────────────────────────────────────────────────────────────

  private startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatInterval = setInterval(() => {
      if (Date.now() - this.lastMessageTime > 30_000) {
        console.warn("[ProfitHub] No messages for 30s, resetting connection")
        this.ws?.close()
        return
      }
      if (this.ws?.readyState === WebSocket.OPEN) {
        // Heartbeat is handled by the server in v1, 
        // but we keep the interval to monitor connection health.
      }
    }, 15_000)
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  // ── Sending ─────────────────────────────────────────────────────────────────

  private sendRaw(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log("[ProfitHub] WS Manager Sending:", JSON.stringify(message))
      this.ws.send(JSON.stringify(message))
    } else {
      console.log("[ProfitHub] WS Queueing:", JSON.stringify(message))
      this.messageQueue.push(message)
    }
  }

  /** Send a request and wait for its response (matched by integer req_id) */
  private request(payload: any, timeoutMs = 30_000): Promise<any> {
    return new Promise((resolve, reject) => {
      const req_id = ++this.reqCounter // always a safe integer
      const timer = setTimeout(() => {
        this.pendingRequests.delete(req_id)
        reject(new Error(`Request timeout (${Object.keys(payload)[0]})`))
      }, timeoutMs)

      this.pendingRequests.set(req_id, { resolve, reject, timer })
      this.sendRaw({ ...payload, req_id })
    })
  }

  private processMessageQueue() {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      this.ws!.send(JSON.stringify(this.messageQueue.shift()))
    }
  }

  // ── Message Routing ──────────────────────────────────────────────────────────

  private routeMessage(msg: any) {
    // Surface errors
    if (msg.error) {
      console.error("[ProfitHub] API error:", msg.error)
      const reqId = this.normalizeReqId(msg.req_id)
      if (reqId !== null && this.pendingRequests.has(reqId)) {
        const { reject: r, timer } = this.pendingRequests.get(reqId)!
        clearTimeout(timer)
        r(new Error(msg.error.message ?? JSON.stringify(msg.error)))
        this.pendingRequests.delete(reqId)
      }
      const handlers = this.messageHandlers.get("error") ?? []
      handlers.forEach((h) => h(msg))
      return
    }

    // Resolve one-shot requests
    const reqId = this.normalizeReqId(msg.req_id)
    if (reqId !== null && this.pendingRequests.has(reqId)) {
      const { resolve, timer } = this.pendingRequests.get(reqId)!
      clearTimeout(timer)
      resolve(msg)
      this.pendingRequests.delete(reqId)
    }

    // Route tick subscriptions by server-assigned subscription UUID
    if (msg.msg_type === "tick" && msg.subscription?.id) {
      const cb = this.tickSubscriptions.get(msg.subscription.id)
      if (cb && msg.tick) {
        const quote = msg.tick.quote
        cb({
          quote,
          lastDigit: this.extractLastDigit(quote),
          epoch: msg.tick.epoch,
          symbol: msg.tick.symbol,
        })
      }
    }

    // Route named handlers
    const type = msg.msg_type as string
    if (type) {
      const handlers = this.messageHandlers.get(type) ?? []
      handlers.forEach((h) => h(msg))
    }
  }

  private normalizeReqId(raw: any): number | null {
    if (raw === undefined || raw === null) return null
    const n = typeof raw === "string" ? parseInt(raw, 10) : raw
    return isNaN(n) ? null : n
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  public on(event: string, handler: MessageHandler) {
    if (!this.messageHandlers.has(event)) this.messageHandlers.set(event, [])
    this.messageHandlers.get(event)!.push(handler)
  }

  public off(event: string, handler: MessageHandler) {
    const list = this.messageHandlers.get(event)
    if (!list) return
    const i = list.indexOf(handler)
    if (i > -1) list.splice(i, 1)
  }

  public async subscribeTicks(symbol: string, callback: (tick: TickData) => void): Promise<string> {
    // Use request() so we get the server's subscription.id back reliably
    const response = await this.request({ ticks: symbol, subscribe: 1 })

    const serverSubId: string = response.subscription?.id
    if (!serverSubId) throw new Error("No subscription ID returned from server")

    // Register callback keyed by server UUID
    this.tickSubscriptions.set(serverSubId, callback)

    // Also handle the initial tick if returned in the subscription response
    if (response.tick) {
      const quote = response.tick.quote
      callback({
        quote,
        lastDigit: this.extractLastDigit(quote),
        epoch: response.tick.epoch,
        symbol: response.tick.symbol,
      })
    }

    console.log(`[ProfitHub] Subscribed to ${symbol} (${serverSubId})`)
    return serverSubId
  }

  public async unsubscribe(subscriptionId: string): Promise<void> {
    if (!subscriptionId) return
    const serverSubId = this.subscriptionAliases.get(subscriptionId) ?? subscriptionId
    this.tickSubscriptions.delete(serverSubId)
    this.subscriptionAliases.delete(subscriptionId)
    try {
      await this.request({ forget: serverSubId }, 5_000)
    } catch (_) {
      // Ignore forget errors — server may have already closed the subscription
    }
  }

  public async unsubscribeAll(): Promise<void> {
    this.tickSubscriptions.clear()
    this.subscriptionAliases.clear()
    try {
      await this.request({ forget_all: ["ticks", "candles"] }, 5_000)
    } catch (_) {}
  }

  public async getActiveSymbols(): Promise<any[]> {
    const response = await this.request({ active_symbols: "brief" })
    return response.active_symbols ?? []
  }

  public extractLastDigit(quote: number): number {
    const str = quote.toFixed(2).replace(".", "")
    const last = str[str.length - 1]
    const digit = parseInt(last, 10)
    return isNaN(digit) ? 0 : digit
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  public disconnect() {
    this.stopHeartbeat()
    this.unsubscribeAll().catch(() => {})
    if (this.ws) {
      this.ws.onclose = null
      this.ws.close()
      this.ws = null
    }
  }

  /** Convenience static method used by some components */
  public static subscribe(symbol: string, callback: (data: any) => void): () => void {
    const instance = DerivWebSocketManager.getInstance()
    let subscriptionId: string | null = null

    const init = async () => {
      if (!instance.isConnected()) await instance.connect()
      subscriptionId = await instance.subscribeTicks(symbol, callback)
    }

    init().catch((err) => console.error("[ProfitHub] Static subscribe error:", err))

    return () => {
      if (subscriptionId) {
        instance.unsubscribe(subscriptionId).catch(() => {})
      }
    }
  }
}

export const derivWebSocket = DerivWebSocketManager.getInstance()
