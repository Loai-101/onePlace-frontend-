import { Link } from 'react-router-dom'
import PageSection from '../components/PageSection.jsx'
import PrimaryButton from '../components/PrimaryButton.jsx'
import SecondaryButton from '../components/SecondaryButton.jsx'

function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
      <h1 style={{ fontSize: '4rem', color: '#007bff', marginBottom: '1rem' }}>404</h1>
      <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Page Not Found</h2>
      <p style={{ fontSize: '1.125rem', color: '#666', marginBottom: '2rem', maxWidth: '500px', margin: '0 auto 2rem' }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <PrimaryButton to="/">Go Home</PrimaryButton>
        <SecondaryButton to="/catalog">Browse Catalog</SecondaryButton>
        <SecondaryButton onClick={() => window.history.back()}>Go Back</SecondaryButton>
      </div>
    </div>
  )
}

export default NotFound
