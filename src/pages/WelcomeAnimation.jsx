import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Lottie from 'lottie-react'
import './WelcomeAnimation.css'

function WelcomeAnimation() {
  const navigate = useNavigate()
  const [animationData, setAnimationData] = useState(null)

  const redirectToDashboard = () => {
    // Check if PLATFORM admin is logged in (uses AdminLogin, different token system)
    const adminToken = localStorage.getItem('adminToken')
    const adminData = localStorage.getItem('adminData')
    
    // Only redirect to control panel if both adminToken and adminData exist
    // This means they logged in through AdminLogin (platform admin)
    if (adminToken && adminData) {
      try {
        const admin = JSON.parse(adminData)
        // Double check it's actually platform admin data (has username field from Admin model)
        if (admin.username) {
          // Platform admin login - redirect to control panel
          navigate('/admin/dashboard')
          return
        }
      } catch (e) {
        // Invalid admin data, treat as regular user
        console.log('Invalid admin data, treating as regular user')
      }
    }

    // Regular user login (company/employee) - get user role from localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const userRole = user.role

    // Redirect based on user role
    // Note: 'admin' role here is COMPANY admin (not platform admin)
    // Company admins should access company dashboard, not control panel
    if (userRole === 'owner' || userRole === 'admin') {
      // Both owners and company admins go to company dashboard
      navigate('/dashboard/owner')
    } else if (userRole === 'accountant') {
      navigate('/dashboard/accountant')
    } else if (userRole === 'salesman') {
      navigate('/dashboard')
    } else {
      navigate('/dashboard')
    }
  }

  useEffect(() => {
    // Load animation from public folder
    fetch('/lottiefiles/Welcome.json')
      .then(response => response.json())
      .then(data => setAnimationData(data))
      .catch(error => {
        console.error('Error loading welcome animation:', error)
        // If animation fails to load, redirect immediately
        redirectToDashboard()
      })
  }, [])

  useEffect(() => {
    if (animationData) {
      // Show animation for 3 seconds, then redirect
      const timer = setTimeout(() => {
        redirectToDashboard()
      }, 3000) // 3 seconds

      return () => clearTimeout(timer)
    }
  }, [animationData, navigate])

  if (!animationData) {
    return (
      <div className="welcome-animation-container">
        <div className="welcome-animation-content">
          <div className="loading-text">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="welcome-animation-container">
      <div className="welcome-animation-content">
        <Lottie 
          animationData={animationData}
          loop={false}
          autoplay={true}
          className="welcome-lottie"
        />
      </div>
    </div>
  )
}

export default WelcomeAnimation
