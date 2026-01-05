import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import PageSection from '../../components/PageSection.jsx'
import PrimaryButton from '../../components/PrimaryButton.jsx'
import SecondaryButton from '../../components/SecondaryButton.jsx'
import Loading from '../../components/Loading.jsx'
import { getApiUrl } from '../../utils/security'
import './Marketing.css'

function Marketing() {
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState(null)
  const [staffList, setStaffList] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredStaff, setFilteredStaff] = useState([])
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (token) {
      loadMarketingData()
    }
  }, [token])

  useEffect(() => {
    filterStaff()
  }, [staffList, searchTerm])

  const loadMarketingData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${getApiUrl()}/api/marketing/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      
      if (data.success) {
        setDashboardData(data.data)
        setStaffList(data.data.staffList || [])
      }
    } catch (error) {
      console.error('Error loading marketing data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterStaff = () => {
    if (!searchTerm) {
      setFilteredStaff(staffList)
      return
    }

    const filtered = staffList.filter(staff =>
      staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.area.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredStaff(filtered)
  }

  const handleDownloadExcel = async () => {
    try {
      setDownloading(true)
      const response = await fetch(`${getApiUrl()}/api/marketing/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to download data')
      }

      // Get the blob from response
      const blob = await response.blob()
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `marketing-data-${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading Excel:', error)
      alert('Failed to download Excel file. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="marketing-page">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Loading message="Loading marketing data..." />
        </div>
      </div>
    )
  }

  return (
    <div className="marketing-page">
      <div className="page-header">
        <h1 className="page-title">Marketing Dashboard</h1>
        <div className="marketing-count-badge">
          {filteredStaff.length} Staff{filteredStaff.length !== staffList.length ? ` of ${staffList.length}` : ''}
        </div>
      </div>

      {/* Dashboard Stats */}
      {dashboardData && (
        <PageSection title="Overview">
          <div className="marketing-stats-grid">
            <div className="marketing-stat-card">
              <div className="marketing-stat-card-header">
                <span className="marketing-stat-card-title">Total Accounts</span>
              </div>
              <div className="marketing-stat-card-value">{dashboardData.totalAccounts || 0}</div>
              <div className="marketing-stat-card-change">
                Active accounts
              </div>
            </div>

            <div className="marketing-stat-card">
              <div className="marketing-stat-card-header">
                <span className="marketing-stat-card-title">Total Staff</span>
              </div>
              <div className="marketing-stat-card-value">{dashboardData.totalStaff || 0}</div>
              <div className="marketing-stat-card-change">
                Staff members
              </div>
            </div>

            <div className="marketing-stat-card">
              <div className="marketing-stat-card-header">
                <span className="marketing-stat-card-title">Account Names</span>
              </div>
              <div className="marketing-stat-card-value">{dashboardData.accountTypeBreakdown?.length || 0}</div>
              <div className="marketing-stat-card-change">
                Different account names
              </div>
            </div>
          </div>

          {/* Account Breakdown */}
          {dashboardData.accountTypeBreakdown && dashboardData.accountTypeBreakdown.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1a1a1a', marginBottom: '16px' }}>Account Breakdown</h3>
              <div className="account-type-table-container">
                <table className="account-type-table">
                  <thead>
                    <tr>
                      <th>Account Name</th>
                      <th>Accounts</th>
                      <th>Staff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.accountTypeBreakdown.map((item, index) => (
                      <tr key={index}>
                        <td>{item.type}</td>
                        <td>{item.accountCount}</td>
                        <td>{item.staffCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </PageSection>
      )}

      {/* Staff Table */}
      <PageSection title="Staff Directory">
        <div className="marketing-toolbar">
          <div className="marketing-toolbar-left">
            <SecondaryButton onClick={handleDownloadExcel} disabled={downloading}>
              {downloading ? 'Downloading...' : 'Download Excel'}
            </SecondaryButton>
          </div>
          <div className="filters">
            <input
              type="text"
              placeholder="Search by name, phone, email, company, or area..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {filteredStaff.length > 0 ? (
          <div className="staff-table-container">
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Staff Name</th>
                  <th>Phone Number</th>
                  <th>Email</th>
                  <th>Company</th>
                  <th>Area</th>
                  <th>Medical Branch</th>
                  <th>Specializations</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((staff, index) => (
                  <tr key={index}>
                    <td>{staff.name}</td>
                    <td>{staff.phone}</td>
                    <td>{staff.email}</td>
                    <td>{staff.company}</td>
                    <td>{staff.area}</td>
                    <td>{staff.medicalBranch}</td>
                    <td>{staff.specializations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p>No staff members found.</p>
          </div>
        )}
      </PageSection>
    </div>
  )
}

export default Marketing

