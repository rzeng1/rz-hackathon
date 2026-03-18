import { describe, it, expect } from 'vitest'
import {
  getEntityRect,
  rectsOverlap,
  resolveAxisX,
  resolveAxisY,
  applyCollisions,
} from '../collision'
import type { Rect } from '../collision'

// ---------------------------------------------------------------------------
// getEntityRect
// ---------------------------------------------------------------------------

describe('getEntityRect', () => {
  it('converts center position to top-left-origin Rect', () => {
    expect(getEntityRect({ x: 50, y: 100 }, 20, 20)).toEqual({ x: 40, y: 90, width: 20, height: 20 })
  })
})

// ---------------------------------------------------------------------------
// rectsOverlap
// ---------------------------------------------------------------------------

describe('rectsOverlap', () => {
  const a: Rect = { x: 0, y: 0, width: 20, height: 20 }

  it('returns true for clearly overlapping rects', () => {
    const b: Rect = { x: 10, y: 10, width: 20, height: 20 }
    expect(rectsOverlap(a, b)).toBe(true)
  })

  it('returns false for adjacent (touching) rects — no penetration', () => {
    const b: Rect = { x: 20, y: 0, width: 20, height: 20 } // right edge of a == left edge of b
    expect(rectsOverlap(a, b)).toBe(false)
  })

  it('returns false for clearly non-overlapping rects', () => {
    const b: Rect = { x: 100, y: 100, width: 20, height: 20 }
    expect(rectsOverlap(a, b)).toBe(false)
  })

  it('returns true when one rect fully contains the other', () => {
    const b: Rect = { x: 5, y: 5, width: 5, height: 5 }
    expect(rectsOverlap(a, b)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// resolveAxisX
// ---------------------------------------------------------------------------

describe('resolveAxisX', () => {
  const obstacle: Rect = { x: 50, y: 0, width: 100, height: 100 }

  it('returns original x when rects do not overlap', () => {
    const entity: Rect = { x: 0, y: 0, width: 20, height: 20 }
    expect(resolveAxisX(entity, obstacle)).toBe(entity.x)
  })

  it('pushes entity left when approaching from the left', () => {
    // entity right edge (55) crosses obstacle left edge (50) slightly
    const entity: Rect = { x: 35, y: 10, width: 20, height: 20 }
    const result = resolveAxisX(entity, obstacle)
    expect(result).toBe(obstacle.x - entity.width) // pushed to x=30
  })

  it('pushes entity right when approaching from the right', () => {
    // entity left edge (140) is inside obstacle right (150)
    const entity: Rect = { x: 140, y: 10, width: 20, height: 20 }
    const result = resolveAxisX(entity, obstacle)
    expect(result).toBe(obstacle.x + obstacle.width) // pushed to x=150
  })

  it('resolved position places entity outside obstacle', () => {
    const entity: Rect = { x: 35, y: 10, width: 20, height: 20 }
    const resolved = resolveAxisX(entity, obstacle)
    const resolvedRect = { ...entity, x: resolved }
    expect(rectsOverlap(resolvedRect, obstacle)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// resolveAxisY
// ---------------------------------------------------------------------------

describe('resolveAxisY', () => {
  const obstacle: Rect = { x: 0, y: 50, width: 100, height: 100 }

  it('returns original y when rects do not overlap', () => {
    const entity: Rect = { x: 10, y: 0, width: 20, height: 20 }
    expect(resolveAxisY(entity, obstacle)).toBe(entity.y)
  })

  it('pushes entity up when approaching from above', () => {
    // entity bottom edge (75) crosses obstacle top edge (50)
    const entity: Rect = { x: 10, y: 55, width: 20, height: 20 }
    const result = resolveAxisY(entity, obstacle)
    expect(result).toBe(obstacle.y - entity.height) // pushed to y=30
  })

  it('pushes entity down when approaching from below', () => {
    // entity top edge (140) is inside obstacle bottom (150)
    const entity: Rect = { x: 10, y: 140, width: 20, height: 20 }
    const result = resolveAxisY(entity, obstacle)
    expect(result).toBe(obstacle.y + obstacle.height) // pushed to y=150
  })

  it('resolved position places entity outside obstacle', () => {
    const entity: Rect = { x: 10, y: 55, width: 20, height: 20 }
    const resolved = resolveAxisY(entity, obstacle)
    const resolvedRect = { ...entity, y: resolved }
    expect(rectsOverlap(resolvedRect, obstacle)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// applyCollisions
// ---------------------------------------------------------------------------

describe('applyCollisions', () => {
  const entitySize = { width: 20, height: 20 }

  it('returns unchanged position when there are no obstacles', () => {
    const pos = { x: 100, y: 100 }
    const result = applyCollisions(pos, entitySize, [], { x: 3, y: 3 }, 1)
    expect(result).toEqual({ x: 103, y: 103 })
  })

  it('X is blocked but Y still moves — player slides along a vertical wall', () => {
    // Wall to the right of the entity
    const obstacle: Rect = { x: 51, y: 0, width: 200, height: 200 }
    // Entity center at (40, 100), moving right + down
    const pos = { x: 40, y: 100 }
    const velocity = { x: 5, y: 5 }
    const result = applyCollisions(pos, entitySize, [obstacle], velocity, 1)

    // X should be blocked (entity right edge = 50, wall left = 51 — just touching after resolution)
    expect(result.x).toBeLessThanOrEqual(41)  // shouldn't have moved right into the wall
    // Y should have moved down
    expect(result.y).toBeGreaterThan(100)
  })

  it('Y is blocked but X still moves — player slides along a horizontal wall', () => {
    // Floor below the entity
    const obstacle: Rect = { x: 0, y: 111, width: 400, height: 100 }
    const pos = { x: 100, y: 100 }
    const velocity = { x: 5, y: 5 }
    const result = applyCollisions(pos, entitySize, [obstacle], velocity, 1)

    // Y should be blocked
    expect(result.y).toBeLessThanOrEqual(101)
    // X should have moved right
    expect(result.x).toBeGreaterThan(100)
  })

  it('player approaching a corner resolves both axes independently without sticking', () => {
    // Two walls forming a corner — right wall and bottom wall
    const obstacles: Rect[] = [
      { x: 111, y: 0,   width: 200, height: 200 }, // right wall
      { x: 0,   y: 111, width: 200, height: 200 }, // bottom wall
    ]
    const pos = { x: 100, y: 100 }
    const velocity = { x: 5, y: 5 }
    const result = applyCollisions(pos, entitySize, obstacles, velocity, 1)

    // Neither axis should penetrate an obstacle
    const playerRect = getEntityRect(result, entitySize.width, entitySize.height)
    for (const obs of obstacles) {
      expect(rectsOverlap(playerRect, obs)).toBe(false)
    }
    // Result should be a valid position, not NaN
    expect(Number.isFinite(result.x)).toBe(true)
    expect(Number.isFinite(result.y)).toBe(true)
  })
})
