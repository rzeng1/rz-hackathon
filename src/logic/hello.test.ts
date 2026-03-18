import { describe, it, expect } from 'vitest'
import { hello } from './hello'

describe('hello', () => {
  it('returns the greeting string', () => {
    expect(hello()).toBe('Hello, Roots AI!')
  })
})
