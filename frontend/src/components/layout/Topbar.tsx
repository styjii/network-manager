import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { Bell, Menu, Moon, RefreshCw, Search, Sun } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { formatDateTime } from '../../lib/format'
import { useUrlState } from '../../lib/hooks'
import { usePulse } from '../../lib/pulse'
import { useTheme } from '../../theme/context'

/** Pages dont la recherche est branchée sur l'API (paramètre d'URL « q »). */
const SEARCH_PLACEHOLDERS: Record<string, string> = {
  '/admin/utilisateurs': 'Rechercher un utilisateur...',
  '/admin/audit': 'Rechercher dans le journal d’audit...',
}

interface Props {
  menuOpen: boolean
  onMenu: () => void
}

export function Topbar({ menuOpen, onMenu }: Props) {
  const qc = useQueryClient()
  const fetching = useIsFetching() > 0
  const { online, updatedAt } = usePulse()
  const { theme, toggle } = useTheme()
  const { can } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [{ q }, setUrl] = useUrlState(['q'])
  const placeholder = SEARCH_PLACEHOLDERS[pathname]

  return (
    <div className="topbar">
      <button type="button" className="icon-btn topbar__menu" aria-label="Ouvrir le menu" aria-expanded={menuOpen} aria-controls="sidebar" onClick={onMenu}>
        <Menu size={22} aria-hidden="true" />
      </button>

      <form className={`search ${placeholder ? '' : 'search--off'}`} role="search" onSubmit={(e) => e.preventDefault()}>
        <Search size={20} aria-hidden="true" />
        <input
          type="search"
          aria-label="Recherche"
          placeholder={placeholder ?? 'Recherche indisponible sur cette page'}
          disabled={!placeholder}
          value={placeholder ? q : ''}
          onChange={(e) => setUrl({ q: e.target.value })}
        />
      </form>

      <div className="topbar__right">
        <p className={`status topbar__stamp ${online ? 'status--ok' : 'status--ko'}`}>
          <span className="status__dot" aria-hidden="true" />
          <span>
            <span className="topbar__stamp-label">{online ? 'Mis à jour : ' : 'Serveur injoignable · dernière mise à jour : '}</span>
            <time dateTime={new Date(updatedAt).toISOString()}>{formatDateTime(updatedAt, true)}</time>
          </span>
        </p>
        <button type="button" className="icon-btn icon-btn--lg" aria-label="Actualiser les données" onClick={() => void qc.invalidateQueries()}>
          <RefreshCw size={20} aria-hidden="true" className={fetching ? 'spin' : ''} />
        </button>
        <button
          type="button"
          className="icon-btn icon-btn--lg"
          aria-label="Alertes"
          disabled={!can('alerts.view')}
          onClick={() => navigate('/alertes')}
        >
          <Bell size={20} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="icon-btn icon-btn--lg"
          aria-label={theme === 'dark' ? 'Passer au thème clair' : 'Passer au thème sombre'}
          onClick={toggle}
        >
          {theme === 'dark' ? <Moon size={20} aria-hidden="true" /> : <Sun size={20} aria-hidden="true" />}
        </button>
      </div>
    </div>
  )
}
