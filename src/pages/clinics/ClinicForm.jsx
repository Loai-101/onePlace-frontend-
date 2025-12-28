import { useParams } from 'react-router-dom'
import PageSection from '../../components/PageSection.jsx'
import PrimaryButton from '../../components/PrimaryButton.jsx'
import SecondaryButton from '../../components/SecondaryButton.jsx'

function ClinicForm() {
  const { id } = useParams()
  const isEdit = !!id
  
  // TODO: Fetch clinic data from API if editing
  const clinic = isEdit ? {
    name: 'Downtown One Place Clinic',
    address: '123 Main St, Downtown, City, State 12345',
    phone: '(555) 123-4567',
    email: 'info@downtownoneplace.com',
    contact: 'Dr. Smith',
    license: 'DENT123456',
    status: 'Active',
    notes: 'Primary clinic location with full services'
  } : {}

  return (
    <div>
      <h1 className="page-title">{isEdit ? 'Edit Clinic' : 'New Clinic'}</h1>
      
      <PageSection title="Clinic Information">
        <form>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="name">Clinic Name *</label>
              <input 
                type="text" 
                id="name" 
                defaultValue={clinic.name || ''}
                placeholder="Enter clinic name"
                required 
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="contact">Primary Contact *</label>
              <input 
                type="text" 
                id="contact" 
                defaultValue={clinic.contact || ''}
                placeholder="Enter primary contact name"
                required 
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="phone">Phone Number *</label>
              <input 
                type="tel" 
                id="phone" 
                defaultValue={clinic.phone || ''}
                placeholder="(555) 123-4567"
                required 
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input 
                type="email" 
                id="email" 
                defaultValue={clinic.email || ''}
                placeholder="clinic@example.com"
              />
            </div>
            
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="address">Address *</label>
              <input 
                type="text" 
                id="address" 
                defaultValue={clinic.address || ''}
                placeholder="Enter full address"
                required 
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="license">License Number</label>
              <input 
                type="text" 
                id="license" 
                defaultValue={clinic.license || ''}
                placeholder="Enter license number"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select id="status" defaultValue={clinic.status || 'Active'}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea 
              id="notes" 
              defaultValue={clinic.notes || ''}
              placeholder="Enter any additional notes about this clinic..."
              rows="4"
            />
          </div>
        </form>
      </PageSection>
      
      <PageSection title="Clinic Settings">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label htmlFor="payment-terms">Default Payment Terms</label>
            <select id="payment-terms" defaultValue="net30">
              <option value="net15">Net 15</option>
              <option value="net30">Net 30</option>
              <option value="net45">Net 45</option>
              <option value="net60">Net 60</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="credit-limit">Credit Limit</label>
            <input 
              type="number" 
              id="credit-limit" 
              step="0.01"
              placeholder="0.00"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="discount-rate">Discount Rate (%)</label>
            <input 
              type="number" 
              id="discount-rate" 
              step="0.01"
              placeholder="0.00"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="shipping-address">Shipping Address</label>
            <input 
              type="text" 
              id="shipping-address" 
              placeholder="Enter shipping address (if different)"
            />
          </div>
        </div>
      </PageSection>
      
      <PageSection title="Actions">
        <div style={{ display: 'flex', gap: '1rem' }}>
          <PrimaryButton>Save Clinic</PrimaryButton>
          <SecondaryButton to="/clinics">Cancel</SecondaryButton>
          {isEdit && (
            <SecondaryButton>Delete Clinic</SecondaryButton>
          )}
        </div>
      </PageSection>
    </div>
  )
}

export default ClinicForm
