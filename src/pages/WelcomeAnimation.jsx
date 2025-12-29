import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Lottie from 'lottie-react'
import './WelcomeAnimation.css'

function WelcomeAnimation() {
  const navigate = useNavigate()
  const [animationData, setAnimationData] = useState(null)

  const redirectToDashboard = () => {
    // Check if admin is logged in (admin uses different token)
    const adminToken = localStorage.getItem('adminToken')
    const adminData = localStorage.getItem('adminData')
    
    // Only redirect to admin dashboard if both adminToken and adminData exist
    // This ensures we don't redirect regular users to admin panel
    if (adminToken && adminData) {
      try {
        const admin = JSON.parse(adminData)
        // Double check it's actually admin data
        if (admin.role === 'admin' || admin.username) {
          // Admin login - redirect to admin dashboard
          navigate('/admin/dashboard')
          return
        }
      } catch (e) {
        // Invalid admin data, treat as regular user
        console.log('Invalid admin data, treating as regular user')
      }
    }

    // Regular user login - get user role from localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const userRole = user.role

    // Ensure we don't redirect admin role users from regular login to admin panel
    // Admins should only access admin panel through AdminLogin
    if (userRole === 'admin') {
      // If admin logged in through regular login, clear tokens and redirect to admin login
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      navigate('/admin/login')
      return
    }

    // Redirect based on user role
    if (userRole === 'owner') {
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
