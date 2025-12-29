import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApiUrl } from '../../utils/security'
import './CompanyUpdateRequests.css'

function CompanyUpdateRequests() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, pending, approved, rejected
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      navigate('/admin/login')
      return
    }
    loadRequests()
  }, [filter, navigate])

  const loadRequests = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('adminToken')
      const url = filter === 'all' 
        ? `${getApiUrl()}/api/admin/company-update-requests`
        : `${getApiUrl()}/api/admin/company-update-requests?status=${filter}`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      
      if (data.success) {
        setRequests(data.data || [])
      } else {
        setErrorMessage(data.message || 'Error loading update requests')
      }
    } catch (error) {
      console.error('Error loading requests:', error)
      setErrorMessage('Error loading update requests')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (requestId) => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`${getApiUrl()}/api/admin/company-update-requests/${requestId}/approve`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })

      const data = await response.json()
      
      if (data.success) {
        setSuccessMessage('Company update request approved successfully!')
        setTimeout(() => setSuccessMessage(''), 5000)
        loadRequests()
        setShowDetailsModal(false)
      } else {
        setErrorMessage(data.message || 'Error approving request')
      }
    } catch (error) {
      console.error('Error approving request:', error)
      setErrorMessage('Error approving request')
    }
  }

  const handleReject = async () => {
    if (!selectedRequest) return
    
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`${getApiUrl()}/api/admin/company-update-requests/${selectedRequest._id}/reject`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: rejectionReason || 'No reason provided'
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setSuccessMessage('Company update request rejected successfully!')
        setTimeout(() => setSuccessMessage(''), 5000)
        loadRequests()
        setShowRejectModal(false)
        setShowDetailsModal(false)
        setRejectionReason('')
      } else {
        setErrorMessage(data.message || 'Error rejecting request')
      }
    } catch (error) {
      console.error('Error rejecting request:', error)
      setErrorMessage('Error rejecting request')
    }
  }

  const openDetailsModal = async (request) => {
    try {
      // Fetch full request details to get changedFields
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`${getApiUrl()}/api/admin/company-update-requests/${request._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      
      if (data.success) {
        setSelectedRequest(data.data)
        setShowDetailsModal(true)
      } else {
        setErrorMessage(data.message || 'Error loading request details')
        // Fallback to using the request from list
        setSelectedRequest(request)
        setShowDetailsModal(true)
      }
    } catch (error) {
      console.error('Error loading request details:', error)
      // Fallback to using the request from list
      setSelectedRequest(request)
      setShowDetailsModal(true)
    }
  }

  const openRejectModal = (request) => {
    setSelectedRequest(request)
    setShowRejectModal(true)
  }

  const formatDate = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleString()
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: { className: 'status-pending', text: 'Pending' },
      approved: { className: 'status-approved', text: 'Approved' },
      rejected: { className: 'status-rejected', text: 'Rejected' }
    }
    return badges[status] || badges.pending
  }

  if (loading) {
    return (
      <div className="company-update-requests-page">
        <h1 className="page-title">Company Update Requests</h1>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Loading requests...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="company-update-requests-page">
      <h1 className="page-title">Company Update Requests</h1>

      {successMessage && (
        <div className="success-message">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="error-message">
          {errorMessage}
        </div>
      )}

      <div className="requests-toolbar">
        <div className="filter-buttons">
          <button
            className={filter === 'all' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={filter === 'pending' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilter('pending')}
          >
            Pending
          </button>
          <button
            className={filter === 'approved' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilter('approved')}
          >
            Approved
          </button>
          <button
            className={filter === 'rejected' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilter('rejected')}
          >
            Rejected
          </button>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="empty-state">
          <p>No update requests found</p>
        </div>
      ) : (
        <div className="requests-list">
          {requests.map((request) => {
            const statusBadge = getStatusBadge(request.status)
            return (
              <div key={request._id} className="request-card">
                <div className="request-header">
                  <div className="request-info">
                    <h3>{request.company?.name || 'Unknown Company'}</h3>
                    <p className="request-meta">
                      Requested by: {request.requestedBy?.name || 'Unknown'} ({request.requestedBy?.email || 'N/A'})
                    </p>
                    <p className="request-date">
                      Requested on: {formatDate(request.createdAt)}
                    </p>
                  </div>
                  <div className={`status-badge ${statusBadge.className}`}>
                    {statusBadge.text}
                  </div>
                </div>
                
                <div className="request-actions">
                  <button
                    className="btn-view"
                    onClick={() => openDetailsModal(request)}
                  >
                    View Details
                  </button>
                  {request.status === 'pending' && (
                    <>
                      <button
                        className="btn-approve"
                        onClick={() => handleApprove(request._id)}
                      >
                        Approve
                      </button>
                      <button
                        className="btn-reject"
                        onClick={() => openRejectModal(request)}
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedRequest && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Update Request Details</h2>
              <button className="modal-close" onClick={() => setShowDetailsModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-section">
                <h3>Company Information</h3>
                <p><strong>Company:</strong> {selectedRequest.company?.name || 'N/A'}</p>
                <p><strong>Email:</strong> {selectedRequest.company?.email || 'N/A'}</p>
                <p><strong>Phone:</strong> {selectedRequest.company?.phone || 'N/A'}</p>
              </div>

              <div className="detail-section">
                <h3>Request Information</h3>
                <p><strong>Requested by:</strong> {selectedRequest.requestedBy?.name || 'N/A'} ({selectedRequest.requestedBy?.email || 'N/A'})</p>
                <p><strong>Requested on:</strong> {formatDate(selectedRequest.createdAt)}</p>
                <p><strong>Status:</strong> <span className={`status-badge ${getStatusBadge(selectedRequest.status).className}`}>{getStatusBadge(selectedRequest.status).text}</span></p>
              </div>

              <div className="detail-section">
                <h3>Requested Changes</h3>
                {selectedRequest.changedFields && Object.keys(selectedRequest.changedFields).length > 0 ? (
                  <div className="changes-list">
                    {Object.entries(selectedRequest.changedFields).map(([key, value]) => {
                      // Format the field name for display
                      const fieldName = key
                        .replace(/([A-Z])/g, ' $1')
                        .replace(/^./, str => str.toUpperCase())
                        .trim();
                      
                      // Format the value for display
                      let displayValue = value;
                      if (key === 'logo' && value && value.url) {
                        displayValue = value.url;
                      } else if (typeof value === 'object' && value !== null) {
                        displayValue = JSON.stringify(value, null, 2);
                      } else {
                        displayValue = String(value);
                      }
                      
                      return (
                        <div key={key} className="change-item">
                          <strong>{fieldName}:</strong>
                          {key === 'logo' && value && value.url ? (
                            <div className="logo-change-preview">
                              <img src={value.url} alt="New logo" className="logo-preview-small" />
                              <span>{value.url}</span>
                            </div>
                          ) : (
                            <span className="change-value">{displayValue}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="no-changes">No changes detected</p>
                )}
              </div>

              {selectedRequest.status === 'approved' && selectedRequest.approvedBy && (
                <div className="detail-section">
                  <h3>Approval Information</h3>
                  <p><strong>Approved by:</strong> {selectedRequest.approvedBy?.name || 'N/A'}</p>
                  <p><strong>Approved on:</strong> {formatDate(selectedRequest.approvedAt)}</p>
                </div>
              )}

              {selectedRequest.status === 'rejected' && selectedRequest.rejectedBy && (
                <div className="detail-section">
                  <h3>Rejection Information</h3>
                  <p><strong>Rejected by:</strong> {selectedRequest.rejectedBy?.name || 'N/A'}</p>
                  <p><strong>Rejected on:</strong> {formatDate(selectedRequest.rejectedAt)}</p>
                  <p><strong>Reason:</strong> {selectedRequest.rejectionReason || 'No reason provided'}</p>
                </div>
              )}

              {selectedRequest.status === 'pending' && (
                <div className="modal-actions">
                  <button
                    className="btn-approve"
                    onClick={() => handleApprove(selectedRequest._id)}
                  >
                    Approve
                  </button>
                  <button
                    className="btn-reject"
                    onClick={() => {
                      setShowDetailsModal(false)
                      openRejectModal(selectedRequest)
                    }}
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Reject Update Request</h2>
              <button className="modal-close" onClick={() => setShowRejectModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to reject this update request for <strong>{selectedRequest.company?.name}</strong>?</p>
              <div className="form-group">
                <label htmlFor="rejectionReason">Rejection Reason *</label>
                <textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows="4"
                  placeholder="Enter reason for rejection"
                  required
                />
              </div>
              <div className="modal-actions">
                <button
                  className="btn-cancel"
                  onClick={() => {
                    setShowRejectModal(false)
                    setRejectionReason('')
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn-reject"
                  onClick={handleReject}
                  disabled={!rejectionReason.trim()}
                >
                  Reject Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CompanyUpdateRequests

