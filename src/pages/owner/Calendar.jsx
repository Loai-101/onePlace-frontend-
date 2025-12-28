import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns'
import PageSection from '../../components/PageSection.jsx'
import SecondaryButton from '../../components/SecondaryButton.jsx'
import '../calendar/Calendar.css'

function OwnerCalendar() {
  const { token, user } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedSalesman, setSelectedSalesman] = useState('')
  const [salesmen, setSalesmen] = useState([])
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [loadingSalesmen, setLoadingSalesmen] = useState(false)

  useEffect(() => {
    if (token) {
      loadSalesmen()
    }
  }, [token])

  useEffect(() => {
    if (token) {
      loadEvents()
    }
  }, [token, currentDate, selectedSalesman])

  const loadSalesmen = async () => {
    try {
      setLoadingSalesmen(true)
      const response = await fetch(`http://localhost:5000/api/users/company/${user.company}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Filter only salesmen
        const salesmenList = (data.data || []).filter(u => u.role === 'salesman')
        setSalesmen(salesmenList)
      }
    } catch (error) {
      console.error('Error loading salesmen:', error)
    } finally {
      setLoadingSalesmen(false)
    }
  }

  const loadEvents = async () => {
    try {
      setLoading(true)
      const start = format(startOfMonth(currentDate), 'yyyy-MM-dd')
      const end = format(endOfMonth(currentDate), 'yyyy-MM-dd')
      
      let url = `http://localhost:5000/api/calendar?startDate=${start}&endDate=${end}`
      if (selectedSalesman) {
        url += `&salesman=${selectedSalesman}`
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        setEvents(data.data || [])
      }
    } catch (error) {
      console.error('Error loading events:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEventClick = async (event) => {
    try {
      const response = await fetch(`http://localhost:5000/api/calendar/${event.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        setSelectedEvent(data.data)
        setShowEventDetailsModal(true)
      }
    } catch (error) {
      console.error('Error loading event details:', error)
    }
  }

  // Get events for a specific date
  const getEventsForDate = (date) => {
    return events.filter(event => {
      const eventDate = format(new Date(event.date), 'yyyy-MM-dd')
      const checkDate = format(date, 'yyyy-MM-dd')
      return eventDate === checkDate
    })
  }

  // Generate calendar days
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  // Color palette for events on the same day
  const eventColorPalette = [
    '#007bff', // Blue
    '#28a745', // Green
    '#ffc107', // Yellow
    '#dc3545', // Red
    '#17a2b8', // Cyan
    '#6f42c1', // Purple
    '#fd7e14', // Orange
    '#20c997', // Teal
    '#e83e8c', // Pink
    '#6c757d', // Gray
    '#0056b3', // Dark Blue
    '#155724', // Dark Green
    '#856404', // Dark Yellow
    '#721c24', // Dark Red
    '#0c5460', // Dark Cyan
  ]

  // Get color for event based on its index in the day's events
  const getEventColor = (event, eventIndex, dayEvents) => {
    // If there are multiple events on the same day, use different colors
    if (dayEvents.length > 1) {
      return eventColorPalette[eventIndex % eventColorPalette.length]
    }
    
    // If only one event, use status-based colors
    if (event.type === 'visit') {
      return event.status === 'completed' ? '#28a745' : event.status === 'cancelled' ? '#dc3545' : '#007bff'
    } else {
      return event.status === 'completed' ? '#6c757d' : '#ffc107'
    }
  }

  return (
    <div className="calendar-page">
      <div className="calendar-header">
        <h1 className="page-title">Salesmen Calendar</h1>
        <div className="calendar-controls">
          <SecondaryButton onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            Previous Month
          </SecondaryButton>
          <span className="current-month">{format(currentDate, 'MMMM yyyy')}</span>
          <SecondaryButton onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            Next Month
          </SecondaryButton>
        </div>
      </div>

      {/* Salesman Filter */}
      <div className="calendar-filters">
        <div className="form-group">
          <label htmlFor="salesman-filter">Filter by Salesman:</label>
          <select
            id="salesman-filter"
            value={selectedSalesman}
            onChange={(e) => setSelectedSalesman(e.target.value)}
            disabled={loadingSalesmen}
          >
            <option value="">All Salesmen</option>
            {loadingSalesmen ? (
              <option value="">Loading...</option>
            ) : (
              salesmen.map(salesman => (
                <option key={salesman._id} value={salesman._id}>
                  {salesman.name} {salesman.email ? `(${salesman.email})` : ''}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      <PageSection title="Calendar View">
        {loading ? (
          <div className="loading-state">Loading calendar events...</div>
        ) : (
          <div className="calendar-container">
            <div className="calendar-grid">
              {/* Day headers */}
              <div className="calendar-day-header">Sun</div>
              <div className="calendar-day-header">Mon</div>
              <div className="calendar-day-header">Tue</div>
              <div className="calendar-day-header">Wed</div>
              <div className="calendar-day-header">Thu</div>
              <div className="calendar-day-header">Fri</div>
              <div className="calendar-day-header">Sat</div>

              {/* Calendar days */}
              {calendarDays.map((day, index) => {
                const dayEvents = getEventsForDate(day)
                const isCurrentMonth = isSameMonth(day, currentDate)
                const isToday = isSameDay(day, new Date())
                
                return (
                  <div
                    key={index}
                    className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
                  >
                    <div className="day-number">{format(day, 'd')}</div>
                    <div className="day-events">
                      {dayEvents.slice(0, 3).map((event, eventIndex) => (
                        <div
                          key={event._id}
                          className="event-tag"
                          style={{ backgroundColor: getEventColor(event, eventIndex, dayEvents) }}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEventClick({ id: event._id })
                          }}
                          title={`${event.title} - ${event.createdBy?.name || 'Unknown'}`}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="more-events">+{dayEvents.length - 3} more</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </PageSection>

      {/* Event Details Modal (View Only) */}
      {showEventDetailsModal && selectedEvent && (
        <div className="modal-overlay" onClick={() => {
          setShowEventDetailsModal(false)
          setSelectedEvent(null)
        }}>
          <div className="modal-content event-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Event Details</h2>
              <button className="modal-close" onClick={() => {
                setShowEventDetailsModal(false)
                setSelectedEvent(null)
              }}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Event Type</label>
                <input type="text" value={selectedEvent.type?.toUpperCase() || ''} disabled />
              </div>

              <div className="form-group">
                <label>Title</label>
                <input type="text" value={selectedEvent.title || ''} disabled />
              </div>

              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={format(new Date(selectedEvent.date), 'yyyy-MM-dd')}
                  disabled
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Time</label>
                  <input
                    type="time"
                    value={selectedEvent.startTime || ''}
                    disabled
                  />
                </div>
                <div className="form-group">
                  <label>End Time</label>
                  <input
                    type="time"
                    value={selectedEvent.endTime || ''}
                    disabled
                  />
                </div>
              </div>

              {selectedEvent.type === 'visit' && (
                <>
                  <div className="form-group">
                    <label>Account</label>
                    <input
                      type="text"
                      value={selectedEvent.accountName || selectedEvent.account?.name || 'N/A'}
                      disabled
                    />
                  </div>

                  <div className="form-group">
                    <label>Salesman</label>
                    <input
                      type="text"
                      value={selectedEvent.createdBy?.name || 'Unknown'}
                      disabled
                    />
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <input
                      type="text"
                      value={selectedEvent.status?.charAt(0).toUpperCase() + selectedEvent.status?.slice(1) || ''}
                      disabled
                    />
                  </div>

                  {selectedEvent.feedback && (
                    <div className="form-group">
                      <label>Feedback</label>
                      <textarea
                        value={selectedEvent.feedback || ''}
                        rows="4"
                        disabled
                      />
                    </div>
                  )}
                </>
              )}

              {selectedEvent.type === 'todo' && (
                <>
                  <div className="form-group">
                    <label>Salesman</label>
                    <input
                      type="text"
                      value={selectedEvent.createdBy?.name || 'Unknown'}
                      disabled
                    />
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <input
                      type="text"
                      value={selectedEvent.status?.charAt(0).toUpperCase() + selectedEvent.status?.slice(1) || ''}
                      disabled
                    />
                  </div>
                </>
              )}

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={selectedEvent.description || ''}
                  rows="3"
                  disabled
                />
              </div>
            </div>
            <div className="modal-footer">
              <SecondaryButton onClick={() => {
                setShowEventDetailsModal(false)
                setSelectedEvent(null)
              }}>
                Close
              </SecondaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OwnerCalendar

