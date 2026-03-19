import { describe, it, expect } from 'vitest'
import {
  pickHotZone,
  isInHotZone,
  HOT_ZONE_DESKS,
  HOT_ZONE_INTERVAL,
  HOT_ZONE_DURATION,
  VC_VISIT_INTERVAL,
  VC_VISIT_DURATION,
  VC_PENALTY_RADIUS,
} from '../events'

// ---------------------------------------------------------------------------
// pickHotZone
// ---------------------------------------------------------------------------

describe('pickHotZone', () => {
  it('returns a Rect with positive dimensions', () => {
    const zone = pickHotZone(0.5)
    expect(zone.width).toBeGreaterThan(0)
    expect(zone.height).toBeGreaterThan(0)
  })

  it('maps roll=0 to the first desk', () => {
    const zone = pickHotZone(0)
    expect(zone).toEqual(HOT_ZONE_DESKS[0])
  })

  it('maps roll=0.999 to the last desk', () => {
    const zone = pickHotZone(0.999)
    expect(zone).toEqual(HOT_ZONE_DESKS[HOT_ZONE_DESKS.length - 1])
  })

  it('returns a fresh copy (not aliased to the constant)', () => {
    const zone = pickHotZone(0)
    expect(zone).not.toBe(HOT_ZONE_DESKS[0])
  })

  it('is deterministic for the same roll', () => {
    expect(pickHotZone(0.3)).toEqual(pickHotZone(0.3))
  })

  it('always picks one of the defined desks', () => {
    const rolls = [0, 0.25, 0.5, 0.75, 0.999]
    for (const roll of rolls) {
      const zone = pickHotZone(roll)
      const match = HOT_ZONE_DESKS.find(
        d => d.x === zone.x && d.y === zone.y && d.width === zone.width && d.height === zone.height,
      )
      expect(match).toBeDefined()
    }
  })
})

// ---------------------------------------------------------------------------
// isInHotZone
// ---------------------------------------------------------------------------

describe('isInHotZone', () => {
  const zone = { x: 300, y: 244, width: 300, height: 60 }

  it('returns true for a point inside the zone', () => {
    expect(isInHotZone(450, 274, zone)).toBe(true)
  })

  it('returns true on the left edge', () => {
    expect(isInHotZone(300, 260, zone)).toBe(true)
  })

  it('returns true on the right edge', () => {
    expect(isInHotZone(600, 260, zone)).toBe(true)
  })

  it('returns true on the top edge', () => {
    expect(isInHotZone(400, 244, zone)).toBe(true)
  })

  it('returns true on the bottom edge', () => {
    expect(isInHotZone(400, 304, zone)).toBe(true)
  })

  it('returns false for a point above the zone', () => {
    expect(isInHotZone(450, 243, zone)).toBe(false)
  })

  it('returns false for a point below the zone', () => {
    expect(isInHotZone(450, 305, zone)).toBe(false)
  })

  it('returns false for a point left of the zone', () => {
    expect(isInHotZone(299, 274, zone)).toBe(false)
  })

  it('returns false for a point right of the zone', () => {
    expect(isInHotZone(601, 274, zone)).toBe(false)
  })

  it('returns false for origin (0, 0) with a non-origin zone', () => {
    expect(isInHotZone(0, 0, zone)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Constants — sanity checks
// ---------------------------------------------------------------------------

describe('event constants', () => {
  it('HOT_ZONE_DURATION < HOT_ZONE_INTERVAL (zone expires before next spawns)', () => {
    expect(HOT_ZONE_DURATION).toBeLessThan(HOT_ZONE_INTERVAL)
  })

  it('VC_VISIT_DURATION < VC_VISIT_INTERVAL (visit expires before next spawns)', () => {
    expect(VC_VISIT_DURATION).toBeLessThan(VC_VISIT_INTERVAL)
  })

  it('VC_PENALTY_RADIUS is positive', () => {
    expect(VC_PENALTY_RADIUS).toBeGreaterThan(0)
  })

  it('HOT_ZONE_DESKS has at least one entry', () => {
    expect(HOT_ZONE_DESKS.length).toBeGreaterThan(0)
  })
})
