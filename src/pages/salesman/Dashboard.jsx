import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import PageSection from '../../components/PageSection.jsx'
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

function SalesmanDashboard() {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dashboardData, setDashboardData] = useState(null)

  // Chart colors
  const COLORS = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6f42c1', '#e83e8c', '#20c997', '#fd7e14']

  useEffect(() => {
    if (token) {
      loadDashboardData()
    }
  }, [token])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`${getApiUrl()}/api/dashboard/salesman`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to load dashboard data')
      }

      const result = await response.json()
      if (result.success) {
        setDashboardData(result.data)
      } else {
        throw new Error(result.message || 'Failed to load dashboard data')
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err)
      setError(err.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'BHD',
      minimumFractionDigits: 2
    }).format(amount || 0)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return <Loading />
  }

  if (error) {
    return (
      <PageSection title="Dashboard">
        <div className="error-message">
          <p>{error}</p>
          <button onClick={loadDashboardData} className="btn-primary">
            Retry
          </button>
        </div>
      </PageSection>
    )
  }

  if (!dashboardData) {
    return (
      <PageSection title="Dashboard">
        <div className="empty-state">
          <p>No data available</p>
        </div>
      </PageSection>
    )
  }

  const { summary, charts, recentOrders } = dashboardData

  return (
    <div className="salesman-dashboard">
      <PageSection title="Dashboard">
        {/* Summary Cards */}
        <div className="dashboard-summary">
          <div className="summary-card">
            <div className="summary-label">Total Orders</div>
            <div className="summary-value">{summary.totalOrders}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Total Sales</div>
            <div className="summary-value">{formatCurrency(summary.totalSales)}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">This Month Orders</div>
            <div className="summary-value">{summary.thisMonthOrders}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">This Month Sales</div>
            <div className="summary-value">{formatCurrency(summary.thisMonthSales)}</div>
          </div>
          {summary.targetSales && (
            <div className="summary-card">
              <div className="summary-label">Target Sales</div>
              <div className="summary-value">{formatCurrency(summary.targetSales)}</div>
              {summary.completionPercentage !== null && (
                <div className="summary-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${Math.min(100, Math.max(0, summary.completionPercentage))}%` }}
                    ></div>
                  </div>
                  <span className="progress-text">
                    {summary.completionPercentage.toFixed(1)}% Complete
                  </span>
                </div>
              )}
            </div>
          )}
          {summary.forecast && !summary.targetSales && (
            <div className="summary-card">
              <div className="summary-label">Forecast (This Month)</div>
              <div className="summary-value">{formatCurrency(summary.forecast)}</div>
              {summary.completionPercentage !== null && (
                <div className="summary-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${Math.min(100, Math.max(0, summary.completionPercentage))}%` }}
                    ></div>
                  </div>
                  <span className="progress-text">
                    {summary.completionPercentage.toFixed(1)}% Complete
                  </span>
                </div>
              )}
            </div>
          )}
          <div className="summary-card">
            <div className="summary-label">Total Events</div>
            <div className="summary-value">{summary.totalEvents}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Upcoming Events</div>
            <div className="summary-value">{summary.upcomingEvents}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Total Reports</div>
            <div className="summary-value">{summary.totalReports}</div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="dashboard-charts">
          {/* Monthly Sales Chart */}
          <div className="chart-container">
            <h3>Monthly Sales (Last 6 Months)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={charts.monthlySales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#007bff" 
                  strokeWidth={2}
                  name="Sales"
                />
                <Line 
                  type="monotone" 
                  dataKey="orders" 
                  stroke="#28a745" 
                  strokeWidth={2}
                  name="Orders"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Order Status Breakdown */}
          <div className="chart-container">
            <h3>Order Status Breakdown</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={charts.statusBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, percent }) => `${status}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {charts.statusBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Top Products */}
          <div className="chart-container">
            <h3>Top Products Sold</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={charts.topProducts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip formatter={(value) => value} />
                <Legend />
                <Bar dataKey="quantity" fill="#007bff" name="Quantity" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="recent-orders">
          <h3>Recent Orders</h3>
          {recentOrders && recentOrders.length > 0 ? (
            <div className="orders-table">
              <table>
                <thead>
                  <tr>
                    <th>Order Number</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => {
                    const displayStatus = order.status ? order.status.replace(/_/g, ' ') : 'Pending'
                    return (
                      <tr key={order.id}>
                        <td>{order.orderNumber}</td>
                        <td>{order.customerName}</td>
                        <td>{formatCurrency(order.totalAmount)}</td>
                        <td>
                          <span 
                            className={`status-badge status-${(order.status || 'pending').toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-')}`}
                          >
                            {displayStatus}
                          </span>
                        </td>
                        <td>{formatDate(order.createdAt)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <p>No recent orders</p>
            </div>
          )}
        </div>
      </PageSection>
    </div>
  )
}

export default SalesmanDashboard

