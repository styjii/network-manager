export function PulseMark({ size = 56 }: { size?: number }) {
  return (
    <svg className="pulse-mark" width={size} height={size * 0.62} viewBox="0 0 80 50" fill="none" aria-hidden="true">
      <path
        d="M3 27h14l5-9 6 26 8-38 7 33 5-12h9l4-6 3 6"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
