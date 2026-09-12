import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Auth Functions
export const registerCustomer = async (name, phone, pin) => {
  try {
    // Check if customer already exists
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', phone)
      .single()

    if (existing) {
      throw new Error('Phone number already registered')
    }

    // Call edge function to hash PIN and create customer
    const { data, error: functionError } = await supabase.functions.invoke('register-customer', {
      body: { name, phone, pin }
    })

    if (functionError || !data.success) {
      throw new Error(functionError?.message || data?.error || 'Registration failed')
    }

    return { customer: data.customer, error: null }
  } catch (error) {
    return { customer: null, error: error.message }
  }
}

// Login function
export const loginCustomer = async (phone, pin) => {
  try {
    // Call edge function to verify PIN
    const { data, error: functionError } = await supabase.functions.invoke('verify-pin', {
      body: { phone, pin }
    })

    if (functionError || !data.success) {
      throw new Error(functionError?.message || data?.error || 'Invalid PIN')
    }

    // Get customer details
    const { data: customer, error } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', phone)
      .single()

    if (error || !customer) {
      throw new Error('Customer not found')
    }

    return { customer, error: null }
  } catch (error) {
    return { customer: null, error: error.message }
  }
}

// Transaction Functions
export const createTransaction = async (customerId, transactionData) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .insert([
        {
          customer_id: customerId,
          date: transactionData.date,
          drumstick_type: transactionData.type,
          weight_kg: transactionData.weight,
          rate_per_kg: transactionData.rate,
          commission_percent: 10,
          status: transactionData.status || 'pending'
        }
      ])
      .select()

    if (error) throw error
    return { transaction: data[0], error: null }
  } catch (error) {
    return { transaction: null, error: error.message }
  }
}

// Get customer transactions
export const getCustomerTransactions = async (customerId) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('customer_id', customerId)
      .order('date', { ascending: false })

    if (error) throw error
    return { transactions: data, error: null }
  } catch (error) {
    return { transactions: [], error: error.message }
  }
}

// Get all transactions (admin only)
export const getAllTransactions = async () => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        customers (id, name, phone)
      `)
      .order('date', { ascending: false })

    if (error) throw error
    return { transactions: data, error: null }
  } catch (error) {
    return { transactions: [], error: error.message }
  }
}

// Get pending payments
export const getPendingPayments = async () => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        customer_id,
        customers (id, name, phone),
        net_amount,
        status
      `)
      .eq('status', 'pending')
      .order('net_amount', { ascending: false })

    if (error) throw error
    
    // Group by customer
    const grouped = {}
    data.forEach(tx => {
      const customerId = tx.customer_id
      if (!grouped[customerId]) {
        grouped[customerId] = {
          customer: tx.customers,
          totalPending: 0
        }
      }
      grouped[customerId].totalPending += tx.net_amount
    })

    return { pendingPayments: Object.values(grouped), error: null }
  } catch (error) {
    return { pendingPayments: [], error: error.message }
  }
}

// Mark transaction as paid
export const markAsPaid = async (transactionId) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .update({ status: 'paid' })
      .eq('id', transactionId)
      .select()

    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// Get daily rates
export const getDailyRates = async (date) => {
  try {
    const { data, error } = await supabase
      .from('daily_rates')
      .select('*')
      .eq('date', date)

    if (error) throw error
    return { rates: data, error: null }
  } catch (error) {
    return { rates: [], error: error.message }
  }
}

// Set daily rates
export const setDailyRates = async (date, rates) => {
  try {
    // rates should be an array: [{ type, rate_per_kg }, ...]
    const data = rates.map(r => ({
      date,
      drumstick_type: r.type,
      rate_per_kg: r.rate_per_kg
    }))

    const { error } = await supabase
      .from('daily_rates')
      .upsert(data)

    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// Get dashboard metrics
export const getDashboardMetrics = async () => {
  try {
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')

    if (txError) throw txError

    const metrics = {
      totalGrossIncome: 0,
      totalCommissionCollected: 0,
      totalNetPaid: 0,
      totalPending: 0,
      totalWeight: 0,
      byType: {
        Karumbu: { weight: 0, gross: 0, commission: 0 },
        Cheti: { weight: 0, gross: 0, commission: 0 },
        Maram: { weight: 0, gross: 0, commission: 0 }
      }
    }

    transactions.forEach(tx => {
      metrics.totalGrossIncome += tx.gross_amount
      metrics.totalCommissionCollected += tx.commission_amount
      metrics.totalNetPaid += tx.status === 'paid' ? tx.net_amount : 0
      metrics.totalPending += tx.status === 'pending' ? tx.net_amount : 0
      metrics.totalWeight += tx.weight_kg

      const type = tx.drumstick_type
      metrics.byType[type].weight += tx.weight_kg
      metrics.byType[type].gross += tx.gross_amount
      metrics.byType[type].commission += tx.commission_amount
    })

    return { metrics, error: null }
  } catch (error) {
    return { metrics: null, error: error.message }
  }
}

// Search customers
export const searchCustomers = async (query) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .or(`phone.ilike.%${query}%,name.ilike.%${query}%`)

    if (error) throw error
    return { customers: data, error: null }
  } catch (error) {
    return { customers: [], error: error.message }
  }
}
