import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import PageSection from '../../components/PageSection.jsx'
import PrimaryButton from '../../components/PrimaryButton.jsx'
import SecondaryButton from '../../components/SecondaryButton.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import Loading from '../../components/Loading.jsx'
import { getApiUrl } from '../../utils/security'
import './Accounts.css'

function Accounts() {
  const { token } = useAuth()
  const [accounts, setAccounts] = useState([])
  const [filteredAccounts, setFilteredAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [medicalBranches, setMedicalBranches] = useState([])
  const [specializations, setSpecializations] = useState([])
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState('')
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: {
      flatShopNo: '',
      building: '',
      road: '',
      block: '',
      area: ''
    },
    staff: [{
      title: 'Dr',
      name: '',
      phone: '',
      email: '',
      medicalBranch: '',
      specializations: []
    }],
    vat: '',
    crNumber: '',
    creditLimit: 0
  })
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [showConfirmPopup, setShowConfirmPopup] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)
  const [confirmMessage, setConfirmMessage] = useState('')
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewAccount, setViewAccount] = useState(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [excelFile, setExcelFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState(null)

  useEffect(() => {
    if (token) {
      loadAccounts()
      loadMedicalBranches()
    }
  }, [token])

  useEffect(() => {
    filterAccounts()
  }, [accounts, searchTerm, statusFilter])


  const loadAccounts = async () => {
    try {
      setLoading(true)
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/accounts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      
      if (data.success) {
        setAccounts(data.data)
        setFilteredAccounts(data.data)
      } else {
        setErrorMessage(data.message || 'Error loading accounts')
      }
    } catch (error) {
      console.error('Error loading accounts:', error)
      if (error.message && error.message.includes('Failed to fetch')) {
        setErrorMessage('Cannot connect to server. Please ensure the backend server is running on port 5000.')
      } else {
        setErrorMessage('Error loading accounts')
      }
    } finally {
      setLoading(false)
    }
  }

  const loadMedicalBranches = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/accounts/branches`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      
      if (data.success) {
        setMedicalBranches(data.data)
      }
    } catch (error) {
      console.error('Error loading medical branches:', error)
    }
  }

  const loadSpecializations = async (branch) => {
    try {
      const response = await fetch(`${getApiUrl()}/api/accounts/specializations/${branch}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      
      if (data.success) {
        setSpecializations(data.data)
      }
    } catch (error) {
      console.error('Error loading specializations:', error)
    }
  }

  const filterAccounts = () => {
    let filtered = accounts

    // Filter by status
    if (statusFilter === 'active') {
      filtered = filtered.filter(account => account.isActive === true)
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(account => account.isActive === false)
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(account => 
        account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.vat.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.crNumber.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredAccounts(filtered)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: {
        flatShopNo: '',
        building: '',
        road: '',
        block: '',
        area: ''
      },
      staff: [{
        title: 'Dr',
        name: '',
        phone: '',
        email: '',
        medicalBranch: '',
        specializations: []
      }],
      vat: '',
      crNumber: '',
      creditLimit: 0
    })
    setLogoFile(null)
    setLogoPreview('')
    setErrorMessage('')
    setSuccessMessage('')
  }

  const openCreateModal = () => {
    resetForm()
    setShowCreateModal(true)
  }

  const openEditModal = async (account) => {
    setSelectedAccount(account)
    
    // Load specializations for each staff member's branch
    const staffWithSpecializations = await Promise.all(
      (account.staff && account.staff.length > 0 ? account.staff : [{ title: 'Dr', name: '', phone: '', medicalBranch: '', specializations: [] }])
        .map(async (s) => {
          const staffMember = {
            title: s.title || 'Dr',
            name: s.name || '',
            phone: s.phone || '',
            email: s.email || '',
            medicalBranch: s.medicalBranch || '',
            specializations: s.specializations || []
          }
          
          // Load specializations if branch exists
          if (staffMember.medicalBranch) {
            try {
              const response = await fetch(`${getApiUrl()}/api/accounts/specializations/${staffMember.medicalBranch}`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              })
              const data = await response.json()
              if (data.success) {
                staffMember.availableSpecializations = data.data
              }
            } catch (error) {
              console.error('Error loading specializations:', error)
            }
          }
          
          return staffMember
        })
    )
    
    setFormData({
      name: account.name || '',
      phone: account.phone || '',
      email: account.email || '',
      address: {
        flatShopNo: account.address?.flatShopNo || '',
        building: account.address?.building || '',
        road: account.address?.road || '',
        block: account.address?.block || '',
        area: account.address?.area || ''
      },
      staff: staffWithSpecializations,
      vat: account.vat || '',
      crNumber: account.crNumber || '',
      creditLimit: account.creditLimit || 0
    })
    setLogoPreview(account.logo?.url || '')
    setLogoFile(null)
    setShowEditModal(true)
  }

  const uploadImageToSupabase = async (file) => {
    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('image', file)
      formData.append('folder', 'accounts')

      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/upload/image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        return {
          url: data.data.url,
          public_id: data.data.public_id
        }
      } else {
        throw new Error(data.message || 'Failed to upload image')
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      // Provide more helpful error message
      if (error.message && error.message.includes('bucket')) {
        throw new Error('Storage bucket error. Please ensure the "images" bucket exists in Supabase Storage and has proper permissions.')
      }
      throw error
    } finally {
      setUploading(false)
    }
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
      setErrorMessage('')

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
    // Clear the file input
    const fileInput = document.getElementById('logo-upload')
    if (fileInput) {
      fileInput.value = ''
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const url = selectedAccount 
        ? `${getApiUrl()}/api/accounts/${selectedAccount._id}`
        : `${getApiUrl()}/api/accounts`
      
      const method = selectedAccount ? 'PUT' : 'POST'

      // Clean up formData - remove availableSpecializations (UI only field)
      let submitData = {
        ...formData,
        staff: (Array.isArray(formData.staff) ? formData.staff : []).map(s => {
          const { availableSpecializations, ...staffData } = s
          return staffData
        })
      }

      // Upload logo if a new file was selected
      if (logoFile) {
        try {
          const logoData = await uploadImageToSupabase(logoFile)
          submitData.logo = logoData
        } catch (uploadError) {
          console.error('Error uploading logo:', uploadError)
          setErrorMessage(uploadError.message || 'Failed to upload logo image. Please check that the Supabase storage bucket "images" exists and has proper permissions.')
          return
        }
      } else if (selectedAccount && logoPreview && !logoFile) {
        // For editing, if there's a preview but no new file, keep existing logo
        // Don't include logo in submitData - backend will keep existing
      } else if (!selectedAccount && !logoPreview) {
        // For new accounts, if no logo is provided, set to empty
        submitData.logo = { url: '', public_id: '' }
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      })

      const data = await response.json()

      if (data.success) {
        setSuccessMessage(selectedAccount ? 'Account updated successfully' : 'Account created successfully')
        setTimeout(() => {
          setShowCreateModal(false)
          setShowEditModal(false)
          setSelectedAccount(null)
          resetForm()
          loadAccounts()
        }, 1500)
      } else {
        // Show detailed error messages
        let errorMsg = data.message || 'Error saving account'
        if (data.errors && Array.isArray(data.errors)) {
          errorMsg += ': ' + data.errors.join(', ')
        }
        setErrorMessage(errorMsg)
        console.error('Account save error:', data)
      }
    } catch (error) {
      console.error('Error saving account:', error)
      const errorMessage = error.message || 'Error saving account'
      setErrorMessage(errorMessage)
    }
  }

  const handleDelete = (account) => {
    setConfirmMessage(`Are you sure you want to delete "${account.name}"? This action cannot be undone.`)
    setConfirmAction(() => async () => {
      try {
        const response = await fetch(`${getApiUrl()}/api/accounts/${account._id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        const data = await response.json()

        if (data.success) {
          setSuccessMessage('Account deleted successfully')
          loadAccounts()
        } else {
          setErrorMessage(data.message || 'Error deleting account')
        }
      } catch (error) {
        console.error('Error deleting account:', error)
        setErrorMessage('Error deleting account')
      } finally {
        setShowConfirmPopup(false)
        setConfirmAction(null)
      }
    })
    setShowConfirmPopup(true)
  }

  const handleToggleStatus = (account) => {
    setConfirmMessage(`Are you sure you want to ${account.isActive ? 'deactivate' : 'activate'} "${account.name}"?`)
    setConfirmAction(() => async () => {
      try {
        const response = await fetch(`${getApiUrl()}/api/accounts/${account._id}/toggle-status`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        const data = await response.json()

        if (data.success) {
          setSuccessMessage(`Account ${account.isActive ? 'deactivated' : 'activated'} successfully`)
          loadAccounts()
        } else {
          setErrorMessage(data.message || 'Error updating account status')
        }
      } catch (error) {
        console.error('Error updating account status:', error)
        setErrorMessage('Error updating account status')
      } finally {
        setShowConfirmPopup(false)
        setConfirmAction(null)
      }
    })
    setShowConfirmPopup(true)
  }

  const handleSpecializationChange = (spec) => {
    setFormData(prev => {
      const currentSpecs = prev.specializations || []
      const isSelected = currentSpecs.includes(spec)
      
      return {
        ...prev,
        specializations: isSelected
          ? currentSpecs.filter(s => s !== spec)
          : [...currentSpecs, spec]
      }
    })
  }

  const handleExcelFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/csv' // .csv
      ]
      const validExtensions = ['.xlsx', '.xls', '.csv']
      
      const isValidType = validTypes.includes(file.type) || 
        validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
      
      if (!isValidType) {
        setErrorMessage('Please select an Excel file (.xlsx, .xls) or CSV file')
        return
      }
      
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage('File size must be less than 10MB')
        return
      }

      setExcelFile(file)
      setErrorMessage('')
    }
  }

  const handleDownloadTemplate = () => {
    // Create template data with all required fields
    const templateData = [
      {
        'Name': 'Example Account',
        'Phone Number': '+973 12345678',
        'Area': 'Manama',
        'Flat/Shop No.': '123',
        'Building': 'Building A',
        'Road': 'Main Street',
        'Block': 'Block 1',
        'VAT Number': 'VAT123456',
        'CR Number': 'CR789012',
        'Credit Limit': '5000',
        'Status': 'active'
      }
    ]

    // Convert to CSV
    const headers = Object.keys(templateData[0])
    const csvContent = [
      headers.join(','),
      ...templateData.map(row => 
        headers.map(header => {
          const value = row[header] || ''
          return `"${value.toString().replace(/"/g, '""')}"`
        }).join(',')
      )
    ].join('\n')

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'accounts_import_template.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleBulkImport = async () => {
    if (!excelFile) {
      setErrorMessage('Please select an Excel file')
      return
    }

    setImporting(true)
    setErrorMessage('')
    setImportResults(null)

    try {
      const formData = new FormData()
      formData.append('file', excelFile)

      const response = await fetch(`${getApiUrl()}/api/accounts/bulk-import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        setImportResults(data.data)
        setSuccessMessage(data.message)
        setExcelFile(null)
        // Clear file input
        const fileInput = document.getElementById('excel-file-upload')
        if (fileInput) {
          fileInput.value = ''
        }
        // Reload accounts
        loadAccounts()
      } else {
        setErrorMessage(data.message || 'Error importing accounts')
      }
    } catch (error) {
      console.error('Error importing accounts:', error)
      setErrorMessage('Error importing accounts. Please try again.')
    } finally {
      setImporting(false)
    }
  }

  const handleDownloadAllAccounts = () => {
    if (accounts.length === 0) {
      setErrorMessage('No accounts to download')
      return
    }

    // Convert accounts to CSV format
    const headers = ['Name', 'Flat/Shop No.', 'Building', 'Road', 'Block', 'Area', 'Staff', 'VAT Number', 'CR Number', 'Credit Limit', 'Status']
    
    const csvData = accounts.map(account => {
      // Format staff as: Title|Name|MedicalBranch|Specializations
      const staffStr = (account.staff && Array.isArray(account.staff) && account.staff.length > 0)
        ? account.staff.map(s => {
            const title = s.title || 'Dr'
            const name = s.name || ''
            const branch = s.medicalBranch || ''
            const specs = (s.specializations && Array.isArray(s.specializations)) ? s.specializations.join(', ') : ''
            return `${title}|${name}|${branch}|${specs}`
          }).join(';')
        : ''
      
      return {
        'Name': account.name || '',
        'Flat/Shop No.': account.address?.flatShopNo || '',
        'Building': account.address?.building || '',
        'Road': account.address?.road || '',
        'Block': account.address?.block || '',
        'Area': account.address?.area || '',
        'Staff': staffStr,
        'VAT Number': account.vat || '',
        'CR Number': account.crNumber || '',
        'Credit Limit': account.creditLimit || 0,
        'Status': account.isActive ? 'active' : 'inactive'
      }
    })

    // Convert to CSV format
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => 
        headers.map(header => {
          const value = row[header] || ''
          return `"${value.toString().replace(/"/g, '""')}"`
        }).join(',')
      )
    ].join('\n')

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `accounts_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="accounts-page">
        <h1 className="page-title">Account Management</h1>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Loading message="Loading accounts..." />
        </div>
      </div>
    )
  }

  return (
    <div className="accounts-page">
      <div className="page-header">
        <h1 className="page-title">Accounts</h1>
        <div className="account-count-badge">
          {accounts.length} {accounts.length === 1 ? 'Account' : 'Accounts'}
        </div>
      </div>
      <PageSection>
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

        <div className="accounts-toolbar">
          <div className="accounts-toolbar-left">
            <PrimaryButton onClick={openCreateModal}>
              + New Account
            </PrimaryButton>
            <SecondaryButton onClick={() => setShowImportModal(true)}>
              📊 Import from Excel
            </SecondaryButton>
            <SecondaryButton onClick={handleDownloadAllAccounts}>
              ⬇️ Download All Accounts
            </SecondaryButton>
          </div>
          <div className="accounts-toolbar-right">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <input
              type="text"
              placeholder="Search accounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {filteredAccounts.length === 0 ? (
          <EmptyState message="No accounts found. Create your first account to get started." />
        ) : (
          <div className="accounts-grid">
            {filteredAccounts.map(account => (
              <div key={account._id} className={`account-card ${!account.isActive ? 'inactive' : ''}`}>
                <div className="account-header">
                  <div className="account-logo-wrapper">
                    {account.logo?.url ? (
                      <img 
                        src={account.logo.url} 
                        alt={account.name} 
                        className="account-logo"
                        onError={(e) => {
                          e.target.onerror = null // Prevent infinite loop
                          e.target.style.display = 'none'
                          const placeholder = e.target.parentElement.querySelector('.account-logo-placeholder')
                          if (placeholder) {
                            placeholder.style.display = 'flex'
                          }
                        }}
                      />
                    ) : null}
                    <div className="account-logo-placeholder" style={{ display: account.logo?.url ? 'none' : 'flex' }}>
                      <span>No Logo</span>
                    </div>
                  </div>
                  <div className="account-header-info">
                    <h3>{account.name}</h3>
                    <span className={`account-status ${account.isActive ? 'active' : 'inactive'}`}>
                      {account.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="account-details">
                  <div className="account-balance-info">
                    <p><strong>Balance:</strong> BD {(account.currentBalance || 0).toLocaleString()} / Limit: BD {(account.creditLimit || 0).toLocaleString()}</p>
                    <p><strong>Available:</strong> BD {((account.creditLimit || 0) - (account.currentBalance || 0)).toLocaleString()}</p>
                  </div>
                  <p><strong>Address:</strong> {
                    [
                      account.address?.flatShopNo,
                      account.address?.building,
                      account.address?.road,
                      account.address?.block,
                      account.address?.area
                    ].filter(Boolean).join(', ') || 'N/A'
                  }</p>
                </div>
                <div className="account-actions">
                  <button className="btn-view" onClick={() => {
                    setViewAccount(account)
                    setShowViewModal(true)
                  }}>
                    View
                  </button>
                  <PrimaryButton onClick={() => openEditModal(account)}>
                    Edit
                  </PrimaryButton>
                  <SecondaryButton onClick={() => handleDelete(account)}>
                    Delete
                  </SecondaryButton>
                  {account.isActive ? (
                    <button className="btn-deactivate" onClick={() => handleToggleStatus(account)}>
                      Deactivate
                    </button>
                  ) : (
                    <button className="btn-activate" onClick={() => handleToggleStatus(account)}>
                      Activate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </PageSection>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="modal-overlay" onClick={() => {
          setShowCreateModal(false)
          setShowEditModal(false)
          setSelectedAccount(null)
          resetForm()
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedAccount ? 'Edit Account' : 'Create New Account'}</h2>
              <button className="modal-close" onClick={() => {
                setShowCreateModal(false)
                setShowEditModal(false)
                setSelectedAccount(null)
                resetForm()
              }}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="account-form">
              <div className="form-group">
                <label>Logo</label>
                <div className="logo-upload-container">
                  {logoPreview ? (
                    <div className="logo-preview-wrapper">
                      <img src={logoPreview} alt="Logo preview" className="logo-preview" />
                      <button
                        type="button"
                        className="remove-logo-btn"
                        onClick={handleRemoveImage}
                        title="Remove logo"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="logo-upload" className="logo-upload-placeholder">
                      <span className="upload-icon">📷</span>
                      <span>Click to upload logo</span>
                      <input
                        type="file"
                        id="logo-upload"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="logo-file-input"
                      />
                    </label>
                  )}
                  {uploading && (
                    <div className="upload-status">Uploading...</div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="name">Name *</label>
                <input
                  type="text"
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone Number *</label>
                <input
                  type="tel"
                  id="phone"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  placeholder="Enter general phone number"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter account email (optional)"
                />
              </div>

              <div className="form-group">
                <label>Address *</label>
                <div className="address-fields">
                  <div className="form-group">
                    <label htmlFor="flatShopNo">Flat/Shop No.</label>
                    <input
                      type="text"
                      id="flatShopNo"
                      value={formData.address?.flatShopNo || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        address: { ...(formData.address || {}), flatShopNo: e.target.value }
                      })}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="building">Building</label>
                    <input
                      type="text"
                      id="building"
                      value={formData.address?.building || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        address: { ...(formData.address || {}), building: e.target.value }
                      })}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="road">Road</label>
                    <input
                      type="text"
                      id="road"
                      value={formData.address?.road || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        address: { ...(formData.address || {}), road: e.target.value }
                      })}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="block">Block</label>
                    <input
                      type="text"
                      id="block"
                      value={formData.address?.block || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        address: { ...(formData.address || {}), block: e.target.value }
                      })}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="area">Area *</label>
                    <input
                      type="text"
                      id="area"
                      value={formData.address?.area || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        address: { ...(formData.address || {}), area: e.target.value }
                      })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Staff *</label>
                {(Array.isArray(formData.staff) ? formData.staff : []).map((staffMember, index) => (
                  <div key={index} className="staff-member-row">
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor={`staffTitle-${index}`}>Title *</label>
                        <select
                          id={`staffTitle-${index}`}
                          value={staffMember.title || 'Dr'}
                          onChange={(e) => {
                            const currentStaff = Array.isArray(formData.staff) ? formData.staff : []
                            const updatedStaff = [...currentStaff]
                            updatedStaff[index] = { ...updatedStaff[index], title: e.target.value }
                            setFormData({ ...formData, staff: updatedStaff })
                          }}
                          required
                        >
                          <option value="Dr">Dr</option>
                          <option value="Miss">Miss</option>
                          <option value="Mr">Mr</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label htmlFor={`staffName-${index}`}>Name</label>
                        <div className="staff-name-input-wrapper">
                          <input
                            type="text"
                            id={`staffName-${index}`}
                            value={staffMember.name || ''}
                            onChange={(e) => {
                              const currentStaff = Array.isArray(formData.staff) ? formData.staff : []
                              const updatedStaff = [...currentStaff]
                              updatedStaff[index] = { ...updatedStaff[index], name: e.target.value }
                              setFormData({ ...formData, staff: updatedStaff })
                            }}
                            placeholder="Enter staff name"
                          />
                          {Array.isArray(formData.staff) && formData.staff.length > 1 && (
                            <button
                              type="button"
                              className="remove-staff-btn"
                              onClick={() => {
                                const updatedStaff = (Array.isArray(formData.staff) ? formData.staff : []).filter((_, i) => i !== index)
                                setFormData({ ...formData, staff: updatedStaff })
                              }}
                              title="Remove staff member"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="form-group">
                        <label htmlFor={`staffPhone-${index}`}>Phone Number</label>
                        <input
                          type="tel"
                          id={`staffPhone-${index}`}
                          value={staffMember.phone || ''}
                          onChange={(e) => {
                            const currentStaff = Array.isArray(formData.staff) ? formData.staff : []
                            const updatedStaff = [...currentStaff]
                            updatedStaff[index] = { ...updatedStaff[index], phone: e.target.value }
                            setFormData({ ...formData, staff: updatedStaff })
                          }}
                          placeholder="Enter staff phone number (optional)"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor={`staffEmail-${index}`}>Email</label>
                        <input
                          type="email"
                          id={`staffEmail-${index}`}
                          value={staffMember.email || ''}
                          onChange={(e) => {
                            const currentStaff = Array.isArray(formData.staff) ? formData.staff : []
                            const updatedStaff = [...currentStaff]
                            updatedStaff[index] = { ...updatedStaff[index], email: e.target.value }
                            setFormData({ ...formData, staff: updatedStaff })
                          }}
                          placeholder="Enter staff email (optional)"
                        />
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor={`medicalBranch-${index}`}>Medical Specialties *</label>
                      <select
                        id={`medicalBranch-${index}`}
                        value={staffMember.medicalBranch || ''}
                        onChange={async (e) => {
                          const branch = e.target.value
                          const currentStaff = Array.isArray(formData.staff) ? formData.staff : []
                          const updatedStaff = [...currentStaff]
                          updatedStaff[index] = { 
                            ...updatedStaff[index], 
                            medicalBranch: branch,
                            specializations: []
                          }
                          setFormData({ ...formData, staff: updatedStaff })
                          
                          // Load specializations for this branch
                          if (branch) {
                            try {
                              const response = await fetch(`${getApiUrl()}/api/accounts/specializations/${branch}`, {
                                headers: {
                                  'Authorization': `Bearer ${token}`,
                                  'Content-Type': 'application/json'
                                }
                              })
                              const data = await response.json()
                              if (data.success) {
                                // Store specializations for this staff member
                                updatedStaff[index].availableSpecializations = data.data
                                setFormData({ ...formData, staff: updatedStaff })
                              }
                            } catch (error) {
                              console.error('Error loading specializations:', error)
                            }
                          } else {
                            updatedStaff[index].availableSpecializations = []
                            setFormData({ ...formData, staff: updatedStaff })
                          }
                        }}
                        required
                      >
                        <option value="">Select a branch</option>
                        {medicalBranches.map(branch => (
                          <option key={branch.value} value={branch.value}>
                            {branch.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {staffMember.medicalBranch && Array.isArray(staffMember.availableSpecializations) && staffMember.availableSpecializations.length > 0 && (
                      <div className="form-group">
                        <label>Specializations</label>
                        <div className="specializations-list">
                          {staffMember.availableSpecializations.map(spec => (
                            <label key={spec} className="specialization-checkbox">
                              <input
                                type="checkbox"
                                checked={Array.isArray(staffMember.specializations) && staffMember.specializations.includes(spec)}
                                onChange={() => {
                                  const currentStaff = Array.isArray(formData.staff) ? formData.staff : []
                                  const updatedStaff = [...currentStaff]
                                  const currentSpecs = Array.isArray(updatedStaff[index]?.specializations) ? updatedStaff[index].specializations : []
                                  const isSelected = currentSpecs.includes(spec)
                                  updatedStaff[index] = {
                                    ...updatedStaff[index],
                                    specializations: isSelected
                                      ? currentSpecs.filter(s => s !== spec)
                                      : [...currentSpecs, spec]
                                  }
                                  setFormData({ ...formData, staff: updatedStaff })
                                }}
                              />
                              <span>{spec}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className="add-staff-btn"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      staff: [...(Array.isArray(formData.staff) ? formData.staff : []), { title: 'Dr', name: '', medicalBranch: '', specializations: [] }]
                    })
                  }}
                >
                  + Add Staff Member
                </button>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="vat">VAT Number *</label>
                  <input
                    type="text"
                    id="vat"
                    value={formData.vat || ''}
                    onChange={(e) => setFormData({ ...formData, vat: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="crNumber">CR Number *</label>
                  <input
                    type="text"
                    id="crNumber"
                    value={formData.crNumber || ''}
                    onChange={(e) => setFormData({ ...formData, crNumber: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="creditLimit">Credit Limit (BHD) *</label>
                <input
                  type="number"
                  id="creditLimit"
                  value={formData.creditLimit || 0}
                  onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div className="form-actions">
                <PrimaryButton type="submit">
                  {selectedAccount ? 'Update Account' : 'Create Account'}
                </PrimaryButton>
                <SecondaryButton
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setShowEditModal(false)
                    setSelectedAccount(null)
                    resetForm()
                  }}
                >
                  Cancel
                </SecondaryButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Account Modal */}
      {showViewModal && viewAccount && (
        <div className="modal-overlay" onClick={() => {
          setShowViewModal(false)
          setViewAccount(null)
        }}>
          <div className="modal-content view-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Account Details</h2>
              <button className="modal-close" onClick={() => {
                setShowViewModal(false)
                setViewAccount(null)
              }}>×</button>
            </div>
            <div className="view-modal-body">
              <div className="view-section">
                <h3>Basic Information</h3>
                {viewAccount.logo?.url && (
                  <div className="view-field" style={{ marginBottom: '16px' }}>
                    <strong>Logo:</strong>
                    <div style={{ flex: 1 }}>
                      <img src={viewAccount.logo.url} alt={viewAccount.name} className="view-logo" />
                    </div>
                  </div>
                )}
                <div className="view-field">
                  <strong>Name:</strong>
                  <span>{viewAccount.name || 'N/A'}</span>
                </div>
                <div className="view-field">
                  <strong>Phone Number:</strong>
                  <span>{viewAccount.phone || 'N/A'}</span>
                </div>
                <div className="view-field">
                  <strong>Email:</strong>
                  <span>{viewAccount.email || 'N/A'}</span>
                </div>
                <div className="view-field">
                  <strong>Status:</strong>
                  <span className={`account-status ${viewAccount.isActive ? 'active' : 'inactive'}`}>
                    {viewAccount.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="view-section">
                <h3>Address</h3>
                <div className="view-field">
                  <strong>Flat/Shop No.:</strong>
                  <span>{viewAccount.address?.flatShopNo || 'N/A'}</span>
                </div>
                <div className="view-field">
                  <strong>Building:</strong>
                  <span>{viewAccount.address?.building || 'N/A'}</span>
                </div>
                <div className="view-field">
                  <strong>Road:</strong>
                  <span>{viewAccount.address?.road || 'N/A'}</span>
                </div>
                <div className="view-field">
                  <strong>Block:</strong>
                  <span>{viewAccount.address?.block || 'N/A'}</span>
                </div>
                <div className="view-field">
                  <strong>Area:</strong>
                  <span>{viewAccount.address?.area || 'N/A'}</span>
                </div>
              </div>

              <div className="view-section">
                <h3>Staff</h3>
                {viewAccount.staff && Array.isArray(viewAccount.staff) && viewAccount.staff.length > 0 ? (
                  viewAccount.staff.map((s, idx) => (
                    <div key={idx} className="staff-view-item">
                      <div className="view-field">
                        <strong>Staff {idx + 1}:</strong>
                        <span>{s.title} {s.name || 'N/A'}</span>
                      </div>
                      {s.phone && (
                        <div className="view-field">
                          <strong>Phone Number:</strong>
                          <span>{s.phone}</span>
                        </div>
                      )}
                      {s.email && (
                        <div className="view-field">
                          <strong>Email:</strong>
                          <span>{s.email}</span>
                        </div>
                      )}
                      {s.medicalBranch && (
                        <div className="view-field">
                          <strong>Medical Specialties:</strong>
                          <span>{s.medicalBranch.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                        </div>
                      )}
                      {s.specializations && Array.isArray(s.specializations) && s.specializations.length > 0 && (
                        <div className="view-field">
                          <strong>Specializations:</strong>
                          <span>{s.specializations.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p>No staff members</p>
                )}
              </div>

              <div className="view-section">
                <h3>Business Information</h3>
                <div className="view-field">
                  <strong>VAT Number:</strong>
                  <span>{viewAccount.vat || 'N/A'}</span>
                </div>
                <div className="view-field">
                  <strong>CR Number:</strong>
                  <span>{viewAccount.crNumber || 'N/A'}</span>
                </div>
                <div className="view-field">
                  <strong>Credit Limit:</strong>
                  <span>{viewAccount.creditLimit?.toLocaleString() || '0'} BHD</span>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <SecondaryButton onClick={() => {
                setShowViewModal(false)
                setViewAccount(null)
              }}>
                Close
              </SecondaryButton>
            </div>
          </div>
        </div>
      )}

      {/* Import Excel Modal */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => {
          if (!importing) {
            setShowImportModal(false)
            setExcelFile(null)
            setImportResults(null)
            setErrorMessage('')
          }
        }}>
          <div className="modal-content import-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Import Accounts from Excel</h2>
              <button 
                className="modal-close" 
                onClick={() => {
                  if (!importing) {
                    setShowImportModal(false)
                    setExcelFile(null)
                    setImportResults(null)
                    setErrorMessage('')
                  }
                }}
                disabled={importing}
              >
                ×
              </button>
            </div>
            <div className="import-modal-body">
              <div className="import-instructions">
                <h3>Instructions:</h3>
                <ul className="instructions-list">
                  <li>Download the template file to see the required format</li>
                  <li><strong>Required fields:</strong> Name, Phone Number, Area, Flat/Shop No., Building, Road, Block, VAT Number, CR Number, Credit Limit, Status</li>
                  <li><strong>Optional fields:</strong> Staff, Logo</li>
                  <li><strong>Note:</strong> Only Staff and Logo are optional - all other fields are required</li>
                  <li><strong>Staff format (optional):</strong> Title|Name|Phone|Email|MedicalBranch|Specializations (use semicolon ; to separate multiple staff)</li>
                  <li><strong>Example:</strong> Dr|John Doe|+973 12345678|john@example.com|dentistry|orthodontics,implants</li>
                  <li><strong>Note:</strong> Email is optional - you can leave it empty: Dr|John Doe|+973 12345678||dentistry|orthodontics,implants</li>
                  <li>Status should be "active" or "inactive"</li>
                  <li>Supported formats: .xlsx, .xls, .csv</li>
                </ul>
              </div>

              <div className="file-upload-section">
                <button type="button" className="secondary-button" onClick={handleDownloadTemplate} style={{ marginBottom: '16px' }}>
                  📥 Download Template
                </button>
                
                <label htmlFor="excel-file-upload" className="file-upload-label">
                  <div className={`file-upload-box ${excelFile ? 'file-selected' : ''}`}>
                    {excelFile ? (
                      <div className="file-selected">
                        <span className="file-name">📄 {excelFile.name}</span>
                        <button
                          type="button"
                          className="remove-file-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            setExcelFile(null)
                            const fileInput = document.getElementById('excel-file-upload')
                            if (fileInput) fileInput.value = ''
                          }}
                          disabled={importing}
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="file-upload-placeholder">
                        <span className="upload-icon-large">📁</span>
                        <span>Click to select Excel file</span>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    id="excel-file-upload"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleExcelFileChange}
                    className="file-input"
                    disabled={importing}
                  />
                </label>
              </div>

              {errorMessage && (
                <div className="error-message" style={{ marginTop: '16px' }}>
                  {errorMessage}
                </div>
              )}

              {importResults && (
                <div className="import-results">
                  <div className="results-summary">
                    <div className={`result-success`}>
                      ✓ Successfully imported: {importResults.success}
                    </div>
                    {importResults.failed > 0 && (
                      <div className={`result-failed`}>
                        ✗ Failed: {importResults.failed}
                      </div>
                    )}
                  </div>
                  {importResults.errors && importResults.errors.length > 0 && (
                    <div className="errors-list">
                      <h4>Errors:</h4>
                      <div className="errors-scroll">
                        {importResults.errors.map((error, idx) => (
                          <div key={idx} className="error-item">
                            <strong>Row {error.row}</strong> ({error.name}): {error.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="modal-actions" style={{ marginTop: '24px' }}>
                <PrimaryButton 
                  onClick={handleBulkImport} 
                  disabled={!excelFile || importing}
                >
                  {importing ? 'Importing...' : 'Import Accounts'}
                </PrimaryButton>
                <SecondaryButton
                  onClick={() => {
                    if (!importing) {
                      setShowImportModal(false)
                      setExcelFile(null)
                      setImportResults(null)
                      setErrorMessage('')
                    }
                  }}
                  disabled={importing}
                >
                  Cancel
                </SecondaryButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Popup */}
      {showConfirmPopup && (
        <div className="modal-overlay" onClick={() => setShowConfirmPopup(false)}>
          <div className="confirm-popup" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Action</h3>
            <p>{confirmMessage}</p>
            <div className="confirm-actions">
              <PrimaryButton onClick={() => {
                if (confirmAction) {
                  confirmAction()
                }
              }}>
                Confirm
              </PrimaryButton>
              <SecondaryButton onClick={() => {
                setShowConfirmPopup(false)
                setConfirmAction(null)
              }}>
                Cancel
              </SecondaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Accounts

