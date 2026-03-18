export type Vec2 = {
  x: number
  y: number
}

export type Player = {
  id: 'player'
  position: Vec2
  speed: number
  xp: number
  level: number
}

export type NPC = {
  id: string
  displayName: string
  position: Vec2
  interactionRadius: number
  role: 'gatekeeper' | 'colleague'
}

export type NPCState = {
  npcId: string
  hasInteractedThisSession: boolean
  lastInteractionTick: number
}

export type InventoryItem = {
  id: string
  displayName: string
  quantity: number
}

export type GameStatus = 'idle' | 'playing' | 'dialogue' | 'won' | 'lost'

export type GameState = {
  status: GameStatus
  player: Player
  npcs: NPC[]
  npcStates: NPCState[]
  inventory: InventoryItem[]
  activeDialogueNpcId: string | null
  tickCount: number
}

export const INITIAL_STATE: GameState = {
  status: 'idle',
  player: {
    id: 'player',
    position: { x: 400, y: 300 },
    speed: 3,
    xp: 0,
    level: 1,
  },
  npcs: [
    {
      id: 'ernesto',
      displayName: 'Ernesto',
      position: { x: 84, y: 100 },
      interactionRadius: 60,
      role: 'gatekeeper',
    },
    {
      id: 'priya',
      displayName: 'Priya',
      position: { x: 450, y: 230 },
      interactionRadius: 60,
      role: 'colleague',
    },
    {
      id: 'jake',
      displayName: 'Jake',
      position: { x: 850, y: 230 },
      interactionRadius: 60,
      role: 'colleague',
    },
    {
      id: 'linda',
      displayName: 'Linda',
      position: { x: 380, y: 480 },
      interactionRadius: 60,
      role: 'colleague',
    },
    {
      id: 'ceo',
      displayName: 'The CEO',
      position: { x: 1040, y: 530 },
      interactionRadius: 60,
      role: 'colleague',
    },
  ],
  npcStates: [],
  inventory: [],
  activeDialogueNpcId: null,
  tickCount: 0,
}
