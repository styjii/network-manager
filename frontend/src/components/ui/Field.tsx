import { Eye, EyeOff } from 'lucide-react'
import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'

interface FieldShellProps {
  label: string
  error?: string
  hint?: string
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode
}

function FieldShell({ label, error, hint, children }: FieldShellProps) {
  const id = useId()
  const msgId = `${id}-msg`
  const describedBy = error || hint ? msgId : undefined
  return (
    <div className={`field ${error ? 'field--error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {error ? (
        <p id={msgId} className="field__error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={msgId} className="field__hint">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

interface TextProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
}

export const TextField = forwardRef<HTMLInputElement, TextProps>(function TextField({ label, error, hint, ...rest }, ref) {
  return (
    <FieldShell label={label} error={error} hint={hint}>
      {({ id, describedBy, invalid }) => <input ref={ref} id={id} className="input" aria-invalid={invalid} aria-describedby={describedBy} {...rest} />}
    </FieldShell>
  )
})

export const PasswordField = forwardRef<HTMLInputElement, TextProps>(function PasswordField({ label, error, hint, ...rest }, ref) {
  const [shown, setShown] = useState(false)
  return (
    <FieldShell label={label} error={error} hint={hint}>
      {({ id, describedBy, invalid }) => (
        <div className="input-wrap">
          <input ref={ref} id={id} className="input" type={shown ? 'text' : 'password'} aria-invalid={invalid} aria-describedby={describedBy} {...rest} />
          <button
            type="button"
            className="icon-btn icon-btn--ghost input-wrap__btn"
            aria-label={shown ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            aria-pressed={shown}
            onClick={() => setShown((s) => !s)}
          >
            {shown ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        </div>
      )}
    </FieldShell>
  )
})

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  hint?: string
}

export const SelectField = forwardRef<HTMLSelectElement, SelectProps>(function SelectField({ label, error, hint, children, ...rest }, ref) {
  return (
    <FieldShell label={label} error={error} hint={hint}>
      {({ id, describedBy, invalid }) => (
        <select ref={ref} id={id} className="input input--select" aria-invalid={invalid} aria-describedby={describedBy} {...rest}>
          {children}
        </select>
      )}
    </FieldShell>
  )
})

export function SwitchField({ label, hint, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const id = useId()
  return (
    <div className="switch-field">
      <input id={id} type="checkbox" role="switch" className="switch" {...rest} />
      <label htmlFor={id}>
        {label}
        {hint && <span className="field__hint">{hint}</span>}
      </label>
    </div>
  )
}
