import { useState, useEffect } from 'react'
import Lottie from 'lottie-react'
import './Loading.css'

function Loading({ size = 'medium', message = 'Loading...', fullScreen = false }) {
  const [animationData, setAnimationData] = useState(null)

  useEffect(() => {
    // Load animation from public folder
    fetch('/lottiefiles/Material-wave-loading.json')
      .then(response => response.json())
      .then(data => setAnimationData(data))
      .catch(error => {
        console.error('Error loading loading animation:', error)
      })
  }, [])

  if (!animationData) {
    return (
      <div className={`loading-container ${fullScreen ? 'fullscreen' : ''} ${size}`}>
        <div className="loading-content">
          <div className="loading-spinner-fallback"></div>
          <p className="loading-message">{message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`loading-container ${fullScreen ? 'fullscreen' : ''} ${size}`}>
      <div className="loading-content">
        <Lottie 
          animationData={animationData}
          loop={true}
          autoplay={true}
          className="loading-lottie"
        />
        {message && <p className="loading-message">{message}</p>}
      </div>
    </div>
  )
}

export default Loading
