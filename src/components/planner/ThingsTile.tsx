import { GREEN, WARM, SECONDARY } from '@/lib/brand'
import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useActivities } from '@/hooks/useActivities'
import { fetchLivePOIs, fetchWikipediaSummary, type LivePOI } from '@/lib/overpass'
import type { ActivityCategory } from '@/data/victorianActivities.ts'


const POI_EMOJI: Record<LivePOI['type'], string> = {
  pub: '🍺', winery: '🍷', brewery: '🍺', distillery: '🥃',
  viewpoint: '👁', attraction: '🏛', hiking: '🥾',
}

const CAT_TAG: Record<ActivityCategory, { label: string; color: string; bg: string }> = {
  nature:        { label: 'Nature',        color: '#2D7A4A', bg: '#E8F5EE' },
  active:        { label: 'Outdoor',       color: '#2563EB', bg: '#EFF6FF' },
  wildlife:      { label: 'Wildlife',      color: '#047857', bg: '#ECFDF5' },
  history:       { label: 'History',       color: '#7C3AED', bg: '#F5F3FF' },
  art:           { label: 'Art & Culture', color: '#DB2777', bg: '#FDF2F8' },
  family:        { label: 'Family',        color: '#D97706', bg: '#FFFBEB' },
  relaxation:    { label: 'Leisure',       color: '#0891B2', bg: '#ECFEFF' },
  food:          { label: 'Food',          color: '#B45309', bg: '#FEF3C7' },
  drink:         { label: 'Drink',         color: '#B87333', bg: '#FFF5EB' },
  markets:       { label: 'Markets',       color: '#059669', bg: '#ECFDF5' },
  viewpoint:     { label: 'Scenic View',   color: '#4338CA', bg: '#EEF2FF' },
  beach:         { label: 'Beach',         color: '#0369A1', bg: '#E0F2FE' },
  wellness:      { label: 'Wellness',      color: '#0891B2', bg: '#ECFEFF' },
  entertainment: { label: 'Entertainment', color: '#9333EA', bg: '#F3E8FF' },
  sports:        { label: 'Sports',        color: '#15803D', bg: '#DCFCE7' },
  shopping:      { label: 'Shopping',      color: '#BE185D', bg: '#FCE7F3' },
}

const POI_TAG: Record<LivePOI['type'], { label: string; color: string; bg: string }> = {
  hiking:     { label: 'Hiking Trail',  color: '#2563EB', bg: '#EFF6FF' },
  viewpoint:  { label: 'Scenic View',   color: '#4338CA', bg: '#EEF2FF' },
  attraction: { label: 'Attraction',    color: '#7C3AED', bg: '#F5F3FF' },
  pub:        { label: 'Pub',           color: '#B87333', bg: '#FFF5EB' },
  winery:     { label: 'Winery',        color: '#7E22CE', bg: '#FAF5FF' },
  brewery:    { label: 'Brewery',       color: '#92400E', bg: '#FFFBEB' },
  distillery: { label: 'Distillery',    color: '#374151', bg: '#F3F4F6' },
}

