import SecondaryButton from './SecondaryButton.jsx'

function EmptyState({ message = "No data yet — connect the API later." }) {
  return (
    <div className="empty-state">
      <h3>No Data Available</h3>
      <p>{message}</p>
      <SecondaryButton>Learn more</SecondaryButton>
    </div>
  )
}

export default EmptyState
