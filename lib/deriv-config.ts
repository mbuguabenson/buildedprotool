/**
 * Deriv App ID / Client ID.
 * The new API uses: 32KGABH3pjSMkQ6JTotTG
 */
export const DERIV_APP_ID =
  process.env.NEXT_PUBLIC_DERIV_APP_ID || "32KGABH3pjSMkQ6JTotTG"

export const DERIV_REDIRECT_URL =
  typeof window !== "undefined" 
    ? (window.location.hostname.includes("vercel.app") ? window.location.origin : "https://buildedprotool.vercel.app")
    : "https://buildedprotool.vercel.app"

export const DERIV_CONFIG = {
  APP_ID: DERIV_APP_ID,
  REDIRECT_URL: DERIV_REDIRECT_URL,
} as const

// Official Deriv API Endpoints (New Options API v1)
export const DERIV_API = {
  /** REST API Base for OTP generation */
  REST_BASE: "https://api.derivws.com",
  /** Public WebSocket for anonymous market data */
  PUBLIC_WS: `wss://api.derivws.com/trading/v1/options/ws/public?app_id=${DERIV_APP_ID}`,
  /** OAuth authorization URL */
  AUTH_URL: "https://auth.deriv.com/oauth2/auth",
  /** OAuth token endpoint (used via our proxy) */
  TOKEN_URL: "https://auth.deriv.com/oauth2/token",
  
  // Legacy endpoints (keeping for backward compatibility)
  LEGACY_WS: "wss://ws.derivws.com/websockets/v3",
} as const

export const DERIV_PLATFORMS = {
  DTRADER: "https://app.deriv.com",
  DBOT: "https://app.deriv.com/bot",
  SMARTTRADER: "https://smarttrader.deriv.com",
} as const

export const DERIV_REPOS = {
  MAIN_APP: { name: "deriv-app", url: "https://github.com/deriv-com/deriv-app" },
  DBOT: { name: "deriv-bot", url: "https://github.com/deriv-com/deriv-bot" },
  SMARTTRADER: { name: "deriv-smarttrader", url: "https://github.com/deriv-com/deriv-smarttrader" },
  COPYTRADING: { name: "copy-trading", url: "https://github.com/deriv-com/copy-trading" },
  API: { name: "deriv-api", url: "https://github.com/deriv-com/deriv-api" },
} as const
