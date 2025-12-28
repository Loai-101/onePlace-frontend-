# Frontend Security Implementation Guide

## Frontend Security Features

### 1. Input Sanitization
- XSS prevention utilities
- HTML sanitization
- Input validation helpers
- Safe JSON parsing

### 2. API Security
- Environment-based API URLs
- Secure fetch wrapper
- Error handling without exposing sensitive data
- Token management in localStorage (with XSS protection)

### 3. Authentication
- Secure token storage
- Automatic token validation
- Safe user data parsing
- Error recovery for invalid tokens

### 4. Data Validation
- Email validation
- URL validation
- Input sanitization before API calls
- Recursive object sanitization

## Environment Variables

Create a `.env` file in the frontend root:

```env
VITE_API_URL=http://localhost:5000
VITE_NODE_ENV=development
```

For production:
```env
VITE_API_URL=https://api.yourdomain.com
VITE_NODE_ENV=production
```

## Security Best Practices

1. **Never expose sensitive data** - Don't log tokens or passwords
2. **Sanitize all user inputs** - Use security utilities
3. **Validate API responses** - Check data before using
4. **Use HTTPS in production** - Always use secure connections
5. **Content Security Policy** - Configure CSP headers
6. **Regular updates** - Keep dependencies updated
7. **Token expiration** - Handle expired tokens gracefully

## Security Checklist

- [x] Input sanitization utilities
- [x] XSS protection
- [x] API URL from environment variables
- [x] Secure fetch wrapper
- [x] Safe JSON parsing
- [x] Error handling
- [x] Token validation
- [x] Email/URL validation

## Usage Examples

### Sanitizing User Input
```javascript
import { sanitizeInput } from '../utils/security';

const userInput = sanitizeInput(userInput);
```

### Using API URL
```javascript
import { getApiUrl } from '../utils/security';

const response = await fetch(`${getApiUrl()}/api/endpoint`);
```

### Safe JSON Parse
```javascript
import { safeJsonParse } from '../utils/security';

const data = safeJsonParse(localStorage.getItem('data'), {});
```

