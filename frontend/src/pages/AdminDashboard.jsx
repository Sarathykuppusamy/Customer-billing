import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  createTransaction,
  getDailyRates,
  setDailyRates,
  getDashboardMetrics,
  getAllTransactions,
  getPendingPayments,
  searchCustomers,
  registerCustomer,
  markAsPaid
} from '../lib/supabase'
import '../index.css'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('entry')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Entry form state
  const [customerSearch, setCustomerSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustomerData, setNewCustomerData] = useState({
    name: '',
    phone: '',
    pin: '1234'
  })

  const [transactionForm, setTransactionForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'Karumbu',
    weight: '',
    rate: '',
    status: 'pending'
  })

  // Dashboard state
  const [metrics, setMetrics] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [pendingPayments, setPendingPayments] = useState([])
  const [dailyRates, setDailyRatesState] = useState({
    date: new Date().toISOString().split('T')[0],
    Karumbu: '',
    Cheti: '',
    Maram: ''
  })

  useEffect(() => {
    if (!user || !user.is_admin) {
      navigate('/login')
    } else {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const [metricsRes, transactionsRes, pendingRes, ratesRes] = await Promise.all([
        getDashboardMetrics(),
        getAllTransactions(),
        getPendingPayments(),
        getDailyRates(new Date().toISOString().split('T')[0])
      ])

      if (metricsRes.error) throw new Error(metricsRes.error)
      if (transactionsRes.error) throw new Error(transactionsRes.error)
      if (pendingRes.error) throw new Error(pendingRes.error)

      setMetrics(metricsRes.metrics)
      setTransactions(transactionsRes.transactions)
      setPendingPayments(pendingRes.pendingPayments)

      if (ratesRes.rates && ratesRes.rates.length > 0) {
        const rates = {}
        ratesRes.rates.forEach(r => {
          rates[r.drumstick_type] = r.rate_per_kg
        })
        setDailyRatesState(prev => ({
          ...prev,
          ...rates
        }))
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCustomerSearch = async (query) => {
    setCustomerSearch(query)
    if (query.length > 1) {
      const { customers } = await searchCustomers(query)
      setSearchResults(customers)
    } else {
      setSearchResults([])
    }
  }

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer)
    setCustomerSearch(customer.name)
    setSearchResults([])
  }

  const handleAddNewCustomer = async () => {
    try {
      const { customer, error: regError } = await registerCustomer(
        newCustomerData.name,
        newCustomerData.phone,
        newCustomerData.pin
      )
      if (regError) throw new Error(regError)
      
      setSelectedCustomer(customer)
      setShowNewCustomer(false)
      setNewCustomerData({ name: '', phone: '', pin: '1234' })
      setSuccess('Customer created successfully!')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleCreateTransaction = async (e) => {
    e.preventDefault()
    if (!selectedCustomer) {
      setError('Please select a customer')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { transaction, error: txError } = await createTransaction(
        selectedCustomer.id,
        {
          date: transactionForm.date,
          type: transactionForm.type,
          weight: parseFloat(transactionForm.weight),
          rate: parseFloat(transactionForm.rate),
          status: transactionForm.status
        }
      )

      if (txError) throw new Error(txError)

      setSuccess('Transaction created successfully!')
      setTransactionForm({
        date: new Date().toISOString().split('T')[0],
        type: 'Karumbu',
        weight: '',
        rate: '',
        status: 'pending'
      })
      setSelectedCustomer(null)
      setCustomerSearch('')

      // Reload data
      await loadDashboardData()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSetRates = async () => {
    setLoading(true)
    try {
      const rates = [
        { type: 'Karumbu', rate_per_kg: parseFloat(dailyRates.Karumbu) },
        { type: 'Cheti', rate_per_kg: parseFloat(dailyRates.Cheti) },
        { type: 'Maram', rate_per_kg: parseFloat(dailyRates.Maram) }
      ]
      const { error } = await setDailyRates(dailyRates.date, rates)
      if (error) throw new Error(error)
      setSuccess('Daily rates updated!')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsPaid = async (transactionId) => {
    try {
      const { error } = await markAsPaid(transactionId)
      if (error) throw new Error(error)
      setSuccess('Payment marked!')
      await loadDashboardData()
    } catch (err) {
      setError(err.message)
    }
  }

  if (!user || !user.is_admin) {
    return <div>Unauthorized</div>
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <div style={{
        width: '250px',
        backgroundColor: '#2d6a4f',
        color: 'white',
        padding: '20px',
        overflow: 'auto'
      }}>
        <h2>Admin Panel</h2>
        <p style={{ fontSize: '14px', marginBottom: '30px', opacity: 0.9 }}>
          Welcome, {user.name}
        </p>

        <nav style={{ marginBottom: '30px' }}>
          <button
            onClick={() => setActiveTab('entry')}
            style={{
              display: 'block',
              width: '100%',
              padding: '10px',
              marginBottom: '10px',
              background: activeTab === 'entry' ? 'rgba(255,255,255,0.2)' : 'none',
              border: 'none',
              color: 'white',
              textAlign: 'left',
              cursor: 'pointer'
            }}
          >
            📝 New Entry
          </button>
          <button
            onClick={() => setActiveTab('metrics')}
            style={{
              display: 'block',
              width: '100%',
              padding: '10px',
              marginBottom: '10px',
              background: activeTab === 'metrics' ? 'rgba(255,255,255,0.2)' : 'none',
              border: 'none',
              color: 'white',
              textAlign: 'left',
              cursor: 'pointer'
            }}
          >
            📊 Metrics
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            style={{
              display: 'block',
              width: '100%',
              padding: '10px',
              marginBottom: '10px',
              background: activeTab === 'pending' ? 'rgba(255,255,255,0.2)' : 'none',
              border: 'none',
              color: 'white',
              textAlign: 'left',
              cursor: 'pointer'
            }}
          >
            ⏳ Pending Payments
          </button>
          <button
            onClick={() => setActiveTab('rates')}
            style={{
              display: 'block',
              width: '100%',
              padding: '10px',
              marginBottom: '10px',
              background: activeTab === 'rates' ? 'rgba(255,255,255,0.2)' : 'none',
              border: 'none',
              color: 'white',
              textAlign: 'left',
              cursor: 'pointer'
            }}
          >
            💰 Set Rates
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            style={{
              display: 'block',
              width: '100%',
              padding: '10px',
              marginBottom: '10px',
              background: activeTab === 'transactions' ? 'rgba(255,255,255,0.2)' : 'none',
              border: 'none',
              color: 'white',
              textAlign: 'left',
              cursor: 'pointer'
            }}
          >
            📋 All Transactions
          </button>
        </nav>

        <button
          onClick={logout}
          className="btn-danger"
          style={{ width: '100%' }}
        >
          Logout
        </button>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '30px', overflow: 'auto' }}>
        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* New Entry Tab */}
        {activeTab === 'entry' && (
          <div>
            <h2>New Purchase Entry</h2>
            
            {/* Customer Selection */}
            <div className="card">
              <h3>1. Select Customer</h3>
              {!selectedCustomer ? (
                <>
                  <div className="form-group">
                    <label>Search Customer</label>
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => handleCustomerSearch(e.target.value)}
                      placeholder="Search by phone or name"
                    />
                  </div>

                  {searchResults.length > 0 && (
                    <div style={{
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      marginBottom: '20px'
                    }}>
                      {searchResults.map(customer => (
                        <button
                          key={customer.id}
                          onClick={() => handleSelectCustomer(customer)}
                          style={{
                            display: 'block',
                            width: '100%',
                            padding: '10px',
                            textAlign: 'left',
                            border: 'none',
                            borderBottom: '1px solid #ddd',
                            cursor: 'pointer',
                            backgroundColor: '#f9f9f9'
                          }}
                        >
                          {customer.name} ({customer.phone})
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => setShowNewCustomer(!showNewCustomer)}
                    className="btn-primary"
                  >
                    {showNewCustomer ? 'Cancel' : '+ Add New Customer'}
                  </button>

                  {showNewCustomer && (
                    <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f5f5f5' }}>
                      <div className="form-group">
                        <label>Name</label>
                        <input
                          type="text"
                          value={newCustomerData.name}
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                          placeholder="Customer name"
                        />
                      </div>
                      <div className="form-group">
                        <label>Phone</label>
                        <input
                          type="tel"
                          value={newCustomerData.phone}
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
                          placeholder="Phone number"
                        />
                      </div>
                      <button onClick={handleAddNewCustomer} className="btn-success">
                        Create Customer
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div style={{
                  padding: '15px',
                  backgroundColor: '#d4edda',
                  borderRadius: '4px'
                }}>
                  <strong>✓ Selected:</strong> {selectedCustomer.name} ({selectedCustomer.phone})
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    style={{
                      marginLeft: '10px',
                      background: 'none',
                      border: 'none',
                      color: '#155724',
                      textDecoration: 'underline',
                      cursor: 'pointer'
                    }}
                  >
                    Change
                  </button>
                </div>
              )}
            </div>

            {/* Transaction Form */}
            {selectedCustomer && (
              <form onSubmit={handleCreateTransaction} className="card">
                <h3>2. Enter Purchase Details</h3>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Date</label>
                    <input
                      type="date"
                      value={transactionForm.date}
                      onChange={(e) => setTransactionForm({ ...transactionForm, date: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Drumstick Type</label>
                    <select
                      value={transactionForm.type}
                      onChange={(e) => setTransactionForm({ ...transactionForm, type: e.target.value })}
                    >
                      <option value="Karumbu">Karumbu</option>
                      <option value="Cheti">Cheti</option>
                      <option value="Maram">Maram</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={transactionForm.weight}
                      onChange={(e) => setTransactionForm({ ...transactionForm, weight: e.target.value })}
                      placeholder="Enter weight"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Rate per kg (₹)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={transactionForm.rate}
                      onChange={(e) => setTransactionForm({ ...transactionForm, rate: e.target.value })}
                      placeholder="Enter rate"
                      required
                    />
                  </div>
                </div>

                {transactionForm.weight && transactionForm.rate && (
                  <div style={{
                    padding: '15px',
                    backgroundColor: '#f0f0f0',
                    borderRadius: '4px',
                    marginBottom: '20px'
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: '#666' }}>Gross Amount</div>
                        <div className="currency">
                          ₹{(parseFloat(transactionForm.weight || 0) * parseFloat(transactionForm.rate || 0)).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#666' }}>Commission (10%)</div>
                        <div className="commission">
                          ₹{((parseFloat(transactionForm.weight || 0) * parseFloat(transactionForm.rate || 0)) * 0.1).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#666' }}>Net to Pay</div>
                        <div className="net-amount">
                          ₹{((parseFloat(transactionForm.weight || 0) * parseFloat(transactionForm.rate || 0)) * 0.9).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>Payment Status</label>
                  <select
                    value={transactionForm.status}
                    onChange={(e) => setTransactionForm({ ...transactionForm, status: e.target.value })}
                  >
                    <option value="pending">Pending (will pay later)</option>
                    <option value="paid">Paid (cash given now)</option>
                  </select>
                </div>

                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Creating...' : '✓ Create Transaction'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Metrics Tab */}
        {activeTab === 'metrics' && (
          <div>
            <h2>Dashboard Metrics</h2>
            {metrics ? (
              <>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '20px',
                  marginBottom: '30px'
                }}>
                  <div className="card">
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                      Total Gross Income
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2d6a4f' }}>
                      ₹{metrics.totalGrossIncome.toFixed(2)}
                    </div>
                  </div>

                  <div className="card">
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                      Commission Collected (10%)
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#d62828' }}>
                      ₹{metrics.totalCommissionCollected.toFixed(2)}
                    </div>
                  </div>

                  <div className="card">
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                      Total Net Paid to Farmers
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#52b788' }}>
                      ₹{metrics.totalNetPaid.toFixed(2)}
                    </div>
                  </div>

                  <div className="card">
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                      Total Pending Payment
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ff9f1c' }}>
                      ₹{metrics.totalPending.toFixed(2)}
                    </div>
                  </div>

                  <div className="card">
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                      Total Weight Purchased
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2d6a4f' }}>
                      {metrics.totalWeight.toFixed(1)} kg
                    </div>
                  </div>
                </div>

                <h3>By Drumstick Type</h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '20px'
                }}>
                  {Object.entries(metrics.byType).map(([type, data]) => (
                    <div key={type} className="card">
                      <h4>{type}</h4>
                      <table style={{ fontSize: '14px', marginTop: '10px' }}>
                        <tbody>
                          <tr>
                            <td>Weight</td>
                            <td style={{ textAlign: 'right' }}>
                              <strong>{data.weight.toFixed(1)} kg</strong>
                            </td>
                          </tr>
                          <tr>
                            <td>Gross Amount</td>
                            <td style={{ textAlign: 'right' }}>
                              <strong>₹{data.gross.toFixed(2)}</strong>
                            </td>
                          </tr>
                          <tr style={{ backgroundColor: '#fff3cd' }}>
                            <td>Commission</td>
                            <td style={{ textAlign: 'right' }}>
                              <strong>₹{data.commission.toFixed(2)}</strong>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="spinner"></div>
            )}
          </div>
        )}

        {/* Pending Payments Tab */}
        {activeTab === 'pending' && (
          <div>
            <h2>Pending Payments</h2>
            {pendingPayments.length > 0 ? (
              <div style={{ overflow: 'x' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Farmer Name</th>
                      <th>Phone</th>
                      <th>Amount Pending (Net)</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingPayments.map(payment => (
                      <tr key={payment.customer.id}>
                        <td>{payment.customer.name}</td>
                        <td>{payment.customer.phone}</td>
                        <td>
                          <span className="net-amount">
                            ₹{payment.totalPending.toFixed(2)}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn-success"
                            onClick={() => handleMarkAsPaid(payment.customer.id)}
                            style={{ padding: '8px 12px' }}
                          >
                            Mark Paid
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="alert alert-success">No pending payments!</div>
            )}
          </div>
        )}

        {/* Set Rates Tab */}
        {activeTab === 'rates' && (
          <div>
            <h2>Set Daily Rates</h2>
            <div className="card">
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={dailyRates.date}
                  onChange={(e) => setDailyRatesState({ ...dailyRates, date: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Karumbu (₹/kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={dailyRates.Karumbu}
                    onChange={(e) => setDailyRatesState({ ...dailyRates, Karumbu: e.target.value })}
                    placeholder="Enter rate"
                  />
                </div>

                <div className="form-group">
                  <label>Cheti (₹/kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={dailyRates.Cheti}
                    onChange={(e) => setDailyRatesState({ ...dailyRates, Cheti: e.target.value })}
                    placeholder="Enter rate"
                  />
                </div>

                <div className="form-group">
                  <label>Maram (₹/kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={dailyRates.Maram}
                    onChange={(e) => setDailyRatesState({ ...dailyRates, Maram: e.target.value })}
                    placeholder="Enter rate"
                  />
                </div>
              </div>

              <button onClick={handleSetRates} className="btn-primary" disabled={loading}>
                {loading ? 'Saving...' : '💾 Save Rates'}
              </button>
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div>
            <h2>All Transactions</h2>
            {transactions.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Farmer</th>
                      <th>Type</th>
                      <th>Weight (kg)</th>
                      <th>Rate/kg</th>
                      <th>Gross Amount</th>
                      <th>Commission</th>
                      <th>Net Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(tx => (
                      <tr key={tx.id}>
                        <td>{tx.date}</td>
                        <td>{tx.customers?.name}</td>
                        <td>{tx.drumstick_type}</td>
                        <td>{tx.weight_kg}</td>
                        <td>₹{tx.rate_per_kg}</td>
                        <td><strong>₹{tx.gross_amount.toFixed(2)}</strong></td>
                        <td>
                          <span className="commission">₹{tx.commission_amount.toFixed(2)}</span>
                        </td>
                        <td>
                          <span className="net-amount">₹{tx.net_amount.toFixed(2)}</span>
                        </td>
                        <td>
                          <span className={`badge badge-${tx.status === 'paid' ? 'success' : 'warning'}`}>
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="alert alert-warning">No transactions yet</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
