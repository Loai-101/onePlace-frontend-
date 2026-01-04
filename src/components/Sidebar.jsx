import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { usePopupFocus } from '../hooks/usePopupFocus'

function Sidebar({ isOpen, setIsOpen }) {
  const location = useLocation()
  const { user } = useAuth()
  const [showSupportModal, setShowSupportModal] = useState(false)

  const toggleSidebar = () => {
    setIsOpen(!isOpen)
  }

  // Get user role, default to empty string if not logged in
  const userRole = user?.role || ''

  // Auto-focus support modal when it opens
  usePopupFocus(showSupportModal, '.modal-content')

  const handleEmailSupport = () => {
    window.location.href = 'mailto:it.solutions@pmigroup.me'
  }

  const handleWhatsAppSupport = () => {
    // WhatsApp number: +97332009540 (remove + for wa.me link)
    window.open(`https://wa.me/97332009540`, '_blank')
  }

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
              to="/dashboard/salesman" 
              className={location.pathname === '/dashboard/salesman' ? 'active' : ''}
            >
              Dashboard
            </Link>
          </li>
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
              <li>
                <a 
                  href="https://mws.pmi-me.net/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="external-link"
                >
                  DA
                </a>
              </li>
              <li>
                <button 
                  onClick={() => setShowSupportModal(true)}
                  className="support-link"
                >
                  Support
                </button>
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
          <li>
            <button 
              onClick={() => setShowSupportModal(true)}
              className="support-link"
            >
              Support
            </button>
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
              to="/dashboard/catalog" 
              className={location.pathname === '/dashboard/catalog' ? 'active' : ''}
            >
              Menu
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
              to="/dashboard/owner/reports" 
              className={location.pathname === '/dashboard/owner/reports' ? 'active' : ''}
            >
              Reports
            </Link>
          </li>
          <li>
            <a 
              href="https://mws.pmi-me.net/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="external-link"
            >
              DA
            </a>
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
            <button 
              onClick={() => setShowSupportModal(true)}
              className="support-link"
            >
              Support
            </button>
          </li>
        </ul>
      </div>
        )}
    </aside>

    {/* Support Modal - Outside sidebar for proper centering */}
    {showSupportModal && (
      <div className="modal-overlay" onClick={() => setShowSupportModal(false)}>
        <div className="modal-content support-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Support</h2>
            <button className="modal-close" onClick={() => setShowSupportModal(false)}>×</button>
          </div>
          <div className="modal-body">
            <div className="support-options">
              <button 
                className="support-option-btn email-support"
                onClick={handleEmailSupport}
              >
                <div className="support-option-icon">📧</div>
                <div className="support-option-content">
                  <h3>Send Email</h3>
                  <p>it.solutions@pmigroup.me</p>
                </div>
              </button>
              <button 
                className="support-option-btn whatsapp-support"
                onClick={handleWhatsAppSupport}
              >
                <div className="support-option-icon whatsapp-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" fill="#25D366"/>
                  </svg>
                </div>
                <div className="support-option-content">
                  <h3>WhatsApp</h3>
                  <p>+973 3200 9540</p>
                </div>
              </button>
            </div>
          </div>
          <div className="modal-footer">
            <button 
              className="btn-secondary"
              onClick={() => setShowSupportModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

export default Sidebar
