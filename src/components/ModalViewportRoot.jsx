import { useEffect } from 'react'
import { installModalViewportScroll } from '../utils/modalViewportScroll'

/** Installs global modal scroll-into-view on all routes (desktop and touch). */
export default function ModalViewportRoot({ children }) {
  useEffect(() => installModalViewportScroll(), [])
  return children
}
