import { Routes, Route } from 'react-router-dom'
import AppLayout from './layouts/AppLayout.jsx'
import AuthLayout from './layouts/AuthLayout.jsx'

// Auth pages
import MainLogin from './pages/auth/MainLogin.jsx'
import CompanySignup from './pages/auth/CompanySignup.jsx'

// Catalog pages
import Catalog from './pages/catalog/Catalog.jsx'
import ProductDetails from './pages/catalog/ProductDetails.jsx'

// Cart pages
import Cart from './pages/cart/Cart.jsx'

// Orders pages
import MyOrders from './pages/orders/MyOrders.jsx'
import OrderDetails from './pages/orders/OrderDetails.jsx'

// Accountant pages
import AccountantDashboard from './pages/accountant/Dashboard.jsx'
import AccountantOrders from './pages/accountant/Orders.jsx'
import AccountantOrderDetails from './pages/accountant/OrderDetails.jsx'

// Owner pages
import OwnerDashboard from './pages/owner/Dashboard.jsx'
import Products from './pages/owner/Products.jsx'
import ProductForm from './pages/owner/ProductForm.jsx'
import Categories from './pages/owner/Categories.jsx'
import Brands from './pages/owner/Brands.jsx'
import Users from './pages/owner/Users.jsx'
import Settings from './pages/owner/Settings.jsx'
import Accounts from './pages/owner/Accounts.jsx'
import OwnerCalendar from './pages/owner/Calendar.jsx'

// Clinics pages
import Clinics from './pages/clinics/Clinics.jsx'
import ClinicForm from './pages/clinics/ClinicForm.jsx'

// Calendar pages
import Calendar from './pages/calendar/Calendar.jsx'

// Admin pages
import AdminLogin from './pages/admin/AdminLogin.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'

// Other pages
import NotFound from './pages/NotFound.jsx'

export default function Router() {
  return (
    <Routes>
      {/* Main entry point */}
      <Route path="/" element={<MainLogin />} />
      
      {/* Auth routes - Single unified login page */}
      <Route path="/login" element={<MainLogin />} />
      <Route path="/company/login" element={<MainLogin />} />
      <Route path="/company/signup" element={
        <AuthLayout>
          <CompanySignup />
        </AuthLayout>
      } />

      {/* App routes - Protected */}
      <Route path="/dashboard" element={<AppLayout />}>
        {/* Catalog routes */}
        <Route index element={<Catalog />} />
        <Route path="catalog" element={<Catalog />} />
        <Route path="catalog/:id" element={<ProductDetails />} />

        {/* Cart routes */}
        <Route path="cart" element={<Cart />} />

        {/* Orders routes */}
        <Route path="orders" element={<MyOrders />} />
        <Route path="orders/:id" element={<OrderDetails />} />

        {/* Accountant routes */}
        <Route path="accountant" element={<AccountantDashboard />} />
        <Route path="accountant/orders" element={<AccountantOrders />} />
        <Route path="accountant/orders/:id" element={<AccountantOrderDetails />} />

        {/* Owner routes */}
        <Route path="owner" element={<OwnerDashboard />} />
        <Route path="owner/products" element={<Products />} />
        <Route path="owner/products/new" element={<ProductForm />} />
        <Route path="owner/products/:id" element={<ProductForm />} />
        <Route path="owner/categories" element={<Categories />} />
        <Route path="owner/brands" element={<Brands />} />
        <Route path="owner/users" element={<Users />} />
        <Route path="owner/settings" element={<Settings />} />
        <Route path="owner/accounts" element={<Accounts />} />
        <Route path="owner/calendar" element={<OwnerCalendar />} />

        {/* Clinics routes */}
        <Route path="clinics" element={<Clinics />} />
        <Route path="clinics/new" element={<ClinicForm />} />
        <Route path="clinics/:id" element={<ClinicForm />} />

        {/* Calendar routes */}
        <Route path="calendar" element={<Calendar />} />
      </Route>

      {/* Admin routes */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />

      {/* 404 route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
