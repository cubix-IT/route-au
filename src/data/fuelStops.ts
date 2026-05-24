import type { Waypoint } from '@/types'

export const FUEL_STOPS: Waypoint[] = [
  { id: 'fs-adelaide', label: 'Adelaide – Multiple stations', coord: { lng: 138.600, lat: -34.929 }, is_fuel_stop: true, is_mandatory: false },
  { id: 'fs-port-augusta', label: 'Port Augusta – BP/Caltex', coord: { lng: 137.762, lat: -32.491 }, is_fuel_stop: true, is_mandatory: false },
  { id: 'fs-coober-pedy', label: 'Coober Pedy – BP', coord: { lng: 134.754, lat: -29.014 }, is_fuel_stop: true, is_mandatory: false },
  { id: 'fs-marla', label: 'Marla Travellers Rest', coord: { lng: 133.622, lat: -27.303 }, is_fuel_stop: true, is_mandatory: false },
  { id: 'fs-erldunda', label: 'Erldunda – Desert Oaks', coord: { lng: 133.251, lat: -25.218 }, is_fuel_stop: true, is_mandatory: false },
  { id: 'fs-alice-springs', label: 'Alice Springs – Multiple', coord: { lng: 133.872, lat: -23.698 }, is_fuel_stop: true, is_mandatory: false },
  { id: 'fs-tennant-creek', label: 'Tennant Creek – Shell', coord: { lng: 134.188, lat: -19.652 }, is_fuel_stop: true, is_mandatory: false },
  { id: 'fs-katherine', label: 'Katherine – Multiple', coord: { lng: 132.262, lat: -14.465 }, is_fuel_stop: true, is_mandatory: false },
  { id: 'fs-darwin', label: 'Darwin – Multiple', coord: { lng: 130.846, lat: -12.462 }, is_fuel_stop: true, is_mandatory: false },
  { id: 'fs-fitzroy-crossing', label: 'Fitzroy Crossing – BP', coord: { lng: 125.585, lat: -18.192 }, is_fuel_stop: true, is_mandatory: false },
  { id: 'fs-halls-creek', label: "Hall's Creek – Coles Express", coord: { lng: 127.664, lat: -18.229 }, is_fuel_stop: true, is_mandatory: false },
  { id: 'fs-wyndham', label: 'Wyndham – Gulf Service Station', coord: { lng: 128.640, lat: -15.773 }, is_fuel_stop: true, is_mandatory: false },
  { id: 'fs-kununurra', label: 'Kununurra – Multiple', coord: { lng: 128.737, lat: -15.467 }, is_fuel_stop: true, is_mandatory: false },
  { id: 'fs-derby', label: 'Derby – Multiple', coord: { lng: 123.626, lat: -17.312 }, is_fuel_stop: true, is_mandatory: false },
  { id: 'fs-longreach', label: 'Longreach – United', coord: { lng: 144.250, lat: -23.441 }, is_fuel_stop: true, is_mandatory: false },
  { id: 'fs-cairns', label: 'Cairns – Multiple', coord: { lng: 145.771, lat: -16.921 }, is_fuel_stop: true, is_mandatory: false },
  { id: 'fs-william-creek', label: 'William Creek Hotel (fuel)', coord: { lng: 136.347, lat: -28.904 }, is_fuel_stop: true, is_mandatory: false, note: 'Remote roadhouse — call ahead to confirm fuel availability' },
  { id: 'fs-oodnadatta', label: 'Oodnadatta – Pink Roadhouse', coord: { lng: 135.447, lat: -27.556 }, is_fuel_stop: true, is_mandatory: false },
]
