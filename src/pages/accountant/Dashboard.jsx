import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { getApiUrl } from '../../utils/security'
import PageSection from '../../components/PageSection.jsx'
import PrimaryButton from '../../components/PrimaryButton.jsx'
import SecondaryButton from '../../components/SecondaryButton.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import Loading from '../../components/Loading.jsx'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import './Dashboard.css'

function AccountantDashboard() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [recentOrders, setRecentOrders] = useState([])
  const [monthlyRevenue, setMonthlyRevenue] = useState([])
  const [paymentMethodData, setPaymentMethodData] = useState([])
  const [statusData, setStatusData] = useState([])
  const [accountantReviewStats, setAccountantReviewStats] = useState({})
  const [timePeriodFilter, setTimePeriodFilter] = useState(6) // Default to 6 months
  const [allOrders, setAllOrders] = useState([]) // Store all orders for filtering
  const [error, setError] = useState(null)
  const [lastFetchTime, setLastFetchTime] = useState(0)

  // Chart colors
  const COLORS = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6f42c1', '#e83e8c']
  const STATUS_COLORS = {
    'PENDING_REVIEW': '#ffc107',
    'UNDER_REVIEW': '#17a2b8',
    'APPROVED': '#28a745',
    'REJECTED': '#dc3545',
    'CANCELLED': '#6c757d'
  }

  useEffect(() => {
    if (token) {
      loadDashboardData()
    }
  }, [token])

  // Update charts when time period filter changes
  useEffect(() => {
    if (allOrders.length > 0) {
      processChartData(allOrders, timePeriodFilter)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timePeriodFilter])

  const loadDashboardData = async (forceRefresh = false) => {
    // Prevent too frequent requests (cache for 30 seconds)
    const now = Date.now()
    if (!forceRefresh && now - lastFetchTime < 30000 && allOrders.length > 0) {
      return // Use cached data if less than 30 seconds have passed
    }

    try {
      setLoading(true)
      setError(null)
      
      // Load orders for analytics (fetch enough for charts - up to 1 year of data)
      // We'll calculate statistics from orders data to reduce API calls (saves 1 request)
      const ordersResponse = await fetch(`${getApiUrl()}/api/orders?limit=200&sort=createdAt&order=desc`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (ordersResponse.status === 429) {
        setError('Too many requests. Please wait a moment and try again.')
        setLoading(false)
        return
      }

      if (!ordersResponse.ok) {
        throw new Error(`HTTP error! status: ${ordersResponse.status}`)
      }
      
      const ordersData = await ordersResponse.json()
      
      if (ordersData.success) {
        const orders = ordersData.data || []
        setRecentOrders(orders)
        setAllOrders(orders)
        
        // Calculate statistics from orders data instead of separate API call
        calculateStatsFromOrders(orders)
        
        // Process data for charts with current filter
        processChartData(orders, timePeriodFilter)
        
        setLastFetchTime(now)
      } else {
        setError(ordersData.message || 'Failed to load dashboard data')
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      if (error.message.includes('429')) {
        setError('Too many requests. Please wait a moment and try again.')
      } else {
        setError('Failed to load dashboard data. Please try again later.')
      }
    } finally {
      setLoading(false)
    }
  }

  const calculateStatsFromOrders = (orders) => {
    const totalOrders = orders.length
    const totalRevenue = orders.reduce((sum, order) => sum + (order.pricing?.total || 0), 0)
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    const statusBreakdown = {}
    orders.forEach(order => {
      const status = order.status || 'pending'
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1
    })

    setStats({
      overview: {
        totalOrders,
        totalRevenue,
        averageOrderValue
      },
      statusBreakdown: Object.entries(statusBreakdown).map(([_id, count]) => ({ _id, count }))
    })
  }

  const processChartData = (orders, periodMonths = 6) => {
    // Calculate monthly revenue based on selected period
    const monthlyMap = {}
    const startDate = new Date()
    
    // Set start date based on period
    if (periodMonths === 12) {
      startDate.setFullYear(startDate.getFullYear() - 1)
    } else {
      startDate.setMonth(startDate.getMonth() - periodMonths)
    }
    
    // Filter orders within the period
    orders.forEach(order => {
      const orderDate = new Date(order.createdAt)
      if (orderDate >= startDate) {
        const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`
        const monthName = orderDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        
        if (!monthlyMap[monthKey]) {
          monthlyMap[monthKey] = {
            month: monthName,
            revenue: 0,
            orders: 0
          }
        }
        
        monthlyMap[monthKey].revenue += order.pricing?.total || 0
        monthlyMap[monthKey].orders += 1
      }
    })
    
    // Fill in missing months
    const monthlyArray = []
    const monthsToShow = periodMonths === 12 ? 12 : periodMonths
    
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      
      monthlyArray.push(monthlyMap[monthKey] || {
        month: monthName,
        revenue: 0,
        orders: 0
      })
    }
    
    setMonthlyRevenue(monthlyArray)

    // Filter orders by time period for payment method and status distribution
    const filteredOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt)
      return orderDate >= startDate
    })

    // Payment method distribution (filtered by time period)
    const paymentMap = {}
    filteredOrders.forEach(order => {
      const method = order.payment?.method || 'credit'
      const methodName = {
        'cash': 'Cash',
        'visa': 'Visa',
        'benefit': 'BenefitPay',
        'floos': 'Flooss',
        'credit': 'Credit'
      }[method] || method.toUpperCase()
      
      if (!paymentMap[methodName]) {
        paymentMap[methodName] = { name: methodName, value: 0, amount: 0 }
      }
      paymentMap[methodName].value += 1
      paymentMap[methodName].amount += order.pricing?.total || 0
    })
    
    setPaymentMethodData(Object.values(paymentMap))

    // Order status distribution (accountant review status) - filtered by time period
    const statusMap = {}
    filteredOrders.forEach(order => {
      const status = order.accountantReviewStatus || 'PENDING_REVIEW'
      const statusName = status.replace('_', ' ')
      
      if (!statusMap[statusName]) {
        statusMap[statusName] = { name: statusName, value: 0, amount: 0 }
      }
      statusMap[statusName].value += 1
      statusMap[statusName].amount += order.pricing?.total || 0
    })
    
    setStatusData(Object.values(statusMap))

    // Accountant review statistics
    const reviewStats = {
      pending: orders.filter(o => o.accountantReviewStatus === 'PENDING_REVIEW').length,
      underReview: orders.filter(o => o.accountantReviewStatus === 'UNDER_REVIEW').length,
      approved: orders.filter(o => o.accountantReviewStatus === 'APPROVED').length,
      rejected: orders.filter(o => o.accountantReviewStatus === 'REJECTED').length,
      cancelled: orders.filter(o => o.accountantReviewStatus === 'CANCELLED').length
    }
    
    setAccountantReviewStats(reviewStats)
  }

  const formatCurrency = (amount) => {
    return `BD ${parseFloat(amount || 0).toFixed(2)}`
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING_REVIEW': return { bg: '#fff3cd', color: '#856404' }
      case 'UNDER_REVIEW': return { bg: '#cce5ff', color: '#004085' }
      case 'APPROVED': return { bg: '#d4edda', color: '#155724' }
      case 'REJECTED': return { bg: '#f8d7da', color: '#721c24' }
      case 'CANCELLED': return { bg: '#6c757d', color: '#ffffff' }
      default: return { bg: '#f8f9fa', color: '#6c757d' }
    }
  }

  // Calculate additional metrics
  const totalRevenue = stats?.overview?.totalRevenue || 0
  const totalOrders = stats?.overview?.totalOrders || 0
  const averageOrderValue = stats?.overview?.averageOrderValue || 0
  const pendingReviewCount = accountantReviewStats.pending || 0
  const approvedCount = accountantReviewStats.approved || 0
  
  // Calculate this month's revenue
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  const thisMonthRevenue = recentOrders
    .filter(order => {
      const orderDate = new Date(order.createdAt)
      return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear
    })
    .reduce((sum, order) => sum + (order.pricing?.total || 0), 0)

  // Calculate this month's orders
  const thisMonthOrders = recentOrders.filter(order => {
    const orderDate = new Date(order.createdAt)
    return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear
  }).length

  if (loading && allOrders.length === 0) {
    return (
      <div className="accountant-dashboard">
        <Loading message="Loading dashboard data..." />
      </div>
    )
  }

  return (
    <div className="accountant-dashboard">
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button 
            className="error-retry-button"
            onClick={() => {
              setError(null)
              loadDashboardData(true)
            }}
          >
            Retry
          </button>
        </div>
      )}
      <div className="dashboard-header">
        <h1 className="dashboard-title">Accountant Dashboard</h1>
        <p className="dashboard-subtitle">Financial overview and order management</p>
      </div>

      {/* Key Metrics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Total Revenue</span>
          </div>
          <div className="stat-card-value">{formatCurrency(totalRevenue)}</div>
          <div className="stat-card-change positive">
            All time revenue
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">This Month Revenue</span>
          </div>
          <div className="stat-card-value">{formatCurrency(thisMonthRevenue)}</div>
          <div className="stat-card-change positive">
            {thisMonthOrders} orders this month
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Total Orders</span>
          </div>
          <div className="stat-card-value">{totalOrders}</div>
          <div className="stat-card-change">
            Average: {formatCurrency(averageOrderValue)}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Pending Review</span>
          </div>
          <div className="stat-card-value">{pendingReviewCount}</div>
          <div className="stat-card-change">
            {approvedCount} approved
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-grid">
        <PageSection title="Revenue Trends">
          <div className="chart-filter-container">
            <div className="chart-filter-buttons">
              <button
                className={`filter-button ${timePeriodFilter === 1 ? 'active' : ''}`}
                onClick={() => setTimePeriodFilter(1)}
              >
                1 Month
              </button>
              <button
                className={`filter-button ${timePeriodFilter === 3 ? 'active' : ''}`}
                onClick={() => setTimePeriodFilter(3)}
              >
                3 Months
              </button>
              <button
                className={`filter-button ${timePeriodFilter === 6 ? 'active' : ''}`}
                onClick={() => setTimePeriodFilter(6)}
              >
                6 Months
              </button>
              <button
                className={`filter-button ${timePeriodFilter === 12 ? 'active' : ''}`}
                onClick={() => setTimePeriodFilter(12)}
              >
                1 Year
              </button>
            </div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#007bff" 
                  strokeWidth={2}
                  name="Revenue"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </PageSection>

        <PageSection title="Monthly Orders & Revenue">
          <div className="chart-filter-container">
            <div className="chart-filter-buttons">
              <button
                className={`filter-button ${timePeriodFilter === 1 ? 'active' : ''}`}
                onClick={() => setTimePeriodFilter(1)}
              >
                1 Month
              </button>
              <button
                className={`filter-button ${timePeriodFilter === 3 ? 'active' : ''}`}
                onClick={() => setTimePeriodFilter(3)}
              >
                3 Months
              </button>
              <button
                className={`filter-button ${timePeriodFilter === 6 ? 'active' : ''}`}
                onClick={() => setTimePeriodFilter(6)}
              >
                6 Months
              </button>
              <button
                className={`filter-button ${timePeriodFilter === 12 ? 'active' : ''}`}
                onClick={() => setTimePeriodFilter(12)}
              >
                1 Year
              </button>
            </div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="orders" fill="#28a745" name="Orders" />
                <Bar yAxisId="right" dataKey="revenue" fill="#007bff" name="Revenue (BD)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </PageSection>

        <PageSection title="Payment Method Distribution">
          <div className="chart-filter-container">
            <div className="chart-filter-buttons">
              <button
                className={`filter-button ${timePeriodFilter === 1 ? 'active' : ''}`}
                onClick={() => setTimePeriodFilter(1)}
              >
                1 Month
              </button>
              <button
                className={`filter-button ${timePeriodFilter === 3 ? 'active' : ''}`}
                onClick={() => setTimePeriodFilter(3)}
              >
                3 Months
              </button>
              <button
                className={`filter-button ${timePeriodFilter === 6 ? 'active' : ''}`}
                onClick={() => setTimePeriodFilter(6)}
              >
                6 Months
              </button>
              <button
                className={`filter-button ${timePeriodFilter === 12 ? 'active' : ''}`}
                onClick={() => setTimePeriodFilter(12)}
              >
                1 Year
              </button>
            </div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={paymentMethodData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {paymentMethodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="chart-legend">
              {paymentMethodData.map((item, index) => (
                <div key={index} className="legend-item">
                  <span 
                    className="legend-color" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></span>
                  <span>{item.name}: {item.value} orders ({formatCurrency(item.amount)})</span>
                </div>
              ))}
            </div>
          </div>
        </PageSection>

        <PageSection title="Order Status Breakdown">
          <div className="chart-filter-container">
            <div className="chart-filter-buttons">
              <button
                className={`filter-button ${timePeriodFilter === 1 ? 'active' : ''}`}
                onClick={() => setTimePeriodFilter(1)}
              >
                1 Month
              </button>
              <button
                className={`filter-button ${timePeriodFilter === 3 ? 'active' : ''}`}
                onClick={() => setTimePeriodFilter(3)}
              >
                3 Months
              </button>
              <button
                className={`filter-button ${timePeriodFilter === 6 ? 'active' : ''}`}
                onClick={() => setTimePeriodFilter(6)}
              >
                6 Months
              </button>
              <button
                className={`filter-button ${timePeriodFilter === 12 ? 'active' : ''}`}
                onClick={() => setTimePeriodFilter(12)}
              >
                1 Year
              </button>
            </div>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => {
                    const statusKey = entry.name.replace(' ', '_').toUpperCase()
                    const color = STATUS_COLORS[statusKey] || COLORS[index % COLORS.length]
                    return <Cell key={`cell-${index}`} fill={color} />
                  })}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="chart-legend">
              {statusData.map((item, index) => {
                const statusKey = item.name.replace(' ', '_').toUpperCase()
                const color = STATUS_COLORS[statusKey] || COLORS[index % COLORS.length]
                return (
                  <div key={index} className="legend-item">
                    <span 
                      className="legend-color" 
                      style={{ backgroundColor: color }}
                    ></span>
                    <span>{item.name}: {item.value} orders ({formatCurrency(item.amount)})</span>
                  </div>
                )
              })}
            </div>
          </div>
        </PageSection>
      </div>

      {/* Quick Actions */}
      <PageSection title="Quick Actions">
        <div className="quick-actions">
          <PrimaryButton onClick={() => navigate('/dashboard/accountant/orders')}>
            View All Orders
          </PrimaryButton>
          <SecondaryButton onClick={() => navigate('/dashboard/accountant/orders?accountantReviewStatus=PENDING_REVIEW')}>
            Review Pending Orders
          </SecondaryButton>
          <SecondaryButton onClick={() => loadDashboardData(true)}>
            Refresh Data
          </SecondaryButton>
        </div>
      </PageSection>

      {/* Recent Orders */}
      <PageSection title="Recent Orders">
        {recentOrders.length === 0 ? (
          <EmptyState message="No recent orders found" />
        ) : (
          <div className="recent-orders-table-container">
            <table className="recent-orders-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Date</th>
                  <th>Account</th>
                  <th>Payment Method</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.slice(0, 10).map(order => {
                  const status = order.accountantReviewStatus || 'PENDING_REVIEW'
                  const statusStyle = getStatusColor(status)
                  const paymentMethod = order.payment?.method || 'credit'
                  const methodName = {
                    'cash': 'Cash',
                    'visa': 'Visa',
                    'benefit': 'BenefitPay',
                    'floos': 'Flooss',
                    'credit': 'Credit'
                  }[paymentMethod] || paymentMethod.toUpperCase()
                  
                  return (
                    <tr key={order._id}>
                      <td>#{order.orderNumber || order._id}</td>
                      <td>{formatDate(order.createdAt)}</td>
                      <td>{order.customer?.companyName || 'N/A'}</td>
                      <td>
                        <span className="payment-method-badge">{methodName}</span>
                      </td>
                      <td>
                        <span 
                          className="status-badge"
                          style={{ 
                            backgroundColor: statusStyle.bg,
                            color: statusStyle.color
                          }}
                        >
                          {status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>{formatCurrency(order.pricing?.total)}</td>
                      <td>
                        <PrimaryButton 
                          onClick={() => navigate('/dashboard/accountant/orders')}
                          style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                        >
                          View
                        </PrimaryButton>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>
    </div>
  )
}

export default AccountantDashboard
