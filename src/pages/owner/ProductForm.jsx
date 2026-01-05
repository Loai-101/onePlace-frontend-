import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getApiUrl } from '../../utils/security'
import PageSection from '../../components/PageSection.jsx'
import PrimaryButton from '../../components/PrimaryButton.jsx'
import SecondaryButton from '../../components/SecondaryButton.jsx'
import './ProductForm.css'

function ProductForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token } = useAuth()
  const isEdit = !!id

  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [productImages, setProductImages] = useState([])
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    brand: '',
    mainCategory: '',
    category: '',
    description: '',
    price: '',
    costPrice: '',
    currency: 'BD',
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
  const [filteredCategories, setFilteredCategories] = useState([])

  useEffect(() => {
    if (token) {
      loadCategories()
      loadBrands()
      if (isEdit) {
        loadProduct()
      } else {
        // Generate default SKU for new products
        const generateDefaultSKU = () => {
          const timestamp = Date.now().toString(36).toUpperCase()
          const random = Math.random().toString(36).substring(2, 6).toUpperCase()
          return `SKU-${timestamp}-${random}`
        }
        setFormData(prev => ({
          ...prev,
          sku: generateDefaultSKU()
        }))
      }
    }
  }, [token, id, isEdit])

  const loadProduct = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${getApiUrl()}/api/products/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()
      if (data.success) {
        const product = data.data
        // Extract tags from product tags array
        const productTags = product.tags || []
        const tags = {
          comingSoon: productTags.includes('coming soon'),
          firePrice: productTags.includes('fire price'),
          newArrivals: productTags.includes('new arrivals'),
          discount: productTags.includes('discount')
        }
        
        setFormData({
          name: product.name || '',
          sku: product.sku || '',
          brand: product.brand?._id || '',
          mainCategory: product.mainCategory || '',
          category: product.category?._id || '',
          description: product.description || '',
          price: product.price || '',
          costPrice: product.pricing?.cost || '',
          currency: product.currency || 'BD',
          stock: {
            current: product.stock?.current || 0,
            minimum: product.stock?.minimum || 5,
            maximum: product.stock?.maximum || 1000
          },
          status: product.status || 'active',
          isFeatured: product.isFeatured || false,
          tags: tags,
          discountPercent: product.pricing?.discount || 0
        })
        setProductImages(product.images || [])
      }
    } catch (error) {
      console.error('Error loading product:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async (mainCategoryFilter = null) => {
    try {
      let url = `${getApiUrl()}/api/categories?includeInactive=false`
      if (mainCategoryFilter) {
        url += `&mainCategory=${mainCategoryFilter}`
      }
      const response = await fetch(url, {
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
    }
  }

  // Filter categories when mainCategory changes
  useEffect(() => {
    if (formData.mainCategory) {
      loadCategories(formData.mainCategory)
      // Reset category when mainCategory changes
      setFormData(prev => ({ ...prev, category: '' }))
    } else {
      loadCategories()
    }
  }, [formData.mainCategory, token])

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

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    files.forEach(file => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setSuccessMessage('Please select image files only')
        setShowSuccessPopup(true)
        return
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setSuccessMessage('Image size must be less than 5MB')
        setShowSuccessPopup(true)
        return
      }

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setProductImages(prev => [...prev, {
          url: reader.result,
          alt: file.name,
          isPrimary: prev.length === 0, // First image is primary by default
          file: file // Store file for upload
        }])
      }
      reader.readAsDataURL(file)
    })
  }

  const handleRemoveImage = (index) => {
    setProductImages(prev => {
      const newImages = prev.filter((_, i) => i !== index)
      // If we removed the primary image, make the first one primary
      if (newImages.length > 0 && prev[index]?.isPrimary) {
        newImages[0].isPrimary = true
      }
      return newImages
    })
  }

  const handleSetPrimary = (index) => {
    setProductImages(prev => prev.map((img, i) => ({
      ...img,
      isPrimary: i === index
    })))
  }

  const uploadImageToSupabase = async (file) => {
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate that selling price is greater than cost price
    const sellingPrice = parseFloat(formData.price) || 0
    const costPrice = parseFloat(formData.costPrice) || 0
    
    if (sellingPrice <= costPrice) {
      setSuccessMessage('Selling price must be greater than cost price')
      setShowSuccessPopup(true)
      return
    }
    
    try {
      setUploading(true)

      // Upload all new images
      const uploadedImages = await Promise.all(
        productImages.map(async (img) => {
          if (img.file) {
            // New image, upload it
            const url = await uploadImageToSupabase(img.file)
            return {
              url,
              alt: img.alt || formData.name,
              isPrimary: img.isPrimary || false
            }
          } else {
            // Existing image, keep it
            return {
              url: img.url,
              alt: img.alt || formData.name,
              isPrimary: img.isPrimary || false
            }
          }
        })
      )

      // Build tags array from checkboxes
      const tagsArray = []
      if (formData.tags.comingSoon) tagsArray.push('coming soon')
      if (formData.tags.firePrice) tagsArray.push('fire price')
      if (formData.tags.newArrivals) tagsArray.push('new arrivals')
      if (formData.tags.discount) tagsArray.push('discount')

      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        pricing: {
          cost: parseFloat(formData.costPrice),
          discount: formData.tags.discount ? formData.discountPercent : 0
        },
        tags: tagsArray,
        images: uploadedImages
      }
      
      // Remove tags object and discountPercent from payload
      delete payload.discountPercent

      const url = isEdit 
        ? `${getApiUrl()}/api/products/${id}`
        : `${getApiUrl()}/api/products`
      
      const method = isEdit ? 'PUT' : 'POST'

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
        // Handle different error status codes
        if (response.status === 404) {
          setSuccessMessage('API endpoint not found. Please check if the server is running.')
        } else if (response.status === 401) {
          setSuccessMessage('Unauthorized. Please login again.')
        } else if (response.status === 400) {
          // Validation errors
          const errorMsg = data.errors 
            ? data.errors.map(e => `${e.field}: ${e.message}`).join(', ')
            : data.message || 'Validation error'
          setSuccessMessage(errorMsg)
        } else {
          setSuccessMessage(data.message || `Error: ${response.status} ${response.statusText}`)
        }
        setShowSuccessPopup(true)
        return
      }
      
      if (data.success) {
        setSuccessMessage(isEdit ? 'Product updated successfully!' : 'Product created successfully!')
        setShowSuccessPopup(true)
        setTimeout(() => {
          navigate('/owner/products')
        }, 1500)
      } else {
        setSuccessMessage(data.message || 'Error saving product')
        setShowSuccessPopup(true)
      }
    } catch (error) {
      console.error('Error saving product:', error)
      setSuccessMessage('Error saving product: ' + error.message)
      setShowSuccessPopup(true)
    } finally {
      setUploading(false)
    }
  }

  if (!token) {
    return (
      <div className="product-form-page">
        <h1 className="page-title">{isEdit ? 'Edit Product' : 'New Product'}</h1>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Please login to access Product Management.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="product-form-page">
        <h1 className="page-title">{isEdit ? 'Edit Product' : 'New Product'}</h1>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Loading product...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="product-form-page">
      <h1 className="page-title">{isEdit ? 'Edit Product' : 'New Product'}</h1>
      
      <form onSubmit={handleSubmit}>
        <PageSection title="Basic Information">
          <div className="form-grid">
            <div className="form-group">
              <label>SKU *</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({...formData, sku: e.target.value.toUpperCase()})}
                required
                placeholder="Enter product SKU"
              />
            </div>
            
            <div className="form-group full-width">
              <label>Main Category *</label>
              <select
                value={formData.mainCategory}
                onChange={(e) => setFormData({...formData, mainCategory: e.target.value, category: ''})}
                required
                style={{ 
                  width: '100%', 
                  padding: '10px 12px', 
                  fontSize: '14px', 
                  border: '1px solid #e0e0e0', 
                  borderRadius: '6px',
                  backgroundColor: '#fff',
                  cursor: 'pointer'
                }}
              >
                <option value="">Select a main category *</option>
                <option value="medical">Medical</option>
                <option value="it-solutions">IT Solutions</option>
                <option value="pharmacy">Pharmacy</option>
                <option value="salon">Salon</option>
                <option value="order-product">Order Product</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Product Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
                placeholder="Enter product name"
              />
            </div>
            
            <div className="form-group">
              <label>Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                required
                disabled={!formData.mainCategory}
              >
                <option value="">{formData.mainCategory ? 'Select a category' : 'Select main category first'}</option>
                {filteredCategories.map(category => (
                  <option key={category._id} value={category._id}>
                    {category.name} {category.brand?.name ? `(${category.brand.name})` : ''}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Brand *</label>
              <select
                value={formData.brand}
                onChange={(e) => setFormData({...formData, brand: e.target.value})}
                required
              >
                <option value="">Select a brand</option>
                {brands.map(brand => (
                  <option key={brand._id} value={brand._id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Selling Price *</label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                required
                placeholder="0.00"
                min={parseFloat(formData.costPrice) > 0 ? parseFloat(formData.costPrice) + 0.01 : 0}
              />
              {formData.price && formData.costPrice && parseFloat(formData.price) <= parseFloat(formData.costPrice) && (
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
                value={formData.costPrice}
                onChange={(e) => setFormData({...formData, costPrice: e.target.value})}
                required
                placeholder="0.00"
                max={formData.price ? parseFloat(formData.price) - 0.01 : undefined}
              />
              {formData.price && formData.costPrice && parseFloat(formData.price) <= parseFloat(formData.costPrice) && (
                <small style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  Cost price must be less than selling price
                </small>
              )}
            </div>
            
            <div className="form-group">
              <label>Currency</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({...formData, currency: e.target.value})}
              >
                <option value="BD">BD</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Current Stock *</label>
              <input
                type="number"
                value={formData.stock.current}
                onChange={(e) => setFormData({
                  ...formData,
                  stock: {...formData.stock, current: parseInt(e.target.value) || 0}
                })}
                required
                min="0"
              />
            </div>
            
            <div className="form-group">
              <label>Minimum Stock</label>
              <input
                type="number"
                value={formData.stock.minimum}
                onChange={(e) => setFormData({
                  ...formData,
                  stock: {...formData.stock, minimum: parseInt(e.target.value) || 0}
                })}
                min="0"
              />
            </div>
            
            <div className="form-group">
              <label>Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
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
                  checked={formData.isFeatured}
                  onChange={(e) => setFormData({
                    ...formData,
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
          
          <PageSection title="Product Tags">
            <div className="form-grid">
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.tags.comingSoon}
                    onChange={(e) => setFormData({
                      ...formData,
                      tags: {...formData.tags, comingSoon: e.target.checked}
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
                    checked={formData.tags.firePrice}
                    onChange={(e) => setFormData({
                      ...formData,
                      tags: {...formData.tags, firePrice: e.target.checked}
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
                    checked={formData.tags.newArrivals}
                    onChange={(e) => setFormData({
                      ...formData,
                      tags: {...formData.tags, newArrivals: e.target.checked}
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
                    checked={formData.tags.discount}
                    onChange={(e) => setFormData({
                      ...formData,
                      tags: {...formData.tags, discount: e.target.checked}
                    })}
                    style={{ marginRight: '8px' }}
                  />
                  Discount
                </label>
                {formData.tags.discount && (
                  <div style={{ marginTop: '8px' }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>
                      Discount Percentage:
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.discountPercent}
                      onChange={(e) => setFormData({
                        ...formData,
                        discountPercent: parseFloat(e.target.value) || 0
                      })}
                      placeholder="0"
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                  </div>
                )}
              </div>
            </div>
          </PageSection>
          
          <div className="form-group full-width">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows="4"
              placeholder="Enter product description"
            />
          </div>
        </PageSection>
        
        <PageSection title="Product Images">
          <div className="images-upload-section">
            <div className="image-upload-container">
              <input
                type="file"
                id="product-images-upload"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="image-file-input"
              />
              <label htmlFor="product-images-upload" className="image-upload-label">
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
                      onClick={() => handleRemoveImage(index)}
                    >
                      ×
                    </button>
                  </div>
                  <div className="image-actions">
                    {!img.isPrimary && (
                      <button
                        type="button"
                        className="set-primary-btn"
                        onClick={() => handleSetPrimary(index)}
                      >
                        Set Primary
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {uploading && (
            <div className="upload-status">Uploading images...</div>
          )}
        </PageSection>
        
        <PageSection title="Actions">
          <div className="form-actions">
            <PrimaryButton type="submit" disabled={uploading}>
              {uploading ? 'Saving...' : (isEdit ? 'Update Product' : 'Create Product')}
            </PrimaryButton>
            <SecondaryButton type="button" onClick={() => navigate('/owner/products')}>
              Cancel
            </SecondaryButton>
          </div>
        </PageSection>
      </form>

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
    </div>
  )
}

export default ProductForm
