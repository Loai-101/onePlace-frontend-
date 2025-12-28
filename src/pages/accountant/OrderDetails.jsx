import { useParams } from 'react-router-dom'
import PageSection from '../../components/PageSection.jsx'
import PrimaryButton from '../../components/PrimaryButton.jsx'
import SecondaryButton from '../../components/SecondaryButton.jsx'

function AccountantOrderDetails() {
  const { id } = useParams()
  
  // TODO: Fetch order details from API using the id
  const order = {
    id: id,
    date: '2024-01-15',
    status: 'UNDER_REVIEW',
    clinic: 'Downtown One Place Clinic',
    salesman: 'John Smith',
    total: '$156.48',
    items: [
      { name: 'Professional Drill Bit Set', price: '$45.99', quantity: 2, total: '$91.98' },
      { name: 'Composite Resin Kit', price: '$89.50', quantity: 1, total: '$89.50' },
    ],
    attachments: [
      { name: 'invoice.pdf', type: 'PDF', uploaded: '2024-01-15 10:30' },
      { name: 'receipt.jpg', type: 'Image', uploaded: '2024-01-15 10:35' },
    ],
    timeline: [
      { date: '2024-01-15 10:30', status: 'Order Placed', user: 'John Smith' },
      { date: '2024-01-15 14:20', status: 'Submitted for Review', user: 'John Smith' },
      { date: '2024-01-16 09:15', status: 'Under Review', user: 'Accountant' },
    ]
  }

  return (
    <div>
      <h1 className="page-title">Order #{order.id} - Review</h1>
      
      <PageSection title="Order Summary">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div>
            <p><strong>Order Date:</strong> {order.date}</p>
            <p><strong>Status:</strong> 
              <span style={{ 
                marginLeft: '0.5rem',
                padding: '0.25rem 0.5rem', 
                borderRadius: '4px',
                fontSize: '0.875rem',
                backgroundColor: '#cce5ff',
                color: '#004085'
              }}>
                {order.status.replace('_', ' ')}
              </span>
            </p>
            <p><strong>Delivery Clinic:</strong> {order.clinic}</p>
            <p><strong>Salesman:</strong> {order.salesman}</p>
          </div>
          <div>
            <p><strong>Total Amount:</strong> {order.total}</p>
            <p><strong>Payment Method:</strong> Invoice (Net 30)</p>
            <p><strong>Priority:</strong> Normal</p>
          </div>
        </div>
      </PageSection>
      
      <PageSection title="Order Items">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Price</th>
              <th>Quantity</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, index) => (
              <tr key={index}>
                <td>{item.name}</td>
                <td>{item.price}</td>
                <td>{item.quantity}</td>
                <td>{item.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PageSection>
      
      <PageSection title="Attachments">
        <div style={{ marginBottom: '1rem' }}>
          <PrimaryButton>Attach PDF</PrimaryButton>
          <SecondaryButton style={{ marginLeft: '1rem' }}>Upload Images</SecondaryButton>
        </div>
        
        {order.attachments.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>File Name</th>
                <th>Type</th>
                <th>Uploaded</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {order.attachments.map((file, index) => (
                <tr key={index}>
                  <td>{file.name}</td>
                  <td>{file.type}</td>
                  <td>{file.uploaded}</td>
                  <td>
                    <SecondaryButton>View</SecondaryButton>
                    <SecondaryButton style={{ marginLeft: '0.5rem' }}>Download</SecondaryButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No attachments uploaded yet.</p>
        )}
      </PageSection>
      
      <PageSection title="Order Timeline">
        <div style={{ position: 'relative' }}>
          {order.timeline.map((event, index) => (
            <div key={index} style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              marginBottom: '1rem',
              paddingLeft: '2rem',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                left: '0',
                top: '0.5rem',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: '#007bff',
                border: '2px solid #fff',
                boxShadow: '0 0 0 2px #007bff'
              }}></div>
              <div>
                <div style={{ fontWeight: '600', color: '#333' }}>{event.status}</div>
                <div style={{ fontSize: '0.875rem', color: '#666' }}>{event.date} by {event.user}</div>
              </div>
            </div>
          ))}
        </div>
      </PageSection>
      
      <PageSection title="Review Actions">
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <PrimaryButton>Set to UNDER_REVIEW</PrimaryButton>
          <PrimaryButton>Set to APPROVED</PrimaryButton>
          <SecondaryButton>Set to REJECTED</SecondaryButton>
          <SecondaryButton>Request More Info</SecondaryButton>
        </div>
      </PageSection>
      
      <div style={{ marginTop: '2rem' }}>
        <SecondaryButton to="/accountant/orders">Back to Orders</SecondaryButton>
      </div>
    </div>
  )
}

export default AccountantOrderDetails
