import { describe, it, expect } from 'vitest'
import {
  getPendingTasks,
  getPendingTasksOfType,
  completeTask,
  hasPendingTaskOfType,
  countTasksOfType,
} from '../tasks'
import type { Task } from '../tasks'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const pending = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-rizzo-customer-fire-1',
  type: 'customer-fire',
  status: 'pending',
  assignedBy: 'rizzo',
  assignedAt: 1,
  ...overrides,
})

const complete = (overrides: Partial<Task> = {}): Task => ({
  ...pending(),
  status: 'complete',
  ...overrides,
})

describe('getPendingTasks', () => {
  it('returns empty array when all tasks are complete', () => {
    expect(getPendingTasks([complete()])).toEqual([])
  })

  it('filters out completed tasks, keeps pending', () => {
    const t1 = pending({ id: 'a' })
    const t2 = complete({ id: 'b' })
    expect(getPendingTasks([t1, t2])).toEqual([t1])
  })

  it('returns all tasks when all are pending', () => {
    const tasks = [pending({ id: 'a' }), pending({ id: 'b' })]
    expect(getPendingTasks(tasks)).toHaveLength(2)
  })
})

describe('hasPendingTaskOfType', () => {
  it('returns true when matching pending task exists', () => {
    expect(hasPendingTaskOfType([pending()], 'customer-fire')).toBe(true)
  })

  it('returns false when no tasks exist', () => {
    expect(hasPendingTaskOfType([], 'customer-fire')).toBe(false)
  })

  it('returns false when task exists but is complete', () => {
    expect(hasPendingTaskOfType([complete()], 'customer-fire')).toBe(false)
  })

  it('returns false when tasks exist but wrong type', () => {
    const t = pending({ type: 'product-spec' })
    expect(hasPendingTaskOfType([t], 'customer-fire')).toBe(false)
  })
})

describe('completeTask', () => {
  it('sets target task to complete', () => {
    const t = pending({ id: 'target' })
    const result = completeTask('target', [t])
    expect(result[0].status).toBe('complete')
  })

  it('returns a new array (immutable)', () => {
    const tasks = [pending({ id: 'a' })]
    const result = completeTask('a', tasks)
    expect(result).not.toBe(tasks)
  })

  it('does not mutate original array', () => {
    const t = pending({ id: 'a' })
    const tasks = [t]
    completeTask('a', tasks)
    expect(tasks[0].status).toBe('pending')
  })

  it('does not affect other tasks', () => {
    const t1 = pending({ id: 'a' })
    const t2 = pending({ id: 'b' })
    const result = completeTask('a', [t1, t2])
    expect(result[1].status).toBe('pending')
  })

  it('returns unchanged array when id not found', () => {
    const t = pending({ id: 'a' })
    const result = completeTask('nonexistent', [t])
    expect(result[0].status).toBe('pending')
  })
})

describe('countTasksOfType', () => {
  it('counts correctly across statuses', () => {
    const tasks = [
      pending({ id: 'a', type: 'customer-fire' }),
      complete({ id: 'b', type: 'customer-fire' }),
      pending({ id: 'c', type: 'product-spec' }),
    ]
    expect(countTasksOfType(tasks, 'customer-fire')).toBe(2)
  })

  it('returns 0 when no tasks of that type', () => {
    expect(countTasksOfType([pending()], 'success-story')).toBe(0)
  })

  it('returns 0 for empty array', () => {
    expect(countTasksOfType([], 'customer-fire')).toBe(0)
  })
})

describe('getPendingTasksOfType', () => {
  it('filters to pending tasks of specific type', () => {
    const t1 = pending({ id: 'a', type: 'customer-fire' })
    const t2 = pending({ id: 'b', type: 'product-spec' })
    const t3 = complete({ id: 'c', type: 'customer-fire' })
    expect(getPendingTasksOfType([t1, t2, t3], 'customer-fire')).toEqual([t1])
  })
})
