// NOAA solar calculation — no API required
export interface SunTimes {
  sunrise: Date
  sunset: Date
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180
}

function toDeg(rad: number) {
  return (rad * 180) / Math.PI
}

export function getSunTimes(date: Date, lat: number, lng: number): SunTimes {
  const julianDay = date.getTime() / 86400000 + 2440587.5
  const n = julianDay - 2451545.0
  const L = (280.46 + 0.9856474 * n) % 360
  const g = toRad((357.528 + 0.9856003 * n) % 360)
  const lambda = toRad(L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g))
  const epsilon = toRad(23.439 - 0.0000004 * n)
  const sinDec = Math.sin(epsilon) * Math.sin(lambda)
  const dec = Math.asin(sinDec)
  const cosH = (Math.cos(toRad(90.833)) - sinDec * Math.sin(toRad(lat))) / (Math.cos(dec) * Math.cos(toRad(lat)))

  if (cosH > 1 || cosH < -1) {
    // Polar day or night — return defaults
    const noon = new Date(date)
    noon.setHours(12, 0, 0, 0)
    return { sunrise: noon, sunset: noon }
  }

  const H = toDeg(Math.acos(cosH))
  const eqTime = 4 * (L - toDeg(Math.atan2(Math.cos(epsilon) * Math.sin(lambda), Math.cos(lambda))))
  const noonMinutes = 720 - 4 * lng - eqTime

  const sunriseMinutes = noonMinutes - H * 4
  const sunsetMinutes = noonMinutes + H * 4

  function minutesToDate(mins: number) {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    d.setMinutes(d.getMinutes() + mins)
    return d
  }

  return {
    sunrise: minutesToDate(sunriseMinutes),
    sunset: minutesToDate(sunsetMinutes),
  }
}

export function minutesFromSunEvent(time: Date, sunTime: Date): number {
  return Math.abs((time.getTime() - sunTime.getTime()) / 60000)
}
