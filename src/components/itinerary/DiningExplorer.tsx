import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { FOOD_DRINK, type FoodCategory, type FoodDrinkPOI } from '@/data/foodDrink'

const CAT_META: Record<FoodCategory, { emoji: string; label: string; desc: string }> = {
  Cafe:       { emoji: '☕', label: 'Cafes & Coffee',   desc: 'Morning stops, flat whites, brekkie' },
  Pub:        { emoji: '🍺', label: 'Local Pubs',        desc: 'Cold beer, pub meals, local colour' },
  Restaurant: { emoji: '🍽️', label: 'Restaurants',       desc: 'Sit-down dining, local produce' },
  Winery:     { emoji: '🍷', label: 'Wineries',          desc: 'Cellar doors, tastings, platters' },
  Roadhouse:  { emoji: '⛽', label: 'Roadhouses',        desc: 'Outback fuel stops with hot food' },
  Bakery:     { emoji: '🥐', label: 'Bakeries',          desc: 'Fresh bread, sausage rolls, pies' },
  Brewery:    { emoji: '🍻', label: 'Craft Breweries',   desc: 'Local brews, tasting paddles' },
  Seafood:    { emoji: '🦞', label: 'Seafood',           desc: 'Fresh catch, coastal fish & chips' },
}

const PRICE_LABEL: Record<string, string> = { '$': 'Budget', '$$': 'Mid-range', '$$$': 'Premium' }
const MEAL_LABEL: Record<string, string> = {
  breakfast: 'Brekkie', lunch: 'Lunch', dinner: 'Dinner', drinks: 'Drinks',
}

