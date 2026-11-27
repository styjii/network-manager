import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { parseValidation } from '../../api/client'
import { useCreateUser, useUpdateUser } from '../../api/queries'
import type { User, UserCreated } from '../../api/types'
import { InlineAlert } from '../../components/ui/Feedback'
import { PasswordField, SelectField, SwitchField, TextField } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/toast-context'
import { ROLE_LABELS, ROLE_ORDER } from '../../lib/labels'
import { createUserSchema, editUserSchema, type CreateUserValues, type EditUserValues } from '../schemas'

interface Props {
  /** null : création ; un utilisateur : modification. */
  user: User | null
  open: boolean
  isSelf: boolean
  onClose: () => void
  onCreated: (user: UserCreated) => void
}

export function UserFormModal({ user, open, isSelf, onClose, onCreated }: Props) {
  // Le formulaire est monté à l'ouverture seulement : ses valeurs repartent à zéro à chaque fois.
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={user ? 'Modifier l’utilisateur' : 'Nouvel utilisateur'}
      description={user ? `Compte : ${user.username}` : 'Un mot de passe temporaire sera généré si vous n’en choisissez pas.'}
    >
      {user ? <EditForm user={user} isSelf={isSelf} onClose={onClose} /> : <CreateForm onClose={onClose} onCreated={onCreated} />}
    </Modal>
  )
}

function RoleOptions() {
  return (
    <>
      {ROLE_ORDER.map((r) => (
        <option key={r} value={r}>
          {ROLE_LABELS[r]}
        </option>
      ))}
    </>
  )
}

function CreateForm({ onClose, onCreated }: { onClose: () => void; onCreated: (u: UserCreated) => void }) {
  const create = useCreateUser()
  const toast = useToast()
  const [globalErrors, setGlobalErrors] = useState<string[]>([])
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { username: '', full_name: '', email: '', role: 'guest', is_active: true, password: '' },
  })

  async function onSubmit(values: CreateUserValues) {
    setGlobalErrors([])
    try {
      const created = await create.mutateAsync({ ...values, password: values.password || undefined })
      toast.success(`Utilisateur « ${created.username} » créé.`)
      onCreated(created)
    } catch (err) {
      const { fields, global } = parseValidation(err)
      const known = ['username', 'full_name', 'email', 'role', 'is_active', 'password'] as const
      const rest: string[] = [...global]
      for (const [name, message] of Object.entries(fields)) {
        if ((known as readonly string[]).includes(name)) setError(name as (typeof known)[number], { message })
        else rest.push(message)
      }
      setGlobalErrors(rest)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="form">
      {globalErrors.length > 0 && <InlineAlert>{globalErrors.join(' ')}</InlineAlert>}
      <TextField label="Nom d’utilisateur" autoComplete="off" autoCapitalize="none" spellCheck={false} autoFocus error={errors.username?.message} {...register('username')} />
      <TextField label="Nom complet" autoComplete="off" error={errors.full_name?.message} {...register('full_name')} />
      <TextField label="Adresse e-mail" type="email" autoComplete="off" error={errors.email?.message} {...register('email')} />
      <SelectField label="Rôle" error={errors.role?.message} {...register('role')}>
        <RoleOptions />
      </SelectField>
      <PasswordField
        label="Mot de passe temporaire (facultatif)"
        autoComplete="new-password"
        hint="Laissez vide pour en générer un automatiquement."
        error={errors.password?.message}
        {...register('password')}
      />
      <SwitchField label="Compte actif" {...register('is_active')} />
      <div className="form__actions">
        <button type="button" className="btn btn--ghost" onClick={onClose} disabled={create.isPending}>
          Annuler
        </button>
        <button type="submit" className="btn btn--primary" disabled={create.isPending}>
          {create.isPending ? 'Création…' : 'Créer le compte'}
        </button>
      </div>
    </form>
  )
}

function EditForm({ user, isSelf, onClose }: { user: User; isSelf: boolean; onClose: () => void }) {
  const update = useUpdateUser()
  const toast = useToast()
  const [globalErrors, setGlobalErrors] = useState<string[]>([])
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<EditUserValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: { full_name: user.full_name, email: user.email, role: user.role, is_active: user.is_active },
  })

  async function onSubmit(values: EditUserValues) {
    setGlobalErrors([])
    try {
      await update.mutateAsync({ id: user.id, data: values })
      toast.success(`Utilisateur « ${user.username} » modifié.`)
      onClose()
    } catch (err) {
      const { fields, global } = parseValidation(err)
      const known = ['full_name', 'email', 'role', 'is_active'] as const
      const rest: string[] = [...global]
      for (const [name, message] of Object.entries(fields)) {
        if ((known as readonly string[]).includes(name)) setError(name as (typeof known)[number], { message })
        else rest.push(message)
      }
      setGlobalErrors(rest)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="form">
      {globalErrors.length > 0 && <InlineAlert>{globalErrors.join(' ')}</InlineAlert>}
      {isSelf && <InlineAlert tone="info">Vous ne pouvez modifier ni votre propre rôle ni votre propre statut.</InlineAlert>}
      <TextField label="Nom complet" autoComplete="off" autoFocus error={errors.full_name?.message} {...register('full_name')} />
      <TextField label="Adresse e-mail" type="email" autoComplete="off" error={errors.email?.message} {...register('email')} />
      <SelectField label="Rôle" disabled={isSelf} error={errors.role?.message} {...register('role')}>
        <RoleOptions />
      </SelectField>
      <SwitchField label="Compte actif" hint="Un compte désactivé ne peut plus se connecter." disabled={isSelf} {...register('is_active')} />
      <div className="form__actions">
        <button type="button" className="btn btn--ghost" onClick={onClose} disabled={update.isPending}>
          Annuler
        </button>
        <button type="submit" className="btn btn--primary" disabled={update.isPending}>
          {update.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </form>
  )
}
