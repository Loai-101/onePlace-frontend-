import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getApiUrl } from '../../utils/security'
import PageSection from '../../components/PageSection.jsx'
import PrimaryButton from '../../components/PrimaryButton.jsx'
import SecondaryButton from '../../components/SecondaryButton.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import Loading from '../../components/Loading.jsx'
import { usePopupFocus } from '../../hooks/usePopupFocus'
import './Users.css'

function Users() {
  const { token, user: currentUser, refreshUser } = useAuth()
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
  const [showErrorPopup, setShowErrorPopup] = useState(false)
  const [showConfirmPopup, setShowConfirmPopup] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [selectedActivityUser, setSelectedActivityUser] = useState(null)
  const [userActivity, setUserActivity] = useState([])
  const [activityDateFilter, setActivityDateFilter] = useState('')
  const [loadingActivity, setLoadingActivity] = useState(false)
  const [salesPerformance, setSalesPerformance] = useState({
    totalOrders: 0,
    completedOrders: 0,
    actualSales: 0,
    targetSales: 0,
    targetSource: 'none' // 'target', 'forecast', or 'none'
  })
  const [loadingSalesPerformance, setLoadingSalesPerformance] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [confirmMessage, setConfirmMessage] = useState('')
  const [confirmAction, setConfirmAction] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [uploading, setUploading] = useState(false)
  
  // Auto-focus popups when they open
  usePopupFocus(showCreateModal, '.modal-content')
  usePopupFocus(showEditModal, '.modal-content')
  usePopupFocus(showProfileModal, '.modal-content')
  usePopupFocus(showPasswordModal, '.password-modal')
  usePopupFocus(showActivityModal, '.modal-content')
  usePopupFocus(showSuccessPopup)
  usePopupFocus(showErrorPopup)
  usePopupFocus(showConfirmPopup)
  
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
    department: '',
    targetType: '', // 'target' or 'forecast'
    targetValue: '',
    targetPeriod: '' // '3months', '6months', '1year'
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
      let avatarUrl = formData.avatar
      
      // Upload avatar image if a file was selected
      if (avatarFile) {
        avatarUrl = await uploadAvatarToSupabase(avatarFile)
      }
      
      // Prepare salesman info if role is salesman and target/forecast is provided
      let salesmanInfo = undefined
      if (formData.role === 'salesman' && formData.targetType && formData.targetValue && formData.targetPeriod) {
        const targetValueNum = parseFloat(formData.targetValue)
        if (!isNaN(targetValueNum) && targetValueNum > 0) {
          if (formData.targetType === 'target') {
            // Set target sales
            salesmanInfo = {
              targetSales: targetValueNum
            }
          } else if (formData.targetType === 'forecast') {
            // Create forecast entries based on period
            const forecast = []
            const now = new Date()
            const currentYear = now.getFullYear()
            const currentMonth = now.getMonth() + 1 // 1-12
            
            let monthsToAdd = 0
            if (formData.targetPeriod === '3months') monthsToAdd = 3
            else if (formData.targetPeriod === '6months') monthsToAdd = 6
            else if (formData.targetPeriod === '1year') monthsToAdd = 12
            
            // Calculate monthly target (divide total by number of months)
            const monthlyTarget = targetValueNum / monthsToAdd
            
            for (let i = 0; i < monthsToAdd; i++) {
              let month = currentMonth + i
              let year = currentYear
              
              if (month > 12) {
                month = month - 12
                year = year + 1
              }
              
              const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                                 'July', 'August', 'September', 'October', 'November', 'December']
              
              forecast.push({
                month: monthNames[month - 1],
                year: year,
                targetAmount: monthlyTarget
              })
            }
            
            salesmanInfo = {
              forecast: forecast
            }
          }
        }
      }

      const response = await fetch(`${getApiUrl()}/api/user-management`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          username: formData.username,
          password: formData.password,
          role: formData.role,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          postalCode: formData.postalCode,
          country: formData.country,
          avatar: avatarUrl || undefined,
          position: formData.position,
          department: formData.department,
          salesmanInfo: salesmanInfo
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setShowCreateModal(false)
        resetForm()
        loadUsers()
        setSuccessMessage(data.message)
        setShowSuccessPopup(true)
      } else {
        setErrorMessage(data.message || 'Error creating user')
        setShowErrorPopup(true)
      }
    } catch (error) {
      console.error('Error creating user:', error)
      setErrorMessage('Error creating user: ' + (error.message || 'Unknown error'))
      setShowErrorPopup(true)
    }
  }

  const handleUpdateUser = async (e) => {
    e.preventDefault()
    
    try {
      let avatarUrl = formData.avatar
      
      // Upload avatar image if a new file was selected
      if (avatarFile) {
        avatarUrl = await uploadAvatarToSupabase(avatarFile)
      }
      
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
          avatar: avatarUrl || undefined, // Send undefined if empty to make it truly optional
          position: formData.position,
          department: formData.department
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setShowEditModal(false)
        resetForm()
        loadUsers()
        
        // If the updated user is the current logged-in user, refresh their data
        if (selectedUser._id === currentUser?.id || selectedUser._id === currentUser?._id) {
          await refreshUser()
        }
        
        setSuccessMessage(data.message)
        setShowSuccessPopup(true)
      } else {
        setErrorMessage(data.message || 'Error updating user')
        setShowErrorPopup(true)
      }
    } catch (error) {
      console.error('Error updating user:', error)
      setErrorMessage('Error updating user: ' + (error.message || 'Unknown error'))
      setShowErrorPopup(true)
    }
  }

  const handleToggleStatus = (userId) => {
    // Prevent owner from deactivating themselves
    if (currentUser && (userId === currentUser.id || userId === currentUser._id)) {
      setErrorMessage('You cannot deactivate your own account!')
      setShowErrorPopup(true)
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
          setErrorMessage(data.message || 'Error updating user status')
          setShowErrorPopup(true)
        }
      } catch (error) {
        console.error('Error toggling user status:', error)
        setErrorMessage('Error updating user status: ' + (error.message || 'Unknown error'))
        setShowErrorPopup(true)
      }
    })
    setShowConfirmPopup(true)
  }

  const handleResetPassword = async (userId) => {
    try {
      // Fetch user details to show in modal
      const response = await fetch(`${getApiUrl()}/api/user-management/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()
      if (data.success) {
        setSelectedUser(data.data)
      } else {
        setSelectedUser({ _id: userId })
      }
    } catch (error) {
      console.error('Error fetching user:', error)
      setSelectedUser({ _id: userId })
    }
    setNewPassword('')
    setShowPasswordModal(true)
  }

  const confirmResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long')
      setShowErrorPopup(true)
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
      if (data.success) {
        setSuccessMessage(data.message)
        setShowSuccessPopup(true)
      } else {
        setErrorMessage(data.message || 'Error resetting password')
        setShowErrorPopup(true)
      }
    } catch (error) {
      console.error('Error resetting password:', error)
      setErrorMessage('Error resetting password: ' + (error.message || 'Unknown error'))
      setShowErrorPopup(true)
    }
  }

  const handleDeleteUser = (userId) => {
    // Prevent owner from deleting themselves
    if (currentUser && (userId === currentUser.id || userId === currentUser._id)) {
      setErrorMessage('You cannot delete your own account!')
      setShowErrorPopup(true)
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
          setErrorMessage(data.message || 'Error deleting user')
          setShowErrorPopup(true)
        }
      } catch (error) {
        console.error('Error deleting user:', error)
        setErrorMessage('Error deleting user: ' + (error.message || 'Unknown error'))
        setShowErrorPopup(true)
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
        const userData = data.data
        setSelectedUser(userData)
        setShowProfileModal(true)
        
        // If user is a salesman, load their sales performance
        if (userData.role === 'salesman') {
          // Set initial target sales from user data
          const salesmanInfo = userData.salesmanInfo
          let initialTargetSales = 0
          let initialTargetSource = 'none'
          
          if (salesmanInfo?.forecast && salesmanInfo.forecast.length > 0) {
            const now = new Date()
            const currentMonth = now.toLocaleString('en-US', { month: 'long' })
            const currentYear = now.getFullYear()
            
            const currentForecast = salesmanInfo.forecast.find(f => 
              f.month === currentMonth && f.year === currentYear
            )
            
            if (currentForecast) {
              initialTargetSales = currentForecast.targetAmount || 0
              initialTargetSource = 'forecast'
            } else {
              initialTargetSales = salesmanInfo.forecast[0]?.targetAmount || 0
              initialTargetSource = 'forecast'
            }
          } else if (salesmanInfo?.targetSales > 0) {
            initialTargetSales = salesmanInfo.targetSales
            initialTargetSource = 'target'
          }
          
          setSalesPerformance({
            totalOrders: 0,
            completedOrders: 0,
            actualSales: 0,
            targetSales: initialTargetSales,
            targetSource: initialTargetSource
          })
          await loadSalesPerformance(userId, userData)
        }
      } else {
        setErrorMessage(data.message || 'Error loading user profile')
        setShowErrorPopup(true)
      }
    } catch (error) {
      console.error('Error loading user details:', error)
      setErrorMessage('Error loading user profile: ' + (error.message || 'Unknown error'))
      setShowErrorPopup(true)
    }
  }

  const loadSalesPerformance = async (userId, userData = null) => {
    try {
      setLoadingSalesPerformance(true)
      
      // Fetch all orders created by this salesman
      const response = await fetch(`${getApiUrl()}/api/orders?limit=1000`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      
      if (data.success) {
        // Filter orders by createdBy (salesman)
        const salesmanOrders = (data.data || []).filter(order => {
          const orderSalesmanId = order.createdBy?._id || order.createdBy
          return orderSalesmanId === userId || orderSalesmanId?.toString() === userId
        })

        // Calculate statistics
        const totalOrders = salesmanOrders.length
        const completedOrders = salesmanOrders.filter(order => {
          const status = order.accountantReviewStatus || order.status || order.orderStatus || 'pending'
          return status.toLowerCase().includes('completed') || 
                 status.toLowerCase().includes('delivered') ||
                 status.toLowerCase() === 'approved'
        }).length

        // Calculate actual sales (sum of all order totals)
        const actualSales = salesmanOrders.reduce((sum, order) => {
          const total = order.pricing?.total || 0
          return sum + total
        }, 0)

        // Get target sales from user data - check forecast first, then targetSales
        const salesmanInfo = userData?.salesmanInfo || selectedUser?.salesmanInfo
        let targetSales = 0
        let targetSource = 'none'
        
        if (salesmanInfo?.forecast && salesmanInfo.forecast.length > 0) {
          // Try to get current month's target from forecast
          const now = new Date()
          const currentMonth = now.toLocaleString('en-US', { month: 'long' }) // e.g., "January"
          const currentYear = now.getFullYear()
          
          const currentForecast = salesmanInfo.forecast.find(f => 
            f.month === currentMonth && f.year === currentYear
          )
          
          if (currentForecast) {
            targetSales = currentForecast.targetAmount || 0
            targetSource = 'forecast'
          } else {
            // If current month not found, use the first available forecast entry
            targetSales = salesmanInfo.forecast[0]?.targetAmount || 0
            targetSource = 'forecast'
          }
        } else if (salesmanInfo?.targetSales > 0) {
          // Fall back to targetSales if no forecast
          targetSales = salesmanInfo.targetSales
          targetSource = 'target'
        }

        setSalesPerformance({
          totalOrders,
          completedOrders,
          actualSales,
          targetSales,
          targetSource // Store source for display purposes
        })
      } else {
        // Get target sales from user data - check forecast first, then targetSales
        const salesmanInfo = userData?.salesmanInfo || selectedUser?.salesmanInfo
        let targetSales = 0
        let targetSource = 'none'
        
        if (salesmanInfo?.forecast && salesmanInfo.forecast.length > 0) {
          const now = new Date()
          const currentMonth = now.toLocaleString('en-US', { month: 'long' })
          const currentYear = now.getFullYear()
          
          const currentForecast = salesmanInfo.forecast.find(f => 
            f.month === currentMonth && f.year === currentYear
          )
          
          if (currentForecast) {
            targetSales = currentForecast.targetAmount || 0
            targetSource = 'forecast'
          } else {
            targetSales = salesmanInfo.forecast[0]?.targetAmount || 0
            targetSource = 'forecast'
          }
        } else if (salesmanInfo?.targetSales > 0) {
          targetSales = salesmanInfo.targetSales
          targetSource = 'target'
        }
        
        setSalesPerformance({
          totalOrders: 0,
          completedOrders: 0,
          actualSales: 0,
          targetSales,
          targetSource
        })
      }
    } catch (error) {
      console.error('Error loading sales performance:', error)
      // Get target sales from user data - check forecast first, then targetSales
      const salesmanInfo = userData?.salesmanInfo || selectedUser?.salesmanInfo
      let targetSales = 0
      let targetSource = 'none'
      
      if (salesmanInfo?.forecast && salesmanInfo.forecast.length > 0) {
        const now = new Date()
        const currentMonth = now.toLocaleString('en-US', { month: 'long' })
        const currentYear = now.getFullYear()
        
        const currentForecast = salesmanInfo.forecast.find(f => 
          f.month === currentMonth && f.year === currentYear
        )
        
        if (currentForecast) {
          targetSales = currentForecast.targetAmount || 0
          targetSource = 'forecast'
        } else {
          targetSales = salesmanInfo.forecast[0]?.targetAmount || 0
          targetSource = 'forecast'
        }
      } else if (salesmanInfo?.targetSales > 0) {
        targetSales = salesmanInfo.targetSales
        targetSource = 'target'
      }
      
      setSalesPerformance({
        totalOrders: 0,
        completedOrders: 0,
        actualSales: 0,
        targetSales,
        targetSource
      })
    } finally {
      setLoadingSalesPerformance(false)
    }
  }

  const openCreateModal = () => {
    resetForm()
    setShowCreateModal(true)
  }

  const handleViewActivity = async (user) => {
    setSelectedActivityUser(user)
    setShowActivityModal(true)
    setLoadingActivity(true)
    setActivityDateFilter('')
    
    try {
      // Build query parameters
      const params = new URLSearchParams()
      if (activityDateFilter) {
        params.append('date', activityDateFilter)
      }
      
      const url = `${getApiUrl()}/api/user-activity/user/${user._id}${params.toString() ? `?${params.toString()}` : ''}`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        setUserActivity(data.data || [])
      } else {
        setErrorMessage(data.message || 'Error loading user activity')
        setShowErrorPopup(true)
        setUserActivity([])
      }
    } catch (error) {
      console.error('Error loading user activity:', error)
      setErrorMessage('Error loading user activity: ' + (error.message || 'Unknown error'))
      setShowErrorPopup(true)
      setUserActivity([])
    } finally {
      setLoadingActivity(false)
    }
  }

  const filterActivityByDate = () => {
    // If date filter is set, reload data with filter
    // Otherwise return current activity
    return userActivity
  }

  // Reload activity when date filter changes
  useEffect(() => {
    if (showActivityModal && selectedActivityUser) {
      const loadActivityWithFilter = async () => {
        setLoadingActivity(true)
        try {
          const params = new URLSearchParams()
          if (activityDateFilter) {
            params.append('date', activityDateFilter)
          }
          
          const url = `${getApiUrl()}/api/user-activity/user/${selectedActivityUser._id}${params.toString() ? `?${params.toString()}` : ''}`
          
          const response = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
          
          const data = await response.json()
          
          if (data.success) {
            setUserActivity(data.data || [])
          } else {
            setUserActivity([])
          }
        } catch (error) {
          console.error('Error loading user activity:', error)
          setUserActivity([])
        } finally {
          setLoadingActivity(false)
        }
      }
      
      loadActivityWithFilter()
    }
  }, [activityDateFilter, showActivityModal, selectedActivityUser, token])

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
    setAvatarFile(null)
    setAvatarPreview(user.profile?.avatar || '')
    setShowEditModal(true)
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrorMessage('Please select an image file')
        setShowErrorPopup(true)
        return
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('Image size must be less than 5MB')
        setShowErrorPopup(true)
        return
      }

      setAvatarFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveAvatar = () => {
    setAvatarFile(null)
    setAvatarPreview('')
    setFormData({...formData, avatar: ''})
  }

  const uploadAvatarToSupabase = async (file) => {
    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('image', file)
      formData.append('folder', 'users')

      const response = await fetch(`${getApiUrl()}/api/upload/image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      const data = await response.json()
      
      if (data.success) {
        return data.data.url
      } else {
        throw new Error(data.message || 'Failed to upload image')
      }
    } catch (error) {
      console.error('Upload error:', error)
      throw error
    } finally {
      setUploading(false)
    }
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
      department: '',
      targetType: '',
      targetValue: '',
      targetPeriod: ''
    })
    setSelectedUser(null)
    setAvatarFile(null)
    setAvatarPreview('')
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
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Loading message="Loading users..." />
        </div>
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
      
      <PageSection>
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
                        {(user.role === 'salesman' || user.role === 'accountant') && (
                          <button 
                            className="btn-text" 
                            onClick={() => handleViewActivity(user)} 
                            title="View Activity"
                          >
                            Active
                          </button>
                        )}
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
                    onChange={(e) => setFormData({...formData, role: e.target.value, targetType: '', targetValue: '', targetPeriod: ''})}
                    required
                  >
                    <option value="salesman">Salesman</option>
                    <option value="accountant">Accountant</option>
                  </select>
                </div>
                
                {/* Salesman Target/Forecast Section */}
                {formData.role === 'salesman' && (
                  <>
                    <div className="form-group full-width">
                      <label>Target Type (Optional)</label>
                      <select
                        value={formData.targetType}
                        onChange={(e) => setFormData({...formData, targetType: e.target.value, targetValue: '', targetPeriod: ''})}
                      >
                        <option value="">Select Type</option>
                        <option value="target">Target Sales</option>
                        <option value="forecast">Forecast</option>
                      </select>
                    </div>
                    
                    {formData.targetType && (
                      <>
                        <div className="form-group">
                          <label>Value (BD)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.targetValue}
                            onChange={(e) => setFormData({...formData, targetValue: e.target.value})}
                            placeholder="Enter target value"
                          />
                        </div>
                        <div className="form-group">
                          <label>Time Period</label>
                          <select
                            value={formData.targetPeriod}
                            onChange={(e) => setFormData({...formData, targetPeriod: e.target.value})}
                          >
                            <option value="">Select Period</option>
                            <option value="3months">3 Months</option>
                            <option value="6months">6 Months</option>
                            <option value="1year">1 Year</option>
                          </select>
                        </div>
                      </>
                    )}
                  </>
                )}
                
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

              {/* Avatar Upload */}
              <div className="form-section-header">
                <h3>User Avatar (Optional)</h3>
              </div>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Avatar Image</label>
                  <div className="image-upload-container">
                    {avatarPreview ? (
                      <div className="image-preview-wrapper">
                        <img src={avatarPreview} alt="Avatar preview" className="image-preview" />
                        <button 
                          type="button" 
                          className="remove-image-btn"
                          onClick={handleRemoveAvatar}
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="image-upload-placeholder">
                        <input
                          type="file"
                          id="avatar-upload-create"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="image-file-input"
                        />
                        <label htmlFor="avatar-upload-create" className="image-upload-label">
                          <span className="upload-icon">📷</span>
                          <span>Click to upload avatar</span>
                          <small>PNG, JPG up to 5MB</small>
                        </label>
                      </div>
                    )}
                  </div>
                  {uploading && (
                    <div className="upload-status">Uploading image...</div>
                  )}
                </div>
              </div>
              <div className="modal-actions">
                <SecondaryButton type="button" onClick={() => {
                  setShowCreateModal(false)
                  resetForm()
                }}>
                  Cancel
                </SecondaryButton>
                <PrimaryButton type="submit" disabled={uploading}>
                  {uploading ? 'Creating...' : 'Create User'}
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
                    onChange={(e) => setFormData({...formData, role: e.target.value, targetType: '', targetValue: '', targetPeriod: ''})}
                    required
                  >
                    <option value="salesman">Salesman</option>
                    <option value="accountant">Accountant</option>
                  </select>
                </div>
                
                {/* Salesman Target/Forecast Section */}
                {formData.role === 'salesman' && (
                  <>
                    <div className="form-group full-width">
                      <label>Target Type (Optional)</label>
                      <select
                        value={formData.targetType}
                        onChange={(e) => setFormData({...formData, targetType: e.target.value, targetValue: '', targetPeriod: ''})}
                      >
                        <option value="">Select Type</option>
                        <option value="target">Target Sales</option>
                        <option value="forecast">Forecast</option>
                      </select>
                    </div>
                    
                    {formData.targetType && (
                      <>
                        <div className="form-group">
                          <label>Value (BD)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.targetValue}
                            onChange={(e) => setFormData({...formData, targetValue: e.target.value})}
                            placeholder="Enter target value"
                          />
                        </div>
                        <div className="form-group">
                          <label>Time Period</label>
                          <select
                            value={formData.targetPeriod}
                            onChange={(e) => setFormData({...formData, targetPeriod: e.target.value})}
                          >
                            <option value="">Select Period</option>
                            <option value="3months">3 Months</option>
                            <option value="6months">6 Months</option>
                            <option value="1year">1 Year</option>
                          </select>
                        </div>
                      </>
                    )}
                  </>
                )}
                
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

              {/* Avatar Upload */}
              <div className="form-section-header">
                <h3>User Avatar (Optional)</h3>
              </div>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Avatar Image</label>
                  <div className="image-upload-container">
                    {avatarPreview ? (
                      <div className="image-preview-wrapper">
                        <img src={avatarPreview} alt="Avatar preview" className="image-preview" />
                        <button 
                          type="button" 
                          className="remove-image-btn"
                          onClick={handleRemoveAvatar}
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="image-upload-placeholder">
                        <input
                          type="file"
                          id="avatar-upload-edit"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="image-file-input"
                        />
                        <label htmlFor="avatar-upload-edit" className="image-upload-label">
                          <span className="upload-icon">📷</span>
                          <span>Click to upload avatar</span>
                          <small>PNG, JPG up to 5MB</small>
                        </label>
                      </div>
                    )}
                  </div>
                  {uploading && (
                    <div className="upload-status">Uploading image...</div>
                  )}
                </div>
              </div>
              <div className="modal-actions">
                <SecondaryButton type="button" onClick={() => {
                  setShowEditModal(false)
                  resetForm()
                }}>
                  Cancel
                </SecondaryButton>
                <PrimaryButton type="submit" disabled={uploading}>
                  {uploading ? 'Updating...' : 'Update User'}
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
              
              {selectedUser.role === 'salesman' && (
                <div className="salesman-stats">
                  <h4>Sales Performance</h4>
                  {loadingSalesPerformance ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                      <Loading message="Loading sales data..." />
                    </div>
                  ) : (
                    <div className="stats-grid">
                      <div className="stat-card">
                        <div className="stat-value">{salesPerformance.totalOrders}</div>
                        <div className="stat-label">Total Orders</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-value">{salesPerformance.completedOrders}</div>
                        <div className="stat-label">Completed</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-value">BD {salesPerformance.actualSales.toFixed(2)}</div>
                        <div className="stat-label">Actual Sales</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-value">BD {salesPerformance.targetSales.toFixed(2)}</div>
                        <div className="stat-label">
                          {salesPerformance.targetSource === 'forecast' ? 'Forecast Target' : 
                           salesPerformance.targetSource === 'target' ? 'Target Sales' : 
                           'Target Sales'}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Target/Forecast Information */}
                  {(selectedUser.salesmanInfo?.targetSales > 0 || (selectedUser.salesmanInfo?.forecast && selectedUser.salesmanInfo.forecast.length > 0)) && (
                    <div className="profile-section" style={{ marginTop: '20px' }}>
                      <h4>Target & Forecast</h4>
                      {selectedUser.salesmanInfo?.targetSales > 0 && (
                        <div className="detail-row">
                          <strong>Target Sales:</strong> BD {selectedUser.salesmanInfo.targetSales.toFixed(2)}
                        </div>
                      )}
                      {selectedUser.salesmanInfo?.forecast && selectedUser.salesmanInfo.forecast.length > 0 && (
                        <div style={{ marginTop: '10px' }}>
                          <strong>Forecast:</strong>
                          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {selectedUser.salesmanInfo.forecast.map((forecast, index) => (
                              <div key={index} style={{ 
                                padding: '8px', 
                                background: '#f5f5f5', 
                                borderRadius: '4px',
                                fontSize: '0.875rem'
                              }}>
                                <strong>{forecast.month} {forecast.year}:</strong> BD {forecast.targetAmount.toFixed(2)} (Target) | BD {forecast.actualAmount.toFixed(2)} (Actual)
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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

      {/* Error Popup */}
      {showErrorPopup && (
        <div className="modal-overlay" onClick={() => setShowErrorPopup(false)}>
          <div className="error-popup" onClick={(e) => e.stopPropagation()}>
            <div className="error-icon">✗</div>
            <h3>Error!</h3>
            <p>{errorMessage}</p>
            <PrimaryButton onClick={() => setShowErrorPopup(false)}>
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

      {/* User Activity Modal */}
      {showActivityModal && selectedActivityUser && (
        <div className="modal-overlay" onClick={() => {
          setShowActivityModal(false)
          setSelectedActivityUser(null)
          setUserActivity([])
          setActivityDateFilter('')
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', width: '90%', maxHeight: '90vh' }}>
            <div className="modal-header">
              <h2>User Activity - {selectedActivityUser.name}</h2>
              <button className="modal-close" onClick={() => {
                setShowActivityModal(false)
                setSelectedActivityUser(null)
                setUserActivity([])
                setActivityDateFilter('')
              }}>×</button>
            </div>
            <div style={{ padding: '24px', maxHeight: 'calc(90vh - 120px)', overflowY: 'auto' }}>
              {/* Calendar Filter */}
              <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <label style={{ fontWeight: '500', fontSize: '14px' }}>Filter by Date:</label>
                <input
                  type="date"
                  value={activityDateFilter}
                  onChange={(e) => setActivityDateFilter(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
                {activityDateFilter && (
                  <button
                    onClick={() => setActivityDateFilter('')}
                    style={{
                      padding: '8px 16px',
                      background: '#f5f5f5',
                      border: '1px solid #e0e0e0',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              {/* Activity Table */}
              {loadingActivity ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <Loading message="Loading activity..." />
                </div>
              ) : filterActivityByDate().length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  <p>No activity found{activityDateFilter ? ' for selected date' : ''}</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #e0e0e0' }}>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Login Time</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Pages Visited</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filterActivityByDate().map((activity) => (
                        <tr key={activity.id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                          <td style={{ padding: '12px', fontSize: '14px' }}>
                            {new Date(activity.loginTime).toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </td>
                          <td style={{ padding: '12px', fontSize: '14px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {activity.pages.map((page, index) => (
                                <span
                                  key={index}
                                  style={{
                                    padding: '4px 8px',
                                    background: '#e3f2fd',
                                    color: '#1976d2',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    fontWeight: '500'
                                  }}
                                >
                                  {page}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td style={{ padding: '12px', fontSize: '14px', color: '#666' }}>
                            {activity.duration}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-actions" style={{ padding: '16px 24px', borderTop: '1px solid #e0e0e0' }}>
              <SecondaryButton onClick={() => {
                setShowActivityModal(false)
                setSelectedActivityUser(null)
                setUserActivity([])
                setActivityDateFilter('')
              }}>
                Close
              </SecondaryButton>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="password-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Reset Password</h2>
              <button className="modal-close" onClick={() => setShowPasswordModal(false)}>×</button>
            </div>
            <div className="password-form">
              {selectedUser.name && (
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                    <strong>User:</strong> {selectedUser.name} ({selectedUser.email || 'N/A'})
                  </p>
                </div>
              )}
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
                <small style={{ display: 'block', marginTop: '4px', color: '#666', fontSize: '12px' }}>
                  The new password will be sent to the user via email.
                </small>
              </div>
              <div className="modal-actions">
                <SecondaryButton type="button" onClick={() => {
                  setShowPasswordModal(false)
                  setNewPassword('')
                  setSelectedUser(null)
                }}>
                  Cancel
                </SecondaryButton>
                <PrimaryButton 
                  type="button" 
                  onClick={confirmResetPassword}
                  disabled={!newPassword || newPassword.length < 6}
                >
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
