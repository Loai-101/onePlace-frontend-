import { useParams, useLocation } from 'react-router-dom'
import PageSection from '../../components/PageSection.jsx'
import PrimaryButton from '../../components/PrimaryButton.jsx'
import SecondaryButton from '../../components/SecondaryButton.jsx'
import './ProductDetails.css'

function ProductDetails() {
  const { id } = useParams()
  const location = useLocation()
  
  // Get company and employee from URL state (passed from Catalog page)
  const { selectedCompany, selectedEmployee } = location.state || { selectedCompany: 'All', selectedEmployee: 'All' }
  
  // TODO: Fetch product details from API using the id
  const product = {
    id: id,
    name: 'Professional Drill Bit Set',
    brand: 'Dentsply',
    category: 'Drill Bits',
    price: 'BD 17.30',
    stock: 12,
    description: 'High-quality professional drill bit set with various sizes for different procedures.',
    specifications: {
      material: 'Tungsten Carbide',
      sizes: '0.5mm - 2.0mm',
      sterilization: 'Autoclave compatible'
    }
  }

  // TODO: Fetch sales history from API
  const salesHistory = [
    {
      id: 1,
      date: '2024-01-15',
      quantity: 5,
      unitPrice: 'BD 15.98',
      totalPrice: 'BD 79.90',
      paymentType: 'Cash',
      employee: 'Dr. John Smith',
      notes: 'Regular order'
    },
    {
      id: 2,
      date: '2023-12-08',
      quantity: 3,
      unitPrice: 'BD 16.17',
      totalPrice: 'BD 48.51',
      paymentType: 'Card',
      employee: 'Mike Wilson',
      notes: 'Urgent delivery'
    },
    {
      id: 3,
      date: '2023-11-22',
      quantity: 8,
      unitPrice: 'BD 15.70',
      totalPrice: 'BD 125.60',
      paymentType: 'BenefitPay',
      employee: 'Dr. Sarah Johnson',
      notes: 'Bulk order discount'
    },
    {
      id: 4,
      date: '2023-10-14',
      quantity: 2,
      unitPrice: 'BD 16.54',
      totalPrice: 'BD 33.08',
      paymentType: 'Cash',
      employee: 'Dr. John Smith',
      notes: 'Emergency order'
    },
    {
      id: 5,
      date: '2023-09-30',
      quantity: 6,
      unitPrice: 'BD 15.79',
      totalPrice: 'BD 94.74',
      paymentType: 'Card',
      employee: 'Mike Wilson',
      notes: 'Monthly restock'
    }
  ]

  return (
    <div className="product-details-page">
      <h1 className="page-title">{product.name}</h1>
      
      <div className="product-info-section">
        <div className="product-info-grid">
          <div className="product-image-section">
            <h3>Product Image</h3>
            <div className="product-image-placeholder">
              📦
            </div>
          </div>
          <div className="details-section">
            <h3>Details</h3>
            <p><strong>Brand:</strong> {product.brand}</p>
            <p><strong>Category:</strong> {product.category}</p>
            <p><strong>Price:</strong> {product.price}</p>
            <p><strong>Stock:</strong> {product.stock} units</p>
            <p><strong>Description:</strong> {product.description}</p>
          </div>
          <div className="specifications-section">
            <h3>Specifications</h3>
            <p><strong>Material:</strong> {product.specifications.material}</p>
            <p><strong>Available Sizes:</strong> {product.specifications.sizes}</p>
            <p><strong>Sterilization:</strong> {product.specifications.sterilization}</p>
          </div>
        </div>
        
        <div className="action-buttons">
          <PrimaryButton>Add to Cart</PrimaryButton>
          <SecondaryButton to="/catalog">
            Back to Catalog
          </SecondaryButton>
        </div>
      </div>
      
      {/* Sales History Section - Only show if company is selected */}
      {selectedCompany !== 'All' && (
        <div className="sales-history-section">
          <h2>Sales History for {selectedCompany}</h2>
          <div className="sales-history-table-container">
            <table className="sales-history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total Price</th>
                  <th>Payment Type</th>
                  <th>Employee</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {salesHistory.map(sale => (
                  <tr key={sale.id}>
                    <td>{sale.date}</td>
                    <td>{sale.quantity}</td>
                    <td className="price-cell">{sale.unitPrice}</td>
                    <td className="price-cell total-price">{sale.totalPrice}</td>
                    <td>
                      <span className={`payment-badge ${sale.paymentType.toLowerCase()}`}>
                        {sale.paymentType}
                      </span>
                    </td>
                    <td>{sale.employee}</td>
                    <td className="notes-cell">{sale.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="sales-summary">
            <div className="summary-item">
              <span className="summary-label">Total Orders:</span>
              <span className="summary-value">{salesHistory.length}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Total Quantity Sold:</span>
              <span className="summary-value">{salesHistory.reduce((sum, sale) => sum + sale.quantity, 0)}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Last Sale Price:</span>
              <span className="summary-value last-price">{salesHistory[0]?.unitPrice}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Average Price:</span>
              <span className="summary-value">
                BD {(salesHistory.reduce((sum, sale) => sum + parseFloat(sale.unitPrice.replace('BD ', '')), 0) / salesHistory.length).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="related-products-section">
        <h2>Related Products</h2>
        <div className="related-products-placeholder">
          TODO: Display related products from API
        </div>
      </div>
    </div>
  )
}

export default ProductDetails
