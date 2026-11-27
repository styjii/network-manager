import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function AppShell() {
  const { pathname } = useLocation()
  // Le tiroir (mobile) est lié à la page où il a été ouvert : changer de page le referme sans effet de bord.
  const [openAt, setOpenAt] = useState<string | null>(null)
  const open = openAt === pathname
  const setOpen = (value: boolean | ((o: boolean) => boolean)) => {
    const next = typeof value === 'function' ? value(open) : value
    setOpenAt(next ? pathname : null)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenAt(null)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="shell">
      <a href="#contenu" className="skip-link">
        Aller au contenu
      </a>
      <Sidebar open={open} onNavigate={() => setOpen(false)} />
      {open && <div className="scrim" onClick={() => setOpen(false)} aria-hidden="true" />}
      <div className="shell__main">
        <Topbar menuOpen={open} onMenu={() => setOpen((o) => !o)} />
        <main id="contenu" className="content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
