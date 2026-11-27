import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md'
  /** Empêche la fermeture pendant un envoi. */
  busy?: boolean
}

/** Boîte de dialogue basée sur <dialog> : piège le focus, se ferme avec Échap, restaure le focus. */
export function Modal({ open, onClose, title, description, children, footer, size = 'md', busy = false }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={`modal modal--${size}`}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault()
        if (!busy) onClose()
      }}
      onMouseDown={(e) => {
        if (e.target === ref.current && !busy) onClose()
      }}
    >
      {open && (
        <div className="modal__panel">
          <header className="modal__head">
            <div>
              <h2 id={titleId}>{title}</h2>
              {description && (
                <p id={descId} className="muted">
                  {description}
                </p>
              )}
            </div>
            <button type="button" className="icon-btn icon-btn--ghost" aria-label="Fermer" onClick={onClose} disabled={busy}>
              <X size={18} aria-hidden="true" />
            </button>
          </header>
          <div className="modal__body">{children}</div>
          {footer && <footer className="modal__foot">{footer}</footer>}
        </div>
      )}
    </dialog>
  )
}
