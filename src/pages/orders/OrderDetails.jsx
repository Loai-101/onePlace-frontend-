import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getApiUrl } from '../../utils/security'
import PageSection from '../../components/PageSection.jsx'
import PrimaryButton from '../../components/PrimaryButton.jsx'
import SecondaryButton from '../../components/SecondaryButton.jsx'
import EmptyState from '../../components/EmptyState.jsx'

function OrderDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token, user } = useAuth()
  const [order, setOrder] = useState(null)
  const [accountDetails, setAccountDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingAccount, setLoadingAccount] = useState(false)

  useEffect(() => {
    if (token && id) {
      loadOrderDetails()
    }
  }, [token, id])

  const loadOrderDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${getApiUrl()}/api/orders/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        const orderData = data.data
        
        // Check if user has access to this order (same company)
        if (user?.company) {
          const orderCompanyId = typeof orderData.customer?.company === 'object' 
            ? orderData.customer.company._id || orderData.customer.company
            : orderData.customer?.company
            
          if (orderCompanyId && orderCompanyId.toString() !== user.company.toString()) {
            setOrder(null)
            setLoading(false)
            return
          }
        }
        
        setOrder(orderData)
        
        // Fetch account details
        if (orderData.customer?.companyName || orderData.customer?.accountName) {
          loadAccountDetails(orderData.customer?.companyName || orderData.customer?.accountName)
        }
      }
    } catch (error) {
      console.error('Error loading order details:', error)
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }

  const loadAccountDetails = async (accountName) => {
    try {
      setLoadingAccount(true)
      const response = await fetch(`${getApiUrl()}/api/accounts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (data.success && data.data) {
        const account = data.data.find(acc => acc.name === accountName)
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount) => {
    return `BD ${parseFloat(amount || 0).toFixed(2)}`
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED': return { bg: '#d4edda', color: '#155724' }
      case 'UNDER_REVIEW': return { bg: '#cce5ff', color: '#004085' }
      case 'PENDING_REVIEW': return { bg: '#fff3cd', color: '#856404' }
      case 'REJECTED': return { bg: '#f8d7da', color: '#721c24' }
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

  if (loading) {
    return (
      <div>
        <h1 className="page-title">Order Details</h1>
        <PageSection title="Loading">
          <div style={{ textAlign: 'center', padding: '2rem' }}>Loading order details...</div>
        </PageSection>
      </div>
    )
  }

  if (!order) {
    return (
      <div>
        <h1 className="page-title">Order Details</h1>
        <PageSection title="Order Not Found">
          <EmptyState message="Order not found or you don't have access to this order." />
          <div style={{ marginTop: '2rem' }}>
            <SecondaryButton onClick={() => navigate('/dashboard/orders')}>
              Back to Orders
            </SecondaryButton>
          </div>
        </PageSection>
      </div>
    )
  }

  const status = order.accountantReviewStatus || order.status || 'PENDING_REVIEW'
  const statusColors = getStatusColor(status)

  return (
    <div>
      <h1 className="page-title">Order #{order.orderNumber || order._id}</h1>
      
      <PageSection title="Order Information">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
          <div>
            <p><strong>Order Date:</strong> {formatDate(order.createdAt)}</p>
            <p><strong>Status:</strong> 
              <span style={{ 
                marginLeft: '0.5rem',
                padding: '0.25rem 0.5rem', 
                borderRadius: '4px',
                fontSize: '0.875rem',
                backgroundColor: statusColors.bg,
                color: statusColors.color
              }}>
                {status.replace('_', ' ')}
              </span>
            </p>
            <p><strong>Account:</strong> {order.customer?.companyName || order.customer?.accountName || 'N/A'}</p>
            <p><strong>Salesman:</strong> {order.createdBy?.name || order.customer?.employee || 'N/A'}</p>
          </div>
          <div>
            <p><strong>Total Amount:</strong> {formatCurrency(order.pricing?.total)}</p>
            <p><strong>Payment Method:</strong> {getPaymentMethodDisplay(order.payment?.method)}</p>
            <p><strong>Payment Status:</strong> {order.payment?.status || 'pending'}</p>
          </div>
        </div>
      </PageSection>

      {accountDetails && (
        <PageSection title="Account Details">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <p><strong>Name:</strong> {accountDetails.name}</p>
              <p><strong>Phone:</strong> {accountDetails.phone || 'N/A'}</p>
              <p><strong>Email:</strong> {accountDetails.email || 'N/A'}</p>
              <p><strong>Status:</strong> {accountDetails.isActive ? 'Active' : 'Inactive'}</p>
            </div>
            <div>
              <p><strong>Address:</strong> {
                accountDetails.address 
                  ? `${accountDetails.address.flatShopNo || ''} ${accountDetails.address.building || ''} ${accountDetails.address.road || ''} ${accountDetails.address.block || ''} ${accountDetails.address.area || ''}`.trim() || 'N/A'
                  : 'N/A'
              }</p>
              <p><strong>VAT Number:</strong> {accountDetails.vat || 'N/A'}</p>
              <p><strong>CR Number:</strong> {accountDetails.crNumber || 'N/A'}</p>
              <p><strong>Credit Limit:</strong> {formatCurrency(accountDetails.creditLimit)}</p>
            </div>
          </div>
        </PageSection>
      )}
      
      <PageSection title="Order Items">
        <table className="data-table" style={{ width: '100%' }}>
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
            {order.items?.map((item, index) => (
              <tr key={index}>
                <td>{item.productName || 'N/A'}</td>
                <td>{item.brand || 'N/A'}</td>
                <td>{item.category || 'N/A'}</td>
                <td>{item.quantity || 0}</td>
                <td>{formatCurrency(item.unitPrice)}</td>
                <td>{item.vatRate || 0}%</td>
                <td>{formatCurrency(item.totalPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PageSection>

      <PageSection title="Pricing Summary">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '400px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Subtotal:</span>
            <span>{formatCurrency(order.pricing?.subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Delivery Cost:</span>
            <span>{formatCurrency(order.pricing?.deliveryCost)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>VAT:</span>
            <span>{formatCurrency(order.pricing?.totalVat)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.1rem', paddingTop: '0.5rem', borderTop: '2px solid #e9ecef' }}>
            <span>Total:</span>
            <span>{formatCurrency(order.pricing?.total)}</span>
          </div>
        </div>
      </PageSection>
      
      <div style={{ marginTop: '2rem' }}>
        <SecondaryButton onClick={() => navigate('/dashboard/orders')}>
          Back to Orders
        </SecondaryButton>
      </div>
    </div>
  )
}

export default OrderDetails
