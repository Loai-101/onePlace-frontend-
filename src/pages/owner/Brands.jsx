import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getApiUrl } from '../../utils/security'
import PageSection from '../../components/PageSection.jsx'
import PrimaryButton from '../../components/PrimaryButton.jsx'
import SecondaryButton from '../../components/SecondaryButton.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import Loading from '../../components/Loading.jsx'
import { usePopupFocus } from '../../hooks/usePopupFocus'
import './Brands.css'

function Brands() {
  const { token } = useAuth()
  const [brands, setBrands] = useState([])
  const [filteredBrands, setFilteredBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMainCategory, setSelectedMainCategory] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedBrand, setSelectedBrand] = useState(null)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showErrorPopup, setShowErrorPopup] = useState(false)
  const [showConfirmPopup, setShowConfirmPopup] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [confirmMessage, setConfirmMessage] = useState('')
  const [confirmAction, setConfirmAction] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logo: '',
    brandColor: '#667eea',
    mainCategory: ''
  })
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState('')
  const [uploading, setUploading] = useState(false)
  const [showInactive, setShowInactive] = useState(true)
  const [isComingSoon, setIsComingSoon] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showDownloadModal, setShowDownloadModal] = useState(false)
  
  // Auto-focus popups when they open
  usePopupFocus(showImportModal, '.modal-content')
  usePopupFocus(showDownloadModal, '.modal-content')
  usePopupFocus(showSuccessPopup)
  usePopupFocus(showErrorPopup)
  usePopupFocus(showConfirmPopup)
  
  const [excelFile, setExcelFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState(null)
  const [importMainCategory, setImportMainCategory] = useState('')

  useEffect(() => {
    if (token) {
      loadBrands()
    }
  }, [token])

  useEffect(() => {
    filterBrands()
  }, [brands, searchTerm, selectedMainCategory, showInactive])

  const loadBrands = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${getApiUrl()}/api/brands?includeInactive=true`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      
      if (data.success) {
        setBrands(data.data)
        setFilteredBrands(data.data)
      }
    } catch (error) {
      console.error('Error loading brands:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterBrands = () => {
    let filtered = brands

    // Filter by main category first
    if (selectedMainCategory !== 'all') {
      filtered = filtered.filter(brand => 
        brand.mainCategory === selectedMainCategory
      )
    }

    // Filter by active/inactive status
    if (!showInactive) {
      filtered = filtered.filter(brand => brand.isActive === true)
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(brand => 
        brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (brand.description && brand.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    setFilteredBrands(filtered)
  }

  const handleCreateBrand = async (e) => {
    e.preventDefault()
    
    try {
      let logoUrl = formData.logo
      
      // Upload image if a new file was selected
      if (logoFile) {
        logoUrl = await uploadImageToSupabase(logoFile)
      }
      
      const response = await fetch(`${getApiUrl()}/api/brands`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          logo: {
            url: logoUrl || undefined,
            alt: formData.name
          },
          brandColor: formData.brandColor,
          mainCategory: formData.mainCategory || undefined,
          isActive: !isComingSoon
        })
      })

      const data = await response.json()
      
      console.log('Brand creation response:', data)
      
      if (data.success) {
        setShowCreateModal(false)
        resetForm()
        loadBrands()
        setSuccessMessage(isComingSoon ? 'Coming Soon brand created successfully!' : 'Brand created successfully!')
        setShowSuccessPopup(true)
      } else {
        // Handle errors properly
        let errorMsg = data.message || 'Unknown error'
        
        if (data.errors && Array.isArray(data.errors)) {
          // If errors is an array of strings
          if (typeof data.errors[0] === 'string') {
            errorMsg = data.errors.join(', ')
          } else {
            // If errors is an array of objects
            errorMsg = data.errors.map(e => JSON.stringify(e)).join(', ')
          }
        }
        
        console.error('Brand creation failed:', data)
        console.error('Error message:', errorMsg)
        setErrorMessage(errorMsg)
        setShowErrorPopup(true)
      }
    } catch (error) {
      console.error('Error creating brand:', error)
      setErrorMessage('Error creating brand: ' + (error.message || 'Unknown error'))
      setShowErrorPopup(true)
    }
  }

  const handleUpdateBrand = async (e) => {
    e.preventDefault()
    
    try {
      let logoUrl = formData.logo
      
      // Upload image if a new file was selected
      if (logoFile) {
        logoUrl = await uploadImageToSupabase(logoFile)
      }
      
      const response = await fetch(`${getApiUrl()}/api/brands/${selectedBrand._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          logo: {
            url: logoUrl || undefined,
            alt: formData.name
          },
          brandColor: formData.brandColor,
          mainCategory: formData.mainCategory || undefined
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setShowEditModal(false)
        resetForm()
        loadBrands()
        setSuccessMessage('Brand updated successfully!')
        setShowSuccessPopup(true)
      } else {
        setErrorMessage(data.message || 'Error updating brand')
        setShowErrorPopup(true)
      }
    } catch (error) {
      console.error('Error updating brand:', error)
      setErrorMessage('Error updating brand: ' + (error.message || 'Unknown error'))
      setShowErrorPopup(true)
    }
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
        setShowErrorPopup(true)
        return
      }
      
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage('File size must be less than 10MB')
        setShowErrorPopup(true)
        return
      }

      setExcelFile(file)
    }
  }

  const handleDownloadTemplate = (mainCategory = null) => {
    // Use provided main category, or selected importMainCategory, or 'medical' as default
    const defaultMainCategory = mainCategory || importMainCategory || 'medical'
    
    // Create template data
    const templateData = [
      {
        'Brand Name': 'Example Brand',
        'Main Category': defaultMainCategory,
        'Description': 'High-quality brand description',
        'Brand Color': '#667eea',
        'Is Active': 'true',
        'Logo URL': 'https://example.com/logo.jpg'
      },
      {
        'Brand Name': 'Another Brand',
        'Main Category': defaultMainCategory,
        'Description': 'Another brand description',
        'Brand Color': '#764ba2',
        'Is Active': 'true',
        'Logo URL': ''
      }
    ]

    // Convert to CSV format
    const headers = ['Brand Name', 'Main Category', 'Description', 'Brand Color', 'Is Active', 'Logo URL']
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
    const categoryName = defaultMainCategory !== 'medical' ? `_${defaultMainCategory}` : ''
    link.setAttribute('download', `brands_template${categoryName}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDownloadBrands = (mainCategory = 'all') => {
    // Filter brands by main category if specified
    let brandsToDownload = brands
    if (mainCategory !== 'all') {
      brandsToDownload = brands.filter(b => b.mainCategory === mainCategory)
    }

    if (brandsToDownload.length === 0) {
      setErrorMessage(`No brands available${mainCategory !== 'all' ? ` for ${mainCategory}` : ''}`)
      setShowErrorPopup(true)
      setShowDownloadModal(false)
      return
    }

    // Convert brands to CSV format
    const headers = ['Brand Name', 'Main Category', 'Description', 'Brand Color', 'Is Active', 'Logo URL']
    
    const csvData = brandsToDownload.map(brand => {
      // Get logo URL
      const logoUrl = brand.logo?.url || ''
      
      return {
        'Brand Name': brand.name || '',
        'Main Category': brand.mainCategory || '',
        'Description': brand.description || '',
        'Brand Color': brand.brandColor || '#667eea',
        'Is Active': brand.isActive ? 'true' : 'false',
        'Logo URL': logoUrl
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
    const timestamp = new Date().toISOString().split('T')[0]
    const categorySuffix = mainCategory !== 'all' ? `_${mainCategory}` : ''
    link.setAttribute('download', `brands_export${categorySuffix}_${timestamp}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    setSuccessMessage(`Successfully downloaded ${brandsToDownload.length} brand${brandsToDownload.length !== 1 ? 's' : ''}${mainCategory !== 'all' ? ` (${mainCategory})` : ''}`)
    setShowSuccessPopup(true)
    setShowDownloadModal(false)
    
    // Clean up the blob URL
    URL.revokeObjectURL(url)
  }

  const handleBulkImport = async () => {
    if (!excelFile) {
      setErrorMessage('Please select an Excel file')
      setShowErrorPopup(true)
      return
    }

    try {
      setImporting(true)
      const formData = new FormData()
      formData.append('excelFile', excelFile)
      if (importMainCategory) {
        formData.append('defaultMainCategory', importMainCategory)
      }

      const response = await fetch(`${getApiUrl()}/api/brands/bulk-import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      const data = await response.json()
      
      if (data.success) {
        setImportResults(data.results)
        setExcelFile(null)
        loadBrands()
        setSuccessMessage(data.message)
        setShowSuccessPopup(true)
      } else {
        setErrorMessage(data.message || 'Error importing brands')
        setShowErrorPopup(true)
      }
    } catch (error) {
      console.error('Import error:', error)
      setErrorMessage('Error importing brands: ' + (error.message || 'Unknown error'))
      setShowErrorPopup(true)
    } finally {
      setImporting(false)
    }
  }

  const handleDeleteBrand = (brandId, brandName, productCount) => {
    if (productCount > 0) {
      setErrorMessage(`Cannot delete "${brandName}". It has ${productCount} products associated with it.`)
      setShowErrorPopup(true)
      return
    }

    setConfirmMessage(`Are you sure you want to delete "${brandName}"? This action cannot be undone.`)
    setConfirmAction(() => async () => {
      try {
        const response = await fetch(`${getApiUrl()}/api/brands/${brandId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        const data = await response.json()
        
        if (data.success) {
          loadBrands()
          setSuccessMessage(data.message)
          setShowSuccessPopup(true)
        } else {
          setErrorMessage(data.message || 'Error deleting brand')
          setShowErrorPopup(true)
        }
      } catch (error) {
        console.error('Error deleting brand:', error)
        setErrorMessage('Error deleting brand: ' + (error.message || 'Unknown error'))
        setShowErrorPopup(true)
      }
    })
    setShowConfirmPopup(true)
  }

  const handleToggleBrandStatus = async (brandId, brandName, currentStatus) => {
    const newStatus = !currentStatus
    const action = newStatus ? 'activate' : 'deactivate'
    
    setConfirmMessage(`Are you sure you want to ${action} "${brandName}"?`)
    setConfirmAction(() => async () => {
      try {
        const response = await fetch(`${getApiUrl()}/api/brands/${brandId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            isActive: newStatus
          })
        })

        const data = await response.json()
        
        if (data.success) {
          loadBrands()
          setSuccessMessage(`Brand ${action}d successfully!`)
          setShowSuccessPopup(true)
        } else {
          setErrorMessage(data.message || `Error ${action}ing brand`)
          setShowErrorPopup(true)
        }
      } catch (error) {
        console.error(`Error ${action}ing brand:`, error)
        setErrorMessage(`Error ${action}ing brand: ` + (error.message || 'Unknown error'))
        setShowErrorPopup(true)
      }
    })
    setShowConfirmPopup(true)
  }

  const openCreateModal = () => {
    resetForm()
    setIsComingSoon(false)
    setShowCreateModal(true)
  }

  const openEditModal = (brand) => {
    setSelectedBrand(brand)
    setFormData({
      name: brand.name,
      description: brand.description || '',
      logo: brand.logo?.url || '',
      brandColor: brand.brandColor || '#667eea',
      mainCategory: brand.mainCategory || ''
    })
    setLogoFile(null)
    setLogoPreview(brand.logo?.url || '')
    setShowEditModal(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      logo: '',
      brandColor: '#667eea',
      mainCategory: ''
    })
    setLogoFile(null)
    setLogoPreview('')
    setSelectedBrand(null)
    setIsComingSoon(false)
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrorMessage('Please select an image file')
        setShowErrorPopup(true)
        return
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setSuccessMessage('Image size must be less than 5MB')
        setShowSuccessPopup(true)
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
    setFormData({...formData, logo: ''})
  }

  const uploadImageToSupabase = async (file) => {
    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('image', file)
      formData.append('folder', 'brands')

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

  if (!token) {
    return (
      <div className="brands-page">
        <h1 className="page-title">Brand Management</h1>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Please login to access Brand Management.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="brands-page">
        <h1 className="page-title">Brand Management</h1>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Loading message="Loading brands..." />
        </div>
      </div>
    )
  }

  return (
    <div className="brands-page">
      <div className="page-header">
        <h1 className="page-title">Brand Management</h1>
        <div className="brand-count-badge">
          {filteredBrands.length} Brands{selectedMainCategory !== 'all' ? ` (${selectedMainCategory})` : ''}
        </div>
      </div>
      
      <PageSection>
        <div className="brands-toolbar">
          <div className="brands-toolbar-left">
            <PrimaryButton onClick={openCreateModal}>
              + New Brand
            </PrimaryButton>
            <SecondaryButton onClick={() => setShowImportModal(true)}>
              Import from Excel
            </SecondaryButton>
            <SecondaryButton onClick={() => setShowDownloadModal(true)}>
              Download Brands
            </SecondaryButton>
          </div>
          <div className="filters">
            <select
              value={selectedMainCategory}
              onChange={(e) => setSelectedMainCategory(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Main Categories</option>
              <option value="medical">Medical</option>
              <option value="it-solutions">IT Solutions</option>
              <option value="pharmacy">Pharmacy</option>
              <option value="salon">Salon</option>
            </select>
            <label className="filter-toggle">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="toggle-checkbox"
              />
              <span className="toggle-label">Show Inactive</span>
            </label>
            <input 
              type="text" 
              placeholder="Search brands..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
        
        {filteredBrands.length > 0 ? (
          <div className="brands-grid">
            {filteredBrands.map(brand => (
              <div key={brand._id} className="brand-card" style={{ borderLeft: `4px solid ${brand.brandColor || '#667eea'}` }}>
                <div className="brand-card-header">
                  {brand.logo?.url && (
                    <img src={brand.logo.url} alt={brand.name} className="brand-logo" />
                  )}
                  <div className="brand-info">
                    <h3 className="brand-name">{brand.name}</h3>
                    <p className="brand-description">{brand.description || 'No description'}</p>
                  </div>
                  <div className="brand-color-indicator" style={{ background: brand.brandColor || '#667eea' }} title="Brand Color"></div>
                </div>
                <div className="brand-card-body">
                  <div className="brand-meta">
                    <span className="product-count" style={{ background: `${brand.brandColor}20`, color: brand.brandColor || '#667eea' }}>
                      {brand.productCount || 0} Products
                    </span>
                    <span className={`brand-status ${brand.isActive ? 'active' : 'inactive'}`}>
                      {brand.isActive ? 'Active' : 'Coming Soon'}
                    </span>
                  </div>
                  {brand.website && (
                    <div className="brand-website">
                      <a href={brand.website} target="_blank" rel="noopener noreferrer">
                        {brand.website}
                      </a>
                    </div>
                  )}
                </div>
                <div className="brand-card-actions">
                  <button className="btn-text" onClick={() => openEditModal(brand)}>
                    Edit
                  </button>
                  {brand.isActive ? (
                    <button 
                      className="btn-text btn-deactivate" 
                      onClick={() => handleToggleBrandStatus(brand._id, brand.name, brand.isActive)}
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button 
                      className="btn-text btn-activate" 
                      onClick={() => handleToggleBrandStatus(brand._id, brand.name, brand.isActive)}
                    >
                      Activate
                    </button>
                  )}
                  <button 
                    className="btn-text btn-delete" 
                    onClick={() => handleDeleteBrand(brand._id, brand.name, brand.productCount)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="No brands found. Create your first brand to get started." />
        )}
      </PageSection>

      {/* Create Brand Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{isComingSoon ? 'Create Coming Soon Brand' : 'Create New Brand'}</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateBrand} className="brand-form">
              <div className="form-section-header">
                <h3>Basic Information</h3>
              </div>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Brand Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    placeholder="Enter brand name"
                  />
                </div>
                <div className="form-group full-width">
                  <label>Main Category *</label>
                  <select
                    value={formData.mainCategory}
                    onChange={(e) => setFormData({...formData, mainCategory: e.target.value})}
                    required
                  >
                    <option value="">Select a main category *</option>
                    <option value="medical">Medical</option>
                    <option value="it-solutions">IT Solutions</option>
                    <option value="pharmacy">Pharmacy</option>
                    <option value="salon">Salon</option>
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows="8"
                    placeholder="Enter brand description (up to 5000 characters)"
                    style={{ minHeight: '150px', resize: 'vertical' }}
                  />
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    {formData.description.length}/5000 characters
                  </div>
                </div>
                <div className="form-group full-width">
                  <label>Brand Logo (Optional)</label>
                  <div className="logo-upload-container">
                    {logoPreview ? (
                      <div className="logo-preview-wrapper">
                        <img src={logoPreview} alt="Logo preview" className="logo-preview" />
                        <button 
                          type="button" 
                          className="remove-logo-btn"
                          onClick={handleRemoveImage}
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="logo-upload-placeholder">
                        <input
                          type="file"
                          id="logo-upload-create"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="logo-file-input"
                        />
                        <label htmlFor="logo-upload-create" className="logo-upload-label">
                          <span className="upload-icon">📷</span>
                          <span>Click to upload logo</span>
                          <small>PNG, JPG up to 5MB</small>
                        </label>
                      </div>
                    )}
                    {!logoPreview && formData.logo && (
                      <div className="logo-url-input-wrapper">
                        <input
                          type="url"
                          value={formData.logo}
                          onChange={(e) => setFormData({...formData, logo: e.target.value})}
                          placeholder="Or enter logo URL"
                          className="logo-url-input"
                        />
                      </div>
                    )}
                  </div>
                  {uploading && (
                    <div className="upload-status">Uploading image...</div>
                  )}
                </div>
                <div className="form-group full-width">
                  <label>Brand Color</label>
                  <div className="color-picker-group">
                    <input
                      type="color"
                      value={formData.brandColor}
                      onChange={(e) => setFormData({...formData, brandColor: e.target.value})}
                      className="color-picker"
                    />
                    <input
                      type="text"
                      value={formData.brandColor}
                      onChange={(e) => setFormData({...formData, brandColor: e.target.value})}
                      placeholder="#667eea"
                      pattern="^#[0-9A-Fa-f]{6}$"
                      className="color-input"
                    />
                  </div>
                  <small className="color-hint">This color will be applied to all products under this brand</small>
                </div>
              </div>

              <div className="modal-actions">
                <SecondaryButton type="button" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </SecondaryButton>
                <PrimaryButton type="submit" disabled={uploading}>
                  {uploading ? 'Uploading...' : isComingSoon ? 'Create Coming Soon Brand' : 'Create Brand'}
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Brand Modal */}
      {showEditModal && selectedBrand && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Brand</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <form onSubmit={handleUpdateBrand} className="brand-form">
              <div className="form-section-header">
                <h3>Basic Information</h3>
              </div>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Brand Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    placeholder="Enter brand name"
                  />
                </div>
                <div className="form-group full-width">
                  <label>Main Category *</label>
                  <select
                    value={formData.mainCategory}
                    onChange={(e) => setFormData({...formData, mainCategory: e.target.value})}
                    required
                  >
                    <option value="">Select a main category *</option>
                    <option value="medical">Medical</option>
                    <option value="it-solutions">IT Solutions</option>
                    <option value="pharmacy">Pharmacy</option>
                    <option value="salon">Salon</option>
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows="8"
                    placeholder="Enter brand description (up to 5000 characters)"
                    style={{ minHeight: '150px', resize: 'vertical' }}
                  />
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    {formData.description.length}/5000 characters
                  </div>
                </div>
                <div className="form-group full-width">
                  <label>Brand Logo (Optional)</label>
                  <div className="logo-upload-container">
                    {logoPreview ? (
                      <div className="logo-preview-wrapper">
                        <img src={logoPreview} alt="Logo preview" className="logo-preview" />
                        <button 
                          type="button" 
                          className="remove-logo-btn"
                          onClick={handleRemoveImage}
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="logo-upload-placeholder">
                        <input
                          type="file"
                          id="logo-upload-edit"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="logo-file-input"
                        />
                        <label htmlFor="logo-upload-edit" className="logo-upload-label">
                          <span className="upload-icon">📷</span>
                          <span>Click to upload logo</span>
                          <small>PNG, JPG up to 5MB</small>
                        </label>
                      </div>
                    )}
                    {!logoPreview && formData.logo && (
                      <div className="logo-url-input-wrapper">
                        <input
                          type="url"
                          value={formData.logo}
                          onChange={(e) => setFormData({...formData, logo: e.target.value})}
                          placeholder="Or enter logo URL"
                          className="logo-url-input"
                        />
                      </div>
                    )}
                  </div>
                  {uploading && (
                    <div className="upload-status">Uploading image...</div>
                  )}
                </div>
                <div className="form-group full-width">
                  <label>Brand Color</label>
                  <div className="color-picker-group">
                    <input
                      type="color"
                      value={formData.brandColor}
                      onChange={(e) => setFormData({...formData, brandColor: e.target.value})}
                      className="color-picker"
                    />
                    <input
                      type="text"
                      value={formData.brandColor}
                      onChange={(e) => setFormData({...formData, brandColor: e.target.value})}
                      placeholder="#667eea"
                      pattern="^#[0-9A-Fa-f]{6}$"
                      className="color-input"
                    />
                  </div>
                  <small className="color-hint">This color will be applied to all products under this brand</small>
                </div>
              </div>

              <div className="modal-actions">
                <SecondaryButton type="button" onClick={() => setShowEditModal(false)}>
                  Cancel
                </SecondaryButton>
                <PrimaryButton type="submit" disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Update Brand'}
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="modal-overlay" onClick={() => setShowSuccessPopup(false)}>
          <div className="success-popup" onClick={(e) => e.stopPropagation()}>
            <div className="success-icon">✓</div>
            <h3>Success!</h3>
            <p>{successMessage}</p>
            <PrimaryButton onClick={() => setShowSuccessPopup(false)}>
              OK
            </PrimaryButton>
          </div>
        </div>
      )}

      {/* Error Popup */}
      {showErrorPopup && (
        <div className="modal-overlay" onClick={() => setShowErrorPopup(false)}>
          <div className="error-popup" onClick={(e) => e.stopPropagation()}>
            <div className="error-icon">✗</div>
            <h3>Error!</h3>
            <p>{errorMessage}</p>
            <PrimaryButton onClick={() => setShowErrorPopup(false)}>
              OK
            </PrimaryButton>
          </div>
        </div>
      )}

      {/* Confirm Popup */}
      {showConfirmPopup && (
        <div className="modal-overlay" onClick={() => setShowConfirmPopup(false)}>
          <div className="confirm-popup" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">?</div>
            <h3>Confirm Action</h3>
            <p>{confirmMessage}</p>
            <div className="confirm-actions">
              <SecondaryButton onClick={() => setShowConfirmPopup(false)}>
                Cancel
              </SecondaryButton>
              <PrimaryButton onClick={() => {
                setShowConfirmPopup(false)
                if (confirmAction) confirmAction()
              }}>
                Confirm
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {/* Import Excel Modal */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => {
          setShowImportModal(false)
          setImportMainCategory('')
          setExcelFile(null)
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ 
            maxWidth: '800px', 
            width: '90%',
            maxHeight: '95vh', 
            overflowY: 'visible',
            margin: 'auto',
            position: 'relative'
          }}>
            <div className="modal-header">
              <h2>Import Brands from Excel</h2>
              <button className="modal-close" onClick={() => {
                setShowImportModal(false)
                setImportMainCategory('')
                setExcelFile(null)
              }}>×</button>
            </div>
            <div className="import-modal-content" style={{ padding: '16px', overflowY: 'visible', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* Default Main Category Section - At the top */}
              <div className="import-main-category-section" style={{ 
                marginBottom: '16px', 
                padding: '12px', 
                background: '#f5f5f5', 
                borderRadius: '8px', 
                border: '1px solid #e0e0e0',
                width: '100%',
                maxWidth: '600px'
              }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px', color: '#333', textAlign: 'center' }}>
                  Default Main Category (if not specified in Excel):
                </label>
                <select
                  value={importMainCategory}
                  onChange={(e) => setImportMainCategory(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', fontSize: '14px', border: '1px solid #e0e0e0', borderRadius: '6px', marginBottom: '6px' }}
                >
                  <option value="">Select a main category (Optional - can be specified in Excel)</option>
                  <option value="medical">Medical</option>
                  <option value="it-solutions">IT Solutions</option>
                  <option value="pharmacy">Pharmacy</option>
                  <option value="salon">Salon</option>
                </select>
                <small style={{ display: 'block', color: '#666', fontSize: '11px', lineHeight: '1.3', textAlign: 'center' }}>
                  If Main Category is not specified in the Excel file, this value will be used for all brands
                </small>
              </div>

              {/* Download Template Button */}
              <div className="import-actions" style={{ marginBottom: '16px', textAlign: 'center', width: '100%', maxWidth: '600px' }}>
                <SecondaryButton onClick={handleDownloadTemplate} style={{ width: '100%' }}>
                  📥 Download Template
                </SecondaryButton>
              </div>

              {/* Instructions Section */}
              <div className="import-instructions" style={{ 
                marginBottom: '16px', 
                padding: '12px', 
                background: '#f9f9f9', 
                borderRadius: '8px', 
                border: '1px solid #e0e0e0',
                width: '100%',
                maxWidth: '600px'
              }}>
                <h3 style={{ marginTop: '0', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#333', textAlign: 'center' }}>Instructions:</h3>
                <ul className="instructions-list" style={{ margin: '0', paddingLeft: '18px', lineHeight: '1.5', fontSize: '12px', color: '#555' }}>
                  <li style={{ marginBottom: '4px' }}>Download the template file to see the required format</li>
                  <li style={{ marginBottom: '4px' }}>Required columns: <strong>Brand Name</strong>, <strong>Main Category</strong> (medical/it-solutions/pharmacy/salon)</li>
                  <li style={{ marginBottom: '4px' }}>Optional columns: <strong>Description</strong>, <strong>Brand Color</strong> (hex code), <strong>Is Active</strong> (true/false), <strong>Logo URL</strong></li>
                  <li style={{ marginBottom: '4px' }}>Main Category must be one of: <strong>medical</strong>, <strong>it-solutions</strong>, <strong>pharmacy</strong>, or <strong>salon</strong></li>
                  <li style={{ marginBottom: '0' }}>Maximum file size: 10MB</li>
                </ul>
              </div>

              {/* File Upload Section */}
              <div className="file-upload-section" style={{ marginBottom: '16px', width: '100%', maxWidth: '600px' }}>
                <label className="file-upload-label" style={{ display: 'block' }}>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleExcelFileChange}
                    className="file-input"
                  />
                  <div className="file-upload-box">
                    {excelFile ? (
                      <div className="file-selected">
                        <span className="file-name">{excelFile.name}</span>
                        <button 
                          type="button" 
                          className="remove-file-btn"
                          onClick={() => setExcelFile(null)}
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="file-upload-placeholder">
                        <span className="upload-icon-large">📄</span>
                        <span>Click to select Excel file</span>
                        <small>.xlsx, .xls, or .csv up to 10MB</small>
                      </div>
                    )}
                  </div>
                </label>
              </div>

              {importResults && (
                <div className="import-results">
                  <h3>Import Results</h3>
                  <div className="results-summary">
                    <span className="result-success">✓ {importResults.success} Successful</span>
                    <span className="result-failed">✗ {importResults.failed} Failed</span>
                  </div>
                  {importResults.errors.length > 0 && (
                    <div className="errors-list">
                      <h4>Errors:</h4>
                      <div className="errors-scroll">
                        {importResults.errors.map((error, index) => (
                          <div key={index} className="error-item">
                            <strong>Row {error.row}:</strong> {error.brandName} - {error.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Modal Actions */}
              <div className="modal-actions" style={{ 
                display: 'flex', 
                justifyContent: 'flex-end', 
                gap: '12px', 
                paddingTop: '16px', 
                borderTop: '1px solid #e0e0e0',
                marginTop: '16px'
              }}>
                <SecondaryButton 
                  type="button" 
                  onClick={() => {
                    setShowImportModal(false)
                    setImportMainCategory('')
                    setExcelFile(null)
                    setImportResults(null)
                  }}
                >
                  Close
                </SecondaryButton>
                <PrimaryButton 
                  onClick={handleBulkImport} 
                  disabled={!excelFile || importing}
                >
                  {importing ? 'Importing...' : 'Import Brands'}
                </PrimaryButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Download Brands Modal */}
      {showDownloadModal && (
        <div className="modal-overlay" onClick={() => setShowDownloadModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Download Brands</h2>
              <button className="modal-close" onClick={() => setShowDownloadModal(false)}>×</button>
            </div>
            <div style={{ padding: '24px' }}>
              <p style={{ marginBottom: '20px', color: '#555', fontSize: '14px', fontWeight: '500' }}>
                Select a main category to download brands from the database:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <PrimaryButton 
                  onClick={() => {
                    handleDownloadBrands('all')
                  }}
                  style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                >
                  Download All Brands
                </PrimaryButton>
                <PrimaryButton 
                  onClick={() => {
                    handleDownloadBrands('medical')
                  }}
                  style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                >
                  Download Medical Brands
                </PrimaryButton>
                <PrimaryButton 
                  onClick={() => {
                    handleDownloadBrands('it-solutions')
                  }}
                  style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                >
                  Download IT Solutions Brands
                </PrimaryButton>
                <PrimaryButton 
                  onClick={() => {
                    handleDownloadBrands('pharmacy')
                  }}
                  style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                >
                  Download Pharmacy Brands
                </PrimaryButton>
                <PrimaryButton 
                  onClick={() => {
                    handleDownloadBrands('salon')
                  }}
                  style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                >
                  Download Salon Brands
                </PrimaryButton>
              </div>
              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e0e0e0' }}>
                <SecondaryButton 
                  onClick={() => setShowDownloadModal(false)}
                  style={{ width: '100%' }}
                >
                  Cancel
                </SecondaryButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Brands

