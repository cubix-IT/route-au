import type { ItineraryDay, ScheduleItem, ScoredPOI } from '@/types'
import { getActivitiesForSubDest } from '@/data/victorianActivities.ts'

let itemCounter = 0
const nextId = () => `si-${++itemCounter}`

function addMinutes(baseHour: number, baseMin: number, mins: number): { h: number; m: number } {
  const total = baseHour * 60 + baseMin + mins
  return { h: Math.floor(total / 60) % 24, m: total % 60 }
}

function fmt(h: number, m: number): string {
  const period = h < 12 ? 'am' : 'pm'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

const ACT_DURATION: Record<string, number> = {
  nature: 75, wildlife: 60, food: 60, drink: 75,
  history: 50, art: 45, family: 90, active: 90,
  relaxation: 60, markets: 60, viewpoint: 25,
}

const POI_DURATIONS: Record<string, number> = {
  Hiking: 75, Chilling: 60, Lookouts: 25, Photography: 45,
  Wildlife: 40, History: 50, Beach: 60, FreeCamping: 30,
  HotSprings: 120, FamilyAttractions: 90, Markets: 60,
  Cycling: 90, Wineries: 75, CraftBeer: 60, Stargazing: 60,
}

const POI_EMOJI: Record<string, string> = {
  Hiking: '🥾', Chilling: '🏖️', Lookouts: '👁️', Photography: '📷',
  Wildlife: '🦘', History: '🏛️', Beach: '🌊', FreeCamping: '⛺',
  HotSprings: '♨️', FamilyAttractions: '🎠', Markets: '🛒',
  Cycling: '🚵', Wineries: '🍷', CraftBeer: '🍺', Stargazing: '🌌',
}

export function buildDaySchedule(
  day: ItineraryDay,
  _corridorId: string,
  destId: string,
  originLabel: string,
  pois: ScoredPOI[],
  _diningPrefs: string[],
  departureHour = 7,
  isLastDay = false,
  hasKids = false,
  isDayTrip = false,
): ScheduleItem[] {
  const items: ScheduleItem[] = []
  let h = departureHour
  let m = 0

  const driveKm = Math.round(day.drive_km)
  const driveHours = day.drive_hours
  const driveMinutes = Math.round(driveHours * 60)

  const lastWaypoint = day.waypoints[day.waypoints.length - 1]
  const arriveLabel = lastWaypoint?.label ?? 'Destination'

  // ── Day trip: drive → arrive → activities at destination ──────────
  if (isDayTrip) {
    items.push({
      id: nextId(),
      time: fmt(h, m),
      emoji: '🚗',
      title: `Depart ${originLabel}`,
      subtitle: `${driveKm} km · approx. ${driveHours < 1 ? `${driveMinutes} min` : `${driveHours.toFixed(1)} hr`} drive`,
      duration_min: 0,
      type: 'depart',
    })

    // Drive to destination
    const arr = addMinutes(h, m, driveMinutes)
    h = arr.h; m = arr.m

    items.push({
      id: nextId(),
      time: fmt(h, m),
      emoji: '📍',
      title: `Arrive at ${arriveLabel}`,
      subtitle: 'Time to explore.',
      duration_min: 0,
      type: 'arrive',
      is_highlight: true,
    })

    // Post-arrival: pull activities from the destination database
    const destActivities = getActivitiesForSubDest(destId)
    const sightseeing = destActivities
      .filter((a) => a.category !== 'food' && a.category !== 'drink')
      .sort((a, b) => (b.isHiddenGem ? 1 : 0) - (a.isHiddenGem ? 1 : 0))
    const foodAtDest = destActivities.filter((a) => a.category === 'food' || a.category === 'drink')

    // Brief settle-in buffer
    const settle = addMinutes(h, m, 15)
    h = settle.h; m = settle.m

    // Morning activities (up to 2)
    for (const act of sightseeing.slice(0, 2)) {
      const dur = ACT_DURATION[act.category] ?? 60
      items.push({
        id: nextId(),
        time: fmt(h, m),
        emoji: act.emoji,
        title: act.name,
        subtitle: act.description.slice(0, 70) + (act.description.length > 70 ? '…' : ''),
        duration_min: dur,
        type: 'poi',
        is_highlight: act.isHiddenGem,
      })
      const after = addMinutes(h, m, dur)
      h = after.h; m = after.m
    }

    // No auto-lunch — user adds dining stops via 'Plan it' on Food & Drinks tab

    // Afternoon activities (up to 2)
    for (const act of sightseeing.slice(2, 4)) {
      const dur = ACT_DURATION[act.category] ?? 60
      items.push({
        id: nextId(),
        time: fmt(h, m),
        emoji: act.emoji,
        title: act.name,
        subtitle: act.description.slice(0, 70) + (act.description.length > 70 ? '…' : ''),
        duration_min: dur,
        type: 'poi',
        is_highlight: act.isHiddenGem,
      })
      const after = addMinutes(h, m, dur)
      h = after.h; m = after.m
    }

    return items
  }

  // ── Multi-day / overnight schedule ─────────────────────────────────

  // 1. Depart
  items.push({
    id: nextId(),
    time: fmt(h, m),
    emoji: '🌅',
    title: `Depart ${originLabel}`,
    subtitle: `${driveKm} km ahead today`,
    duration_min: 0,
    type: 'depart',
  })

  // No auto coffee stop — user adds stops via 'Plan it'

  // 3. Drive to first stop (30% of drive time)
  const driveToFirst = addMinutes(h, m, Math.round(driveMinutes * 0.3))
  h = driveToFirst.h; m = driveToFirst.m

  // 4. Morning POIs
  const morningPOIs = pois.filter((p) => p.vibe_score >= 40).slice(0, 2)
  for (const poi of morningPOIs) {
    items.push({
      id: nextId(),
      time: fmt(h, m),
      emoji: POI_EMOJI[poi.category] ?? '📍',
      title: poi.name,
      subtitle: poi.description.slice(0, 65) + (poi.description.length > 65 ? '…' : ''),
      duration_min: POI_DURATIONS[poi.category] ?? 45,
      type: 'poi',
      is_highlight: poi.vibe_score >= 70,
      poi,
    })
    const after = addMinutes(h, m, POI_DURATIONS[poi.category] ?? 45)
    h = after.h; m = after.m
  }

  // No auto-lunch — user adds dining stops via 'Plan it'

  // 6. Afternoon POIs
  const afternoonPOIs = pois.filter((p) => p.vibe_score >= 30).slice(2, 4)
  for (const poi of afternoonPOIs) {
    items.push({
      id: nextId(),
      time: fmt(h, m),
      emoji: POI_EMOJI[poi.category] ?? '📍',
      title: poi.name,
      subtitle: poi.description.slice(0, 65) + (poi.description.length > 65 ? '…' : ''),
      duration_min: POI_DURATIONS[poi.category] ?? 45,
      type: 'poi',
      is_highlight: poi.vibe_score >= 70,
      poi,
    })
    const after = addMinutes(h, m, POI_DURATIONS[poi.category] ?? 45)
    h = after.h; m = after.m
  }

  // 7. Arrive — target around 5pm for overnight trips, but don't force absurdly early or late
  const arriveTarget = 17 * 60
  if (h * 60 + m < arriveTarget) { h = 17; m = 0 }

  items.push({
    id: nextId(),
    time: fmt(h, m),
    emoji: isLastDay ? '🏁' : (hasKids ? '🏨' : '⛺'),
    title: isLastDay
      ? `Arrive ${arriveLabel}`
      : (hasKids ? `Check in at ${arriveLabel}` : `Settle in at ${arriveLabel}`),
    subtitle: isLastDay
      ? 'End of the road. Well done.'
      : (hasKids ? 'Get settled, freshen up' : 'Set up camp and unwind'),
    duration_min: 60,
    type: isLastDay ? 'arrive' : 'camp',
    is_highlight: true,
  })

  if (isLastDay) return items

  // 8. Evening
  const arrAfter = addMinutes(h, m, 60)
  h = arrAfter.h; m = arrAfter.m

  const sunsetH = 17
  const sunsetM = 45
  if (h * 60 + m < sunsetH * 60 + sunsetM) { h = sunsetH; m = sunsetM }

  items.push({
    id: nextId(),
    time: fmt(h, m),
    emoji: '🌅',
    title: 'Golden hour',
    subtitle: 'The light at this time of day is worth stepping outside for',
    duration_min: 30,
    type: 'sunset',
    is_highlight: true,
  })

  const dinnerH = h + 1
  items.push({
    id: nextId(),
    time: fmt(dinnerH, 0),
    emoji: hasKids ? '🍕' : '🍺',
    title: 'Dinner',
    subtitle: hasKids ? 'Find somewhere relaxed for the family' : 'Find the local pub or restaurant',
    duration_min: 75,
    type: 'dinner',
  })

  if (!hasKids) {
    items.push({
      id: nextId(),
      time: fmt(dinnerH + 2, 0),
      emoji: '🌌',
      title: 'Stargazing',
      subtitle: 'Away from city lights — Milky Way visible on a clear night',
      duration_min: 60,
      type: 'stargazing',
      is_highlight: true,
    })
  }

  return items
}

