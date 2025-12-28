import { Outlet, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Header from '../components/Header.jsx'
import Sidebar from '../components/Sidebar.jsx'
import './AppLayout.css'

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Redirect to login if not authenticated (after loading)
    if (!isLoading && !isAuthenticated()) {
      navigate('/login')
    }
  }, [isAuthenticated, isLoading, navigate])

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
