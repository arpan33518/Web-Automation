const COLORS = [
  "#dc2626", // red
  "#ea580c", // orange
  "#d97706", // amber
  "#16a34a", // green
  "#0d9488", // teal
  "#0284c7", // light blue
  "#2563eb", // blue
  "#7c3aed", // violet
  "#c026d3", // fuchsia
  "#e11d48", // rose
]

export function getUserColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  return COLORS[Math.abs(hash) % COLORS.length]
}
