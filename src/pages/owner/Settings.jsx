import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getApiUrl } from '../../utils/security'
import PageSection from '../../components/PageSection.jsx'
import PrimaryButton from '../../components/PrimaryButton.jsx'
import SecondaryButton from '../../components/SecondaryButton.jsx'
import './Settings.css'

function Settings() {
  const { token, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [company, setCompany] = useState(null)
  const [formData, setFormData] = useState({})
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState('')
  const [uploading, setUploading] = useState(false)
  const [originalCompanyData, setOriginalCompanyData] = useState(null)
  const [showNoChangesPopup, setShowNoChangesPopup] = useState(false)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [successPopupMessage, setSuccessPopupMessage] = useState('')
  const [showApprovedPopup, setShowApprovedPopup] = useState(false)
  const [lastCheckedRequestId, setLastCheckedRequestId] = useState(null)

  useEffect(() => {
    if (token) {
      // Load last checked request ID from localStorage
      const lastId = localStorage.getItem('lastApprovedRequestId')
      if (lastId) {
        setLastCheckedRequestId(lastId)
      }
      loadCompany()
    }
  }, [token])

  const loadCompany = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${getApiUrl()}/api/companies/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      
      if (data.success) {
        setCompany(data.data)
        
        // Store original company data for comparison
        setOriginalCompanyData({
          name: data.data.name || '',
          email: data.data.email || '',
          phone: data.data.phone || '',
          ibanNumber: data.data.ibanNumber || '',
          bankName: data.data.bankName || '',
          vatNumber: data.data.vatNumber || '',
          crNumber: data.data.crNumber || '',
          companyType: data.data.companyType || '',
          companySize: data.data.companySize || '',
          businessTarget: data.data.businessTarget || '',
          address: data.data.address || '',
          city: data.data.city || '',
          country: data.data.country || 'Bahrain',
          postalCode: data.data.postalCode || '',
          ownerName: data.data.ownerName || '',
          ownerEmail: data.data.ownerEmail || '',
          ownerUsername: data.data.ownerUsername || '',
          logo: data.data.logo?.url || ''
        })
        
        // Show warning if there's a pending update request
        if (data.data.pendingUpdateRequest) {
          setSuccessMessage('You have a pending update request waiting for admin approval. Changes will be applied after approval.')
          setTimeout(() => setSuccessMessage(''), 10000)
        }
        
        // Check if there's a recently approved request that hasn't been shown yet
        if (data.data.recentlyApprovedRequest) {
          const approvedRequestId = String(data.data.recentlyApprovedRequest.id)
          const storedId = lastCheckedRequestId || localStorage.getItem('lastApprovedRequestId')
          // Only show popup if this is a new approval (different from last checked)
          if (approvedRequestId !== storedId) {
            setShowApprovedPopup(true)
            setLastCheckedRequestId(approvedRequestId)
            // Store in localStorage to remember we've shown this approval
            localStorage.setItem('lastApprovedRequestId', approvedRequestId)
          }
        }
        
        setFormData({
          // Basic Information
          name: data.data.name || '',
          email: data.data.email || '',
          phone: data.data.phone || '',
          
          // Banking Information
          ibanNumber: data.data.ibanNumber || '',
          bankName: data.data.bankName || '',
          vatNumber: data.data.vatNumber || '',
          crNumber: data.data.crNumber || '',
          
          // Company Details
          companyType: data.data.companyType || '',
          companySize: data.data.companySize || '',
          businessTarget: data.data.businessTarget || '',
          
          // Address Information
          address: data.data.address || '',
          city: data.data.city || '',
          country: data.data.country || 'Bahrain',
          postalCode: data.data.postalCode || '',
          
          // Owner Information
          ownerName: data.data.ownerName || '',
          ownerEmail: data.data.ownerEmail || '',
          ownerUsername: data.data.ownerUsername || '',
          
          // Logo
          logo: data.data.logo?.url || ''
        })
        setLogoPreview(data.data.logo?.url || '')
        setLogoFile(null)
      } else {
        setErrorMessage(data.message || 'Error loading company information')
      }
    } catch (error) {
      console.error('Error loading company:', error)
      setErrorMessage('Error loading company information')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrorMessage('Please select an image file')
        return
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('Image size must be less than 5MB')
        return
      }

      setLogoFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setLogoFile(null)
    setLogoPreview('')
    setFormData(prev => ({ ...prev, logo: '' }))
  }

  const uploadImageToSupabase = async (file) => {
    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('image', file)
      formData.append('folder', 'companies')

      const response = await fetch(`${getApiUrl()}/api/upload/image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      const data = await response.json()
      
      if (data.success) {
        return data.data.url
      } else {
        throw new Error(data.message || 'Failed to upload image')
      }
    } catch (error) {
      console.error('Upload error:', error)
      throw error
    } finally {
      setUploading(false)
    }
  }

  const hasChanges = () => {
    if (!originalCompanyData) return false

    // Check if logo file was selected
    if (logoFile) return true

    // Check if logo URL changed
    const currentLogoUrl = formData.logo || ''
    const originalLogoUrl = originalCompanyData.logo || ''
    if (currentLogoUrl !== originalLogoUrl) return true

    // Check all other fields
    const fieldsToCheck = [
      'name', 'email', 'phone', 'ibanNumber', 'bankName', 'vatNumber', 'crNumber',
      'companyType', 'companySize', 'businessTarget', 'address', 'city', 'country',
      'postalCode', 'ownerName', 'ownerEmail', 'ownerUsername'
    ]

    for (const field of fieldsToCheck) {
      const currentValue = formData[field] || ''
      const originalValue = originalCompanyData[field] || ''
      if (String(currentValue).trim() !== String(originalValue).trim()) {
        return true
      }
    }

    return false
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Check if user has permission
    if (user?.role !== 'owner' && user?.role !== 'admin') {
      setErrorMessage('Only owners and admins can update company information')
      return
    }

    // Check if there are any changes
    if (!hasChanges()) {
      setShowNoChangesPopup(true)
      return
    }

    try {
      setSaving(true)
      setErrorMessage('')
      setSuccessMessage('')

      // Upload logo if a new file was selected
      let logoUrl = formData.logo
      if (logoFile) {
        try {
          logoUrl = await uploadImageToSupabase(logoFile)
        } catch (error) {
          setErrorMessage('Failed to upload logo: ' + error.message)
          setSaving(false)
          return
        }
      }

      const updateData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        ibanNumber: formData.ibanNumber,
        bankName: formData.bankName,
        vatNumber: formData.vatNumber,
        crNumber: formData.crNumber,
        companyType: formData.companyType,
        companySize: formData.companySize,
        businessTarget: formData.businessTarget,
        address: formData.address,
        city: formData.city,
        country: formData.country,
        postalCode: formData.postalCode,
        ownerName: formData.ownerName,
        ownerEmail: formData.ownerEmail,
        ownerUsername: formData.ownerUsername,
        logo: logoUrl ? {
          url: logoUrl
        } : undefined
      }

      const response = await fetch(`${getApiUrl()}/api/companies/me`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      const data = await response.json()
      
      if (data.success) {
        const updatedCompany = data.data.company || data.data
        setCompany(updatedCompany)
        setLogoPreview(updatedCompany.logo?.url || '')
        setLogoFile(null)
        
        // Update original company data after successful submission
        setOriginalCompanyData({
          name: updatedCompany.name || '',
          email: updatedCompany.email || '',
          phone: updatedCompany.phone || '',
          ibanNumber: updatedCompany.ibanNumber || '',
          bankName: updatedCompany.bankName || '',
          vatNumber: updatedCompany.vatNumber || '',
          crNumber: updatedCompany.crNumber || '',
          companyType: updatedCompany.companyType || '',
          companySize: updatedCompany.companySize || '',
          businessTarget: updatedCompany.businessTarget || '',
          address: updatedCompany.address || '',
          city: updatedCompany.city || '',
          country: updatedCompany.country || 'Bahrain',
          postalCode: updatedCompany.postalCode || '',
          ownerName: updatedCompany.ownerName || '',
          ownerEmail: updatedCompany.ownerEmail || '',
          ownerUsername: updatedCompany.ownerUsername || '',
          logo: updatedCompany.logo?.url || ''
        })
        
        setSuccessPopupMessage('Request sent to approval. Waiting for admin approval.')
        setShowSuccessPopup(true)
      } else {
        setErrorMessage(data.message || 'Error updating company information')
        if (data.errors) {
          setErrorMessage(data.errors.join(', '))
        }
      }
    } catch (error) {
      console.error('Error updating company:', error)
      setErrorMessage('Error updating company information')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="settings-page">
        <h1 className="page-title">Company Informations</h1>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Loading company information...</p>
        </div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="settings-page">
        <h1 className="page-title">Company Informations</h1>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>{errorMessage || 'Company information not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="settings-page">
      <h1 className="page-title">Company Informations</h1>
      
      {successMessage && (
        <div className="success-message">
          {successMessage}
        </div>
      )}
      
      {errorMessage && (
        <div className="error-message">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Company Logo */}
        <PageSection>
          <div className="logo-upload-container">
            {logoPreview ? (
              <div className="logo-preview-wrapper">
                <img src={logoPreview} alt="Company logo preview" className="logo-preview" />
                <button
                  type="button"
                  className="remove-logo-btn"
                  onClick={handleRemoveImage}
                  disabled={uploading}
                >
                  ×
                </button>
              </div>
            ) : (
              <label className="logo-upload-placeholder">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="logo-file-input"
                  disabled={uploading}
                />
                <div className="upload-icon">📷</div>
                <span>Click to upload company logo</span>
                <small>PNG, JPG up to 5MB</small>
              </label>
            )}
            {uploading && (
              <div className="upload-status">Uploading logo...</div>
            )}
          </div>
        </PageSection>

        {/* Basic Company Information */}
        <PageSection title="Basic Company Information">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="name">Company Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name || ''}
                onChange={handleInputChange}
                required
                placeholder="Enter company name"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="email">Company Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email || ''}
                onChange={handleInputChange}
                required
                placeholder="Enter company email"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="phone">Company Phone *</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone || ''}
                onChange={handleInputChange}
                required
                placeholder="Enter company phone"
              />
            </div>

            <div className="form-group">
              <label htmlFor="companyType">Company Type *</label>
              <select
                id="companyType"
                name="companyType"
                value={formData.companyType || ''}
                onChange={handleInputChange}
                required
              >
                <option value="">Select company type</option>
                <option value="llc">LLC</option>
                <option value="corporation">Corporation</option>
                <option value="partnership">Partnership</option>
                <option value="sole-proprietorship">Sole Proprietorship</option>
                <option value="non-profit">Non-Profit</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="companySize">Company Size *</label>
              <select
                id="companySize"
                name="companySize"
                value={formData.companySize || ''}
                onChange={handleInputChange}
                required
              >
                <option value="">Select company size</option>
                <option value="startup">Startup</option>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="businessTarget">Business Target *</label>
              <select
                id="businessTarget"
                name="businessTarget"
                value={formData.businessTarget || ''}
                onChange={handleInputChange}
                required
              >
                <option value="">Select business target</option>
                <option value="medical-items">Medical Items</option>
                <option value="pharmacy">Pharmacy</option>
                <option value="collecting-orders">Collecting Orders</option>
                <option value="other">Other</option>
              </select>
            </div>

          </div>
        </PageSection>

        {/* Banking Information */}
        <PageSection title="Banking Information">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="ibanNumber">IBAN Number *</label>
              <input
                type="text"
                id="ibanNumber"
                name="ibanNumber"
                value={formData.ibanNumber || ''}
                onChange={handleInputChange}
                required
                placeholder="Enter IBAN number"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="bankName">Bank Name *</label>
              <input
                type="text"
                id="bankName"
                name="bankName"
                value={formData.bankName || ''}
                onChange={handleInputChange}
                required
                placeholder="Enter bank name"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="vatNumber">VAT Number *</label>
              <input
                type="text"
                id="vatNumber"
                name="vatNumber"
                value={formData.vatNumber || ''}
                onChange={handleInputChange}
                required
                placeholder="Enter VAT number"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="crNumber">CR Number *</label>
              <input
                type="text"
                id="crNumber"
                name="crNumber"
                value={formData.crNumber || ''}
                onChange={handleInputChange}
                required
                placeholder="Enter CR number"
              />
            </div>
          </div>
        </PageSection>

        {/* Address Information */}
        <PageSection title="Address Information">
          <div className="form-grid">
            <div className="form-group full-width">
              <label htmlFor="address">Address *</label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address || ''}
                onChange={handleInputChange}
                required
                placeholder="Enter company address"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="city">City *</label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city || ''}
                onChange={handleInputChange}
                required
                placeholder="Enter city"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="country">Country *</label>
              <input
                type="text"
                id="country"
                name="country"
                value={formData.country || 'Bahrain'}
                onChange={handleInputChange}
                required
                placeholder="Enter country"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="postalCode">Postal Code *</label>
              <input
                type="text"
                id="postalCode"
                name="postalCode"
                value={formData.postalCode || ''}
                onChange={handleInputChange}
                required
                placeholder="Enter postal code"
              />
            </div>
          </div>
        </PageSection>

        {/* Owner Information */}
        <PageSection title="Owner Information">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="ownerName">Owner Name *</label>
              <input
                type="text"
                id="ownerName"
                name="ownerName"
                value={formData.ownerName || ''}
                onChange={handleInputChange}
                required
                placeholder="Enter owner name"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="ownerEmail">Owner Email *</label>
              <input
                type="email"
                id="ownerEmail"
                name="ownerEmail"
                value={formData.ownerEmail || ''}
                onChange={handleInputChange}
                required
                placeholder="Enter owner email"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="ownerUsername">Owner Username *</label>
              <input
                type="text"
                id="ownerUsername"
                name="ownerUsername"
                value={formData.ownerUsername || ''}
                onChange={handleInputChange}
                required
                placeholder="Enter owner username"
              />
            </div>
          </div>
        </PageSection>


        <div className="form-actions">
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Company Information'}
          </PrimaryButton>
          <SecondaryButton type="button" onClick={loadCompany}>
            Cancel
          </SecondaryButton>
        </div>
      </form>

      {/* No Changes Popup */}
      {showNoChangesPopup && (
        <div className="modal-overlay" onClick={() => setShowNoChangesPopup(false)}>
          <div className="success-popup" onClick={(e) => e.stopPropagation()}>
            <div className="success-icon">ℹ️</div>
            <h3>No Changes</h3>
            <p>There are no changes to save</p>
            <PrimaryButton onClick={() => setShowNoChangesPopup(false)}>
              OK
            </PrimaryButton>
          </div>
        </div>
      )}

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="modal-overlay" onClick={() => setShowSuccessPopup(false)}>
          <div className="success-popup" onClick={(e) => e.stopPropagation()}>
            <div className="success-icon">✓</div>
            <h3>Success</h3>
            <p>{successPopupMessage}</p>
            <PrimaryButton onClick={() => setShowSuccessPopup(false)}>
              OK
            </PrimaryButton>
          </div>
        </div>
      )}

      {/* Approved Request Popup */}
      {showApprovedPopup && company?.recentlyApprovedRequest && (
        <div className="modal-overlay" onClick={() => setShowApprovedPopup(false)}>
          <div className="success-popup" onClick={(e) => e.stopPropagation()}>
            <div className="success-icon">✓</div>
            <h3>Request Approved</h3>
            <p>Your company information update request has been approved and applied successfully!</p>
            <PrimaryButton onClick={() => {
              setShowApprovedPopup(false)
              loadCompany() // Reload to show updated data
            }}>
              OK
            </PrimaryButton>
          </div>
        </div>
      )}
    </div>
  )
}

export default Settings
