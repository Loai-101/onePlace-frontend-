import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getApiUrl } from '../../utils/security'
import PageSection from '../../components/PageSection.jsx'
import PrimaryButton from '../../components/PrimaryButton.jsx'
import SecondaryButton from '../../components/SecondaryButton.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import Loading from '../../components/Loading.jsx'
import { usePopupFocus } from '../../hooks/usePopupFocus'
import './Categories.css'

function Categories() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [categories, setCategories] = useState([])
  const [filteredCategories, setFilteredCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMainCategory, setSelectedMainCategory] = useState('all')
  const [selectedBrand, setSelectedBrand] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)
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
    brand: '', // Keep for backward compatibility
    brands: [], // New: array of brand IDs
    mainCategory: '',
    isActive: true,
    image: ''
  })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [uploading, setUploading] = useState(false)
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
  const [showBrandModal, setShowBrandModal] = useState(false)
  const [selectedBrandDetails, setSelectedBrandDetails] = useState(null)
  const [showBrandEditModal, setShowBrandEditModal] = useState(false)
  const [brandFormData, setBrandFormData] = useState({
    name: '',
    description: '',
    logo: '',
    brandColor: '#667eea'
  })
  const [brandLogoFile, setBrandLogoFile] = useState(null)
  const [brandLogoPreview, setBrandLogoPreview] = useState('')

  useEffect(() => {
    if (token) {
      loadBrands()
      loadCategories()
    }
  }, [token])

  useEffect(() => {
    filterCategories()
  }, [categories, searchTerm, selectedMainCategory, selectedBrand])

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

    // Filter by main category first
    if (selectedMainCategory !== 'all') {
      filtered = filtered.filter(category => 
        category.mainCategory === selectedMainCategory
      )
    }

    // Filter by brand (check both old single brand and new brands array)
    if (selectedBrand !== 'all') {
      filtered = filtered.filter(category => {
        // Check if brand matches in the old single brand field
        if (category.brand && category.brand._id === selectedBrand) {
          return true
        }
        // Check if brand matches in the new brands array
        if (category.brands && Array.isArray(category.brands)) {
          return category.brands.some(brand => 
            (typeof brand === 'object' && brand._id === selectedBrand) ||
            brand === selectedBrand
          )
        }
        return false
      })
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
    
    // Validate that at least one brand is selected
    if (formData.brands.length === 0) {
      setErrorMessage('Please select at least one brand')
      setShowErrorPopup(true)
      return
    }
    
    try {
      let imageUrl = formData.image
      
      // Upload image if a new file was selected
      if (imageFile) {
        imageUrl = await uploadImageToSupabase(imageFile)
      }
      
      // Prepare request body - use brands array, fallback to single brand for backward compatibility
      const requestBody = {
        name: formData.name,
        description: formData.description,
        mainCategory: formData.mainCategory || undefined,
        isActive: formData.isActive,
        image: {
          url: imageUrl || undefined,
          alt: formData.name
        }
      }
      
      // If brands array has items, use it; otherwise use single brand for backward compatibility
      if (formData.brands.length > 0) {
        requestBody.brands = formData.brands
        // Also set brand to first brand for backward compatibility
        requestBody.brand = formData.brands[0]
      } else if (formData.brand) {
        requestBody.brand = formData.brand
        requestBody.brands = [formData.brand]
      }
      
      const response = await fetch(`${getApiUrl()}/api/categories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()
      
      if (data.success) {
        setShowCreateModal(false)
        resetForm()
        loadCategories()
        setSuccessMessage('Category created successfully!')
        setShowSuccessPopup(true)
      } else {
        setErrorMessage(data.message || 'Error creating category')
        setShowErrorPopup(true)
      }
    } catch (error) {
      console.error('Error creating category:', error)
      setErrorMessage('Error creating category: ' + (error.message || 'Unknown error'))
      setShowErrorPopup(true)
    }
  }

  const handleUpdateCategory = async (e) => {
    e.preventDefault()
    
    // Validate that at least one brand is selected
    if (formData.brands.length === 0) {
      setErrorMessage('Please select at least one brand')
      setShowErrorPopup(true)
      return
    }
    
    try {
      let imageUrl = formData.image
      
      // Upload image if a new file was selected
      if (imageFile) {
        imageUrl = await uploadImageToSupabase(imageFile)
      }
      
      // Prepare request body - use brands array, fallback to single brand for backward compatibility
      const requestBody = {
        name: formData.name,
        description: formData.description,
        mainCategory: formData.mainCategory || undefined,
        isActive: formData.isActive,
        image: {
          url: imageUrl || undefined,
          alt: formData.name
        }
      }
      
      // If brands array has items, use it; otherwise use single brand for backward compatibility
      if (formData.brands.length > 0) {
        requestBody.brands = formData.brands
        // Also set brand to first brand for backward compatibility
        requestBody.brand = formData.brands[0]
      } else if (formData.brand) {
        requestBody.brand = formData.brand
        requestBody.brands = [formData.brand]
      }
      
      const response = await fetch(`${getApiUrl()}/api/categories/${selectedCategory._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()
      
      if (data.success) {
        setShowEditModal(false)
        resetForm()
        loadCategories()
        setSuccessMessage('Category updated successfully!')
        setShowSuccessPopup(true)
      } else {
        setErrorMessage(data.message || 'Error updating category')
        setShowErrorPopup(true)
      }
    } catch (error) {
      console.error('Error updating category:', error)
      setErrorMessage('Error updating category: ' + (error.message || 'Unknown error'))
      setShowErrorPopup(true)
    }
  }

  const handleDeleteCategory = (categoryId, categoryName, productCount) => {
    if (productCount > 0) {
      setErrorMessage(`Cannot delete "${categoryName}". It has ${productCount} products associated with it.`)
      setShowErrorPopup(true)
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
          setErrorMessage(data.message || 'Error deleting category')
          setShowErrorPopup(true)
        }
      } catch (error) {
        console.error('Error deleting category:', error)
        setErrorMessage('Error deleting category: ' + (error.message || 'Unknown error'))
        setShowErrorPopup(true)
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
          setErrorMessage(data.message || `Error ${action}ing category`)
          setShowErrorPopup(true)
        }
      } catch (error) {
        console.error(`Error ${action}ing category:`, error)
        setErrorMessage(`Error ${action}ing category: ` + (error.message || 'Unknown error'))
        setShowErrorPopup(true)
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
    // Get all brand IDs from brandProductCounts if available
    const categoryBrands = category.brandProductCounts 
      ? category.brandProductCounts.map(bc => bc.brandId)
      : category.brand?._id 
        ? [category.brand._id] 
        : []
    
    setFormData({
      name: category.name,
      description: category.description || '',
      brand: category.brand?._id || '', // Keep for backward compatibility
      brands: categoryBrands, // Array of brand IDs
      mainCategory: category.mainCategory || '',
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
      brands: [],
      mainCategory: '',
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
        setErrorMessage('Please select an image file')
        setShowErrorPopup(true)
        return
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('Image size must be less than 5MB')
        setShowErrorPopup(true)
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
        'Category Name': 'Drill Bits',
        'Main Category': defaultMainCategory,
        'Brand Name': 'Example Brand',
        'Description': 'Various dental drill bits',
        'Is Active': 'true',
        'Image URL': 'https://example.com/image.jpg'
      },
      {
        'Category Name': 'Composite Materials',
        'Main Category': defaultMainCategory,
        'Brand Name': 'Example Brand',
        'Description': 'Composite resins',
        'Is Active': 'true',
        'Image URL': ''
      }
    ]

    // Convert to CSV format
    const headers = ['Category Name', 'Main Category', 'Brand Name', 'Description', 'Is Active', 'Image URL']
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
    link.setAttribute('download', `categories_template${categoryName}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDownloadCategories = (mainCategory = 'all') => {
    // Filter categories by main category if specified
    let categoriesToDownload = categories
    if (mainCategory !== 'all') {
      categoriesToDownload = categories.filter(c => c.mainCategory === mainCategory)
    }

    if (categoriesToDownload.length === 0) {
      setErrorMessage(`No categories available${mainCategory !== 'all' ? ` for ${mainCategory}` : ''}`)
      setShowErrorPopup(true)
      setShowDownloadModal(false)
      return
    }

    // Convert categories to CSV format
    const headers = ['Category Name', 'Main Category', 'Brand Name', 'Description', 'Is Active', 'Image URL']
    
    const csvData = categoriesToDownload.map(category => {
      // Get brand name(s) - handle both old single brand and new brands array
      let brandNames = []
      if (category.brand && category.brand.name) {
        brandNames.push(category.brand.name)
      }
      if (category.brands && Array.isArray(category.brands)) {
        category.brands.forEach(brand => {
          if (typeof brand === 'object' && brand.name) {
            brandNames.push(brand.name)
          }
        })
      }
      const brandName = brandNames.length > 0 ? brandNames.join(', ') : ''
      
      // Get image URL
      const imageUrl = category.image?.url || ''
      
      return {
        'Category Name': category.name || '',
        'Main Category': category.mainCategory || '',
        'Brand Name': brandName,
        'Description': category.description || '',
        'Is Active': category.isActive ? 'true' : 'false',
        'Image URL': imageUrl
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
    link.setAttribute('download', `categories_export${categorySuffix}_${timestamp}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    setSuccessMessage(`Successfully downloaded ${categoriesToDownload.length} categor${categoriesToDownload.length !== 1 ? 'ies' : 'y'}${mainCategory !== 'all' ? ` (${mainCategory})` : ''}`)
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
        setErrorMessage(data.message || 'Error importing categories')
        setShowErrorPopup(true)
      }
    } catch (error) {
      console.error('Import error:', error)
      setErrorMessage('Error importing categories: ' + (error.message || 'Unknown error'))
      setShowErrorPopup(true)
    } finally {
      setImporting(false)
    }
  }

  const handleBrandTagClick = async (brandId) => {
    try {
      const response = await fetch(`${getApiUrl()}/api/brands/${brandId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      
      if (data.success) {
        setSelectedBrandDetails(data.data)
        setShowBrandModal(true)
      } else {
        setErrorMessage('Error loading brand details')
        setShowErrorPopup(true)
      }
    } catch (error) {
      console.error('Error loading brand:', error)
      setErrorMessage('Error loading brand details: ' + (error.message || 'Unknown error'))
      setShowErrorPopup(true)
    }
  }

  const handleEditBrand = () => {
    if (selectedBrandDetails) {
      setBrandFormData({
        name: selectedBrandDetails.name,
        description: selectedBrandDetails.description || '',
        logo: selectedBrandDetails.logo?.url || '',
        brandColor: selectedBrandDetails.brandColor || '#667eea'
      })
      setBrandLogoFile(null)
      setBrandLogoPreview(selectedBrandDetails.logo?.url || '')
      setShowBrandModal(false)
      setShowBrandEditModal(true)
    }
  }

  const handleBrandFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrorMessage('Please select an image file')
        setShowErrorPopup(true)
        return
      }
      
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('Image size must be less than 5MB')
        setShowErrorPopup(true)
        return
      }

      setBrandLogoFile(file)
      
      const reader = new FileReader()
      reader.onloadend = () => {
        setBrandLogoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveBrandImage = () => {
    setBrandLogoFile(null)
    setBrandLogoPreview('')
    setBrandFormData({...brandFormData, logo: ''})
  }

  const handleUpdateBrand = async (e) => {
    e.preventDefault()
    
    try {
      let logoUrl = brandFormData.logo
      
      if (brandLogoFile) {
        logoUrl = await uploadImageToSupabase(brandLogoFile)
      }
      
      const response = await fetch(`${getApiUrl()}/api/brands/${selectedBrandDetails._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: brandFormData.name,
          description: brandFormData.description,
          logo: {
            url: logoUrl || undefined,
            alt: brandFormData.name
          },
          brandColor: brandFormData.brandColor
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setShowBrandEditModal(false)
        loadCategories() // Refresh categories to update brand info
        // Reload brand details to show updated info
        const response = await fetch(`${getApiUrl()}/api/brands/${selectedBrandDetails._id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        const updatedData = await response.json()
        if (updatedData.success) {
          setSelectedBrandDetails(updatedData.data)
          setShowBrandModal(true)
        }
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

  const handleDeleteBrand = () => {
    if (!selectedBrandDetails) {
      console.error('No brand selected for deletion')
      return
    }

    const brandId = selectedBrandDetails._id
    const brandName = selectedBrandDetails.name
    const productCount = selectedBrandDetails.productCount || 0

    if (productCount > 0) {
      setErrorMessage(`Cannot delete "${brandName}". It has ${productCount} products associated with it.`)
      setShowErrorPopup(true)
      setShowBrandModal(false)
      return
    }

    // Close brand modal first
    setShowBrandModal(false)
    
    // Set confirmation message and action
    setConfirmMessage(`Are you sure you want to delete "${brandName}"? This action cannot be undone.`)
    setConfirmAction(() => async () => {
      try {
        console.log('Deleting brand:', brandId)
        const response = await fetch(`${getApiUrl()}/api/brands/${brandId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        const data = await response.json()
        
        if (data.success) {
          setSelectedBrandDetails(null)
          loadCategories() // Refresh categories to update brand tags
          setSuccessMessage(data.message || 'Brand deleted successfully!')
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
    
    // Show confirmation popup
    setShowConfirmPopup(true)
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
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Loading message="Loading categories..." />
        </div>
      </div>
    )
  }

  return (
    <div className="categories-page">
      <div className="page-header">
        <h1 className="page-title">Category Management</h1>
        <div className="category-count-badge">
          {filteredCategories.length} Categories{selectedMainCategory !== 'all' ? ` (${selectedMainCategory})` : ''}
        </div>
      </div>
      
      <PageSection>
        <div className="categories-toolbar">
          <div className="categories-toolbar-left">
            <PrimaryButton onClick={openCreateModal}>
              + New Category
            </PrimaryButton>
            <SecondaryButton onClick={() => setShowImportModal(true)}>
              Import from Excel
            </SecondaryButton>
            <SecondaryButton onClick={() => setShowDownloadModal(true)}>
              Download Categories
            </SecondaryButton>
          </div>
          <div className="filters">
            <select
              value={selectedMainCategory}
              onChange={(e) => {
                setSelectedMainCategory(e.target.value)
                // Reset brand filter when main category changes
                setSelectedBrand('all')
              }}
              className="filter-select"
            >
              <option value="all">All Main Categories</option>
              <option value="medical">Medical</option>
              <option value="it-solutions">IT Solutions</option>
              <option value="pharmacy">Pharmacy</option>
              <option value="salon">Salon</option>
            </select>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="brand-filter"
            >
              <option value="all">All Brands</option>
              {brands
                .filter(brand => {
                  // If main category is selected, only show brands that have categories in that main category
                  if (selectedMainCategory !== 'all') {
                    return categories.some(cat => 
                      (cat.brands && cat.brands.some(b => b._id === brand._id) || 
                       cat.brand?._id === brand._id) && 
                      cat.mainCategory === selectedMainCategory
                    )
                  }
                  return true
                })
                .map(brand => (
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
                  </div>
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
                  {(() => {
                    // Combine brands from brandProductCounts and category.brands array
                    const allBrands = new Map();
                    
                    // Add brands from brandProductCounts (with product counts)
                    if (category.brandProductCounts && category.brandProductCounts.length > 0) {
                      category.brandProductCounts.forEach(brandCount => {
                        const brandId = brandCount.brandId?.toString() || brandCount.brandId;
                        if (brandId) {
                          allBrands.set(brandId, {
                            brandId: brandCount.brandId,
                            brandName: brandCount.brandName,
                            brandLogo: brandCount.brandLogo,
                            brandColor: brandCount.brandColor,
                            productCount: brandCount.productCount || 0
                          });
                        }
                      });
                    }
                    
                    // Add brands from category.brands array (if not already included)
                    if (category.brands && Array.isArray(category.brands) && category.brands.length > 0) {
                      category.brands.forEach(brand => {
                        if (brand && brand._id) {
                          const brandId = brand._id.toString();
                          if (!allBrands.has(brandId)) {
                            allBrands.set(brandId, {
                              brandId: brand._id,
                              brandName: brand.name,
                              brandLogo: brand.logo,
                              brandColor: brand.brandColor,
                              productCount: 0 // No products yet
                            });
                          }
                        }
                      });
                    }
                    
                    // Also check single brand field for backward compatibility
                    if (category.brand && category.brand._id) {
                      const brandId = category.brand._id.toString();
                      if (!allBrands.has(brandId)) {
                        allBrands.set(brandId, {
                          brandId: category.brand._id,
                          brandName: category.brand.name,
                          brandLogo: category.brand.logo,
                          brandColor: category.brand.brandColor,
                          productCount: 0
                        });
                      }
                    }
                    
                    const brandsList = Array.from(allBrands.values());
                    
                    if (brandsList.length > 0) {
                      return (
                        <div className="category-brands-tags">
                          <div className="brands-tags-label">Brands:</div>
                          <div className="brands-tags-list">
                            {brandsList.map((brandCount, index) => (
                              <button
                                key={brandCount.brandId || index}
                                className="brand-tag"
                                style={{ 
                                  borderLeft: `3px solid ${brandCount.brandColor || '#667eea'}`,
                                  backgroundColor: `${brandCount.brandColor || '#667eea'}15`
                                }}
                                onClick={() => handleBrandTagClick(brandCount.brandId)}
                              >
                                {brandCount.brandLogo?.url && (
                                  <img src={brandCount.brandLogo.url} alt={brandCount.brandName} className="brand-tag-logo" />
                                )}
                                <span className="brand-tag-name">{brandCount.brandName}</span>
                                <span className="brand-tag-count">({brandCount.productCount})</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
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
                  <label>Main Category *</label>
                  <select
                    value={formData.mainCategory}
                    onChange={(e) => setFormData({...formData, mainCategory: e.target.value})}
                    className="form-select"
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
                  <label>Brands * (Select multiple)</label>
                  <div className="brands-multiselect-container">
                    <div className="brands-selected-list">
                      {formData.brands.map(brandId => {
                        const brand = brands.find(b => b._id === brandId)
                        if (!brand) return null
                        return (
                          <span key={brandId} className="selected-brand-tag">
                            {brand.logo?.url && (
                              <img src={brand.logo.url} alt={brand.name} className="selected-brand-logo" />
                            )}
                            <span>{brand.name}</span>
                            <button
                              type="button"
                              className="remove-brand-btn"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  brands: formData.brands.filter(id => id !== brandId)
                                })
                              }}
                            >
                              ×
                            </button>
                          </span>
                        )
                      })}
                    </div>
                    <select
                      value=""
                      onChange={(e) => {
                        const selectedBrandId = e.target.value
                        if (selectedBrandId && !formData.brands.includes(selectedBrandId)) {
                          setFormData({
                            ...formData,
                            brands: [...formData.brands, selectedBrandId]
                          })
                        }
                        e.target.value = '' // Reset select
                      }}
                      className="form-select brands-select"
                    >
                      <option value="">Add a brand...</option>
                      {brands
                        .filter(brand => !formData.brands.includes(brand._id))
                        .map(brand => (
                          <option key={brand._id} value={brand._id}>
                            {brand.name}
                          </option>
                        ))}
                    </select>
                    {formData.brands.length === 0 && (
                      <span className="brands-required-hint">At least one brand is required</span>
                    )}
                  </div>
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
                  <label>Main Category *</label>
                  <select
                    value={formData.mainCategory}
                    onChange={(e) => setFormData({...formData, mainCategory: e.target.value})}
                    className="form-select"
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
        <div className="modal-overlay" style={{ zIndex: 1001 }} onClick={() => setShowConfirmPopup(false)}>
          <div className="confirm-popup" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">?</div>
            <h3>Confirm Action</h3>
            <p>{confirmMessage}</p>
            <div className="confirm-actions">
              <SecondaryButton 
                type="button"
                onClick={() => setShowConfirmPopup(false)}
              >
                Cancel
              </SecondaryButton>
              <PrimaryButton 
                type="button"
                onClick={() => {
                  console.log('Confirm button clicked, executing action')
                  setShowConfirmPopup(false)
                  if (confirmAction) {
                    confirmAction()
                  } else {
                    console.error('No confirm action set')
                  }
                }}
              >
                Confirm
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {/* Import Excel Modal */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ 
            maxWidth: '800px', 
            width: '90%',
            maxHeight: '95vh', 
            overflowY: 'visible',
            margin: 'auto',
            position: 'relative'
          }}>
            <div className="modal-header">
              <h2>Import Categories from Excel</h2>
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
                  If Main Category is not specified in the Excel file, this value will be used for all categories
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
                  <li style={{ marginBottom: '4px' }}>Required columns: <strong>Category Name</strong>, <strong>Main Category</strong> (medical/it-solutions/pharmacy/salon), <strong>Brand Name</strong></li>
                  <li style={{ marginBottom: '4px' }}>Optional columns: <strong>Description</strong>, <strong>Is Active</strong> (true/false), <strong>Image URL</strong></li>
                  <li style={{ marginBottom: '4px' }}>Main Category must be one of: <strong>medical</strong>, <strong>it-solutions</strong>, <strong>pharmacy</strong>, or <strong>salon</strong></li>
                  <li style={{ marginBottom: '4px' }}>Brand Name must match an existing brand in the system</li>
                  <li style={{ marginBottom: '0' }}>Maximum file size: 10MB</li>
                </ul>
              </div>

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
                  {importing ? 'Importing...' : 'Import Categories'}
                </PrimaryButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Download Categories Modal */}
      {showDownloadModal && (
        <div className="modal-overlay" onClick={() => setShowDownloadModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Download Categories</h2>
              <button className="modal-close" onClick={() => setShowDownloadModal(false)}>×</button>
            </div>
            <div style={{ padding: '24px' }}>
              <p style={{ marginBottom: '20px', color: '#555', fontSize: '14px', fontWeight: '500' }}>
                Select a main category to download categories from the database:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <PrimaryButton 
                  onClick={() => {
                    handleDownloadCategories('all')
                  }}
                  style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                >
                  Download All Categories
                </PrimaryButton>
                <PrimaryButton 
                  onClick={() => {
                    handleDownloadCategories('medical')
                  }}
                  style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                >
                  Download Medical Categories
                </PrimaryButton>
                <PrimaryButton 
                  onClick={() => {
                    handleDownloadCategories('it-solutions')
                  }}
                  style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                >
                  Download IT Solutions Categories
                </PrimaryButton>
                <PrimaryButton 
                  onClick={() => {
                    handleDownloadCategories('pharmacy')
                  }}
                  style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                >
                  Download Pharmacy Categories
                </PrimaryButton>
                <PrimaryButton 
                  onClick={() => {
                    handleDownloadCategories('salon')
                  }}
                  style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                >
                  Download Salon Categories
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

      {/* Brand Details Modal */}
      {showBrandModal && selectedBrandDetails && (
        <div className="modal-overlay" onClick={() => setShowBrandModal(false)}>
          <div className="modal-content brand-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Brand Details</h2>
              <button className="modal-close" onClick={() => setShowBrandModal(false)}>×</button>
            </div>
            <div className="brand-details-content">
              <div className="brand-details-header">
                {selectedBrandDetails.logo?.url && (
                  <img src={selectedBrandDetails.logo.url} alt={selectedBrandDetails.name} className="brand-details-logo" />
                )}
                <div className="brand-details-title">
                  <h3>{selectedBrandDetails.name}</h3>
                  <span className={`brand-status-badge ${selectedBrandDetails.isActive ? 'active' : 'inactive'}`}>
                    {selectedBrandDetails.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              
              {selectedBrandDetails.description && (
                <div className="brand-details-section">
                  <h4>Description</h4>
                  <p>{selectedBrandDetails.description}</p>
                </div>
              )}

              <div className="brand-details-section">
                <h4>Brand Information</h4>
                <div className="brand-info-grid">
                  {selectedBrandDetails.website && (
                    <div className="brand-info-item">
                      <span className="brand-info-label">Website:</span>
                      <a href={selectedBrandDetails.website} target="_blank" rel="noopener noreferrer" className="brand-info-value">
                        {selectedBrandDetails.website}
                      </a>
                    </div>
                  )}
                  {selectedBrandDetails.contactInfo?.email && (
                    <div className="brand-info-item">
                      <span className="brand-info-label">Email:</span>
                      <span className="brand-info-value">{selectedBrandDetails.contactInfo.email}</span>
                    </div>
                  )}
                  {selectedBrandDetails.contactInfo?.phone && (
                    <div className="brand-info-item">
                      <span className="brand-info-label">Phone:</span>
                      <span className="brand-info-value">{selectedBrandDetails.contactInfo.phone}</span>
                    </div>
                  )}
                  {selectedBrandDetails.contactInfo?.address && (
                    <div className="brand-info-item">
                      <span className="brand-info-label">Address:</span>
                      <span className="brand-info-value">{selectedBrandDetails.contactInfo.address}</span>
                    </div>
                  )}
                  {selectedBrandDetails.contactInfo?.country && (
                    <div className="brand-info-item">
                      <span className="brand-info-label">Country:</span>
                      <span className="brand-info-value">{selectedBrandDetails.contactInfo.country}</span>
                    </div>
                  )}
                  <div className="brand-info-item">
                    <span className="brand-info-label">Brand Color:</span>
                    <span className="brand-info-value">
                      <span 
                        className="brand-color-preview" 
                        style={{ backgroundColor: selectedBrandDetails.brandColor || '#667eea' }}
                      ></span>
                      {selectedBrandDetails.brandColor || '#667eea'}
                    </span>
                  </div>
                  <div className="brand-info-item">
                    <span className="brand-info-label">Total Products:</span>
                    <span className="brand-info-value">{selectedBrandDetails.productCount || 0}</span>
                  </div>
                </div>
              </div>

            </div>
            <div className="modal-actions brand-modal-actions">
              <SecondaryButton 
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleEditBrand()
                }}
              >
                Edit Brand
              </SecondaryButton>
              <button 
                type="button"
                className="btn-delete-brand"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log('Delete button clicked, brand:', selectedBrandDetails)
                  handleDeleteBrand()
                }}
              >
                Delete Brand
              </button>
              <PrimaryButton 
                type="button"
                onClick={() => setShowBrandModal(false)}
              >
                Close
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {/* Brand Edit Modal */}
      {showBrandEditModal && selectedBrandDetails && (
        <div className="modal-overlay" onClick={() => setShowBrandEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Brand</h2>
              <button className="modal-close" onClick={() => setShowBrandEditModal(false)}>×</button>
            </div>
            <form onSubmit={handleUpdateBrand} className="category-form">
              <div className="form-section-header">
                <h3>Brand Information</h3>
              </div>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Brand Name *</label>
                  <input
                    type="text"
                    value={brandFormData.name}
                    onChange={(e) => setBrandFormData({...brandFormData, name: e.target.value})}
                    required
                    placeholder="Enter brand name"
                  />
                </div>
                <div className="form-group full-width">
                  <label>Description</label>
                  <textarea
                    value={brandFormData.description}
                    onChange={(e) => setBrandFormData({...brandFormData, description: e.target.value})}
                    rows="8"
                    placeholder="Enter brand description (up to 5000 characters)"
                    style={{ minHeight: '150px', resize: 'vertical' }}
                  />
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    {brandFormData.description.length}/5000 characters
                  </div>
                </div>
                <div className="form-group full-width">
                  <label>Brand Color</label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={brandFormData.brandColor}
                      onChange={(e) => setBrandFormData({...brandFormData, brandColor: e.target.value})}
                      style={{ width: '60px', height: '40px', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      value={brandFormData.brandColor}
                      onChange={(e) => setBrandFormData({...brandFormData, brandColor: e.target.value})}
                      placeholder="#667eea"
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>
                <div className="form-group full-width">
                  <label>Brand Logo (Optional)</label>
                  <div className="image-upload-container">
                    {brandLogoPreview ? (
                      <div className="image-preview-wrapper">
                        <img src={brandLogoPreview} alt="Logo preview" className="image-preview" />
                        <button 
                          type="button" 
                          className="remove-image-btn"
                          onClick={handleRemoveBrandImage}
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="image-upload-placeholder">
                        <input
                          type="file"
                          id="brand-logo-upload"
                          accept="image/*"
                          onChange={handleBrandFileChange}
                          className="image-file-input"
                        />
                        <label htmlFor="brand-logo-upload" className="image-upload-label">
                          <span className="upload-icon">📷</span>
                          <span>Click to upload logo</span>
                          <small>PNG, JPG up to 5MB</small>
                        </label>
                      </div>
                    )}
                    {!brandLogoPreview && brandFormData.logo && (
                      <div className="image-url-input-wrapper">
                        <input
                          type="url"
                          value={brandFormData.logo}
                          onChange={(e) => setBrandFormData({...brandFormData, logo: e.target.value})}
                          placeholder="Or enter logo URL"
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
                <SecondaryButton type="button" onClick={() => setShowBrandEditModal(false)}>
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
    </div>
  )
}

export default Categories
