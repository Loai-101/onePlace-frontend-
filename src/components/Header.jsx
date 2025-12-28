import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'

function Header() {
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [cartCount, setCartCount] = useState(0)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef(null)

  // Update cart count when localStorage changes
  useEffect(() => {
    const updateCartCount = () => {
      const cart = JSON.parse(localStorage.getItem('shoppingCart') || '[]')
      setCartCount(cart.length)
    }

    // Initial load
    updateCartCount()

    // Listen for storage changes (when cart is updated from other tabs)
    window.addEventListener('storage', updateCartCount)

    // Listen for custom cart update events
    window.addEventListener('cartUpdated', updateCartCount)

    return () => {
      window.removeEventListener('storage', updateCartCount)
      window.removeEventListener('cartUpdated', updateCartCount)
    }
  }, [])

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false)
      }
    }

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu])

  const handleLogout = async () => {
    await logout()
    setShowUserMenu(false)
    // Navigate to login page after logout
    navigate('/login')
  }

  const getUserInitials = (name) => {
    if (!name) return 'U'
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)
  }

  const getRoleDisplayName = (role) => {
    const roleNames = {
      owner: 'Owner',
      admin: 'Admin',
      accountant: 'Accountant',
      salesman: 'Salesman'
    }
    return roleNames[role] || role
  }

  return (
    <header className="header">
      <div className="logo">
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <img 
            src="https://res.cloudinary.com/dvybb2xnc/image/upload/v1759838355/OP_Logo_ec0wjg.png" 
            alt="One Place Logo" 
            style={{ height: '32px', width: 'auto' }}
          />
          One Place
        </Link>
      </div>
      
      <div className="header-auth">
        {isAuthenticated() ? (
          <>
            <div className="welcome-message">
              Welcome, <span className="welcome-name">{user.name}</span>
            </div>
            <div className="user-menu-container" ref={userMenuRef}>
              <div 
                className="user-avatar" 
                onClick={() => setShowUserMenu(!showUserMenu)}
                title={`${user.name} (${getRoleDisplayName(user.role)})`}
              >
                {getUserInitials(user.name)}
              </div>
            
            {showUserMenu && (
              <div className="user-menu">
                <div className="user-info">
                  <div className="user-name">{user.name}</div>
                  <div className="user-role">{getRoleDisplayName(user.role)}</div>
                  <div className="user-email">{user.email}</div>
                </div>
                
                <div className="user-menu-divider"></div>
                
                <div className="user-menu-actions">
                  {user.role === 'owner' && (
                    <Link to="/owner" onClick={() => setShowUserMenu(false)}>
                      Dashboard
                    </Link>
                  )}
                  {user.role === 'accountant' && (
                    <Link to="/accountant" onClick={() => setShowUserMenu(false)}>
                      Dashboard
                    </Link>
                  )}
                  <button onClick={handleLogout} className="logout-button">
                    Logout
                  </button>
                </div>
              </div>
            )}
            </div>
          </>
        ) : (
          <div className="auth-links">
            <Link to="/login" className="auth-link">Login</Link>
            <Link to="/signup" className="auth-link">Sign Up</Link>
            <Link to="/company-signup" className="auth-link signup-link">Register Company</Link>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header
