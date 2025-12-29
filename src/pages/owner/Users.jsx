import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getApiUrl } from '../../utils/security'
import PageSection from '../../components/PageSection.jsx'
import PrimaryButton from '../../components/PrimaryButton.jsx'
import SecondaryButton from '../../components/SecondaryButton.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import Loading from '../../components/Loading.jsx'
import './Users.css'

function Users() {
  const { token, user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [maxUsers, setMaxUsers] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showConfirmPopup, setShowConfirmPopup] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [confirmMessage, setConfirmMessage] = useState('')
  const [confirmAction, setConfirmAction] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    role: 'salesman',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: '',
    avatar: '',
    position: '',
    department: ''
  })

  useEffect(() => {
    if (token) {
      loadUsers()
    }
  }, [token])

  useEffect(() => {
    filterUsers()
  }, [users, searchTerm, roleFilter])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${getApiUrl()}/api/user-management`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      
      if (data.success) {
        setUsers(data.data)
        setMaxUsers(data.maxUsers)
        setFilteredUsers(data.data)
      }
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterUsers = () => {
    let filtered = [...users] // Create a copy of the array

    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (roleFilter) {
      filtered = filtered.filter(user => user.role === roleFilter)
    }

    // Sort users: admin/owner first, then by creation date
    filtered.sort((a, b) => {
      // Admin and owner roles come first
      const aIsAdmin = a.role === 'admin' || a.role === 'owner'
      const bIsAdmin = b.role === 'admin' || b.role === 'owner'
      
      if (aIsAdmin && !bIsAdmin) {
        return -1 // a comes first
      }
      if (!aIsAdmin && bIsAdmin) {
        return 1 // b comes first
      }
      // If both are admin/owner or both are not, sort by creation date (oldest first for admins)
      return new Date(a.createdAt) - new Date(b.createdAt)
    })

    setFilteredUsers(filtered)
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    
    try {
      const response = await fetch(`${getApiUrl()}/api/user-management`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()
      
      if (data.success) {
        setShowCreateModal(false)
        resetForm()
        loadUsers()
        setSuccessMessage(data.message)
        setShowSuccessPopup(true)
      } else {
        setSuccessMessage(data.message)
        setShowSuccessPopup(true)
      }
    } catch (error) {
      console.error('Error creating user:', error)
      setSuccessMessage('Error creating user')
      setShowSuccessPopup(true)
    }
  }

  const handleUpdateUser = async (e) => {
    e.preventDefault()
    
    try {
      const response = await fetch(`${getApiUrl()}/api/user-management/${selectedUser._id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          role: formData.role,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          postalCode: formData.postalCode,
          country: formData.country,
          avatar: formData.avatar,
          position: formData.position,
          department: formData.department
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setShowEditModal(false)
        resetForm()
        loadUsers()
        setSuccessMessage(data.message)
        setShowSuccessPopup(true)
      } else {
        setSuccessMessage(data.message)
        setShowSuccessPopup(true)
      }
    } catch (error) {
      console.error('Error updating user:', error)
      setSuccessMessage('Error updating user')
      setShowSuccessPopup(true)
    }
  }

  const handleToggleStatus = (userId) => {
    // Prevent owner from deactivating themselves
    if (currentUser && (userId === currentUser.id || userId === currentUser._id)) {
      setSuccessMessage('You cannot deactivate your own account!')
      setShowSuccessPopup(true)
      return
    }

    setConfirmMessage('Are you sure you want to change this user\'s status?')
    setConfirmAction(() => async () => {
      try {
        const response = await fetch(`${getApiUrl()}/api/user-management/${userId}/toggle-status`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        const data = await response.json()
        
        if (data.success) {
          loadUsers()
          setSuccessMessage(data.message)
          setShowSuccessPopup(true)
        } else {
          setSuccessMessage(data.message)
          setShowSuccessPopup(true)
        }
      } catch (error) {
        console.error('Error toggling user status:', error)
        setSuccessMessage('Error updating user status')
        setShowSuccessPopup(true)
      }
    })
    setShowConfirmPopup(true)
  }

  const handleResetPassword = (userId) => {
    setSelectedUser({ _id: userId })
    setNewPassword('')
    setShowPasswordModal(true)
  }

  const confirmResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setSuccessMessage('Password must be at least 6 characters long')
      setShowSuccessPopup(true)
      return
    }

    try {
      const response = await fetch(`${getApiUrl()}/api/user-management/${selectedUser._id}/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newPassword })
      })

      const data = await response.json()
      
      setShowPasswordModal(false)
      setNewPassword('')
      setSuccessMessage(data.message)
      setShowSuccessPopup(true)
    } catch (error) {
      console.error('Error resetting password:', error)
      setSuccessMessage('Error resetting password')
      setShowSuccessPopup(true)
    }
  }

  const handleDeleteUser = (userId) => {
    // Prevent owner from deleting themselves
    if (currentUser && (userId === currentUser.id || userId === currentUser._id)) {
      setSuccessMessage('You cannot delete your own account!')
      setShowSuccessPopup(true)
      return
    }

    setConfirmMessage('Are you sure you want to delete this user? This action cannot be undone.')
    setConfirmAction(() => async () => {
      try {
        const response = await fetch(`${getApiUrl()}/api/user-management/${userId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        const data = await response.json()
        
        if (data.success) {
          loadUsers()
          setSuccessMessage(data.message)
          setShowSuccessPopup(true)
        } else {
          setSuccessMessage(data.message)
          setShowSuccessPopup(true)
        }
      } catch (error) {
        console.error('Error deleting user:', error)
        setSuccessMessage('Error deleting user')
        setShowSuccessPopup(true)
      }
    })
    setShowConfirmPopup(true)
  }

  const handleViewProfile = async (userId) => {
    try {
      const response = await fetch(`${getApiUrl()}/api/user-management/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      
      if (data.success) {
        setSelectedUser(data.data)
        setShowProfileModal(true)
      }
    } catch (error) {
      console.error('Error loading user details:', error)
    }
  }

  const openCreateModal = () => {
    resetForm()
    setShowCreateModal(true)
  }

  const openEditModal = (user) => {
    setSelectedUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      username: user.username,
      password: '',
      role: user.role,
      phone: user.profile?.phone || '',
      address: user.profile?.address || '',
      city: user.profile?.city || '',
      postalCode: user.profile?.postalCode || '',
      country: user.profile?.country || '',
      avatar: user.profile?.avatar || '',
      position: user.profile?.position || '',
      department: user.profile?.department || ''
    })
    setShowEditModal(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      username: '',
      password: '',
      role: 'salesman',
      phone: '',
      address: '',
      city: '',
      postalCode: '',
      country: '',
      avatar: '',
      position: '',
      department: ''
    })
    setSelectedUser(null)
  }

  const getRoleColor = (role) => {
    switch (role) {
      case 'owner': return 'role-owner'
      case 'admin': return 'role-admin'
      case 'accountant': return 'role-accountant'
      case 'salesman': return 'role-salesman'
      default: return 'role-default'
    }
  }

  if (!token) {
    return (
      <div className="users-page">
        <div className="page-header">
          <h1 className="page-title">User Management</h1>
        </div>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Please login to access User Management.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="users-page">
        <div className="page-header">
          <h1 className="page-title">User Management</h1>
        </div>
        <Loading message="Loading users..." />
      </div>
    )
  }

  return (
    <div className="users-page">
      <div className="page-header">
      <h1 className="page-title">User Management</h1>
        <div className="user-count-badge">
          {users.length} / {maxUsers} Users
        </div>
      </div>
      
      <PageSection title="Users">
        <div className="users-toolbar">
          <div>
            <PrimaryButton 
              onClick={openCreateModal}
              disabled={users.length >= maxUsers}
            >
              + New User
            </PrimaryButton>
            {users.length >= maxUsers && (
              <span className="limit-warning">User limit reached</span>
            )}
          </div>
          <div className="filters">
            <select 
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Roles</option>
              <option value="accountant">Accountant</option>
              <option value="salesman">Salesman</option>
            </select>
            <input 
              type="text" 
              placeholder="Search users..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
        
        {filteredUsers.length > 0 ? (
          <div className="users-table-container">
            <table className="users-table">
            <thead>
              <tr>
                  <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
                {filteredUsers.map(user => (
                  <tr key={user._id}>
                    <td>
                      <div className="user-info">
                        <div className="user-avatar">
                          {user.profile?.avatar ? (
                            <img src={user.profile.avatar} alt={user.name} />
                          ) : (
                            <div className="avatar-placeholder">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="user-details">
                          <div className="user-name">{user.name}</div>
                          <div className="user-username">@{user.username}</div>
                        </div>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`role-badge ${getRoleColor(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${user.isActive ? 'status-active' : 'status-inactive'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-text" onClick={() => handleViewProfile(user._id)} title="View Profile">
                          View
                        </button>
                        <button 
                          className="btn-text" 
                          onClick={() => openEditModal(user)} 
                          title="Edit"
                        >
                          Edit
                        </button>
                        <button 
                          className={`btn-text ${(currentUser?.id === user._id || currentUser?._id === user._id) ? 'btn-disabled' : ''}`}
                          onClick={() => handleToggleStatus(user._id)}
                          title={(currentUser?.id === user._id || currentUser?._id === user._id) ? 'Cannot deactivate yourself' : (user.isActive ? 'Deactivate' : 'Activate')}
                          disabled={(currentUser?.id === user._id || currentUser?._id === user._id)}
                        >
                          {user.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button className="btn-text" onClick={() => handleResetPassword(user._id)} title="Reset Password">
                          Reset Password
                        </button>
                        <button 
                          className={`btn-text btn-delete ${(currentUser?.id === user._id || currentUser?._id === user._id) ? 'btn-disabled' : ''}`}
                          onClick={() => handleDeleteUser(user._id)} 
                          title={(currentUser?.id === user._id || currentUser?._id === user._id) ? 'Cannot delete yourself' : 'Delete'}
                          disabled={(currentUser?.id === user._id || currentUser?._id === user._id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          </div>
        ) : (
          <EmptyState message="No users found. Create your first user to get started." />
        )}
      </PageSection>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New User</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateUser} className="user-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Username</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required
                    minLength={6}
                  />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    required
                  >
                    <option value="salesman">Salesman</option>
                    <option value="accountant">Accountant</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Position</label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({...formData, position: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                  />
                </div>
              </div>

              {/* Address Section */}
              <div className="form-section-header">
                <h3>Address Information</h3>
              </div>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Street Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="Street address"
                  />
                </div>
                <div className="form-group">
                  <label>City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    placeholder="City"
                  />
                </div>
                <div className="form-group">
                  <label>Postal Code</label>
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({...formData, postalCode: e.target.value})}
                    placeholder="Postal code"
                  />
                </div>
                <div className="form-group full-width">
                  <label>Country</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({...formData, country: e.target.value})}
                    placeholder="Country"
                  />
                </div>
              </div>

              {/* Additional Information */}
              <div className="form-section-header">
                <h3>Additional Information</h3>
              </div>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Avatar URL (Optional)</label>
                  <input
                    type="url"
                    value={formData.avatar}
                    onChange={(e) => setFormData({...formData, avatar: e.target.value})}
                    placeholder="https://example.com/avatar.jpg (Optional - leave empty to use initials)"
                  />
                </div>
              </div>
              <div className="modal-actions">
                <SecondaryButton type="button" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </SecondaryButton>
                <PrimaryButton type="submit">
                  Create User
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit User</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <form onSubmit={handleUpdateUser} className="user-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    required
                  >
                    <option value="salesman">Salesman</option>
                    <option value="accountant">Accountant</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Position</label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({...formData, position: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                  />
                </div>
              </div>

              {/* Address Section */}
              <div className="form-section-header">
                <h3>Address Information</h3>
              </div>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Street Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="Street address"
                  />
                </div>
                <div className="form-group">
                  <label>City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    placeholder="City"
                  />
                </div>
                <div className="form-group">
                  <label>Postal Code</label>
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({...formData, postalCode: e.target.value})}
                    placeholder="Postal code"
                  />
                </div>
                <div className="form-group full-width">
                  <label>Country</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({...formData, country: e.target.value})}
                    placeholder="Country"
                  />
                </div>
              </div>

              {/* Additional Information */}
              <div className="form-section-header">
                <h3>Additional Information</h3>
              </div>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Avatar URL (Optional)</label>
                  <input
                    type="url"
                    value={formData.avatar}
                    onChange={(e) => setFormData({...formData, avatar: e.target.value})}
                    placeholder="https://example.com/avatar.jpg (Optional - leave empty to use initials)"
                  />
                </div>
              </div>
              <div className="modal-actions">
                <SecondaryButton type="button" onClick={() => setShowEditModal(false)}>
                  Cancel
                </SecondaryButton>
                <PrimaryButton type="submit">
                  Update User
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      {showProfileModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="modal-content profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>User Profile</h2>
              <button className="modal-close" onClick={() => setShowProfileModal(false)}>×</button>
            </div>
            <div className="profile-content">
              <div className="profile-avatar-large">
                {selectedUser.profile?.avatar ? (
                  <img src={selectedUser.profile.avatar} alt={selectedUser.name} />
                ) : (
                  <div className="avatar-placeholder-large">
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="profile-info">
                <h3>{selectedUser.name}</h3>
                <p className="profile-email">{selectedUser.email}</p>
                <p className="profile-username">@{selectedUser.username}</p>
                <div className="profile-badges">
                  <span className={`role-badge ${getRoleColor(selectedUser.role)}`}>
                    {selectedUser.role}
                  </span>
                  <span className={`status-badge ${selectedUser.isActive ? 'status-active' : 'status-inactive'}`}>
                    {selectedUser.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div className="profile-details">
                <div className="detail-row">
                  <strong>Position:</strong> {selectedUser.profile?.position || 'N/A'}
                </div>
                <div className="detail-row">
                  <strong>Department:</strong> {selectedUser.profile?.department || 'N/A'}
                </div>
                <div className="detail-row">
                  <strong>Phone:</strong> {selectedUser.profile?.phone || 'N/A'}
                </div>
                <div className="detail-row">
                  <strong>Address:</strong> {selectedUser.profile?.address || 'N/A'}
                </div>
                <div className="detail-row">
                  <strong>City:</strong> {selectedUser.profile?.city || 'N/A'}
                </div>
                <div className="detail-row">
                  <strong>Postal Code:</strong> {selectedUser.profile?.postalCode || 'N/A'}
                </div>
                <div className="detail-row">
                  <strong>Country:</strong> {selectedUser.profile?.country || 'N/A'}
                </div>
                <div className="detail-row">
                  <strong>Last Login:</strong> {selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleString() : 'Never'}
                </div>
                <div className="detail-row">
                  <strong>Created:</strong> {new Date(selectedUser.createdAt).toLocaleDateString()}
                </div>
              </div>
              
              {selectedUser.role === 'salesman' && selectedUser.salesmanInfo && (
                <div className="salesman-stats">
                  <h4>Sales Performance</h4>
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-value">{selectedUser.salesmanInfo.totalOrders || 0}</div>
                      <div className="stat-label">Total Orders</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">{selectedUser.salesmanInfo.completedOrders || 0}</div>
                      <div className="stat-label">Completed</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">BD {(selectedUser.salesmanInfo.actualSales || 0).toFixed(2)}</div>
                      <div className="stat-label">Actual Sales</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">BD {(selectedUser.salesmanInfo.targetSales || 0).toFixed(2)}</div>
                      <div className="stat-label">Target Sales</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="modal-overlay" onClick={() => setShowSuccessPopup(false)}>
          <div className="success-popup" onClick={(e) => e.stopPropagation()}>
            <div className="success-icon">✓</div>
            <h3>Success!</h3>
            <p>{successMessage}</p>
            <PrimaryButton onClick={() => setShowSuccessPopup(false)}>
              OK
            </PrimaryButton>
          </div>
        </div>
      )}

      {/* Confirm Popup */}
      {showConfirmPopup && (
        <div className="modal-overlay" onClick={() => setShowConfirmPopup(false)}>
          <div className="confirm-popup" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">?</div>
            <h3>Confirm Action</h3>
            <p>{confirmMessage}</p>
            <div className="confirm-actions">
              <SecondaryButton onClick={() => setShowConfirmPopup(false)}>
                Cancel
              </SecondaryButton>
              <PrimaryButton onClick={() => {
                setShowConfirmPopup(false)
                if (confirmAction) confirmAction()
              }}>
                Confirm
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="password-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Reset Password</h2>
              <button className="modal-close" onClick={() => setShowPasswordModal(false)}>×</button>
            </div>
            <div className="password-form">
              <div className="form-group">
                <label>New Password (min 6 characters)</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  minLength={6}
                  autoFocus
                />
              </div>
              <div className="modal-actions">
                <SecondaryButton type="button" onClick={() => setShowPasswordModal(false)}>
                  Cancel
                </SecondaryButton>
                <PrimaryButton type="button" onClick={confirmResetPassword}>
                  Reset Password
                </PrimaryButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Users
