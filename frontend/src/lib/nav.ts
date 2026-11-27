import {
  Bell,
  Cog,
  Database,
  FileClock,
  History,
  House,
  Monitor,
  Network,
  ScrollText,
  Server,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** L'entrée s'affiche si l'utilisateur détient au moins une de ces permissions. */
  any: string[]
  end?: boolean
}

export const MAIN_NAV: NavItem[] = [
  { to: '/', label: 'Tableau de bord', icon: House, any: ['dashboard.view'], end: true },
  { to: '/machines', label: 'Machines', icon: Monitor, any: ['machines.view'] },
  { to: '/services', label: 'Services', icon: Cog, any: ['services.view'] },
  { to: '/reseau', label: 'Réseau', icon: Network, any: ['machines.view'] },
  { to: '/serveurs', label: 'Serveurs', icon: Server, any: ['servers.view'] },
  { to: '/alertes', label: 'Alertes', icon: Bell, any: ['alerts.view'] },
  { to: '/historique', label: 'Historique', icon: History, any: ['history.view'] },
  { to: '/parametres', label: 'Paramètres', icon: Settings, any: ['settings.view'] },
]

export const ADMIN_NAV: NavItem[] = [
  { to: '/admin/utilisateurs', label: 'Utilisateurs', icon: Users, any: ['users.view'] },
  { to: '/admin/roles', label: 'Rôles & Permissions', icon: UserCog, any: ['users.view'] },
  { to: '/admin/audit', label: 'Journal d’audit', icon: ScrollText, any: ['audit.view'] },
  { to: '/admin/sauvegardes', label: 'Sauvegardes', icon: Database, any: ['backups.view'] },
]

export const ADMIN_ICON = ShieldCheck
export const PENDING_ICON = FileClock
