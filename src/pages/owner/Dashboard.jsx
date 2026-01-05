import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import PageSection from '../../components/PageSection.jsx'
import PrimaryButton from '../../components/PrimaryButton.jsx'
import SecondaryButton from '../../components/SecondaryButton.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import Loading from '../../components/Loading.jsx'
import { getApiUrl } from '../../utils/security'
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
  const [salesmanPerformanceData, setSalesmanPerformanceData] = useState([])

  // Main category filter
  const [selectedMainCategory, setSelectedMainCategory] = useState('all')
  
  // Recent Orders filters
  const [selectedSalesman, setSelectedSalesman] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedAccount, setSelectedAccount] = useState('')
  const [accounts, setAccounts] = useState([]) // Store accounts for filter dropdown
  const [dateFilterType, setDateFilterType] = useState('') // '', 'single', 'range'
  const [selectedDate, setSelectedDate] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filteredOrders, setFilteredOrders] = useState([])

  // Chart colors
  const COLORS = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6f42c1', '#e83e8c', '#20c997', '#fd7e14']

  useEffect(() => {
    if (token) {
      loadDashboardData()
      loadAccounts()
    }
  }, [token])

  // Reload data when main category filter changes
  useEffect(() => {
    if (token && orders.length > 0) {
      loadDashboardData(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMainCategory])

  // Update charts when time period filter changes
  useEffect(() => {
    if (orders.length > 0) {
      processChartData(orders, timePeriodFilter)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timePeriodFilter])

  // Filter orders based on salesman, status, date, and main category filters
  useEffect(() => {
    let filtered = [...orders]

    // Filter by main category first
    if (selectedMainCategory && selectedMainCategory !== 'all') {
      filtered = filtered.filter(order => {
        // Check if any item in the order has the selected main category
        return order.items?.some(item => {
          const itemMainCategory = item.mainCategory || item.product?.mainCategory
          return itemMainCategory === selectedMainCategory
        })
      })
    }

    // Filter by salesman
    if (selectedSalesman) {
      filtered = filtered.filter(order => {
        const orderSalesmanId = order.createdBy?._id || order.createdBy
        const orderSalesmanName = order.createdBy?.name || order.customer?.employee || 'N/A'
        
        if (selectedSalesman.startsWith('_id:')) {
          const userId = selectedSalesman.replace('_id:', '')
          return orderSalesmanId === userId || orderSalesmanId?.toString() === userId
        } else {
          return orderSalesmanName === selectedSalesman
        }
      })
    }

    // Filter by status
    if (selectedStatus) {
      filtered = filtered.filter(order => {
        const orderStatus = order.accountantReviewStatus || order.status || order.orderStatus || 'pending'
        // Normalize both statuses for comparison (handle underscores, spaces, case)
        // Replace underscores with spaces, convert to lowercase, and trim
        const normalizeStatus = (status) => status.toLowerCase().replace(/_/g, ' ').trim()
        return normalizeStatus(orderStatus) === normalizeStatus(selectedStatus)
      })
    }

    // Filter by account
    if (selectedAccount) {
      filtered = filtered.filter(order => {
        const accountName = order.customer?.companyName || order.customer?.accountName || ''
        return accountName === selectedAccount
      })
    }

    // Filter by date
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
    }

    setFilteredOrders(filtered)
  }, [orders, selectedMainCategory, selectedSalesman, selectedStatus, selectedAccount, dateFilterType, selectedDate, dateFrom, dateTo])

  // Get unique statuses from orders
  const uniqueStatuses = useMemo(() => {
    const statusSet = new Set()
    orders.forEach(order => {
      const status = order.accountantReviewStatus || order.status || order.orderStatus
      if (status) {
        statusSet.add(status)
      }
    })
    return Array.from(statusSet).sort()
  }, [orders])

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
      const apiUrl = getApiUrl()
      const [ordersRes, productsRes, usersRes, categoriesRes, brandsRes, orderStatsRes, userStatsRes, calendarRes] = await Promise.all([
        fetch(`${apiUrl}/api/orders?limit=200&sort=createdAt&order=desc`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }),
        fetch(`${apiUrl}/api/products?limit=500${selectedMainCategory && selectedMainCategory !== 'all' ? `&mainCategory=${selectedMainCategory}` : ''}`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }),
        fetch(`${apiUrl}/api/users?limit=100`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }),
        fetch(`${apiUrl}/api/categories${selectedMainCategory && selectedMainCategory !== 'all' ? `?mainCategory=${selectedMainCategory}` : ''}`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }),
        fetch(`${apiUrl}/api/brands${selectedMainCategory && selectedMainCategory !== 'all' ? `?mainCategory=${selectedMainCategory}` : ''}`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }),
        fetch(`${apiUrl}/api/orders/statistics`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }),
        fetch(`${apiUrl}/api/users/statistics`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }),
        fetch(`${apiUrl}/api/calendar?type=visit`, {
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
      const calendarData = await calendarRes.json()

      if (ordersData.success && ordersData.data) {
        // Ensure orders are sorted by date (most recent first) and are real data from database
        const ordersList = ordersData.data
          .filter(order => order && order._id) // Filter out invalid orders
          .sort((a, b) => {
            const dateA = new Date(a.createdAt || a.date || 0)
            const dateB = new Date(b.createdAt || b.date || 0)
            return dateB - dateA // Most recent first
          })
        
        console.log(`✅ Loaded ${ordersList.length} orders from database`)
        setOrders(ordersList)
        setFilteredOrders(ordersList) // Initialize filtered orders
        processChartData(ordersList, timePeriodFilter)
      } else {
        console.error('❌ Failed to load orders:', ordersData.message || 'Unknown error')
        setOrders([])
      }

      if (productsData.success) {
        let productsList = productsData.data || []
        
        // Additional client-side filtering by main category if needed
        if (selectedMainCategory && selectedMainCategory !== 'all') {
          productsList = productsList.filter(p => p.mainCategory === selectedMainCategory)
        }
        
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

      // Process salesman performance and visit completion data
      if (ordersData.success && usersData.success && calendarData.success) {
        processSalesmanPerformance(
          ordersData.data || [], 
          usersData.data || [], 
          calendarData.data || []
        )
      }

      setLastFetchTime(now)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      setError('Failed to load dashboard data. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  const loadAccounts = async () => {
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/accounts`, {
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

  const processChartData = (orders, periodMonths = 6) => {
    // Calculate monthly revenue
    const monthlyMap = {}
    const startDate = new Date()
    if (periodMonths === 12) {
      startDate.setFullYear(startDate.getFullYear() - 1)
    } else {
      startDate.setMonth(startDate.getMonth() - periodMonths)
    }

    let filteredOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt)
      return orderDate >= startDate
    })

    // Filter orders by main category if selected
    if (selectedMainCategory && selectedMainCategory !== 'all') {
      filteredOrders = filteredOrders.filter(order => {
        // Check if any item in the order has the selected main category
        return order.items?.some(item => {
          // Try to get main category from item or product
          const itemMainCategory = item.mainCategory || item.product?.mainCategory
          return itemMainCategory === selectedMainCategory
        })
      })
    }

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
      const status = order.accountantReviewStatus || order.status || order.orderStatus || 'pending' // Priority: accountantReviewStatus > status > orderStatus
      const displayStatus = status.replace(/_/g, ' ') // Replace underscores with spaces for display
      if (!statusMap[status]) {
        statusMap[status] = { name: displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1), value: 0, amount: 0 }
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
        // Only include items that match the selected main category
        if (selectedMainCategory && selectedMainCategory !== 'all') {
          const itemMainCategory = item.mainCategory || item.product?.mainCategory
          if (itemMainCategory !== selectedMainCategory) {
            return // Skip this item
          }
        }
        
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
        // Only include items that match the selected main category
        if (selectedMainCategory && selectedMainCategory !== 'all') {
          const itemMainCategory = item.mainCategory || item.product?.mainCategory
          if (itemMainCategory !== selectedMainCategory) {
            return // Skip this item
          }
        }
        
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

  // Process salesman performance data
  const processSalesmanPerformance = (orders, users, calendarEvents) => {
    // Get all salesmen
    const salesmen = users.filter(user => user.role === 'salesman')
    
    if (salesmen.length === 0) {
      setSalesmanPerformanceData([])
      return
    }

    // Calculate performance for each salesman
    const performanceData = salesmen.map(salesman => {
      const salesmanId = salesman._id?.toString() || salesman.id?.toString()
      
      // Calculate orders and revenue for this salesman
      let salesmanOrders = orders.filter(order => {
        const orderCreatorId = order.createdBy?._id?.toString() || 
                              order.createdBy?.toString() || 
                              order.createdBy
        return orderCreatorId === salesmanId
      })

      // Filter by main category if selected
      if (selectedMainCategory && selectedMainCategory !== 'all') {
        salesmanOrders = salesmanOrders.filter(order => {
          // Check if any item in the order has the selected main category
          return order.items?.some(item => {
            const itemMainCategory = item.mainCategory || item.product?.mainCategory
            return itemMainCategory === selectedMainCategory
          })
        })
      }
      
      // Calculate revenue only from items matching main category
      let totalOrders = 0
      let totalRevenue = 0
      
      if (selectedMainCategory && selectedMainCategory !== 'all') {
        // Count orders that have at least one item with the selected main category
        totalOrders = salesmanOrders.length
        
        // Calculate revenue only from items matching the main category
        salesmanOrders.forEach(order => {
          const matchingItems = order.items?.filter(item => {
            const itemMainCategory = item.mainCategory || item.product?.mainCategory
            return itemMainCategory === selectedMainCategory
          }) || []
          
          const matchingRevenue = matchingItems.reduce((sum, item) => {
            return sum + (item.totalPrice || 0)
          }, 0)
          
          totalRevenue += matchingRevenue
        })
      } else {
        totalOrders = salesmanOrders.length
        totalRevenue = salesmanOrders.reduce((sum, order) => {
          return sum + (order.pricing?.total || 0)
        }, 0)
      }
      
      // Calculate completed visits for this salesman
      const salesmanVisits = calendarEvents.filter(event => {
        const eventCreatorId = event.createdBy?._id?.toString() || 
                               event.createdBy?.toString() || 
                               event.createdBy
        return eventCreatorId === salesmanId && event.type === 'visit'
      })
      
      const completedVisits = salesmanVisits.filter(visit => 
        visit.status === 'completed'
      ).length
      
      const totalVisits = salesmanVisits.length
      
      return {
        name: salesman.name || 'Unknown',
        orders: totalOrders,
        revenue: totalRevenue,
        completedVisits: completedVisits,
        totalVisits: totalVisits,
        visitCompletionRate: totalVisits > 0 ? (completedVisits / totalVisits * 100).toFixed(1) : 0
      }
    })
    
    // Sort by revenue (descending)
    performanceData.sort((a, b) => b.revenue - a.revenue)
    
    setSalesmanPerformanceData(performanceData)
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

  // Calculate metrics - respect main category filter
  let totalRevenue = stats?.overview?.totalRevenue || 0
  let totalOrders = stats?.overview?.totalOrders || 0
  
  // If main category is selected, calculate from filtered orders
  if (selectedMainCategory && selectedMainCategory !== 'all') {
    // Count orders that have at least one item with the selected main category
    totalOrders = orders.filter(order => {
      return order.items?.some(item => {
        const itemMainCategory = item.mainCategory || item.product?.mainCategory
        return itemMainCategory === selectedMainCategory
      })
    }).length
    
    // Calculate revenue only from items matching the main category
    totalRevenue = 0
    orders.forEach(order => {
      const matchingItems = order.items?.filter(item => {
        const itemMainCategory = item.mainCategory || item.product?.mainCategory
        return itemMainCategory === selectedMainCategory
      }) || []
      
      const matchingRevenue = matchingItems.reduce((sum, item) => {
        return sum + (item.totalPrice || 0)
      }, 0)
      
      totalRevenue += matchingRevenue
    })
  }
  
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
  const totalProducts = products.length
  const totalUsers = users.length
  const totalCategories = categories.length
  const totalBrands = brands.length
  const lowStockCount = lowStockProducts.length

  // Calculate this month's metrics
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  let thisMonthOrders = orders.filter(order => {
    const orderDate = new Date(order.createdAt)
    return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear
  })
  
  // Filter by main category if selected
  if (selectedMainCategory && selectedMainCategory !== 'all') {
    thisMonthOrders = thisMonthOrders.filter(order => {
      return order.items?.some(item => {
        const itemMainCategory = item.mainCategory || item.product?.mainCategory
        return itemMainCategory === selectedMainCategory
      })
    })
  }
  
  // Calculate revenue only from matching items
  let thisMonthRevenue = 0
  if (selectedMainCategory && selectedMainCategory !== 'all') {
    thisMonthOrders.forEach(order => {
      const matchingItems = order.items?.filter(item => {
        const itemMainCategory = item.mainCategory || item.product?.mainCategory
        return itemMainCategory === selectedMainCategory
      }) || []
      
      const matchingRevenue = matchingItems.reduce((sum, item) => {
        return sum + (item.totalPrice || 0)
      }, 0)
      
      thisMonthRevenue += matchingRevenue
    })
  } else {
    thisMonthRevenue = thisMonthOrders.reduce((sum, order) => sum + (order.pricing?.total || 0), 0)
  }

  if (loading && orders.length === 0) {
    return (
      <div className="owner-dashboard">
        <Loading message="Loading dashboard data..." />
      </div>
    )
  }

  return (
    <div className="owner-dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Owner Dashboard</h1>
        <div className="main-category-filter" style={{ marginTop: '12px' }}>
          <label htmlFor="main-category-filter" style={{ 
            display: 'inline-block', 
            marginRight: '8px', 
            fontWeight: '600',
            fontSize: '14px',
            color: '#1a1a1a'
          }}>
            Main Category:
          </label>
          <select
            id="main-category-filter"
            value={selectedMainCategory}
            onChange={(e) => setSelectedMainCategory(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px',
              minWidth: '200px',
              background: 'white',
              color: '#1a1a1a'
            }}
          >
            <option value="all">All Categories</option>
            <option value="medical">Medical</option>
            <option value="it-solutions">IT Solutions</option>
            <option value="pharmacy">Pharmacy</option>
            <option value="salon">Salon</option>
            <option value="order-product">Order Product</option>
          </select>
        </div>
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

        <PageSection title="Salesman Performance & Completed Visits">
          <div className="chart-container">
            {salesmanPerformanceData.length === 0 ? (
              <EmptyState message="No salesman performance data available" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={salesmanPerformanceData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={100}
                      interval={0}
                    />
                    <YAxis yAxisId="left" orientation="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'revenue') return formatCurrency(value)
                        if (name === 'visitCompletionRate') return `${value}%`
                        return value
                      }}
                      labelFormatter={(label) => `Salesman: ${label}`}
                    />
                    <Legend />
                    <Bar 
                      yAxisId="left"
                      dataKey="orders" 
                      fill="#007bff" 
                      name="Total Orders"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      yAxisId="left"
                      dataKey="completedVisits" 
                      fill="#28a745" 
                      name="Completed Visits"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      yAxisId="right"
                      dataKey="revenue" 
                      fill="#ffc107" 
                      name="Revenue (BD)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
                <div className="chart-legend" style={{ marginTop: '20px' }}>
                  <h4 style={{ marginBottom: '10px', fontSize: '14px', fontWeight: '600' }}>Performance Summary:</h4>
                  {salesmanPerformanceData.map((salesman, index) => (
                    <div key={index} className="legend-item" style={{ marginBottom: '8px', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                      <strong>{salesman.name}:</strong> {salesman.orders} orders | {formatCurrency(salesman.revenue)} revenue | {salesman.completedVisits}/{salesman.totalVisits} visits completed ({salesman.visitCompletionRate}%)
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </PageSection>
      </div>

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
          <>
            {/* Filters */}
            <div className="recent-orders-filters" style={{ 
              display: 'flex', 
              gap: '12px', 
              marginBottom: '20px', 
              flexWrap: 'wrap',
              alignItems: 'flex-end'
            }}>
              <div className="form-group" style={{ minWidth: '200px' }}>
                <label htmlFor="salesman-filter" style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600',
                  fontSize: '14px',
                  color: '#1a1a1a'
                }}>
                  Filter by Salesman
                </label>
                <select
                  id="salesman-filter"
                  value={selectedSalesman}
                  onChange={(e) => setSelectedSalesman(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    background: 'white',
                    color: '#1a1a1a'
                  }}
                >
                  <option value="">All Salesmen</option>
                  {users
                    .filter(user => user.role === 'salesman' && user.name)
                    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                    .map(user => (
                      <option key={user._id} value={`_id:${user._id}`}>
                        {user.name} {user.email ? `(${user.email})` : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-group" style={{ minWidth: '200px' }}>
                <label htmlFor="status-filter" style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600',
                  fontSize: '14px',
                  color: '#1a1a1a'
                }}>
                  Filter by Status
                </label>
                <select
                  id="status-filter"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    background: 'white',
                    color: '#1a1a1a'
                  }}
                >
                  <option value="">All Statuses</option>
                  {uniqueStatuses.map(status => (
                    <option key={status} value={status}>
                      {status.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ minWidth: '200px' }}>
                <label htmlFor="account-filter" style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600',
                  fontSize: '14px',
                  color: '#1a1a1a'
                }}>
                  Filter by Account
                </label>
                <select
                  id="account-filter"
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    background: 'white',
                    color: '#1a1a1a'
                  }}
                >
                  <option value="">All Accounts</option>
                  {accounts
                    .filter(account => account.name)
                    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                    .map(account => (
                      <option key={account._id} value={account.name}>
                        {account.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-group" style={{ minWidth: '200px' }}>
                <label htmlFor="date-filter-type" style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600',
                  fontSize: '14px',
                  color: '#1a1a1a'
                }}>
                  Filter by Date
                </label>
                <select
                  id="date-filter-type"
                  value={dateFilterType}
                  onChange={(e) => {
                    setDateFilterType(e.target.value)
                    setSelectedDate('')
                    setDateFrom('')
                    setDateTo('')
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    background: 'white',
                    color: '#1a1a1a'
                  }}
                >
                  <option value="">No Date Filter</option>
                  <option value="single">Single Day</option>
                  <option value="range">Date Range</option>
                </select>
              </div>

              {dateFilterType === 'single' && (
                <div className="form-group" style={{ minWidth: '180px' }}>
                  <label htmlFor="selected-date" style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '600',
                    fontSize: '14px',
                    color: '#1a1a1a'
                  }}>
                    Select Date
                  </label>
                  <input
                    type="date"
                    id="selected-date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              )}

              {dateFilterType === 'range' && (
                <>
                  <div className="form-group" style={{ minWidth: '180px' }}>
                    <label htmlFor="date-from" style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: '600',
                      fontSize: '14px',
                      color: '#1a1a1a'
                    }}>
                      From Date
                    </label>
                    <input
                      type="date"
                      id="date-from"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                  <div className="form-group" style={{ minWidth: '180px' }}>
                    <label htmlFor="date-to" style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: '600',
                      fontSize: '14px',
                      color: '#1a1a1a'
                    }}>
                      To Date
                    </label>
                    <input
                      type="date"
                      id="date-to"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="recent-orders-table-container">
              <table className="recent-orders-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Date</th>
                    <th>Account</th>
                    <th>Salesman</th>
                    <th>Payment Method</th>
                    <th>Status</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#666', fontSize: '14px' }}>
                        No orders found matching the selected filters
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map(order => {
                  // Ensure we have valid order data
                  if (!order || !order._id) return null
                  
                  const orderId = order.orderNumber || order._id?.toString().substring(0, 8) || 'N/A'
                  const orderDate = order.createdAt || order.date || null
                  const accountName = order.customer?.companyName || order.customer?.accountName || 'N/A'
                  const salesmanName = order.createdBy?.name || order.customer?.employee || 'N/A'
                  const paymentMethod = order.payment?.method || 'credit'
                  const methodMap = {
                    'cash': 'Cash',
                    'visa': 'Visa',
                    'benefit': 'BenefitPay',
                    'floos': 'Flooss',
                    'credit': 'Credit'
                  }
                  const paymentMethodDisplay = methodMap[paymentMethod] || paymentMethod.toUpperCase()
                  const orderStatus = order.accountantReviewStatus || order.status || order.orderStatus || 'pending'
                  const orderTotal = order.pricing?.total || order.total || 0
                  
                  return (
                    <tr key={order._id}>
                      <td>#{orderId}</td>
                      <td>{formatDate(orderDate)}</td>
                      <td>{accountName}</td>
                      <td>{salesmanName}</td>
                      <td>
                        <span className="payment-method-badge">
                          {paymentMethodDisplay}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge status-${orderStatus.toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-')}`}>
                          {orderStatus.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>{formatCurrency(orderTotal)}</td>
                    </tr>
                  )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </PageSection>
    </div>
  )
}

export default OwnerDashboard
