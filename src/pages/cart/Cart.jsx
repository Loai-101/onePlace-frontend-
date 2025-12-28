import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import PageSection from '../../components/PageSection.jsx'
import PrimaryButton from '../../components/PrimaryButton.jsx'
import SecondaryButton from '../../components/SecondaryButton.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import './Cart.css'

function Cart() {
  console.log('Cart component loaded') // Debug log
  const { token, user } = useAuth()
  const [cartItems, setCartItems] = useState([])
  const [accounts, setAccounts] = useState([]) // Store accounts data
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [sendingOrder, setSendingOrder] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('')
  const [showCreditLimitWarning, setShowCreditLimitWarning] = useState(false)

  // Get VAT rate for a specific product from the cart item
  const getProductVatRate = (item) => {
    // Use VAT rate from the product if available, otherwise default to 0
    return item.vatRate !== undefined ? item.vatRate : 0
  }

  // Group cart items by productId and employee (combine quantities for same product + employee)
  const groupCartItems = (items) => {
    const groupedMap = new Map()
    
    items.forEach(item => {
      // Create a unique key based on productId and employee
      // Use productId if available, otherwise use productName as fallback
      const productKey = item.productId || item.productName || item.id
      const key = `${productKey}_${item.employee || 'unknown'}`
      
      if (groupedMap.has(key)) {
        // If item exists, combine quantities
        const existingItem = groupedMap.get(key)
        const newQuantity = existingItem.quantity + (item.quantity || 1)
        
        // Use the minimum stock value (most restrictive)
        const minStock = Math.min(
          existingItem.stock || Infinity,
          item.stock || Infinity
        )
        const availableStock = minStock === Infinity ? (existingItem.stock || item.stock || 0) : minStock
        
        groupedMap.set(key, {
          ...existingItem,
          quantity: newQuantity,
          stock: availableStock, // Preserve stock information
          // Keep the earliest date/time
          orderDate: existingItem.orderDate,
          orderTime: existingItem.orderTime,
          // Keep track of original IDs for removal
          originalIds: existingItem.originalIds ? [...existingItem.originalIds, item.id] : [existingItem.id, item.id],
          // Use the first item's id as the main id for the grouped item
          id: existingItem.id
        })
      } else {
        // New item, add to map
        groupedMap.set(key, {
          ...item,
          originalIds: [item.id]
        })
      }
    })
    
    return Array.from(groupedMap.values())
  }

  // Load and group cart items with stock validation
  const loadAndGroupCart = async () => {
    const savedCart = JSON.parse(localStorage.getItem('shoppingCart') || '[]')
    // Ensure all cart items have vatRate field (default to 0 for old items)
    let cartWithVat = savedCart.map(item => ({
      ...item,
      vatRate: item.vatRate !== undefined ? item.vatRate : 0
    }))
    
    // Fetch current stock for all products
    if (token) {
      const updatedCart = await Promise.all(cartWithVat.map(async (item) => {
        if (item.productId) {
          try {
            const response = await fetch(`http://localhost:5000/api/products/${item.productId}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            })
            if (response.ok) {
              const data = await response.json()
              if (data.success) {
                const currentStock = data.data.stock?.current || 0
                // Update stock and validate quantity
                if (item.quantity > currentStock) {
                  // Adjust quantity to available stock
                  return {
                    ...item,
                    stock: currentStock,
                    quantity: Math.min(item.quantity, currentStock)
                  }
                }
                return {
                  ...item,
                  stock: currentStock
                }
              }
            }
          } catch (error) {
            console.error(`Error fetching stock for product ${item.productId}:`, error)
          }
        }
        return item
      }))
      cartWithVat = updatedCart
    }
    
    // Group items by productId and employee
    const groupedCart = groupCartItems(cartWithVat)
    
    setCartItems(groupedCart)
    
    // Update localStorage with grouped items (for consistency)
    if (JSON.stringify(savedCart) !== JSON.stringify(groupedCart)) {
      localStorage.setItem('shoppingCart', JSON.stringify(groupedCart))
    }
  }

  // Load cart items from localStorage on component mount
  useEffect(() => {
    loadAndGroupCart()
    
    // Listen for cart updates from other components
    const handleCartUpdate = () => {
      loadAndGroupCart()
    }
    
    window.addEventListener('cartUpdated', handleCartUpdate)
    
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // Fetch accounts data for company status
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/accounts', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        if (response.ok) {
          const data = await response.json()
          // API returns { success: true, count: number, data: accounts[] }
          const accountsArray = Array.isArray(data.data) 
            ? data.data 
            : Array.isArray(data.accounts) 
              ? data.accounts 
              : Array.isArray(data) 
                ? data 
                : []
          setAccounts(accountsArray)
        }
      } catch (error) {
        console.error('Error fetching accounts:', error)
        setAccounts([]) // Set to empty array on error
      }
    }
    fetchAccounts()
  }, [])

  // Calculate total
  const subtotal = cartItems.reduce((sum, item) => {
    // Handle both number and string formats
    const price = typeof item.unitPrice === 'number' 
      ? item.unitPrice 
      : parseFloat(String(item.unitPrice).replace('BD ', '').replace(/,/g, '')) || 0
    return sum + (price * item.quantity)
  }, 0)

  // Calculate delivery cost
  const deliveryCost = subtotal >= 50 ? 0 : 2
  
  // Calculate total VAT amount for all products
  const totalVatAmount = cartItems.reduce((sum, item) => {
    // Handle both number and string formats
    const price = typeof item.unitPrice === 'number' 
      ? item.unitPrice 
      : parseFloat(String(item.unitPrice).replace('BD ', '').replace(/,/g, '')) || 0
    const itemSubtotal = price * item.quantity
    const vatRate = getProductVatRate(item)
    return sum + (itemSubtotal * (vatRate / 100))
  }, 0)
  
  const total = subtotal + deliveryCost + totalVatAmount

  // Remove item from cart (handles grouped items)
  const removeItem = (itemId) => {
    // If item has originalIds, it means it was grouped - remove all original items
    const itemToRemove = cartItems.find(item => item.id === itemId)
    let updatedCart
    
    if (itemToRemove && itemToRemove.originalIds && itemToRemove.originalIds.length > 1) {
      // This is a grouped item, remove all original items
      const idsToRemove = new Set(itemToRemove.originalIds)
      updatedCart = cartItems.filter(item => {
        // Remove if it's the grouped item or if its id is in originalIds
        return item.id !== itemId && !idsToRemove.has(item.id)
      })
    } else {
      // Regular item removal
      updatedCart = cartItems.filter(item => item.id !== itemId)
    }
    
    // Re-group the remaining items
    const regroupedCart = groupCartItems(updatedCart)
    setCartItems(regroupedCart)
    localStorage.setItem('shoppingCart', JSON.stringify(regroupedCart))
  }

  // Update quantity (works with grouped items and validates stock)
  const updateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) {
      removeItem(itemId)
      return
    }
    
    const item = cartItems.find(i => i.id === itemId)
    if (!item) return
    
    // Get current stock from product API
    let availableStock = item.stock || 0
    
    // If stock is not stored in cart item, fetch it from API
    if (!item.stock && item.productId) {
      try {
        const response = await fetch(`http://localhost:5000/api/products/${item.productId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            availableStock = data.data.stock?.current || 0
          }
        }
      } catch (error) {
        console.error('Error fetching product stock:', error)
      }
    }
    
    // Check if requested quantity exceeds available stock
    if (newQuantity > availableStock) {
      alert(`Sorry, only ${availableStock} units of "${item.productName}" are available in stock.`)
      return
    }
    
    const updatedCart = cartItems.map(cartItem => {
      if (cartItem.id === itemId) {
        // Handle both number and string formats
        const price = typeof cartItem.unitPrice === 'number' 
          ? cartItem.unitPrice 
          : parseFloat(String(cartItem.unitPrice).replace('BD ', '').replace(/,/g, '')) || 0
        return {
          ...cartItem, 
          quantity: newQuantity,
          totalPrice: price * newQuantity,
          stock: availableStock // Update stock information
        }
      }
      return cartItem
    })
    setCartItems(updatedCart)
    localStorage.setItem('shoppingCart', JSON.stringify(updatedCart))
  }

  // Get status badge color
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'Urgent': return '#e74c3c'
      case 'Rush': return '#f39c12'
      case 'Emergency': return '#8e44ad'
      default: return '#27ae60'
    }
  }

  // Get company payment status from accounts
  const getCompanyPaymentStatus = (companyName) => {
    // Ensure accounts is an array
    if (!Array.isArray(accounts) || accounts.length === 0) {
      return { status: 'active', limit: 0, current: 0, accountStatus: 'active' }
    }
    
    // Find account by name
    const account = accounts.find(acc => acc && acc.name === companyName)
    if (!account) {
      return { status: 'active', limit: 0, current: 0, accountStatus: 'active' }
    }
    
    const creditLimit = account.creditLimit || 0
    const currentBalance = account.currentBalance || 0
    const isActive = account.isActive !== false
    
    // Determine status based on balance vs limit
    let status = 'active'
    if (currentBalance > 0 && creditLimit > 0) {
      if (currentBalance > creditLimit) {
        status = 'over_limit'
      } else if (currentBalance >= creditLimit * 0.9) {
        status = 'warning'
      }
    }
    
    // Calculate available balance
    const availableBalance = creditLimit > 0 ? creditLimit - currentBalance : 0
    
    return { 
      status, 
      limit: creditLimit, 
      current: currentBalance,
      available: availableBalance,
      accountStatus: isActive ? 'active' : 'inactive'
    }
  }

  // Handle send to accountant - show payment method selection first
  // Validate stock before sending order
  const validateStockBeforeSend = async () => {
    const stockIssues = []
    
    for (const item of cartItems) {
      let availableStock = item.stock || 0
      
      // Fetch current stock if not available
      if (!item.stock && item.productId && token) {
        try {
          const response = await fetch(`http://localhost:5000/api/products/${item.productId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
          if (response.ok) {
            const data = await response.json()
            if (data.success) {
              availableStock = data.data.stock?.current || 0
            }
          }
        } catch (error) {
          console.error(`Error fetching stock for ${item.productName}:`, error)
        }
      }
      
      if (item.quantity > availableStock) {
        stockIssues.push({
          product: item.productName,
          requested: item.quantity,
          available: availableStock
        })
      }
    }
    
    return stockIssues
  }

  const handleSendToAccountant = async () => {
    if (cartItems.length === 0) return
    
    // Validate stock before sending
    const stockIssues = await validateStockBeforeSend()
    if (stockIssues.length > 0) {
      const issuesText = stockIssues.map(issue => 
        `"${issue.product}": Requested ${issue.requested}, Available ${issue.available}`
      ).join('\n')
      alert(`Cannot send order. Stock issues detected:\n\n${issuesText}\n\nPlease adjust quantities and try again.`)
      // Reload cart to update stock information
      loadAndGroupCart()
      return
    }
    
    setShowPaymentModal(true)
  }

  // Actually send order to accountant with selected payment method
  const confirmSendToAccountant = async () => {
    if (!selectedPaymentMethod) {
      alert('Please select a payment method')
      return
    }
    
    // Get the first item to get company info
    const firstItem = cartItems[0]
    
    // Find account by name
    const account = accounts.find(acc => acc.name === firstItem.company)
    if (!account) {
      alert('Account not found. Please try again.')
      return
    }
    
    // Check if payment method is Credit and validate credit limit
    const paymentMethod = selectedPaymentMethod.toLowerCase()
    const isCredit = paymentMethod === 'credit'
    
    if (isCredit) {
      const statusData = getCompanyPaymentStatus(firstItem.company)
      const availableBalance = statusData.available || 0
      
      // Check if total exceeds available balance
      if (total > availableBalance) {
        setShowCreditLimitWarning(true)
        return
      }
    }
    
    setShowPaymentModal(false)
    
    try {
      setSendingOrder(true)
      
      // Get company ID from account (account.company is populated or just the ID)
      const companyId = account.company?._id || account.company || user?.company
      
      if (!companyId) {
        alert('Company information not found. Please try again.')
        setSendingOrder(false)
        return
      }
      
      // Prepare order data
      // Get a valid email from account (customer) - not from staff or user
      // Accounts are customers, Users are system users (salesmen/employees)
      const contactEmail = account.email || account.staff?.[0]?.email || user?.email || 'noemail@example.com'
      
      // Get employee name (required by validation)
      const employeeName = firstItem.employee || account.staff?.[0]?.name || 'Unknown Employee'
      
      // Get address (required by validation)
      const fullAddress = `${account.address?.flatShopNo || ''} ${account.address?.building || ''} ${account.address?.road || ''} ${account.address?.block || ''} ${account.address?.area || ''}`.trim()
      const shippingAddress = fullAddress || account.address?.area || 'Address not provided'
      const contactAddress = fullAddress || account.address?.area || 'Address not provided'
      const city = account.address?.area || 'Bahrain'
      
      const orderData = {
        orderType: 'invoice',
        status: 'pending',
        customer: {
          company: companyId,
          companyName: firstItem.company,
          employee: employeeName,
          contactInfo: {
            name: employeeName,
            email: contactEmail,
            phone: account.staff?.[0]?.phone || user?.phone || 'N/A',
            address: contactAddress,
            city: city
          }
        },
        items: cartItems.map(item => ({
          product: item.productId,
          productName: item.productName,
          brand: item.brand,
          category: item.category,
          quantity: item.quantity,
          unitPrice: typeof item.unitPrice === 'number' 
            ? item.unitPrice 
            : parseFloat(String(item.unitPrice).replace('BD ', '').replace(/,/g, '')) || 0,
          vatRate: item.vatRate || 0
        })),
        pricing: {
          subtotal: subtotal,
          deliveryCost: deliveryCost,
          totalVat: totalVatAmount,
          total: total,
          currency: 'BD'
        },
        payment: {
          method: (() => {
            const method = selectedPaymentMethod.toLowerCase()
            if (method === 'cash') return 'cash'
            if (method === 'visa') return 'visa'
            if (method === 'benefitpay') return 'benefit'
            if (method === 'flooss') return 'floos'
            if (method === 'credit') return 'credit'
            return 'credit' // default
          })(),
          status: 'pending'
        },
        orderStatus: cartItems[0]?.orderStatus || 'Normal',
        shipping: {
          address: shippingAddress,
          city: city,
          country: 'Bahrain'
        },
        accountantReviewStatus: 'PENDING_REVIEW' // New field for accountant review
      }
      
      // Send order to backend
      const response = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        // Clear cart
        localStorage.removeItem('shoppingCart')
        setCartItems([])
        window.dispatchEvent(new CustomEvent('cartUpdated'))
        
        // Show success popup
        setShowSuccessPopup(true)
      } else {
        console.error('Order creation error:', data)
        alert(data.message || 'Error sending order to accountant. Please check the console for details.')
      }
    } catch (error) {
      console.error('Error sending order:', error)
      alert('Error sending order to accountant. Please try again.')
    } finally {
      setSendingOrder(false)
    }
  }

  // Get company status badge color and text
  const getCompanyStatusInfo = (companyName) => {
    const statusData = getCompanyPaymentStatus(companyName)
    
    // Check if account is inactive
    if (statusData.accountStatus === 'inactive') {
      return { 
        color: '#95a5a6', 
        text: 'Inactive', 
        icon: '⛔',
        description: 'Account is inactive'
      }
    }
    
    // Format balance display
    const balanceText = statusData.limit > 0 
      ? `Balance: BD ${statusData.current.toLocaleString()} / Limit: BD ${statusData.limit.toLocaleString()} (Available: BD ${statusData.available.toLocaleString()})`
      : `Balance: BD ${statusData.current.toLocaleString()}`
    
    switch (statusData.status) {
      case 'over_limit':
        return { 
          color: '#e74c3c', 
          text: 'Over Limit', 
          icon: '🚨',
          description: balanceText
        }
      case 'warning':
        return { 
          color: '#f39c12', 
          text: 'Near Limit', 
          icon: '⚠️',
          description: balanceText
        }
      case 'active':
      default:
        return { 
          color: '#27ae60', 
          text: 'Active', 
          icon: '✅',
          description: balanceText
        }
    }
  }

  // State for remove confirmation popup
  const [showRemovePopup, setShowRemovePopup] = useState({
    show: false,
    item: null
  })

  // Handle remove item with confirmation
  const handleRemoveItem = (item) => {
    setShowRemovePopup({
      show: true,
      item: item
    })
  }

  // Confirm remove item (handles grouped items)
  const confirmRemoveItem = () => {
    if (showRemovePopup.item) {
      removeItem(showRemovePopup.item.id)
      window.dispatchEvent(new CustomEvent('cartUpdated')) // Notify header
      setShowRemovePopup({ show: false, item: null })
    }
  }

  // Cancel remove item
  const cancelRemoveItem = () => {
    setShowRemovePopup({ show: false, item: null })
  }

  return (
    <div>
      <h1 className="page-title">Shopping Cart</h1>
      
      <PageSection title="Order Items">
        {cartItems.length > 0 ? (
          <div>
            <div className="cart-summary">
              <div className="summary-item">
                <span className="summary-label">Total Orders:</span>
                <span className="summary-value">{cartItems.length}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Subtotal:</span>
                <span className="summary-value">BD {subtotal.toFixed(2)}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Delivery:</span>
                <span className={`summary-value ${deliveryCost === 0 ? 'free-delivery' : 'delivery-cost'}`}>
                  {deliveryCost === 0 ? 'Free Delivery' : `BD ${deliveryCost.toFixed(2)}`}
                </span>
              </div>
            </div>

            <div className="cart-table-container">
              <table className="cart-table">
                 <thead>
                   <tr>
                     <th>Product</th>
                     <th>Company</th>
                     <th>Company Status</th>
                     <th>Employee</th>
                     <th>Status</th>
                     <th>Unit Price</th>
                     <th>Stock</th>
                     <th>Quantity</th>
                     <th>VAT</th>
                     <th>Total</th>
                     <th>Date</th>
                     <th>Actions</th>
                   </tr>
                 </thead>
                <tbody>
                  {cartItems.map(item => (
                    <tr key={item.id} className="order-row">
                      <td className="product-cell">
                        <div className="product-info">
                          <div className="product-name">{item.productName}</div>
                          <div className="product-meta">
                            <span className="brand-tag">{item.brand}</span>
                            <span className="category-tag">{item.category}</span>
                          </div>
                        </div>
                      </td>
                       <td className="company-cell">{item.company}</td>
                       <td className="company-status-cell">
                         <div className="company-status-info">
                           <div className="status-badge-container">
                             <span 
                               className="company-status-badge"
                               style={{ backgroundColor: getCompanyStatusInfo(item.company).color }}
                               title={getCompanyStatusInfo(item.company).description}
                             >
                               {getCompanyStatusInfo(item.company).icon} {getCompanyStatusInfo(item.company).text}
                             </span>
                           </div>
                           <div className="status-description">
                             {getCompanyStatusInfo(item.company).description}
                           </div>
                         </div>
                       </td>
                       <td className="employee-cell">{item.employee}</td>
                      <td className="status-cell">
                        <span 
                          className="status-badge"
                          style={{ backgroundColor: getStatusBadgeColor(item.orderStatus) }}
                        >
                          {item.orderStatus}
                        </span>
                      </td>
                      <td className="price-cell">
                        {typeof item.unitPrice === 'number' 
                          ? `BD ${item.unitPrice.toFixed(2)}` 
                          : (item.priceDisplay || item.unitPrice || 'BD 0.00')}
                      </td>
                      <td className="stock-cell">
                        <span className={`stock-badge ${(item.stock || 0) <= 0 ? 'out-of-stock' : (item.stock || 0) < 10 ? 'low-stock' : 'in-stock'}`}>
                          {item.stock !== undefined ? item.stock : 'N/A'}
                        </span>
                      </td>
                       <td className="quantity-cell">
                         <div className="quantity-controls">
                           <button 
                             className="qty-btn"
                             onClick={() => updateQuantity(item.id, item.quantity - 1)}
                           >
                             -
                           </button>
                           <span className="quantity-value">{item.quantity}</span>
                           <button 
                             className="qty-btn"
                             onClick={() => updateQuantity(item.id, item.quantity + 1)}
                             disabled={(item.stock || 0) <= item.quantity}
                             title={(item.stock || 0) <= item.quantity ? 'Maximum stock reached' : ''}
                           >
                             +
                           </button>
                         </div>
                         {(item.stock !== undefined && item.quantity >= item.stock) && (
                           <div className="stock-warning" style={{ fontSize: '0.75rem', color: '#dc3545', marginTop: '0.25rem' }}>
                             Max: {item.stock}
                           </div>
                         )}
                       </td>
                       <td className="vat-cell">
                         <div className="vat-display">
                           <span className={`vat-badge ${getProductVatRate(item) > 0 ? 'vat-applied' : 'vat-exempt'}`}>
                             {getProductVatRate(item) > 0 ? `${getProductVatRate(item)}%` : '0% (Exempt)'}
                           </span>
                         </div>
                       </td>
                       <td className="total-cell">
                         {(() => {
                           // Handle both number and string formats
                           const price = typeof item.unitPrice === 'number' 
                             ? item.unitPrice 
                             : parseFloat(String(item.unitPrice).replace('BD ', '').replace(/,/g, '')) || 0
                           const subtotal = price * item.quantity
                           const vatRate = getProductVatRate(item)
                           const vatAmount = subtotal * (vatRate / 100)
                           const total = subtotal + vatAmount
                           return `BD ${total.toFixed(2)}`
                         })()}
                       </td>
                      <td className="date-cell">
                        <div className="date-info">
                          <div className="order-date">{item.orderDate}</div>
                          <div className="order-time">{item.orderTime}</div>
                        </div>
                      </td>
                       <td className="actions-cell">
                         <button 
                           className="remove-btn"
                           onClick={() => handleRemoveItem(item)}
                           title="Remove item"
                         >
                           ✕
                         </button>
                       </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="cart-footer">
              <div className="total-section">
                <div className="total-breakdown">
                  <div className="breakdown-item">
                    <span className="breakdown-label">Subtotal:</span>
                    <span className="breakdown-value">BD {subtotal.toFixed(2)}</span>
                  </div>
                   <div className="breakdown-item">
                     <span className="breakdown-label">Delivery:</span>
                     <span className={`breakdown-value ${deliveryCost === 0 ? 'free-delivery' : 'delivery-cost'}`}>
                       {deliveryCost === 0 ? 'Free Delivery' : `BD ${deliveryCost.toFixed(2)}`}
                     </span>
                   </div>
                   <div className="breakdown-item">
                     <span className="breakdown-label">Total VAT:</span>
                     <span className="breakdown-value vat-amount">BD {totalVatAmount.toFixed(2)}</span>
                   </div>
                   <div className="breakdown-item total-row">
                     <span className="breakdown-label">Grand Total:</span>
                     <span className="breakdown-value">BD {total.toFixed(2)}</span>
                   </div>
                </div>
                <p className="total-note">Total for {cartItems.length} order{cartItems.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="action-buttons">
                <PrimaryButton 
                  onClick={handleSendToAccountant}
                  disabled={sendingOrder || cartItems.length === 0}
                >
                  {sendingOrder ? 'Sending...' : 'Send to Accountant'}
                </PrimaryButton>
                <SecondaryButton to="/dashboard/catalog" style={{ marginLeft: '1rem' }}>
                  Continue Shopping
                </SecondaryButton>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState message="Your cart is empty. Add some products to get started!" />
         )}
       </PageSection>

       {/* Payment Method Selection Modal */}
       {showPaymentModal && (
         <div className="remove-popup-overlay">
           <div className="remove-popup">
             <div className="remove-header">
               <h3>Select Payment Method</h3>
               <button 
                 className="close-remove-btn"
                 onClick={() => {
                   setShowPaymentModal(false)
                   setSelectedPaymentMethod('')
                 }}
               >
                 ✕
               </button>
             </div>
             <div className="remove-content">
               <p style={{ marginBottom: '1.5rem', fontSize: '1rem', color: '#6c757d' }}>
                 Please select a payment method for this order:
               </p>
               <div className="payment-methods">
                 {['Cash', 'Visa', 'BenefitPay', 'Flooss', 'Credit'].map((method) => (
                   <label 
                     key={method}
                     className={`payment-method-option ${selectedPaymentMethod === method ? 'selected' : ''}`}
                   >
                     <input
                       type="radio"
                       name="paymentMethod"
                       value={method}
                       checked={selectedPaymentMethod === method}
                       onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                     />
                     <span>{method}</span>
                   </label>
                 ))}
               </div>
             </div>
             <div className="remove-footer">
               <button 
                 className="remove-cancel-btn"
                 onClick={() => {
                   setShowPaymentModal(false)
                   setSelectedPaymentMethod('')
                 }}
               >
                 Cancel
               </button>
               <PrimaryButton 
                 onClick={confirmSendToAccountant}
                 disabled={!selectedPaymentMethod}
               >
                 Confirm & Send
               </PrimaryButton>
             </div>
           </div>
         </div>
       )}

       {/* Credit Limit Warning Popup */}
       {showCreditLimitWarning && (
         <div className="remove-popup-overlay">
           <div className="remove-popup">
             <div className="remove-header">
               <div className="remove-icon" style={{ fontSize: '2.5rem' }}>⚠️</div>
               <h3>Insufficient Credit Balance</h3>
               <button 
                 className="close-remove-btn"
                 onClick={() => setShowCreditLimitWarning(false)}
               >
                 ✕
               </button>
             </div>
             <div className="remove-content">
               <p style={{ fontSize: '1.1rem', textAlign: 'center', marginBottom: '1rem', color: '#e74c3c' }}>
                 Your order total exceeds the available credit balance.
               </p>
               {(() => {
                 const firstItem = cartItems[0]
                 const statusData = getCompanyPaymentStatus(firstItem?.company)
                 return (
                   <div style={{ marginBottom: '1rem' }}>
                     <p style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                       <strong>Order Total:</strong> BD {total.toFixed(2)}
                     </p>
                     <p style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                       <strong>Available Balance:</strong> BD {statusData.available.toLocaleString()}
                     </p>
                     <p style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                       <strong>Current Balance:</strong> BD {statusData.current.toLocaleString()} / Limit: BD {statusData.limit.toLocaleString()}
                     </p>
                   </div>
                 )
               })()}
               <p style={{ fontSize: '0.9rem', textAlign: 'center', color: '#6c757d', marginTop: '1rem' }}>
                 Please choose a different payment method (Cash, Visa, BenefitPay, or Flooss) to continue, or contact the administrator to increase your credit limit.
               </p>
             </div>
             <div className="remove-footer">
               <SecondaryButton 
                 onClick={() => {
                   setShowCreditLimitWarning(false)
                   setShowPaymentModal(true)
                 }}
               >
                 Change Payment Method
               </SecondaryButton>
               <PrimaryButton 
                 onClick={() => setShowCreditLimitWarning(false)}
               >
                 Cancel
               </PrimaryButton>
             </div>
           </div>
         </div>
       )}

       {/* Success Popup */}
       {showSuccessPopup && (
         <div className="remove-popup-overlay">
           <div className="remove-popup">
             <div className="remove-header">
               <div className="remove-icon" style={{ fontSize: '3rem' }}>✅</div>
               <h3>Order Sent Successfully</h3>
               <button 
                 className="close-remove-btn"
                 onClick={() => setShowSuccessPopup(false)}
               >
                 ✕
               </button>
             </div>
             <div className="remove-content">
               <p style={{ fontSize: '1.1rem', textAlign: 'center', marginBottom: '1rem' }}>
                 Your order has been sent to the accountant for review.
               </p>
               <p style={{ fontSize: '0.9rem', textAlign: 'center', color: '#6c757d' }}>
                 The cart has been cleared. You can continue shopping.
               </p>
             </div>
             <div className="remove-footer">
               <PrimaryButton 
                 onClick={() => {
                   setShowSuccessPopup(false)
                   window.location.href = '/dashboard/catalog'
                 }}
               >
                 Continue Shopping
               </PrimaryButton>
             </div>
           </div>
         </div>
       )}

       {/* Remove Confirmation Popup */}
       {showRemovePopup.show && (
         <div className="remove-popup-overlay">
           <div className="remove-popup">
             <div className="remove-header">
               <div className="remove-icon">⚠️</div>
               <h3>Remove Item from Cart</h3>
               <button 
                 className="close-remove-btn"
                 onClick={cancelRemoveItem}
               >
                 ✕
               </button>
             </div>
             <div className="remove-content">
               <p>Are you sure you want to remove this item from your cart?</p>
               {showRemovePopup.item && (
                 <div className="item-to-remove">
                   <div className="item-details">
                     <div className="item-name">{showRemovePopup.item.productName}</div>
                     <div className="item-meta">
                       <span className="item-brand">{showRemovePopup.item.brand}</span>
                       <span className="item-category">{showRemovePopup.item.category}</span>
                     </div>
                     <div className="item-info">
                       <span className="item-company">Company: {showRemovePopup.item.company}</span>
                       <span className="item-employee">Employee: {showRemovePopup.item.employee}</span>
                       <span className="item-quantity">Quantity: {showRemovePopup.item.quantity}</span>
                       <span className="item-price">Price: {showRemovePopup.item.unitPrice}</span>
                     </div>
                   </div>
                 </div>
               )}
               <p className="remove-warning">
                 This action cannot be undone. You'll need to add the item again if you change your mind.
               </p>
             </div>
             <div className="remove-footer">
               <button 
                 className="remove-cancel-btn"
                 onClick={cancelRemoveItem}
               >
                 Keep Item
               </button>
               <button 
                 className="remove-confirm-btn"
                 onClick={confirmRemoveItem}
               >
                 Remove Item
               </button>
             </div>
           </div>
         </div>
       )}
     </div>
   )
 }
 
 export default Cart
