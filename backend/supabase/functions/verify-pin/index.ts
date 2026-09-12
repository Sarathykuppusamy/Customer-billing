import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import bcrypt from "npm:bcryptjs@2.4.3"
import { issueSession } from "../_shared/auth.ts"

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
    let body: { phone?: string; pin?: string }
    try {
      body = JSON.parse(rawBody)
    } catch {
      return new Response(JSON.stringify({ success: false, error: "Request body must be valid JSON" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }
    const { phone, pin } = body

    // Validate input
    if (!phone || !pin) {
      return new Response(
        JSON.stringify({ success: false, error: "Phone and PIN required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Supabase service-role key is unavailable in this Edge Function")
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/customers?phone=eq.${encodeURIComponent(phone)}&select=*`, {
      headers: {
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        apikey: supabaseServiceRoleKey,
      },
    })

    if (!response.ok) {
      throw new Error(`Customer lookup failed (${response.status})`)
    }
    const customers = await response.json().catch(() => [])

    if (!customers || customers.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Customer not found" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    const customer = customers[0]

    // Verify PIN using bcrypt
    const pinValid = await bcrypt.compare(pin, customer.pin_hash)

    if (!pinValid) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid PIN" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    const token = await issueSession(customer)
    return new Response(
      JSON.stringify({
        success: true,
        customer: {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          is_admin: customer.is_admin,
        },
        token,
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
