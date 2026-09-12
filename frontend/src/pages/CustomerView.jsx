import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getCustomerTransactions } from '../lib/supabase'
import '../index.css'

export default function CustomerView() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [totalMetrics, setTotalMetrics] = useState({
    grossIncome: 0,
    commissionDeducted: 0,
    netReceived: 0,
    paidAmount: 0,
    pendingAmount: 0,
    totalWeight: 0
  })

  useEffect(() => {
    if (!user || user.is_admin) {
      navigate('/login')
    } else {
      loadTransactions()
    }
  }, [user])

  const loadTransactions = async () => {
    setLoading(true)
    try {
      const { transactions: txs, error: txError } = await getCustomerTransactions(user.id)
      if (txError) throw new Error(txError)

      setTransactions(txs)

      // Calculate totals
      const metrics = {
        grossIncome: 0,
        commissionDeducted: 0,
        netReceived: 0,
        paidAmount: 0,
        pendingAmount: 0,
        totalWeight: 0
      }

      txs.forEach(tx => {
        metrics.grossIncome += tx.gross_amount
        metrics.commissionDeducted += tx.commission_amount
        metrics.netReceived += tx.net_amount
        metrics.paidAmount += tx.status === 'paid' ? tx.net_amount : 0
        metrics.pendingAmount += tx.status === 'pending' ? tx.net_amount : 0
        metrics.totalWeight += tx.weight_kg
      })

      setTotalMetrics(metrics)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!user || user.is_admin) {
    return <div>Unauthorized</div>
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#2d6a4f',
        color: 'white',
        padding: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div className="container">
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h1 style={{ margin: '0 0 5px 0' }}>Customer Billing</h1>
              <p style={{ margin: 0, opacity: 0.9 }}>My Transaction History</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: '0 0 10px 0' }}>
                <strong>{user.name}</strong>
              </p>
              <button
                onClick={logout}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container">
        {error && <div className="alert alert-danger">{error}</div>}

        {/* Summary Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '40px',
          marginTop: '20px'
        }}>
          <div className="card">
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
              Total Weight Sold
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2d6a4f' }}>
              {totalMetrics.totalWeight.toFixed(1)} <span style={{ fontSize: '16px' }}>kg</span>
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
              Gross Income
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2d6a4f' }}>
              ₹{totalMetrics.grossIncome.toFixed(2)}
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
              Commission Deducted (10%)
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#d62828' }}>
              ₹{totalMetrics.commissionDeducted.toFixed(2)}
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
              Total to Be Paid
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#52b788' }}>
              ₹{totalMetrics.netReceived.toFixed(2)}
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
              Already Received
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#40916c' }}>
              ₹{totalMetrics.paidAmount.toFixed(2)}
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
              Still Pending
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ff9f1c' }}>
              ₹{totalMetrics.pendingAmount.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Commission Explanation */}
        <div className="card" style={{
          backgroundColor: '#fff3cd',
          borderLeft: '4px solid #ff9f1c',
          marginBottom: '30px'
        }}>
          <h3 style={{ color: '#856404', marginTop: '0' }}>📝 How the Commission Works</h3>
          <p style={{ color: '#856404', margin: '10px 0' }}>
            The shop owner takes a <strong>10% commission</strong> on every sale. Here's how it's calculated:
          </p>
          <ul style={{ color: '#856404', marginLeft: '20px' }}>
            <li><strong>Gross Amount</strong> = Weight (kg) × Rate per kg</li>
            <li><strong>Commission (10%)</strong> = Gross Amount × 0.10</li>
            <li><strong>Net Amount You Get</strong> = Gross Amount − Commission</li>
          </ul>
          <p style={{ color: '#856404', marginTop: '10px', fontSize: '13px' }}>
            Example: You sell 100 kg at ₹35/kg = ₹3,500 gross → ₹350 commission (10%) → ₹3,150 you receive
          </p>
        </div>

        {/* Transactions Table */}
        <div className="card">
          <h2 style={{ marginTop: '0' }}>My Transaction History</h2>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div className="spinner"></div>
            </div>
          ) : transactions.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Weight (kg)</th>
                    <th>Rate/kg (₹)</th>
                    <th>Gross Amount</th>
                    <th>Commission (10%)</th>
                    <th>Net Amount<br/>(You Receive)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, index) => (
                    <tr key={tx.id} style={{
                      backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white'
                    }}>
                      <td><strong>{tx.date}</strong></td>
                      <td>{tx.drumstick_type}</td>
                      <td>{tx.weight_kg.toFixed(2)}</td>
                      <td>₹{tx.rate_per_kg.toFixed(2)}</td>
                      <td><strong>₹{tx.gross_amount.toFixed(2)}</strong></td>
                      <td>
                        <span style={{ color: '#d62828', fontWeight: '600' }}>
                          −₹{tx.commission_amount.toFixed(2)}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: '#52b788', fontSize: '16px' }}>
                          ₹{tx.net_amount.toFixed(2)}
                        </strong>
                      </td>
                      <td>
                        <span className={`badge badge-${tx.status === 'paid' ? 'success' : 'warning'}`}>
                          {tx.status === 'paid' ? '✓ Paid' : '⏳ Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="alert alert-warning">
              📋 No transactions yet. Check back after your first sale!
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="card" style={{ marginTop: '30px' }}>
          <h3>❓ Questions?</h3>
          <ul>
            <li>
              <strong>How do I verify my transactions?</strong> All your sales are listed here with date, weight, rate, and amount. This is your permanent digital receipt.
            </li>
            <li>
              <strong>What does "Pending" mean?</strong> The sale was recorded but payment hasn't been made yet. "Paid" means you've already received the cash.
            </li>
            <li>
              <strong>Can I print or download my receipt?</strong> You can take a screenshot of any transaction or the entire list from your browser. Future updates will add PDF export.
            </li>
            <li>
              <strong>I lost my PIN - what do I do?</strong> Contact the shop owner to reset your account.
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
