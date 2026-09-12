import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check localStorage for saved user
    const savedSession = localStorage.getItem('customer_billing_session')
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession)
        setUser(session.user)
        setToken(session.token)
      } catch {
        localStorage.removeItem('customer_billing_session')
      }
    }
    setLoading(false)
  }, [])

  const login = (customer, sessionToken) => {
    setUser(customer)
    setToken(sessionToken)
    localStorage.setItem('customer_billing_session', JSON.stringify({ user: customer, token: sessionToken }))
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('customer_billing_session')
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
