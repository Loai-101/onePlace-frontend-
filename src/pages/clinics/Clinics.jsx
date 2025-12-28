import PageSection from '../../components/PageSection.jsx'
import PrimaryButton from '../../components/PrimaryButton.jsx'
import SecondaryButton from '../../components/SecondaryButton.jsx'
import EmptyState from '../../components/EmptyState.jsx'

function Clinics() {
  // TODO: Replace with real clinics data from API
  const clinics = [
    { id: 1, name: 'Downtown One Place Clinic', address: '123 Main St, Downtown', phone: '(555) 123-4567', contact: 'Dr. Smith', status: 'Active' },
    { id: 2, name: 'Westside Family Clinic', address: '456 Oak Ave, Westside', phone: '(555) 234-5678', contact: 'Dr. Johnson', status: 'Active' },
    { id: 3, name: 'Northside Orthodontics', address: '789 Pine Rd, Northside', phone: '(555) 345-6789', contact: 'Dr. Williams', status: 'Active' },
    { id: 4, name: 'Eastside Clinic', address: '321 Elm St, Eastside', phone: '(555) 456-7890', contact: 'Dr. Brown', status: 'Inactive' },
  ]

  return (
    <div>
      <h1 className="page-title">Clinic Management</h1>
      
      <PageSection title="Clinics">
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <PrimaryButton to="/clinics/new">New Clinic</PrimaryButton>
          </div>
          <div>
            <select style={{ padding: '0.5rem', marginRight: '1rem', border: '1px solid #ced4da', borderRadius: '4px' }}>
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <input 
              type="text" 
              placeholder="Search clinics..." 
              style={{ padding: '0.5rem', marginRight: '1rem', border: '1px solid #ced4da', borderRadius: '4px' }}
            />
            <SecondaryButton>Filter</SecondaryButton>
          </div>
        </div>
        
        {clinics.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Address</th>
                <th>Phone</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {clinics.map(clinic => (
                <tr key={clinic.id}>
                  <td>{clinic.name}</td>
                  <td>{clinic.address}</td>
                  <td>{clinic.phone}</td>
                  <td>{clinic.contact}</td>
                  <td>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      backgroundColor: clinic.status === 'Active' ? '#d4edda' : '#f8d7da',
                      color: clinic.status === 'Active' ? '#155724' : '#721c24'
                    }}>
                      {clinic.status}
                    </span>
                  </td>
                  <td>
                    <PrimaryButton to={`/clinics/${clinic.id}`}>
                      Edit
                    </PrimaryButton>
                    <SecondaryButton style={{ marginLeft: '0.5rem' }}>
                      View Orders
                    </SecondaryButton>
                    <SecondaryButton style={{ marginLeft: '0.5rem' }}>
                      {clinic.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </SecondaryButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState message="No clinics found. Create your first clinic to get started." />
        )}
      </PageSection>
    </div>
  )
}

export default Clinics
