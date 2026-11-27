import { hueFor, initials } from '../../lib/format'

export function Avatar({ name, seed, size = 34 }: { name: string; seed?: string; size?: number }) {
  const hue = hueFor(seed ?? name)
  return (
    <span
      className="avatar"
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: size * 0.38, background: `linear-gradient(145deg, hsl(${hue} 70% 55%), hsl(${(hue + 40) % 360} 65% 38%))` }}
    >
      {initials(name)}
    </span>
  )
}
