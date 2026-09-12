import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginCustomer, registerCustomer } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import '../index.css'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [isRegister, setIsRegister] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    pin: '',
    pinConfirm: ''
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (!formData.phone || !formData.pin) {
        throw new Error('Please enter phone and PIN')
      }

      const { customer, error: loginError } = await loginCustomer(formData.phone, formData.pin)
      
      if (loginError) {
        throw new Error(loginError)
      }

      if (customer) {
        login(customer)
        navigate(customer.is_admin ? '/admin' : '/customer')
      }
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (!formData.name || !formData.phone || !formData.pin) {
        throw new Error('Please fill all fields')
      }

      if (formData.pin !== formData.pinConfirm) {
        throw new Error('PINs do not match')
      }

      if (formData.pin.length < 4) {
        throw new Error('PIN must be at least 4 digits')
      }

      const { customer, error: registerError } = await registerCustomer(
        formData.name,
        formData.phone,
        formData.pin
      )

      if (registerError) {
        throw new Error(registerError)
      }

      setSuccess('Registration successful! You can now login.')
      setFormData({ name: '', phone: '', pin: '', pinConfirm: '' })
      setIsRegister(false)
    } catch (err) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5'
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: '400px',
        margin: '20px'
      }}>
        <h1 style={{
          textAlign: 'center',
          marginBottom: '30px',
          color: '#2d6a4f'
        }}>
          Customer Billing
        </h1>

        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={isRegister ? handleRegister : handleLogin}>
          {isRegister && (
            <div className="form-group">
              <label>Your Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
              />
            </div>
          )}

          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter phone number"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>PIN (4+ digits)</label>
            <input
              type="password"
              name="pin"
              value={formData.pin}
              onChange={handleChange}
              placeholder="Enter your PIN"
              disabled={loading}
            />
          </div>

          {isRegister && (
            <div className="form-group">
              <label>Confirm PIN</label>
              <input
                type="password"
                name="pinConfirm"
                value={formData.pinConfirm}
                onChange={handleChange}
                placeholder="Confirm your PIN"
                disabled={loading}
              />
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            style={{
              width: '100%',
              marginBottom: '15px'
            }}
            disabled={loading}
          >
            {loading ? 'Loading...' : isRegister ? 'Register' : 'Login'}
          </button>
        </form>

        <div style={{
          textAlign: 'center',
          marginTop: '20px',
          borderTop: '1px solid #ddd',
          paddingTop: '20px'
        }}>
          <p style={{ marginBottom: '10px', color: '#666' }}>
            {isRegister ? 'Already have an account?' : 'New user?'}
          </p>
          <button
            onClick={() => {
              setIsRegister(!isRegister)
              setError('')
              setSuccess('')
              setFormData({ name: '', phone: '', pin: '', pinConfirm: '' })
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#2d6a4f',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            {isRegister ? 'Login instead' : 'Register now'}
          </button>
        </div>

        <div style={{
          marginTop: '30px',
          padding: '15px',
          backgroundColor: '#f9f9f9',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#666'
        }}>
          <strong>Info:</strong>
          <ul style={{ marginTop: '10px', marginLeft: '20px' }}>
            <li>No app installation needed - use in your browser</li>
            <li>Save to home screen for mobile access</li>
            <li>Your data is securely stored online</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
