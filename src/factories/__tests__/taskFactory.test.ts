import { describe, it, expect } from 'vitest'
import { createTask } from '../taskFactory'

describe('createTask', () => {
  it('returns a Task with correct fields', () => {
    const task = createTask('customer-fire', 'rizzo', 100)
    expect(task.type).toBe('customer-fire')
    expect(task.assignedBy).toBe('rizzo')
    expect(task.assignedAt).toBe(100)
  })

  it('generates a deterministic id', () => {
    const task = createTask('customer-fire', 'rizzo', 100)
    expect(task.id).toBe('task-rizzo-customer-fire-100')
  })

  it('always returns status: pending', () => {
    expect(createTask('customer-fire', 'rizzo', 1).status).toBe('pending')
    expect(createTask('product-spec',  'matthew', 50).status).toBe('pending')
    expect(createTask('success-story', 'rizzo', 200).status).toBe('pending')
  })

  it('generates unique ids for different ticks', () => {
    const a = createTask('customer-fire', 'rizzo', 100)
    const b = createTask('customer-fire', 'rizzo', 200)
    expect(a.id).not.toBe(b.id)
  })

  it('generates unique ids for different types', () => {
    const a = createTask('customer-fire', 'rizzo', 100)
    const b = createTask('product-spec',  'rizzo', 100)
    expect(a.id).not.toBe(b.id)
  })

  it('does not mutate any input — pure function', () => {
    const type = 'customer-fire' as const
    const assignedBy = 'rizzo'
    const tick = 42
    createTask(type, assignedBy, tick)
    // No mutation to check on primitives — just verify return is a new object
    const t1 = createTask(type, assignedBy, tick)
    const t2 = createTask(type, assignedBy, tick)
    expect(t1).not.toBe(t2) // different object references
    expect(t1).toEqual(t2)  // but same values
  })
})
