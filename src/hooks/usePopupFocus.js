import { useEffect, useRef } from 'react'

/**
 * Custom hook to automatically focus and scroll to popup/modal when it opens
 * @param {boolean} isOpen - Whether the popup is open
 * @param {string} popupSelector - CSS selector for the popup element (optional, defaults to first child)
 */
export const usePopupFocus = (isOpen, popupSelector = null) => {
  const popupRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure DOM is updated
      const timer = setTimeout(() => {
        // Find the popup element
        let popupElement = null
        
        if (popupSelector) {
          popupElement = document.querySelector(popupSelector)
        } else if (popupRef.current) {
          popupElement = popupRef.current
        } else {
          // Try to find modal/popup by common class names
          const selectors = [
            '.modal-content',
            '.popup-content', 
            '.validation-popup',
            '.success-popup',
            '.error-popup',
            '.confirm-popup',
            '.modal-overlay > div:first-child',
            '.popup-overlay > div:first-child',
            '[role="dialog"]'
          ]
          
          for (const selector of selectors) {
            const element = document.querySelector(selector)
            if (element && element.offsetParent !== null) {
              popupElement = element
              break
            }
          }
        }

        if (popupElement) {
          // Scroll to popup smoothly
          popupElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'center'
          })
          
          // Focus the popup for keyboard navigation (make it focusable)
          if (!popupElement.hasAttribute('tabindex')) {
            popupElement.setAttribute('tabindex', '-1')
          }
          popupElement.focus()
          
          // Prevent body scroll when popup is open
          const originalOverflow = document.body.style.overflow
          document.body.style.overflow = 'hidden'
          
          // Store original overflow to restore later
          popupElement.dataset.originalOverflow = originalOverflow
        }
      }, 150)

      return () => {
        clearTimeout(timer)
        // Restore body scroll when popup closes
        document.body.style.overflow = ''
      }
    } else {
      // Restore body scroll when popup closes
      document.body.style.overflow = ''
    }
  }, [isOpen, popupSelector])

  return popupRef
}

