import type { Rect } from './collision'

export const WORLD_WIDTH  = 1280
export const WORLD_HEIGHT = 720

/**
 * Static obstacle map for the office.
 * All coordinates are top-left origin, matching the Rect convention.
 *
 * INTERACTION BUFFER RULE: Collision boxes for NPC-adjacent furniture (Fridge,
 * CEO Desk) are intentionally 10–20% smaller than the visual sprite footprint.
 * This ensures the player can enter the NPC's interactionRadius without being
 * blocked by the obstacle geometry.
 *
 * This array is the single source of truth — read by both the logic layer
 * (applyCollisions) and the render layer (debug overlay, sprite placement).
 */
export const STATIC_OBSTACLES: Rect[] = [
  // ---- Border walls ----
  { x: 0,    y: 0,   width: 1280, height: 16  }, // Top
  { x: 0,    y: 704, width: 1280, height: 16  }, // Bottom
  { x: 0,    y: 0,   width: 16,   height: 720 }, // Left
  { x: 1264, y: 0,   width: 16,   height: 720 }, // Right

  // ---- Reception desk ----
  { x: 100, y: 80, width: 160, height: 60 },

  // ---- Fridge (Ernesto's post) ----
  // Collision box ~15% smaller than visual to keep interactionRadius accessible.
  { x: 62, y: 62, width: 41, height: 68 },

  // ---- Engineering desks (Priya's area) ----
  { x: 300, y: 200, width: 300, height: 60 },

  // ---- Sales desks (Jake's area) ----
  { x: 700, y: 200, width: 300, height: 60 },

  // ---- HR desk (Linda's area) ----
  { x: 300, y: 450, width: 160, height: 60 },

  // ---- CEO office wall — split into two pieces leaving the door gap passable ----
  { x: 900,  y: 400, width: 100, height: 16 }, // Left of door (x 900–1000)
  { x: 1060, y: 400, width: 140, height: 16 }, // Right of door (x 1060–1200)

  // ---- CEO desk ----
  // Collision box ~15% smaller than visual to keep interactionRadius accessible.
  { x: 958, y: 505, width: 153, height: 51 },
]

/**
 * Returns the full array of static obstacle Rects.
 * Pure — same output every call, no side effects.
 */
export const getStaticObstacles = (): Rect[] => STATIC_OBSTACLES
