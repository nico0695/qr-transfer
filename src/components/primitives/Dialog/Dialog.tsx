import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react'
import { DialogBody } from './components/DialogBody'
import { DialogFooter } from './components/DialogFooter'
import { DialogHeader } from './components/DialogHeader'
import styles from './Dialog.module.css'
import { useIsDesktop } from './useIsDesktop'

export interface DialogProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  closeOnBackdropClick?: boolean
}

function DialogRoot({ open, onClose, children, closeOnBackdropClick = true }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const isDesktop = useIsDesktop()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  function handleClose() {
    onClose()
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (closeOnBackdropClick && event.target === ref.current) {
      onClose()
    }
  }

  return (
    <dialog
      ref={ref}
      className={`${styles.dialog} ${isDesktop ? styles.modal : styles.sheet}`}
      onClose={handleClose}
      onClick={handleBackdropClick}
    >
      {children}
    </dialog>
  )
}

export const Dialog = Object.assign(DialogRoot, {
  Header: DialogHeader,
  Body: DialogBody,
  Footer: DialogFooter,
})
