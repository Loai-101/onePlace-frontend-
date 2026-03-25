/**
 * Scroll/focus modals on all devices (PC, iPad, phones): reset scroll containers
 * that can leave a fixed overlay misaligned, then bring the dialog into view.
 */

const OVERLAY_SELECTOR =
  '.modal-overlay, .popup-overlay, .validation-popup-overlay, .success-popup-overlay, .error-popup-overlay, .confirm-popup-overlay, .company-mismatch-popup-overlay'

/** Ref-count observer for React StrictMode double-mount in development */
let modalScrollInstallCount = 0
let modalScrollTeardown = null

function resetPageScrollForModal() {
  try {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  } catch {
    window.scrollTo(0, 0)
  }
  if (document.documentElement) document.documentElement.scrollTop = 0
  if (document.body) document.body.scrollTop = 0
  const content = document.querySelector('.app-layout .content')
  if (content) content.scrollTop = 0
}

/**
 * @param {HTMLElement} focusTarget - Usually .modal-content or .popup-content
 */
export function scrollModalIntoViewport(focusTarget) {
  if (!focusTarget || typeof focusTarget.getBoundingClientRect !== 'function') return

  resetPageScrollForModal()

  const overlay = focusTarget.closest(OVERLAY_SELECTOR)
  if (overlay) {
    overlay.scrollTop = 0
  }

  requestAnimationFrame(() => {
    if (overlay) {
      try {
        overlay.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' })
      } catch {
        overlay.scrollIntoView(true)
      }
    }
    if (!focusTarget.hasAttribute('tabindex')) {
      focusTarget.setAttribute('tabindex', '-1')
    }
    try {
      focusTarget.focus({ preventScroll: false })
    } catch {
      focusTarget.focus()
    }
    try {
      focusTarget.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' })
    } catch {
      focusTarget.scrollIntoView(true)
    }
  })
}

export function bringTopVisibleOverlayIntoView() {
  const nodes = Array.from(document.querySelectorAll(OVERLAY_SELECTOR))
  const visible = nodes.filter((el) => {
    const st = getComputedStyle(el)
    if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity) === 0) {
      return false
    }
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0
  })
  if (!visible.length) return

  const top = visible.reduce((best, el) => {
    const z = parseInt(getComputedStyle(el).zIndex, 10)
    const bz = parseInt(getComputedStyle(best).zIndex, 10)
    const zn = Number.isNaN(z) ? 0 : z
    const bzn = Number.isNaN(bz) ? 0 : bz
    return zn >= bzn ? el : best
  })

  const dialog =
    top.querySelector(
      '.modal-content, .popup-content, .success-popup, .error-popup, .confirm-popup, .validation-popup, [role="dialog"]'
    ) || top

  scrollModalIntoViewport(dialog)
}

/**
 * Observes DOM for modal/popup overlays (covers pages that do not use usePopupFocus).
 * Ref-counted for React StrictMode.
 * @returns {() => void} cleanup
 */
export function installModalViewportScroll() {
  if (typeof window === 'undefined' || typeof MutationObserver === 'undefined') {
    return () => {}
  }

  modalScrollInstallCount += 1
  if (modalScrollInstallCount > 1) {
    return () => {
      modalScrollInstallCount -= 1
      if (modalScrollInstallCount <= 0 && modalScrollTeardown) {
        modalScrollTeardown()
        modalScrollTeardown = null
      }
    }
  }

  let debounceId = null
  const schedule = () => {
    clearTimeout(debounceId)
    debounceId = setTimeout(() => {
      bringTopVisibleOverlayIntoView()
    }, 80)
  }

  const observer = new MutationObserver(schedule)
  observer.observe(document.body, { childList: true, subtree: true })

  const vv = window.visualViewport
  const onVv = () => schedule()
  if (vv) {
    vv.addEventListener('resize', onVv)
    vv.addEventListener('scroll', onVv)
  }

  modalScrollTeardown = () => {
    observer.disconnect()
    clearTimeout(debounceId)
    if (vv) {
      vv.removeEventListener('resize', onVv)
      vv.removeEventListener('scroll', onVv)
    }
  }

  return () => {
    modalScrollInstallCount -= 1
    if (modalScrollInstallCount <= 0 && modalScrollTeardown) {
      modalScrollTeardown()
      modalScrollTeardown = null
    }
  }
}
