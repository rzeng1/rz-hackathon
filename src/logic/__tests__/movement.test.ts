import { describe, it, expect } from 'vitest'
import { inputToVelocity, clampToWorld } from '../movement'
import type { InputDirection } from '../movement'

const NO_INPUT: InputDirection = { up: false, down: false, left: false, right: false }
const SPEED = 3

// ---------------------------------------------------------------------------
// inputToVelocity
// ---------------------------------------------------------------------------

describe('inputToVelocity', () => {
  it('returns { x: 0, y: 0 } when no keys are pressed (Instant Stop)', () => {
    expect(inputToVelocity(NO_INPUT, SPEED)).toEqual({ x: 0, y: 0 })
  })

  it('up → negative y at full speed', () => {
    const v = inputToVelocity({ ...NO_INPUT, up: true }, SPEED)
    expect(v.x).toBe(0)
    expect(v.y).toBeCloseTo(-SPEED)
  })

  it('down → positive y at full speed', () => {
    const v = inputToVelocity({ ...NO_INPUT, down: true }, SPEED)
    expect(v.x).toBe(0)
    expect(v.y).toBeCloseTo(SPEED)
  })

  it('left → negative x at full speed', () => {
    const v = inputToVelocity({ ...NO_INPUT, left: true }, SPEED)
    expect(v.x).toBeCloseTo(-SPEED)
    expect(v.y).toBe(0)
  })

  it('right → positive x at full speed', () => {
    const v = inputToVelocity({ ...NO_INPUT, right: true }, SPEED)
    expect(v.x).toBeCloseTo(SPEED)
    expect(v.y).toBe(0)
  })

  it('up + right diagonal is normalised — magnitude equals speed', () => {
    const v = inputToVelocity({ ...NO_INPUT, up: true, right: true }, SPEED)
    const magnitude = Math.sqrt(v.x * v.x + v.y * v.y)
    expect(magnitude).toBeCloseTo(SPEED)
  })

  it('up + down cancel out → { x: 0, y: 0 }', () => {
    expect(inputToVelocity({ ...NO_INPUT, up: true, down: true }, SPEED)).toEqual({ x: 0, y: 0 })
  })

  it('left + right cancel out → { x: 0, y: 0 }', () => {
    expect(inputToVelocity({ ...NO_INPUT, left: true, right: true }, SPEED)).toEqual({ x: 0, y: 0 })
  })

  it('down + left diagonal is normalised — magnitude equals speed', () => {
    const v = inputToVelocity({ ...NO_INPUT, down: true, left: true }, SPEED)
    const magnitude = Math.sqrt(v.x * v.x + v.y * v.y)
    expect(magnitude).toBeCloseTo(SPEED)
  })
})

// ---------------------------------------------------------------------------
// clampToWorld
// ---------------------------------------------------------------------------

describe('clampToWorld', () => {
  const W = 1280
  const H = 720
  const HALF = 10

  it('does not clamp when position is well within bounds', () => {
    expect(clampToWorld({ x: 400, y: 300 }, W, H, HALF)).toEqual({ x: 400, y: 300 })
  })

  it('clamps x to entityHalfSize when too far left', () => {
    expect(clampToWorld({ x: 0, y: 300 }, W, H, HALF).x).toBe(HALF)
  })

  it('clamps x to worldWidth - entityHalfSize when too far right', () => {
    expect(clampToWorld({ x: 1300, y: 300 }, W, H, HALF).x).toBe(W - HALF)
  })

  it('clamps y to entityHalfSize when too far up', () => {
    expect(clampToWorld({ x: 400, y: -5 }, W, H, HALF).y).toBe(HALF)
  })

  it('clamps y to worldHeight - entityHalfSize when too far down', () => {
    expect(clampToWorld({ x: 400, y: 800 }, W, H, HALF).y).toBe(H - HALF)
  })

  it('entity edge never exits the world (accounts for halfSize)', () => {
    const result = clampToWorld({ x: -999, y: -999 }, W, H, HALF)
    expect(result.x - HALF).toBeGreaterThanOrEqual(0)
    expect(result.y - HALF).toBeGreaterThanOrEqual(0)
  })
})
