import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(id)
  }, [value, delay])
  return debounced
}

/** État de filtre stocké dans l'URL (retour arrière, lien partageable). Changer un filtre revient à la page 1. */
export function useUrlState(keys: string[]) {
  const [params, setParams] = useSearchParams()
  const values: Record<string, string> = {}
  for (const key of keys) values[key] = params.get(key) ?? ''

  const set = useCallback(
    (patch: Record<string, string | number | null>, keepPage = false) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [k, v] of Object.entries(patch)) {
            if (v === null || v === '' || v === undefined) next.delete(k)
            else next.set(k, String(v))
          }
          if (!keepPage && !('page' in patch)) next.delete('page')
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )
  return [values, set] as const
}

export function usePage(): [number, (page: number) => void] {
  const [params, setParams] = useSearchParams()
  const raw = Number(params.get('page'))
  const page = Number.isInteger(raw) && raw > 0 ? raw : 1
  const setPage = useCallback(
    (p: number) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (p <= 1) next.delete('page')
          else next.set('page', String(p))
          return next
        },
        { replace: true },
      ),
    [setParams],
  )
  return [page, setPage]
}
