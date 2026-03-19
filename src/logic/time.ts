export type GameTime = {
  hours: number   // 0–23
  minutes: number // 0–59
}

/** 60 real ticks (1 second at 60 FPS) = 1 game minute. Tunable. */
export const TICKS_PER_GAME_MINUTE = 60

/** Starting time of day. */
export const INITIAL_GAME_TIME: GameTime = { hours: 9, minutes: 0 }

/**
 * Advances game time by `delta` game-minutes.
 * In the machine: call with `event.delta / TICKS_PER_GAME_MINUTE` to convert
 * ticker delta (≈1.0 at 60 FPS) into fractional game-minutes per tick.
 * Clamps at 18:00 — time stops at end of office day.
 * Pure — returns new GameTime, never mutates.
 */
export const advanceTime = (current: GameTime, delta: number): GameTime => {
  const totalMins = current.hours * 60 + current.minutes + delta
  const clampedMins = Math.min(totalMins, 18 * 60)
  return {
    hours: Math.floor(clampedMins / 60),
    minutes: Math.floor(clampedMins % 60),
  }
}

/** Returns true during the 12:00–12:59 lunch window. */
export const isLunchTime = (gameTime: GameTime): boolean => gameTime.hours === 12

/** Returns true from noon onwards. */
export const isPM = (gameTime: GameTime): boolean => gameTime.hours >= 12

/**
 * Formats a GameTime as a human-readable string, e.g. "09:05 AM" or "12:30 PM".
 * Used exclusively by the HUD — never in logic.
 */
export const formatTime = (gameTime: GameTime): string => {
  const h = gameTime.hours
  const m = gameTime.minutes
  const period = h >= 12 ? 'PM' : 'AM'
  const displayH = String(h).padStart(2, '0')
  const displayM = String(m).padStart(2, '0')
  return `${displayH}:${displayM} ${period}`
}

/** Returns total minutes since midnight. Used for schedule comparisons. */
export const totalMinutes = (gameTime: GameTime): number =>
  gameTime.hours * 60 + gameTime.minutes
