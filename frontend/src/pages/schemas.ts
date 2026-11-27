import { z } from 'zod'
import { MIN_PASSWORD_LENGTH } from '../lib/config'

const ROLES = ['admin', 'supervisor', 'operator', 'developer', 'guest'] as const

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Saisissez votre nom d’utilisateur.'),
  password: z.string().min(1, 'Saisissez votre mot de passe.'),
})
export type LoginValues = z.infer<typeof loginSchema>

// Mêmes règles que le serveur (accounts/serializers.py) : le serveur reste l'autorité.
const USERNAME_RE = /^[a-z0-9_.-]{3,30}$/

export const createUserSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(USERNAME_RE, '3 à 30 caractères : lettres minuscules, chiffres, point, tiret ou tiret bas.'),
  full_name: z.string().trim().max(150, '150 caractères au maximum.'),
  email: z.union([z.literal(''), z.email('Adresse e-mail invalide.')]),
  role: z.enum(ROLES),
  is_active: z.boolean(),
  password: z.union([z.literal(''), z.string().min(MIN_PASSWORD_LENGTH, `Au moins ${MIN_PASSWORD_LENGTH} caractères, ou laissez vide pour en générer un.`)]),
})
export type CreateUserValues = z.infer<typeof createUserSchema>

// role et is_active sont absents des valeurs quand le champ est désactivé (modification de son propre compte).
export const editUserSchema = z.object({
  full_name: z.string().trim().max(150, '150 caractères au maximum.'),
  email: z.union([z.literal(''), z.email('Adresse e-mail invalide.')]),
  role: z.enum(ROLES).optional(),
  is_active: z.boolean().optional(),
})
export type EditUserValues = z.infer<typeof editUserSchema>

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Saisissez votre mot de passe actuel.'),
    new_password: z.string().min(MIN_PASSWORD_LENGTH, `Au moins ${MIN_PASSWORD_LENGTH} caractères.`),
    confirm: z.string().min(1, 'Confirmez le nouveau mot de passe.'),
  })
  .refine((v) => v.new_password === v.confirm, { path: ['confirm'], message: 'Les deux mots de passe ne correspondent pas.' })
  .refine((v) => v.new_password !== v.current_password, { path: ['new_password'], message: 'Le nouveau mot de passe doit être différent de l’ancien.' })
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>