export function DiningExplorer() {
  const activeItinerary = useAppStore((s) => s.activeItinerary)
  const addedDiningStops = useAppStore((s) => s.addedDiningStops)
  const addDiningStop = useAppStore((s) => s.addDiningStop)
  const removeDiningStop = useAppStore((s) => s.removeDiningStop)

  const [selectedCategory, setSelectedCategory] = useState<FoodCategory | null>(null)
  const [expandedVenue, setExpandedVenue] = useState<string | null>(null)

  if (!activeItinerary) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🍽️</div>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Plan a trip to discover food &amp; dining along your route.
        </p>
      </div>
    )
  }

  const corridorId = activeItinerary.route.corridor_ids[0] ?? ''
  const routeFood = FOOD_DRINK.filter((f) => f.corridor_id === corridorId)
  const availableCategories = [...new Set(routeFood.map((f) => f.category))]

  // ── Category selection ────────────────────────────────────────────
  if (!selectedCategory) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
            Food &amp; dining on your route
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            These are the dining categories available along your route.
            Which one interests you? We'll show you the options and you pick what to add.
          </p>
        </div>

        {availableCategories.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No dining data for this corridor yet — check back soon.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {availableCategories.map((cat) => {
              const meta = CAT_META[cat]
              const count = routeFood.filter((f) => f.category === cat).length
              const addedCount = addedDiningStops.filter((s) =>
                routeFood.some((f) => f.id === s.foodId && f.category === cat)
              ).length
              return (
                <button
                  key={cat}
                  onClick={() => { setSelectedCategory(cat); setExpandedVenue(null) }}
                  style={{
                    background: addedCount > 0 ? 'rgba(245,158,11,0.08)' : 'var(--bg-card)',
                    border: `1.5px solid ${addedCount > 0 ? 'var(--amber-dim)' : 'var(--border)'}`,
                    borderRadius: 14, padding: '16px 14px',
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{meta.emoji}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>
                    {meta.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: 6 }}>
                    {meta.desc}
                  </div>
                  <div style={{ fontSize: 11, color: addedCount > 0 ? 'var(--amber)' : 'var(--text-muted)' }}>
                    {count} option{count !== 1 ? 's' : ''}
                    {addedCount > 0 && <span style={{ marginLeft: 6 }}>· {addedCount} added ✓</span>}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {addedDiningStops.length > 0 && (
          <div style={{
            marginTop: 20, padding: '12px 16px',
            background: 'rgba(245,158,11,0.06)',
            border: '1px solid var(--amber-dim)',
            borderRadius: 12,
          }}>
            <p style={{ fontSize: 13, color: 'var(--amber)', fontWeight: 600, marginBottom: 8 }}>
              {addedDiningStops.length} dining stop{addedDiningStops.length !== 1 ? 's' : ''} added to your trip ✓
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {addedDiningStops.map((stop) => {
                const venue = routeFood.find((f) => f.id === stop.foodId)
                if (!venue) return null
                return (
                  <div key={stop.foodId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {CAT_META[venue.category]?.emoji} {venue.name} → Day {stop.dayNumber}
                    </span>
                    <button
                      onClick={() => removeDiningStop(stop.foodId)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Venue selection ───────────────────────────────────────────────
  const venues = routeFood.filter((f) => f.category === selectedCategory)
  const meta = CAT_META[selectedCategory]

  return (
    <div style={{ padding: 16 }}>
      <button
        onClick={() => { setSelectedCategory(null); setExpandedVenue(null) }}
        style={{
          background: 'none', border: 'none', color: 'var(--amber)',
          fontSize: 13, cursor: 'pointer', padding: '0 0 16px 0',
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        ← All categories
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 28 }}>{meta.emoji}</span>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
          {meta.label} on your route
        </h3>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 18 }}>
        Here are your {meta.label.toLowerCase()} options. Tap a venue to add it to your trip — you choose which day.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {venues.map((venue) => {
          const added = addedDiningStops.find((s) => s.foodId === venue.id)
          return (
            <VenueCard
              key={venue.id}
              venue={venue}
              addedDay={added?.dayNumber ?? null}
              isExpanded={expandedVenue === venue.id}
              totalDays={activeItinerary.days.length}
              onExpand={() => setExpandedVenue(expandedVenue === venue.id ? null : venue.id)}
              onAdd={(dayNumber) => {
                addDiningStop(venue.id, dayNumber)
                setExpandedVenue(null)
              }}
              onRemove={() => removeDiningStop(venue.id)}
            />
          )
        })}
      </div>
    </div>
  )
}

// ── Venue card ────────────────────────────────────────────────────────

function VenueCard({
  venue, addedDay, isExpanded, totalDays, onExpand, onAdd, onRemove,
}: {
  venue: FoodDrinkPOI
  addedDay: number | null
  isExpanded: boolean
  totalDays: number
  onExpand: () => void
  onAdd: (day: number) => void
  onRemove: () => void
}) {
  return (
    <div style={{
      background: addedDay !== null ? 'rgba(245,158,11,0.06)' : 'var(--bg-card)',
      border: `1.5px solid ${addedDay !== null ? 'var(--amber-dim)' : 'var(--border)'}`,
      borderRadius: 14, overflow: 'hidden', transition: 'all 0.15s',
    }}>
      <div style={{ padding: '14px 16px' }}>
        {/* Name + badges */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              {venue.name}
            </span>
            {venue.must_book && (
              <span style={{
                display: 'inline-block', marginLeft: 8,
                fontSize: 10, color: 'var(--amber)',
                background: 'var(--amber-glow)', padding: '2px 6px',
                borderRadius: 4, fontWeight: 600, verticalAlign: 'middle',
              }}>
                Book ahead
              </span>
            )}
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
            {PRICE_LABEL[venue.price_range]}
          </span>
        </div>

        {/* Meal time chips */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {venue.meal_times.map((m) => (
            <span
              key={m}
              style={{
                fontSize: 11, color: 'var(--text-muted)',
                background: 'rgba(255,255,255,0.05)',
                padding: '2px 8px', borderRadius: 4,
              }}
            >
              {MEAL_LABEL[m] ?? m}
            </span>
          ))}
        </div>

        {/* Description */}
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 8 }}>
          {venue.description}
        </p>

        {venue.signature_dish && (
          <p style={{ fontSize: 12, color: 'var(--amber)', marginBottom: 12 }}>
            ✦ Try: {venue.signature_dish}
          </p>
        )}

        {/* CTA */}
        {addedDay !== null ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--amber)', fontWeight: 600 }}>
              ✓ Added to Day {addedDay}
            </span>
            <button
              onClick={onRemove}
              style={{
                background: 'none', border: 'none',
                color: 'var(--text-muted)', fontSize: 11,
                cursor: 'pointer', textDecoration: 'underline',
              }}
            >
              Remove
            </button>
          </div>
        ) : (
          <button
            onClick={onExpand}
            style={{
              padding: '9px 0', borderRadius: 9, width: '100%',
              background: 'var(--amber-glow)', border: '1px solid var(--amber-dim)',
              color: 'var(--amber)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            + Add to my trip
          </button>
        )}
      </div>

      {/* Day selector — expands on Add click */}
      {isExpanded && (
        <div style={{
          borderTop: '1px solid var(--border)',
          padding: '12px 16px',
          background: 'rgba(0,0,0,0.2)',
        }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
            Which day would you like to add this to?
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => (
              <button
                key={day}
                onClick={() => onAdd(day)}
                style={{
                  padding: '8px 18px', borderRadius: 8,
                  background: 'var(--bg-surface)', border: '1px solid var(--border)',
                  color: 'var(--text-primary)', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', transition: 'border-color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--amber)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                Day {day}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
