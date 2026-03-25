import { useEffect } from 'react'
import { installModalViewportScroll } from '../utils/modalViewportScroll'

/** Installs global modal scroll-into-view for touch/tablet (e.g. iPad) on all routes. */
export default function ModalViewportRoot({ children }) {
  useEffect(() => installModalViewportScroll(), [])
  return children
}
