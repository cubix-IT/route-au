import { GREEN, WARM, SECONDARY } from '@/lib/brand'
import { useState } from 'react'


export interface ResultCardProps {
  // Identity
  name: string
  categoryLabel: string
  categoryColor: string
  categoryBg: string
  // Optional metadata
  emoji?: string
  description?: string
  rating?: number
  reviewCount?: number
  duration?: string
  address?: string
  openingHours?: string   // raw OSM opening_hours string (e.g. "Mo-Fr 09:00-17:00")
  openStatus?: { isOpen: boolean; nextOpen?: string } | null
  badges?: Array<{ label: string; color: string; bg: string }>
  driveMinutes?: number | null   // from OSRM — shown top-right, filters >45 min
  isHiddenGem?: boolean
  isAdded?: boolean
  // Actions
  mapsUrl: string
  website?: string
  phone?: string
  onAdd?: () => void
  onRemove?: () => void
  onMapPin?: () => void
  // Visual
  highlighted?: boolean
  // Controlled expand — parent tracks which card is open
  expanded?: boolean
  onExpand?: () => void
}

// Lightly prettify an OSM opening_hours string for display (cosmetic only):
// "Mo-Fr 09:00-17:00; Sa 09:00-13:00" → "Mon–Fri 09:00–17:00 · Sat 09:00–13:00"
function formatHours(s: string): string {
  return s
    .replace(/\bMo\b/g, 'Mon').replace(/\bTu\b/g, 'Tue').replace(/\bWe\b/g, 'Wed')
    .replace(/\bTh\b/g, 'Thu').replace(/\bFr\b/g, 'Fri').replace(/\bSa\b/g, 'Sat').replace(/\bSu\b/g, 'Sun')
    .replace(/\s*;\s*/g, ' · ')
    .replace(/-/g, '–')
    .trim()
}

function StarRating({ rating, count }: { rating: number; count?: number }) {
  const full = Math.floor(rating)
  const half = rating - full >= 0.5
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ color: i < full ? '#F59E0B' : (i === full && half) ? '#F59E0B' : '#D1D5DB', fontSize: 10 }}>
          {i < full ? '★' : (i === full && half) ? '⯨' : '☆'}
        </span>
      ))}
      {count != null && <span style={{ color: 'var(--text-muted)', marginLeft: 2 }}>({count.toLocaleString()})</span>}
    </span>
  )
}

function DriveTimeBadge({ minutes }: { minutes: number }) {
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  const label = hrs > 0 ? `${hrs}h ${mins}m` : `${mins} min`
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, color: SECONDARY,
      display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0,
    }}>
      <span style={{ fontSize: 9 }}>⏱</span>{label}
    </span>
  )
}

