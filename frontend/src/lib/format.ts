import { APP_TIMEZONE } from './config'

function parts(date: Date, withSeconds: boolean): Record<string, string> {
  const fmt = new Intl.DateTimeFormat('fr-FR', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    ...(withSeconds ? { second: '2-digit' } : {}),
    hourCycle: 'h23',
  })
  return Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]))
}

/** 23/11/2026 15:42 (ou 15:42:17 avec les secondes). */
export function formatDateTime(value: string | number | Date | null | undefined, withSeconds = false): string {
  if (value === null || value === undefined || value === '') return '–'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '–'
  const p = parts(date, withSeconds)
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}${withSeconds ? `:${p.second}` : ''}`
}

export function formatPercent(value: number): string {
  return `${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)} %`
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return '?'
  const letters = words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[words.length - 1][0]
  return letters.toUpperCase()
}

/** Teinte stable (0-359) dérivée d'un texte, pour les avatars. */
export function hueFor(text: string): number {
  let h = 0
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) % 360
  return h
}
