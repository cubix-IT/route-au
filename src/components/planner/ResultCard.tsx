import { useState } from 'react'

const GREEN = '#3A6B4F'

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
      {count != null && <span style={{ color: '#9CA3AF', marginLeft: 2 }}>({count.toLocaleString()})</span>}
    </span>
  )
}

function DriveTimeBadge({ minutes }: { minutes: number }) {
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  const label = hrs > 0 ? `${hrs}h ${mins}m` : `${mins} min`
  const color = minutes <= 20 ? '#16A34A' : minutes <= 35 ? '#D97706' : '#6B7280'
  const bg = minutes <= 20 ? '#F0FDF4' : minutes <= 35 ? '#FEF3C7' : '#F3F4F6'
  return (
    <span style={{
      fontSize: 9.5, fontWeight: 700, color, background: bg,
      padding: '2px 7px', borderRadius: 10, flexShrink: 0,
      border: `1px solid ${color}30`,
    }}>⏱ {label}</span>
  )
}

export function ResultCard({
  name, categoryLabel, categoryColor, categoryBg,
  emoji, description, rating, reviewCount, duration, address,
  openStatus, badges = [], driveMinutes,
  isHiddenGem, isAdded, highlighted,
  mapsUrl, website, phone,
  onAdd, onRemove, onMapPin,
}: ResultCardProps) {
  const [expanded, setExpanded] = useState(false)

  const handleClick = () => {
    setExpanded((v) => !v)
    if (!expanded && onMapPin) onMapPin()
  }

  const borderColor = highlighted ? '#3B82F6' : isAdded ? 'rgba(58,107,79,0.4)' : expanded ? 'rgba(58,107,79,0.35)' : 'var(--border)'
  const bg = highlighted ? '#F0F9FF' : isAdded ? '#F0FDF4' : isHiddenGem ? '#F0FDF4' : expanded ? '#F8FBF9' : '#fff'

  return (
    <div
      onClick={handleClick}
      style={{
        background: bg, borderRadius: 14,
        border: `1.5px solid ${borderColor}`,
        padding: '13px 15px', cursor: 'pointer',
        transition: 'all 0.15s',
        boxShadow: highlighted ? '0 0 0 3px rgba(59,130,246,0.2)'
          : isHiddenGem ? '0 2px 8px rgba(58,107,79,0.1)'
          : expanded ? '0 4px 20px rgba(0,0,0,0.09)'
          : '0 1px 3px rgba(0,0,0,0.04)',
        transform: expanded ? 'translateY(-1px)' : 'none',
      }}
    >
      {/* ── Header row ── */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Chips row — max 2 rows (#20) */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 5, alignItems: 'center', maxHeight: 44, overflow: 'hidden' }}>
            <span style={{
              display: 'inline-block', fontSize: 9.5, fontWeight: 600,
              color: categoryColor, background: categoryBg,
              padding: '2px 7px', borderRadius: 4,
              textTransform: 'uppercase', letterSpacing: '0.06em',
              border: `1px solid ${categoryColor}30`,
            }}>{emoji ? `${emoji} ` : ''}{categoryLabel}</span>
            {isAdded && <span style={{ fontSize: 9.5, fontWeight: 600, color: '#0369A1', background: '#E0F2FE', padding: '2px 7px', borderRadius: 4, border: '1px solid rgba(3,105,161,0.2)' }}>✓ In your plan</span>}
            {badges.map((b) => (
              <span key={b.label} style={{ fontSize: 9.5, fontWeight: 600, color: b.color, background: b.bg, padding: '2px 7px', borderRadius: 4, border: `1px solid ${b.color}25` }}>{b.label}</span>
            ))}
          </div>

          {/* Name */}
          <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1C1B1F', marginBottom: 3, lineHeight: 1.3 }}>{name}</div>

          {/* Rating */}
          {rating != null && <div style={{ marginBottom: 3 }}><StarRating rating={rating} count={reviewCount} /></div>}

          {/* Description — truncated when collapsed */}
          {!expanded && description && (
            <div style={{ fontSize: 11.5, color: '#49454F', lineHeight: 1.55 }}>
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
          {duration && <div style={{ fontSize: 10.5, color: '#9CA3AF', marginTop: 4 }}>⏱ {duration}</div>}
          {address && !duration && <div style={{ fontSize: 10.5, color: '#9CA3AF', marginTop: 4 }}>📍 {address}</div>}
        </div>

        {/* Right column: badges + chevron */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
          {driveMinutes != null && <DriveTimeBadge minutes={driveMinutes} />}
          {isHiddenGem && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#E8F5EE', border: '1px solid rgba(58,107,79,0.2)', borderRadius: 20, padding: '3px 8px' }}>
              <span style={{ fontSize: 10, color: GREEN }}>◆</span>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: GREEN, letterSpacing: '0.02em' }}>Local gem</span>
            </span>
          )}
          {onMapPin && !isHiddenGem && (
            <button onClick={(e) => { e.stopPropagation(); onMapPin() }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: highlighted ? '#3B82F6' : '#C8C4BD', padding: 0, lineHeight: 1 }}
              title="Show on map">📍</button>
          )}
          <span style={{ fontSize: 12, color: '#9CA3AF', transition: 'transform 0.15s', transform: expanded ? 'rotate(180deg)' : 'none', marginTop: 2 }}>▾</span>
        </div>
      </div>

      {/* ── Expanded content ── */}
      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }} onClick={(e) => e.stopPropagation()}>
          {description && <p style={{ fontSize: 12, color: '#374151', lineHeight: 1.65, margin: 0 }}>{description}</p>}
          {address && <div style={{ fontSize: 11.5, color: '#6B7280' }}>📍 {address}</div>}
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
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 9, background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#16A34A', textDecoration: 'none', fontSize: 16 }}>
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
                style={{ padding: '9px 14px', borderRadius: 9, border: `1.5px solid ${GREEN}`, background: '#E8F5EE', color: GREEN, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
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
