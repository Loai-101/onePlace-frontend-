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
    
    if (adminToken) {
      // Admin login - redirect to admin dashboard
      navigate('/admin/dashboard')
      return
    }

    // Regular user login - get user role from localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const userRole = user.role

    // Redirect based on user role
    if (userRole === 'owner' || userRole === 'admin') {
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
        // Check if admin is logged in (admin uses different token)
        const adminToken = localStorage.getItem('adminToken')
        
        if (adminToken) {
          // Admin login - redirect to admin dashboard
          navigate('/admin/dashboard')
          return
        }

        // Regular user login - get user role from localStorage
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        const userRole = user.role

        // Redirect based on user role
        if (userRole === 'owner' || userRole === 'admin') {
          navigate('/dashboard/owner')
        } else if (userRole === 'accountant') {
          navigate('/dashboard/accountant')
        } else if (userRole === 'salesman') {
          navigate('/dashboard')
        } else {
          navigate('/dashboard')
        }
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
