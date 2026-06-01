export type Season = 'summer' | 'autumn' | 'winter' | 'spring'

export function getCurrentSeason(): Season {
  const month = new Date().getMonth() + 1 // 1–12
  if ([12, 1, 2].includes(month)) return 'summer'
  if ([3, 4, 5].includes(month))  return 'autumn'
  if ([6, 7, 8].includes(month))  return 'winter'
  return 'spring'
}

export const SEASON_META: Record<Season, {
  label: string
  headline: string
  sub: string
  emoji: string
  palette: { from: string; to: string } // for gradient hero overlays
}> = {
  summer: {
    label: 'Summer',
    headline: 'Beat the heat. Hit the coast.',
    sub: "Victoria's best beaches and coastal escapes, curated for this weekend.",
    emoji: '☀️',
    palette: { from: '#0a4a6e', to: '#0e7490' },
  },
  autumn: {
    label: 'Autumn',
    headline: 'Chase the colours before they\'re gone.',
    sub: 'Bright, the Yarra Valley, and the ranges at their absolute peak.',
    emoji: '🍂',
    palette: { from: '#7c2d12', to: '#c2410c' },
  },
  winter: {
    label: 'Winter',
    headline: 'The best weekends are the cosy ones.',
    sub: 'Hot springs, mineral baths, crackling fires — Victoria\'s regional towns come alive in the cold.',
    emoji: '☕',
    palette: { from: '#1A3A2A', to: '#7A3D0A' },
  },
  spring: {
    label: 'Spring',
    headline: 'Victoria just woke up. Time to explore.',
    sub: 'Wildflowers in the Grampians, blossom in the Dandenongs, vineyards coming back to life.',
    emoji: '🌸',
    palette: { from: '#14532d', to: '#16a34a' },
  },
}
