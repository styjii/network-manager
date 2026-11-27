import { PulseMark } from './Logo'

interface Props {
  title?: string
  message?: string
  actionLabel?: string
  onAction?: () => void
}

export function SplashScreen({ title, message, actionLabel, onAction }: Props) {
  return (
    <div className="splash" role={title ? 'alert' : 'status'} aria-live="polite">
      <PulseMark size={72} />
      {title ? (
        <>
          <h1>{title}</h1>
          {message && <p>{message}</p>}
          {actionLabel && (
            <button type="button" className="btn btn--primary" onClick={onAction}>
              {actionLabel}
            </button>
          )}
        </>
      ) : (
        <p>Chargement…</p>
      )}
    </div>
  )
}
