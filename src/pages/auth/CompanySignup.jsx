import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PrimaryButton from '../../components/PrimaryButton.jsx'
import SecondaryButton from '../../components/SecondaryButton.jsx'
import { useAuth } from '../../contexts/AuthContext'
import './CompanySignup.css'

function CompanySignup() {
  const navigate = useNavigate()
  const { registerCompany } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    // Company Information
    companyName: '',
    companyEmail: '',
    companyPhone: '',
    ibanNumber: '',
    bankName: '',
    vatNumber: '',
    crNumber: '',
    companyType: '',
    dueDate: '',
    companySize: '',
    businessTarget: '',
    numberOfUsers: '',
    
    // Address Information
    companyAddress: '',
    companyCity: '',
    companyCountry: 'Bahrain',
    postalCode: '',
    
    // Owner Information
    ownerName: '',
    ownerEmail: '',
    ownerUsername: '',
    ownerPassword: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

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

  const validateCurrentStep = () => {
    const newErrors = {}

    if (currentStep === 1) {
      // Company Information Validation
      if (!formData.companyName.trim()) {
        newErrors.companyName = 'Company name is required'
      }
      if (!formData.companyEmail.trim()) {
        newErrors.companyEmail = 'Company email is required'
      } else if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(formData.companyEmail)) {
        newErrors.companyEmail = 'Please enter a valid email'
      }
      if (!formData.companyPhone.trim()) {
        newErrors.companyPhone = 'Company phone is required'
      }
      if (!formData.companyType) {
        newErrors.companyType = 'Company type is required'
      }
      if (!formData.companySize) {
        newErrors.companySize = 'Company size is required'
      }
      if (!formData.businessTarget) {
        newErrors.businessTarget = 'Business target is required'
      }
      if (!formData.numberOfUsers) {
        newErrors.numberOfUsers = 'Number of users is required'
      } else if (parseInt(formData.numberOfUsers) < 1) {
        newErrors.numberOfUsers = 'Number of users must be at least 1'
      }
      if (!formData.dueDate) {
        newErrors.dueDate = 'CR Due Date is required'
      } else {
        const selectedDate = new Date(formData.dueDate)
        const today = new Date()
        const twoMonthsLater = new Date(today)
        twoMonthsLater.setMonth(today.getMonth() + 2)
        
        if (selectedDate < twoMonthsLater) {
          newErrors.dueDate = 'CR Due Date must be at least 2 months from today'
        }
      }
    } else if (currentStep === 2) {
      // Banking Information Validation
      if (!formData.ibanNumber.trim()) {
        newErrors.ibanNumber = 'IBAN number is required'
      }
      if (!formData.bankName.trim()) {
        newErrors.bankName = 'Bank name is required'
      }
      if (!formData.vatNumber.trim()) {
        newErrors.vatNumber = 'VAT number is required'
      }
      if (!formData.crNumber.trim()) {
        newErrors.crNumber = 'CR number is required'
      }
    } else if (currentStep === 3) {
      // Address Information Validation
      if (!formData.companyAddress.trim()) {
        newErrors.companyAddress = 'Company address is required'
      }
      if (!formData.companyCity.trim()) {
        newErrors.companyCity = 'Company city is required'
      }
      if (!formData.postalCode.trim()) {
        newErrors.postalCode = 'Postal code is required'
      }
    } else if (currentStep === 4) {
      // Owner Information Validation
      if (!formData.ownerName.trim()) {
        newErrors.ownerName = 'Owner name is required'
      }
      if (!formData.ownerEmail.trim()) {
        newErrors.ownerEmail = 'Owner email is required'
      } else if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(formData.ownerEmail)) {
        newErrors.ownerEmail = 'Please enter a valid email'
      }
      if (!formData.ownerUsername.trim()) {
        newErrors.ownerUsername = 'Owner username is required'
      } else if (formData.ownerUsername.length < 3) {
        newErrors.ownerUsername = 'Username must be at least 3 characters'
      }
      if (!formData.ownerPassword) {
        newErrors.ownerPassword = 'Password is required'
      } else if (formData.ownerPassword.length < 6) {
        newErrors.ownerPassword = 'Password must be at least 6 characters'
      }
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password'
      } else if (formData.ownerPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1)
  }

  const getMinDate = () => {
    const today = new Date()
    const twoMonthsLater = new Date(today)
    twoMonthsLater.setMonth(today.getMonth() + 2)
    return twoMonthsLater.toISOString().split('T')[0]
  }

  const handleSuccessPopupClose = () => {
    setShowSuccessPopup(false)
    navigate('/login')
  }

  const validateForm = () => {
    const newErrors = {}

    // Company Information Validation
    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required'
    }

    if (!formData.companyEmail.trim()) {
      newErrors.companyEmail = 'Company email is required'
    } else if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(formData.companyEmail)) {
      newErrors.companyEmail = 'Please enter a valid email'
    }

    if (!formData.companyPhone.trim()) {
      newErrors.companyPhone = 'Company phone is required'
    }

    if (!formData.ibanNumber.trim()) {
      newErrors.ibanNumber = 'IBAN number is required'
    }

    if (!formData.bankName.trim()) {
      newErrors.bankName = 'Bank name is required'
    }

    if (!formData.vatNumber.trim()) {
      newErrors.vatNumber = 'VAT number is required'
    }

    if (!formData.crNumber.trim()) {
      newErrors.crNumber = 'CR number is required'
    }

    if (!formData.companyType) {
      newErrors.companyType = 'Company type is required'
    }

    if (!formData.dueDate) {
      newErrors.dueDate = 'CR Due Date is required'
    } else {
      const selectedDate = new Date(formData.dueDate)
      const today = new Date()
      const twoMonthsLater = new Date(today)
      twoMonthsLater.setMonth(today.getMonth() + 2)
      
      if (selectedDate < twoMonthsLater) {
        newErrors.dueDate = 'CR Due Date must be at least 2 months from today'
      }
    }

    if (!formData.companySize) {
      newErrors.companySize = 'Company size is required'
    }

    if (!formData.businessTarget) {
      newErrors.businessTarget = 'Business target is required'
    }

    if (!formData.numberOfUsers) {
      newErrors.numberOfUsers = 'Number of users is required'
    } else if (parseInt(formData.numberOfUsers) < 1) {
      newErrors.numberOfUsers = 'Number of users must be at least 1'
    }

    // Address Information Validation
    if (!formData.companyAddress.trim()) {
      newErrors.companyAddress = 'Company address is required'
    }

    if (!formData.companyCity.trim()) {
      newErrors.companyCity = 'Company city is required'
    }

    if (!formData.postalCode.trim()) {
      newErrors.postalCode = 'Postal code is required'
    }

    // Owner Information Validation
    if (!formData.ownerName.trim()) {
      newErrors.ownerName = 'Owner name is required'
    }

    if (!formData.ownerEmail.trim()) {
      newErrors.ownerEmail = 'Owner email is required'
    } else if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(formData.ownerEmail)) {
      newErrors.ownerEmail = 'Please enter a valid email'
    }

    if (!formData.ownerUsername.trim()) {
      newErrors.ownerUsername = 'Owner username is required'
    } else if (formData.ownerUsername.length < 3) {
      newErrors.ownerUsername = 'Username must be at least 3 characters'
    }

    if (!formData.ownerPassword) {
      newErrors.ownerPassword = 'Password is required'
    } else if (formData.ownerPassword.length < 6) {
      newErrors.ownerPassword = 'Password must be at least 6 characters'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.ownerPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (currentStep === 4) {
      // Only submit on the final step
      if (!validateCurrentStep()) {
        return
      }

      setIsLoading(true)
      
      try {
        const result = await registerCompany(formData)
        
        if (result.success) {
          // Show success popup
          setShowSuccessPopup(true)
        } else {
          setErrors({ general: result.error })
        }
      } catch (error) {
        console.error('Registration error:', error)
        setErrors({ general: 'Network error. Please check your connection and try again.' })
      } finally {
        setIsLoading(false)
      }
    } else {
      // For other steps, just validate and move to next step
      handleNext()
    }
  }

  return (
    <div className="company-signup-container">
      <div className="company-signup-form">
        <div className="company-signup-header">
          <div className="company-signup-logo-section">
            <img 
              src="https://res.cloudinary.com/dvybb2xnc/image/upload/v1759838355/OP_Logo_ec0wjg.png" 
              alt="OnePlace Logo" 
              className="company-signup-logo"
            />
            <h1>Company Registration</h1>
          </div>
          <p>Register your company to get started</p>
        </div>
        
        {errors.general && (
          <div className="error-message">
            {errors.general}
          </div>
        )}

        {/* Step Progress Indicator */}
        <div className="step-progress">
          <div className="step-indicator">
            <div className={`step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
              <span>1</span>
              <label>Company Info</label>
            </div>
            <div className={`step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
              <span>2</span>
              <label>Banking</label>
            </div>
            <div className={`step ${currentStep >= 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''}`}>
              <span>3</span>
              <label>Address</label>
            </div>
            <div className={`step ${currentStep >= 4 ? 'active' : ''}`}>
              <span>4</span>
              <label>Owner Info</label>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Step 1: Company Information */}
          {currentStep === 1 && (
            <div className="form-section">
              <h3>Company Information</h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="companyName">Company Name *</label>
                  <input 
                    type="text" 
                    id="companyName" 
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="Enter company name"
                    className={errors.companyName ? 'error' : ''}
                  />
                  {errors.companyName && <span className="field-error">{errors.companyName}</span>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="companyEmail">Company Email *</label>
                  <input 
                    type="email" 
                    id="companyEmail" 
                    name="companyEmail"
                    value={formData.companyEmail}
                    onChange={handleChange}
                    placeholder="Enter company email"
                    className={errors.companyEmail ? 'error' : ''}
                  />
                  {errors.companyEmail && <span className="field-error">{errors.companyEmail}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="companyPhone">Company Phone *</label>
                  <input 
                    type="tel" 
                    id="companyPhone" 
                    name="companyPhone"
                    value={formData.companyPhone}
                    onChange={handleChange}
                    placeholder="Enter company phone"
                    className={errors.companyPhone ? 'error' : ''}
                  />
                  {errors.companyPhone && <span className="field-error">{errors.companyPhone}</span>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="companyType">Company Type *</label>
                  <select 
                    id="companyType" 
                    name="companyType"
                    value={formData.companyType}
                    onChange={handleChange}
                    className={errors.companyType ? 'error' : ''}
                  >
                    <option value="">Select company type</option>
                    <option value="llc">LLC</option>
                    <option value="corporation">Corporation</option>
                    <option value="partnership">Partnership</option>
                    <option value="sole-proprietorship">Sole Proprietorship</option>
                    <option value="non-profit">Non-Profit</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.companyType && <span className="field-error">{errors.companyType}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="companySize">Company Size *</label>
                  <select 
                    id="companySize" 
                    name="companySize"
                    value={formData.companySize}
                    onChange={handleChange}
                    className={errors.companySize ? 'error' : ''}
                  >
                    <option value="">Select company size</option>
                    <option value="startup">Startup</option>
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                  {errors.companySize && <span className="field-error">{errors.companySize}</span>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="businessTarget">Business Target *</label>
                  <select 
                    id="businessTarget" 
                    name="businessTarget"
                    value={formData.businessTarget}
                    onChange={handleChange}
                    className={errors.businessTarget ? 'error' : ''}
                  >
                    <option value="">Select business target</option>
                    <option value="medical-items">Medical Items</option>
                    <option value="pharmacy">Pharmacy</option>
                    <option value="collecting-orders">Collecting Orders</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.businessTarget && <span className="field-error">{errors.businessTarget}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="numberOfUsers">Number of Users *</label>
                  <input 
                    type="number" 
                    id="numberOfUsers" 
                    name="numberOfUsers"
                    value={formData.numberOfUsers}
                    onChange={handleChange}
                    placeholder="Enter number of users"
                    min="1"
                    className={errors.numberOfUsers ? 'error' : ''}
                  />
                  {errors.numberOfUsers && <span className="field-error">{errors.numberOfUsers}</span>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="dueDate">CR Due Date *</label>
                  <input 
                    type="date" 
                    id="dueDate" 
                    name="dueDate"
                    value={formData.dueDate}
                    onChange={handleChange}
                    min={getMinDate()}
                    className={errors.dueDate ? 'error' : ''}
                  />
                  {errors.dueDate && <span className="field-error">{errors.dueDate}</span>}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Banking Information */}
          {currentStep === 2 && (
            <div className="form-section">
              <h3>Banking Information</h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="ibanNumber">IBAN Number *</label>
                  <input 
                    type="text" 
                    id="ibanNumber" 
                    name="ibanNumber"
                    value={formData.ibanNumber}
                    onChange={handleChange}
                    placeholder="Enter IBAN number"
                    className={errors.ibanNumber ? 'error' : ''}
                  />
                  {errors.ibanNumber && <span className="field-error">{errors.ibanNumber}</span>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="bankName">Bank Name *</label>
                  <input 
                    type="text" 
                    id="bankName" 
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleChange}
                    placeholder="Enter bank name"
                    className={errors.bankName ? 'error' : ''}
                  />
                  {errors.bankName && <span className="field-error">{errors.bankName}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="vatNumber">VAT Number *</label>
                  <input 
                    type="text" 
                    id="vatNumber" 
                    name="vatNumber"
                    value={formData.vatNumber}
                    onChange={handleChange}
                    placeholder="Enter VAT number"
                    className={errors.vatNumber ? 'error' : ''}
                  />
                  {errors.vatNumber && <span className="field-error">{errors.vatNumber}</span>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="crNumber">CR Number *</label>
                  <input 
                    type="text" 
                    id="crNumber" 
                    name="crNumber"
                    value={formData.crNumber}
                    onChange={handleChange}
                    placeholder="Enter CR number"
                    className={errors.crNumber ? 'error' : ''}
                  />
                  {errors.crNumber && <span className="field-error">{errors.crNumber}</span>}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Address Information */}
          {currentStep === 3 && (
            <div className="form-section">
              <h3>Address Information</h3>
              <div className="form-group">
                <label htmlFor="companyAddress">Company Address *</label>
                <input 
                  type="text" 
                  id="companyAddress" 
                  name="companyAddress"
                  value={formData.companyAddress}
                  onChange={handleChange}
                  placeholder="Enter company address"
                  className={errors.companyAddress ? 'error' : ''}
                />
                {errors.companyAddress && <span className="field-error">{errors.companyAddress}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="companyCity">City *</label>
                  <input 
                    type="text" 
                    id="companyCity" 
                    name="companyCity"
                    value={formData.companyCity}
                    onChange={handleChange}
                    placeholder="Enter city"
                    className={errors.companyCity ? 'error' : ''}
                  />
                  {errors.companyCity && <span className="field-error">{errors.companyCity}</span>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="postalCode">Postal Code *</label>
                  <input 
                    type="text" 
                    id="postalCode" 
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleChange}
                    placeholder="Enter postal code"
                    className={errors.postalCode ? 'error' : ''}
                  />
                  {errors.postalCode && <span className="field-error">{errors.postalCode}</span>}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Owner Information */}
          {currentStep === 4 && (
            <div className="form-section">
              <h3>Owner Information</h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="ownerName">Owner Name *</label>
                  <input 
                    type="text" 
                    id="ownerName" 
                    name="ownerName"
                    value={formData.ownerName}
                    onChange={handleChange}
                    placeholder="Enter owner name"
                    className={errors.ownerName ? 'error' : ''}
                  />
                  {errors.ownerName && <span className="field-error">{errors.ownerName}</span>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="ownerEmail">Owner Email *</label>
                  <input 
                    type="email" 
                    id="ownerEmail" 
                    name="ownerEmail"
                    value={formData.ownerEmail}
                    onChange={handleChange}
                    placeholder="Enter owner email"
                    className={errors.ownerEmail ? 'error' : ''}
                  />
                  {errors.ownerEmail && <span className="field-error">{errors.ownerEmail}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="ownerUsername">Username *</label>
                  <input 
                    type="text" 
                    id="ownerUsername" 
                    name="ownerUsername"
                    value={formData.ownerUsername}
                    onChange={handleChange}
                    placeholder="Enter username"
                    className={errors.ownerUsername ? 'error' : ''}
                  />
                  {errors.ownerUsername && <span className="field-error">{errors.ownerUsername}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="ownerPassword">Password *</label>
                  <input 
                    type="password" 
                    id="ownerPassword" 
                    name="ownerPassword"
                    value={formData.ownerPassword}
                    onChange={handleChange}
                    placeholder="Enter password"
                    className={errors.ownerPassword ? 'error' : ''}
                  />
                  {errors.ownerPassword && <span className="field-error">{errors.ownerPassword}</span>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password *</label>
                  <input 
                    type="password" 
                    id="confirmPassword" 
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm password"
                    className={errors.confirmPassword ? 'error' : ''}
                  />
                  {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
                </div>
              </div>
            </div>
          )}
          
          <div className="signup-actions">
            {currentStep > 1 && (
              <SecondaryButton type="button" onClick={handlePrevious}>
                Previous
              </SecondaryButton>
            )}
            <PrimaryButton type="submit" disabled={isLoading}>
              {currentStep === 4 ? (isLoading ? 'Registering...' : 'Register Company') : 'Next'}
            </PrimaryButton>
          </div>
        </form>

        <div className="auth-switch">
          <p>Already have a company account? <Link to="/login" className="auth-link">Sign in here</Link></p>
        </div>
      </div>

      {/* Success Popup Modal */}
      {showSuccessPopup && (
        <div className="success-popup-overlay">
          <div className="success-popup">
            <div className="success-popup-header">
              <div className="success-icon">✓</div>
              <h3>Registration Successful!</h3>
            </div>
            <div className="success-popup-content">
              <p><strong>Company registration submitted successfully!</strong></p>
              <p>Your request is under review by our admin team.</p>
              <p>You will receive an email notification once your company is approved.</p>
              <p style={{marginTop: '15px', fontSize: '0.9em', color: '#666'}}>
                Please check your email ({formData.companyEmail}) for updates.
              </p>
            </div>
            <div className="success-popup-actions">
              <PrimaryButton onClick={handleSuccessPopupClose}>
                Continue to Login
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CompanySignup