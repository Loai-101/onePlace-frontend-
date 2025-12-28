import './SuccessPopup.css'

const SuccessPopup = ({ isOpen, onClose, title, message, companyName, status }) => {
  if (!isOpen) return null

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="success-popup" onClick={(e) => e.stopPropagation()}>
        <div className="popup-header">
          <div className="success-icon">✓</div>
          <h2 className="popup-title">{title}</h2>
        </div>
        
        <div className="popup-content">
          <p className="popup-message">{message}</p>
          
          <div className="company-info">
            <div className="info-item">
              <strong>Company:</strong> {companyName}
            </div>
            <div className="info-item">
              <strong>Status:</strong> 
              <span className={`status-badge status-${status}`}>
                {status === 'pending' ? 'Pending Approval' : status}
              </span>
            </div>
          </div>
          
          <div className="next-steps">
            <h4>What happens next?</h4>
            <ul>
              <li>Your registration is under review</li>
              <li>An email notification has been sent to the admin</li>
              <li>You'll receive an email confirmation</li>
              <li>Once approved, you can log in to your account</li>
            </ul>
          </div>
        </div>
        
        <div className="popup-actions">
          <button className="popup-button primary" onClick={onClose}>
            Continue to Login
          </button>
        </div>
      </div>
    </div>
  )
}

export default SuccessPopup