export function ThingsTile() {
  const destId = useAppStore((s) => s.destId)
  const destName = useAppStore((s) => s.destName)
  const destCoord = useAppStore((s) => s.destCoord)
  const activeItinerary = useAppStore((s) => s.activeItinerary)

  const { activities } = useActivities(destId)
  const [livePOIs, setLivePOIs] = useState<LivePOI[] | null>(null)
  const [wikiSummary, setWikiSummary] = useState<string | null>(null)

  useEffect(() => {
    if (!destCoord || livePOIs !== null) return
    Promise.all([
      fetchLivePOIs(destId, destCoord.lat, destCoord.lng),
      fetchWikipediaSummary(destId, destName),
    ]).then(([pois, wiki]) => {
      setLivePOIs(pois)
      setWikiSummary(wiki)
    }).catch(() => setLivePOIs([]))
  }, [destId, destCoord?.lat, destCoord?.lng, destName]) // eslint-disable-line react-hooks/exhaustive-deps

  // Overpass POIs for activities and experiences
  const nonFoodPOIs = (livePOIs ?? []).slice(0, 4)

  // Show curated activities (top 4) + Overpass POIs (top 4), interleaved
  const curatedTop = activities.slice(0, 4)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
      {/* Header */}
      <div style={{
        padding: '9px 14px 7px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-primary)' }}>
            Things to Do 🗺
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {activeItinerary
              ? `At ${destName.split(',')[0].split('&')[0].trim()}`
              : 'Plan a trip to explore'}
          </div>
        </div>
        {activities.length > 0 && (
          <div style={{
            fontSize: 10, fontWeight: 700, color: '#B87333',
            background: '#FFF5EB', border: '1px solid rgba(184,115,51,0.2)',
            padding: '2px 8px', borderRadius: 5,
          }}>
            {activities.length} spots
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
        {!activeItinerary ? (
          <div style={{ padding: '16px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            🗺 Plan a trip to discover what's at your destination
          </div>
        ) : (
          <>
            {/* Wikipedia snippet */}
            {wikiSummary && (
              <div style={{
                padding: '8px 10px', borderRadius: 8, marginBottom: 6,
                background: '#F5FAF7', border: '1px solid rgba(58,107,79,0.12)',
              }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>
                  About
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                  {wikiSummary.length > 160 ? wikiSummary.slice(0, 160) + '…' : wikiSummary}
                </p>
              </div>
            )}

            {/* Curated activities */}
            {curatedTop.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 6 }}>
                {curatedTop.map((act) => {
                  const tag = CAT_TAG[act.category]
                  return (
                    <div key={act.id} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                      padding: '8px 10px', borderRadius: 8,
                      background: 'var(--bg-card)',
                      border: `1px solid ${act.isHiddenGem ? 'rgba(184,115,51,0.2)' : 'var(--border)'}`,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: 9.5, fontWeight: 700,
                            color: tag.color, background: tag.bg,
                            padding: '1px 6px', borderRadius: 4,
                            whiteSpace: 'nowrap',
                          }}>
                            {tag.label}
                          </span>
                          {act.isHiddenGem && (
                            <span style={{
                              fontSize: 9, fontWeight: 700, color: '#B87333',
                              background: '#FFF5EB', padding: '1px 5px', borderRadius: 4,
                            }}>
                              Local gem
                            </span>
                          )}
                          {act.cost === 'free' && (
                            <span style={{
                              fontSize: 9, fontWeight: 700, color: GREEN,
                              background: 'var(--green-light)', padding: '1px 5px', borderRadius: 4,
                            }}>
                              Free
                            </span>
                          )}
                        </div>
                        <div style={{
                          fontSize: 12, fontWeight: 700, color: 'var(--text-primary)',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {act.name}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          {act.duration}
                        </div>
                      </div>
                      <a
                        href={act.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          flexShrink: 0, fontSize: 10, fontWeight: 700, color: '#fff',
                          background: '#1C1C1A', padding: '3px 8px', borderRadius: 5,
                          textDecoration: 'none', marginTop: 2,
                        }}
                      >
                        Go ↗
                      </a>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Live Overpass POIs */}
            {nonFoodPOIs.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {curatedTop.length > 0 && (
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', padding: '2px 2px' }}>
                    From OpenStreetMap
                  </div>
                )}
                {nonFoodPOIs.map((poi) => {
                  const tag = POI_TAG[poi.type]
                  return (
                    <div key={poi.id} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                      padding: '8px 10px', borderRadius: 8,
                      background: 'var(--bg-card)', border: '1px solid var(--border)',
                    }}>
                      <div style={{ fontSize: 16, flexShrink: 0, marginTop: 2 }}>{POI_EMOJI[poi.type]}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                          <span style={{
                            fontSize: 9.5, fontWeight: 700,
                            color: tag.color, background: tag.bg,
                            padding: '1px 6px', borderRadius: 4,
                            whiteSpace: 'nowrap',
                          }}>
                            {tag.label}
                          </span>
                        </div>
                        <div style={{
                          fontSize: 12, fontWeight: 700, color: 'var(--text-primary)',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {poi.name}
                        </div>
                        {poi.routeLength && (
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{poi.routeLength}</div>
                        )}
                      </div>
                      {poi.website && (
                        <a
                          href={poi.website.startsWith('http') ? poi.website : `https://${poi.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            flexShrink: 0, fontSize: 10, fontWeight: 700, color: '#4285F4',
                            textDecoration: 'none', marginTop: 2,
                          }}
                        >
                          Site ↗
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {curatedTop.length === 0 && nonFoodPOIs.length === 0 && livePOIs === null && (
              <div style={{ padding: '8px 8px', fontSize: 11, color: 'var(--text-muted)' }}>
                Loading activities…
              </div>
            )}

            {curatedTop.length === 0 && nonFoodPOIs.length === 0 && livePOIs !== null && (
              <div style={{ padding: '16px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                No activities found for this destination
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
