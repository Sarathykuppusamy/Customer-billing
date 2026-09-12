import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import bcrypt from "npm:bcryptjs@2.4.3"

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "http://localhost:3000",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const rawBody = await req.text()
    if (!rawBody) {
      return new Response(JSON.stringify({ success: false, error: "Request body is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }
    let body: { name?: string; phone?: string; pin?: string }
    try {
      body = JSON.parse(rawBody)
    } catch {
      return new Response(JSON.stringify({ success: false, error: "Request body must be valid JSON" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }
    const { name, phone, pin } = body

    // Validate input
    if (!name || !phone || !pin) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Name, phone, and PIN are required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Validate PIN length
    if (typeof pin !== "string" || pin.length < 4) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "PIN must be at least 4 characters",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Hash PIN using bcrypt
    const pinHash = await bcrypt.hash(pin, 12)

    // Get Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Supabase service-role key is unavailable in this Edge Function")
    }

    // Check if phone already exists
    const checkResponse = await fetch(
      `${supabaseUrl}/rest/v1/customers?phone=eq.${encodeURIComponent(phone)}&select=id`,
      {
        headers: {
          Authorization: `Bearer ${supabaseServiceRoleKey}`,
          apikey: supabaseServiceRoleKey,
        },
      }
    )

    if (!checkResponse.ok) {
      throw new Error(`Customer lookup failed (${checkResponse.status})`)
    }
    const existing = await checkResponse.json().catch(() => [])

    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Phone number already registered",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Insert new customer
    const insertResponse = await fetch(`${supabaseUrl}/rest/v1/customers`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        apikey: supabaseServiceRoleKey,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        name,
        phone,
        pin_hash: pinHash,
        is_admin: false,
      }),
    })

    if (!insertResponse.ok) {
      const error = await insertResponse.json().catch(() => ({}))
      throw new Error(error.message || `Failed to create customer (${insertResponse.status})`)
    }

    const result = await insertResponse.json().catch(() => [])
    const customer = result[0]
    if (!customer) throw new Error("Customer was created but no record was returned")

    return new Response(
      JSON.stringify({
        success: true,
        customer: {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          is_admin: customer.is_admin,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  } catch (error) {
    console.error("Error:", error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})
