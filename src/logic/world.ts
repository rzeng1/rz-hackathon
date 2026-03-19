import type { Rect } from './collision'

export const WORLD_WIDTH  = 1280
export const WORLD_HEIGHT = 720

/**
 * Energy Drink Cooler — bottom-left area, next to the Server Rack.
 * Ernesto guards this cooler; players must walk across the office to reach him,
 * keeping the top-left corner clear for the HUD.
 */
export const COOLER_RECT: Rect = { x: 110, y: 590, width: 41, height: 68 }

/**
 * Bounds of the Lunch Room area — used by the renderer to draw a distinct
 * carpet texture. Not a collision obstacle; purely cosmetic.
 */
export const LUNCH_ROOM_BOUNDS: Rect = { x: 490, y: 40, width: 250, height: 190 }

/**
 * Static obstacle map for the office.
 * All coordinates are top-left origin, matching the Rect convention.
 *
 * BORDER WALLS: 40px thick — creates a visible gutter so the player
 * never touches the raw canvas edge.
 *
 * INTERACTION BUFFER RULE: Collision boxes for NPC-adjacent furniture (Cooler,
 * CEO Desk) are intentionally 10–20% smaller than the visual sprite footprint.
 * This ensures the player can enter the NPC's interactionRadius without being
 * blocked by the obstacle geometry.
 *
 * DESK SPACING: Desks are spaced with ~20% more vertical room vs the original
 * layout so NPCs have breathing room during the 12:00 lunch migration.
 *
 * This array is the single source of truth — read by both the logic layer
 * (applyCollisions) and the render layer (debug overlay, sprite placement).
 */
export const STATIC_OBSTACLES: Rect[] = [
  // ---- Border walls (40px gutter — player never touches canvas edge) ----
  { x: 0,    y: 0,   width: 1280, height: 40  }, // Top
  { x: 0,    y: 680, width: 1280, height: 40  }, // Bottom
  { x: 0,    y: 0,   width: 40,   height: 720 }, // Left
  { x: 1240, y: 0,   width: 40,   height: 720 }, // Right

  // ---- Reception desk (top-left area) ----
  { x: 100, y: 90, width: 160, height: 60 },

  // ---- Lunch Room table (narrow so NPCs can path around it) ----
  { x: 555, y: 90, width: 100, height: 40 },

  // ---- Engineering desks (left row) ----
  { x: 300, y: 244, width: 300, height: 60 },

  // ---- Sales desks (right row) ----
  { x: 700, y: 244, width: 300, height: 60 },

  // ---- HR desk ----
  { x: 300, y: 520, width: 160, height: 60 },

  // ---- CEO office wall — split with door gap (passable at x 1000–1060) ----
  { x: 900,  y: 470, width: 100, height: 16 }, // Left of door
  { x: 1060, y: 470, width: 140, height: 16 }, // Right of door

  // ---- CEO desk (~15% smaller than visual) ----
  { x: 958, y: 575, width: 153, height: 51 },

  // ---- Server Rack (customer-fire fix location, bottom-left) ----
  { x: 40, y: 610, width: 40, height: 60 },

  // ---- Energy Drink Cooler (Ernesto's post, bottom-left beside server rack) ----
  COOLER_RECT,
]

/**
 * Returns the full array of static obstacle Rects.
 * Pure — same output every call, no side effects.
 */
export const getStaticObstacles = (): Rect[] => STATIC_OBSTACLES