export function ResultCard({
  name, categoryLabel, categoryColor, categoryBg,
  emoji, description, rating, reviewCount, duration, address,
  openingHours, openStatus, badges = [], driveMinutes,
  isHiddenGem, isAdded, highlighted,
  mapsUrl, website, phone,
  onAdd, onRemove, onMapPin,
  expanded: expandedProp, onExpand,
}: ResultCardProps) {
  const [localExpanded, setLocalExpanded] = useState(false)
  const expanded = expandedProp !== undefined ? expandedProp : localExpanded

  const handleClick = () => {
    if (onExpand) {
      onExpand()
    } else {
      setLocalExpanded((v) => !v)
    }
    if (!expanded && onMapPin) onMapPin()
  }

  const borderColor = highlighted ? 'var(--green)' : isAdded ? 'rgba(146,64,14,0.25)' : expanded ? 'rgba(58,107,79,0.35)' : 'var(--border)'
  const bg = highlighted ? 'var(--green-light)' : isAdded ? '#FFFBF5' : isHiddenGem ? '#F8FBF9' : expanded ? '#F8FBF9' : '#fff'

  return (
    <div
      onClick={handleClick}
      style={{
        background: bg, borderRadius: 14,
        border: `1.5px solid ${borderColor}`,
        padding: '13px 15px', cursor: 'pointer',
        transition: 'all 0.15s',
        boxShadow: highlighted ? '0 0 0 3px var(--green-glow)'
          : isHiddenGem ? 'var(--shadow-sm)'
          : expanded ? 'var(--shadow-md)'
          : 'var(--shadow-sm)',
        transform: expanded ? 'translateY(-1px)' : 'none',
      }}
    >
      {/* ── Header row ── */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Category label — flat text with dot, clearly not a button */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 5, alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: categoryColor, flexShrink: 0, display: 'inline-block' }} />
              {emoji ? `${emoji} ` : ''}{categoryLabel}
            </span>
            {isAdded && (
              <span style={{ fontSize: 10, fontWeight: 600, color: SECONDARY, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: SECONDARY, flexShrink: 0, display: 'inline-block' }} />
                In your plan
              </span>
            )}
            {badges.map((b) => (
              <span key={b.label} style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: b.color, flexShrink: 0, display: 'inline-block' }} />
                {b.label}
              </span>
            ))}
          </div>

          {/* Name */}
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3, lineHeight: 1.3 }}>{name}</div>

          {/* Rating */}
          {rating != null && <div style={{ marginBottom: 3 }}><StarRating rating={rating} count={reviewCount} /></div>}

          {/* Description — truncated when collapsed */}
          {!expanded && description && (
            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              {description.length > 90 ? description.slice(0, 90) + '…' : description}
            </div>
          )}

          {/* Open status (collapsed) */}
          {openStatus && !expanded && (
            <div style={{ fontSize: 10.5, fontWeight: 600, color: openStatus.isOpen ? '#16A34A' : '#DC2626', marginTop: 3 }}>
              {openStatus.isOpen ? 'Open now' : `Closed${openStatus.nextOpen ? ` — opens ${openStatus.nextOpen}` : ''}`}
            </div>
          )}

          {/* Duration / address */}
          {duration && <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4 }}>⏱ {duration}</div>}
          {address && !duration && <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4 }}>📍 {address}</div>}
        </div>

        {/* Right column: badges + chevron */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
          {driveMinutes != null && <DriveTimeBadge minutes={driveMinutes} />}
          {isHiddenGem && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'var(--green-light)', border: '1px solid rgba(58,107,79,0.2)', borderRadius: 20, padding: '3px 8px' }}>
              <span style={{ fontSize: 10, color: GREEN }}>◆</span>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: GREEN, letterSpacing: '0.02em' }}>Local gem</span>
            </span>
          )}
          {onMapPin && !isHiddenGem && (
            <button onClick={(e) => { e.stopPropagation(); onMapPin() }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: highlighted ? 'var(--green)' : '#C8C4BD', padding: 0, lineHeight: 1 }}
              title="Show on map">📍</button>
          )}
          <span style={{ fontSize: 12, color: 'var(--text-muted)', transition: 'transform 0.15s', transform: expanded ? 'rotate(180deg)' : 'none', marginTop: 2 }}>▾</span>
        </div>
      </div>

      {/* ── Expanded content ── */}
      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }} onClick={(e) => e.stopPropagation()}>
          {description && <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>{description}</p>}
          {address && <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>📍 {address}</div>}
          {openingHours && (
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', gap: 5, alignItems: 'flex-start' }}>
              <span style={{ flexShrink: 0 }}>🕒</span><span>{formatHours(openingHours)}</span>
            </div>
          )}
          {openStatus && (
            <div style={{ fontSize: 11.5, fontWeight: 600, color: openStatus.isOpen ? '#16A34A' : '#DC2626' }}>
              {openStatus.isOpen ? 'Open now' : `Closed${openStatus.nextOpen ? ` — opens ${openStatus.nextOpen}` : ''}`}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {website && (
              <a href={website.startsWith('http') ? website : `https://${website}`}
                target="_blank" rel="noopener noreferrer"
                style={{ padding: '9px 14px', borderRadius: 9, background: GREEN, color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                Website ↗
              </a>
            )}
            <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
              {phone && (
                <a href={`tel:${phone}`} title={phone}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 9, background: 'var(--green-light)', border: '1px solid #BBF7D0', color: '#16A34A', textDecoration: 'none', fontSize: 16 }}>
                  📞
                </a>
              )}
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" title="Open in Google Maps"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 9, background: '#1C1B1F', color: '#fff', textDecoration: 'none', fontSize: 16 }}>
                📍
              </a>
            </div>
            {onAdd && !isAdded && (
              <button onClick={(e) => { e.stopPropagation(); onAdd() }}
                style={{ padding: '9px 14px', borderRadius: 9, border: `1.5px solid ${GREEN}`, background: 'var(--green-light)', color: GREEN, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                + Plan it
              </button>
            )}
            {onRemove && isAdded && (
              <button onClick={(e) => { e.stopPropagation(); onRemove() }}
                style={{ padding: '9px 14px', borderRadius: 9, border: '1.5px solid rgba(220,38,38,0.3)', background: '#FEF2F2', color: '#B91C1C', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Remove
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
