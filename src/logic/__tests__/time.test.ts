import { describe, it, expect } from 'vitest'
import {
  advanceTime,
  isLunchTime,
  isPM,
  formatTime,
  totalMinutes,
} from '../time'

describe('advanceTime', () => {
  it('advances by 1 hour when delta is 60', () => {
    expect(advanceTime({ hours: 9, minutes: 0 }, 60)).toEqual({ hours: 10, minutes: 0 })
  })

  it('handles minute overflow into next hour', () => {
    expect(advanceTime({ hours: 9, minutes: 50 }, 15)).toEqual({ hours: 10, minutes: 5 })
  })

  it('clamps at 18:00 — does not exceed end of day', () => {
    expect(advanceTime({ hours: 17, minutes: 59 }, 10)).toEqual({ hours: 18, minutes: 0 })
  })

  it('stays at 18:00 when already at end of day', () => {
    expect(advanceTime({ hours: 18, minutes: 0 }, 60)).toEqual({ hours: 18, minutes: 0 })
  })

  it('does not mutate input object', () => {
    const time = { hours: 9, minutes: 0 }
    advanceTime(time, 30)
    expect(time).toEqual({ hours: 9, minutes: 0 })
  })

  it('advances partial minutes correctly', () => {
    const result = advanceTime({ hours: 9, minutes: 0 }, 30)
    expect(result).toEqual({ hours: 9, minutes: 30 })
  })
})

describe('isLunchTime', () => {
  it('returns true at 12:00', () => {
    expect(isLunchTime({ hours: 12, minutes: 0 })).toBe(true)
  })

  it('returns true at 12:30', () => {
    expect(isLunchTime({ hours: 12, minutes: 30 })).toBe(true)
  })

  it('returns true at 12:59', () => {
    expect(isLunchTime({ hours: 12, minutes: 59 })).toBe(true)
  })

  it('returns false at 11:59', () => {
    expect(isLunchTime({ hours: 11, minutes: 59 })).toBe(false)
  })

  it('returns false at 13:00', () => {
    expect(isLunchTime({ hours: 13, minutes: 0 })).toBe(false)
  })

  it('returns false at 9:00', () => {
    expect(isLunchTime({ hours: 9, minutes: 0 })).toBe(false)
  })
})

describe('isPM', () => {
  it('returns true at 12:00', () => {
    expect(isPM({ hours: 12, minutes: 0 })).toBe(true)
  })

  it('returns true at 17:00', () => {
    expect(isPM({ hours: 17, minutes: 0 })).toBe(true)
  })

  it('returns false at 11:59', () => {
    expect(isPM({ hours: 11, minutes: 59 })).toBe(false)
  })
})

describe('formatTime', () => {
  it('formats 9:05 AM correctly', () => {
    expect(formatTime({ hours: 9, minutes: 5 })).toBe('09:05 AM')
  })

  it('formats 12:30 PM correctly', () => {
    expect(formatTime({ hours: 12, minutes: 30 })).toBe('12:30 PM')
  })

  it('formats 17:00 PM correctly', () => {
    expect(formatTime({ hours: 17, minutes: 0 })).toBe('17:00 PM')
  })

  it('pads single-digit hours and minutes', () => {
    expect(formatTime({ hours: 9, minutes: 0 })).toBe('09:00 AM')
  })
})

describe('totalMinutes', () => {
  it('returns correct total for 10:30', () => {
    expect(totalMinutes({ hours: 10, minutes: 30 })).toBe(630)
  })

  it('returns 0 for midnight', () => {
    expect(totalMinutes({ hours: 0, minutes: 0 })).toBe(0)
  })

  it('returns 540 for 9:00', () => {
    expect(totalMinutes({ hours: 9, minutes: 0 })).toBe(540)
  })
})
