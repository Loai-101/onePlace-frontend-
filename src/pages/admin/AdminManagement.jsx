import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../utils/security';
import './AdminManagement.css';

function AdminManagement({ onClose }) {
  const [admins, setAdmins] = useState([]);
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [showEditAdminModal, setShowEditAdminModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [newAdminData, setNewAdminData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'admin',
    permissions: {
      manageCompanies: false,
      manageUsers: false,
      viewReports: false,
      systemSettings: false
    }
  });

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${getApiUrl()}/api/admin/admins`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAdmins(data.data);
      }
    } catch (error) {
      console.error('Error loading admins:', error);
    }
  };

  const handleCreateAdmin = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${getApiUrl()}/api/admin/admins`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newAdminData)
      });

      if (response.ok) {
        alert('Admin created successfully!');
        setShowCreateAdminModal(false);
        setNewAdminData({
          username: '',
          email: '',
          password: '',
          role: 'admin',
          permissions: {
            manageCompanies: false,
            manageUsers: false,
            viewReports: false,
            systemSettings: false
          }
        });
        loadAdmins();
      } else {
        const data = await response.json();
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error creating admin:', error);
      alert('Error creating admin');
    }
  };

  const handleUpdateAdmin = async () => {
    if (!selectedAdmin) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${getApiUrl()}/api/admin/admins/${selectedAdmin._id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role: selectedAdmin.role,
          permissions: selectedAdmin.permissions,
          isActive: selectedAdmin.isActive
        })
      });

      if (response.ok) {
        alert('Admin updated successfully!');
        setShowEditAdminModal(false);
        setSelectedAdmin(null);
        loadAdmins();
      } else {
        const data = await response.json();
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error updating admin:', error);
      alert('Error updating admin');
    }
  };

  const handleDeleteAdmin = async (adminId) => {
    if (!confirm('Are you sure you want to delete this admin?')) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${getApiUrl()}/api/admin/admins/${adminId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert('Admin deleted successfully!');
        loadAdmins();
      } else {
        const data = await response.json();
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error deleting admin:', error);
      alert('Error deleting admin');
    }
  };

  const openEditAdminModal = (admin) => {
    setSelectedAdmin({ ...admin });
    setShowEditAdminModal(true);
  };

  const closeEditAdminModal = () => {
    setShowEditAdminModal(false);
    setSelectedAdmin(null);
  };

  return (
    <div className="admin-management">
      <div className="content-header">
        <h2>👥 Admin Management</h2>
        <button 
          className="create-admin-btn"
          onClick={() => setShowCreateAdminModal(true)}
        >
          ➕ Create New Admin
        </button>
      </div>

      <div className="admins-list">
        {admins.length > 0 ? (
          <div className="admins-grid">
            {admins.map((admin) => (
              <div key={admin._id} className="admin-card">
                <div className="admin-card-header">
                  <h3>{admin.username}</h3>
                  <div className="admin-status-badges">
                    <span className={`role-badge ${admin.role}`}>
                      {admin.role}
                    </span>
                    <span className={`status-badge ${admin.isActive ? 'active' : 'inactive'}`}>
                      {admin.isActive ? '🟢 Active' : '🔴 Inactive'}
                    </span>
                  </div>
                </div>
                <div className="admin-card-body">
                  <div className="admin-detail">
                    <strong>Email:</strong> {admin.email}
                  </div>
                  <div className="admin-detail">
                    <strong>Role:</strong> {admin.role}
                  </div>
                  <div className="admin-detail">
                    <strong>Created:</strong> {new Date(admin.createdAt).toLocaleDateString()}
                  </div>
                  <div className="admin-permissions">
                    <strong>Permissions:</strong>
                    <div className="permissions-list">
                      {Object.entries(admin.permissions).map(([key, value]) => (
                        <span key={key} className={`permission-badge ${value ? 'enabled' : 'disabled'}`}>
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="admin-card-actions">
                  <button 
                    className="edit-admin-btn"
                    onClick={() => openEditAdminModal(admin)}
                  >
                    ✏️ Edit
                  </button>
                  <button 
                    className="delete-admin-btn"
                    onClick={() => handleDeleteAdmin(admin._id)}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-admins">
            <p>No admins found</p>
          </div>
        )}
      </div>

      {/* Create Admin Modal */}
      {showCreateAdminModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Create New Admin</h3>
              <button className="modal-close" onClick={() => setShowCreateAdminModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={newAdminData.username}
                  onChange={(e) => setNewAdminData({...newAdminData, username: e.target.value})}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={newAdminData.email}
                  onChange={(e) => setNewAdminData({...newAdminData, email: e.target.value})}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={newAdminData.password}
                  onChange={(e) => setNewAdminData({...newAdminData, password: e.target.value})}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select
                  value={newAdminData.role}
                  onChange={(e) => setNewAdminData({...newAdminData, role: e.target.value})}
                  className="form-select"
                >
                  <option value="admin">Admin</option>
                  <option value="super-admin">Super Admin</option>
                  <option value="moderator">Moderator</option>
                </select>
              </div>
              <div className="form-group">
                <label>Permissions</label>
                <div className="permissions-grid">
                  {Object.keys(newAdminData.permissions).map((permission) => (
                    <label key={permission} className="permission-checkbox">
                      <input
                        type="checkbox"
                        checked={newAdminData.permissions[permission]}
                        onChange={(e) => setNewAdminData({
                          ...newAdminData,
                          permissions: {
                            ...newAdminData.permissions,
                            [permission]: e.target.checked
                          }
                        })}
                      />
                      {permission.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowCreateAdminModal(false)}>
                Cancel
              </button>
              <button className="create-btn" onClick={handleCreateAdmin}>
                Create Admin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Admin Modal */}
      {showEditAdminModal && selectedAdmin && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Edit Admin</h3>
              <button className="modal-close" onClick={closeEditAdminModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={selectedAdmin.username}
                  disabled
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={selectedAdmin.email}
                  disabled
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select
                  value={selectedAdmin.role}
                  onChange={(e) => setSelectedAdmin({...selectedAdmin, role: e.target.value})}
                  className="form-select"
                >
                  <option value="admin">Admin</option>
                  <option value="super-admin">Super Admin</option>
                  <option value="moderator">Moderator</option>
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={selectedAdmin.isActive ? 'active' : 'inactive'}
                  onChange={(e) => setSelectedAdmin({...selectedAdmin, isActive: e.target.value === 'active'})}
                  className="form-select"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="form-group">
                <label>Permissions</label>
                <div className="permissions-grid">
                  {Object.keys(selectedAdmin.permissions).map((permission) => (
                    <label key={permission} className="permission-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedAdmin.permissions[permission]}
                        onChange={(e) => setSelectedAdmin({
                          ...selectedAdmin,
                          permissions: {
                            ...selectedAdmin.permissions,
                            [permission]: e.target.checked
                          }
                        })}
                      />
                      {permission.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={closeEditAdminModal}>
                Cancel
              </button>
              <button className="save-btn" onClick={handleUpdateAdmin}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminManagement;
