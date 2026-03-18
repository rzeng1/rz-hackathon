import type { Vec2 } from './state'

/**
 * Raw keyboard state captured by the view layer.
 * Passed into inputToVelocity — DOM concerns never cross into logic.
 */
export type InputDirection = {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
}

/**
 * Converts InputDirection booleans into a velocity Vec2 scaled by speed.
 * Diagonal movement is normalised so the player never moves faster than speed.
 * Returns { x: 0, y: 0 } when no keys are held — Instant Stop (confirmed design).
 */
export const inputToVelocity = (input: InputDirection, speed: number): Vec2 => {
  let x = 0
  let y = 0
  if (input.left)  x -= 1
  if (input.right) x += 1
  if (input.up)    y -= 1
  if (input.down)  y += 1

  if (x === 0 && y === 0) return { x: 0, y: 0 }

  // Normalise diagonal to maintain constant speed on all directions
  const magnitude = Math.sqrt(x * x + y * y)
  return { x: (x / magnitude) * speed, y: (y / magnitude) * speed }
}

/**
 * Clamps a center-point position so the entity never exits the world boundary.
 * entityHalfSize is subtracted/added so the entity edges never cross the edge.
 * Called as the final step after calculateMovement and applyCollisions.
 */
export const clampToWorld = (
  position: Vec2,
  worldWidth: number,
  worldHeight: number,
  entityHalfSize: number,
): Vec2 => ({
  x: Math.max(entityHalfSize, Math.min(worldWidth  - entityHalfSize, position.x)),
  y: Math.max(entityHalfSize, Math.min(worldHeight - entityHalfSize, position.y)),
})
