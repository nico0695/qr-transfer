import * as m from 'motion/react-m'
import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react'
import { DialogBody } from './components/DialogBody'
import { DialogFooter } from './components/DialogFooter'
import { DialogHeader } from './components/DialogHeader'
import styles from './Dialog.module.css'
import { useReducedMotion, withReducedMotion } from '../../../lib/motion/reducedMotion'
import { sheetEnter } from '../../../lib/motion/presets'
import { useIsDesktop } from '../../../lib/theme/useIsDesktop'

const MotionDialog = m.create('dialog')

export interface DialogProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  closeOnBackdropClick?: boolean
}

function DialogRoot({ open, onClose, children, closeOnBackdropClick = true }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const isDesktop = useIsDesktop()
  const reduced = useReducedMotion()
  const closeTimer = useRef<number | undefined>(undefined)
  const closedRef = useRef(false)

  const variant = withReducedMotion(sheetEnter(isDesktop ? 'modal' : 'sheet'), reduced)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      closedRef.current = false
    } else if (!open && dialog.open) {
      const durationMs = reduced
        ? 0
        : ((variant.transition?.duration as number | undefined) ?? 0) * 1000
      if (durationMs === 0) {
        dialog.close()
      } else {
        closeTimer.current = window.setTimeout(() => {
          if (!closedRef.current) {
            closedRef.current = true
            dialog.close()
          }
        }, durationMs)
      }
    }
    return () => window.clearTimeout(closeTimer.current)
  }, [open, reduced, variant.transition])

  function handleClose() {
    onClose()
  }

  function handleExitComplete() {
    const dialog = ref.current
    if (!open && dialog?.open && !closedRef.current) {
      closedRef.current = true
      window.clearTimeout(closeTimer.current)
      dialog.close()
    }
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (closeOnBackdropClick && event.target === ref.current) {
      onClose()
    }
  }

  return (
    <MotionDialog
      ref={ref}
      className={`${styles.dialog} ${isDesktop ? styles.modal : styles.sheet}`}
      onClose={handleClose}
      onClick={handleBackdropClick}
      initial={variant.initial}
      animate={open ? variant.animate : (variant.exit ?? variant.initial)}
      transition={variant.transition}
      onAnimationComplete={handleExitComplete}
    >
      {children}
    </MotionDialog>
  )
}

export const Dialog = Object.assign(DialogRoot, {
  Header: DialogHeader,
  Body: DialogBody,
  Footer: DialogFooter,
})
