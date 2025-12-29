import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PrimaryButton from '../../components/PrimaryButton.jsx'
import SecondaryButton from '../../components/SecondaryButton.jsx'
import { useAuth } from '../../contexts/AuthContext'
import VerificationAnimation from '../../components/VerificationAnimation.jsx'
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
        
        // Admin role should only login through AdminLogin page, not MainLogin
        if (userRole === 'admin') {
          setErrors({ 
            general: 'Admin accounts must login through the Admin Panel. Please use /admin/login' 
          })
          setIsLoading(false)
          return
        }
        
        // Define role categories (admin excluded - they use separate login)
        const companyRoles = ['owner']
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
        
        // Clear any leftover admin tokens when regular user logs in
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
                  <SecondaryButton type="button" style={{ marginLeft: '1rem' }}>
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
    </div>
  )
}

export default MainLogin
