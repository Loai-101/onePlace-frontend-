import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getApiUrl } from '../../utils/security'
import PageSection from '../../components/PageSection.jsx'
import PrimaryButton from '../../components/PrimaryButton.jsx'
import SecondaryButton from '../../components/SecondaryButton.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import Loading from '../../components/Loading.jsx'
import jsPDF from 'jspdf'
import { usePopupFocus } from '../../hooks/usePopupFocus'
import './Orders.css'

function AccountantOrders() {
  const { token, user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [orders, setOrders] = useState([])
  const [allOrders, setAllOrders] = useState([]) // Store all orders for filter options
  const [companyUsers, setCompanyUsers] = useState([]) // Store company users for salesman filter
  const [loading, setLoading] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('')
  const [selectedSalesman, setSelectedSalesman] = useState('')
  const [accounts, setAccounts] = useState([]) // Store accounts for filter dropdown
  const [selectedAccount, setSelectedAccount] = useState('')
  const [dateFilterType, setDateFilterType] = useState('') // '', 'single', 'range', 'month'
  const [selectedDate, setSelectedDate] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [accountDetails, setAccountDetails] = useState(null)
  const [loadingAccount, setLoadingAccount] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [pdfFile, setPdfFile] = useState(null)
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [markingAsPaid, setMarkingAsPaid] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const [popupMessage, setPopupMessage] = useState('')
  const [popupType, setPopupType] = useState('success') // 'success' or 'error'
  
  // Auto-focus popups when they open
  usePopupFocus(showOrderDetailsModal, '.modal-content')
  usePopupFocus(showStatusModal, '.modal-content')
  usePopupFocus(showPdfModal, '.modal-content')
  usePopupFocus(showPopup)

  // Read URL parameters on mount
  useEffect(() => {
    const statusParam = searchParams.get('accountantReviewStatus')
    if (statusParam) {
      setSelectedStatus(statusParam)
    }
  }, []) // Only run on mount

  useEffect(() => {
    if (token) {
      loadOrders()
      loadAccounts()
      if (user?.company) {
        loadCompanyUsers()
      }
    }
  }, [token, selectedStatus, selectedPaymentMethod, selectedSalesman, selectedAccount, dateFilterType, selectedDate, dateFrom, dateTo, selectedMonth, user?.company])

  const loadCompanyUsers = async () => {
    try {
      setLoadingUsers(true)
      // Extract company ID - handle both object and string formats
      let companyId = null
      if (user?.company) {
        if (typeof user.company === 'object' && user.company !== null) {
          companyId = user.company._id || user.company.id || (typeof user.company.toString === 'function' ? user.company.toString() : null)
        } else if (typeof user.company === 'string') {
          companyId = user.company
        }
      }
      
      // Ensure companyId is a string
      if (companyId) {
        companyId = String(companyId)
      }
      
      if (!companyId) {
        console.error('Company ID not found')
        setCompanyUsers([])
        setLoadingUsers(false)
        return
      }
      
      const response = await fetch(`${getApiUrl()}/api/users/company/${companyId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        setCompanyUsers(data.data || [])
      }
    } catch (error) {
      console.error('Error loading company users:', error)
      setCompanyUsers([])
    } finally {
      setLoadingUsers(false)
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

  const loadOrders = async () => {
    try {
      setLoading(true)
      // Build URL with filters
      const params = new URLSearchParams()
      if (selectedStatus) {
        params.append('accountantReviewStatus', selectedStatus)
      }
      
      const url = params.toString() 
        ? `${getApiUrl()}/api/orders?${params.toString()}`
        : `${getApiUrl()}/api/orders`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Filter orders that have accountantReviewStatus
        let filteredOrders = (data.data || []).filter(order => 
          order.accountantReviewStatus || order.status === 'pending'
        )
        
        // Store all orders for filter dropdowns
        setAllOrders(filteredOrders)
        
        // Filter by payment method if selected
        if (selectedPaymentMethod) {
          filteredOrders = filteredOrders.filter(order => {
            const method = order.payment?.method || 'credit'
            const methodMap = {
              'Cash': 'cash',
              'Visa': 'visa',
              'BenefitPay': 'benefit',
              'Flooss': 'floos',
              'Credit': 'credit'
            }
            return method === methodMap[selectedPaymentMethod]
          })
        }
        
        // Filter by salesman if selected
        if (selectedSalesman) {
          filteredOrders = filteredOrders.filter(order => {
            // Match by user ID or name
            const orderSalesmanId = order.createdBy?._id || order.createdBy
            const orderSalesmanName = order.createdBy?.name || order.customer?.employee || 'N/A'
            
            // Check if selected salesman matches user ID or name
            if (selectedSalesman.startsWith('_id:')) {
              // Match by user ID
              const userId = selectedSalesman.replace('_id:', '')
              return orderSalesmanId === userId || orderSalesmanId?.toString() === userId
            } else {
              // Match by name (fallback for old format)
              return orderSalesmanName === selectedSalesman
            }
          })
        }

        // Filter by Account
        if (selectedAccount) {
          filteredOrders = filteredOrders.filter(order => {
            const accountName = order.customer?.companyName || order.customer?.accountName || ''
            return accountName === selectedAccount
          })
        }

        // Filter by Date
        if (dateFilterType === 'single' && selectedDate) {
          filteredOrders = filteredOrders.filter(order => {
            const orderDate = new Date(order.createdAt)
            const filterDate = new Date(selectedDate)
            return orderDate.toDateString() === filterDate.toDateString()
          })
        } else if (dateFilterType === 'range' && dateFrom && dateTo) {
          filteredOrders = filteredOrders.filter(order => {
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
          filteredOrders = filteredOrders.filter(order => {
            const orderDate = new Date(order.createdAt)
            const [year, month] = selectedMonth.split('-')
            return orderDate.getFullYear() === parseInt(year) && 
                   orderDate.getMonth() === parseInt(month) - 1
          })
        }
        
        setOrders(filteredOrders)
      }
    } catch (error) {
      console.error('Error loading orders:', error)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  // Get status badge color - matching other pages colors
  const getStatusColor = (status) => {
    const normalizedStatus = (status || '').toLowerCase()
    switch (normalizedStatus) {
      case 'approved': return { bg: '#198754', color: '#ffffff' }
      case 'under_review':
      case 'under-review': return { bg: '#17a2b8', color: '#ffffff' }
      case 'pending_review':
      case 'pending-review': return { bg: '#ffc107', color: '#000000' }
      case 'rejected': return { bg: '#e83e8c', color: '#ffffff' }
      case 'cancelled': return { bg: '#dc3545', color: '#ffffff' }
      case 'delivered': return { bg: '#28a745', color: '#ffffff' }
      case 'shipped': return { bg: '#6f42c1', color: '#ffffff' }
      case 'processing': return { bg: '#007bff', color: '#ffffff' }
      case 'confirmed': return { bg: '#17a2b8', color: '#ffffff' }
      case 'pending': return { bg: '#ffc107', color: '#000000' }
      case 'returned': return { bg: '#fd7e14', color: '#ffffff' }
      case 'completed': return { bg: '#20c997', color: '#ffffff' }
      default: return { bg: '#6c757d', color: '#ffffff' }
    }
  }

  const handleOpenOrder = async (order) => {
    setSelectedOrder(order)
    setShowOrderDetailsModal(true)
    setAccountDetails(null)
    setLoadingAccount(true)
    
    // Fetch account details (Account = Customer, not User)
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

  const handleChangeStatus = (order) => {
    setSelectedOrder(order)
    setNewStatus(order.accountantReviewStatus || 'PENDING_REVIEW')
    setShowStatusModal(true)
  }

  const handleUpdateStatus = async () => {
    if (!selectedOrder || !newStatus) return
    
    try {
      setUpdatingStatus(true)
      const response = await fetch(`${getApiUrl()}/api/orders/${selectedOrder._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accountantReviewStatus: newStatus
        })
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        loadOrders()
        setShowStatusModal(false)
        setSelectedOrder(null)
        if (newStatus === 'APPROVED') {
          setPopupMessage('Order approved successfully. Account balance has been updated.')
          setPopupType('success')
          setShowPopup(true)
        } else {
          setPopupMessage('Order status updated successfully')
          setPopupType('success')
          setShowPopup(true)
        }
      } else {
        setPopupMessage(data.message || 'Error updating order status')
        setPopupType('error')
        setShowPopup(true)
      }
    } catch (error) {
      console.error('Error updating status:', error)
      setPopupMessage('Error updating order status')
      setPopupType('error')
      setShowPopup(true)
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleAttachPdf = (order) => {
    setSelectedOrder(order)
    setPdfFile(null)
    setShowPdfModal(true)
  }

  const handleRemovePdf = async () => {
    if (!selectedOrder || !selectedOrder.invoicePdf?.url) return
    
    if (!window.confirm('Are you sure you want to remove the attached PDF?')) {
      return
    }
    
    try {
      const response = await fetch(`${getApiUrl()}/api/orders/${selectedOrder._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          invoicePdf: {
            url: '',
            public_id: ''
          }
        })
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        await loadOrders()
        // Update selectedOrder to reflect the change
        setSelectedOrder({ ...selectedOrder, invoicePdf: { url: '', public_id: '' } })
        setPopupMessage('PDF removed successfully')
        setPopupType('success')
        setShowPopup(true)
      } else {
        setPopupMessage(data.message || 'Error removing PDF')
        setPopupType('error')
        setShowPopup(true)
      }
    } catch (error) {
      console.error('Error removing PDF:', error)
      setPopupMessage('Error removing PDF')
      setPopupType('error')
      setShowPopup(true)
    }
  }

  const handlePdfFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.type !== 'application/pdf') {
        setPopupMessage('Please select a PDF file')
        setPopupType('error')
        setShowPopup(true)
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        setPopupMessage('File size must be less than 10MB')
        setPopupType('error')
        setShowPopup(true)
        return
      }
      setPdfFile(file)
    }
  }

  const handleUploadPdf = async () => {
    if (!selectedOrder) {
      setPopupMessage('No order selected')
      setPopupType('error')
      setShowPopup(true)
      return
    }
    
    // If no new file selected and there's already a PDF, just close the modal
    if (!pdfFile && selectedOrder.invoicePdf?.url) {
      setShowPdfModal(false)
      return
    }
    
    // If no file selected and no existing PDF, require a file
    if (!pdfFile) {
      setPopupMessage('Please select a PDF file to upload')
      setPopupType('error')
      setShowPopup(true)
      return
    }
    
    try {
      setUploadingPdf(true)
      
      // Upload PDF to Supabase Storage
      const formData = new FormData()
      formData.append('file', pdfFile)
      formData.append('folder', 'invoices')
      
      const uploadResponse = await fetch(`${getApiUrl()}/api/upload/pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Don't set Content-Type header - let browser set it with boundary for FormData
        },
        body: formData
      })
      
      const uploadData = await uploadResponse.json()
      
      if (!uploadResponse.ok) {
        throw new Error(uploadData.message || `Upload failed with status ${uploadResponse.status}`)
      }
      
      if (uploadData.success && uploadData.data) {
        // Update order with PDF URL
        const updateResponse = await fetch(`${getApiUrl()}/api/orders/${selectedOrder._id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            invoicePdf: {
              url: uploadData.data.url,
              public_id: uploadData.data.public_id
            }
          })
        })
        
        const updateData = await updateResponse.json()
        
        if (!updateResponse.ok) {
          throw new Error(updateData.message || `Order update failed with status ${updateResponse.status}`)
        }
        
        if (updateData.success) {
          // Reload orders to get updated data
          await loadOrders()
          
          // Close modal and reset state
          setShowPdfModal(false)
          setSelectedOrder(null)
          setPdfFile(null)
          
          setPopupMessage('PDF uploaded and attached to order successfully!')
          setPopupType('success')
          setShowPopup(true)
        } else {
          throw new Error(updateData.message || 'Error updating order with PDF')
        }
      } else {
        throw new Error(uploadData.message || 'Invalid response from upload server')
      }
    } catch (error) {
      console.error('Error uploading PDF:', error)
      setPopupMessage(`Error uploading PDF: ${error.message || 'Please try again'}`)
      setPopupType('error')
      setShowPopup(true)
    } finally {
      setUploadingPdf(false)
    }
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

  const formatDateForExcel = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleDownloadOrders = async () => {
    if (orders.length === 0) {
      setPopupMessage('No orders to download')
      setPopupType('error')
      setShowPopup(true)
      return
    }

    // Fetch account details for all orders to get proper customer email
    // Accounts are customers, Users are system users (salesmen)
    const accountMap = new Map()
    try {
      const accountNames = [...new Set(orders.map(o => o.customer?.companyName || o.customer?.accountName).filter(Boolean))]
      for (const accountName of accountNames) {
        try {
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
              accountMap.set(accountName, account)
            }
          }
        } catch (error) {
          console.error(`Error fetching account ${accountName}:`, error)
        }
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
    }

    // Convert orders to CSV format
    const headers = [
      'Order ID',
      'Date',
      'Account (Customer)',
      'Salesman (System User)',
      'Payment Method',
      'Status',
      'Total',
      'VAT',
      'Subtotal',
      'Items Count',
      'Customer Name',
      'Customer Email (Account Email)',
      'Customer Phone',
      'Customer Address',
      'Customer City'
    ]
    
    const csvData = orders.map(order => {
      const status = order.accountantReviewStatus || 'PENDING_REVIEW'
      const method = order.payment?.method || 'credit'
      const methodMap = {
        'cash': 'Cash',
        'visa': 'Visa',
        'benefit': 'BenefitPay',
        'floos': 'Flooss',
        'credit': 'Credit'
      }
      const paymentMethod = methodMap[method] || method.toUpperCase()
      
      const itemsCount = order.items?.length || 0
      const subtotal = order.pricing?.subtotal || 0
      const vat = order.pricing?.vat || 0
      const total = order.pricing?.total || 0
      
      // Get account (customer) details
      const accountName = order.customer?.companyName || order.customer?.accountName
      const account = accountMap.get(accountName)
      
      // Get customer email with priority:
      // 1. Account email (if exists)
      // 2. First staff member email (if account has staff with email)
      // 3. N/A (if neither exists)
      let customerEmail = 'N/A'
      if (account) {
        if (account.email) {
          customerEmail = account.email
        } else if (account.staff && Array.isArray(account.staff) && account.staff.length > 0) {
          // Find first staff member with email
          const staffWithEmail = account.staff.find(s => s.email && s.email.trim())
          if (staffWithEmail) {
            customerEmail = staffWithEmail.email
          }
        }
      }
      
      return {
        'Order ID': order.orderNumber || order._id || 'N/A',
        'Date': formatDateForExcel(order.createdAt),
        'Account (Customer)': accountName || 'N/A',
        'Salesman (System User)': order.createdBy?.name || order.customer?.employee || 'N/A',
        'Payment Method': paymentMethod,
        'Status': status.replace('_', ' '),
        'Total': total.toFixed(2),
        'VAT': vat.toFixed(2),
        'Subtotal': subtotal.toFixed(2),
        'Items Count': itemsCount,
        'Customer Name': order.customer?.contactInfo?.name || account?.name || 'N/A',
        'Customer Email (Account Email)': customerEmail,
        'Customer Phone': account?.phone || order.customer?.contactInfo?.phone || 'N/A',
        'Customer Address': order.customer?.contactInfo?.address || (account ? `${account.address?.flatShopNo || ''} ${account.address?.building || ''} ${account.address?.road || ''} ${account.address?.block || ''} ${account.address?.area || ''}`.trim() : 'N/A'),
        'Customer City': order.customer?.contactInfo?.city || account?.address?.area || 'N/A'
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
    link.setAttribute('download', `orders_export_${timestamp}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleSaveAsPdf = () => {
    if (!selectedOrder) return

    const doc = new jsPDF()
    let yPosition = 20
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    const maxWidth = pageWidth - (margin * 2)

    // Helper function to add text with word wrap
    const addText = (text, x, y, maxWidth, fontSize = 10, isBold = false) => {
      doc.setFontSize(fontSize)
      if (isBold) {
        doc.setFont(undefined, 'bold')
      } else {
        doc.setFont(undefined, 'normal')
      }
      const lines = doc.splitTextToSize(text, maxWidth)
      doc.text(lines, x, y)
      return lines.length * (fontSize * 0.4) + 2
    }

    // Helper function to add a line
    const addLine = (y) => {
      doc.setLineWidth(0.5)
      doc.line(margin, y, pageWidth - margin, y)
      return y + 5
    }

    // Title
    yPosition += addText('ORDER DETAILS', margin, yPosition, maxWidth, 16, true)
    yPosition += 5

    // Order Information Section
    yPosition += addText('ORDER INFORMATION', margin, yPosition, maxWidth, 12, true)
    yPosition += 3

    const orderId = selectedOrder.orderNumber || selectedOrder._id
    yPosition += addText(`Order ID: ${orderId}`, margin, yPosition, maxWidth, 10)
    yPosition += addText(`Date: ${formatDate(selectedOrder.createdAt)}`, margin, yPosition, maxWidth, 10)
    yPosition += addText(`Status: ${selectedOrder.accountantReviewStatus || 'PENDING_REVIEW'}`, margin, yPosition, maxWidth, 10)
    
    const paymentMethod = (() => {
      const method = selectedOrder.payment?.method || 'credit'
      const methodMap = {
        'cash': 'Cash',
        'visa': 'Visa',
        'benefit': 'BenefitPay',
        'floos': 'Flooss',
        'credit': 'Credit'
      }
      return methodMap[method] || method.toUpperCase()
    })()
    yPosition += addText(`Payment Method: ${paymentMethod}`, margin, yPosition, maxWidth, 10)
    yPosition += addText(`Total: ${formatCurrency(selectedOrder.pricing?.total)}`, margin, yPosition, maxWidth, 10)
    yPosition += 5

    // Account Details Section
    if (accountDetails) {
      yPosition = addLine(yPosition)
      yPosition += 5
      yPosition += addText('ACCOUNT DETAILS', margin, yPosition, maxWidth, 12, true)
      yPosition += 3

      yPosition += addText(`Name: ${accountDetails.name || 'N/A'}`, margin, yPosition, maxWidth, 10)
      yPosition += addText(`Status: ${accountDetails.isActive ? 'Active' : 'Inactive'}`, margin, yPosition, maxWidth, 10)
      yPosition += addText(`Phone Number: ${accountDetails.phone || 'N/A'}`, margin, yPosition, maxWidth, 10)
      yPosition += 3

      // Address
      const addressParts = [
        accountDetails.address?.flatShopNo,
        accountDetails.address?.building,
        accountDetails.address?.road,
        accountDetails.address?.block,
        accountDetails.address?.area
      ].filter(Boolean)
      if (addressParts.length > 0) {
        yPosition += addText(`Address: ${addressParts.join(', ')}`, margin, yPosition, maxWidth, 10)
      }
      yPosition += 3

      // Business Information
      yPosition += addText('Business Information:', margin, yPosition, maxWidth, 10, true)
      yPosition += addText(`VAT Number: ${accountDetails.vat || 'N/A'}`, margin, yPosition, maxWidth, 10)
      yPosition += addText(`CR Number: ${accountDetails.crNumber || 'N/A'}`, margin, yPosition, maxWidth, 10)
      yPosition += addText(`Credit Limit: BD ${accountDetails.creditLimit?.toLocaleString() || '0'}`, margin, yPosition, maxWidth, 10)
      
      // Credit Balance Information (if credit payment)
      if (selectedOrder.payment?.method === 'credit') {
        yPosition += 3
        yPosition += addText('Credit Balance Information:', margin, yPosition, maxWidth, 10, true)
        yPosition += addText(`Current Balance: BD ${accountDetails.currentBalance?.toLocaleString() || '0'}`, margin, yPosition, maxWidth, 10)
        yPosition += addText(`Available Balance: BD ${((accountDetails.creditLimit || 0) - (accountDetails.currentBalance || 0)).toLocaleString()}`, margin, yPosition, maxWidth, 10)
        yPosition += addText(`Payment Status: ${selectedOrder.payment?.status === 'paid' ? 'Paid' : 'Pending'}`, margin, yPosition, maxWidth, 10)
      }
      yPosition += 5
    } else {
      // Fallback if account details not loaded
      yPosition = addLine(yPosition)
      yPosition += 5
      yPosition += addText('ACCOUNT DETAILS', margin, yPosition, maxWidth, 12, true)
      yPosition += 3
      yPosition += addText(`Account Name: ${selectedOrder.customer?.companyName || 'N/A'}`, margin, yPosition, maxWidth, 10)
      yPosition += addText(`Employee: ${selectedOrder.customer?.employee || 'N/A'}`, margin, yPosition, maxWidth, 10)
      yPosition += 5
    }

    // Order Items Section
    yPosition = addLine(yPosition)
    yPosition += 5
    yPosition += addText('ORDER ITEMS', margin, yPosition, maxWidth, 12, true)
    yPosition += 3

    // Table header
    const tableHeaders = ['Product', 'Brand', 'Category', 'Qty', 'Unit Price', 'VAT', 'Total']
    const colWidths = [50, 30, 30, 15, 25, 15, 25]
    let xPos = margin
    doc.setFontSize(9)
    doc.setFont(undefined, 'bold')
    tableHeaders.forEach((header, index) => {
      doc.text(header, xPos, yPosition)
      xPos += colWidths[index]
    })
    yPosition += 8

    // Table rows
    doc.setFont(undefined, 'normal')
    selectedOrder.items?.forEach((item, index) => {
      // Check if we need a new page
      if (yPosition > 250) {
        doc.addPage()
        yPosition = 20
      }

      xPos = margin
      const rowData = [
        item.productName || 'N/A',
        item.brand || 'N/A',
        item.category || 'N/A',
        item.quantity?.toString() || '0',
        formatCurrency(item.unitPrice),
        `${item.vatRate || 0}%`,
        formatCurrency(item.totalPrice)
      ]

      rowData.forEach((data, colIndex) => {
        const lines = doc.splitTextToSize(data, colWidths[colIndex] - 2)
        doc.text(lines, xPos, yPosition)
        xPos += colWidths[colIndex]
      })
      yPosition += 8
    })

    // Pricing Summary
    if (yPosition > 240) {
      doc.addPage()
      yPosition = 20
    } else {
      yPosition += 5
    }

    yPosition = addLine(yPosition)
    yPosition += 5
    yPosition += addText('PRICING SUMMARY', margin, yPosition, maxWidth, 12, true)
    yPosition += 3

    yPosition += addText(`Subtotal: ${formatCurrency(selectedOrder.pricing?.subtotal)}`, margin, yPosition, maxWidth, 10)
    yPosition += addText(`Delivery: ${formatCurrency(selectedOrder.pricing?.deliveryCost)}`, margin, yPosition, maxWidth, 10)
    yPosition += addText(`VAT: ${formatCurrency(selectedOrder.pricing?.totalVat)}`, margin, yPosition, maxWidth, 10)
    yPosition += 3
    doc.setFont(undefined, 'bold')
    yPosition += addText(`Total: ${formatCurrency(selectedOrder.pricing?.total)}`, margin, yPosition, maxWidth, 12, true)

    // Save PDF
    const fileName = `Order_${orderId}_${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(fileName)
  }

  const handleMarkAsPaid = async (order) => {
    if (!order || order.payment?.method !== 'credit') return
    
    if (!window.confirm(`Are you sure you want to mark this credit order as paid? This will restore the credit limit of BD ${order.pricing?.total?.toFixed(2) || 0} to the account.`)) {
      return
    }
    
    try {
      setMarkingAsPaid(true)
      const response = await fetch(`${getApiUrl()}/api/orders/${order._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          payment: {
            ...order.payment,
            status: 'paid',
            paidAt: new Date().toISOString()
          }
        })
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        // Reload orders to get updated payment status
        await loadOrders()
        
        // Reload account details if order details modal is open
        if (showOrderDetailsModal && selectedOrder?._id === order._id) {
          // Fetch updated order
          const updatedOrderResponse = await fetch(`${getApiUrl()}/api/orders/${order._id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
          const updatedOrderData = await updatedOrderResponse.json()
          if (updatedOrderResponse.ok && updatedOrderData.success) {
            await handleOpenOrder(updatedOrderData.data)
          }
        }
        setPopupMessage('Order marked as paid successfully. Credit limit has been restored.')
        setPopupType('success')
        setShowPopup(true)
      } else {
        setPopupMessage(data.message || 'Error marking order as paid')
        setPopupType('error')
        setShowPopup(true)
      }
    } catch (error) {
      console.error('Error marking order as paid:', error)
      setPopupMessage('Error marking order as paid')
      setPopupType('error')
      setShowPopup(true)
    } finally {
      setMarkingAsPaid(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title">Order Management</h1>
        <PrimaryButton 
          onClick={handleDownloadOrders}
          disabled={orders.length === 0}
          style={{ marginLeft: 'auto' }}
        >
          ⬇️ Download All Orders
        </PrimaryButton>
      </div>
      
      <PageSection title="Order Management">
        <div className="orders-filter">
          <div className="form-group">
            <label htmlFor="status-filter">Filter by Status</label>
            <select 
              id="status-filter"
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
            <label htmlFor="salesman-filter">Filter by Salesman</label>
            <select 
              id="salesman-filter"
              value={selectedSalesman}
              onChange={(e) => setSelectedSalesman(e.target.value)}
              disabled={loadingUsers}
            >
              <option value="">All Salesmen</option>
              {loadingUsers ? (
                <option value="">Loading users...</option>
              ) : (
                companyUsers
                  .filter(u => u.name) // Filter out users without names
                  .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                  .map(user => (
                    <option key={user._id} value={`_id:${user._id}`}>
                      {user.name} {user.email ? `(${user.email})` : ''}
                    </option>
                  ))
              )}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="payment-method-filter">Filter by Payment Method</label>
            <select 
              id="payment-method-filter"
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
            >
              <option value="">All Payment Methods</option>
              <option value="Cash">Cash</option>
              <option value="Visa">Visa</option>
              <option value="BenefitPay">BenefitPay</option>
              <option value="Flooss">Flooss</option>
              <option value="Credit">Credit</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="account-filter">Filter by Account:</label>
            <select 
              id="account-filter"
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
            <label htmlFor="date-filter">Filter by Date:</label>
            <select 
              id="date-filter"
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
        
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
            <Loading message="Loading orders..." />
          </div>
        ) : (
          <>
            {/* Summary Section - Above Table */}
            {orders.length > 0 && (
              <div className="orders-summary-bar">
                {(() => {
                  // Calculate best account (account with highest total revenue)
                  const accountTotals = {}
                  orders.forEach(order => {
                    const accountName = order.customer?.companyName || order.customer?.accountName || 'N/A'
                    if (!accountTotals[accountName]) {
                      accountTotals[accountName] = 0
                    }
                    accountTotals[accountName] += order.pricing?.total || 0
                  })
                  const accountKeys = Object.keys(accountTotals)
                  const bestAccount = accountKeys.length > 0 
                    ? accountKeys.reduce((a, b) => accountTotals[a] > accountTotals[b] ? a : b)
                    : 'N/A'

                  // Calculate accounts with credit limit over
                  const creditLimitOver = accounts.filter(acc => 
                    (acc.currentBalance || 0) > (acc.creditLimit || 0)
                  ).length

                  // Calculate totals
                  const totalOrders = orders.length
                  const sumTotal = orders.reduce((sum, order) => sum + (order.pricing?.total || 0), 0)
                  
                  // Calculate net profit (sum total - total cost)
                  // Note: This requires fetching product cost prices from order items
                  // For now, we'll calculate it if order items have product data populated
                  let totalCost = 0
                  orders.forEach(order => {
                    if (order.items && order.items.length > 0) {
                      order.items.forEach(item => {
                        // If product is populated, use its cost price
                        if (item.product && item.product.pricing && item.product.pricing.cost) {
                          totalCost += (item.product.pricing.cost * item.quantity)
                        }
                        // Otherwise, estimate cost as 70% of unit price (fallback)
                        else if (item.unitPrice) {
                          totalCost += (item.unitPrice * 0.7 * item.quantity)
                        }
                      })
                    }
                  })
                  const netProfit = sumTotal - totalCost

                  return (
                    <>
                      <div className="summary-stat">
                        <span className="stat-label">Best Account:</span>
                        <span className="stat-value">{bestAccount}</span>
                      </div>
                      <div className="summary-stat">
                        <span className="stat-label">Account Credit Limit Over:</span>
                        <span className="stat-value">{creditLimitOver}</span>
                      </div>
                      <div className="summary-stat">
                        <span className="stat-label">Total of all orders:</span>
                        <span className="stat-value">{totalOrders}</span>
                      </div>
                      <div className="summary-stat">
                        <span className="stat-label">Sum Total:</span>
                        <span className="stat-value">{formatCurrency(sumTotal)}</span>
                      </div>
                      <div className="summary-stat">
                        <span className="stat-label">Net Profit:</span>
                        <span className="stat-value profit">{formatCurrency(netProfit)}</span>
                      </div>
                    </>
                  )
                })()}
              </div>
            )}

            {orders.length === 0 ? (
              <EmptyState message="No orders found" />
            ) : (
              <div className="orders-table-container">
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => {
                  const status = order.accountantReviewStatus || 'PENDING_REVIEW'
                  const statusStyle = getStatusColor(status)
                  return (
                    <tr key={order._id}>
                      <td>#{order.orderNumber || order._id}</td>
                      <td>{formatDate(order.createdAt)}</td>
                      <td>{order.customer?.companyName || order.customer?.accountName || 'N/A'}</td>
                      <td>{order.createdBy?.name || order.customer?.employee || 'N/A'}</td>
                      <td>
                        <span className="payment-method-badge">
                          {(() => {
                            const method = order.payment?.method || 'credit'
                            const methodMap = {
                              'cash': 'Cash',
                              'visa': 'Visa',
                              'benefit': 'BenefitPay',
                              'floos': 'Flooss',
                              'credit': 'Credit'
                            }
                            return methodMap[method] || method.toUpperCase()
                          })()}
                        </span>
                      </td>
                      <td>
                        <span 
                          className={`status-badge status-${status.toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-')}`}
                          style={{ 
                            backgroundColor: statusStyle.bg,
                            color: statusStyle.color
                          }}
                        >
                          {status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>{formatCurrency(order.pricing?.total)}</td>
                      <td className="actions-cell">
                        <PrimaryButton 
                          onClick={() => handleOpenOrder(order)}
                          style={{ marginRight: '0.5rem' }}
                        >
                          Open
                        </PrimaryButton>
                        <SecondaryButton 
                          onClick={() => handleChangeStatus(order)}
                          style={{ marginRight: '0.5rem' }}
                        >
                          Change Status
                        </SecondaryButton>
                        <SecondaryButton 
                          onClick={() => handleAttachPdf(order)}
                          style={{ marginRight: '0.5rem' }}
                        >
                          Attach
                        </SecondaryButton>
                        {order.payment?.method === 'credit' && order.payment?.status !== 'paid' && (
                          <PrimaryButton 
                            onClick={() => handleMarkAsPaid(order)}
                            disabled={markingAsPaid}
                            style={{ 
                              backgroundColor: '#27ae60',
                              marginRight: '0.5rem'
                            }}
                          >
                            {markingAsPaid ? 'Processing...' : 'Mark as Paid'}
                          </PrimaryButton>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
              </div>
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
                    <span>
                      <span 
                        className={`status-badge status-${((selectedOrder.accountantReviewStatus || 'PENDING_REVIEW').toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-'))}`}
                      >
                        {(selectedOrder.accountantReviewStatus || 'PENDING_REVIEW').replace(/_/g, ' ')}
                      </span>
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Total:</label>
                    <span>{formatCurrency(selectedOrder.pricing?.total)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Payment Method:</label>
                    <span>
                      {(() => {
                        const method = selectedOrder.payment?.method || 'credit'
                        const methodMap = {
                          'cash': 'Cash',
                          'visa': 'Visa',
                          'benefit': 'BenefitPay',
                          'floos': 'Flooss',
                          'credit': 'Credit'
                        }
                        return methodMap[method] || method.toUpperCase()
                      })()}
                    </span>
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
              {selectedOrder.payment?.method === 'credit' && selectedOrder.payment?.status !== 'paid' && (
                <PrimaryButton 
                  onClick={() => {
                    setShowOrderDetailsModal(false)
                    handleMarkAsPaid(selectedOrder)
                  }}
                  disabled={markingAsPaid}
                  style={{ 
                    backgroundColor: '#27ae60',
                    marginRight: '1rem'
                  }}
                >
                  {markingAsPaid ? 'Processing...' : 'Mark as Paid'}
                </PrimaryButton>
              )}
              <PrimaryButton 
                onClick={handleSaveAsPdf}
                style={{ 
                  backgroundColor: '#e74c3c',
                  marginRight: '1rem'
                }}
              >
                Save as PDF
              </PrimaryButton>
              <SecondaryButton onClick={() => setShowOrderDetailsModal(false)}>
                Close
              </SecondaryButton>
            </div>
          </div>
        </div>
      )}

      {/* Change Status Modal */}
      {showStatusModal && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowStatusModal(false)}>
          <div className="modal-content status-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Change Order Status</h2>
              <button className="modal-close" onClick={() => setShowStatusModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Order ID:</label>
                <input 
                  type="text" 
                  value={selectedOrder.orderNumber || selectedOrder._id} 
                  disabled 
                />
              </div>
              <div className="form-group">
                <label>Current Status:</label>
                <input 
                  type="text" 
                  value={selectedOrder.accountantReviewStatus || 'PENDING_REVIEW'} 
                  disabled 
                />
              </div>
              <div className="form-group">
                <label>New Status *</label>
                <select 
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  <option value="PENDING_REVIEW">PENDING REVIEW</option>
                  <option value="UNDER_REVIEW">UNDER REVIEW</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="REJECTED">REJECTED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <SecondaryButton onClick={() => setShowStatusModal(false)}>
                Cancel
              </SecondaryButton>
              <PrimaryButton 
                onClick={handleUpdateStatus}
                disabled={updatingStatus || !newStatus}
              >
                {updatingStatus ? 'Updating...' : 'Update Status'}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {/* Attach PDF Modal */}
      {showPdfModal && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowPdfModal(false)}>
          <div className="modal-content pdf-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Attach Invoice PDF</h2>
              <button className="modal-close" onClick={() => setShowPdfModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Order ID:</label>
                <input 
                  type="text" 
                  value={selectedOrder.orderNumber || selectedOrder._id} 
                  disabled 
                />
              </div>
              {selectedOrder.invoicePdf?.url && (
                <div className="form-group">
                  <label>Current Attached PDF:</label>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem',
                    padding: '0.75rem',
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}>
                    <a 
                      href={selectedOrder.invoicePdf.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ 
                        color: 'blue', 
                        textDecoration: 'underline',
                        flex: 1,
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      View Attached PDF
                    </a>
                    <SecondaryButton 
                      onClick={handleRemovePdf}
                      style={{ 
                        backgroundColor: '#e74c3c',
                        color: 'white',
                        padding: '0.5rem 1rem',
                        fontSize: '0.9rem'
                      }}
                    >
                      Remove
                    </SecondaryButton>
                  </div>
                </div>
              )}
              <div className="form-group">
                <label>{selectedOrder.invoicePdf?.url ? 'Replace PDF (optional)' : 'Upload PDF *'}</label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input
                    type="file"
                    id="pdf-file-input"
                    accept=".pdf"
                    onChange={handlePdfFileChange}
                    style={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: 'pointer',
                      zIndex: 2
                    }}
                  />
                  <div
                    style={{
                      width: '100%',
                      padding: '1rem',
                      border: '2px dashed #3498db',
                      borderRadius: '8px',
                      background: '#e3f2fd',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      color: '#3498db',
                      fontWeight: '600'
                    }}
                    onClick={() => document.getElementById('pdf-file-input')?.click()}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#bbdefb'
                      e.currentTarget.style.borderColor = '#2980b9'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#e3f2fd'
                      e.currentTarget.style.borderColor = '#3498db'
                    }}
                  >
                    {pdfFile ? `Selected: ${pdfFile.name}` : 'Click to select PDF file or drag and drop'}
                  </div>
                </div>
                {pdfFile && (
                  <div style={{ marginTop: '0.5rem', color: '#27ae60', fontSize: '0.9rem' }}>
                    ✓ File ready: {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <SecondaryButton onClick={() => setShowPdfModal(false)}>
                Cancel
              </SecondaryButton>
              <PrimaryButton 
                onClick={handleUploadPdf}
                disabled={uploadingPdf || (!pdfFile && !selectedOrder.invoicePdf?.url)}
              >
                {uploadingPdf 
                  ? 'Uploading...' 
                  : pdfFile 
                    ? 'Upload PDF' 
                    : selectedOrder.invoicePdf?.url 
                      ? 'Close' 
                      : 'Upload PDF'}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {/* Popup for Messages */}
      {showPopup && (
        <div className="modal-overlay" onClick={() => setShowPopup(false)}>
          <div className={`message-popup ${popupType}`} onClick={(e) => e.stopPropagation()}>
            <div className="popup-icon">
              {popupType === 'success' ? '✓' : '✕'}
            </div>
            <h3>{popupType === 'success' ? 'Success' : 'Error'}</h3>
            <p>{popupMessage}</p>
            <PrimaryButton onClick={() => setShowPopup(false)}>
              OK
            </PrimaryButton>
          </div>
        </div>
      )}
    </div>
  )
}

export default AccountantOrders
