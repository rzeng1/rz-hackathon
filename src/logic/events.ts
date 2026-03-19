import type { Rect } from './collision'

/**
 * Desks eligible to become Hot Zones during a Fire Drill event.
 * Indices map to desk positions in world.ts.
 */
export const HOT_ZONE_DESKS: readonly Rect[] = [
  { x: 300, y: 244, width: 300, height: 60 }, // Engineering row
  { x: 700, y: 244, width: 300, height: 60 }, // Sales row
  { x: 300, y: 520, width: 160, height: 60 }, // HR desk
  { x: 100, y: 90,  width: 160, height: 60 }, // Reception desk
] as const

/** Ticks between consecutive Fire Drill events (≈ 40 s at 60 fps). */
export const HOT_ZONE_INTERVAL = 2400
/** Ticks a Hot Zone persists before being cleared (≈ 15 s at 60 fps). */
export const HOT_ZONE_DURATION = 900
/** Ticks between VC Visit events (≈ 80 s at 60 fps). */
export const VC_VISIT_INTERVAL = 4800
/** Ticks a VC Visit lasts (≈ 20 s at 60 fps). */
export const VC_VISIT_DURATION = 1200
/** Pixel radius from Chaz's position that triggers the VC penalty aura. */
export const VC_PENALTY_RADIUS = 100

/**
 * Picks a Hot Zone desk from the fixed list using a 0–1 roll. Pure.
 * Returns a fresh Rect copy so state is never aliased to the constant array.
 */
export const pickHotZone = (roll: number): Rect => {
  const idx = Math.floor(roll * HOT_ZONE_DESKS.length)
  return { ...HOT_ZONE_DESKS[Math.min(idx, HOT_ZONE_DESKS.length - 1)] }
}

/**
 * Returns true when the point (px, py) falls within the hot-zone rect.
 * Tests the player's centre point — pure, no side effects.
 */
export const isInHotZone = (px: number, py: number, zone: Rect): boolean =>
  px >= zone.x && px <= zone.x + zone.width &&
  py >= zone.y && py <= zone.y + zone.height
