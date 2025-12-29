# Fix Hardcoded API URLs

This document tracks the replacement of hardcoded `http://localhost:5000` URLs with `getApiUrl()` function calls.

## Files Fixed ✅
- src/pages/catalog/Catalog.jsx
- src/pages/cart/Cart.jsx  
- src/pages/owner/Accounts.jsx
- src/pages/owner/Products.jsx
- src/pages/owner/Brands.jsx
- src/pages/owner/Categories.jsx
- src/pages/owner/ProductForm.jsx
- src/pages/owner/Settings.jsx
- src/pages/owner/Users.jsx
- src/pages/orders/MyOrders.jsx
- src/pages/orders/OrderDetails.jsx
- src/pages/accountant/Orders.jsx
- src/pages/accountant/Dashboard.jsx
- src/pages/admin/AdminDashboard.jsx
- src/pages/admin/AdminLogin.jsx
- src/pages/admin/AdminManagement.jsx
- src/pages/admin/CompanyUpdateRequests.jsx
- src/pages/Company.jsx

## Status: ✅ ALL FILES FIXED

## How to Fix

For each file:
1. Add import: `import { getApiUrl } from '../../utils/security'` (adjust path depth as needed)
2. Replace: `'http://localhost:5000/api/...'` with `` `${getApiUrl()}/api/...` ``
3. Replace: `"http://localhost:5000/api/..."` with `` `${getApiUrl()}/api/...` ``
4. Replace: `` `http://localhost:5000/api/...` `` with `` `${getApiUrl()}/api/...` ``

## Important
- Use backticks (template literals) not single/double quotes
- Ensure `getApiUrl()` is called as a function: `${getApiUrl()}`

