import type { AuditActionCode, Role } from '../api/types'

export type Tone = 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'slate' | 'cyan'

export const ROLE_ORDER: Role[] = ['admin', 'supervisor', 'operator', 'developer', 'guest']

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrateur',
  supervisor: 'Superviseur',
  operator: 'Opérateur',
  developer: 'Développeur',
  guest: 'Invité',
}

/** Une couleur par rôle, la même dans les badges, l'anneau de répartition et la matrice. */
export const ROLE_TONES: Record<Role, Tone> = {
  admin: 'blue',
  supervisor: 'purple',
  operator: 'green',
  developer: 'orange',
  guest: 'slate',
}

export const TONE_HEX: Record<Tone, string> = {
  blue: '#2d8cff',
  green: '#22c58b',
  purple: '#9a63f5',
  orange: '#f5a524',
  red: '#ff5468',
  slate: '#7f93b8',
  cyan: '#19d3f3',
}

export const AUDIT_ACTIONS: Record<AuditActionCode, { label: string; tone: Tone }> = {
  login: { label: 'Connexion', tone: 'green' },
  login_failed: { label: 'Échec de connexion', tone: 'red' },
  lockout: { label: 'Verrouillage du compte', tone: 'red' },
  logout: { label: 'Déconnexion', tone: 'slate' },
  password_change: { label: 'Changement de mot de passe', tone: 'purple' },
  password_reset: { label: 'Réinitialisation du mot de passe', tone: 'purple' },
  create: { label: 'Création', tone: 'green' },
  update: { label: 'Modification', tone: 'blue' },
  delete: { label: 'Suppression', tone: 'red' },
  view: { label: 'Consultation', tone: 'cyan' },
  export: { label: 'Export', tone: 'orange' },
  remote_action: { label: 'Action distante', tone: 'orange' },
}

export const OBJECT_TYPE_LABELS: Record<string, string> = {
  user: 'Utilisateur',
  machine: 'Machine',
  service: 'Service',
  alert: 'Alerte',
  setting: 'Paramètre',
  backup: 'Sauvegarde',
}

export interface PermissionGroup {
  key: string
  label: string
  permissions: Record<string, string>
}

/** Libellés des codes de permission renvoyés par GET /roles (un code inconnu s'affiche tel quel). */
export const PERMISSION_GROUPS: PermissionGroup[] = [
  { key: 'dashboard', label: 'Tableau de bord', permissions: { 'dashboard.view': 'Consulter' } },
  { key: 'machines', label: 'Machines', permissions: { 'machines.view': 'Consulter', 'machines.manage': 'Ajouter, modifier, supprimer' } },
  { key: 'services', label: 'Services', permissions: { 'services.view': 'Consulter', 'services.manage': 'Ajouter, modifier, supprimer' } },
  {
    key: 'servers',
    label: 'Serveurs',
    permissions: {
      'servers.view': 'Consulter',
      'servers.manage': 'Gérer',
      'servers.test': 'Lancer un test',
      'servers.logs': 'Voir les journaux',
      'servers.restart': 'Redémarrer à distance',
    },
  },
  {
    key: 'alerts',
    label: 'Alertes',
    permissions: { 'alerts.view': 'Consulter', 'alerts.respond': 'Acquitter et résoudre', 'alerts.manage': 'Gérer les règles' },
  },
  { key: 'history', label: 'Historique', permissions: { 'history.view': 'Consulter', 'history.export': 'Exporter' } },
  {
    key: 'settings',
    label: 'Paramètres',
    permissions: { 'settings.view': 'Consulter', 'settings.monitoring': 'Modifier la surveillance', 'settings.edit': 'Tout modifier' },
  },
  { key: 'users', label: 'Utilisateurs', permissions: { 'users.view': 'Consulter', 'users.manage': 'Gérer les comptes' } },
  { key: 'audit', label: 'Journal d’audit', permissions: { 'audit.view': 'Consulter' } },
  { key: 'backups', label: 'Sauvegardes', permissions: { 'backups.view': 'Consulter', 'backups.manage': 'Créer et restaurer' } },
  { key: 'api', label: 'API', permissions: { 'api.docs': 'Documentation' } },
]

export function permissionLabel(code: string): string {
  for (const group of PERMISSION_GROUPS) if (code in group.permissions) return group.permissions[code]
  return code
}
