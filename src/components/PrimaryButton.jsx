import { Link } from 'react-router-dom'

function PrimaryButton({ children, to, onClick, disabled = false, type = 'button' }) {
  const className = `primary-button ${disabled ? 'disabled' : ''}`
  
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

export default PrimaryButton
