import { Link } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getApiUrl } from '../../utils/security'
import PageSection from '../../components/PageSection.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import Loading from '../../components/Loading.jsx'
import { usePopupFocus } from '../../hooks/usePopupFocus'
import './Catalog.css'

function Catalog() {
  const { token, user } = useAuth()
  const isOwner = user?.role === 'owner' || user?.role === 'admin'
  const [companies, setCompanies] = useState([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [selectedMainCategory, setSelectedMainCategory] = useState('all')
  const [categories, setCategories] = useState([{ name: 'All', image: null }])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [brands, setBrands] = useState([{ name: 'All', logo: null }])
  const [loadingBrands, setLoadingBrands] = useState(true)
  const [allProducts, setAllProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(true)

  // Fetch accounts from API
  useEffect(() => {
    const loadAccounts = async () => {
      if (!token) return

      try {
        const response = await fetch(`${getApiUrl()}/api/accounts`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        const data = await response.json()

        if (data.success && data.data) {
          // Transform accounts to companies format
          const transformedCompanies = data.data
            .filter(account => account.isActive) // Only show active accounts
            .map((account, index) => {
              // Build location from address
              const locationParts = [
                account.address?.flatShopNo,
                account.address?.building,
                account.address?.road,
                account.address?.block,
                account.address?.area
              ].filter(Boolean)
              const location = locationParts.length > 0 ? locationParts.join(', ') : account.address?.area || 'N/A'

              // Transform staff to employees
              const employees = (account.staff && Array.isArray(account.staff) && account.staff.length > 0)
                ? account.staff.map((staffMember, staffIndex) => ({
                    id: `${account._id}-${staffIndex}`,
                    name: `${staffMember.title} ${staffMember.name || ''}`.trim() || 'Unnamed Staff',
                    role: staffMember.medicalBranch 
                      ? staffMember.medicalBranch.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                      : 'Staff',
                    email: '', // Accounts don't have email
                    medicalBranch: staffMember.medicalBranch || '',
                    specializations: staffMember.specializations || []
                  }))
                : []

              return {
                id: account._id || index,
                name: account.name,
                location: location,
                employees: employees,
                accountId: account._id,
                logo: account.logo?.url || null
              }
            })

          setCompanies(transformedCompanies)
        }
      } catch (error) {
        console.error('Error loading accounts:', error)
        setCompanies([]) // Set empty array on error
      } finally {
        setLoadingAccounts(false)
      }
    }

    loadAccounts()
  }, [token])

  // Fetch categories from API
  useEffect(() => {
    const loadCategories = async () => {
      if (!token) return

      try {
        let url = `${getApiUrl()}/api/categories`
        if (selectedMainCategory && selectedMainCategory !== 'all') {
          url += `?mainCategory=${selectedMainCategory}`
        }
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        const data = await response.json()

        if (data.success && data.data) {
          // Get categories with their images from active categories
          const categoryList = data.data
            .filter(category => category.isActive) // Only show active categories
            .map(category => ({
              name: category.name,
              image: category.image?.url || null
            }))
            // Remove duplicates by name (keep first occurrence)
            .filter((category, index, self) => 
              self.findIndex(c => c.name === category.name) === index
            )
            .sort((a, b) => a.name.localeCompare(b.name)) // Sort alphabetically

          setCategories([{ name: 'All', image: null }, ...categoryList])
        }
      } catch (error) {
        console.error('Error loading categories:', error)
        setCategories([{ name: 'All', image: null }]) // Set default on error
      } finally {
        setLoadingCategories(false)
      }
    }

    loadCategories()
  }, [token, selectedMainCategory])

  // Fetch brands from API
  useEffect(() => {
    const loadBrands = async () => {
      if (!token) return

      try {
        let url = `${getApiUrl()}/api/brands`
        if (selectedMainCategory && selectedMainCategory !== 'all') {
          url += `?mainCategory=${selectedMainCategory}`
        }
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        const data = await response.json()

        if (data.success && data.data) {
          // Get brands with their logos from active brands
          const brandList = data.data
            .filter(brand => brand.isActive) // Only show active brands
            .map(brand => ({
              name: brand.name,
              logo: brand.logo?.url || null
            }))
            .sort((a, b) => a.name.localeCompare(b.name)) // Sort alphabetically

          setBrands([{ name: 'All', logo: null }, ...brandList])
        }
      } catch (error) {
        console.error('Error loading brands:', error)
        setBrands([{ name: 'All', logo: null }]) // Set default on error
      } finally {
        setLoadingBrands(false)
      }
    }

    loadBrands()
  }, [token, selectedMainCategory])

  // Fetch products from API
  useEffect(() => {
    const loadProducts = async () => {
      if (!token) return

      try {
        let url = `${getApiUrl()}/api/products?limit=1000&status=active`
        if (selectedMainCategory && selectedMainCategory !== 'all') {
          url += `&mainCategory=${selectedMainCategory}`
        }
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        const data = await response.json()

        if (data.success && data.data) {
          // Filter only active products and transform to catalog format
          const productList = data.data
            .filter(product => product.status === 'active')
            .map(product => ({
              id: product._id,
              name: product.name,
              brand: product.brand?.name || 'Unknown Brand',
              brandId: product.brand?._id,
              category: product.category?.name || 'Uncategorized',
              categoryId: product.category?._id,
              price: `${product.currency || 'BD'} ${product.price?.toFixed(2) || '0.00'}`,
              priceValue: product.price || 0,
              currency: product.currency || 'BD',
              stock: product.stock?.current || 0,
              image: product.images && product.images.length > 0 
                ? product.images.find(img => img.isPrimary)?.url || product.images[0]?.url 
                : null,
              images: product.images && product.images.length > 0
                ? product.images.map(img => img.url)
                : [],
              sku: product.sku || '',
              description: product.description || '',
              tags: product.tags || [],
              discount: product.pricing?.discount || 0,
              isFeatured: product.isFeatured === true,
              vat: product.vat || { rate: 0, isExempt: true }
            }))

          setAllProducts(productList)
        }
      } catch (error) {
        console.error('Error loading products:', error)
        setAllProducts([]) // Set empty array on error
      } finally {
        setLoadingProducts(false)
      }
    }

    loadProducts()
  }, [token, selectedMainCategory])

  // State for filters
  const [selectedCompany, setSelectedCompany] = useState('All')
  const [selectedEmployee, setSelectedEmployee] = useState('All')
  const [selectedOrderStatus, setSelectedOrderStatus] = useState('Normal')
  const [selectedCategory, setSelectedCategory] = useState('All') // For custom dropdown buttons
  const [selectedBrand, setSelectedBrand] = useState('All') // For custom dropdown buttons
  const [selectedTag, setSelectedTag] = useState('All') // For filter bar
  const [selectedVat, setSelectedVat] = useState('All') // For filter bar
  const [searchTerm, setSearchTerm] = useState('')
  const [priceFilter, setPriceFilter] = useState('All')
  const [stockFilter, setStockFilter] = useState('All')

  // Order status options
  const orderStatuses = [
    { value: 'Normal', label: 'Normal', color: '#27ae60' },
    { value: 'Urgent', label: 'Urgent', color: '#e74c3c' },
    { value: 'Rush', label: 'Rush', color: '#f39c12' },
    { value: 'Emergency', label: 'Emergency', color: '#8e44ad' }
  ]

  // Get employees for selected company
  const selectedCompanyData = companies.find(company => company.name === selectedCompany)
  const availableEmployees = selectedCompanyData ? selectedCompanyData.employees : []

  // Handle company selection and reset employee
  const handleCompanyChange = (companyName) => {
    setSelectedCompany(companyName)
    setSelectedEmployee('All') // Reset employee when company changes
    setShowCompanyDropdown(false)
  }

  // Handle category selection
  const handleCategoryChange = (categoryName) => {
    setSelectedCategory(categoryName)
    setShowCategoryDropdown(false)
  }

  // Handle brand selection
  const handleBrandChange = (brandName) => {
    setSelectedBrand(brandName)
    setShowBrandDropdown(false)
  }

  // Handle add to cart with validation
  const handleAddToCart = (product) => {
    // Check if required selections are made
    if (selectedCompany === 'All' || selectedEmployee === 'All') {
      setShowValidationPopup(true)
      return
    }
    
    // Get existing cart from localStorage
    const existingCart = JSON.parse(localStorage.getItem('shoppingCart') || '[]')
    
    // Check if cart has items from different company
    if (existingCart.length > 0) {
      const firstItemCompany = existingCart[0].company
      if (firstItemCompany !== selectedCompany) {
        setShowCompanyMismatchPopup(true)
        return
      }
    }
    
    // Check stock availability
    const availableStock = product.stock || 0
    
    // Check if product is out of stock
    if (availableStock <= 0) {
      alert(`Sorry, "${product.name}" is out of stock.`)
      return
    }
    
    // Check if there's already this product in cart for this employee
    const existingItemForEmployee = existingCart.find(item => 
      (item.productId === product.id || item.productName === product.name) && 
      item.employee === selectedEmployee
    )
    
    // Calculate total quantity if item already exists
    const currentQuantityInCart = existingItemForEmployee ? existingItemForEmployee.quantity : 0
    const requestedQuantity = currentQuantityInCart + 1
    
    // Check if requested quantity exceeds available stock
    if (requestedQuantity > availableStock) {
      alert(`Sorry, only ${availableStock} units of "${product.name}" are available in stock. You already have ${currentQuantityInCart} in your cart.`)
      return
    }
    
    // Get VAT rate from product (0 if exempt, otherwise use the rate)
    const vatRate = product.vat && !product.vat.isExempt ? (product.vat.rate || 0) : 0
    
    // Create order object with all details
    const orderItem = {
      id: Date.now(), // Unique ID for this order item
      productId: product.id,
      productName: product.name,
      brand: product.brand,
      category: product.category,
      unitPrice: product.priceValue || 0,
      priceDisplay: product.price,
      quantity: 1, // Default quantity
      totalPrice: product.priceValue || 0,
      company: selectedCompany,
      employee: selectedEmployee,
      orderStatus: selectedOrderStatus,
      orderDate: new Date().toISOString().split('T')[0], // Current date
      orderTime: new Date().toLocaleTimeString(),
      status: 'Pending', // Order status
      notes: '',
      vatRate: vatRate, // Store VAT rate from product
      stock: availableStock // Store available stock at time of adding
    }
    
    // Add new item to cart
    const updatedCart = [...existingCart, orderItem]
    
    // Save to localStorage
    localStorage.setItem('shoppingCart', JSON.stringify(updatedCart))
    
    // Dispatch custom event to update header cart count
    window.dispatchEvent(new CustomEvent('cartUpdated'))
    
    // Show success message
    setShowSuccessPopup({
      show: true,
      product: product.name,
      company: selectedCompany,
      employee: selectedEmployee,
      status: selectedOrderStatus,
      price: product.price,
      totalItems: updatedCart.length
    })
    
    // Optional: You can also redirect to cart page
    // window.location.href = '/cart'
  }

  // State for validation popup
  const [showValidationPopup, setShowValidationPopup] = useState(false)
  const validationPopupRef = useRef(null)
  
  // Auto-focus popup when it opens
  usePopupFocus(showValidationPopup, '.validation-popup')
  
  // State for success popup
  const [showSuccessPopup, setShowSuccessPopup] = useState({
    show: false,
    product: '',
    company: '',
    employee: '',
    status: '',
    price: '',
    totalItems: 0
  })
  
  // State for company mismatch popup
  const [showCompanyMismatchPopup, setShowCompanyMismatchPopup] = useState(false)

  // State for product details modal
  const [showProductDetailsModal, setShowProductDetailsModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)

  // State for product image slideshow (per product)
  const [productImageIndices, setProductImageIndices] = useState({})

  // State for custom dropdowns
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false)
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [showBrandDropdown, setShowBrandDropdown] = useState(false)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target
      // Check if click is outside all custom dropdowns
      if (!target.closest('.custom-dropdown') && 
          !target.closest('.custom-select-options') &&
          !target.closest('.custom-select-button')) {
        setShowCompanyDropdown(false)
        setShowCategoryDropdown(false)
        setShowBrandDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle view product details
  const handleViewProductDetails = (product) => {
    setSelectedProduct(product)
    setShowProductDetailsModal(true)
  }

  // Handle close product details modal
  const handleCloseProductDetailsModal = () => {
    setShowProductDetailsModal(false)
    setSelectedProduct(null)
  }

  // Filter products based on selected filters
  const filteredProducts = allProducts.filter(product => {
    // Match by category (from custom dropdown buttons)
    const categoryMatch = selectedCategory === 'All' || 
      product.category === selectedCategory
    // Match by brand (from custom dropdown buttons)
    const brandMatch = selectedBrand === 'All' || 
      product.brand === selectedBrand
    // Match by product tags (from filter bar)
    const tagMatch = selectedTag === 'All' || 
      (product.tags && product.tags.length > 0 && product.tags.includes(selectedTag.toLowerCase()))
    // Match by VAT (from filter bar)
    const vatMatch = selectedVat === 'All' || 
      (selectedVat === 'With VAT' && product.vat && !product.vat.isExempt && product.vat.rate > 0) ||
      (selectedVat === 'Without VAT' && (!product.vat || product.vat.isExempt || product.vat.rate === 0))
    // Match by search term
    const searchMatch = !searchTerm || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    // Match by price filter
    let priceMatch = true
    if (priceFilter === 'Low') {
      priceMatch = product.priceValue < 50
    } else if (priceFilter === 'Medium') {
      priceMatch = product.priceValue >= 50 && product.priceValue < 200
    } else if (priceFilter === 'High') {
      priceMatch = product.priceValue >= 200
    }
    // Match by stock filter
    let stockMatch = true
    if (stockFilter === 'In Stock') {
      stockMatch = product.stock > 0
    } else if (stockFilter === 'Low Stock') {
      stockMatch = product.stock > 0 && product.stock < 10
    } else if (stockFilter === 'Out of Stock') {
      stockMatch = product.stock === 0
    }
    
    return categoryMatch && brandMatch && tagMatch && vatMatch && searchMatch && priceMatch && stockMatch
  })

  // Initialize image indices for products with multiple images
  useEffect(() => {
    const newIndices = {}
    filteredProducts.forEach(product => {
      if (product.images && product.images.length > 1) {
        if (productImageIndices[product.id] === undefined) {
          newIndices[product.id] = 0
        }
      }
    })
    if (Object.keys(newIndices).length > 0) {
      setProductImageIndices(prev => ({ ...prev, ...newIndices }))
    }
  }, [filteredProducts.map(p => p.id).join(',')])

  // Slideshow effect for products with multiple images
  useEffect(() => {
    const intervals = {}
    
    filteredProducts.forEach(product => {
      if (product.images && product.images.length > 1) {
        // Set up interval for this product
        intervals[product.id] = setInterval(() => {
          setProductImageIndices(prev => {
            const currentIndex = prev[product.id] ?? 0
            const nextIndex = (currentIndex + 1) % product.images.length
            return { ...prev, [product.id]: nextIndex }
          })
        }, 3000) // 3 seconds
      }
    })
    
    // Cleanup intervals on unmount or when products change
    return () => {
      Object.values(intervals).forEach(interval => clearInterval(interval))
    }
  }, [filteredProducts.map(p => `${p.id}-${p.images?.length || 0}`).join(',')])

  if (loadingAccounts || loadingCategories || loadingBrands || loadingProducts) {
    return (
      <div className="catalog-page">
        <h1 className="page-title">Product Menu</h1>
        <Loading message="Loading accounts, categories, brands, and products..." />
      </div>
    )
  }

  return (
    <div className="catalog-page">
      <h1 className="page-title">Product Menu</h1>
      
      {/* Main Category Filter - Shows Menu, Products, Categories, Brands filtered by mainCategory */}
      <div className="main-category-filter-section" style={{
        background: '#f5f5f5',
        padding: '1.5rem',
        borderRadius: '8px',
        marginBottom: '1.5rem',
        border: '1px solid #e0e0e0'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', color: '#333' }}>Filter by Main Category</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ fontWeight: '500', color: '#555' }}>Main Category:</label>
          <select
            value={selectedMainCategory}
            onChange={(e) => {
              setSelectedMainCategory(e.target.value)
              // Reset all filters when main category changes
              setSelectedCategory('All')
              setSelectedBrand('All')
              setSelectedTag('All')
              setSelectedVat('All')
              setSearchTerm('')
              setPriceFilter('All')
              setStockFilter('All')
            }}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: '1px solid #ddd',
              fontSize: '1rem',
              minWidth: '200px',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Categories</option>
            <option value="medical">Medical</option>
            <option value="it-solutions">IT Solutions</option>
            <option value="pharmacy">Pharmacy</option>
            <option value="salon">Salon</option>
            <option value="order-product">Order Product</option>
          </select>
          <div style={{ marginLeft: 'auto', fontSize: '0.9rem', color: '#666' }}>
            {selectedMainCategory !== 'all' && (
              <span>
                Showing: <strong>{selectedMainCategory === 'medical' ? 'Medical' : selectedMainCategory === 'it-solutions' ? 'IT Solutions' : selectedMainCategory === 'pharmacy' ? 'Pharmacy' : selectedMainCategory === 'salon' ? 'Salon' : selectedMainCategory === 'order-product' ? 'Order Product' : 'All'}</strong> - 
                Products: {filteredProducts.length} | 
                Categories: {categories.filter(c => c.name !== 'All').length} | 
                Brands: {brands.filter(b => b.name !== 'All').length}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {isOwner && (
        <div style={{ 
          background: '#e3f2fd', 
          padding: '1rem', 
          borderRadius: '8px', 
          marginBottom: '1.5rem',
          border: '1px solid #1976d2'
        }}>
          <p style={{ margin: 0, color: '#1976d2', fontWeight: '500' }}>
            📋 <strong>View Only Mode:</strong> You can browse products but cannot place orders.
          </p>
        </div>
      )}
      
      {/* Company, Employee & Order Status Selection Section - Hidden for owners */}
      {!isOwner && (
      <div className="company-employee-section">
        <div className="filter-section">
          <h3>Select Company, Employee & Order Status</h3>
          <div className="selection-row">
            <div className="company-dropdown custom-dropdown">
              <label>Company:</label>
              <div className="custom-select-wrapper">
                <button 
                  type="button"
                  className="custom-select-button company-select"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowCompanyDropdown(!showCompanyDropdown)
                    setShowCategoryDropdown(false)
                    setShowBrandDropdown(false)
                  }}
                >
                  <div className="select-content">
                    {selectedCompany === 'All' ? (
                      <>
                        <span className="select-logo-placeholder">No logo</span>
                        <span>All Companies</span>
                      </>
                    ) : (() => {
                      const selected = companies.find(c => c.name === selectedCompany)
                      return (
                        <>
                          {selected?.logo ? (
                            <img src={selected.logo} alt={selected.name} className="select-logo" />
                          ) : (
                            <span className="select-logo-placeholder">No logo</span>
                          )}
                          <span>{selectedCompany}</span>
                        </>
                      )
                    })()}
                  </div>
                  <span className="select-arrow">▼</span>
                </button>
                {showCompanyDropdown && (
                  <div className="custom-select-options" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className={`custom-option ${selectedCompany === 'All' ? 'selected' : ''}`}
                      onClick={() => handleCompanyChange('All')}
                    >
                      <span className="select-logo-placeholder">No logo</span>
                      <span>All Companies</span>
                    </button>
                {companies.map(company => (
                      <button
                        key={company.id}
                        type="button"
                        className={`custom-option ${selectedCompany === company.name ? 'selected' : ''}`}
                        onClick={() => handleCompanyChange(company.name)}
                      >
                        {company.logo ? (
                          <img src={company.logo} alt={company.name} className="select-logo" />
                        ) : (
                          <span className="select-logo-placeholder">No logo</span>
                        )}
                        <span>{company.name}</span>
                      </button>
                ))}
                  </div>
                )}
              </div>
            </div>
            
            {selectedCompany !== 'All' && (
              <div className="employee-dropdown">
                <label>Employee:</label>
                <select 
                  value={selectedEmployee} 
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="employee-select"
                >
                  <option value="All">All Employees</option>
                  {availableEmployees.map(employee => (
                    <option key={employee.id} value={employee.name}>
                      {employee.name} - {employee.role}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="order-status-dropdown">
              <label>Order Status:</label>
              <select 
                value={selectedOrderStatus} 
                onChange={(e) => setSelectedOrderStatus(e.target.value)}
                className="order-status-select"
                style={{ 
                  borderColor: orderStatuses.find(status => status.value === selectedOrderStatus)?.color + '40',
                  color: orderStatuses.find(status => status.value === selectedOrderStatus)?.color
                }}
              >
                {orderStatuses.map(status => (
                  <option key={status.value} value={status.value} style={{ color: status.color }}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
      )}
      
      {/* Categories and Brands Section */}
      <div className="categories-brands-section">
        <div className="filter-section">
          <div className="selection-row">
            <div className="category-dropdown custom-dropdown">
              <label>Categories:</label>
              <div className="custom-select-wrapper">
                <button 
                  type="button"
                  className="custom-select-button category-select"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowCategoryDropdown(!showCategoryDropdown)
                    setShowCompanyDropdown(false)
                    setShowBrandDropdown(false)
                  }}
                >
                  <div className="select-content">
                    {(() => {
                      const selected = categories.find(c => c.name === selectedCategory)
                      return (
                        <>
                          {selected?.image ? (
                            <img src={selected.image} alt={selected.name} className="select-logo" />
                          ) : (
                            <span className="select-logo-placeholder">No logo</span>
                          )}
                          <span>{selectedCategory}</span>
                        </>
                      )
                    })()}
                  </div>
                  <span className="select-arrow">▼</span>
                </button>
                {showCategoryDropdown && (
                  <div className="custom-select-options" onClick={(e) => e.stopPropagation()}>
            {categories.map(category => (
              <button
                        key={category.name}
                        type="button"
                        className={`custom-option ${selectedCategory === category.name ? 'selected' : ''}`}
                        onClick={() => handleCategoryChange(category.name)}
                      >
                        {category.image ? (
                          <img src={category.image} alt={category.name} className="select-logo" />
                        ) : (
                          <span className="select-logo-placeholder">No logo</span>
                        )}
                        <span>{category.name}</span>
              </button>
            ))}
          </div>
                )}
        </div>
      </div>

            <div className="brand-dropdown custom-dropdown">
              <label>Brands:</label>
              <div className="custom-select-wrapper">
                <button 
                  type="button"
                  className="custom-select-button brand-select"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowBrandDropdown(!showBrandDropdown)
                    setShowCompanyDropdown(false)
                    setShowCategoryDropdown(false)
                  }}
                >
                  <div className="select-content">
                    {(() => {
                      const selected = brands.find(b => b.name === selectedBrand)
                      return (
                        <>
                          {selected?.logo ? (
                            <img src={selected.logo} alt={selected.name} className="select-logo" />
                          ) : (
                            <span className="select-logo-placeholder">No logo</span>
                          )}
                          <span>{selectedBrand}</span>
                        </>
                      )
                    })()}
                  </div>
                  <span className="select-arrow">▼</span>
                </button>
                {showBrandDropdown && (
                  <div className="custom-select-options" onClick={(e) => e.stopPropagation()}>
            {brands.map(brand => (
              <button
                        key={brand.name}
                        type="button"
                        className={`custom-option ${selectedBrand === brand.name ? 'selected' : ''}`}
                        onClick={() => handleBrandChange(brand.name)}
              >
                        {brand.logo ? (
                          <img src={brand.logo} alt={brand.name} className="select-logo" />
                        ) : (
                          <span className="select-logo-placeholder">No logo</span>
                        )}
                        <span>{brand.name}</span>
              </button>
            ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="main-content">
          {/* Products Section */}
          <div className="products-section">
            {/* Search and Filters Bar */}
            <div className="products-filters-bar">
              <div className="search-bar">
                <label>Search Products:</label>
                <input
                  type="text"
                  placeholder="Search by name, description, or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input-field"
                />
              </div>
              
              <div className="filters-row">
                <div className="filter-item">
                  <label>Filter by Product Tags:</label>
                  <select
                    value={selectedTag}
                    onChange={(e) => setSelectedTag(e.target.value)}
                    className="filter-select"
                  >
                    <option value="All">All Tags</option>
                    <option value="coming soon">Coming Soon</option>
                    <option value="fire price">Fire Price</option>
                    <option value="new arrivals">New Arrivals</option>
                    <option value="discount">Discount</option>
                  </select>
                </div>
                
                <div className="filter-item">
                  <label>Filter by VAT:</label>
                  <select
                    value={selectedVat}
                    onChange={(e) => setSelectedVat(e.target.value)}
                    className="filter-select"
                  >
                    <option value="All">All Products</option>
                    <option value="With VAT">With VAT</option>
                    <option value="Without VAT">Without VAT</option>
                  </select>
                </div>
                
                <div className="filter-item">
                  <label>Filter by Price:</label>
                  <select
                    value={priceFilter}
                    onChange={(e) => setPriceFilter(e.target.value)}
                    className="filter-select"
                  >
                    <option value="All">All Prices</option>
                    <option value="Low">Low (Under 50)</option>
                    <option value="Medium">Medium (50 - 200)</option>
                    <option value="High">High (200+)</option>
                  </select>
                </div>
                
                <div className="filter-item">
                  <label>Filter by Stock:</label>
                  <select
                    value={stockFilter}
                    onChange={(e) => setStockFilter(e.target.value)}
                    className="filter-select"
                  >
                    <option value="All">All Stock</option>
                    <option value="In Stock">In Stock</option>
                    <option value="Low Stock">Low Stock (&lt;10)</option>
                    <option value="Out of Stock">Out of Stock</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="section-header">
              <h2>Available Products</h2>
              <div className="product-count">
                {filteredProducts.filter(product => !product.isFeatured).length} products found
              </div>
            </div>
            
            {filteredProducts.filter(product => !product.isFeatured).length > 0 ? (
              <div className="product-grid">
                {filteredProducts.filter(product => !product.isFeatured).map(product => (
                  <div key={product.id} className="product-card">
                    <div className="card-inner">
                      <div className="product-image">
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
                            {product.tags.includes('discount') && product.discount > 0 && (
                              <span className="product-tag tag-discount">Discount {product.discount}%</span>
                            )}
                          </div>
                        )}
                        
                        {(() => {
                          // Determine which image to show
                          let currentImage = null
                          if (product.images && product.images.length > 0) {
                            const currentIndex = productImageIndices[product.id] || 0
                            currentImage = product.images[currentIndex]
                          } else if (product.image) {
                            currentImage = product.image
                          }
                          
                          return currentImage ? (
                            <img 
                              src={currentImage} 
                              alt={product.name}
                              className="product-image-img"
                            />
                          ) : (
                        <div className="image-placeholder">
                          📦
                        </div>
                          )
                        })()}
                        {product.images && product.images.length > 1 && (
                          <div className="image-slideshow-indicator">
                            {product.images.map((_, index) => (
                              <span 
                                key={index}
                                className={`slide-dot ${(productImageIndices[product.id] || 0) === index ? 'active' : ''}`}
                              />
                            ))}
                          </div>
                        )}
                        <button 
                          onClick={() => handleViewProductDetails(product)}
                          className="view-details-tag"
                          type="button"
                        >
                          View
                        </button>
                      </div>
                      <div className="product-info">
                        <div className="product-content">
                          <h3 className="product-name">{product.name}</h3>
                          <div className="product-details">
                            <span className="brand-tag">{product.brand}</span>
                            <span className="category-tag">{product.category}</span>
                            <span className={`stock-indicator ${product.stock < 10 ? 'low' : product.stock < 20 ? 'medium' : 'high'}`}>
                              {product.stock} in stock
                            </span>
                          </div>
                          <div className="price">
                            {product.discount > 0 ? (
                              <>
                                <span className="old-price">{product.currency} {product.priceValue.toFixed(2)}</span>
                                <span className="new-price">
                                  {product.currency} {(product.priceValue * (1 - product.discount / 100)).toFixed(2)}
                                </span>
                              </>
                            ) : (
                              <span className="current-price">{product.price}</span>
                            )}
                          </div>
                        </div>
                        <div className="product-actions-wrapper">
                          {isOwner ? (
                            <button 
                              className="add-to-cart-btn"
                              disabled
                              style={{ 
                                opacity: 0.6, 
                                cursor: 'not-allowed',
                                backgroundColor: '#ccc'
                              }}
                              title="View only - Orders are not available for owners"
                            >
                              View Only
                            </button>
                          ) : (
                          <button 
                            className="add-to-cart-btn"
                            onClick={() => handleAddToCart(product)}
                          >
                            Add to Cart
                          </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="No products found matching your selected filters. Try selecting different categories or brands." />
            )}
          </div>
          
          {/* Featured Products Section */}
          {(() => {
            const featuredProducts = filteredProducts.filter(product => product.isFeatured === true)
            return featuredProducts.length > 0 ? (
              <div className="featured-section">
                <div className="section-header">
                  <h2>Featured Products</h2>
                  <div className="product-count">
                    {featuredProducts.length} products found
                  </div>
                </div>
                <div className="product-grid">
                  {featuredProducts.map(product => (
                    <div key={product.id} className="product-card">
                      <div className="card-inner">
                        <div className="product-image">
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
                              {product.tags.includes('discount') && product.discount > 0 && (
                                <span className="product-tag tag-discount">Discount {product.discount}%</span>
                              )}
                            </div>
                          )}
                          
                          {(() => {
                            // Determine which image to show
                            let currentImage = null
                            if (product.images && product.images.length > 0) {
                              const currentIndex = productImageIndices[product.id] || 0
                              currentImage = product.images[currentIndex]
                            } else if (product.image) {
                              currentImage = product.image
                            }
                            
                            return currentImage ? (
                              <img 
                                src={currentImage} 
                                alt={product.name}
                                className="product-image-img"
                              />
                            ) : (
                          <div className="image-placeholder">
                            📦
                          </div>
                            )
                          })()}
                          {product.images && product.images.length > 1 && (
                            <div className="image-slideshow-indicator">
                              {product.images.map((_, index) => (
                                <span 
                                  key={index}
                                  className={`slide-dot ${(productImageIndices[product.id] || 0) === index ? 'active' : ''}`}
                                />
                              ))}
                            </div>
                          )}
                          <button 
                            onClick={() => handleViewProductDetails(product)}
                            className="view-details-tag"
                            type="button"
                          >
                            View
                          </button>
                        </div>
                        <div className="product-info">
                          <div className="product-content">
                            <h3 className="product-name">{product.name}</h3>
                            <div className="product-details">
                              <span className="brand-tag">{product.brand}</span>
                              <span className="category-tag">{product.category}</span>
                              <span className={`stock-indicator ${product.stock < 10 ? 'low' : product.stock < 20 ? 'medium' : 'high'}`}>
                                {product.stock} in stock
                              </span>
                            </div>
                            <div className="price">
                              {product.discount > 0 ? (
                                <>
                                  <span className="old-price">{product.currency} {product.priceValue.toFixed(2)}</span>
                                  <span className="new-price">
                                    {product.currency} {(product.priceValue * (1 - product.discount / 100)).toFixed(2)}
                                  </span>
                                </>
                              ) : (
                                <span className="current-price">{product.price}</span>
                              )}
                            </div>
                          </div>
                          <div className="product-actions-wrapper">
                            {isOwner ? (
                              <button 
                                className="add-to-cart-btn"
                                disabled
                                style={{ 
                                  opacity: 0.6, 
                                  cursor: 'not-allowed',
                                  backgroundColor: '#ccc'
                                }}
                                title="View only - Orders are not available for owners"
                              >
                                View Only
                              </button>
                            ) : (
                            <button 
                              className="add-to-cart-btn"
                              onClick={() => handleAddToCart(product)}
                            >
                              Add to Cart
                            </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          })()}
      </div>

      {/* Validation Popup */}
      {showValidationPopup && (
        <div className="validation-popup-overlay">
          <div className="validation-popup" ref={validationPopupRef} tabIndex={-1}>
            <div className="popup-header">
              <h3>⚠️ Required Information Missing</h3>
              <button 
                className="close-popup-btn"
                onClick={() => setShowValidationPopup(false)}
              >
                ✕
              </button>
            </div>
            <div className="popup-content">
              <p>Please complete the following selections before adding items to cart:</p>
              <ul className="validation-list">
                {selectedCompany === 'All' && (
                  <li className="validation-item">
                    <span className="validation-icon">🏢</span>
                    <span>Select a Company</span>
                  </li>
                )}
                {selectedEmployee === 'All' && selectedCompany !== 'All' && (
                  <li className="validation-item">
                    <span className="validation-icon">👤</span>
                    <span>Select an Employee</span>
                  </li>
                )}
              </ul>
              <p className="popup-note">
                This information is required to process your order correctly and track sales history.
              </p>
            </div>
            <div className="popup-footer">
              <button 
                className="popup-ok-btn"
                onClick={() => setShowValidationPopup(false)}
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Popup */}
      {showSuccessPopup.show && (
        <div className="success-popup-overlay">
          <div className="success-popup">
            <div className="success-header">
              <div className="success-icon">✅</div>
              <h3>Added {showSuccessPopup.product} to cart!</h3>
              <button 
                className="close-success-btn"
                onClick={() => setShowSuccessPopup({...showSuccessPopup, show: false})}
              >
                ✕
              </button>
            </div>
            <div className="success-content">
              <h4>Order Details:</h4>
              <div className="order-details-list">
                <div className="detail-item">
                  <span className="detail-label">Company:</span>
                  <span className="detail-value">{showSuccessPopup.company}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Employee:</span>
                  <span className="detail-value">{showSuccessPopup.employee}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status:</span>
                  <span className="detail-value">{showSuccessPopup.status}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Price:</span>
                  <span className="detail-value">{showSuccessPopup.price}</span>
                </div>
              </div>
              <div className="cart-summary">
                <p>Total items in cart: <strong>{showSuccessPopup.totalItems}</strong></p>
              </div>
            </div>
            <div className="success-footer">
              <button 
                className="success-ok-btn"
                onClick={() => setShowSuccessPopup({...showSuccessPopup, show: false})}
              >
                Continue
              </button>
              <button 
                className="success-cart-btn"
                onClick={() => {
                  setShowSuccessPopup({...showSuccessPopup, show: false})
                  window.location.href = '/dashboard/cart'
                }}
              >
                View Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Company Mismatch Popup */}
      {showCompanyMismatchPopup && (
        <div className="company-mismatch-popup-overlay">
          <div className="company-mismatch-popup">
            <div className="mismatch-header">
              <div className="mismatch-icon">⚠️</div>
              <h3>Different Company Detected</h3>
              <button 
                className="close-mismatch-btn"
                onClick={() => setShowCompanyMismatchPopup(false)}
              >
                ✕
              </button>
            </div>
            <div className="mismatch-content">
              <p>You have items in your cart for a different company. To add items for <strong>{selectedCompany}</strong>, you need to:</p>
              <div className="mismatch-options">
                <div className="option-item">
                  <span className="option-icon">🛒</span>
                  <div className="option-text">
                    <strong>Checkout current cart</strong>
                    <p>Complete the current order first</p>
                  </div>
                </div>
                <div className="option-item">
                  <span className="option-icon">🗑️</span>
                  <div className="option-text">
                    <strong>Clear cart</strong>
                    <p>Remove all items and start fresh</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mismatch-footer">
              <button 
                className="mismatch-cart-btn"
                onClick={() => {
                  setShowCompanyMismatchPopup(false)
                  window.location.href = '/cart'
                }}
              >
                Go to Cart
              </button>
              <button 
                className="mismatch-clear-btn"
                onClick={() => {
                  localStorage.removeItem('shoppingCart')
                  window.dispatchEvent(new CustomEvent('cartUpdated'))
                  setShowCompanyMismatchPopup(false)
                }}
              >
                Clear Cart
              </button>
              <button 
                className="mismatch-cancel-btn"
                onClick={() => setShowCompanyMismatchPopup(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Details Modal */}
      {showProductDetailsModal && selectedProduct && (
        <div className="product-details-modal-overlay" onClick={handleCloseProductDetailsModal}>
          <div className="product-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="product-details-modal-header">
              <h2>Product Details</h2>
              <button 
                className="product-details-modal-close"
                onClick={handleCloseProductDetailsModal}
              >
                ✕
              </button>
            </div>
            <div className="product-details-modal-body">
              <div className="product-details-image-section">
                {selectedProduct.images && selectedProduct.images.length > 0 ? (
                  <div className="product-images-gallery">
                    {selectedProduct.images.map((imageUrl, index) => (
                      <img 
                        key={index}
                        src={imageUrl} 
                        alt={`${selectedProduct.name} - Image ${index + 1}`}
                        className="product-details-image"
                      />
                    ))}
                  </div>
                ) : selectedProduct.image ? (
                  <img 
                    src={selectedProduct.image} 
                    alt={selectedProduct.name}
                    className="product-details-image"
                  />
                ) : (
                  <div className="product-details-image-placeholder">
                    📦
                  </div>
                )}
              </div>
              <div className="product-details-info-section">
                <div className="product-details-field">
                  <label>Product Name</label>
                  <div className="product-details-value">{selectedProduct.name}</div>
                </div>
                <div className="product-details-field">
                  <label>Category</label>
                  <div className="product-details-value">{selectedProduct.category}</div>
                </div>
                <div className="product-details-field">
                  <label>Brand</label>
                  <div className="product-details-value">{selectedProduct.brand}</div>
                </div>
                <div className="product-details-field">
                  <label>Price</label>
                  <div className="product-details-value">{selectedProduct.price}</div>
                </div>
                <div className="product-details-field">
                  <label>Currency</label>
                  <div className="product-details-value">{selectedProduct.currency}</div>
                </div>
                <div className="product-details-field">
                  <label>Current Stock</label>
                  <div className="product-details-value">
                    <span className={`stock-indicator ${selectedProduct.stock < 10 ? 'low' : selectedProduct.stock < 20 ? 'medium' : 'high'}`}>
                      {selectedProduct.stock} in stock
                    </span>
                  </div>
                </div>
                <div className="product-details-field">
                  <label>Description</label>
                  <div className="product-details-value">
                    {selectedProduct.description || 'No description available'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Catalog
