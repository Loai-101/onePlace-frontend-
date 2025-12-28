function PageSection({ title, children }) {
  return (
    <div className="page-section">
      <h2>{title}</h2>
      {children}
    </div>
  )
}

export default PageSection
