import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns'
import PageSection from '../../components/PageSection.jsx'
import PrimaryButton from '../../components/PrimaryButton.jsx'
import SecondaryButton from '../../components/SecondaryButton.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import { getApiUrl } from '../../utils/security'
import './Calendar.css'

function Calendar() {
  const { token, user } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showEventModal, setShowEventModal] = useState(false)
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showAllEventsModal, setShowAllEventsModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedDayEvents, setSelectedDayEvents] = useState([])
  const [selectedDayDate, setSelectedDayDate] = useState(null)
  const [accounts, setAccounts] = useState([])
  
  // Report form state
  const [reportTitle, setReportTitle] = useState('')
  const [reportContent, setReportContent] = useState('')
  const [sendingReport, setSendingReport] = useState(false)
  
  // Form state
  const [eventType, setEventType] = useState('visit') // 'visit' or 'todo'
  const [eventTitle, setEventTitle] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventStartTime, setEventStartTime] = useState('')
  const [eventEndTime, setEventEndTime] = useState('')
  const [selectedAccount, setSelectedAccount] = useState('')
  const [otherAccountName, setOtherAccountName] = useState('')
  const [eventDescription, setEventDescription] = useState('')
  const [eventStatus, setEventStatus] = useState('pending')
  const [eventFeedback, setEventFeedback] = useState('')
  const [saving, setSaving] = useState(false)
  
  // Notification popup state
  const [notification, setNotification] = useState({
    show: false,
    message: '',
    type: 'success' // 'success', 'error', 'info'
  })

  useEffect(() => {
    if (token) {
      loadEvents()
      loadAccounts()
    }
  }, [token, currentDate])

  const loadEvents = async () => {
    try {
      setLoading(true)
      const apiUrl = getApiUrl()
      const start = format(startOfMonth(currentDate), 'yyyy-MM-dd')
      const end = format(endOfMonth(currentDate), 'yyyy-MM-dd')
      
      const response = await fetch(`${apiUrl}/api/calendar?startDate=${start}&endDate=${end}`, {
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

  const loadAccounts = async () => {
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/accounts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        setAccounts(data.data || [])
      }
    } catch (error) {
      console.error('Error loading accounts:', error)
    }
  }

  const handleDateClick = (date) => {
    setSelectedDate(date)
    setEventDate(format(date, 'yyyy-MM-dd'))
    setShowEventModal(true)
  }

  const handleEventClick = async (event) => {
    try {
      const apiUrl = getApiUrl()
      // Handle both _id and id properties
      const eventId = event._id || event.id
      
      if (!eventId) {
        showNotification('Error: Event ID not found', 'error')
        return
      }
      
      const response = await fetch(`${apiUrl}/api/calendar/${eventId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        setSelectedEvent(data.data)
        setEventTitle(data.data.title)
        setEventDate(format(new Date(data.data.date), 'yyyy-MM-dd'))
        setEventStartTime(data.data.startTime || '')
        setEventEndTime(data.data.endTime || '')
        if (data.data.account?._id) {
          setSelectedAccount(data.data.account._id)
          setOtherAccountName('')
        } else {
          setSelectedAccount('other')
          setOtherAccountName(data.data.accountName || '')
        }
        setEventDescription(data.data.description || '')
        setEventStatus(data.data.status || 'pending')
        setEventFeedback(data.data.feedback || '')
        setEventType(data.data.type)
        setShowEventDetailsModal(true)
      } else {
        showNotification(data.message || 'Error loading event details', 'error')
      }
    } catch (error) {
      console.error('Error loading event details:', error)
      showNotification('Error loading event details. Please try again.', 'error')
    }
  }

  const handleCreateEvent = async () => {
    if (!eventTitle || !eventDate) {
      showNotification('Please fill in all required fields', 'error')
      return
    }

    if (eventType === 'visit') {
      if (!selectedAccount) {
        showNotification('Please select an account for the visit', 'error')
        return
      }
      if (selectedAccount === 'other' && !otherAccountName.trim()) {
        showNotification('Please enter the account name', 'error')
        return
      }
    }

    try {
      setSaving(true)
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/calendar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: eventTitle,
          type: eventType,
          date: eventDate,
          startTime: eventStartTime || null,
          endTime: eventEndTime || null,
          account: eventType === 'visit' ? selectedAccount : null,
          accountName: eventType === 'visit' && selectedAccount === 'other' ? otherAccountName : null,
          description: eventDescription || ''
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        await loadEvents()
        resetForm()
        setShowEventModal(false)
        showNotification('Event created successfully!', 'success')
      } else {
        showNotification(data.message || 'Error creating event', 'error')
      }
    } catch (error) {
      console.error('Error creating event:', error)
      showNotification('Error creating event. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateEvent = async () => {
    if (!selectedEvent) return

    if (eventType === 'visit') {
      if (!selectedAccount) {
        showNotification('Please select an account for the visit', 'error')
        return
      }
      if (selectedAccount === 'other' && !otherAccountName.trim()) {
        showNotification('Please enter the account name', 'error')
        return
      }
    }

    try {
      setSaving(true)
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/calendar/${selectedEvent._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: eventTitle,
          date: eventDate,
          startTime: eventStartTime || null,
          endTime: eventEndTime || null,
          account: eventType === 'visit' ? selectedAccount : null,
          accountName: eventType === 'visit' && selectedAccount === 'other' ? otherAccountName : null,
          description: eventDescription,
          status: eventStatus,
          feedback: eventType === 'visit' ? eventFeedback : null
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        await loadEvents()
        setShowEventDetailsModal(false)
        setSelectedEvent(null)
        resetForm()
        showNotification('Event updated successfully!', 'success')
      } else {
        showNotification(data.message || 'Error updating event', 'error')
      }
    } catch (error) {
      console.error('Error updating event:', error)
      showNotification('Error updating event. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return
    
    if (!window.confirm('Are you sure you want to delete this event?')) {
      return
    }

    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/calendar/${selectedEvent._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        await loadEvents()
        setShowEventDetailsModal(false)
        setSelectedEvent(null)
        resetForm()
        showNotification('Event deleted successfully!', 'success')
      } else {
        showNotification(data.message || 'Error deleting event', 'error')
      }
    } catch (error) {
      console.error('Error deleting event:', error)
      showNotification('Error deleting event. Please try again.', 'error')
    }
  }

  const resetForm = () => {
    setEventType('visit')
    setEventTitle('')
    setEventDate('')
    setEventStartTime('')
    setEventEndTime('')
    setSelectedAccount('')
    setOtherAccountName('')
    setEventDescription('')
    setEventStatus('pending')
    setEventFeedback('')
    setSelectedEvent(null)
  }

  // Show notification popup
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type })
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' })
    }, 3000) // Auto-hide after 3 seconds
  }

  // Handle send report
  const handleSendReport = async () => {
    if (!reportTitle.trim() || !reportContent.trim()) {
      showNotification('Please fill in both title and content', 'error')
      return
    }

    try {
      setSendingReport(true)
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/calendar/report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: reportTitle,
          content: reportContent
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        showNotification('Report sent successfully to company email!', 'success')
        setReportTitle('')
        setReportContent('')
        setShowReportModal(false)
      } else {
        showNotification(data.message || 'Error sending report', 'error')
      }
    } catch (error) {
      console.error('Error sending report:', error)
      showNotification('Error sending report. Please try again.', 'error')
    } finally {
      setSendingReport(false)
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
      {/* Notification Popup */}
      {notification.show && (
        <div className={`notification-popup notification-${notification.type}`}>
          <div className="notification-content">
            <span className="notification-message">{notification.message}</span>
            <button 
              className="notification-close"
              onClick={() => setNotification({ show: false, message: '', type: 'success' })}
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="calendar-header">
        <h1 className="page-title">Calendar</h1>
        <div className="calendar-controls">
          <SecondaryButton onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            Previous Month
          </SecondaryButton>
          <span className="current-month">{format(currentDate, 'MMMM yyyy')}</span>
          <SecondaryButton onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            Next Month
          </SecondaryButton>
          <PrimaryButton onClick={() => {
            setSelectedDate(new Date())
            setEventDate(format(new Date(), 'yyyy-MM-dd'))
            resetForm()
            setShowEventModal(true)
          }}>
            Add Event
          </PrimaryButton>
          <PrimaryButton 
            onClick={() => {
              setReportTitle('')
              setReportContent('')
              setShowReportModal(true)
            }}
            style={{ backgroundColor: '#28a745' }}
          >
            Write Report
          </PrimaryButton>
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
                    onClick={() => handleDateClick(day)}
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
                            handleEventClick(event)
                          }}
                          title={event.title}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div 
                          className="more-events"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedDayEvents(dayEvents)
                            setSelectedDayDate(day)
                            setShowAllEventsModal(true)
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </PageSection>

      {/* Create/Edit Event Modal */}
      {showEventModal && (
        <div className="modal-overlay" onClick={() => {
          setShowEventModal(false)
          resetForm()
        }}>
          <div className="modal-content event-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Event</h2>
              <button className="modal-close" onClick={() => {
                setShowEventModal(false)
                resetForm()
              }}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Event Type *</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                >
                  <option value="visit">Visit</option>
                  <option value="todo">To Do</option>
                </select>
              </div>

              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="Enter event title"
                />
              </div>

              <div className="form-group">
                <label>Date *</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Time</label>
                  <input
                    type="time"
                    value={eventStartTime}
                    onChange={(e) => setEventStartTime(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>End Time</label>
                  <input
                    type="time"
                    value={eventEndTime}
                    onChange={(e) => setEventEndTime(e.target.value)}
                  />
                </div>
              </div>

              {eventType === 'visit' && (
                <>
                  <div className="form-group">
                    <label>Account *</label>
                    <select
                      value={selectedAccount}
                      onChange={(e) => {
                        setSelectedAccount(e.target.value)
                        if (e.target.value !== 'other') {
                          setOtherAccountName('')
                        }
                      }}
                    >
                      <option value="">Select Account</option>
                      {accounts.map(account => (
                        <option key={account._id} value={account._id}>
                          {account.name}
                        </option>
                      ))}
                      <option value="other">Other</option>
                    </select>
                  </div>
                  {selectedAccount === 'other' && (
                    <div className="form-group">
                      <label>Account Name *</label>
                      <input
                        type="text"
                        value={otherAccountName}
                        onChange={(e) => setOtherAccountName(e.target.value)}
                        placeholder="Enter account name"
                      />
                    </div>
                  )}
                </>
              )}

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  rows="3"
                  placeholder="Enter event description"
                />
              </div>
            </div>
            <div className="modal-footer">
              <SecondaryButton onClick={() => {
                setShowEventModal(false)
                resetForm()
              }}>
                Cancel
              </SecondaryButton>
              <PrimaryButton onClick={handleCreateEvent} disabled={saving}>
                {saving ? 'Saving...' : 'Create Event'}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {showEventDetailsModal && selectedEvent && (
        <div className="modal-overlay" onClick={() => {
          setShowEventDetailsModal(false)
          resetForm()
        }}>
          <div className="modal-content event-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Event Details</h2>
              <button className="modal-close" onClick={() => {
                setShowEventDetailsModal(false)
                resetForm()
              }}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Event Type</label>
                <input type="text" value={eventType.toUpperCase()} disabled />
              </div>

              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Date *</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Time</label>
                  <input
                    type="time"
                    value={eventStartTime}
                    onChange={(e) => setEventStartTime(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>End Time</label>
                  <input
                    type="time"
                    value={eventEndTime}
                    onChange={(e) => setEventEndTime(e.target.value)}
                  />
                </div>
              </div>

              {eventType === 'visit' && (
                <>
                  <div className="form-group">
                    <label>Account</label>
                    <select
                      value={selectedAccount}
                      onChange={(e) => {
                        setSelectedAccount(e.target.value)
                        if (e.target.value !== 'other') {
                          setOtherAccountName('')
                        }
                      }}
                    >
                      <option value="">Select Account</option>
                      {accounts.map(account => (
                        <option key={account._id} value={account._id}>
                          {account.name}
                        </option>
                      ))}
                      <option value="other">Other</option>
                    </select>
                  </div>
                  {selectedAccount === 'other' && (
                    <div className="form-group">
                      <label>Account Name *</label>
                      <input
                        type="text"
                        value={otherAccountName}
                        onChange={(e) => setOtherAccountName(e.target.value)}
                        placeholder="Enter account name"
                      />
                    </div>
                  )}

                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={eventStatus}
                      onChange={(e) => setEventStatus(e.target.value)}
                    >
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Feedback</label>
                    <textarea
                      value={eventFeedback}
                      onChange={(e) => setEventFeedback(e.target.value)}
                      rows="4"
                      placeholder="Enter feedback about the visit"
                    />
                  </div>
                </>
              )}

              {eventType === 'todo' && (
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={eventStatus}
                    onChange={(e) => setEventStatus(e.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              )}

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  rows="3"
                />
              </div>
            </div>
            <div className="modal-footer">
              <SecondaryButton 
                onClick={handleDeleteEvent}
                style={{ backgroundColor: '#dc3545', color: 'white', marginRight: 'auto' }}
              >
                Delete
              </SecondaryButton>
              <SecondaryButton onClick={() => {
                setShowEventDetailsModal(false)
                resetForm()
              }}>
                Cancel
              </SecondaryButton>
              <PrimaryButton onClick={handleUpdateEvent} disabled={saving}>
                {saving ? 'Saving...' : 'Update Event'}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {/* All Events Modal */}
      {showAllEventsModal && selectedDayEvents.length > 0 && (
        <div className="modal-overlay" onClick={() => {
          setShowAllEventsModal(false)
          setSelectedDayEvents([])
          setSelectedDayDate(null)
        }}>
          <div className="modal-content all-events-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>All Events - {selectedDayDate && format(selectedDayDate, 'MMMM d, yyyy')}</h2>
              <button className="modal-close" onClick={() => {
                setShowAllEventsModal(false)
                setSelectedDayEvents([])
                setSelectedDayDate(null)
              }}>×</button>
            </div>
            <div className="modal-body">
              <div className="all-events-list">
                {selectedDayEvents.map((event, index) => (
                  <div
                    key={event._id}
                    className="event-item"
                    onClick={() => {
                      setShowAllEventsModal(false)
                      handleEventClick(event)
                    }}
                  >
                    <div 
                      className="event-color-indicator"
                      style={{ backgroundColor: getEventColor(event, index, selectedDayEvents) }}
                    ></div>
                    <div className="event-item-content">
                      <div className="event-item-title">{event.title}</div>
                      <div className="event-item-details">
                        {event.type === 'visit' && (
                          <span className="event-item-type">Visit</span>
                        )}
                        {event.type === 'todo' && (
                          <span className="event-item-type">Todo</span>
                        )}
                        {event.startTime && (
                          <span className="event-item-time">{event.startTime}</span>
                        )}
                        {event.accountName && (
                          <span className="event-item-account">{event.accountName}</span>
                        )}
                      </div>
                      {event.description && (
                        <div className="event-item-description">{event.description}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <SecondaryButton onClick={() => {
                setShowAllEventsModal(false)
                setSelectedDayEvents([])
                setSelectedDayDate(null)
              }}>
                Close
              </SecondaryButton>
            </div>
          </div>
        </div>
      )}

      {/* Write Report Modal */}
      {showReportModal && (
        <div className="modal-overlay" onClick={() => {
          setShowReportModal(false)
          setReportTitle('')
          setReportContent('')
        }}>
          <div className="modal-content event-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Write Report</h2>
              <button className="modal-close" onClick={() => {
                setShowReportModal(false)
                setReportTitle('')
                setReportContent('')
              }}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Report Title *</label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder="Enter report title"
                />
              </div>

              <div className="form-group">
                <label>Report Content *</label>
                <textarea
                  value={reportContent}
                  onChange={(e) => setReportContent(e.target.value)}
                  rows="10"
                  placeholder="Write your report here..."
                  style={{ minHeight: '200px' }}
                />
              </div>

              <div className="form-group" style={{ 
                background: '#e3f2fd', 
                padding: '1rem', 
                borderRadius: '4px',
                fontSize: '0.9rem',
                color: '#1976d2'
              }}>
                <strong>Note:</strong> This report will be sent to your company's email address.
              </div>
            </div>
            <div className="modal-footer">
              <SecondaryButton onClick={() => {
                setShowReportModal(false)
                setReportTitle('')
                setReportContent('')
              }}>
                Cancel
              </SecondaryButton>
              <PrimaryButton onClick={handleSendReport} disabled={sendingReport}>
                {sendingReport ? 'Sending...' : 'Send Report'}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Calendar

