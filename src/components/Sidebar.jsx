import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function Sidebar({ isOpen, setIsOpen }) {
  const location = useLocation()
  const { user } = useAuth()

  const toggleSidebar = () => {
    setIsOpen(!isOpen)
  }

  // Get user role, default to empty string if not logged in
  const userRole = user?.role || ''

  return (
    <>
      {/* Toggle Button */}
      <button 
        className={`sidebar-toggle ${isOpen ? 'open' : 'closed'}`}
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
      >
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
      </button>

      <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
        {/* Salesman Links - Only visible to salesmen */}
        {userRole === 'salesman' && (
      <div className="sidebar-section">
        <ul>
          <li>
            <Link 
              to="/dashboard/catalog" 
              className={location.pathname === '/dashboard/catalog' || location.pathname === '/dashboard' ? 'active' : ''}
            >
              Menu
            </Link>
          </li>
          <li>
            <Link 
              to="/dashboard/cart" 
              className={location.pathname === '/dashboard/cart' ? 'active' : ''}
            >
              Cart
            </Link>
          </li>
          <li>
            <Link 
              to="/dashboard/orders" 
              className={location.pathname.startsWith('/dashboard/orders') && !location.pathname.startsWith('/dashboard/accountant/orders') ? 'active' : ''}
            >
              My Orders
            </Link>
          </li>
              <li>
                <Link 
                  to="/dashboard/calendar" 
                  className={location.pathname === '/dashboard/calendar' ? 'active' : ''}
                >
                  Calendar
                </Link>
              </li>
        </ul>
      </div>
        )}

        {/* Accountant Links - Only visible to accountants */}
        {userRole === 'accountant' && (
      <div className="sidebar-section">
        <ul>
          <li>
            <Link 
              to="/dashboard/accountant" 
              className={location.pathname === '/dashboard/accountant' ? 'active' : ''}
            >
              Dashboard
            </Link>
          </li>
          <li>
            <Link 
              to="/dashboard/accountant/orders" 
              className={location.pathname.startsWith('/dashboard/accountant/orders') ? 'active' : ''}
            >
              Orders
            </Link>
          </li>
        </ul>
      </div>
        )}

        {/* Owner Links - Only visible to owners/admins */}
        {(userRole === 'owner' || userRole === 'admin') && (
      <div className="sidebar-section">
        <ul>
          <li>
            <Link 
              to="/dashboard/owner" 
              className={location.pathname === '/dashboard/owner' ? 'active' : ''}
            >
              Dashboard
            </Link>
          </li>
          <li>
            <Link 
              to="/dashboard/owner/products" 
              className={location.pathname.startsWith('/dashboard/owner/products') ? 'active' : ''}
            >
              Products
            </Link>
          </li>
          <li>
            <Link 
              to="/dashboard/owner/categories" 
              className={location.pathname === '/dashboard/owner/categories' ? 'active' : ''}
            >
              Categories
            </Link>
          </li>
          <li>
            <Link 
              to="/dashboard/owner/brands" 
              className={location.pathname === '/dashboard/owner/brands' ? 'active' : ''}
            >
              Brands
            </Link>
          </li>
          <li>
            <Link 
              to="/dashboard/owner/users" 
              className={location.pathname === '/dashboard/owner/users' ? 'active' : ''}
            >
              Users
            </Link>
          </li>
          <li>
            <Link 
              to="/dashboard/owner/settings" 
              className={location.pathname === '/dashboard/owner/settings' ? 'active' : ''}
            >
              Settings
            </Link>
          </li>
          <li>
            <Link 
              to="/dashboard/owner/accounts" 
              className={location.pathname.startsWith('/dashboard/owner/accounts') ? 'active' : ''}
            >
              Accounts
            </Link>
          </li>
              <li>
                <Link 
                  to="/dashboard/owner/calendar" 
                  className={location.pathname === '/dashboard/owner/calendar' ? 'active' : ''}
                >
                  Calendar
                </Link>
              </li>
              <li>
                <Link 
                  to="/dashboard/catalog" 
                  className={location.pathname === '/dashboard/catalog' ? 'active' : ''}
                >
                  Menu
                </Link>
              </li>
        </ul>
      </div>
        )}
    </aside>
    </>
  )
}

export default Sidebar
