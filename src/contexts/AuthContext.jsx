import { createContext, useContext, useState, useEffect } from 'react'
import { getApiUrl, safeJsonParse } from '../utils/security'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem('token')
        const storedUser = localStorage.getItem('user')
        
        if (storedToken && storedUser) {
          setToken(storedToken)
          const parsedUser = safeJsonParse(storedUser, null)
          if (!parsedUser) {
            // Invalid JSON, clear storage
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            setIsLoading(false)
            return
          }
          
          // If company is just an ID, fetch full company details
          if (parsedUser.company && typeof parsedUser.company === 'string') {
            try {
              const response = await fetch(`${getApiUrl()}/api/auth/me`, {
                headers: {
                  'Authorization': `Bearer ${storedToken}`,
                  'Content-Type': 'application/json'
                }
              })
              
              if (response.ok) {
                const data = await response.json()
                if (data.success && data.user) {
                  const updatedUser = {
                    ...parsedUser,
                    company: data.user.company
                  }
                  setUser(updatedUser)
                  localStorage.setItem('user', JSON.stringify(updatedUser))
                  return
                }
              }
            } catch (error) {
              console.error('Error fetching user company:', error)
            }
          }
          
          setUser(parsedUser)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        // Clear invalid data
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [])

  const login = async (email, password) => {
    try {
      const response = await fetch(`${getApiUrl()}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emailOrUsername: email, password }),
      })

      const data = await response.json()

      if (response.ok) {
        // Clear any leftover admin tokens when regular user logs in
        localStorage.removeItem('adminToken')
        localStorage.removeItem('adminData')
        
        setToken(data.token)
        setUser(data.user)
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        return { success: true, data }
      } else {
        // Return error with additional data for better error handling
        return { 
          success: false, 
          error: data.message || 'Login failed',
          data: {
            companyStatus: data.companyStatus,
            ...data
          } // Include full response data for company status checks
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'Network error. Please try again.' }
    }
  }

  const register = async (userData) => {
    try {
      const response = await fetch(`${getApiUrl()}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })

      const data = await response.json()

      if (response.ok) {
        return { success: true, data }
      } else {
        return { success: false, error: data.message || 'Registration failed' }
      }
    } catch (error) {
      console.error('Registration error:', error)
      return { success: false, error: 'Network error. Please try again.' }
    }
  }

  const registerCompany = async (companyData) => {
    const maxRetries = 3
    let lastError = null
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔍 Attempt ${attempt}/${maxRetries} - Sending registration data:`, {
          companyName: companyData.companyName,
          companyEmail: companyData.companyEmail,
          ownerUsername: companyData.ownerUsername,
          ownerEmail: companyData.ownerEmail
        })
        
        // Test backend connectivity first
        if (attempt === 1) {
          try {
            const healthResponse = await fetch(`${getApiUrl()}/health`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            })
            console.log('🏥 Backend health check:', healthResponse.status)
          } catch (healthError) {
            console.error('❌ Backend health check failed:', healthError)
            lastError = new Error('Cannot connect to server. Please ensure the backend is running on port 5000.')
            continue
          }
        }
        
        const response = await fetch(`${getApiUrl()}/api/companies/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(companyData),
        })

        console.log('📡 Registration response:', { 
          status: response.status, 
          statusText: response.statusText,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries())
        })

        let data
        try {
          data = await response.json()
          console.log('📋 Response data:', data)
        } catch (jsonError) {
          console.error('❌ Failed to parse JSON response:', jsonError)
          return { success: false, error: 'Invalid response from server' }
        }

        if (response.ok) {
          return { success: true, data }
        } else {
          console.log('❌ Registration failed with details:', data)
          
          // Handle specific error types
          if (data?.message?.includes('already exists')) {
            return { success: false, error: data.message }
          } else if (data?.message?.includes('validation')) {
            return { success: false, error: data.message }
          } else if (data?.errors && Array.isArray(data.errors)) {
            return { success: false, error: data.errors.join(', ') }
          } else {
            return { success: false, error: data?.message || 'Company registration failed' }
          }
        }
      } catch (error) {
        console.error(`❌ Company registration error (attempt ${attempt}):`, error)
        lastError = error
        
        // If this is not the last attempt, wait before retrying
        if (attempt < maxRetries) {
          console.log(`⏳ Waiting 2 seconds before retry ${attempt + 1}...`)
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }
    }
    
    // All retries failed
    console.error('❌ All registration attempts failed')
    return { 
      success: false, 
      error: lastError?.message?.includes('fetch') 
        ? 'Network error. Please check your connection and try again.' 
        : lastError?.message || 'Network error. Please check your connection and try again.' 
    }
  }

  const logout = async () => {
    try {
      // Call logout endpoint if token exists
      if (token) {
        await fetch(`${getApiUrl()}/api/auth/logout`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear local state regardless of API call result
      setToken(null)
      setUser(null)
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
  }

  const updateUser = (updatedUser) => {
    setUser(updatedUser)
    localStorage.setItem('user', JSON.stringify(updatedUser))
  }

  const isAuthenticated = () => {
    return !!token && !!user
  }

  const hasRole = (role) => {
    return user && user.role === role
  }

  const hasPermission = (resource, action) => {
    if (!user) return false
    if (user.role === 'owner') return true // Owner has all permissions
    return user.permissions && user.permissions[resource] && user.permissions[resource][action]
  }

  const value = {
    user,
    token,
    isLoading,
    login,
    register,
    registerCompany,
    logout,
    updateUser,
    isAuthenticated,
    hasRole,
    hasPermission
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
