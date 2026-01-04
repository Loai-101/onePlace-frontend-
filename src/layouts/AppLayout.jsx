import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getApiUrl } from '../utils/security'
import Header from '../components/Header.jsx'
import Sidebar from '../components/Sidebar.jsx'
import './AppLayout.css'

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { isAuthenticated, isLoading, token } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const pageStartTime = useRef(Date.now())
  const previousPath = useRef('')

  const getPageNameFromPath = (path) => {
    // Map paths to readable page names
    const pathMap = {
      '/dashboard': 'Dashboard',
      '/dashboard/catalog': 'Catalog',
      '/dashboard/cart': 'Cart',
      '/dashboard/orders': 'My Orders',
      '/dashboard/accountant': 'Accountant Dashboard',
      '/dashboard/accountant/orders': 'Accountant Orders',
      '/dashboard/owner': 'Owner Dashboard',
      '/dashboard/owner/products': 'Products',
      '/dashboard/owner/categories': 'Categories',
      '/dashboard/owner/brands': 'Brands',
      '/dashboard/owner/users': 'Users',
      '/dashboard/owner/accounts': 'Accounts',
      '/dashboard/owner/calendar': 'Calendar',
      '/dashboard/owner/reports': 'Reports',
      '/dashboard/owner/settings': 'Settings',
      '/dashboard/calendar': 'Calendar',
      '/dashboard/clinics': 'Clinics'
    }

    // Check exact match first
    if (pathMap[path]) {
      return pathMap[path]
    }

    // Check for dynamic routes
    if (path.startsWith('/dashboard/owner/products/')) {
      return 'Product Details'
    }
    if (path.startsWith('/dashboard/orders/')) {
      return 'Order Details'
    }
    if (path.startsWith('/dashboard/catalog/')) {
      return 'Product Details'
    }

    // Default: return path without /dashboard prefix
    return path.replace('/dashboard', '').replace(/^\//, '') || 'Dashboard'
  }

  const trackPageVisit = async (pageName, duration) => {
    if (!token || !pageName) return

    try {
      const response = await fetch(`${getApiUrl()}/api/user-activity/track-page`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          page: pageName,
          duration: duration
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Error tracking page visit:', errorData.message || 'Unknown error')
      } else {
        const data = await response.json().catch(() => ({}))
        if (data.success) {
          console.log(`✅ Page tracked: ${pageName} (${duration}s)`)
        }
      }
    } catch (error) {
      // Silently fail - don't interrupt user experience
      console.error('Error tracking page visit:', error)
    }
  }

  useEffect(() => {
    // Redirect to login if not authenticated (after loading)
    if (!isLoading && !isAuthenticated()) {
      navigate('/login')
    }
  }, [isAuthenticated, isLoading, navigate])

  // Track initial page load after authentication
  useEffect(() => {
    if (isAuthenticated() && token && location.pathname && previousPath.current === '') {
      const pageName = getPageNameFromPath(location.pathname)
      if (pageName) {
        // Track the initial page after login
        setTimeout(() => {
          trackPageVisit(pageName, 0)
          previousPath.current = location.pathname
          pageStartTime.current = Date.now()
        }, 1000) // Small delay to ensure session is created
      }
    }
  }, [token, isAuthenticated, location.pathname])

  // Track page visits
  useEffect(() => {
    if (!isAuthenticated() || !token) return

    const currentPath = location.pathname
    const pageName = getPageNameFromPath(currentPath)

    // Skip tracking for the same page (unless it's the first load)
    if (currentPath === previousPath.current && previousPath.current !== '') return

    // Calculate duration on previous page
    const duration = previousPath.current ? Math.floor((Date.now() - pageStartTime.current) / 1000) : 0

    // Track previous page visit if it exists and duration is meaningful (at least 1 second)
    if (previousPath.current && duration >= 1) {
      const previousPageName = getPageNameFromPath(previousPath.current)
      if (previousPageName) {
        trackPageVisit(previousPageName, duration)
      }
    }

    // Track current page visit (immediately for new pages or first load)
    if (pageName) {
      // Track immediately without delay for better accuracy
      trackPageVisit(pageName, 0) // Duration will be calculated on next page visit
    }

    // Update refs
    previousPath.current = currentPath
    pageStartTime.current = Date.now()
  }, [location.pathname, token, isAuthenticated])

  // Track page visit on unmount (when user navigates away or closes tab)
  useEffect(() => {
    return () => {
      if (previousPath.current && token && isAuthenticated()) {
        const duration = Math.floor((Date.now() - pageStartTime.current) / 1000)
        if (duration > 0) {
          trackPageVisit(getPageNameFromPath(previousPath.current), duration)
        }
      }
    }
  }, [token, isAuthenticated])

  // Show loading or nothing while checking auth
  if (isLoading) {
    return <div>Loading...</div>
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated()) {
    return null
  }

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className={`main-content ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
        <Header />
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppLayout
