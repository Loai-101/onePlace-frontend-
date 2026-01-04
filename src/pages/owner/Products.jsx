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
import './Products.css'

function Products() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMainCategory, setSelectedMainCategory] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedBrand, setSelectedBrand] = useState('all')
  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [showConfirmPopup, setShowConfirmPopup] = useState(false)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showErrorPopup, setShowErrorPopup] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [confirmMessage, setConfirmMessage] = useState('')
  const [confirmAction, setConfirmAction] = useState(null)
  const [excelFile, setExcelFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState(null)
  const [importMainCategory, setImportMainCategory] = useState('')
  const [showDownloadModal, setShowDownloadModal] = useState(false)
  const [showProductModal, setShowProductModal] = useState(false)
  
  // Auto-focus popups when they open
  usePopupFocus(showImportModal, '.modal-content')
  usePopupFocus(showDownloadModal, '.modal-content')
  usePopupFocus(showProductModal, '.modal-content')
  usePopupFocus(showSuccessPopup)
  usePopupFocus(showErrorPopup)
  usePopupFocus(showConfirmPopup)
  const [editingProduct, setEditingProduct] = useState(null)
  const [productFormData, setProductFormData] = useState({
    name: '',
    sku: '',
    brand: '',
    mainCategory: '',
    category: '',
    description: '',
    price: '',
    costPrice: '',
    currency: 'BD',
    hasVat: false,
    vatPercent: 10,
    stock: {
      current: 0,
      minimum: 5,
      maximum: 1000
    },
    status: 'active',
    isFeatured: false,
    tags: {
      comingSoon: false,
      firePrice: false,
      newArrivals: false,
      discount: false
    },
    discountPercent: 0
  })
  const [productImages, setProductImages] = useState([])
  const [uploadingProduct, setUploadingProduct] = useState(false)

  useEffect(() => {
    if (token) {
      loadProducts()
      loadCategories()
      loadBrands()
    }
  }, [token])

  const generateDefaultSKU = () => {
    // Generate SKU based on timestamp and random number
    const timestamp = Date.now().toString(36).toUpperCase().slice(-6)
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `PROD-${timestamp}-${random}`
  }

  useEffect(() => {
    if (showProductModal && editingProduct) {
      // Load product data for editing
      // Map VAT from backend structure (vat.rate, vat.isExempt) to frontend (hasVat, vatPercent)
      const hasVat = editingProduct.vat ? !editingProduct.vat.isExempt : false
      const vatPercent = editingProduct.vat?.rate || 10
      
      // Extract tags from product tags array
      const productTags = editingProduct.tags || []
      const tags = {
        comingSoon: productTags.includes('coming soon'),
        firePrice: productTags.includes('fire price'),
        newArrivals: productTags.includes('new arrivals'),
        discount: productTags.includes('discount')
      }
      
      setProductFormData({
        name: editingProduct.name || '',
        sku: editingProduct.sku || '',
        brand: editingProduct.brand?._id || '',
        mainCategory: editingProduct.mainCategory || '',
        category: editingProduct.category?._id || '',
        description: editingProduct.description || '',
        price: editingProduct.price || '',
        costPrice: editingProduct.pricing?.cost || '',
        currency: editingProduct.currency || 'BD',
        hasVat: hasVat,
        vatPercent: vatPercent,
        stock: {
          current: editingProduct.stock?.current || 0,
          minimum: editingProduct.stock?.minimum || 5,
          maximum: editingProduct.stock?.maximum || 1000
        },
        status: editingProduct.status || 'active',
        isFeatured: editingProduct.isFeatured || false,
        tags: tags,
        discountPercent: editingProduct.pricing?.discount || 0
      })
      setProductImages(editingProduct.images || [])
    } else if (showProductModal && !editingProduct) {
      // Reset form for new product with auto-generated SKU
      setProductFormData({
        name: '',
        sku: generateDefaultSKU(),
        brand: '',
        mainCategory: '',
        category: '',
        description: '',
        price: '',
        costPrice: '',
        currency: 'BD',
        hasVat: false,
        vatPercent: 10,
        stock: {
          current: 0,
          minimum: 5,
          maximum: 1000
        },
        status: 'active',
        isFeatured: false,
        tags: {
          comingSoon: false,
          firePrice: false,
          newArrivals: false,
          discount: false
        },
        discountPercent: 0
      })
      setProductImages([])
    }
  }, [showProductModal, editingProduct])

  useEffect(() => {
    filterProducts()
  }, [products, searchTerm, selectedMainCategory, selectedCategory, selectedBrand])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${getApiUrl()}/api/products`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()
      if (data.success) {
        setProducts(data.data || [])
        setFilteredProducts(data.data || [])
      } else {
        console.error('Error loading products:', data.message)
        setProducts([])
        setFilteredProducts([])
      }
    } catch (error) {
      console.error('Error loading products:', error)
      setProducts([])
      setFilteredProducts([])
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/categories?includeInactive=false`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()
      if (data.success) {
        // Ensure categories have brand data populated
        setCategories(data.data.map(cat => ({
          ...cat,
          brand: cat.brand || (typeof cat.brand === 'string' ? { _id: cat.brand } : null)
        })))
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const loadBrands = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/brands?includeInactive=false`, {
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

  const filterProducts = () => {
    let filtered = products

    // Filter by main category first
    if (selectedMainCategory !== 'all') {
      filtered = filtered.filter(product => 
        product.mainCategory === selectedMainCategory
      )
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => 
        product.category?._id === selectedCategory
      )
    }

    // Filter by brand
    if (selectedBrand !== 'all') {
      filtered = filtered.filter(product => 
        product.brand?._id === selectedBrand
      )
    }

    setFilteredProducts(filtered)
  }

  const handleDeleteProduct = (productId, productName) => {
    setConfirmMessage(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)
    setConfirmAction(() => async () => {
      try {
        const response = await fetch(`${getApiUrl()}/api/products/${productId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        const data = await response.json()
        
        if (data.success) {
          loadProducts()
          setSuccessMessage(data.message)
          setShowSuccessPopup(true)
        } else {
          setSuccessMessage(data.message)
          setShowSuccessPopup(true)
        }
      } catch (error) {
        console.error('Error deleting product:', error)
        setErrorMessage('Error deleting product: ' + (error.message || 'Unknown error'))
        setShowErrorPopup(true)
      }
    })
    setShowConfirmPopup(true)
  }

  const handleToggleProductStatus = async (productId, productName, currentStatus) => {
    const isActive = currentStatus === 'active'
    const newStatus = isActive ? 'inactive' : 'active'
    const action = isActive ? 'deactivate' : 'activate'
    
    setConfirmMessage(`Are you sure you want to ${action} "${productName}"?`)
    setConfirmAction(() => async () => {
      try {
        const response = await fetch(`${getApiUrl()}/api/products/${productId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: newStatus
          })
        })

        const data = await response.json()
        
        if (data.success) {
          loadProducts()
          setSuccessMessage(`Product ${action}d successfully!`)
          setShowSuccessPopup(true)
        } else {
          setErrorMessage(data.message || `Error ${action}ing product`)
          setShowErrorPopup(true)
        }
      } catch (error) {
        console.error(`Error ${action}ing product:`, error)
        setErrorMessage(`Error ${action}ing product: ` + (error.message || 'Unknown error'))
        setShowErrorPopup(true)
      }
    })
    setShowConfirmPopup(true)
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

  const handleDownloadTemplate = (mainCategory = null) => {
    // Use provided main category, or selected importMainCategory, or 'medical' as default
    const defaultMainCategory = mainCategory || importMainCategory || 'medical'
    
    // Create template data (SKU is auto-generated, not required in template)
    const templateData = [
      {
        'Product Name': 'Professional Drill Bit Set',
        'Main Category': defaultMainCategory,
        'Brand Name': 'Example Brand',
        'Category Name': 'Drill Bits',
        'Description': 'High-quality professional drill bit set',
        'Price': '45.99',
        'Cost Price': '30.00',
        'Currency': 'BD',
        'Stock Current': '12',
        'Stock Minimum': '5',
        'Stock Maximum': '100',
        'Status': 'active',
        'Tags': 'new arrivals,fire price',
        'Discount Percent': '0',
        'Image URLs': 'https://example.com/image1.jpg,https://example.com/image2.jpg'
      },
      {
        'Product Name': 'Composite Resin Kit',
        'Main Category': defaultMainCategory,
        'Brand Name': 'Example Brand',
        'Category Name': 'Composite Materials',
        'Description': 'Composite resins for dental work',
        'Price': '89.50',
        'Cost Price': '60.00',
        'Currency': 'BD',
        'Stock Current': '8',
        'Stock Minimum': '5',
        'Stock Maximum': '100',
        'Status': 'active',
        'Tags': 'discount',
        'Discount Percent': '15',
        'Image URLs': ''
      }
    ]

    // Convert to CSV format (SKU removed - auto-generated by system)
    const headers = ['Product Name', 'Main Category', 'Brand Name', 'Category Name', 'Description', 'Price', 'Cost Price', 'Currency', 'Stock Current', 'Stock Minimum', 'Stock Maximum', 'Status', 'Tags', 'Discount Percent', 'Image URLs']
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
    link.setAttribute('download', `products_template${categoryName}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDownloadProducts = (mainCategory = 'all') => {
    // Filter products by main category if specified
    let productsToDownload = products
    if (mainCategory !== 'all') {
      productsToDownload = products.filter(p => p.mainCategory === mainCategory)
    }

    if (productsToDownload.length === 0) {
      setErrorMessage(`No products available${mainCategory !== 'all' ? ` for ${mainCategory}` : ''}`)
      setShowErrorPopup(true)
      setShowDownloadModal(false)
      return
    }

    // Convert products to CSV format
    const headers = ['SKU', 'Product Name', 'Main Category', 'Brand Name', 'Category Name', 'Description', 'Price', 'Cost Price', 'Currency', 'Stock Current', 'Stock Minimum', 'Stock Maximum', 'Status', 'Tags', 'Discount Percent', 'Image URLs']
    
    const csvData = productsToDownload.map(product => {
      // Get brand name
      const brandName = product.brand?.name || ''
      
      // Get category name
      const categoryName = product.category?.name || ''
      
      // Get image URLs (comma-separated)
      const imageUrls = product.images && product.images.length > 0
        ? product.images.map(img => img.url).join(',')
        : ''
      
      return {
        'SKU': product.sku || '',
        'Product Name': product.name || '',
        'Main Category': product.mainCategory || '',
        'Brand Name': brandName,
        'Category Name': categoryName,
        'Description': product.description || '',
        'Price': product.price || 0,
        'Cost Price': product.pricing?.cost || 0,
        'Currency': product.currency || 'BD',
        'Stock Current': product.stock?.current || 0,
        'Stock Minimum': product.stock?.minimum || 5,
        'Stock Maximum': product.stock?.maximum || 1000,
        'Status': product.status || 'active',
        'Tags': product.tags && product.tags.length > 0 ? product.tags.join(',') : '',
        'Discount Percent': product.pricing?.discount || 0,
        'Image URLs': imageUrls
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
    link.setAttribute('download', `products_export${categorySuffix}_${timestamp}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    setSuccessMessage(`Successfully downloaded ${productsToDownload.length} product${productsToDownload.length !== 1 ? 's' : ''}${mainCategory !== 'all' ? ` (${mainCategory})` : ''}`)
    setShowSuccessPopup(true)
    setShowDownloadModal(false)
    
    // Clean up the blob URL
    URL.revokeObjectURL(url)
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
      if (importMainCategory) {
        formData.append('defaultMainCategory', importMainCategory)
      }

      const response = await fetch(`${getApiUrl()}/api/products/bulk-import`, {
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
        loadProducts()
        setSuccessMessage(data.message)
        setShowSuccessPopup(true)
      } else {
        setErrorMessage(data.message || 'Error importing products')
        setShowErrorPopup(true)
      }
    } catch (error) {
      console.error('Import error:', error)
      setErrorMessage('Error importing products: ' + (error.message || 'Unknown error'))
      setShowErrorPopup(true)
    } finally {
      setImporting(false)
    }
  }

  const handleProductFileChange = (e) => {
    const files = Array.from(e.target.files)
    files.forEach(file => {
      if (!file.type.startsWith('image/')) {
        setSuccessMessage('Please select image files only')
        setShowSuccessPopup(true)
        return
      }
      
      if (file.size > 5 * 1024 * 1024) {
        setSuccessMessage('Image size must be less than 5MB')
        setShowSuccessPopup(true)
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        setProductImages(prev => [...prev, {
          url: reader.result,
          alt: file.name,
          isPrimary: prev.length === 0,
          file: file
        }])
      }
      reader.readAsDataURL(file)
    })
  }

  const handleRemoveProductImage = (index) => {
    setProductImages(prev => {
      const newImages = prev.filter((_, i) => i !== index)
      if (newImages.length > 0 && prev[index]?.isPrimary) {
        newImages[0].isPrimary = true
      }
      return newImages
    })
  }

  const handleSetPrimaryImage = (index) => {
    setProductImages(prev => prev.map((img, i) => ({
      ...img,
      isPrimary: i === index
    })))
  }

  const uploadProductImageToSupabase = async (file) => {
    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('folder', 'products')

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
    }
  }

  const handleProductSubmit = async (e) => {
    e.preventDefault()
    
    // Validate that selling price is greater than cost price
    const sellingPrice = parseFloat(productFormData.price) || 0
    const costPrice = parseFloat(productFormData.costPrice) || 0
    
    if (sellingPrice <= costPrice) {
      setSuccessMessage('Selling price must be greater than cost price')
      setShowSuccessPopup(true)
      return
    }
    
    try {
      setUploadingProduct(true)

      // Upload all new images
      const uploadedImages = await Promise.all(
        productImages.map(async (img) => {
          if (img.file) {
            const url = await uploadProductImageToSupabase(img.file)
            return {
              url,
              alt: img.alt || productFormData.name,
              isPrimary: img.isPrimary || false
            }
          } else {
            return {
              url: img.url,
              alt: img.alt || productFormData.name,
              isPrimary: img.isPrimary || false
            }
          }
        })
      )

      // Build tags array from checkboxes
      const tagsArray = []
      if (productFormData.tags.comingSoon) tagsArray.push('coming soon')
      if (productFormData.tags.firePrice) tagsArray.push('fire price')
      if (productFormData.tags.newArrivals) tagsArray.push('new arrivals')
      if (productFormData.tags.discount) tagsArray.push('discount')

      const payload = {
        ...productFormData,
        price: parseFloat(productFormData.price),
        pricing: {
          cost: parseFloat(productFormData.costPrice),
          discount: productFormData.tags.discount ? productFormData.discountPercent : 0
        },
        tags: tagsArray,
        images: uploadedImages,
        vat: {
          rate: productFormData.hasVat ? productFormData.vatPercent : 0,
          isExempt: !productFormData.hasVat
        }
      }
      
      // Remove hasVat, vatPercent, costPrice, tags object, and discountPercent from payload as they're not part of the model directly
      delete payload.hasVat
      delete payload.vatPercent
      delete payload.costPrice
      delete payload.discountPercent

      const url = editingProduct
        ? `${getApiUrl()}/api/products/${editingProduct._id}`
        : `${getApiUrl()}/api/products`
      
      const method = editingProduct ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()
      
      if (!response.ok) {
        if (response.status === 404) {
          setErrorMessage('API endpoint not found. Please check if the server is running.')
        } else if (response.status === 401) {
          setErrorMessage('Unauthorized. Please login again.')
        } else if (response.status === 400) {
          const errorMsg = data.errors 
            ? data.errors.map(e => `${e.field}: ${e.message}`).join(', ')
            : data.message || 'Validation error'
          setErrorMessage(errorMsg)
        } else {
          setErrorMessage(data.message || `Error: ${response.status} ${response.statusText}`)
        }
        setShowErrorPopup(true)
        return
      }
      
      if (data.success) {
        setSuccessMessage(editingProduct ? 'Product updated successfully!' : 'Product created successfully!')
        setShowSuccessPopup(true)
        setShowProductModal(false)
        setEditingProduct(null)
        loadProducts()
      } else {
        setErrorMessage(data.message || 'Error saving product')
        setShowErrorPopup(true)
      }
    } catch (error) {
      console.error('Error saving product:', error)
      setErrorMessage('Error saving product: ' + (error.message || 'Unknown error'))
      setShowErrorPopup(true)
    } finally {
      setUploadingProduct(false)
    }
  }

  if (!token) {
    return (
      <div className="products-page">
        <h1 className="page-title">Product Management</h1>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Please login to access Product Management.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="products-page">
        <h1 className="page-title">Product Management</h1>
        <Loading message="Loading products..." />
      </div>
    )
  }

  return (
    <div className="products-page">
      <div className="page-header">
      <h1 className="page-title">Product Management</h1>
        <div className="product-count-badge">
          {products.length} Products
        </div>
      </div>
      
      <PageSection>
        <div className="products-toolbar">
          <div className="products-toolbar-left">
            <PrimaryButton onClick={() => {
              setEditingProduct(null)
              setShowProductModal(true)
            }}>
              + New Product
            </PrimaryButton>
            <SecondaryButton onClick={() => setShowImportModal(true)}>
              Import from Excel
            </SecondaryButton>
            <SecondaryButton onClick={() => setShowDownloadModal(true)}>
              Download Products
            </SecondaryButton>
          </div>
          <div className="filters">
            <select
              value={selectedMainCategory}
              onChange={(e) => {
                setSelectedMainCategory(e.target.value)
                // Reset category filter when main category changes
                setSelectedCategory('all')
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
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Categories</option>
              {categories
                .filter(cat => selectedMainCategory === 'all' || cat.mainCategory === selectedMainCategory)
                .map(category => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Brands</option>
              {brands
                .filter(brand => {
                  // If main category is selected, only show brands that have products in that main category
                  if (selectedMainCategory !== 'all') {
                    return products.some(p => 
                      p.brand?._id === brand._id && p.mainCategory === selectedMainCategory
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
              placeholder="Search products..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
        
        {/* Products Summary */}
        <div className="products-summary">
          {(() => {
            const activeProducts = filteredProducts.filter(p => p.status === 'active')
            const featuredProducts = filteredProducts.filter(p => p.isFeatured === true)
            
            // Calculate best product (highest profit margin) - only from filtered products
            const bestProduct = filteredProducts.length > 0 
              ? filteredProducts.reduce((best, product) => {
                  const profit = (product.price || 0) - (product.pricing?.cost || 0)
                  const bestProfit = (best.price || 0) - (best.pricing?.cost || 0)
                  return profit > bestProfit ? product : best
                }, filteredProducts[0])
              : null
            
            // Calculate total cost (sum of cost * stock for all filtered products)
            const totalCost = filteredProducts.reduce((sum, product) => {
              const cost = product.pricing?.cost || 0
              const stock = product.stock?.current || 0
              return sum + (cost * stock)
            }, 0)
            
            // Calculate net profit (sum of (selling price - cost) * stock for all filtered products)
            const netProfit = filteredProducts.reduce((sum, product) => {
              const sellingPrice = product.price || 0
              const cost = product.pricing?.cost || 0
              const stock = product.stock?.current || 0
              const profit = (sellingPrice - cost) * stock
              return sum + profit
            }, 0)
            
            // Get currency from first filtered product, or default to BD
            const currency = filteredProducts.length > 0 
              ? (filteredProducts[0]?.currency || 'BD')
              : 'BD'
            
            return (
              <>
                <div className="summary-item">
                  <span className="summary-label">Best Product:</span>
                  <span className="summary-value">{bestProduct?.name || 'N/A'}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Number of Active Products:</span>
                  <span className="summary-value">{activeProducts.length}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Number of Featured Products:</span>
                  <span className="summary-value">{featuredProducts.length}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Product Total Cost:</span>
                  <span className="summary-value">{totalCost.toFixed(2)} {currency}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Product Net Profit:</span>
                  <span className="summary-value profit">{netProfit.toFixed(2)} {currency}</span>
                </div>
              </>
            )
          })()}
        </div>
        
        {filteredProducts.length > 0 ? (
          <div className="products-grid">
            {filteredProducts.map(product => (
              <div key={product._id} className="product-card">
                <div className="product-card-header">
                  <div style={{ position: 'relative', width: '100%' }}>
                    {/* Product Tags */}
                    {product.tags && product.tags.length > 0 && (
                      <div className="product-tags-container">
                        {product.tags.includes('coming soon') && (
                          <span className="product-tag tag-coming-soon">Coming Soon</span>
                        )}
                        {product.tags.includes('fire price') && (
                          <span className="product-tag tag-fire-price">Fire Price</span>
                        )}
                        {product.tags.includes('new arrivals') && (
                          <span className="product-tag tag-new-arrivals">New Arrivals</span>
                        )}
                        {product.tags.includes('discount') && product.pricing?.discount > 0 && (
                          <span className="product-tag tag-discount">Discount {product.pricing.discount}%</span>
                        )}
                      </div>
                    )}
                    
                    {product.images && product.images.length > 0 && product.images[0]?.url ? (
                      <img 
                        src={product.images.find(img => img.isPrimary)?.url || product.images[0].url} 
                        alt={product.name} 
                        className="product-image"
                      />
                    ) : (
                      <div className="product-image-placeholder">No Image</div>
                    )}
                  </div>
                  <div className="product-info">
                    <h3 className="product-name">{product.name}</h3>
                    {product.category && (
                      <span className="product-category">{product.category.name}</span>
                    )}
                  </div>
                </div>
                <div className="product-card-body">
                  <div className="product-details">
                    {product.brand && (
                      <div className="product-brand">
                        {product.brand.logo?.url && (
                          <img src={product.brand.logo.url} alt={product.brand.name} className="brand-logo-small" />
                        )}
                        <span>{product.brand.name}</span>
                      </div>
                    )}
                    <div className="product-price">
                      {product.price} {product.currency || 'BD'}
                    </div>
                    <div className="product-stock">
                      <span className={`stock-badge ${product.stock?.current <= (product.stock?.minimum || 0) ? 'low' : 'ok'}`}>
                        Stock: {product.stock?.current || 0}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="product-card-actions">
                  <div className="product-card-actions-left">
                    <button className="btn-text" onClick={() => {
                      setEditingProduct(product)
                      setShowProductModal(true)
                    }}>
                      Edit
                    </button>
                    <button
                      className="btn-text btn-delete"
                      onClick={() => handleDeleteProduct(product._id, product.name)}
                    >
                      Delete
                    </button>
                  </div>
                  <div className="product-card-actions-right">
                    {product.status === 'active' ? (
                      <button
                        className="btn-text btn-deactivate"
                        onClick={() => handleToggleProductStatus(product._id, product.name, product.status)}
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        className="btn-text btn-activate"
                        onClick={() => handleToggleProductStatus(product._id, product.name, product.status)}
                      >
                        Activate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="No products found. Create your first product to get started." />
        )}
      </PageSection>

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
              <h2>Import Products from Excel</h2>
              <button className="modal-close" onClick={() => setShowImportModal(false)}>×</button>
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
                  If Main Category is not specified in the Excel file, this value will be used for all products
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
                  <li style={{ marginBottom: '4px' }}>Required columns: <strong>Product Name</strong>, <strong>Main Category</strong> (medical/it-solutions/pharmacy/salon), <strong>Brand Name</strong>, <strong>Category Name</strong></li>
                  <li style={{ marginBottom: '4px' }}>Optional columns: <strong>Description</strong>, <strong>Price</strong>, <strong>Currency</strong> (BD/USD/EUR), <strong>Stock Current</strong>, <strong>Stock Minimum</strong>, <strong>Stock Maximum</strong>, <strong>Status</strong> (active/inactive/out_of_stock/discontinued), <strong>Image URLs</strong> (comma-separated)</li>
                  <li style={{ marginBottom: '4px' }}><strong>SKU will be automatically generated</strong> by the system (format: PROD-XXXXXX-XXX)</li>
                  <li style={{ marginBottom: '4px' }}>Main Category must be one of: <strong>medical</strong>, <strong>it-solutions</strong>, <strong>pharmacy</strong>, or <strong>salon</strong></li>
                  <li style={{ marginBottom: '4px' }}>Brand Name and Category Name must match existing brands and categories in the system</li>
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
                            <strong>Row {error.row}:</strong> SKU: {error.sku} - {error.error}
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
                  {importing ? 'Importing...' : 'Import Products'}
                </PrimaryButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Download Products Modal */}
      {showDownloadModal && (
        <div className="modal-overlay" onClick={() => setShowDownloadModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Download Products</h2>
              <button className="modal-close" onClick={() => setShowDownloadModal(false)}>×</button>
            </div>
              <div style={{ padding: '24px' }}>
              <p style={{ marginBottom: '20px', color: '#555', fontSize: '14px', fontWeight: '500' }}>
                Select a main category to download products from the database:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <PrimaryButton 
                  onClick={() => {
                    handleDownloadProducts('all')
                  }}
                  style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                >
                  Download All Products
                </PrimaryButton>
                <PrimaryButton 
                  onClick={() => {
                    handleDownloadProducts('medical')
                  }}
                  style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                >
                  Download Medical Products
                </PrimaryButton>
                <PrimaryButton 
                  onClick={() => {
                    handleDownloadProducts('it-solutions')
                  }}
                  style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                >
                  Download IT Solutions Products
                </PrimaryButton>
                <PrimaryButton 
                  onClick={() => {
                    handleDownloadProducts('pharmacy')
                  }}
                  style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                >
                  Download Pharmacy Products
                </PrimaryButton>
                <PrimaryButton 
                  onClick={() => {
                    handleDownloadProducts('salon')
                  }}
                  style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                >
                  Download Salon Products
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

      {/* Product Form Modal */}
      {showProductModal && (
        <div className="modal-overlay" onClick={() => {
          setShowProductModal(false)
          setEditingProduct(null)
        }}>
          <div className="modal-content product-form-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingProduct ? 'Edit Product' : 'New Product'}</h2>
              <button className="modal-close" onClick={() => {
                setShowProductModal(false)
                setEditingProduct(null)
              }}>×</button>
            </div>
            <form onSubmit={handleProductSubmit} className="product-form-content">
              <div className="form-section">
                <h3>Product Information</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>SKU *</label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={productFormData.sku}
                        onChange={(e) => setProductFormData({...productFormData, sku: e.target.value.toUpperCase()})}
                        required
                        placeholder="Enter product SKU"
                        style={{ flex: 1 }}
                      />
                      {!editingProduct && (
                        <button
                          type="button"
                          onClick={() => setProductFormData({...productFormData, sku: generateDefaultSKU()})}
                          className="generate-sku-btn"
                          title="Generate new SKU"
                        >
                          🔄
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Main Category *</label>
                    <select
                      value={productFormData.mainCategory}
                      onChange={(e) => setProductFormData({...productFormData, mainCategory: e.target.value, category: ''})}
                      required
                      style={{ width: '100%', padding: '10px 12px', fontSize: '14px', border: '1px solid #e0e0e0', borderRadius: '6px' }}
                    >
                      <option value="">Select a main category *</option>
                      <option value="medical">Medical</option>
                      <option value="it-solutions">IT Solutions</option>
                      <option value="pharmacy">Pharmacy</option>
                      <option value="salon">Salon</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Product Name *</label>
                    <input
                      type="text"
                      value={productFormData.name}
                      onChange={(e) => setProductFormData({...productFormData, name: e.target.value})}
                      required
                      placeholder="Enter product name"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Category *</label>
                    <select
                      value={productFormData.category}
                      onChange={(e) => {
                        const selectedCategoryId = e.target.value
                        const selectedCategory = categories.find(cat => cat._id === selectedCategoryId)
                        // Auto-set brand when category is selected
                        if (selectedCategory && selectedCategory.brand) {
                          const brandId = selectedCategory.brand._id || selectedCategory.brand
                          setProductFormData({
                            ...productFormData,
                            category: selectedCategoryId,
                            brand: brandId
                          })
                        } else {
                          setProductFormData({...productFormData, category: selectedCategoryId, brand: ''})
                        }
                      }}
                      required
                      disabled={!productFormData.mainCategory}
                    >
                      <option value="">{productFormData.mainCategory ? 'Select a category' : 'Select main category first'}</option>
                      {categories
                        .filter(cat => !productFormData.mainCategory || cat.mainCategory === productFormData.mainCategory)
                        .map(category => (
                        <option key={category._id} value={category._id}>
                          {category.name} {category.brand?.name ? `(${category.brand.name})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Brand *</label>
                    {(() => {
                      const selectedCategory = categories.find(cat => cat._id === productFormData.category)
                      const isBrandAutoSet = selectedCategory && selectedCategory.brand
                      const isDisabled = isBrandAutoSet || !productFormData.mainCategory
                      return (
                        <>
                          <select
                            value={productFormData.brand}
                            onChange={(e) => setProductFormData({...productFormData, brand: e.target.value})}
                            required
                            disabled={isDisabled}
                            style={isDisabled ? { 
                              backgroundColor: '#f5f5f5', 
                              cursor: 'not-allowed' 
                            } : {}}
                          >
                            <option value="">
                              {!productFormData.mainCategory 
                                ? 'Select main category first' 
                                : isBrandAutoSet 
                                  ? 'Auto-set from category' 
                                  : 'Select a brand'}
                            </option>
                            {brands
                              .filter(brand => {
                                // Filter by main category if selected
                                if (productFormData.mainCategory && brand.mainCategory) {
                                  return brand.mainCategory === productFormData.mainCategory
                                }
                                // If no main category selected, show all brands
                                return true
                              })
                              .map(brand => (
                                <option key={brand._id} value={brand._id}>
                                  {brand.name}
                                </option>
                              ))}
                          </select>
                          {isBrandAutoSet && (
                            <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                              Brand is automatically set based on selected category
                            </small>
                          )}
                          {!productFormData.mainCategory && (
                            <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                              Please select a main category first
                            </small>
                          )}
                        </>
                      )
                    })()}
                  </div>
                  
                  <div className="form-group">
                    <label>Selling Price *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={productFormData.price}
                      onChange={(e) => setProductFormData({...productFormData, price: e.target.value})}
                      required
                      placeholder="0.00"
                      min={parseFloat(productFormData.costPrice) > 0 ? parseFloat(productFormData.costPrice) + 0.01 : 0}
                    />
                    {productFormData.price && productFormData.costPrice && parseFloat(productFormData.price) <= parseFloat(productFormData.costPrice) && (
                      <small style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                        Selling price must be greater than cost price
                      </small>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label>Cost Price *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={productFormData.costPrice}
                      onChange={(e) => setProductFormData({...productFormData, costPrice: e.target.value})}
                      required
                      placeholder="0.00"
                      max={productFormData.price ? parseFloat(productFormData.price) - 0.01 : undefined}
                    />
                    {productFormData.price && productFormData.costPrice && parseFloat(productFormData.price) <= parseFloat(productFormData.costPrice) && (
                      <small style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                        Cost price must be less than selling price
                      </small>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label>Currency</label>
                    <select
                      value={productFormData.currency}
                      onChange={(e) => setProductFormData({...productFormData, currency: e.target.value})}
                    >
                      <option value="BD">BD</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={productFormData.hasVat}
                        onChange={(e) => setProductFormData({
                          ...productFormData,
                          hasVat: e.target.checked
                        })}
                        style={{ marginRight: '8px' }}
                      />
                      VAT
                    </label>
                    {productFormData.hasVat && (
                      <div style={{ marginTop: '8px' }}>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>
                          VAT Percentage:
                        </label>
                        <select
                          value={productFormData.vatPercent}
                          onChange={(e) => setProductFormData({
                            ...productFormData,
                            vatPercent: parseInt(e.target.value)
                          })}
                          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                        >
                          <option value={10}>10%</option>
                          <option value={15}>15%</option>
                          <option value={20}>20%</option>
                        </select>
                      </div>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label>Current Stock *</label>
                    <input
                      type="number"
                      value={productFormData.stock.current}
                      onChange={(e) => setProductFormData({
                        ...productFormData,
                        stock: {...productFormData.stock, current: parseInt(e.target.value) || 0}
                      })}
                      required
                      min="0"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Minimum Stock</label>
                    <input
                      type="number"
                      value={productFormData.stock.minimum}
                      onChange={(e) => setProductFormData({
                        ...productFormData,
                        stock: {...productFormData.stock, minimum: parseInt(e.target.value) || 0}
                      })}
                      min="0"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={productFormData.status}
                      onChange={(e) => setProductFormData({...productFormData, status: e.target.value})}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="out_of_stock">Out of Stock</option>
                      <option value="discontinued">Discontinued</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={productFormData.isFeatured}
                        onChange={(e) => setProductFormData({
                          ...productFormData,
                          isFeatured: e.target.checked
                        })}
                        style={{ marginRight: '8px' }}
                      />
                      Featured Product
                    </label>
                    <small style={{ display: 'block', marginTop: '4px', color: '#666', fontSize: '12px' }}>
                      Featured products will appear in the Featured Products menu
                    </small>
                  </div>
                </div>
                
                <div className="form-section">
                  <h3>Product Tags</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={productFormData.tags.comingSoon}
                          onChange={(e) => setProductFormData({
                            ...productFormData,
                            tags: {...productFormData.tags, comingSoon: e.target.checked}
                          })}
                          style={{ marginRight: '8px' }}
                        />
                        Coming Soon
                      </label>
                    </div>
                    
                    <div className="form-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={productFormData.tags.firePrice}
                          onChange={(e) => setProductFormData({
                            ...productFormData,
                            tags: {...productFormData.tags, firePrice: e.target.checked}
                          })}
                          style={{ marginRight: '8px' }}
                        />
                        Fire Price
                      </label>
                    </div>
                    
                    <div className="form-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={productFormData.tags.newArrivals}
                          onChange={(e) => setProductFormData({
                            ...productFormData,
                            tags: {...productFormData.tags, newArrivals: e.target.checked}
                          })}
                          style={{ marginRight: '8px' }}
                        />
                        New Arrivals
                      </label>
                    </div>
                    
                    <div className="form-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={productFormData.tags.discount}
                          onChange={(e) => setProductFormData({
                            ...productFormData,
                            tags: {...productFormData.tags, discount: e.target.checked}
                          })}
                          style={{ marginRight: '8px' }}
                        />
                        Discount
                      </label>
                      {productFormData.tags.discount && (
                        <div style={{ marginTop: '8px' }}>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>
                            Discount Percentage:
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={productFormData.discountPercent}
                            onChange={(e) => setProductFormData({
                              ...productFormData,
                              discountPercent: parseFloat(e.target.value) || 0
                            })}
                            placeholder="0"
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="form-group full-width">
                  <label>Description</label>
                  <textarea
                    value={productFormData.description}
                    onChange={(e) => setProductFormData({...productFormData, description: e.target.value})}
                    rows="4"
                    placeholder="Enter product description"
                  />
                </div>
              </div>

              <div className="form-section">
                <h3>Product Images</h3>
                <div className="images-upload-section">
                  <div className="image-upload-container">
                    <input
                      type="file"
                      id="product-images-upload-modal"
                      accept="image/*"
                      multiple
                      onChange={handleProductFileChange}
                      className="image-file-input"
                    />
                    <label htmlFor="product-images-upload-modal" className="image-upload-label">
                      <span className="upload-icon">📷</span>
                      <span>Click to upload images</span>
                      <small>PNG, JPG up to 5MB each (multiple images allowed)</small>
                    </label>
                  </div>
                </div>

                {productImages.length > 0 && (
                  <div className="product-images-grid">
                    {productImages.map((img, index) => (
                      <div key={index} className="product-image-item">
                        <div className="image-wrapper">
                          <img src={img.url} alt={img.alt} className="product-image-preview" />
                          {img.isPrimary && (
                            <div className="primary-badge">Primary</div>
                          )}
                          <button
                            type="button"
                            className="remove-image-btn"
                            onClick={() => handleRemoveProductImage(index)}
                          >
                            ×
                          </button>
                        </div>
                        <div className="image-actions">
                          {!img.isPrimary && (
                            <button
                              type="button"
                              className="set-primary-btn"
                              onClick={() => handleSetPrimaryImage(index)}
                            >
                              Set Primary
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {uploadingProduct && (
                  <div className="upload-status">Uploading images...</div>
                )}
              </div>

              <div className="modal-actions">
                <SecondaryButton 
                  type="button" 
                  onClick={() => {
                    setShowProductModal(false)
                    setEditingProduct(null)
                  }}
                >
                  Cancel
                </SecondaryButton>
                <PrimaryButton type="submit" disabled={uploadingProduct}>
                  {uploadingProduct ? 'Saving...' : (editingProduct ? 'Update Product' : 'Create Product')}
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Products
