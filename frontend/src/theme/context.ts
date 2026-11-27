import { createContext, useContext } from 'react'

export type Theme = 'dark' | 'light'

export interface ThemeValue {
  theme: Theme
  toggle: () => void
}

export const ThemeContext = createContext<ThemeValue | null>(null)

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme doit être utilisé dans <ThemeProvider>.')
  return ctx
}
