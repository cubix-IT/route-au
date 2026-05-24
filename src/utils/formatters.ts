export function formatKm(km: number): string {
  return km >= 1000 ? `${(km / 1000).toFixed(1)}k km` : `${Math.round(km)} km`
}

export function formatHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function formatTemp(celsius: number): string {
  return `${Math.round(celsius)}°C`
}

export function formatFuelPrice(cpl: number): string {
  return `${cpl.toFixed(1)}c/L`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}
