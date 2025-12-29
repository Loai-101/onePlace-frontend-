import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getApiUrl } from '../../utils/security'
import PageSection from '../../components/PageSection.jsx'
import PrimaryButton from '../../components/PrimaryButton.jsx'
import SecondaryButton from '../../components/SecondaryButton.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import './Categories.css'

function Categories() {
  const { token } = useAuth()
  const [categories, setCategories] = useState([])
  const [filteredCategories, setFilteredCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showConfirmPopup, setShowConfirmPopup] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [confirmMessage, setConfirmMessage] = useState('')
  const [confirmAction, setConfirmAction] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    brand: '',
    isActive: true,
    image: ''
  })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [uploading, setUploading] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [excelFile, setExcelFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState(null)

  useEffect(() => {
    if (token) {
      loadBrands()
      loadCategories()
    }
  }, [token])

  useEffect(() => {
    filterCategories()
  }, [categories, searchTerm, selectedBrand])

  const loadBrands = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/brands?includeInactive=true`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()
      if (data.success) {
        setBrands(data.data)
      }
    } catch (error) {
      console.error('Error loading brands:', error)
    }
  }

  const loadCategories = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${getApiUrl()}/api/categories?includeInactive=true`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      
      if (data.success) {
        setCategories(data.data)
        setFilteredCategories(data.data)
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterCategories = () => {
    let filtered = categories

    // Filter by brand
    if (selectedBrand !== 'all') {
      filtered = filtered.filter(category => 
        category.brand && category.brand._id === selectedBrand
      )
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(category => 
        category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    setFilteredCategories(filtered)
  }

  const handleCreateCategory = async (e) => {
    e.preventDefault()
    
    try {
      let imageUrl = formData.image
      
      // Upload image if a new file was selected
      if (imageFile) {
        imageUrl = await uploadImageToSupabase(imageFile)
      }
      
      const response = await fetch(`${getApiUrl()}/api/categories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          image: {
            url: imageUrl || undefined,
            alt: formData.name
          }
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setShowCreateModal(false)
        resetForm()
        loadCategories()
        setSuccessMessage('Category created successfully!')
        setShowSuccessPopup(true)
      } else {
        setSuccessMessage(data.message || 'Error creating category')
        setShowSuccessPopup(true)
      }
    } catch (error) {
      console.error('Error creating category:', error)
      setSuccessMessage('Error creating category: ' + error.message)
      setShowSuccessPopup(true)
    }
  }

  const handleUpdateCategory = async (e) => {
    e.preventDefault()
    
    try {
      let imageUrl = formData.image
      
      // Upload image if a new file was selected
      if (imageFile) {
        imageUrl = await uploadImageToSupabase(imageFile)
      }
      
      const response = await fetch(`${getApiUrl()}/api/categories/${selectedCategory._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          image: {
            url: imageUrl || undefined,
            alt: formData.name
          }
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setShowEditModal(false)
        resetForm()
        loadCategories()
        setSuccessMessage('Category updated successfully!')
        setShowSuccessPopup(true)
      } else {
        setSuccessMessage(data.message || 'Error updating category')
        setShowSuccessPopup(true)
      }
    } catch (error) {
      console.error('Error updating category:', error)
      setSuccessMessage('Error updating category')
      setShowSuccessPopup(true)
    }
  }

  const handleDeleteCategory = (categoryId, categoryName, productCount) => {
    if (productCount > 0) {
      setSuccessMessage(`Cannot delete "${categoryName}". It has ${productCount} products associated with it.`)
      setShowSuccessPopup(true)
      return
    }

    setConfirmMessage(`Are you sure you want to delete "${categoryName}"? This action cannot be undone.`)
    setConfirmAction(() => async () => {
      try {
        const response = await fetch(`${getApiUrl()}/api/categories/${categoryId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        const data = await response.json()
        
        if (data.success) {
          loadCategories()
          setSuccessMessage(data.message)
          setShowSuccessPopup(true)
        } else {
          setSuccessMessage(data.message)
          setShowSuccessPopup(true)
        }
      } catch (error) {
        console.error('Error deleting category:', error)
        setSuccessMessage('Error deleting category')
        setShowSuccessPopup(true)
      }
    })
    setShowConfirmPopup(true)
  }

  const handleToggleCategoryStatus = async (categoryId, categoryName, currentStatus) => {
    const newStatus = !currentStatus
    const action = newStatus ? 'activate' : 'deactivate'
    
    setConfirmMessage(`Are you sure you want to ${action} "${categoryName}"?`)
    setConfirmAction(() => async () => {
      try {
        const response = await fetch(`${getApiUrl()}/api/categories/${categoryId}`, {
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
          loadCategories()
          setSuccessMessage(`Category ${action}d successfully!`)
          setShowSuccessPopup(true)
        } else {
          setSuccessMessage(data.message)
          setShowSuccessPopup(true)
        }
      } catch (error) {
        console.error(`Error ${action}ing category:`, error)
        setSuccessMessage(`Error ${action}ing category`)
        setShowSuccessPopup(true)
      }
    })
    setShowConfirmPopup(true)
  }

  const openCreateModal = () => {
    resetForm()
    setShowCreateModal(true)
  }

  const openEditModal = (category) => {
    setSelectedCategory(category)
    setFormData({
      name: category.name,
      description: category.description || '',
      brand: category.brand?._id || '',
      isActive: category.isActive !== false,
      image: category.image?.url || ''
    })
    setImageFile(null)
    setImagePreview(category.image?.url || '')
    setShowEditModal(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      brand: '',
      isActive: true,
      image: ''
    })
    setImageFile(null)
    setImagePreview('')
    setSelectedCategory(null)
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setSuccessMessage('Please select an image file')
        setShowSuccessPopup(true)
        return
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setSuccessMessage('Image size must be less than 5MB')
        setShowSuccessPopup(true)
        return
      }

      setImageFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview('')
    setFormData({...formData, image: ''})
  }

  const uploadImageToSupabase = async (file) => {
    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('image', file)
      formData.append('folder', 'categories')

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
        setSuccessMessage('Please select an Excel file (.xlsx, .xls) or CSV file')
        setShowSuccessPopup(true)
        return
      }
      
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        setSuccessMessage('File size must be less than 10MB')
        setShowSuccessPopup(true)
        return
      }

      setExcelFile(file)
    }
  }

  const handleDownloadTemplate = () => {
    // Create template data
    const templateData = [
      {
        'Category Name': 'Drill Bits',
        'Brand Name': 'Example Brand',
        'Description': 'Various dental drill bits',
        'Is Active': 'true',
        'Image URL': 'https://example.com/image.jpg'
      },
      {
        'Category Name': 'Composite Materials',
        'Brand Name': 'Example Brand',
        'Description': 'Composite resins',
        'Is Active': 'true',
        'Image URL': ''
      }
    ]

    // Convert to CSV format
    const headers = ['Category Name', 'Brand Name', 'Description', 'Is Active', 'Image URL']
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
    link.setAttribute('download', 'categories_template.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleBulkImport = async () => {
    if (!excelFile) {
      setSuccessMessage('Please select an Excel file')
      setShowSuccessPopup(true)
      return
    }

    try {
      setImporting(true)
      const formData = new FormData()
      formData.append('excelFile', excelFile)

      const response = await fetch(`${getApiUrl()}/api/categories/bulk-import`, {
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
        loadCategories()
        setSuccessMessage(data.message)
        setShowSuccessPopup(true)
      } else {
        setSuccessMessage(data.message || 'Error importing categories')
        setShowSuccessPopup(true)
      }
    } catch (error) {
      console.error('Import error:', error)
      setSuccessMessage('Error importing categories: ' + error.message)
      setShowSuccessPopup(true)
    } finally {
      setImporting(false)
    }
  }

  if (!token) {
    return (
      <div className="categories-page">
        <h1 className="page-title">Category Management</h1>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Please login to access Category Management.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="categories-page">
        <h1 className="page-title">Category Management</h1>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Loading categories...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="categories-page">
      <div className="page-header">
        <h1 className="page-title">Category Management</h1>
        <div className="category-count-badge">
          {categories.length} Categories
        </div>
      </div>
      
      <PageSection title="Categories">
        <div className="categories-toolbar">
          <div className="categories-toolbar-left">
            <PrimaryButton onClick={openCreateModal}>
              + New Category
            </PrimaryButton>
            <SecondaryButton onClick={() => setShowImportModal(true)}>
              📊 Import from Excel
            </SecondaryButton>
          </div>
          <div className="filters">
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="brand-filter"
            >
              <option value="all">All Brands</option>
              {brands.map(brand => (
                <option key={brand._id} value={brand._id}>
                  {brand.name}
                </option>
              ))}
            </select>
            <input 
              type="text" 
              placeholder="Search categories..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
        
        {filteredCategories.length > 0 ? (
          <div className="categories-grid">
            {filteredCategories.map(category => (
              <div key={category._id} className="category-card">
                <div className="category-card-header">
                  {category.image?.url && (
                    <img src={category.image.url} alt={category.name} className="category-image" />
                  )}
                  <div className="category-info">
                    <h3 className="category-name">{category.name}</h3>
                    <p className="category-description">{category.description || 'No description'}</p>
                  </div>
                  {category.brand && (
                    <div className="category-brand" style={{ borderLeft: `4px solid ${category.brand.brandColor || '#667eea'}` }}>
                      {category.brand.logo?.url && (
                        <img src={category.brand.logo.url} alt={category.brand.name} className="brand-logo-small" />
                      )}
                      <span className="brand-name">{category.brand.name}</span>
                    </div>
                  )}
                </div>
                <div className="category-card-body">
                  <div className="category-meta">
                    <span className={`category-status ${category.isActive ? 'active' : 'inactive'}`}>
                      {category.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className="total-product-count">
                      {category.totalProductCount || 0} Total Products
                    </span>
                  </div>
                  {category.brandProductCounts && category.brandProductCounts.length > 0 && (
                    <div className="brand-product-counts">
                      <div className="brand-counts-label">Products by Brand (Qt):</div>
                      <div className="brand-counts-list">
                        {category.brandProductCounts.map((brandCount, index) => (
                          <div key={index} className="brand-count-item" style={{ borderLeft: `3px solid ${brandCount.brandColor || '#667eea'}` }}>
                            {brandCount.brandLogo?.url && (
                              <img src={brandCount.brandLogo.url} alt={brandCount.brandName} className="brand-logo-tiny" />
                            )}
                            <span className="brand-count-name">{brandCount.brandName}</span>
                            <span className="brand-count-number">{brandCount.productCount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="category-card-actions">
                  <button className="btn-text" onClick={() => openEditModal(category)}>
                    Edit
                  </button>
                  {category.isActive ? (
                    <button 
                      className="btn-text btn-deactivate" 
                      onClick={() => handleToggleCategoryStatus(category._id, category.name, category.isActive)}
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button 
                      className="btn-text btn-activate" 
                      onClick={() => handleToggleCategoryStatus(category._id, category.name, category.isActive)}
                    >
                      Activate
                    </button>
                  )}
                  <button 
                    className="btn-text btn-delete" 
                    onClick={() => handleDeleteCategory(category._id, category.name, category.totalProductCount || 0)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="No categories found. Create your first category to get started." />
        )}
      </PageSection>

      {/* Create Category Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Category</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateCategory} className="category-form">
              <div className="form-section-header">
                <h3>Basic Information</h3>
              </div>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Brand *</label>
                  <select
                    value={formData.brand}
                    onChange={(e) => setFormData({...formData, brand: e.target.value})}
                    required
                    className="form-select"
                  >
                    <option value="">Select a brand</option>
                    {brands.map(brand => (
                      <option key={brand._id} value={brand._id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>Category Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    placeholder="Enter category name"
                  />
                </div>
                <div className="form-group full-width">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows="3"
                    placeholder="Enter category description"
                  />
                </div>
                <div className="form-group full-width">
                  <label>Category Image (Optional)</label>
                  <div className="image-upload-container">
                    {imagePreview ? (
                      <div className="image-preview-wrapper">
                        <img src={imagePreview} alt="Image preview" className="image-preview" />
                        <button 
                          type="button" 
                          className="remove-image-btn"
                          onClick={handleRemoveImage}
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="image-upload-placeholder">
                        <input
                          type="file"
                          id="image-upload-create"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="image-file-input"
                        />
                        <label htmlFor="image-upload-create" className="image-upload-label">
                          <span className="upload-icon">📷</span>
                          <span>Click to upload image</span>
                          <small>PNG, JPG up to 5MB</small>
                        </label>
                      </div>
                    )}
                    {!imagePreview && formData.image && (
                      <div className="image-url-input-wrapper">
                        <input
                          type="url"
                          value={formData.image}
                          onChange={(e) => setFormData({...formData, image: e.target.value})}
                          placeholder="Or enter image URL"
                          className="image-url-input"
                        />
                      </div>
                    )}
                  </div>
                  {uploading && (
                    <div className="upload-status">Uploading image...</div>
                  )}
                </div>
              </div>

              <div className="modal-actions">
                <SecondaryButton type="button" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </SecondaryButton>
                <PrimaryButton type="submit" disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Create Category'}
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {showEditModal && selectedCategory && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Category</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <form onSubmit={handleUpdateCategory} className="category-form">
              <div className="form-section-header">
                <h3>Basic Information</h3>
              </div>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Brand *</label>
                  <select
                    value={formData.brand}
                    onChange={(e) => setFormData({...formData, brand: e.target.value})}
                    required
                    className="form-select"
                  >
                    <option value="">Select a brand</option>
                    {brands.map(brand => (
                      <option key={brand._id} value={brand._id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>Category Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    placeholder="Enter category name"
                  />
                </div>
                <div className="form-group full-width">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows="3"
                    placeholder="Enter category description"
                  />
                </div>
                <div className="form-group full-width">
                  <label>Category Image (Optional)</label>
                  <div className="image-upload-container">
                    {imagePreview ? (
                      <div className="image-preview-wrapper">
                        <img src={imagePreview} alt="Image preview" className="image-preview" />
                        <button 
                          type="button" 
                          className="remove-image-btn"
                          onClick={handleRemoveImage}
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="image-upload-placeholder">
                        <input
                          type="file"
                          id="image-upload-edit"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="image-file-input"
                        />
                        <label htmlFor="image-upload-edit" className="image-upload-label">
                          <span className="upload-icon">📷</span>
                          <span>Click to upload image</span>
                          <small>PNG, JPG up to 5MB</small>
                        </label>
                      </div>
                    )}
                    {!imagePreview && formData.image && (
                      <div className="image-url-input-wrapper">
                        <input
                          type="url"
                          value={formData.image}
                          onChange={(e) => setFormData({...formData, image: e.target.value})}
                          placeholder="Or enter image URL"
                          className="image-url-input"
                        />
                      </div>
                    )}
                  </div>
                  {uploading && (
                    <div className="upload-status">Uploading image...</div>
                  )}
                </div>
              </div>

              <div className="modal-actions">
                <SecondaryButton type="button" onClick={() => setShowEditModal(false)}>
                  Cancel
                </SecondaryButton>
                <PrimaryButton type="submit" disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Update Category'}
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
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Import Categories from Excel</h2>
              <button className="modal-close" onClick={() => setShowImportModal(false)}>×</button>
            </div>
            <div className="import-modal-content">
              <div className="import-instructions">
                <h3>Instructions:</h3>
                <ul className="instructions-list">
                  <li>Download the template file to see the required format</li>
                  <li>Required columns: <strong>Category Name</strong>, <strong>Brand Name</strong></li>
                  <li>Optional columns: <strong>Description</strong>, <strong>Is Active</strong> (true/false), <strong>Image URL</strong></li>
                  <li>Brand Name must match an existing brand in the system</li>
                  <li>Maximum file size: 10MB</li>
                </ul>
              </div>

              <div className="import-actions">
                <SecondaryButton onClick={handleDownloadTemplate}>
                  Download Template
                </SecondaryButton>
              </div>

              <div className="file-upload-section">
                <label className="file-upload-label">
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
                            <strong>Row {error.row}:</strong> {error.categoryName} - {error.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="modal-actions">
                <SecondaryButton 
                  type="button" 
                  onClick={() => {
                    setShowImportModal(false)
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
                  {importing ? 'Importing...' : 'Import Categories'}
                </PrimaryButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Categories
