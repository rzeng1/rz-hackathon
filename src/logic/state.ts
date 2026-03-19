import type { GameTime } from './time'
import { INITIAL_GAME_TIME } from './time'
import type { Task } from './tasks'
import { NPC_DESK_POSITIONS, ERNESTO_POST } from './npcSchedule'
import { PLAYER_MAX_HP, CHAZ_MAX_HP } from './battle'

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
  role: 'gatekeeper' | 'colleague' | 'location'
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

export type GameStatus = 'idle' | 'playing' | 'dialogue' | 'battle' | 'won' | 'lost'

export type GameState = {
  status: GameStatus
  player: Player
  npcs: NPC[]
  npcStates: NPCState[]
  inventory: InventoryItem[]
  activeDialogueNpcId: string | null
  tickCount: number
  gameTime: GameTime
  tasks: Task[]
  playerHP: number
  chazHP: number
  lastBattleMessage: string
}

export const INITIAL_STATE: GameState = {
  status: 'idle',
  player: {
    id: 'player',
    position: { x: 640, y: 400 },
    speed: 3,
    xp: 0,
    level: 1,
  },
  npcs: [
    {
      id: 'ernesto',
      displayName: 'Ernesto',
      position: ERNESTO_POST,
      interactionRadius: 60,
      role: 'gatekeeper',
    },
    {
      id: 'matthew',
      displayName: 'Matthew',
      position: NPC_DESK_POSITIONS.matthew,
      interactionRadius: 60,
      role: 'colleague',
    },
    {
      id: 'paul',
      displayName: 'Paul',
      position: NPC_DESK_POSITIONS.paul,
      interactionRadius: 60,
      role: 'colleague',
    },
    {
      id: 'rizzo',
      displayName: 'Rizzo',
      position: NPC_DESK_POSITIONS.rizzo,
      interactionRadius: 60,
      role: 'colleague',
    },
    {
      id: 'chaz',
      displayName: 'Chaz',
      position: NPC_DESK_POSITIONS.chaz,
      interactionRadius: 70,
      role: 'gatekeeper',
    },
    {
      id: 'server_rack',
      displayName: 'Server Rack',
      position: { x: 50, y: 650 },
      interactionRadius: 50,
      role: 'location',
    },
  ],
  npcStates: [],
  inventory: [],
  activeDialogueNpcId: null,
  tickCount: 0,
  gameTime: INITIAL_GAME_TIME,
  tasks: [],
  playerHP: PLAYER_MAX_HP,
  chazHP: CHAZ_MAX_HP,
  lastBattleMessage: '',
}
