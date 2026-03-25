import { useEffect, useRef } from 'react'
import { scrollModalIntoViewport } from '../utils/modalViewportScroll'

/**
 * Automatically focus and scroll to popup/modal when it opens (especially on iPad / touch).
 * @param {boolean} isOpen - Whether the popup is open
 * @param {string|null} popupSelector - CSS selector for the popup element (optional)
 */
export const usePopupFocus = (isOpen, popupSelector = null) => {
  const popupRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        let popupElement = null

        if (popupSelector) {
          popupElement = document.querySelector(popupSelector)
        } else if (popupRef.current) {
          popupElement = popupRef.current
        } else {
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
            const candidates = document.querySelectorAll(selector)
            for (const el of candidates) {
              if (!el) continue
              const st = getComputedStyle(el)
              if (st.display === 'none' || st.visibility === 'hidden') continue
              const r = el.getBoundingClientRect()
              if (r.width > 0 && r.height > 0) {
                popupElement = el
                break
              }
            }
            if (popupElement) break
          }
        }

        if (popupElement) {
          scrollModalIntoViewport(popupElement)

          const originalOverflow = document.body.style.overflow
          document.body.style.overflow = 'hidden'
          popupElement.dataset.originalOverflow = originalOverflow
        }
      }, 150)

      return () => {
        clearTimeout(timer)
        document.body.style.overflow = ''
      }
    }
    document.body.style.overflow = ''
    return undefined
  }, [isOpen, popupSelector])

  return popupRef
}
