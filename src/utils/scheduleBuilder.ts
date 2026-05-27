import type { ItineraryDay, ScheduleItem, ScoredPOI } from '@/types'
import type { DiningPref } from '@/types'
import type { FoodDrinkPOI } from '@/data/foodDrink'
import { getFoodForCorridor } from '@/data/foodDrink'
import { getActivitiesForSubDest } from '@/data/victorianActivities'

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

const MEAL_EMOJI: Record<string, string> = {
  breakfast: '☕', lunch: '🍽️', dinner: '🍷', drinks: '🍺',
}

export function buildDaySchedule(
  day: ItineraryDay,
  corridorId: string,
  destId: string,
  originLabel: string,
  pois: ScoredPOI[],
  diningPrefs: DiningPref[],
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

    const wantsCafe = diningPrefs.some(p => ['Cafes', 'Bakeries', 'Roadhouses'].includes(p))
    // En-route break only if drive > 1.5 hrs AND user wants a food stop
    if (driveHours >= 1.5 && wantsCafe) {
      const stopAt = addMinutes(h, m, Math.round(driveMinutes * 0.45))
      h = stopAt.h; m = stopAt.m
      items.push({
        id: nextId(),
        time: fmt(h, m),
        emoji: '☕',
        title: 'Stretch & coffee stop',
        subtitle: 'Roughly halfway — good time for a coffee break',
        duration_min: 20,
        type: 'breakfast',
      })
      const after = addMinutes(h, m, 20)
      h = after.h; m = after.m
      const remaining = driveMinutes - Math.round(driveMinutes * 0.45) - 20
      const arr = addMinutes(h, m, Math.max(0, remaining))
      h = arr.h; m = arr.m
    } else {
      const arr = addMinutes(h, m, driveMinutes)
      h = arr.h; m = arr.m
    }

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

    const wantsFood = diningPrefs.length > 0 && !diningPrefs.every(p => p === 'SelfCatering')
    // Lunch only if user wants food stops
    if (wantsFood) {
      if (h * 60 + m < 12 * 60 + 30) { h = 12; m = 30 }
      const lunchAct = foodAtDest[0]
      const lunchDur = 75
      if (lunchAct) {
        items.push({
          id: nextId(),
          time: fmt(h, m),
          emoji: lunchAct.emoji,
          title: lunchAct.name,
          subtitle: lunchAct.description.slice(0, 70) + (lunchAct.description.length > 70 ? '…' : ''),
          duration_min: lunchDur,
          type: 'lunch',
          is_highlight: lunchAct.isHiddenGem,
        })
      } else {
        items.push({
          id: nextId(),
          time: fmt(h, m),
          emoji: '🍽️',
          title: 'Lunch',
          subtitle: hasKids ? 'Find somewhere family-friendly' : 'Find a local spot or pack a picnic',
          duration_min: 60,
          type: 'lunch',
        })
      }
      const afterLunch = addMinutes(h, m, lunchDur)
      h = afterLunch.h; m = afterLunch.m
    }

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

  // 2. Breakfast stop only if drive is long enough AND user wants food
  const wantsMorningFood = diningPrefs.some(p => ['Cafes', 'Bakeries', 'Roadhouses', 'CasualDining'].includes(p))
  if (driveHours >= 1.5 && wantsMorningFood) {
    const breakfast = getFoodForCorridor(corridorId, diningPrefs, 'breakfast')
    const breakfastStop = breakfast[0]
    if (breakfastStop) {
      const bt = addMinutes(h, m, 60)
      h = bt.h; m = bt.m
      items.push(makeFoodItem(breakfastStop, fmt(h, m), 'breakfast'))
      const after = addMinutes(h, m, 45)
      h = after.h; m = after.m
    }
  }

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

  // 5. Lunch — only if drive is long enough AND user wants food stops
  const wantsLunch = diningPrefs.length > 0
  if (driveHours >= 2 && wantsLunch) {
    if (h * 60 + m < 12 * 60 + 30) { h = 12; m = 30 }

    if (diningPrefs.includes('SelfCatering')) {
      items.push({
        id: nextId(),
        time: fmt(h, m),
        emoji: '🥪',
        title: 'Lunch break',
        subtitle: 'Pack a picnic or find a local spot',
        duration_min: 45,
        type: 'lunch',
      })
      const after = addMinutes(h, m, 45)
      h = after.h; m = after.m
    } else {
      const lunch = getFoodForCorridor(corridorId, diningPrefs, 'lunch')
      const lunchStop = lunch[0]
      if (lunchStop) {
        items.push(makeFoodItem(lunchStop, fmt(h, m), 'lunch'))
        const after = addMinutes(h, m, 75)
        h = after.h; m = after.m
      } else {
        items.push({
          id: nextId(),
          time: fmt(h, m),
          emoji: '🍽️',
          title: 'Lunch',
          subtitle: 'Find a local cafe or restaurant along the way',
          duration_min: 60,
          type: 'lunch',
        })
        const after = addMinutes(h, m, 60)
        h = after.h; m = after.m
      }
    }
  }

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
  if (diningPrefs.length > 0) {
    if (diningPrefs.includes('SelfCatering')) {
      items.push({
        id: nextId(),
        time: fmt(dinnerH, 0),
        emoji: '🔥',
        title: 'Cook dinner',
        subtitle: 'Camp cook or self-cater for the evening',
        duration_min: 60,
        type: 'dinner',
      })
    } else {
      const dinner = getFoodForCorridor(corridorId, diningPrefs, 'dinner')
      const dinnerStop = dinner[0]
      if (dinnerStop) {
        items.push(makeFoodItem(dinnerStop, fmt(dinnerH, 0), 'dinner'))
      } else {
        items.push({
          id: nextId(),
          time: fmt(dinnerH, 0),
          emoji: hasKids ? '🍕' : '🍺',
          title: 'Dinner',
          subtitle: hasKids ? 'Find somewhere relaxed for the family' : 'Find the local pub or restaurant',
          duration_min: 75,
          type: 'dinner',
        })
      }
    }
  }

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

function makeFoodItem(food: FoodDrinkPOI, time: string, meal: 'breakfast' | 'lunch' | 'dinner' | 'drinks'): ScheduleItem {
  const durationMap = { breakfast: 45, lunch: 70, dinner: 90, drinks: 60 }
  return {
    id: nextId(),
    time,
    emoji: MEAL_EMOJI[meal],
    title: food.name,
    subtitle: food.signature_dish
      ? `${food.description.slice(0, 45)}… · Try: ${food.signature_dish}`
      : food.description.slice(0, 65) + '…',
    duration_min: durationMap[meal],
    type: meal,
    is_highlight: food.price_range === '$$$',
  }
}
