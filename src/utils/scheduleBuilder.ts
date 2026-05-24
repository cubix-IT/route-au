import type { ItineraryDay, ScheduleItem, ScoredPOI } from '@/types'
import type { DiningPref } from '@/types'
import type { FoodDrinkPOI } from '@/data/foodDrink'
import { getFoodForCorridor } from '@/data/foodDrink'

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

const POI_DURATIONS: Record<string, number> = {
  Hiking: 75,
  Chilling: 60,
  Lookouts: 25,
  Photography: 45,
  Wildlife: 40,
  History: 50,
  Beach: 60,
  FreeCamping: 30,
}

const POI_EMOJI: Record<string, string> = {
  Hiking: '🥾',
  Chilling: '🏖️',
  Lookouts: '👁️',
  Photography: '📷',
  Wildlife: '🦘',
  History: '🏛️',
  Beach: '🌊',
  FreeCamping: '⛺',
}

const MEAL_EMOJI: Record<string, string> = {
  breakfast: '☕',
  lunch: '🍽️',
  dinner: '🍷',
  drinks: '🍺',
}

export function buildDaySchedule(
  day: ItineraryDay,
  corridorId: string,
  originLabel: string,
  pois: ScoredPOI[],
  diningPrefs: DiningPref[],
  departureHour = 7,
  isLastDay = false
): ScheduleItem[] {
  const items: ScheduleItem[] = []
  let h = departureHour
  let m = 0

  // 1. Depart
  items.push({
    id: nextId(),
    time: fmt(h, m),
    emoji: '🌅',
    title: `Depart ${originLabel}`,
    subtitle: `${Math.round(day.drive_km)} km ahead today`,
    duration_min: 0,
    type: 'depart',
  })

  // 2. Breakfast stop (~1h after departure)
  const breakfast = getFoodForCorridor(corridorId, diningPrefs, 'breakfast')
  const breakfastStop = breakfast[0]
  if (breakfastStop && !diningPrefs.includes('SelfCatering')) {
    const bt = addMinutes(h, m, 60)
    h = bt.h; m = bt.m
    items.push(makeFoodItem(breakfastStop, fmt(h, m), 'breakfast'))
    const after = addMinutes(h, m, 45)
    h = after.h; m = after.m
  }

  // 3. Drive to first stop
  const driveToFirst = addMinutes(h, m, Math.round(day.drive_hours * 60 * 0.3))
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

  // 5. Lunch (~12:00–13:30 window)
  const lunchTarget = { h: 12, m: 30 }
  const currentMins = h * 60 + m
  const lunchMins = lunchTarget.h * 60 + lunchTarget.m
  if (currentMins < lunchMins) {
    h = lunchTarget.h; m = lunchTarget.m
  }

  const lunch = getFoodForCorridor(corridorId, diningPrefs, 'lunch')
  const lunchStop = lunch[0]
  if (lunchStop && !diningPrefs.includes('SelfCatering')) {
    items.push(makeFoodItem(lunchStop, fmt(h, m), 'lunch'))
    const after = addMinutes(h, m, 75)
    h = after.h; m = after.m
  } else if (diningPrefs.includes('SelfCatering')) {
    items.push({
      id: nextId(),
      time: fmt(h, m),
      emoji: '🥪',
      title: 'Lunch break',
      subtitle: 'Find a shaded spot and break out the esky',
      duration_min: 45,
      type: 'lunch',
    })
    const after = addMinutes(h, m, 45)
    h = after.h; m = after.m
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

  // 7. Arrive / camp (~17:30–18:00)
  const arriveTarget = { h: 17, m: 30 }
  const curMins2 = h * 60 + m
  const arriveMins = arriveTarget.h * 60 + arriveTarget.m
  if (curMins2 < arriveMins) {
    h = arriveTarget.h; m = arriveTarget.m
  }

  const lastWaypoint = day.waypoints[day.waypoints.length - 1]
  const arriveLabel = lastWaypoint?.label ?? 'Destination'

  items.push({
    id: nextId(),
    time: fmt(h, m),
    emoji: isLastDay ? '🏁' : '⛺',
    title: isLastDay ? `Arrive ${arriveLabel}` : `Camp / Settle in at ${arriveLabel}`,
    subtitle: isLastDay ? 'Road trip complete!' : 'Set up camp, rest and freshen up',
    duration_min: 60,
    type: isLastDay ? 'arrive' : 'camp',
    is_highlight: isLastDay,
  })

  if (!isLastDay) {
    const after = addMinutes(h, m, 60)
    h = after.h; m = after.m

    // 8. Sunset / stargazing
    const sunset = addMinutes(17, 0, Math.floor(Math.random() * 60) + 30)
    items.push({
      id: nextId(),
      time: fmt(sunset.h, sunset.m),
      emoji: '🌅',
      title: 'Golden hour & sunset',
      subtitle: 'The best light of the day — camera ready',
      duration_min: 45,
      type: 'sunset',
      is_highlight: true,
    })

    const dinnerH = sunset.h + 1
    const dinner = getFoodForCorridor(corridorId, diningPrefs, 'dinner')
    const dinnerStop = dinner[0]
    if (dinnerStop && !diningPrefs.includes('SelfCatering')) {
      items.push(makeFoodItem(dinnerStop, fmt(dinnerH, 0), 'dinner'))
    } else {
      items.push({
        id: nextId(),
        time: fmt(dinnerH, 0),
        emoji: '🔥',
        title: 'Camp cook-up',
        subtitle: 'Fire up the camp stove — you\'ve earned it',
        duration_min: 60,
        type: 'dinner',
      })
    }

    // Stargazing if dark sky rating is good
    items.push({
      id: nextId(),
      time: fmt(dinnerH + 2, 0),
      emoji: '🌌',
      title: 'Stargazing',
      subtitle: 'Away from city lights — Milky Way visible',
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
