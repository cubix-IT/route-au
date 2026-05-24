import type { GuardrailWarning, Itinerary, ScoredPOI } from '@/types'

const STINGER_MONTHS = [11, 12, 1, 2, 3, 4, 5] // Nov–May

export function checkStingerSeason(
  itinerary: Itinerary,
  pois: ScoredPOI[]
): GuardrailWarning[] {
  const warnings: GuardrailWarning[] = []
  const tripMonth = new Date(itinerary.start_date).getMonth() + 1

  if (!STINGER_MONTHS.includes(tripMonth)) return []

  const tropicalPOIs = pois.filter((p) => p.is_tropical_north)
  const hasTropicalCorridor = itinerary.route.corridor_ids.some((id) =>
    ['explorers-way', 'savannah-way', 'gibb-river-road'].includes(id)
  )

  if (hasTropicalCorridor || tropicalPOIs.length > 0) {
    warnings.push({
      id: 'stinger-season-general',
      type: 'STINGER_SEASON',
      severity: 'NOTICE',
      message:
        '[SAFETY NOTICE] Your trip passes through tropical northern Australia during stinger season (November–May). ' +
        'Box jellyfish and Irukandji are present in coastal and estuarine waters. ' +
        'Swim only in designated stinger net enclosures or wear a full-body stinger suit. ' +
        'Some inland creek crossings may also be impassable due to wet season flooding.',
    })
  }

  for (const poi of tropicalPOIs) {
    warnings.push({
      id: `stinger-poi-${poi.id}`,
      type: 'STINGER_SEASON',
      severity: 'NOTICE',
      message:
        `[STINGER SEASON] ${poi.name} is in the tropical north. Marine stingers are active (Nov–May). ` +
        `Check local conditions and use stinger protection before swimming.`,
    })
  }

  return warnings
}
