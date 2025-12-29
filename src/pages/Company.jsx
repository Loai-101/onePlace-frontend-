import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getApiUrl } from '../utils/security'
import PageSection from '../components/PageSection.jsx'
import Loading from '../components/Loading.jsx'
import './Company.css'

function Company() {
  const { token, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [company, setCompany] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (token) {
      loadCompany()
    }
  }, [token])

  const loadCompany = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await fetch(`${getApiUrl()}/api/companies/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      
      if (data.success) {
        setCompany(data.data)
      } else {
        setError(data.message || 'Error loading company information')
      }
    } catch (error) {
      console.error('Error loading company:', error)
      setError('Error loading company information. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="company-page">
        <PageSection title="Company Information">
          <Loading message="Loading company information..." />
        </PageSection>
      </div>
    )
  }

  if (error) {
    return (
      <div className="company-page">
        <PageSection title="Company Information">
          <div className="error-state">{error}</div>
        </PageSection>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="company-page">
        <PageSection title="Company Information">
          <div className="empty-state">No company information available</div>
        </PageSection>
      </div>
    )
  }

  return (
    <div className="company-page">
      <PageSection title="Company Information">
        <div className="company-container">
          {/* Company Logo */}
          {company.logo?.url && (
            <div className="company-logo-section">
              <img 
                src={company.logo.url} 
                alt={company.name} 
                className="company-logo"
              />
            </div>
          )}

          {/* Basic Information */}
          <div className="company-section">
            <h3 className="section-title">Basic Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>Company Name</label>
                <div className="info-value">{company.name || 'N/A'}</div>
              </div>
              <div className="info-item">
                <label>Email</label>
                <div className="info-value">{company.email || 'N/A'}</div>
              </div>
              <div className="info-item">
                <label>Phone</label>
                <div className="info-value">{company.phone || 'N/A'}</div>
              </div>
              <div className="info-item">
                <label>Company Type</label>
                <div className="info-value">{company.companyType || 'N/A'}</div>
              </div>
              <div className="info-item">
                <label>Company Size</label>
                <div className="info-value">{company.companySize || 'N/A'}</div>
              </div>
              <div className="info-item">
                <label>Business Target</label>
                <div className="info-value">{company.businessTarget || 'N/A'}</div>
              </div>
            </div>
          </div>

          {/* Address Information */}
          {(company.address || company.city || company.country || company.postalCode) && (
            <div className="company-section">
              <h3 className="section-title">Address Information</h3>
              <div className="info-grid">
                {company.address && (
                  <div className="info-item">
                    <label>Address</label>
                    <div className="info-value">{company.address}</div>
                  </div>
                )}
                {company.city && (
                  <div className="info-item">
                    <label>City</label>
                    <div className="info-value">{company.city}</div>
                  </div>
                )}
                {company.country && (
                  <div className="info-item">
                    <label>Country</label>
                    <div className="info-value">{company.country}</div>
                  </div>
                )}
                {company.postalCode && (
                  <div className="info-item">
                    <label>Postal Code</label>
                    <div className="info-value">{company.postalCode}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Banking Information */}
          {(company.ibanNumber || company.bankName || company.vatNumber || company.crNumber) && (
            <div className="company-section">
              <h3 className="section-title">Banking Information</h3>
              <div className="info-grid">
                {company.ibanNumber && (
                  <div className="info-item">
                    <label>IBAN Number</label>
                    <div className="info-value">{company.ibanNumber}</div>
                  </div>
                )}
                {company.bankName && (
                  <div className="info-item">
                    <label>Bank Name</label>
                    <div className="info-value">{company.bankName}</div>
                  </div>
                )}
                {company.vatNumber && (
                  <div className="info-item">
                    <label>VAT Number</label>
                    <div className="info-value">{company.vatNumber}</div>
                  </div>
                )}
                {company.crNumber && (
                  <div className="info-item">
                    <label>CR Number</label>
                    <div className="info-value">{company.crNumber}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Owner Information */}
          {(company.ownerName || company.ownerEmail) && (
            <div className="company-section">
              <h3 className="section-title">Owner Information</h3>
              <div className="info-grid">
                {company.ownerName && (
                  <div className="info-item">
                    <label>Owner Name</label>
                    <div className="info-value">{company.ownerName}</div>
                  </div>
                )}
                {company.ownerEmail && (
                  <div className="info-item">
                    <label>Owner Email</label>
                    <div className="info-value">{company.ownerEmail}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </PageSection>
    </div>
  )
}

export default Company

