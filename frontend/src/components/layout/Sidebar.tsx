import { ChevronDown, ChevronRight, LogOut, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { ADMIN_ICON, ADMIN_NAV, MAIN_NAV } from '../../lib/nav'
import { APP_NAME, APP_TAGLINE } from '../../lib/config'
import { usePulse } from '../../lib/pulse'
import { Avatar } from '../ui/Avatar'
import { PulseMark } from '../ui/Logo'
import { useToast } from '../ui/toast-context'
import { errorMessage } from '../../api/client'

interface Props {
  open: boolean
  onNavigate: () => void
}

export function Sidebar({ open, onNavigate }: Props) {
  const { user, canAny, logout } = useAuth()
  const { online } = usePulse()
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const adminItems = ADMIN_NAV.filter((i) => canAny(...i.any))
  const adminActive = location.pathname.startsWith('/admin')
  // Ouvert d'office dans l'espace Admin ; un clic de l'utilisateur prend ensuite le dessus.
  const [adminToggled, setAdminToggled] = useState<boolean | null>(null)
  const adminOpen = adminToggled ?? adminActive
  const AdminIcon = ADMIN_ICON

  useEffect(() => {
    if (!menuOpen) return
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent) {
        if (e.key === 'Escape') setMenuOpen(false)
      } else if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [menuOpen])

  async function handleLogout() {
    setMenuOpen(false)
    try {
      await logout()
      navigate('/connexion', { replace: true })
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <aside id="sidebar" className={`sidebar ${open ? 'is-open' : ''}`}>
      <div className="sidebar__brand">
        <PulseMark size={84} />
        <p className="sidebar__name">{APP_NAME}</p>
        <p className="sidebar__tag">{APP_TAGLINE}</p>
      </div>

      <nav className="sidebar__nav" aria-label="Navigation principale">
        <ul>
          {MAIN_NAV.filter((i) => canAny(...i.any)).map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink to={to} end={end} className="nav-link" onClick={onNavigate}>
                <Icon size={22} aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
          {adminItems.length > 0 && (
            <li>
              <button
                type="button"
                className={`nav-link nav-link--group ${adminActive ? 'is-active' : ''}`}
                aria-expanded={adminOpen}
                aria-controls="nav-admin"
                onClick={() => setAdminToggled(!adminOpen)}
              >
                <AdminIcon size={22} aria-hidden="true" />
                <span>Admin</span>
                {adminOpen ? <ChevronDown size={18} aria-hidden="true" /> : <ChevronRight size={18} aria-hidden="true" />}
              </button>
              {adminOpen && (
                <ul id="nav-admin" className="subnav">
                  {adminItems.map(({ to, label, icon: Icon }) => (
                    <li key={to}>
                      <NavLink to={to} className="subnav-link" onClick={onNavigate}>
                        <Icon size={18} aria-hidden="true" />
                        <span>{label}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )}
        </ul>
      </nav>

      <div className="sidebar__system">
        <p className="muted">Système</p>
        <p className={`status ${online ? 'status--ok' : 'status--ko'}`}>
          <span className="status__dot" aria-hidden="true" />
          {online ? 'En ligne' : 'Serveur injoignable'}
        </p>
      </div>

      <div className="sidebar__profile" ref={menuRef}>
        {menuOpen && user && (
          <div className="menu" role="menu">
            <button type="button" role="menuitem" className="menu__item" onClick={() => { setMenuOpen(false); navigate('/compte'); onNavigate() }}>
              <UserRound size={18} aria-hidden="true" />
              Mon compte
            </button>
            <button type="button" role="menuitem" className="menu__item menu__item--danger" onClick={() => void handleLogout()}>
              <LogOut size={18} aria-hidden="true" />
              Se déconnecter
            </button>
          </div>
        )}
        <button type="button" className="profile-btn" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
          <Avatar name={user?.full_name || user?.username || '?'} seed={user?.username} size={44} />
          <span className="profile-btn__text">
            <strong>{user?.full_name || user?.username}</strong>
            <span>{user?.role_label}</span>
          </span>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>
    </aside>
  )
}
