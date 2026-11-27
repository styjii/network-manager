import {
  CircleAlert,
  CircleCheck,
  Download,
  Eye,
  KeyRound,
  LogOut,
  Pencil,
  Plus,
  Power,
  ShieldBan,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import type { AuditActionCode } from '../../api/types'
import { AUDIT_ACTIONS } from '../../lib/labels'

const ICONS: Record<AuditActionCode, LucideIcon> = {
  login: CircleCheck,
  login_failed: CircleAlert,
  lockout: ShieldBan,
  logout: LogOut,
  password_change: KeyRound,
  password_reset: KeyRound,
  create: Plus,
  update: Pencil,
  delete: Trash2,
  view: Eye,
  export: Download,
  remote_action: Power,
}

export function AuditTag({ action, label }: { action: AuditActionCode; label?: string }) {
  const meta = AUDIT_ACTIONS[action] ?? { label: label ?? action, tone: 'slate' as const }
  const Icon = ICONS[action] ?? Eye
  return (
    <span className={`audit-tag audit-tag--${meta.tone}`}>
      <Icon size={16} aria-hidden="true" />
      {label ?? meta.label}
    </span>
  )
}
