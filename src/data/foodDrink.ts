import type { Coordinate } from '@/types'
import type { DiningPref } from '@/types'

export type FoodCategory =
  | 'Cafe'
  | 'Pub'
  | 'Restaurant'
  | 'Winery'
  | 'Roadhouse'
  | 'Bakery'
  | 'Brewery'
  | 'Seafood'

export interface FoodDrinkPOI {
  id: string
  name: string
  category: FoodCategory
  coord: Coordinate
  description: string
  corridor_id: string
  meal_times: ('breakfast' | 'lunch' | 'dinner' | 'drinks')[]
  price_range: '$' | '$$' | '$$$'
  matching_prefs: DiningPref[]
  must_book?: boolean
  phone?: string
  signature_dish?: string
}

export const FOOD_DRINK: FoodDrinkPOI[] = [
  // --- Great Ocean Road (VIC) ---
  {
    id: 'zeally-bay-cafe',
    name: 'Zeally Bay Cafe',
    category: 'Cafe',
    coord: { lng: 144.312, lat: -38.341 },
    description: 'Torquay institution. Best breakfast on the GOR — smashed avocado, great coffee.',
    corridor_id: 'great-ocean-road',
    meal_times: ['breakfast'],
    price_range: '$$',
    matching_prefs: ['Cafes'],
    signature_dish: 'Big Breakfast Board',
  },
  {
    id: 'arab-restaurant',
    name: 'Arab Restaurant',
    category: 'Seafood',
    coord: { lng: 143.980, lat: -38.540 },
    description: 'Lorne\'s legendary seafood restaurant. Chalkboard menu, local catch, ocean views.',
    corridor_id: 'great-ocean-road',
    meal_times: ['lunch', 'dinner'],
    price_range: '$$$',
    matching_prefs: ['FineDining'],
    must_book: true,
    signature_dish: 'Whole Grilled Snapper',
  },
  {
    id: 'chrisS-beacon-point',
    name: "Chris's Beacon Point Restaurant",
    category: 'Restaurant',
    coord: { lng: 143.693, lat: -38.744 },
    description: 'Perched above Apollo Bay. Mediterranean menu, local seafood, panoramic ocean views. One of Victoria\'s great dining experiences.',
    corridor_id: 'great-ocean-road',
    meal_times: ['lunch', 'dinner'],
    price_range: '$$$',
    matching_prefs: ['FineDining'],
    must_book: true,
    signature_dish: 'Lobster Thermidor',
  },
  {
    id: 'otway-estate',
    name: 'Otway Estate Winery',
    category: 'Winery',
    coord: { lng: 143.592, lat: -38.688 },
    description: 'Family-run cool-climate winery near Apollo Bay. Pinot Noir and Chardonnay worth stopping for.',
    corridor_id: 'great-ocean-road',
    meal_times: ['lunch', 'drinks'],
    price_range: '$$',
    matching_prefs: ['Wineries'],
    signature_dish: 'Cheese platter + Pinot Noir',
  },
  {
    id: 'lorne-pub',
    name: 'Lorne Hotel',
    category: 'Pub',
    coord: { lng: 143.978, lat: -38.542 },
    description: 'Classic Australian pub with ocean-view beer garden. Live music on weekends.',
    corridor_id: 'great-ocean-road',
    meal_times: ['lunch', 'dinner', 'drinks'],
    price_range: '$',
    matching_prefs: ['LocalPubs'],
    signature_dish: 'Parma + pot',
  },
  {
    id: 'port-campbell-pub',
    name: 'Port Campbell Hotel',
    category: 'Pub',
    coord: { lng: 142.996, lat: -38.621 },
    description: 'The local pub for the 12 Apostles region. Feeds visitors and locals alike, great steaks.',
    corridor_id: 'great-ocean-road',
    meal_times: ['lunch', 'dinner', 'drinks'],
    price_range: '$',
    matching_prefs: ['LocalPubs'],
  },
  {
    id: 'brae-restaurant',
    name: 'Brae Restaurant',
    category: 'Restaurant',
    coord: { lng: 143.579, lat: -38.261 },
    description: 'World top-50 farm-to-table restaurant near Birregurra. Pre-booking essential — worth planning a detour.',
    corridor_id: 'great-ocean-road',
    meal_times: ['lunch', 'dinner'],
    price_range: '$$$',
    matching_prefs: ['FineDining'],
    must_book: true,
  },

  // --- Grand Pacific Drive (NSW) ---
  {
    id: 'fig-cafe-kiama',
    name: 'Fig Cafe, Kiama',
    category: 'Cafe',
    coord: { lng: 150.855, lat: -34.671 },
    description: 'Sunny all-day cafe next to the Kiama Blowhole. Locals queue for weekend brunch.',
    corridor_id: 'grand-pacific-drive',
    meal_times: ['breakfast', 'lunch'],
    price_range: '$',
    matching_prefs: ['Cafes'],
    signature_dish: 'Ricotta hotcakes',
  },
  {
    id: 'diggies-beach-cafe',
    name: "Diggies Beach Cafe, Wollongong",
    category: 'Cafe',
    coord: { lng: 150.895, lat: -34.420 },
    description: 'Right on Wollongong beach. Breakfast burritos, cold-brew coffee, surfer crowd.',
    corridor_id: 'grand-pacific-drive',
    meal_times: ['breakfast', 'lunch'],
    price_range: '$',
    matching_prefs: ['Cafes'],
  },
  {
    id: 'sea-cliff-bakery',
    name: 'Stanwell Park Bakery',
    category: 'Bakery',
    coord: { lng: 150.867, lat: -34.221 },
    description: 'Old-school bakery with legendary sausage rolls. The Sea Cliff Bridge breakfast stop.',
    corridor_id: 'grand-pacific-drive',
    meal_times: ['breakfast'],
    price_range: '$',
    matching_prefs: ['Cafes', 'Roadhouses'],
  },

  // --- Explorer's Way (SA/NT) ---
  {
    id: 'pink-roadhouse',
    name: 'Pink Roadhouse, Oodnadatta',
    category: 'Roadhouse',
    coord: { lng: 135.447, lat: -27.556 },
    description: 'Outback icon. Cold drinks, hot food, a cold beer, and stories from real overlanders. Museum of outback history attached.',
    corridor_id: 'explorers-way',
    meal_times: ['breakfast', 'lunch', 'dinner'],
    price_range: '$',
    matching_prefs: ['Roadhouses'],
    signature_dish: 'Roadhouse pie',
  },
  {
    id: 'coober-pedy-opal-inn',
    name: 'Opal Inn Hotel, Coober Pedy',
    category: 'Pub',
    coord: { lng: 134.754, lat: -29.015 },
    description: 'The social hub of Coober Pedy. Cold beer, pub grub, yarns from miners and travellers.',
    corridor_id: 'explorers-way',
    meal_times: ['lunch', 'dinner', 'drinks'],
    price_range: '$',
    matching_prefs: ['LocalPubs', 'Roadhouses'],
  },
  {
    id: 'alice-springs-hanuman',
    name: 'Hanuman Alice Springs',
    category: 'Restaurant',
    coord: { lng: 133.875, lat: -23.700 },
    description: 'The best dinner in Alice Springs. Thai/Indian fusion. Famous for Nonya curry and whole barramundi.',
    corridor_id: 'explorers-way',
    meal_times: ['dinner'],
    price_range: '$$',
    matching_prefs: ['FineDining'],
    must_book: true,
    signature_dish: 'Nonya Barramundi Curry',
  },
  {
    id: 'alice-springs-bar-espresso',
    name: 'Bar Espresso, Alice Springs',
    category: 'Cafe',
    coord: { lng: 133.873, lat: -23.698 },
    description: 'Best coffee in the Red Centre. Shaded courtyard, great breakfast.',
    corridor_id: 'explorers-way',
    meal_times: ['breakfast'],
    price_range: '$',
    matching_prefs: ['Cafes'],
  },
  {
    id: 'daly-waters-pub',
    name: 'Daly Waters Historic Pub',
    category: 'Pub',
    coord: { lng: 133.375, lat: -16.261 },
    description: 'One of Australia\'s most legendary remote pubs. Walls covered in visitor memorabilia. Cold beer in the middle of nowhere.',
    corridor_id: 'explorers-way',
    meal_times: ['lunch', 'dinner', 'drinks'],
    price_range: '$',
    matching_prefs: ['LocalPubs', 'Roadhouses'],
    signature_dish: 'Beef and Barra BBQ',
  },

  // --- Gibb River Road (WA) ---
  {
    id: 'el-questro-emma-gorge',
    name: 'El Questro Station Restaurant',
    category: 'Restaurant',
    coord: { lng: 128.080, lat: -15.960 },
    description: 'Remote luxury station dining. Kimberley beef, fresh barramundi, excellent wine list.',
    corridor_id: 'gibb-river-road',
    meal_times: ['lunch', 'dinner'],
    price_range: '$$$',
    matching_prefs: ['FineDining'],
    must_book: true,
  },

  // --- Savannah Way (QLD) ---
  {
    id: 'cairns-ochre',
    name: 'Ochre Restaurant, Cairns',
    category: 'Restaurant',
    coord: { lng: 145.773, lat: -16.921 },
    description: 'Native Australian bush tucker cuisine. Crocodile, kangaroo, quandong. Trip-starting dinner.',
    corridor_id: 'savannah-way',
    meal_times: ['dinner'],
    price_range: '$$$',
    matching_prefs: ['FineDining'],
    must_book: true,
    signature_dish: 'Crocodile Wonton',
  },
  {
    id: 'mt-surprise-pub',
    name: 'Mount Surprise Hotel',
    category: 'Pub',
    coord: { lng: 144.318, lat: -18.149 },
    description: 'Remote Queensland pub on the Savannah Way. Cold beer after a long dusty drive.',
    corridor_id: 'savannah-way',
    meal_times: ['lunch', 'dinner', 'drinks'],
    price_range: '$',
    matching_prefs: ['LocalPubs', 'Roadhouses'],
  },
  {
    id: 'margaret-river-vasse-felix',
    name: 'Vasse Felix Winery',
    category: 'Winery',
    coord: { lng: 115.225, lat: -33.840 },
    description: 'Western Australia\'s oldest winery in the heart of Margaret River. World-class Cabernet Sauvignon and restaurant.',
    corridor_id: 'gibb-river-road',
    meal_times: ['lunch', 'drinks'],
    price_range: '$$$',
    matching_prefs: ['Wineries', 'FineDining'],
    must_book: true,
    signature_dish: 'Aged Cabernet Sauvignon flight',
  },
]

export function getFoodForCorridor(
  corridorId: string,
  diningPrefs: DiningPref[],
  mealTime: 'breakfast' | 'lunch' | 'dinner' | 'drinks'
): FoodDrinkPOI[] {
  if (diningPrefs.length === 0) return []
  return FOOD_DRINK.filter(
    (f) =>
      f.corridor_id === corridorId &&
      f.meal_times.includes(mealTime) &&
      f.matching_prefs.some((p) => diningPrefs.includes(p))
  )
}
