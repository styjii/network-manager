import { zodResolver } from '@hookform/resolvers/zod'
import { LogIn } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { InlineAlert } from '../components/ui/Feedback'
import { PasswordField, TextField } from '../components/ui/Field'
import { PulseMark } from '../components/ui/Logo'
import { APP_NAME, APP_TAGLINE } from '../lib/config'
import { loginSchema, type LoginValues } from './schemas'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [serverError, setServerError] = useState<string | null>(null)
  const from = (location.state as { from?: string } | null)?.from

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { username: '', password: '' } })

  async function onSubmit(values: LoginValues) {
    setServerError(null)
    try {
      const me = await login(values.username, values.password)
      navigate(me.must_change_password ? '/changer-mot-de-passe' : from && from !== '/connexion' ? from : '/', { replace: true })
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Connexion impossible pour le moment.')
    }
  }

  return (
    <main className="auth">
      <section className="auth__card" aria-labelledby="login-title">
        <div className="auth__brand">
          <PulseMark size={92} />
          <p className="sidebar__name">{APP_NAME}</p>
          <p className="sidebar__tag">{APP_TAGLINE}</p>
        </div>
        <h1 id="login-title">Connexion</h1>
        <p className="muted">Identifiez-vous pour accéder à la supervision du réseau.</p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="form">
          {serverError && <InlineAlert>{serverError}</InlineAlert>}
          <TextField label="Nom d’utilisateur" autoComplete="username" autoCapitalize="none" spellCheck={false} autoFocus error={errors.username?.message} {...register('username')} />
          <PasswordField label="Mot de passe" autoComplete="current-password" error={errors.password?.message} {...register('password')} />
          <button type="submit" className="btn btn--primary btn--block" disabled={isSubmitting}>
            <LogIn size={18} aria-hidden="true" />
            {isSubmitting ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
        <p className="auth__foot muted">Accès réservé aux utilisateurs autorisés. Chaque connexion est enregistrée dans le journal d’audit.</p>
      </section>
    </main>
  )
}
