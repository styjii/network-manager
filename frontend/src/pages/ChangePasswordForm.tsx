import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { parseValidation } from '../api/client'
import { authApi } from '../api/endpoints'
import { InlineAlert } from '../components/ui/Feedback'
import { PasswordField } from '../components/ui/Field'
import { MIN_PASSWORD_LENGTH } from '../lib/config'
import { changePasswordSchema, type ChangePasswordValues } from './schemas'

export function ChangePasswordForm({ onSuccess }: { onSuccess: () => void | Promise<void> }) {
  const [serverError, setServerError] = useState<string[]>([])
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { current_password: '', new_password: '', confirm: '' },
  })

  async function onSubmit(values: ChangePasswordValues) {
    setServerError([])
    try {
      await authApi.changePassword(values.current_password, values.new_password)
      reset()
      await onSuccess()
    } catch (err) {
      const { fields, global } = parseValidation(err)
      for (const [name, message] of Object.entries(fields)) {
        if (name === 'current_password' || name === 'new_password') setError(name, { message })
      }
      const unmapped = Object.entries(fields).filter(([name]) => name !== 'current_password' && name !== 'new_password').map(([, m]) => m)
      setServerError([...global, ...unmapped])
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="form">
      {serverError.length > 0 && <InlineAlert>{serverError.join(' ')}</InlineAlert>}
      <PasswordField label="Mot de passe actuel" autoComplete="current-password" error={errors.current_password?.message} {...register('current_password')} />
      <PasswordField
        label="Nouveau mot de passe"
        autoComplete="new-password"
        hint={`Au moins ${MIN_PASSWORD_LENGTH} caractères, différent des mots de passe courants.`}
        error={errors.new_password?.message}
        {...register('new_password')}
      />
      <PasswordField label="Confirmer le nouveau mot de passe" autoComplete="new-password" error={errors.confirm?.message} {...register('confirm')} />
      <div className="form__actions">
        <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
          <KeyRound size={18} aria-hidden="true" />
          {isSubmitting ? 'Enregistrement…' : 'Changer le mot de passe'}
        </button>
      </div>
    </form>
  )
}
