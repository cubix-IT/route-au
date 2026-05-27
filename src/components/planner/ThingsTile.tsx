import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useActivities } from '@/hooks/useActivities'
import { fetchLivePOIs, fetchWikipediaSummary, type LivePOI } from '@/lib/overpass'

const GREEN = '#3A6B4F'

const POI_EMOJI: Record<LivePOI['type'], string> = {
  cafe: '☕', restaurant: '🍽', pub: '🍺',
  viewpoint: '👁', attraction: '🏛', hiking: '🥾',
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

  // Non-food Overpass POIs
  const nonFoodPOIs = (livePOIs ?? []).filter(
    (p) => p.type !== 'cafe' && p.type !== 'restaurant' && p.type !== 'pub'
  ).slice(0, 4)

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
                {curatedTop.map((act) => (
                  <div key={act.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 10px', borderRadius: 8,
                    background: 'var(--bg-card)',
                    border: `1px solid ${act.isHiddenGem ? 'rgba(184,115,51,0.2)' : 'var(--border)'}`,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12, fontWeight: 700, color: 'var(--text-primary)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {act.isHiddenGem && <span style={{ marginRight: 4 }}>✦</span>}{act.name}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {act.duration} · {act.cost === 'free' ? 'Free' : act.cost}
                      </div>
                    </div>
                    <a
                      href={act.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        flexShrink: 0, fontSize: 10, fontWeight: 700, color: '#fff',
                        background: '#1C1C1A', padding: '3px 8px', borderRadius: 5,
                        textDecoration: 'none',
                      }}
                    >
                      Go ↗
                    </a>
                  </div>
                ))}
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
                {nonFoodPOIs.map((poi) => (
                  <div key={poi.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 10px', borderRadius: 8,
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                  }}>
                    <div style={{ fontSize: 16, flexShrink: 0 }}>{POI_EMOJI[poi.type]}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
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
                          textDecoration: 'none',
                        }}
                      >
                        Site ↗
                      </a>
                    )}
                  </div>
                ))}
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
