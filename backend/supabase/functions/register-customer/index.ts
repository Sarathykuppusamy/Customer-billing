import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { name, phone, pin } = await req.json()

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
    if (pin.length < 4) {
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
    const pinHash = await bcrypt.hash(pin)

    // Get Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

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

    const existing = await checkResponse.json()

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
      const error = await insertResponse.json()
      throw new Error(error.message || "Failed to create customer")
    }

    const result = await insertResponse.json()
    const customer = result[0]

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
