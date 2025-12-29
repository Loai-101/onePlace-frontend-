import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../../utils/security';
import Loading from '../../components/Loading.jsx';
import './AdminDashboard.css';
import AdminManagement from './AdminManagement';
import CompanyUpdateRequests from './CompanyUpdateRequests';

function AdminDashboard() {
  const [adminData, setAdminData] = useState(null);
  const [stats, setStats] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAllDetails, setShowAllDetails] = useState(false);
  const [companyViewStates, setCompanyViewStates] = useState({});
  const [filters, setFilters] = useState({
    search: '',
    companyType: '',
    businessTarget: '',
    companySize: '',
    dateRange: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showCompanyProfile, setShowCompanyProfile] = useState(false);
  const [selectedCompanyProfile, setSelectedCompanyProfile] = useState(null);
  const [accountStatus, setAccountStatus] = useState('');
  const [companyStatus, setCompanyStatus] = useState('');
  const [numberOfUsers, setNumberOfUsers] = useState(0);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [companyToApprove, setCompanyToApprove] = useState(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
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
  const navigate = useNavigate();

  useEffect(() => {
    // Check if admin is logged in
    const token = localStorage.getItem('adminToken');
    const admin = localStorage.getItem('adminData');
    
    if (!token || !admin) {
      navigate('/admin/login');
      return;
    }

    setAdminData(JSON.parse(admin));
    loadDashboardData();
  }, [navigate]);

  // Load admins when admin management tab is active
  useEffect(() => {
    if (activeTab === 'admins') {
      loadAdmins();
    }
  }, [activeTab]);

  const loadDashboardData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      
      // Load dashboard stats
      const statsResponse = await fetch(`${getApiUrl()}/api/admin/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.data);
        // Store recent companies in companies state for synchronization
        if (statsData.data.recentCompanies) {
          setCompanies(statsData.data.recentCompanies);
        }
      }

      // Load pending companies
      const companiesResponse = await fetch(`${getApiUrl()}/api/admin/companies/pending`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (companiesResponse.ok) {
        const companiesData = await companiesResponse.json();
        setCompanies(companiesData.data);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (companyId) => {
    setCompanyToApprove(companyId);
    setShowApproveConfirm(true);
  };

  const confirmApprove = async () => {
    if (!companyToApprove) return;

    setIsApproving(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${getApiUrl()}/api/admin/companies/${companyToApprove}/approve`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update companies list immediately (optimistic update)
        setCompanies(prevCompanies => 
          prevCompanies.filter(company => company._id !== companyToApprove)
        );
        
        // Update stats if available
        if (stats) {
          setStats(prevStats => ({
            ...prevStats,
            statistics: {
              ...prevStats.statistics,
              pendingCompanies: Math.max(0, (prevStats.statistics.pendingCompanies || 0) - 1),
              approvedCompanies: (prevStats.statistics.approvedCompanies || 0) + 1
            }
          }));
        }
        
        setSuccessMessage('Company approved successfully! Email notification sent to company.');
        setShowSuccessPopup(true);
        setShowApproveConfirm(false);
        setCompanyToApprove(null);
        
        // Refresh data in background
        loadDashboardData();
      } else {
        const data = await response.json();
        alert(`Error: ${data.message || 'Failed to approve company'}`);
      }
    } catch (error) {
      console.error('Error approving company:', error);
      alert('Error approving company. Please try again.');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = (company) => {
    setSelectedCompany(company);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!selectedCompany) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${getApiUrl()}/api/admin/companies/${selectedCompany._id}/reject`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: rejectionReason })
      });

      if (response.ok) {
        setSuccessMessage('Company rejected successfully! Email notification sent to company.');
        setShowSuccessPopup(true);
        setShowRejectModal(false);
        setSelectedCompany(null);
        setRejectionReason('');
        loadDashboardData(); // Refresh data
      } else {
        const data = await response.json();
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error rejecting company:', error);
      alert('Error rejecting company');
    }
  };

  const cancelReject = () => {
    setShowRejectModal(false);
    setSelectedCompany(null);
    setRejectionReason('');
  };

  const handleCompanyProfileClick = async (company) => {
    setSelectedCompanyProfile(company);
    setAccountStatus(company.owner?.isActive ? 'active' : 'inactive');
    setCompanyStatus(company.status);
    setNumberOfUsers(company.numberOfUsers || 0);
    setShowCompanyProfile(true);
    
    // Load company users
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${getApiUrl()}/api/admin/companies/${company._id}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCompanyUsers(data.data || []);
      }
    } catch (error) {
      console.error('Error loading company users:', error);
      setCompanyUsers([]);
    }
  };

  const closeCompanyProfile = () => {
    setShowCompanyProfile(false);
    setSelectedCompanyProfile(null);
    setAccountStatus('');
    setCompanyStatus('');
    setNumberOfUsers(0);
    setCompanyUsers([]);
  };

  const handleStatusChange = async () => {
    if (!selectedCompanyProfile) return;

    setIsSavingStatus(true);
    try {
      const token = localStorage.getItem('adminToken');
      
      // Check if there are any changes
      const hasAccountStatusChange = accountStatus !== (selectedCompanyProfile.owner?.isActive ? 'active' : 'inactive');
      const hasCompanyStatusChange = companyStatus !== selectedCompanyProfile.status;
      const hasNumberOfUsersChange = numberOfUsers !== selectedCompanyProfile.numberOfUsers;
      
      if (!hasAccountStatusChange && !hasCompanyStatusChange && !hasNumberOfUsersChange) {
        alert('No changes to save');
        return;
      }

      // Use the new combined endpoint
      const response = await fetch(`${getApiUrl()}/api/admin/companies/${selectedCompanyProfile._id}/update-status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          companyStatus: hasCompanyStatusChange ? companyStatus : undefined,
          accountStatus: hasAccountStatusChange ? accountStatus : undefined,
          numberOfUsers: hasNumberOfUsersChange ? numberOfUsers : undefined
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Success - update local state immediately
        const message = data.message || 'Company status updated successfully!';
        setSuccessMessage(message);
        setShowSuccessPopup(true);
        
        // Update local companies state immediately
        setCompanies(prevCompanies => 
          prevCompanies.map(company => 
            company._id === selectedCompanyProfile._id 
              ? { 
                  ...company, 
                  status: data.data?.company?.status || companyStatus,
                  owner: { 
                    ...company.owner, 
                    isActive: data.data?.company?.ownerStatus === 'active' || accountStatus === 'active'
                  },
                  numberOfUsers: hasNumberOfUsersChange ? numberOfUsers : company.numberOfUsers
                }
              : company
          )
        );
        
        // Update selected company profile state
        setSelectedCompanyProfile(prev => ({
          ...prev,
          status: data.data?.company?.status || companyStatus,
          owner: {
            ...prev.owner,
            isActive: data.data?.company?.ownerStatus === 'active' || accountStatus === 'active'
          },
          numberOfUsers: hasNumberOfUsersChange ? numberOfUsers : prev.numberOfUsers
        }));
        
        // Update stats if it contains recent companies
        if (stats?.recentCompanies) {
          setStats(prevStats => ({
            ...prevStats,
            recentCompanies: prevStats.recentCompanies.map(company => 
              company._id === selectedCompanyProfile._id 
                ? { 
                    ...company, 
                    status: data.data?.company?.status || companyStatus,
                    owner: { 
                      ...company.owner, 
                      isActive: data.data?.company?.ownerStatus === 'active' || accountStatus === 'active'
                    } 
                  }
                : company
            )
          }));
        }
        
        // Close the modal after a short delay to show success message
        setTimeout(() => {
          setShowCompanyProfile(false);
          setSelectedCompanyProfile(null);
        }, 1500);
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.message || 'Failed to update company status'}`);
      }
    } catch (error) {
      console.error('Error updating company status:', error);
      alert('Error updating company status. Please try again.');
    } finally {
      setIsSavingStatus(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    navigate('/admin/login');
  };

  // Admin Management Functions
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
        setSuccessMessage('Admin created successfully!');
        setShowSuccessPopup(true);
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
        setSuccessMessage('Admin updated successfully!');
        setShowSuccessPopup(true);
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
        setSuccessMessage('Admin deleted successfully!');
        setShowSuccessPopup(true);
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

  const handleSuccessPopupClose = () => {
    setShowSuccessPopup(false);
    setSuccessMessage('');
  };

  const toggleCompanyView = (companyId) => {
    setCompanyViewStates(prev => ({
      ...prev,
      [companyId]: !prev[companyId]
    }));
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      companyType: '',
      businessTarget: '',
      companySize: '',
      dateRange: ''
    });
  };

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = !filters.search || 
      company.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      company.owner?.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      company.email.toLowerCase().includes(filters.search.toLowerCase());
    
    const matchesCompanyType = !filters.companyType || company.companyType === filters.companyType;
    const matchesBusinessTarget = !filters.businessTarget || company.businessTarget === filters.businessTarget;
    const matchesCompanySize = !filters.companySize || company.companySize === filters.companySize;
    
    let matchesDateRange = true;
    if (filters.dateRange) {
      const companyDate = new Date(company.createdAt);
      const now = new Date();
      const daysDiff = Math.floor((now - companyDate) / (1000 * 60 * 60 * 24));
      
      switch (filters.dateRange) {
        case 'today':
          matchesDateRange = daysDiff === 0;
          break;
        case 'week':
          matchesDateRange = daysDiff <= 7;
          break;
        case 'month':
          matchesDateRange = daysDiff <= 30;
          break;
        default:
          matchesDateRange = true;
      }
    }
    
    return matchesSearch && matchesCompanyType && matchesBusinessTarget && matchesCompanySize && matchesDateRange;
  });

  if (loading) {
    return (
      <div className="admin-dashboard">
        <Loading message="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div className="admin-header-content">
          <div className="admin-logo-section">
            <img 
              src="https://res.cloudinary.com/dvybb2xnc/image/upload/v1759838355/OP_Logo_ec0wjg.png" 
              alt="OnePlace Logo" 
              className="admin-logo"
            />
            <h1>Admin Panel</h1>
          </div>
          <div className="admin-user-info">
            <span>Welcome, {adminData?.username}</span>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
        </div>
      </div>

        <div className="admin-content">
            <div className="admin-navigation">
              <nav className="admin-nav">
                <button 
                  className={activeTab === 'dashboard' ? 'active' : ''}
                  onClick={() => setActiveTab('dashboard')}
                >
                  📊 Dashboard
                </button>
                <button 
                  className={activeTab === 'companies' ? 'active' : ''}
                  onClick={() => setActiveTab('companies')}
                >
                  🏢 Companies
                </button>
                <button 
                  className={activeTab === 'admins' ? 'active' : ''}
                  onClick={() => setActiveTab('admins')}
                >
                  👥 Admin Management
                </button>
                <button 
                  className={activeTab === 'update-requests' ? 'active' : ''}
                  onClick={() => setActiveTab('update-requests')}
                >
                  📝 Company Update Requests
                </button>
              </nav>
            </div>

          <div className="admin-main">
            {activeTab === 'dashboard' && (
              <div className="dashboard-content">
                <div className="content-header">
                  <h2>Dashboard Overview</h2>
                </div>
              
              {stats && (
                <div className="stats-grid">
                  <div className="stat-card">
                    <h3>Total Companies</h3>
                    <div className="stat-number">{stats.statistics.totalCompanies}</div>
                  </div>
                  <div className="stat-card pending">
                    <h3>Pending Approval</h3>
                    <div className="stat-number">{stats.statistics.pendingCompanies}</div>
                  </div>
                  <div className="stat-card approved">
                    <h3>Approved</h3>
                    <div className="stat-number">{stats.statistics.approvedCompanies}</div>
                  </div>
                  <div className="stat-card rejected">
                    <h3>Rejected</h3>
                    <div className="stat-number">{stats.statistics.rejectedCompanies}</div>
                  </div>
                </div>
              )}

              <div className="recent-companies">
                <h3>Recent Company Registrations</h3>
                {(stats?.recentCompanies?.length > 0 || companies.length > 0) ? (
                  <div className="recent-companies-grid">
                    {(stats?.recentCompanies || companies).map((company) => (
                      <div 
                        key={company._id} 
                        className="recent-company-card"
                        onClick={() => handleCompanyProfileClick(company)}
                      >
                        <div className="company-card-header">
                          <h4>{company.name}</h4>
                          <div className="card-status-badges">
                            <span className={`status-badge ${company.status}`}>
                              {company.status}
                            </span>
                            <span className={`account-status-badge ${company.owner?.isActive ? 'active' : 'inactive'}`}>
                              {company.owner?.isActive ? '🟢 Active' : '🔴 Inactive'}
                            </span>
                          </div>
                        </div>
                        <div className="company-card-body">
                          <div className="company-detail">
                            <strong>Owner:</strong> {company.owner?.name || 'N/A'}
                          </div>
                          <div className="company-detail">
                            <strong>Email:</strong> {company.owner?.email || 'N/A'}
                          </div>
                          <div className="company-detail">
                            <strong>Registration Date:</strong> {new Date(company.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="company-card-footer">
                          <span className="click-hint">Click to view profile</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No recent companies</p>
                )}
              </div>
            </div>
          )}

            {activeTab === 'companies' && (
              <div className="companies-content">
                <div className="content-header">
                  <h2>Pending Company Approvals</h2>
                  <div className="filter-controls">
                    <button 
                      className={`filter-toggle-btn ${showFilters ? 'active' : ''}`}
                      onClick={() => setShowFilters(!showFilters)}
                    >
                      🔍 Filters {showFilters ? '▼' : '▶'}
                    </button>
                    <div className="results-count">
                      {filteredCompanies.length} of {companies.length} companies
                    </div>
                  </div>
                </div>

                {showFilters && (
                  <div className="filter-panel">
                    <div className="filter-row">
                      <div className="filter-group">
                        <label>Search</label>
                        <input
                          type="text"
                          placeholder="Search by company name, owner, or email..."
                          value={filters.search}
                          onChange={(e) => handleFilterChange('search', e.target.value)}
                          className="filter-input"
                        />
                      </div>
                      <div className="filter-group">
                        <label>Company Type</label>
                        <select
                          value={filters.companyType}
                          onChange={(e) => handleFilterChange('companyType', e.target.value)}
                          className="filter-select"
                        >
                          <option value="">All Types</option>
                          <option value="llc">LLC</option>
                          <option value="corporation">Corporation</option>
                          <option value="partnership">Partnership</option>
                          <option value="sole-proprietorship">Sole Proprietorship</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="filter-row">
                      <div className="filter-group">
                        <label>Business Target</label>
                        <select
                          value={filters.businessTarget}
                          onChange={(e) => handleFilterChange('businessTarget', e.target.value)}
                          className="filter-select"
                        >
                          <option value="">All Targets</option>
                          <option value="medical-items">Medical Items</option>
                          <option value="pharmaceuticals">Pharmaceuticals</option>
                          <option value="healthcare">Healthcare</option>
                          <option value="technology">Technology</option>
                        </select>
                      </div>
                      <div className="filter-group">
                        <label>Company Size</label>
                        <select
                          value={filters.companySize}
                          onChange={(e) => handleFilterChange('companySize', e.target.value)}
                          className="filter-select"
                        >
                          <option value="">All Sizes</option>
                          <option value="small">Small (1-10 employees)</option>
                          <option value="medium">Medium (11-50 employees)</option>
                          <option value="large">Large (51+ employees)</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="filter-row">
                      <div className="filter-group">
                        <label>Registration Date</label>
                        <select
                          value={filters.dateRange}
                          onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                          className="filter-select"
                        >
                          <option value="">All Dates</option>
                          <option value="today">Today</option>
                          <option value="week">Last 7 days</option>
                          <option value="month">Last 30 days</option>
                        </select>
                      </div>
                      <div className="filter-actions">
                        <button 
                          className="clear-filters-btn"
                          onClick={clearFilters}
                        >
                          🗑️ Clear Filters
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              
              {filteredCompanies.length > 0 ? (
                <div className="companies-list">
                  {filteredCompanies.map((company) => (
                    <div key={company._id} className="company-card">
                      <div className="company-header">
                        <h3>{company.name}</h3>
                        <div className="company-header-right">
                          <span className="status-badge pending">Pending</span>
                          <div className="company-view-controls">
                            <button 
                              className={`view-toggle-btn ${!companyViewStates[company._id] ? 'active' : ''}`}
                              onClick={() => toggleCompanyView(company._id)}
                            >
                              📋 Summary View
                            </button>
                            <button 
                              className={`view-toggle-btn ${companyViewStates[company._id] ? 'active' : ''}`}
                              onClick={() => toggleCompanyView(company._id)}
                            >
                              📊 Detailed Table
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {companyViewStates[company._id] ? (
                        <div className="company-detailed-content">
                          <div className="info-section">
                            <h4>🏢 Company Information</h4>
                            <div className="info-grid">
                              <div className="info-item">
                                <strong>Company Name:</strong>
                                <span>{company.name}</span>
                              </div>
                              <div className="info-item">
                                <strong>Company Email:</strong>
                                <span>{company.email}</span>
                              </div>
                              <div className="info-item">
                                <strong>Company Phone:</strong>
                                <span>{company.phone}</span>
                              </div>
                              <div className="info-item">
                                <strong>Company Type:</strong>
                                <span>{company.companyType}</span>
                              </div>
                              <div className="info-item">
                                <strong>Business Target:</strong>
                                <span>{company.businessTarget}</span>
                              </div>
                              <div className="info-item">
                                <strong>Company Size:</strong>
                                <span>{company.companySize}</span>
                              </div>
                            </div>
                          </div>

                          <div className="info-section">
                            <h4>👤 Owner Information</h4>
                            <div className="info-grid">
                              <div className="info-item">
                                <strong>Owner Name:</strong>
                                <span>{company.owner?.name}</span>
                              </div>
                              <div className="info-item">
                                <strong>Owner Email:</strong>
                                <span>{company.owner?.email}</span>
                              </div>
                              <div className="info-item">
                                <strong>Owner Username:</strong>
                                <span>{company.owner?.username}</span>
                              </div>
                            </div>
                          </div>

                          <div className="info-section">
                            <h4>🏦 Banking Information</h4>
                            <div className="info-grid">
                              <div className="info-item">
                                <strong>IBAN Number:</strong>
                                <span className="iban-text">{company.ibanNumber}</span>
                              </div>
                              <div className="info-item">
                                <strong>Bank Name:</strong>
                                <span>{company.bankName}</span>
                              </div>
                              <div className="info-item">
                                <strong>VAT Number:</strong>
                                <span>{company.vatNumber}</span>
                              </div>
                              <div className="info-item">
                                <strong>CR Number:</strong>
                                <span>{company.crNumber}</span>
                              </div>
                            </div>
                          </div>

                          <div className="info-section">
                            <h4>📍 Address Information</h4>
                            <div className="info-grid">
                              <div className="info-item">
                                <strong>Street Address:</strong>
                                <span>{company.companyAddress}</span>
                              </div>
                              <div className="info-item">
                                <strong>City:</strong>
                                <span>{company.companyCity}</span>
                              </div>
                              <div className="info-item">
                                <strong>Country:</strong>
                                <span>{company.companyCountry}</span>
                              </div>
                              <div className="info-item">
                                <strong>Postal Code:</strong>
                                <span>{company.postalCode}</span>
                              </div>
                            </div>
                          </div>

                          <div className="info-section">
                            <h4>📊 Business Details</h4>
                            <div className="info-grid">
                              <div className="info-item">
                                <strong>Due Date:</strong>
                                <span>{company.dueDate}</span>
                              </div>
                              <div className="info-item">
                                <strong>Number of Users:</strong>
                                <span>{company.numberOfUsers}</span>
                              </div>
                              <div className="info-item">
                                <strong>Registration Date:</strong>
                                <span>{new Date(company.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="company-details">
                          <div className="detail-row">
                            <strong>Owner:</strong> {company.owner?.name}
                          </div>
                          <div className="detail-row">
                            <strong>Registration Date:</strong> {new Date(company.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      )}

                      <div className="company-actions">
                        <button 
                          className="approve-btn"
                          onClick={() => handleApprove(company._id)}
                        >
                          ✅ Approve
                        </button>
                        <button 
                          className="reject-btn"
                          onClick={() => handleReject(company)}
                        >
                          ❌ Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-companies">
                  <p>No pending companies to review</p>
                </div>
              )}
            </div>
          )}

            {activeTab === 'admins' && (
              <AdminManagement />
            )}

            {activeTab === 'update-requests' && (
              <CompanyUpdateRequests />
            )}
        </div>
      </div>

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>❌ Reject Company</h3>
              <button className="modal-close" onClick={cancelReject}>×</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to reject <strong>{selectedCompany?.name}</strong>?</p>
              <div className="form-group">
                <label htmlFor="rejectionReason">Rejection Reason (Optional)</label>
                <textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a reason for rejection..."
                  rows="4"
                  className="rejection-reason-input"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={cancelReject}>
                Cancel
              </button>
              <button className="confirm-reject-btn" onClick={confirmReject}>
                ❌ Reject Company
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {showApproveConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>✅ Approve Company</h3>
              <button className="modal-close" onClick={() => setShowApproveConfirm(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to approve this company?</p>
              <p>An email notification will be sent to the company.</p>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowApproveConfirm(false)}>
                Cancel
              </button>
              <button 
                className="confirm-approve-btn" 
                onClick={confirmApprove}
                disabled={isApproving}
              >
                {isApproving ? '⏳ Approving...' : '✅ Approve Company'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Company Profile Modal */}
      {showCompanyProfile && selectedCompanyProfile && (
        <div className="modal-overlay">
          <div className="modal-content company-profile-modal">
            <div className="modal-header">
              <h3>🏢 Company Profile</h3>
              <button className="modal-close" onClick={closeCompanyProfile}>×</button>
            </div>
            <div className="modal-body">
              <div className="company-profile-content">
                <div className="profile-section">
                  <h4>📋 Company Information</h4>
                  <div className="profile-grid">
                    <div className="profile-item">
                      <strong>Company Name:</strong>
                      <span>{selectedCompanyProfile.name}</span>
                    </div>
                    <div className="profile-item">
                      <strong>Company Email:</strong>
                      <span>{selectedCompanyProfile.email}</span>
                    </div>
                    <div className="profile-item">
                      <strong>Company Phone:</strong>
                      <span>{selectedCompanyProfile.phone}</span>
                    </div>
                    <div className="profile-item">
                      <strong>Company Type:</strong>
                      <span>{selectedCompanyProfile.companyType}</span>
                    </div>
                    <div className="profile-item">
                      <strong>Business Target:</strong>
                      <span>{selectedCompanyProfile.businessTarget}</span>
                    </div>
                    <div className="profile-item">
                      <strong>Company Size:</strong>
                      <span>{selectedCompanyProfile.companySize}</span>
                    </div>
                  </div>
                </div>

                <div className="profile-section">
                  <h4>👤 Owner Information</h4>
                  <div className="profile-grid">
                    <div className="profile-item">
                      <strong>Owner Name:</strong>
                      <span>{selectedCompanyProfile.owner?.name}</span>
                    </div>
                    <div className="profile-item">
                      <strong>Owner Email:</strong>
                      <span>{selectedCompanyProfile.owner?.email}</span>
                    </div>
                    <div className="profile-item">
                      <strong>Owner Username:</strong>
                      <span>{selectedCompanyProfile.owner?.username}</span>
                    </div>
                    <div className="profile-item">
                      <strong>Account Status:</strong>
                      <select
                        value={accountStatus}
                        onChange={(e) => setAccountStatus(e.target.value)}
                        className="account-status-select"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="profile-section">
                  <h4>🏦 Banking Information</h4>
                  <div className="profile-grid">
                    <div className="profile-item">
                      <strong>IBAN Number:</strong>
                      <span className="iban-text">{selectedCompanyProfile.ibanNumber}</span>
                    </div>
                    <div className="profile-item">
                      <strong>Bank Name:</strong>
                      <span>{selectedCompanyProfile.bankName}</span>
                    </div>
                    <div className="profile-item">
                      <strong>VAT Number:</strong>
                      <span>{selectedCompanyProfile.vatNumber}</span>
                    </div>
                    <div className="profile-item">
                      <strong>CR Number:</strong>
                      <span>{selectedCompanyProfile.crNumber}</span>
                    </div>
                  </div>
                </div>

                <div className="profile-section">
                  <h4>📍 Address Information</h4>
                  <div className="profile-grid">
                    <div className="profile-item">
                      <strong>Street Address:</strong>
                      <span>{selectedCompanyProfile.companyAddress}</span>
                    </div>
                    <div className="profile-item">
                      <strong>City:</strong>
                      <span>{selectedCompanyProfile.companyCity}</span>
                    </div>
                    <div className="profile-item">
                      <strong>Country:</strong>
                      <span>{selectedCompanyProfile.companyCountry}</span>
                    </div>
                    <div className="profile-item">
                      <strong>Postal Code:</strong>
                      <span>{selectedCompanyProfile.postalCode}</span>
                    </div>
                  </div>
                </div>

                <div className="profile-section">
                  <h4>📊 Business Details</h4>
                  <div className="profile-grid">
                    <div className="profile-item">
                      <strong>Due Date:</strong>
                      <span>{selectedCompanyProfile.dueDate}</span>
                    </div>
                    <div className="profile-item">
                      <strong>Number of Users:</strong>
                      <div className="number-input-group">
                        <button 
                          className="number-btn"
                          onClick={() => setNumberOfUsers(Math.max(1, numberOfUsers - 1))}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          value={numberOfUsers}
                          onChange={(e) => setNumberOfUsers(parseInt(e.target.value) || 0)}
                          min="1"
                          max="1000"
                          className="number-input"
                        />
                        <button 
                          className="number-btn"
                          onClick={() => setNumberOfUsers(numberOfUsers + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="profile-item">
                      <strong>Registration Date:</strong>
                      <span>{new Date(selectedCompanyProfile.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="profile-item">
                      <strong>Company Status:</strong>
                      <select
                        value={companyStatus}
                        onChange={(e) => setCompanyStatus(e.target.value)}
                        className="company-status-select"
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="hold">Hold</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Registered Users Section */}
                <div className="profile-section">
                  <h4>👥 Registered Users ({companyUsers.length} / {numberOfUsers})</h4>
                  {companyUsers.length > 0 ? (
                    <div className="users-list">
                      <table className="users-table-compact">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Phone</th>
                            <th>Role</th>
                            <th>Registration Date</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {companyUsers.map(user => (
                            <tr key={user._id}>
                              <td>{user.name}</td>
                              <td>{user.profile?.phone || 'N/A'}</td>
                              <td>
                                <span className={`role-badge-sm ${user.role}`}>
                                  {user.role}
                                </span>
                              </td>
                              <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                              <td>
                                <span className={`status-badge-sm ${user.isActive ? 'active' : 'inactive'}`}>
                                  {user.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="no-users-message">No users registered yet</p>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={closeCompanyProfile}>
                Close
              </button>
              <button 
                className="save-account-btn" 
                onClick={handleStatusChange}
                disabled={isSavingStatus}
              >
                {isSavingStatus ? '💾 Saving...' : '💾 Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="success-popup-overlay">
          <div className="success-popup">
            <div className="success-popup-content">
              <div className="success-icon">
                ✅
              </div>
              <div className="success-message">
                {successMessage}
              </div>
            </div>
            <button 
              className="success-popup-close"
              onClick={handleSuccessPopupClose}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
