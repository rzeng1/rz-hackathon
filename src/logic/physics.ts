import type { Vec2, Player } from './state'

/**
 * Returns a new Vec2 representing the next position after applying velocity over delta.
 * Pure function — no mutation, no side effects.
 * delta should be ticker.deltaTime (normalised to 1.0 at 60 FPS).
 */
/**
 * Returns the effective movement speed given the player's current energy
 * and caffeine state. Both modifiers stack multiplicatively.
 *
 *   energy < 20   → × 0.5  (exhausted — shuffling at half-pace)
 *   isCaffeinated → × 1.5  (caffeine high — blazing fast)
 *   both active   → × 0.75 (caffeinated but crashing)
 *
 * Pure function — no side effects.
 */
export const calcEffectiveSpeed = (
  baseSpeed: number,
  energy: number,
  isCaffeinated: boolean,
  isSprinting = false,
): number => {
  let speed = baseSpeed
  if (energy < 20)    speed *= 0.5
  if (isCaffeinated)  speed *= 1.5
  if (isSprinting)    speed *= 2.0
  return speed
}

/**
 * Convenience overload that accepts the full Player object.
 * Delegates to calcEffectiveSpeed — single source of truth.
 */
export const playerEffectiveSpeed = (player: Player, isSprinting = false): number =>
  calcEffectiveSpeed(player.speed, player.energy, player.isCaffeinated, isSprinting)

export const calculateMovement = (
  currentPos: Vec2,
  velocity: Vec2,
  delta: number,
): Vec2 => ({
  x: currentPos.x + velocity.x * delta,
  y: currentPos.y + velocity.y * delta,
})
