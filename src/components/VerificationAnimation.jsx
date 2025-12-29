import { useState, useEffect } from 'react'
import Lottie from 'lottie-react'
import './VerificationAnimation.css'

function VerificationAnimation({ 
  message = 'Verifying...', 
  onComplete, 
  duration = 2000,
  size = 'medium',
  inline = false 
}) {
  const [animationData, setAnimationData] = useState(null)
  const [show, setShow] = useState(true)

  useEffect(() => {
    // Load animation from public folder
    fetch('/lottiefiles/Fingerprint-verification.json')
      .then(response => response.json())
      .then(data => setAnimationData(data))
      .catch(error => {
        console.error('Error loading verification animation:', error)
      })
  }, [])

  useEffect(() => {
    if (animationData && duration > 0) {
      const timer = setTimeout(() => {
        setShow(false)
        if (onComplete) {
          onComplete()
        }
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [animationData, duration, onComplete])

  if (!show || !animationData) {
    return null
  }

  return (
    <div className={`verification-animation-container ${inline ? 'inline' : ''}`}>
      <div className={`verification-animation-content ${size}`}>
        <Lottie 
          animationData={animationData}
          loop={false}
          autoplay={true}
          className="verification-lottie"
        />
        {message && <p className="verification-message">{message}</p>}
      </div>
    </div>
  )
}

export default VerificationAnimation

