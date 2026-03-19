export type TaskType =
  | 'product-spec'   // Collect spec from Matthew, deliver to Paul
  | 'customer-fire'  // Rizzo issues; fix at Server Rack, report back
  | 'success-story'  // Proof of a closed fire; consumed by Rizzo or Chaz
  | 'courier'        // Pick up item A, deliver to NPC B
  | 'interaction'    // Interact with a static world object
  | 'escort'         // Stay within 50px of an NPC while they walk somewhere

export type TaskStatus = 'pending' | 'in-progress' | 'complete'

export type Task = {
  id: string
  type: TaskType
  status: TaskStatus
  assignedBy: string  // npcId of the NPC who issued the task
  assignedAt: number  // tickCount when task was issued
}

/** Returns all tasks with status 'pending'. */
export const getPendingTasks = (tasks: Task[]): Task[] =>
  tasks.filter(t => t.status === 'pending')

/** Returns pending tasks of a specific type. */
export const getPendingTasksOfType = (tasks: Task[], type: TaskType): Task[] =>
  tasks.filter(t => t.status === 'pending' && t.type === type)

/**
 * Returns a new array with the target task's status set to 'complete'.
 * Immutable — does not mutate input.
 */
export const completeTask = (taskId: string, tasks: Task[]): Task[] =>
  tasks.map(t => (t.id === taskId ? { ...t, status: 'complete' as const } : t))

/** Returns true if at least one pending task of the given type exists. */
export const hasPendingTaskOfType = (tasks: Task[], type: TaskType): boolean =>
  tasks.some(t => t.status === 'pending' && t.type === type)

/** Returns the total count of tasks of a given type regardless of status. */
export const countTasksOfType = (tasks: Task[], type: TaskType): number =>
  tasks.filter(t => t.type === type).length

// ---------------------------------------------------------------------------
// Task pool — catalogue of all available task templates
// ---------------------------------------------------------------------------

export type TaskTemplate = {
  id: string
  type: TaskType
  title: string
  description: string
  assignedBy: string
  xpReward: number
  /** Courier: item the player must collect before delivering. */
  collectItemId?: string
  /** Courier: NPC id to deliver the item to. */
  deliverToNpcId?: string
  /** Interaction: location/NPC id the player must interact with. */
  interactWithId?: string
  /** Escort: id of the NPC the player must accompany. */
  escortNpcId?: string
}

/**
 * Complete catalogue of tasks available in the game.
 * Tasks are instantiated at runtime via createTask(); this pool is the
 * single source of truth for task design data.
 */
export const TASK_POOL: TaskTemplate[] = [
  // ---- Product Spec (Matthew → Paul) ----
  {
    id: 'spec-sprint',
    type: 'product-spec',
    title: 'Write the Sprint Spec',
    description: 'Get a spec from Matthew and deliver it to Paul before EOD.',
    assignedBy: 'matthew',
    xpReward: 15,
  },

  // ---- Customer Fire (Rizzo → Server Rack → Rizzo) ----
  {
    id: 'fire-client-meltdown',
    type: 'customer-fire',
    title: 'Client Meltdown',
    description: 'The client is MELTING DOWN. Fix the server and report back.',
    assignedBy: 'rizzo',
    xpReward: 12,
  },
  {
    id: 'fire-prod-outage',
    type: 'customer-fire',
    title: 'Production Outage',
    description: 'Prod is down. Every minute costs $10k. Move.',
    assignedBy: 'rizzo',
    xpReward: 12,
  },

  // ---- Courier (pick up item A, deliver to NPC B) ----
  {
    id: 'courier-coffee-run',
    type: 'courier',
    title: 'Coffee Run',
    description: "Paul needs fuel. Grab Ernesto's best brew and bring it over.",
    assignedBy: 'matthew',
    xpReward: 18,
    collectItemId: 'coffee',
    deliverToNpcId: 'paul',
  },
  {
    id: 'courier-sales-deck',
    type: 'courier',
    title: 'Sync the Deck',
    description: "Grab the sales deck from Paul and get Rizzo's sign-off.",
    assignedBy: 'matthew',
    xpReward: 20,
    collectItemId: 'sales-deck',
    deliverToNpcId: 'rizzo',
  },

  // ---- Interaction (go to a specific world object and use it) ----
  {
    id: 'interaction-whiteboard',
    type: 'interaction',
    title: 'Update the Whiteboard',
    description: "Paul needs the roadmap updated. Walk over and fix the board.",
    assignedBy: 'paul',
    xpReward: 22,
    interactWithId: 'whiteboard',
  },
  {
    id: 'interaction-printer',
    type: 'interaction',
    title: 'Print the Deck',
    description: "Rizzo needs 50 copies. Go hit the printer before the meeting.",
    assignedBy: 'rizzo',
    xpReward: 16,
    interactWithId: 'printer',
  },

  // ---- Escort (stay within 50px while NPC walks to destination) ----
  {
    id: 'escort-standup',
    type: 'escort',
    title: 'Walk Matthew to Standup',
    description: "Matthew is presenting today and gets lost. Walk him to the Lunch Room.",
    assignedBy: 'matthew',
    xpReward: 30,
    escortNpcId: 'matthew',
  },
]
