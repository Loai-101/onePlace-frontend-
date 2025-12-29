import { useState, useEffect } from 'react'
import Lottie from 'lottie-react'
import './SuccessAnimation.css'

function SuccessAnimation({ 
  message = 'Success!', 
  onComplete, 
  duration = 2000,
  size = 'medium' 
}) {
  const [animationData, setAnimationData] = useState(null)
  const [show, setShow] = useState(true)

  useEffect(() => {
    // Load animation from public folder
    fetch('/lottiefiles/Message-sent-successfully.json')
      .then(response => response.json())
      .then(data => setAnimationData(data))
      .catch(error => {
        console.error('Error loading success animation:', error)
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
    <div className="success-animation-container">
      <div className={`success-animation-content ${size}`}>
        <Lottie 
          animationData={animationData}
          loop={false}
          autoplay={true}
          className="success-lottie"
        />
        {message && <p className="success-message">{message}</p>}
      </div>
    </div>
  )
}

export default SuccessAnimation

