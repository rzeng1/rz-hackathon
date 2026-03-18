import type { Vec2 } from './state'

/**
 * Returns a new Vec2 representing the next position after applying velocity over delta.
 * Pure function — no mutation, no side effects.
 * delta should be ticker.deltaTime (normalised to 1.0 at 60 FPS).
 */
export const calculateMovement = (
  currentPos: Vec2,
  velocity: Vec2,
  delta: number,
): Vec2 => ({
  x: currentPos.x + velocity.x * delta,
  y: currentPos.y + velocity.y * delta,
})
