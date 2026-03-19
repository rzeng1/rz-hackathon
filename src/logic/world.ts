import type { Rect } from './collision'

export const WORLD_WIDTH  = 1280
export const WORLD_HEIGHT = 720

/**
 * Named reference to the Energy Drink Cooler rect.
 * Exported so the view layer can render it with a distinct colour.
 * Also included in STATIC_OBSTACLES — single source of truth.
 */
export const COOLER_RECT: Rect = { x: 62, y: 62, width: 41, height: 68 }

/**
 * Static obstacle map for the office.
 * All coordinates are top-left origin, matching the Rect convention.
 *
 * INTERACTION BUFFER RULE: Collision boxes for NPC-adjacent furniture (Cooler,
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

  // ---- Energy Drink Cooler (Ernesto's post) ----
  // ~15% smaller than visual so interactionRadius remains accessible.
  COOLER_RECT,

  // ---- Engineering desks ----
  { x: 300, y: 200, width: 300, height: 60 },

  // ---- Sales desks ----
  { x: 700, y: 200, width: 300, height: 60 },

  // ---- HR desk ----
  { x: 300, y: 450, width: 160, height: 60 },

  // ---- CEO office wall — split into two pieces leaving the door gap passable ----
  { x: 900,  y: 400, width: 100, height: 16 }, // Left of door (x 900–1000)
  { x: 1060, y: 400, width: 140, height: 16 }, // Right of door (x 1060–1200)

  // ---- CEO desk ----
  // ~15% smaller than visual so interactionRadius remains accessible.
  { x: 958, y: 505, width: 153, height: 51 },

  // ---- Server Rack (customer-fire fix location) ----
  { x: 16, y: 620, width: 40, height: 60 },

  // ---- Lunch Room table (visual only — narrow so NPCs can path around it) ----
  { x: 555, y: 80, width: 100, height: 40 },
]

/**
 * Returns the full array of static obstacle Rects.
 * Pure — same output every call, no side effects.
 */
export const getStaticObstacles = (): Rect[] => STATIC_OBSTACLES
