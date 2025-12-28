import { Link } from 'react-router-dom'

function SecondaryButton({ children, to, onClick, disabled = false, type = 'button' }) {
  const className = `secondary-button ${disabled ? 'disabled' : ''}`
  
  if (to) {
    return (
      <Link to={to} className={className}>
        {children}
      </Link>
    )
  }
  
  return (
    <button 
      type={type}
      className={className}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

export default SecondaryButton
