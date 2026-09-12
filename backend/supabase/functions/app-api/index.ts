import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { requireSession } from "../_shared/auth.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "http://localhost:3000",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-token",
}
const types = new Set(["Karumbu", "Cheti", "Maram"])
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } })

const db = async (path: string, options: RequestInit = {}) => {
  const url = Deno.env.get("SUPABASE_URL")
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!url || !key) throw new Error("Server configuration is incomplete")
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${key}`, apikey: key, ...(options.headers || {}) },
  })
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || "Database request failed")
  if (response.status === 204) return null
  const responseBody = await response.text()
  return responseBody ? JSON.parse(responseBody) : null
}

const currentUser = async (request: Request) => {
  const session = await requireSession(request)
  const rows = await db(`customers?id=eq.${encodeURIComponent(session.sub)}&select=id,is_admin`)
  const user = rows[0]
  if (!user) throw new Error("Unauthorized")
  return user as { id: string; is_admin: boolean }
}
const requireAdmin = async (request: Request) => {
  const user = await currentUser(request)
  if (!user.is_admin) throw new Error("Forbidden")
  return user
}

serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  try {
    const body = await request.json()
    const { action } = body
    if (action === "customer-transactions") {
      const user = await currentUser(request)
      if (body.customerId !== user.id) throw new Error("Forbidden")
      return json({ success: true, transactions: await db(`transactions?customer_id=eq.${encodeURIComponent(user.id)}&select=*&order=date.desc`) })
    }
    if (action === "daily-rates") {
      await currentUser(request)
      return json({ success: true, rates: await db(`daily_rates?date=eq.${encodeURIComponent(body.date)}&select=*`) })
    }

    await requireAdmin(request)
    if (action === "all-transactions") return json({ success: true, transactions: await db("transactions?select=*,customers(id,name,phone)&order=date.desc") })
    if (action === "pending-payments") {
      const transactions = await db("transactions?status=eq.pending&select=customer_id,customers(id,name,phone),net_amount")
      const grouped: Record<string, { customer: unknown; totalPending: number }> = {}
      for (const tx of transactions) {
        if (!grouped[tx.customer_id]) grouped[tx.customer_id] = { customer: tx.customers, totalPending: 0 }
        grouped[tx.customer_id].totalPending += Number(tx.net_amount)
      }
      return json({ success: true, pendingPayments: Object.values(grouped) })
    }
    if (action === "dashboard-metrics") {
      const transactions = await db("transactions?select=*")
      const metrics = { totalGrossIncome: 0, totalCommissionCollected: 0, totalNetPaid: 0, totalPending: 0, totalWeight: 0, byType: Object.fromEntries([...types].map((type) => [type, { weight: 0, gross: 0, commission: 0 }])) as Record<string, { weight: number; gross: number; commission: number }> }
      for (const tx of transactions) {
        const gross = Number(tx.gross_amount), commission = Number(tx.commission_amount), net = Number(tx.net_amount), weight = Number(tx.weight_kg)
        metrics.totalGrossIncome += gross; metrics.totalCommissionCollected += commission; metrics.totalWeight += weight
        if (tx.status === "paid") metrics.totalNetPaid += net; else metrics.totalPending += net
        if (metrics.byType[tx.drumstick_type]) { metrics.byType[tx.drumstick_type].weight += weight; metrics.byType[tx.drumstick_type].gross += gross; metrics.byType[tx.drumstick_type].commission += commission }
      }
      return json({ success: true, metrics })
    }
    if (action === "search-customers") {
      const query = String(body.query || "").trim()
      if (query.length < 2 || query.length > 80) throw new Error("Enter 2 to 80 search characters")
      const filter = encodeURIComponent(`(phone.ilike.*${query}*,name.ilike.*${query}*)`)
      return json({ success: true, customers: await db(`customers?select=id,name,phone&or=${filter}&limit=20`) })
    }
    if (action === "create-transaction") {
      const tx = body.transactionData || {}
      if (!types.has(tx.type) || !Number.isFinite(tx.weight) || tx.weight <= 0 || !Number.isFinite(tx.rate) || tx.rate <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(tx.date) || !["pending", "paid"].includes(tx.status || "pending")) throw new Error("Invalid transaction data")
      const transaction = await db("transactions", { method: "POST", headers: { "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ customer_id: body.customerId, date: tx.date, drumstick_type: tx.type, weight_kg: tx.weight, rate_per_kg: tx.rate, commission_percent: 10, status: tx.status || "pending" }) })
      return json({ success: true, transaction: transaction[0] })
    }
    if (action === "mark-customer-paid") {
      if (!body.customerId) throw new Error("Customer is required")
      await db(`transactions?customer_id=eq.${encodeURIComponent(body.customerId)}&status=eq.pending`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "paid" }) })
      return json({ success: true })
    }
    if (action === "set-daily-rates") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date) || !Array.isArray(body.rates) || body.rates.length !== 3 || body.rates.some((rate: { type: string; rate_per_kg: number }) => !types.has(rate.type) || !Number.isFinite(rate.rate_per_kg) || rate.rate_per_kg <= 0)) throw new Error("Invalid daily rates")
      await db("daily_rates?on_conflict=date,drumstick_type", { method: "POST", headers: { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" }, body: JSON.stringify(body.rates.map((rate: { type: string; rate_per_kg: number }) => ({ date: body.date, drumstick_type: rate.type, rate_per_kg: rate.rate_per_kg }))) })
      return json({ success: true })
    }
    throw new Error("Unknown action")
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed"
    const status = ["Unauthorized", "Session expired"].includes(message) ? 401 : ["Forbidden"].includes(message) ? 403 : 400
    return json({ success: false, error: message }, status)
  }
})
