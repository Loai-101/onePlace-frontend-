import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PrimaryButton from '../../components/PrimaryButton.jsx'
import SecondaryButton from '../../components/SecondaryButton.jsx'
import { useAuth } from '../../contexts/AuthContext'
import { getApiUrl } from '../../utils/security'
import { usePopupFocus } from '../../hooks/usePopupFocus'
import './Login.css'

function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('')
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false)
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('')
  const [forgotPasswordError, setForgotPasswordError] = useState('')
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showErrorPopup, setShowErrorPopup] = useState(false)
  
  // Auto-focus popups when they open
  usePopupFocus(showForgotPassword, '.modal-content')
  usePopupFocus(showSuccessPopup)
  usePopupFocus(showErrorPopup)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    
    try {
      const result = await login(formData.email, formData.password)
      
      if (result.success) {
        console.log('✅ Login successful, user data:', result.data.user)
        
        // Small delay to ensure state is set
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Redirect based on user role
        if (result.data.user.role === 'admin' || result.data.user.role === 'owner') {
          console.log('🔄 Redirecting to /dashboard/owner')
          navigate('/dashboard/owner')
        } else if (result.data.user.role === 'accountant') {
          console.log('🔄 Redirecting to /dashboard/accountant')
          navigate('/dashboard/accountant')
        } else if (result.data.user.role === 'salesman') {
          console.log('🔄 Redirecting to /dashboard')
          navigate('/dashboard')
        } else {
          console.log('🔄 Redirecting to default /dashboard')
          navigate('/dashboard')
        }
      } else {
        setErrors({ general: result.error })
      }
    } catch (error) {
      console.error('Login error:', error)
      setErrors({ general: 'Network error. Please check your connection and try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    console.log('🔐 Forgot password form submitted')
    setForgotPasswordError('')
    setForgotPasswordMessage('')

    if (!forgotPasswordEmail.trim()) {
      setForgotPasswordError('Email is required')
      setShowErrorPopup(true)
      setTimeout(() => {
        setShowErrorPopup(false)
      }, 5000)
      return
    }

    if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(forgotPasswordEmail)) {
      setForgotPasswordError('Please enter a valid email')
      setShowErrorPopup(true)
      setTimeout(() => {
        setShowErrorPopup(false)
      }, 5000)
      return
    }

    setForgotPasswordLoading(true)
    console.log('📧 Sending forgot password request for:', forgotPasswordEmail)

    try {
      const apiUrl = getApiUrl()
      console.log('🌐 API URL:', `${apiUrl}/api/auth/forgotpassword`)
      
      const response = await fetch(`${apiUrl}/api/auth/forgotpassword`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: forgotPasswordEmail.trim().toLowerCase() })
      })

      console.log('📡 Response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Network error occurred' }))
        console.error('❌ API Error:', errorData)
        setForgotPasswordError(errorData.message || `Server error: ${response.status}`)
        setShowErrorPopup(true)
        setTimeout(() => {
          setShowErrorPopup(false)
        }, 5000)
        return
      }

      const data = await response.json()
      console.log('✅ Response data:', data)

      if (data.success) {
        console.log('✅ Password reset request submitted successfully')
        setForgotPasswordEmail('')
        setForgotPasswordError('')
        setForgotPasswordMessage('')
        setShowForgotPassword(false)
        setShowSuccessPopup(true)
        setTimeout(() => {
          setShowSuccessPopup(false)
        }, 5000)
      } else {
        console.error('❌ Request failed:', data.message)
        setForgotPasswordError(data.message || 'Error submitting password reset request')
        setShowErrorPopup(true)
        setTimeout(() => {
          setShowErrorPopup(false)
        }, 5000)
      }
    } catch (error) {
      console.error('❌ Forgot password error:', error)
      setForgotPasswordError(error.message || 'Network error. Please try again.')
      setShowErrorPopup(true)
      setTimeout(() => {
        setShowErrorPopup(false)
      }, 5000)
    } finally {
      setForgotPasswordLoading(false)
    }
  }

  return (
    <div className="login-form">
      <h1 className="page-title">Welcome Back</h1>
      
      {errors.general && (
        <div className="error-message">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input 
            type="email" 
            id="email" 
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter your email"
            className={errors.email ? 'error' : ''}
          />
          {errors.email && <span className="field-error">{errors.email}</span>}
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input 
            type="password" 
            id="password" 
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter your password"
            className={errors.password ? 'error' : ''}
          />
          {errors.password && <span className="field-error">{errors.password}</span>}
        </div>
        
        <div className="login-actions">
          <PrimaryButton type="submit" disabled={isLoading}>
            {isLoading ? 'Signing In...' : 'Sign In'}
          </PrimaryButton>
          <SecondaryButton 
            type="button" 
            style={{ marginLeft: '1rem' }}
            onClick={() => setShowForgotPassword(true)}
          >
            Forgot Password?
          </SecondaryButton>
        </div>
      </form>

      <div className="auth-switch">
        <p>Don't have an account? <Link to="/signup" className="auth-link">Sign up here</Link></p>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="modal-overlay" onClick={() => {
          if (!forgotPasswordLoading) {
            setShowForgotPassword(false)
            setForgotPasswordEmail('')
            setForgotPasswordError('')
            setForgotPasswordMessage('')
          }
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Forgot Password</h2>
              <button 
                className="modal-close" 
                onClick={() => {
                  if (!forgotPasswordLoading) {
                    setShowForgotPassword(false)
                    setForgotPasswordEmail('')
                    setForgotPasswordError('')
                    setForgotPasswordMessage('')
                  }
                }}
                disabled={forgotPasswordLoading}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleForgotPassword} id="forgot-password-form">
              <div className="form-group">
                <label htmlFor="forgot-email">Email</label>
                <input
                  type="email"
                  id="forgot-email"
                  value={forgotPasswordEmail}
                  onChange={(e) => {
                    setForgotPasswordEmail(e.target.value)
                    setForgotPasswordError('')
                  }}
                  placeholder="Enter your email"
                  disabled={forgotPasswordLoading}
                  required
                  autoComplete="email"
                />
                {forgotPasswordError && (
                  <span className="field-error">{forgotPasswordError}</span>
                )}
                {forgotPasswordMessage && (
                  <div className="success-message" style={{ marginTop: '10px' }}>
                    {forgotPasswordMessage}
                  </div>
                )}
              </div>
              <div className="form-actions" style={{ marginTop: '20px' }}>
                <PrimaryButton 
                  type="submit" 
                  disabled={forgotPasswordLoading}
                >
                  {forgotPasswordLoading ? 'Submitting...' : 'Submit Request'}
                </PrimaryButton>
                <SecondaryButton
                  type="button"
                  onClick={() => {
                    if (!forgotPasswordLoading) {
                      setShowForgotPassword(false)
                      setForgotPasswordEmail('')
                      setForgotPasswordError('')
                      setForgotPasswordMessage('')
                    }
                  }}
                  disabled={forgotPasswordLoading}
                >
                  Cancel
                </SecondaryButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="popup-overlay" onClick={() => setShowSuccessPopup(false)}>
          <div className="popup-content success-popup" onClick={(e) => e.stopPropagation()}>
            <div className="popup-icon success-icon">✓</div>
            <div className="popup-message">
              <h3>Request Submitted</h3>
              <p>Password reset request submitted successfully. An admin will review and reset your password.</p>
            </div>
            <button className="popup-close" onClick={() => setShowSuccessPopup(false)}>×</button>
          </div>
        </div>
      )}

      {/* Error Popup */}
      {showErrorPopup && (
        <div className="popup-overlay" onClick={() => setShowErrorPopup(false)}>
          <div className="popup-content error-popup" onClick={(e) => e.stopPropagation()}>
            <div className="popup-icon error-icon">✗</div>
            <div className="popup-message">
              <h3>Error</h3>
              <p>{forgotPasswordError || 'An error occurred. Please try again.'}</p>
            </div>
            <button className="popup-close" onClick={() => setShowErrorPopup(false)}>×</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Login
