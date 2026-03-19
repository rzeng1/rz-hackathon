import type { Task, TaskType } from '../logic/tasks'

/**
 * Pure factory for Task objects.
 * No class. No `new`. No side effects.
 * ID is deterministic: `task-{assignedBy}-{type}-{tick}`
 */
export const createTask = (type: TaskType, assignedBy: string, tick: number): Task => ({
  id: `task-${assignedBy}-${type}-${tick}`,
  type,
  status: 'pending',
  assignedBy,
  assignedAt: tick,
})
