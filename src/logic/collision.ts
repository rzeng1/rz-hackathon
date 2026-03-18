import type { Vec2 } from './state'
import { calculateMovement } from './physics'

/**
 * Axis-aligned bounding box. x, y are the top-left corner.
 * Entity positions are center-points; use getEntityRect to convert.
 */
export type Rect = {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Converts a center-point position + dimensions into a top-left-origin Rect.
 */
export const getEntityRect = (position: Vec2, width: number, height: number): Rect => ({
  x: position.x - width  / 2,
  y: position.y - height / 2,
  width,
  height,
})

/**
 * Standard AABB overlap test. Adjacent (touching) rects return false.
 */
export const rectsOverlap = (a: Rect, b: Rect): boolean =>
  a.x         < b.x + b.width  &&
  a.x + a.width  > b.x         &&
  a.y         < b.y + b.height &&
  a.y + a.height > b.y

/**
 * If entityRect overlaps obstacleRect, returns the corrected rect.x that pushes
 * the entity out on the X axis (direction of least penetration).
 * Returns the original entityRect.x when there is no overlap.
 */
export const resolveAxisX = (entityRect: Rect, obstacleRect: Rect): number => {
  if (!rectsOverlap(entityRect, obstacleRect)) return entityRect.x

  const penetrationLeft  = entityRect.x + entityRect.width - obstacleRect.x
  const penetrationRight = obstacleRect.x + obstacleRect.width - entityRect.x

  return penetrationLeft <= penetrationRight
    ? obstacleRect.x - entityRect.width        // push entity left
    : obstacleRect.x + obstacleRect.width      // push entity right
}

/**
 * If entityRect overlaps obstacleRect, returns the corrected rect.y that pushes
 * the entity out on the Y axis (direction of least penetration).
 * Returns the original entityRect.y when there is no overlap.
 */
export const resolveAxisY = (entityRect: Rect, obstacleRect: Rect): number => {
  if (!rectsOverlap(entityRect, obstacleRect)) return entityRect.y

  const penetrationTop    = entityRect.y + entityRect.height - obstacleRect.y
  const penetrationBottom = obstacleRect.y + obstacleRect.height - entityRect.y

  return penetrationTop <= penetrationBottom
    ? obstacleRect.y - entityRect.height       // push entity up
    : obstacleRect.y + obstacleRect.height     // push entity down
}

/**
 * Per-axis sequential collision resolution.
 *
 * Resolves X first, then Y independently. This gives wall-sliding for free:
 * a diagonal move blocked on X will still produce Y movement.
 * It also prevents corner-sticking since each axis is resolved separately.
 *
 * Resolution order:
 *   1. Apply X-only displacement via calculateMovement
 *   2. Resolve X overlaps → safeX
 *   3. Apply Y-only displacement from safeX position via calculateMovement
 *   4. Resolve Y overlaps → safeY
 *   5. Return { x: safeX, y: safeY }
 */
export const applyCollisions = (
  position: Vec2,
  entitySize: { width: number; height: number },
  obstacles: Rect[],
  velocity: Vec2,
  delta: number,
): Vec2 => {
  const { width, height } = entitySize
  const halfW = width  / 2
  const halfH = height / 2

  // ---- X axis ----
  const candidateX = calculateMovement(position, { x: velocity.x, y: 0 }, delta)
  let rectX = getEntityRect(candidateX, width, height)

  for (const obstacle of obstacles) {
    const resolvedX = resolveAxisX(rectX, obstacle)
    rectX = { ...rectX, x: resolvedX }
  }
  const safeX = rectX.x + halfW

  // ---- Y axis ----
  const candidateY = calculateMovement({ x: safeX, y: position.y }, { x: 0, y: velocity.y }, delta)
  let rectY = getEntityRect(candidateY, width, height)

  for (const obstacle of obstacles) {
    const resolvedY = resolveAxisY(rectY, obstacle)
    rectY = { ...rectY, y: resolvedY }
  }
  const safeY = rectY.y + halfH

  return { x: safeX, y: safeY }
}
