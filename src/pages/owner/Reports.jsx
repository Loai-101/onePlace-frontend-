import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getApiUrl } from '../../utils/security'
import PageSection from '../../components/PageSection.jsx'
import PrimaryButton from '../../components/PrimaryButton.jsx'
import SecondaryButton from '../../components/SecondaryButton.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import Loading from '../../components/Loading.jsx'
import { usePopupFocus } from '../../hooks/usePopupFocus'
import './Reports.css'

function Reports() {
  const { token, user } = useAuth()
  const [reports, setReports] = useState([])
  const [filteredReports, setFilteredReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState('all')
  const [selectedDate, setSelectedDate] = useState('')
  const [showReportViewer, setShowReportViewer] = useState(false)
  const [selectedReport, setSelectedReport] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [showErrorPopup, setShowErrorPopup] = useState(false)
  
  // Auto-focus popups when they open
  usePopupFocus(showReportViewer, '.modal-content')
  usePopupFocus(showErrorPopup)

  useEffect(() => {
    if (token) {
      loadReports()
      loadUsers()
    }
  }, [token])

  useEffect(() => {
    filterReports()
  }, [reports, selectedUser, selectedDate])

  const loadReports = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${getApiUrl()}/api/reports`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      
      if (data.success) {
        setReports(data.data || [])
      } else {
        setErrorMessage(data.message || 'Error loading reports')
        setShowErrorPopup(true)
      }
    } catch (error) {
      console.error('Error loading reports:', error)
      setErrorMessage('Error loading reports: ' + (error.message || 'Unknown error'))
      setShowErrorPopup(true)
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      // Use company-specific endpoint to ensure only company users are loaded
      if (user?.company) {
        const companyId = typeof user.company === 'object' 
          ? user.company._id || user.company 
          : user.company
        
        const response = await fetch(`${getApiUrl()}/api/users/company/${companyId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        const data = await response.json()
        
        if (data.success) {
          // Filter only salesmen from the company
          const salesmen = (data.data || []).filter(user => user.role === 'salesman')
          setUsers(salesmen)
        }
      }
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const filterReports = () => {
    let filtered = [...reports]

    // Filter by user
    if (selectedUser && selectedUser !== 'all') {
      filtered = filtered.filter(report => {
        const reportUserId = report.salesman?._id || report.salesman
        return reportUserId === selectedUser || reportUserId?.toString() === selectedUser
      })
    }

    // Filter by date
    if (selectedDate) {
      const filterDate = new Date(selectedDate)
      filterDate.setHours(0, 0, 0, 0)
      const nextDay = new Date(filterDate)
      nextDay.setDate(nextDay.getDate() + 1)
      
      filtered = filtered.filter(report => {
        const reportDate = new Date(report.createdAt)
        reportDate.setHours(0, 0, 0, 0)
        return reportDate >= filterDate && reportDate < nextDay
      })
    }

    setFilteredReports(filtered)
  }

  const handleViewReport = (report) => {
    setSelectedReport(report)
    setShowReportViewer(true)
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

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="reports-page">
        <Loading message="Loading reports..." />
      </div>
    )
  }

  return (
    <div className="reports-page">
      <PageSection>
        {/* Filters Toolbar */}
        <div className="reports-toolbar">
          <div className="reports-toolbar-left">
            <div className="reports-filters">
          <div className="filter-group">
            <label htmlFor="user-filter">Filter by User:</label>
            <select
              id="user-filter"
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Salesmen</option>
              {users.map(user => (
                <option key={user._id} value={user._id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="date-filter">Filter by Date:</label>
            <input
              type="date"
              id="date-filter"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="filter-select"
            />
            {selectedDate && (
              <button
                type="button"
                onClick={() => setSelectedDate('')}
                className="clear-filter-btn"
              >
                Clear
              </button>
            )}
          </div>
            </div>
          </div>
        </div>

        {/* Reports Table */}
        {filteredReports.length === 0 ? (
          <EmptyState message="No reports found" />
        ) : (
          <div className="reports-table-container">
            <table className="reports-table">
              <thead>
                <tr>
                  <th>Salesman Name</th>
                  <th>Title</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map(report => (
                  <tr key={report._id}>
                    <td>{report.salesmanName || report.salesman?.name || 'N/A'}</td>
                    <td>{report.title}</td>
                    <td>{formatDate(report.createdAt)}</td>
                    <td>{formatTime(report.createdAt)}</td>
                    <td>
                      <span className={`report-type-badge ${report.reportType === 'pdf' ? 'type-pdf' : 'type-file'}`}>
                        {report.reportType === 'pdf' ? 'PDF' : 'File'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn-view-report"
                        onClick={() => handleViewReport(report)}
                      >
                        View Report
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>

      {/* Report Viewer Modal */}
      {showReportViewer && selectedReport && (
        <div className="modal-overlay" onClick={() => {
          setShowReportViewer(false)
          setSelectedReport(null)
        }}>
          <div className="modal-content report-viewer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Report Details</h2>
              <button className="modal-close" onClick={() => {
                setShowReportViewer(false)
                setSelectedReport(null)
              }}>×</button>
            </div>
            <div className="modal-body">
              <div className="report-info-section">
                <div className="report-info-item">
                  <strong>Salesman:</strong> {selectedReport.salesmanName || selectedReport.salesman?.name || 'N/A'}
                </div>
                <div className="report-info-item">
                  <strong>Title:</strong> {selectedReport.title}
                </div>
                <div className="report-info-item">
                  <strong>Date:</strong> {formatDate(selectedReport.createdAt)}
                </div>
                <div className="report-info-item">
                  <strong>Time:</strong> {formatTime(selectedReport.createdAt)}
                </div>
                <div className="report-info-item">
                  <strong>Type:</strong> {selectedReport.reportType === 'pdf' ? 'PDF' : 'File'}
                </div>
                {selectedReport.description && (
                  <div className="report-info-item">
                    <strong>Description:</strong>
                    <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: '#f5f5f5', borderRadius: '4px' }}>
                      {selectedReport.description}
                    </div>
                  </div>
                )}
              </div>

              <div className="report-viewer-section">
                {selectedReport.reportType === 'pdf' ? (
                  <iframe
                    src={selectedReport.pdfUrl}
                    style={{
                      width: '100%',
                      height: '600px',
                      border: '1px solid #ddd',
                      borderRadius: '4px'
                    }}
                    title="PDF Report"
                  />
                ) : (
                  <div className="file-download-section">
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
                      <p style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>
                        {selectedReport.fileName || 'Report File'}
                      </p>
                      <p style={{ marginBottom: '1.5rem', color: '#666' }}>
                        File size: {selectedReport.fileSize ? `${(selectedReport.fileSize / 1024).toFixed(2)} KB` : 'N/A'}
                      </p>
                      <a
                        href={selectedReport.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-download-report"
                      >
                        Download File
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <SecondaryButton onClick={() => {
                setShowReportViewer(false)
                setSelectedReport(null)
              }}>
                Close
              </SecondaryButton>
            </div>
          </div>
        </div>
      )}

      {/* Error Popup */}
      {showErrorPopup && (
        <div className="modal-overlay" onClick={() => setShowErrorPopup(false)}>
          <div className="error-popup" onClick={(e) => e.stopPropagation()}>
            <div className="error-icon">❌</div>
            <h3>Error</h3>
            <p>{errorMessage}</p>
            <PrimaryButton onClick={() => setShowErrorPopup(false)}>
              OK
            </PrimaryButton>
          </div>
        </div>
      )}
    </div>
  )
}

export default Reports

