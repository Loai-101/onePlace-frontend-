import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import PageSection from '../../components/PageSection.jsx'
import PrimaryButton from '../../components/PrimaryButton.jsx'
import SecondaryButton from '../../components/SecondaryButton.jsx'
import EmptyState from '../../components/EmptyState.jsx'
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

function OwnerDashboard() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState(null)
  const [timePeriodFilter, setTimePeriodFilter] = useState(6) // Default to 6 months
  const [lastFetchTime, setLastFetchTime] = useState(0)

  // Data states
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [users, setUsers] = useState([])
  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [lowStockProducts, setLowStockProducts] = useState([])

  // Chart data states
  const [monthlyRevenue, setMonthlyRevenue] = useState([])
  const [orderStatusData, setOrderStatusData] = useState([])
  const [paymentMethodData, setPaymentMethodData] = useState([])
  const [userRoleData, setUserRoleData] = useState([])
  const [categoryRevenueData, setCategoryRevenueData] = useState([])
  const [topProductsData, setTopProductsData] = useState([])

  // Chart colors
  const COLORS = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6f42c1', '#e83e8c', '#20c997', '#fd7e14']

  useEffect(() => {
    if (token) {
      loadDashboardData()
    }
  }, [token])

  // Update charts when time period filter changes
  useEffect(() => {
    if (orders.length > 0) {
      processChartData(orders, timePeriodFilter)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timePeriodFilter])

  const loadDashboardData = async (forceRefresh = false) => {
    // Prevent too frequent requests (cache for 30 seconds)
    const now = Date.now()
    if (!forceRefresh && now - lastFetchTime < 30000 && orders.length > 0) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Load all data in parallel
      const [ordersRes, productsRes, usersRes, categoriesRes, brandsRes, orderStatsRes, userStatsRes] = await Promise.all([
        fetch('http://localhost:5000/api/orders?limit=200&sort=createdAt&order=desc', {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }),
        fetch('http://localhost:5000/api/products?limit=500', {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }),
        fetch('http://localhost:5000/api/users?limit=100', {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }),
        fetch('http://localhost:5000/api/categories', {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }),
        fetch('http://localhost:5000/api/brands', {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }),
        fetch('http://localhost:5000/api/orders/statistics', {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }),
        fetch('http://localhost:5000/api/users/statistics', {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        })
      ])

      // Check for rate limiting
      if (ordersRes.status === 429 || productsRes.status === 429) {
        setError('Too many requests. Please wait a moment and try again.')
        setLoading(false)
        return
      }

      // Parse responses
      const ordersData = await ordersRes.json()
      const productsData = await productsRes.json()
      const usersData = await usersRes.json()
      const categoriesData = await categoriesRes.json()
      const brandsData = await brandsRes.json()
      const orderStatsData = await orderStatsRes.json()
      const userStatsData = await userStatsRes.json()

      if (ordersData.success) {
        setOrders(ordersData.data || [])
        processChartData(ordersData.data || [], timePeriodFilter)
      }

      if (productsData.success) {
        const productsList = productsData.data || []
        setProducts(productsList)
        // Find low stock products and sort by most critical first
        const lowStock = productsList
          .filter(p => {
            const current = p.stock?.current || 0
            const minimum = p.stock?.minimum || 5
            return current <= minimum
          })
          .sort((a, b) => {
            // Sort by: critical (at or below minimum) first, then by stock level
            const aCurrent = a.stock?.current || 0
            const aMinimum = a.stock?.minimum || 5
            const bCurrent = b.stock?.current || 0
            const bMinimum = b.stock?.minimum || 5
            
            const aIsCritical = aCurrent <= aMinimum
            const bIsCritical = bCurrent <= bMinimum
            
            if (aIsCritical && !bIsCritical) return -1
            if (!aIsCritical && bIsCritical) return 1
            return aCurrent - bCurrent // Lower stock first
          })
        setLowStockProducts(lowStock.slice(0, 10)) // Top 10 low stock items
      }

      if (usersData.success) {
        setUsers(usersData.data || [])
      }

      if (categoriesData.success) {
        setCategories(categoriesData.data || [])
      }

      if (brandsData.success) {
        setBrands(brandsData.data || [])
      }

      if (orderStatsData.success) {
        setStats({
          ...orderStatsData.data,
          userStats: userStatsData.success ? userStatsData.data : null
        })
      }

      setLastFetchTime(now)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      setError('Failed to load dashboard data. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  const processChartData = (orders, periodMonths = 6) => {
    // Calculate monthly revenue
    const monthlyMap = {}
    const startDate = new Date()
    if (periodMonths === 12) {
      startDate.setFullYear(startDate.getFullYear() - 1)
    } else {
      startDate.setMonth(startDate.getMonth() - periodMonths)
    }

    const filteredOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt)
      return orderDate >= startDate
    })

    filteredOrders.forEach(order => {
      const orderDate = new Date(order.createdAt)
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

    // Order status distribution
    const statusMap = {}
    filteredOrders.forEach(order => {
      const status = order.status || 'pending'
      if (!statusMap[status]) {
        statusMap[status] = { name: status.charAt(0).toUpperCase() + status.slice(1), value: 0, amount: 0 }
      }
      statusMap[status].value += 1
      statusMap[status].amount += order.pricing?.total || 0
    })
    setOrderStatusData(Object.values(statusMap))

    // Payment method distribution
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

    // Category revenue (from order items)
    const categoryMap = {}
    filteredOrders.forEach(order => {
      order.items?.forEach(item => {
        const category = item.category || 'Unknown'
        if (!categoryMap[category]) {
          categoryMap[category] = { name: category, value: 0, amount: 0 }
        }
        categoryMap[category].value += item.quantity || 0
        categoryMap[category].amount += item.totalPrice || 0
      })
    })
    // Sort by revenue and take top 5
    const topCategories = Object.values(categoryMap)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
    setCategoryRevenueData(topCategories)

    // Top products (from order items)
    const productMap = {}
    filteredOrders.forEach(order => {
      order.items?.forEach(item => {
        const productName = item.productName || 'Unknown'
        if (!productMap[productName]) {
          productMap[productName] = { name: productName, value: 0, amount: 0 }
        }
        productMap[productName].value += item.quantity || 0
        productMap[productName].amount += item.totalPrice || 0
      })
    })
    // Sort by quantity and take top 5
    const topProducts = Object.values(productMap)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
    setTopProductsData(topProducts)
  }

  // Calculate user role distribution
  useEffect(() => {
    if (users.length > 0) {
      const roleMap = {}
      users.forEach(user => {
        const role = user.role || 'unknown'
        if (!roleMap[role]) {
          roleMap[role] = { name: role.charAt(0).toUpperCase() + role.slice(1), value: 0 }
        }
        roleMap[role].value += 1
      })
      setUserRoleData(Object.values(roleMap))
    }
  }, [users])

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

  // Calculate metrics
  const totalRevenue = stats?.overview?.totalRevenue || 0
  const totalOrders = stats?.overview?.totalOrders || 0
  const averageOrderValue = stats?.overview?.averageOrderValue || 0
  const totalProducts = products.length
  const totalUsers = users.length
  const totalCategories = categories.length
  const totalBrands = brands.length
  const lowStockCount = lowStockProducts.length

  // Calculate this month's metrics
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  const thisMonthOrders = orders.filter(order => {
    const orderDate = new Date(order.createdAt)
    return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear
  })
  const thisMonthRevenue = thisMonthOrders.reduce((sum, order) => sum + (order.pricing?.total || 0), 0)

  if (loading && orders.length === 0) {
    return (
      <div className="owner-dashboard">
        <div className="loading-state">Loading dashboard data...</div>
      </div>
    )
  }

  return (
    <div className="owner-dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Owner Dashboard</h1>
        <p className="dashboard-subtitle">Complete business overview and analytics</p>
      </div>

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

      {/* Key Metrics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Total Revenue</span>
          </div>
          <div className="stat-card-value">{formatCurrency(totalRevenue)}</div>
          <div className="stat-card-change positive">
            This Month: {formatCurrency(thisMonthRevenue)}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Total Orders</span>
          </div>
          <div className="stat-card-value">{totalOrders}</div>
          <div className="stat-card-change">
            {thisMonthOrders.length} this month | Avg: {formatCurrency(averageOrderValue)}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Total Products</span>
          </div>
          <div className="stat-card-value">{totalProducts}</div>
          <div className="stat-card-change">
            {totalCategories} categories | {totalBrands} brands
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Total Users</span>
          </div>
          <div className="stat-card-value">{totalUsers}</div>
          <div className="stat-card-change">
            Active system users
          </div>
        </div>

        <div className="stat-card alert">
          <div className="stat-card-header">
            <span className="stat-card-title">Low Stock Items</span>
          </div>
          <div className="stat-card-value">{lowStockCount}</div>
          <div className="stat-card-change negative">
            Products need restocking
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Pending Orders</span>
          </div>
          <div className="stat-card-value">
            {orders.filter(o => o.status === 'pending').length}
          </div>
          <div className="stat-card-change">
            Require attention
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

        <PageSection title="Order Status Distribution">
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={orderStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {orderStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="chart-legend">
              {orderStatusData.map((item, index) => (
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

        <PageSection title="Payment Method Distribution">
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

        <PageSection title="User Role Distribution">
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={userRoleData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {userRoleData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="chart-legend">
              {userRoleData.map((item, index) => (
                <div key={index} className="legend-item">
                  <span 
                    className="legend-color" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></span>
                  <span>{item.name}: {item.value} users</span>
                </div>
              ))}
            </div>
          </div>
        </PageSection>

        <PageSection title="Top Categories by Revenue">
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryRevenueData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="amount" fill="#28a745" name="Revenue (BD)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </PageSection>

        <PageSection title="Top Products by Quantity">
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProductsData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#ffc107" name="Quantity Sold" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </PageSection>
      </div>

      {/* Quick Actions */}
      <PageSection title="Quick Actions">
        <div className="quick-actions">
          <PrimaryButton to="/dashboard/owner/products/new">
            Add New Product
          </PrimaryButton>
          <SecondaryButton to="/dashboard/owner/products">
            Manage Products
          </SecondaryButton>
          <SecondaryButton to="/dashboard/owner/users">
            Manage Users
          </SecondaryButton>
          <SecondaryButton to="/dashboard/owner/accounts">
            Manage Accounts
          </SecondaryButton>
          <SecondaryButton onClick={() => loadDashboardData(true)}>
            Refresh Data
          </SecondaryButton>
        </div>
      </PageSection>

      {/* Low Stock Alerts */}
      <PageSection title="Low Stock Alerts">
        {lowStockProducts.length === 0 ? (
          <EmptyState message="No low stock items. All products are well stocked!" />
        ) : (
          <div className="low-stock-table-container">
            <table className="low-stock-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>SKU</th>
                  <th>Current Stock</th>
                  <th>Minimum Stock</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {lowStockProducts.map(product => (
                  <tr key={product._id}>
                    <td>{product.name}</td>
                    <td>{product.sku}</td>
                    <td className={product.stock?.current <= product.stock?.minimum ? 'low-stock' : ''}>
                      {product.stock?.current || 0}
                    </td>
                    <td>{product.stock?.minimum || 5}</td>
                    <td>
                      <span className={`stock-status ${product.stock?.current <= product.stock?.minimum ? 'critical' : 'warning'}`}>
                        {product.stock?.current <= product.stock?.minimum ? 'Critical' : 'Low'}
                      </span>
                    </td>
                    <td>
                      <PrimaryButton 
                        to={`/dashboard/owner/products/${product._id}`}
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                      >
                        Update Stock
                      </PrimaryButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>

      {/* Recent Orders */}
      <PageSection title="Recent Orders">
        {orders.length === 0 ? (
          <EmptyState message="No recent orders found" />
        ) : (
          <div className="recent-orders-table-container">
            <table className="recent-orders-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 10).map(order => (
                  <tr key={order._id}>
                    <td>#{order.orderNumber || order._id}</td>
                    <td>{formatDate(order.createdAt)}</td>
                    <td>{order.customer?.companyName || 'N/A'}</td>
                    <td>
                      <span className={`status-badge status-${order.status || 'pending'}`}>
                        {order.status || 'pending'}
                      </span>
                    </td>
                    <td>{formatCurrency(order.pricing?.total)}</td>
                    <td>
                      <PrimaryButton 
                        onClick={() => navigate('/dashboard/orders')}
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                      >
                        View
                      </PrimaryButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>
    </div>
  )
}

export default OwnerDashboard
