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
  /** Stamina 0–100. Passively drains while playing. */
  energy: number
  /** True while a caffeine boost is active. */
  isCaffeinated: boolean
  /** Countdown ticks remaining for the caffeine boost. */
  caffeineTimer: number
  /** Number of tasks completed in the current combo streak. */
  comboCount: number
  /** True when comboCount >= FLOW_STATE_THRESHOLD (3). All XP is doubled. */
  isFlowState: boolean
  /** Countdown ticks until the combo resets from inactivity. */
  comboDecayTimer: number
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
  /** Level-gated perks the player has unlocked ('caffeine-aura', 'sprint'). */
  unlockedPerks: string[]
  /** Display name of the most recently unlocked perk for the notification. */
  latestPerkUnlock: string | null
  /** Tick at which the latest perk was unlocked (used to fade the notification). */
  perkUnlockedAtTick: number
  /** Active hot-zone rect during a Fire Drill event, or null if none. */
  activeHotZone: { x: number; y: number; width: number; height: number } | null
  /** Tick at which the current hot zone expires. */
  hotZoneExpiresAtTick: number
  /** True while a VC Visit event is in progress. */
  vcVisitActive: boolean
  /** Tick at which the current VC Visit expires. */
  vcVisitExpiresAtTick: number
  /** Amount of XP gained in the most recent INTERACT (for floating text). */
  lastXpGained: number
  /** Tick at which lastXpGained was set (used to detect new gains). */
  lastXpGainTick: number
  /** World position where the floating XP text should spawn. */
  lastXpGainPos: { x: number; y: number } | null
}

export const INITIAL_STATE: GameState = {
  status: 'idle',
  player: {
    id: 'player',
    position: { x: 640, y: 400 },
    speed: 3,
    xp: 0,
    level: 1,
    energy: 80,
    isCaffeinated: false,
    caffeineTimer: 0,
    comboCount: 0,
    isFlowState: false,
    comboDecayTimer: 0,
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
      position: { x: 60, y: 640 },
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
  unlockedPerks: [],
  latestPerkUnlock: null,
  perkUnlockedAtTick: 0,
  activeHotZone: null,
  hotZoneExpiresAtTick: 0,
  vcVisitActive: false,
  vcVisitExpiresAtTick: 0,
  lastXpGained: 0,
  lastXpGainTick: 0,
  lastXpGainPos: null,
}
