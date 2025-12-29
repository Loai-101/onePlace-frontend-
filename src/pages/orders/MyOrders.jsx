import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getApiUrl } from '../../utils/security'
import PageSection from '../../components/PageSection.jsx'
import PrimaryButton from '../../components/PrimaryButton.jsx'
import SecondaryButton from '../../components/SecondaryButton.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import './MyOrders.css'

function MyOrders() {
  const { token, user } = useAuth()
  const [orders, setOrders] = useState([])
  const [allOrders, setAllOrders] = useState([]) // Store all orders for filtering
  const [accounts, setAccounts] = useState([]) // Store accounts for filter dropdown
  const [loading, setLoading] = useState(true)
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [accountDetails, setAccountDetails] = useState(null)
  const [loadingAccount, setLoadingAccount] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('')
  const [selectedAccount, setSelectedAccount] = useState('')
  const [dateFilterType, setDateFilterType] = useState('') // '', 'single', 'range', 'month'
  const [selectedDate, setSelectedDate] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')

  useEffect(() => {
    if (token) {
      loadOrders()
      loadAccounts()
    }
  }, [token])

  useEffect(() => {
    // Apply filters whenever filters or allOrders change
    applyFilters()
  }, [selectedStatus, selectedPaymentMethod, selectedAccount, dateFilterType, selectedDate, dateFrom, dateTo, selectedMonth, allOrders])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${getApiUrl()}/api/orders?limit=200`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Backend already filters by company and role (salesmen see only their orders)
        // So we can use the data directly
        setAllOrders(data.data || [])
      } else {
        console.error('Error loading orders:', data.message)
        setAllOrders([])
      }
    } catch (error) {
      console.error('Error loading orders:', error)
      setAllOrders([])
    } finally {
      setLoading(false)
    }
  }

  const loadAccounts = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/accounts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        setAccounts(data.data || [])
      }
    } catch (error) {
      console.error('Error loading accounts:', error)
      setAccounts([])
    }
  }

  const applyFilters = () => {
    let filtered = [...allOrders]

    // Filter by Status
    if (selectedStatus) {
      filtered = filtered.filter(order => {
        const orderStatus = order.accountantReviewStatus || order.status || 'PENDING_REVIEW'
        return orderStatus === selectedStatus
      })
    }

    // Filter by Payment Method
    if (selectedPaymentMethod) {
      filtered = filtered.filter(order => {
        const method = order.payment?.method || 'credit'
        return method === selectedPaymentMethod
      })
    }

    // Filter by Account
    if (selectedAccount) {
      filtered = filtered.filter(order => {
        const accountName = order.customer?.companyName || order.customer?.accountName || ''
        return accountName === selectedAccount
      })
    }

    // Filter by Date
    if (dateFilterType === 'single' && selectedDate) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.createdAt)
        const filterDate = new Date(selectedDate)
        return orderDate.toDateString() === filterDate.toDateString()
      })
    } else if (dateFilterType === 'range' && dateFrom && dateTo) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.createdAt)
        const fromDate = new Date(dateFrom)
        const toDate = new Date(dateTo)
        // Set time to start/end of day for proper comparison
        fromDate.setHours(0, 0, 0, 0)
        toDate.setHours(23, 59, 59, 999)
        orderDate.setHours(0, 0, 0, 0)
        return orderDate >= fromDate && orderDate <= toDate
      })
    } else if (dateFilterType === 'month' && selectedMonth) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.createdAt)
        const [year, month] = selectedMonth.split('-')
        return orderDate.getFullYear() === parseInt(year) && 
               orderDate.getMonth() === parseInt(month) - 1
      })
    }

    setOrders(filtered)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const formatCurrency = (amount) => {
    return `BD ${parseFloat(amount || 0).toFixed(2)}`
  }

  // Get status badge color
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'APPROVED': return { bg: '#d4edda', color: '#155724' }
      case 'UNDER_REVIEW': return { bg: '#cce5ff', color: '#004085' }
      case 'PENDING_REVIEW': return { bg: '#fff3cd', color: '#856404' }
      case 'REJECTED': return { bg: '#f8d7da', color: '#721c24' }
      case 'CANCELLED': return { bg: '#6c757d', color: '#ffffff' }
      case 'delivered': return { bg: '#d4edda', color: '#155724' }
      case 'shipped': return { bg: '#cce5ff', color: '#004085' }
      case 'processing': return { bg: '#fff3cd', color: '#856404' }
      case 'pending': return { bg: '#f8d7da', color: '#721c24' }
      default: return { bg: '#e2e3e5', color: '#383d41' }
    }
  }

  const getPaymentMethodDisplay = (method) => {
    const methodMap = {
      'cash': 'Cash',
      'visa': 'Visa',
      'benefit': 'BenefitPay',
      'floos': 'Flooss',
      'credit': 'Credit'
    }
    return methodMap[method] || method?.toUpperCase() || 'N/A'
  }

  const getStatusDisplay = (order) => {
    // Priority: accountantReviewStatus > status
    const status = order.accountantReviewStatus || order.status || 'PENDING_REVIEW'
    return status.replace('_', ' ')
  }

  const handleOpenOrderDetails = async (order) => {
    setSelectedOrder(order)
    setShowOrderDetailsModal(true)
    setAccountDetails(null)
    setLoadingAccount(true)
    
    // Fetch account details
    try {
      const accountName = order.customer?.companyName || order.customer?.accountName
      
      // Fetch all accounts and find the matching one
      const response = await fetch(`${getApiUrl()}/api/accounts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (response.ok && data.success && data.data && data.data.length > 0) {
        // Find account by name
        let account = data.data.find(acc => acc.name === accountName)
        
        // If not found by name, try to find by company ID
        if (!account && order.customer?.company) {
          const companyId = typeof order.customer.company === 'object' 
            ? order.customer.company._id || order.customer.company
            : order.customer.company
          account = data.data.find(acc => {
            const accCompanyId = typeof acc.company === 'object' 
              ? acc.company._id || acc.company
              : acc.company
            return accCompanyId && accCompanyId.toString() === companyId.toString()
          })
        }
        
        if (account) {
          setAccountDetails(account)
        }
      }
    } catch (error) {
      console.error('Error fetching account details:', error)
    } finally {
      setLoadingAccount(false)
    }
  }

  return (
    <div>
      <h1 className="page-title">My Orders</h1>
      
      <PageSection>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Loading orders...</div>
        ) : (
          <>
            <div className="orders-filter">
              <div className="form-group">
                <label>Filter by Status:</label>
                <select 
                  value={selectedStatus} 
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="PENDING_REVIEW">Pending Review</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
              <div className="form-group">
                <label>Filter by Payment Method:</label>
                <select 
                  value={selectedPaymentMethod} 
                  onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                >
                  <option value="">All Payment Methods</option>
                  <option value="cash">Cash</option>
                  <option value="visa">Visa</option>
                  <option value="benefit">BenefitPay</option>
                  <option value="floos">Flooss</option>
                  <option value="credit">Credit</option>
                </select>
              </div>
              <div className="form-group">
                <label>Filter by Account:</label>
                <select 
                  value={selectedAccount} 
                  onChange={(e) => setSelectedAccount(e.target.value)}
                >
                  <option value="">All Accounts</option>
                  {accounts.map(account => (
                    <option key={account._id} value={account.name}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group date-filter-group">
                <label>Filter by Date:</label>
                <select 
                  value={dateFilterType} 
                  onChange={(e) => {
                    setDateFilterType(e.target.value)
                    // Clear date values when changing filter type
                    setSelectedDate('')
                    setDateFrom('')
                    setDateTo('')
                    setSelectedMonth('')
                  }}
                >
                  <option value="">No Date Filter</option>
                  <option value="single">Single Day</option>
                  <option value="range">Date Range</option>
                  <option value="month">By Month</option>
                </select>
                {dateFilterType === 'single' && (
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    style={{ marginTop: '0.5rem' }}
                  />
                )}
                {dateFilterType === 'range' && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      placeholder="From"
                    />
                    <span style={{ alignSelf: 'center', color: '#6c757d' }}>to</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      placeholder="To"
                    />
                  </div>
                )}
                {dateFilterType === 'month' && (
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    style={{ marginTop: '0.5rem' }}
                  />
                )}
              </div>
            </div>

            {orders.length > 0 ? (
              <div className="orders-container">
                <table className="orders-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Date</th>
                  <th>Account</th>
                  <th>Salesman</th>
                  <th>Payment Method</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Invoice</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => {
                  const status = getStatusDisplay(order)
                  const statusColors = getStatusBadgeColor(order.accountantReviewStatus || order.status)
                  return (
                    <tr key={order._id || order.id} className="order-row">
                      <td className="order-number">#{order.orderNumber || order._id}</td>
                      <td className="order-date">{formatDate(order.createdAt)}</td>
                      <td className="customer-name">{order.customer?.companyName || order.customer?.accountName || 'N/A'}</td>
                      <td className="salesman-name">{order.createdBy?.name || order.customer?.employee || 'N/A'}</td>
                      <td className="payment-method">{getPaymentMethodDisplay(order.payment?.method)}</td>
                      <td className="status-cell">
                        <span 
                          className="status-badge"
                          style={{ 
                            backgroundColor: statusColors.bg,
                            color: statusColors.color
                          }}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="total-amount">{formatCurrency(order.pricing?.total)}</td>
                      <td className="invoice-cell">
                        {order.invoicePdf?.url ? (
                          <a
                            href={order.invoicePdf.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: 'blue',
                              textDecoration: 'underline',
                              cursor: 'pointer',
                              fontWeight: '500'
                            }}
                          >
                            View Invoice
                          </a>
                        ) : (
                          <span style={{ color: '#6c757d', fontStyle: 'italic' }}>No Invoice</span>
                        )}
                      </td>
                      <td className="actions-cell">
                        <PrimaryButton onClick={() => handleOpenOrderDetails(order)}>
                          View Details
                        </PrimaryButton>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
              </div>
            ) : (
              <EmptyState message="No orders found matching the selected filters." />
            )}
          </>
        )}
      </PageSection>

      {/* Order Details Modal */}
      {showOrderDetailsModal && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowOrderDetailsModal(false)}>
          <div className="modal-content order-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Order Details</h2>
              <button className="modal-close" onClick={() => setShowOrderDetailsModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="order-details-section">
                <h3>Order Information</h3>
                <div className="details-grid">
                  <div className="detail-item">
                    <label>Order ID:</label>
                    <span>{selectedOrder.orderNumber || selectedOrder._id}</span>
                  </div>
                  <div className="detail-item">
                    <label>Date:</label>
                    <span>{formatDate(selectedOrder.createdAt)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Status:</label>
                    <span>{getStatusDisplay(selectedOrder)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Total:</label>
                    <span>{formatCurrency(selectedOrder.pricing?.total)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Payment Method:</label>
                    <span>{getPaymentMethodDisplay(selectedOrder.payment?.method)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Salesman:</label>
                    <span>{selectedOrder.createdBy?.name || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="order-details-section">
                <h3>Account Details</h3>
                {loadingAccount ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>Loading account details...</div>
                ) : accountDetails ? (
                  <div className="details-grid">
                    <div className="detail-item">
                      <label>Name:</label>
                      <span>{accountDetails.name || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Status:</label>
                      <span>
                        <span className={`status-badge ${accountDetails.isActive ? 'active' : 'inactive'}`} style={{
                          backgroundColor: accountDetails.isActive ? '#d4edda' : '#f8d7da',
                          color: accountDetails.isActive ? '#155724' : '#721c24',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '600'
                        }}>
                          {accountDetails.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </span>
                    </div>
                    <div className="detail-item">
                      <label>Phone:</label>
                      <span>{accountDetails.phone || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Email:</label>
                      <span>{accountDetails.email || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Flat/Shop No.:</label>
                      <span>{accountDetails.address?.flatShopNo || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Building:</label>
                      <span>{accountDetails.address?.building || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Road:</label>
                      <span>{accountDetails.address?.road || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Block:</label>
                      <span>{accountDetails.address?.block || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Area:</label>
                      <span>{accountDetails.address?.area || 'N/A'}</span>
                    </div>
                    <div className="detail-item" style={{ gridColumn: '1 / -1', marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid #e9ecef' }}>
                      <h4 style={{ margin: '0 0 1rem 0', color: '#2c3e50', fontSize: '1.1rem' }}>Business Information</h4>
                    </div>
                    <div className="detail-item">
                      <label>VAT Number:</label>
                      <span>{accountDetails.vat || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label>CR Number:</label>
                      <span>{accountDetails.crNumber || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Credit Limit:</label>
                      <span>BD {accountDetails.creditLimit?.toLocaleString() || '0'}</span>
                    </div>
                    {selectedOrder.payment?.method === 'credit' && (
                      <>
                        <div className="detail-item" style={{ gridColumn: '1 / -1', marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid #e9ecef' }}>
                          <h4 style={{ margin: '0 0 1rem 0', color: '#2c3e50', fontSize: '1.1rem' }}>Credit Balance Information</h4>
                        </div>
                        <div className="detail-item">
                          <label>Current Balance:</label>
                          <span style={{ color: accountDetails.currentBalance > accountDetails.creditLimit ? '#e74c3c' : '#27ae60', fontWeight: '600' }}>
                            BD {accountDetails.currentBalance?.toLocaleString() || '0'}
                          </span>
                        </div>
                        <div className="detail-item">
                          <label>Available Balance:</label>
                          <span style={{ color: '#27ae60', fontWeight: '600' }}>
                            BD {((accountDetails.creditLimit || 0) - (accountDetails.currentBalance || 0)).toLocaleString()}
                          </span>
                        </div>
                        <div className="detail-item">
                          <label>Order Total:</label>
                          <span style={{ fontWeight: '600' }}>
                            BD {selectedOrder.pricing?.total?.toLocaleString() || '0'}
                          </span>
                        </div>
                        <div className="detail-item">
                          <label>Payment Status:</label>
                          <span>
                            <span className={`status-badge ${selectedOrder.payment?.status === 'paid' ? 'active' : 'inactive'}`} style={{
                              backgroundColor: selectedOrder.payment?.status === 'paid' ? '#d4edda' : '#fff3cd',
                              color: selectedOrder.payment?.status === 'paid' ? '#155724' : '#856404',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              textTransform: 'uppercase'
                            }}>
                              {selectedOrder.payment?.status === 'paid' ? 'Paid' : 'Pending'}
                            </span>
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#6c757d' }}>
                    Account details not found. Showing order customer info:
                    <div className="details-grid" style={{ marginTop: '1rem' }}>
                      <div className="detail-item">
                        <label>Account Name:</label>
                        <span>{selectedOrder.customer?.companyName || 'N/A'}</span>
                      </div>
                      <div className="detail-item">
                        <label>Employee:</label>
                        <span>{selectedOrder.customer?.employee || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="order-details-section">
                <h3>Order Items</h3>
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Brand</th>
                      <th>Category</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th>VAT</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items?.map((item, index) => (
                      <tr key={index}>
                        <td>{item.productName}</td>
                        <td>{item.brand}</td>
                        <td>{item.category}</td>
                        <td>{item.quantity}</td>
                        <td>{formatCurrency(item.unitPrice)}</td>
                        <td>{item.vatRate || 0}%</td>
                        <td>{formatCurrency(item.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="order-details-section">
                <h3>Pricing Summary</h3>
                <div className="pricing-summary">
                  <div className="summary-row">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(selectedOrder.pricing?.subtotal)}</span>
                  </div>
                  <div className="summary-row">
                    <span>Delivery:</span>
                    <span>{formatCurrency(selectedOrder.pricing?.deliveryCost)}</span>
                  </div>
                  <div className="summary-row">
                    <span>VAT:</span>
                    <span>{formatCurrency(selectedOrder.pricing?.totalVat)}</span>
                  </div>
                  <div className="summary-row total-row">
                    <span>Total:</span>
                    <span>{formatCurrency(selectedOrder.pricing?.total)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <SecondaryButton onClick={() => setShowOrderDetailsModal(false)}>
                Close
              </SecondaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MyOrders
