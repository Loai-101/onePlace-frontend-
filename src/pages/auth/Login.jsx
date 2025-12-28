import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PrimaryButton from '../../components/PrimaryButton.jsx'
import SecondaryButton from '../../components/SecondaryButton.jsx'
import { useAuth } from '../../contexts/AuthContext'
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
          <SecondaryButton type="button" style={{ marginLeft: '1rem' }}>
            Forgot Password?
          </SecondaryButton>
        </div>
      </form>

      <div className="auth-switch">
        <p>Don't have an account? <Link to="/signup" className="auth-link">Sign up here</Link></p>
      </div>
    </div>
  )
}

export default Login
