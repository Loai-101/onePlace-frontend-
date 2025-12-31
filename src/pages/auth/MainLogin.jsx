import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PrimaryButton from '../../components/PrimaryButton.jsx'
import SecondaryButton from '../../components/SecondaryButton.jsx'
import { useAuth } from '../../contexts/AuthContext'
import VerificationAnimation from '../../components/VerificationAnimation.jsx'
import { getApiUrl } from '../../utils/security'
import { usePopupFocus } from '../../hooks/usePopupFocus'
import './MainLogin.css'

function MainLogin() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [loginType, setLoginType] = useState(null) // null, 'employee', 'company'
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [showVerification, setShowVerification] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('')
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false)
  const [forgotPasswordError, setForgotPasswordError] = useState('')
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('')
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showErrorPopup, setShowErrorPopup] = useState(false)
  
  // Auto-focus popups when they open
  usePopupFocus(showForgotPassword, '.modal-content')
  usePopupFocus(showSuccessPopup)
  usePopupFocus(showErrorPopup)

  const handleLoginTypeSelect = (type) => {
    setLoginType(type)
    setErrors({})
    setFormData({ email: '', password: '' })
  }

  const handleBackToOptions = () => {
    setLoginType(null)
    setErrors({})
    setFormData({ email: '', password: '' })
  }

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

    // Validate that login type is selected
    if (!loginType) {
      setErrors({ general: 'Please select a login type first' })
      return
    }

    setIsLoading(true)
    
    try {
      const result = await login(formData.email, formData.password)
      
      if (result.success) {
        const userRole = result.data.user.role
        
        // Define role categories
        // Note: 'admin' role here refers to COMPANY admin (not platform admin)
        // Company admins login through MainLogin, platform admins use AdminLogin
        const companyRoles = ['owner', 'admin'] // Company owners and company admins
        const employeeRoles = ['salesman', 'accountant']
        
        // Validate login type matches user role
        if (loginType === 'company' && !companyRoles.includes(userRole)) {
          setErrors({ 
            general: 'This account is not authorized for company login. Please select "Login as Employee" instead.' 
          })
          setIsLoading(false)
          return
        }
        
        if (loginType === 'employee' && !employeeRoles.includes(userRole)) {
          setErrors({ 
            general: 'This account is not authorized for employee login. Please select "Login as Company" instead.' 
          })
          setIsLoading(false)
          return
        }
        
        // Clear any leftover platform admin tokens when company/employee user logs in
        // This ensures company admins don't access the control panel
        localStorage.removeItem('adminToken')
        localStorage.removeItem('adminData')
        
        // If validation passes, show verification animation
        setIsLoading(false)
        setShowVerification(true)
      } else {
        // Handle specific error messages
        let errorMessage = result.error || 'Login failed'
        
        // Check if it's a company approval issue
        if (result.data?.companyStatus) {
          if (result.data.companyStatus === 'pending') {
            errorMessage = 'Your company registration is pending approval. Please wait for admin approval before logging in. You will receive an email notification once approved.'
          } else if (result.data.companyStatus === 'rejected') {
            errorMessage = 'Your company registration was rejected. Please contact support for more information.'
          }
        }
        
        setErrors({ general: errorMessage })
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
    <div className="main-login-container">
      <div className="main-login-background">
        <div className="main-login-overlay"></div>
      </div>
      
      <div className="main-login-content">
        <div className="main-login-form">
          {/* Verification Animation - Inline within login form */}
          {showVerification && (
            <div className="verification-inline-wrapper">
              <VerificationAnimation
                message="Verifying credentials..."
                duration={2000}
                inline={true}
                size="small"
                onComplete={() => {
                  setShowVerification(false)
                  navigate('/welcome')
                }}
              />
            </div>
          )}
          
          {!showVerification && (
            <>
              <div className="main-login-header">
            <div className="main-login-logo-section">
              <img 
                src="https://res.cloudinary.com/dvybb2xnc/image/upload/v1759838355/OP_Logo_ec0wjg.png" 
                alt="OnePlace Logo" 
                className="main-login-logo"
              />
              <h1>OnePlace Platform</h1>
            </div>
            <p>Welcome to the OnePlace Platform</p>
            {!loginType && <p className="login-subtitle">Choose your login type</p>}
            {loginType && <p className="login-subtitle">Sign in to access your {loginType} account</p>}
          </div>
          
          {!loginType ? (
            // Show login options first
            <>
              <div className="company-registration-section">
                <div className="company-registration-card">
                  <h3>Company Registration</h3>
                  <p>Register your company to get started</p>
                  <Link to="/company/signup" className="registration-link">
                    Register Company
                  </Link>
                </div>
              </div>

              <div className="login-options">
                <div className="login-option" onClick={() => handleLoginTypeSelect('employee')}>
                  <h3>Login as Employee</h3>
                  <p>Access your employee account</p>
                  <button type="button" className="option-link">
                    Employee Login
                  </button>
                </div>
                
                <div className="login-option" onClick={() => handleLoginTypeSelect('company')}>
                  <h3>Login as Company</h3>
                  <p>Access your company account</p>
                  <button type="button" className="option-link">
                    Company Login
                  </button>
                </div>
              </div>
            </>
          ) : (
            // Show login form after selection
            <>
              <button 
                type="button" 
                onClick={handleBackToOptions}
                className="back-button"
              >
                ← Back to Options
              </button>
              
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
            </>
          )}
          </>
          )}
        </div>
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

export default MainLogin
