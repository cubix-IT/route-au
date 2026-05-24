import type { Coordinate } from '@/types'

export interface RFDSBase {
  id: string
  name: string
  coord: Coordinate
  phone: string
  state: string
}

export const RFDS_BASES: RFDSBase[] = [
  { id: 'rfds-alice-springs', name: 'RFDS – Alice Springs Base', coord: { lng: 133.901, lat: -23.797 }, phone: '08 8958 8888', state: 'NT' },
  { id: 'rfds-darwin', name: 'RFDS – Darwin Base', coord: { lng: 130.873, lat: -12.408 }, phone: '08 8920 5800', state: 'NT' },
  { id: 'rfds-broken-hill', name: 'RFDS – Broken Hill Base', coord: { lng: 141.434, lat: -31.956 }, phone: '08 8080 3777', state: 'NSW' },
  { id: 'rfds-port-augusta', name: 'RFDS – Port Augusta Base', coord: { lng: 137.765, lat: -32.502 }, phone: '08 8648 5977', state: 'SA' },
  { id: 'rfds-perth', name: 'RFDS – Perth Base', coord: { lng: 115.895, lat: -31.935 }, phone: '08 9417 6300', state: 'WA' },
  { id: 'rfds-cairns', name: 'RFDS – Cairns Base', coord: { lng: 145.752, lat: -16.873 }, phone: '07 4053 5433', state: 'QLD' },
  { id: 'rfds-townsville', name: 'RFDS – Townsville Base', coord: { lng: 146.759, lat: -19.258 }, phone: '07 4727 7000', state: 'QLD' },
  { id: 'rfds-charleville', name: 'RFDS – Charleville Base', coord: { lng: 146.252, lat: -26.413 }, phone: '07 4654 1233', state: 'QLD' },
  { id: 'rfds-kalgoorlie', name: 'RFDS – Kalgoorlie Base', coord: { lng: 121.439, lat: -30.783 }, phone: '08 9080 5888', state: 'WA' },
  { id: 'rfds-meekatharra', name: 'RFDS – Meekatharra Base', coord: { lng: 118.494, lat: -26.591 }, phone: '08 9981 1511', state: 'WA' },
]
