import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

const invoke = async (functionName, body, token) => {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
    headers: token ? { 'x-session-token': token } : undefined
  })
  if (error || !data?.success) throw new Error(error?.message || data?.error || 'Request failed')
  return data
}

export const registerCustomer = async (name, phone, pin) => {
  try { const data = await invoke('register-customer', { name, phone, pin }); return { customer: data.customer, error: null } }
  catch (error) { return { customer: null, error: error.message } }
}

export const loginCustomer = async (phone, pin) => {
  try { const data = await invoke('verify-pin', { phone, pin }); return { customer: data.customer, token: data.token, error: null } }
  catch (error) { return { customer: null, token: null, error: error.message } }
}

const api = async (action, payload, token) => invoke('app-api', { action, ...payload }, token)
const result = async (action, payload, token, key) => {
  try { const data = await api(action, payload, token); return { [key]: data[key], error: null } }
  catch (error) { return { [key]: ['transactions', 'pendingPayments', 'rates', 'customers'].includes(key) ? [] : null, error: error.message } }
}

export const createTransaction = (customerId, transactionData, token) => result('create-transaction', { customerId, transactionData }, token, 'transaction')
export const getCustomerTransactions = (customerId, token) => result('customer-transactions', { customerId }, token, 'transactions')
export const getAllTransactions = (token) => result('all-transactions', {}, token, 'transactions')
export const getPendingPayments = (token) => result('pending-payments', {}, token, 'pendingPayments')
export const getDailyRates = (date, token) => result('daily-rates', { date }, token, 'rates')
export const getDashboardMetrics = (token) => result('dashboard-metrics', {}, token, 'metrics')
export const searchCustomers = (query, token) => result('search-customers', { query }, token, 'customers')

export const markCustomerAsPaid = async (customerId, token) => {
  try { await api('mark-customer-paid', { customerId }, token); return { success: true, error: null } }
  catch (error) { return { success: false, error: error.message } }
}

export const setDailyRates = async (date, rates, token) => {
  try { await api('set-daily-rates', { date, rates }, token); return { success: true, error: null } }
  catch (error) { return { success: false, error: error.message } }
}
