import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../../utils/security';
import VerificationAnimation from '../../components/VerificationAnimation.jsx';
import './AdminLogin.css';

function AdminLogin() {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showVerification, setShowVerification] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch(`${getApiUrl()}/api/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        // Store admin token and data
        localStorage.setItem('adminToken', data.data.token);
        localStorage.setItem('adminData', JSON.stringify(data.data.admin));
        
        // Store user data for welcome animation (admin role)
        localStorage.setItem('user', JSON.stringify({ role: 'admin', ...data.data.admin }));
        
        // Show verification animation first
        setIsLoading(false);
        setShowVerification(true);
      } else {
        setErrors({ general: data.message || 'Login failed' });
      }
    } catch (error) {
      console.error('Admin login error:', error);
      setErrors({ general: 'Network error. Please check your connection and try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-form">
        {/* Verification Animation - Inline within login form */}
        {showVerification && (
          <div className="verification-inline-wrapper">
            <VerificationAnimation
              message="Verifying credentials..."
              duration={2000}
              inline={true}
              size="small"
              onComplete={() => {
                setShowVerification(false);
                navigate('/welcome');
              }}
            />
          </div>
        )}
        
        {!showVerification && (
          <>
        <div className="admin-login-header">
          <div className="admin-login-logo-section">
            <img 
              src="https://res.cloudinary.com/dvybb2xnc/image/upload/v1759838355/OP_Logo_ec0wjg.png" 
              alt="OnePlace Logo" 
              className="admin-login-logo"
            />
            <h1>Admin Panel</h1>
          </div>
          <p>Sign in to manage company registrations</p>
        </div>

        {errors.general && (
          <div className="error-message">
            <strong>Login Error:</strong> {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group">
            <label htmlFor="username">Username or Email</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className={errors.username ? 'error' : ''}
              placeholder="Enter your username or email"
              required
            />
            {errors.username && <span className="field-error">{errors.username}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={errors.password ? 'error' : ''}
              placeholder="Enter your password"
              required
            />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>

          <button 
            type="submit" 
            className="admin-login-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="admin-login-footer">
          <p>Admin access only. Unauthorized access is prohibited.</p>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;
