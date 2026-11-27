import type { QueryClient } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import { ApiError } from '../api/client'

interface Pulse {
  online: boolean
  updatedAt: number
}

let state: Pulse = { online: true, updatedAt: Date.now() }
const listeners = new Set<() => void>()

function set(next: Partial<Pulse>) {
  state = { ...state, ...next }
  listeners.forEach((l) => l())
}

/** Observe le cache de requêtes : heure de la dernière donnée reçue et joignabilité du serveur. */
export function startPulse(qc: QueryClient): () => void {
  return qc.getQueryCache().subscribe((event) => {
    if (event.type !== 'updated') return
    if (event.action.type === 'success') set({ online: true, updatedAt: Date.now() })
    if (event.action.type === 'error' && event.action.error instanceof ApiError && event.action.error.isConnectivity) set({ online: false })
  })
}

export function usePulse(): Pulse {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => state,
  )
}
