import { NextResponse } from "next/server"

/**
 * Server-side Route Handler for exchanging Deriv OAuth2 authorization code for tokens.
 * This prevents exposing the client secret (if any) and follows security best practices.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { code, code_verifier, client_id, redirect_uri } = body

    if (!code || !code_verifier || !client_id) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    const response = await fetch("https://auth.deriv.com/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id,
        code,
        code_verifier,
        redirect_uri,
      }).toString(),
    })

    const data = await response.json()
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("[ProfitHub] Token Exchange Error:", error)
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 })
  }
}
