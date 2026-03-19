import { Application, Container, Graphics, Text } from 'pixi.js'
import type { GameState } from '../logic/state'
import { INITIAL_STATE } from '../logic/state'
import { getItemQuantity } from '../logic/inventory'
import { XP_TABLE } from '../logic/xp'
import { getStaticObstacles } from '../logic/world'
import { formatTime } from '../logic/time'

// ---- Safe-zone constants ----------------------------------------------------
// HUD_LEFT / HUD_TOP: all top-left elements sit 32px from the canvas edge and
// 12px below the Status Bar (height 40) so nothing clips or overlaps.
const HUD_LEFT  = 32
const HUD_TOP   = 52   // 40 (status bar) + 12 (breathing room)

const BAR_WIDTH  = 196
const BAR_HEIGHT = 12

// Width of both the left and right glassmorphism backing panels
const PANEL_W   = 220
// Backing extends 12px beyond the content on each side and 8px top/bottom
const PAD_X     = 12
const PAD_Y     = 8
// Height covers XP/Level/XP-bar/Energy-bar (74px content) + top+bottom padding
const BACKING_H      = 90
const ENERGY_BAR_Y   = HUD_TOP + 66  // 6px below XP bar bottom (100+12+6=118)
const ENERGY_BAR_H   = 8

// Right-panel content right-edge (32px from canvas right)
const RIGHT_EDGE = 1280 - 32

const TASK_LABELS: Record<string, string> = {
  'product-spec':  'Write Spec',
  'customer-fire': 'Fix Server 🔥',
  'success-story': 'Success Story',
  'courier':       'Courier Run',
  'interaction':   'Team Chat',
  'escort':        'Escort Client',
}
const formatTaskType = (type: string): string => TASK_LABELS[type] ?? type

/**
 * Non-diegetic UI overlay.
 *
 * TOP-LEFT  — Character Stats (XP, Level, XP bar) with glassmorphism backing.
 * TOP-RIGHT — World Stats (Clock, Coffee, Objective) with glassmorphism backing.
 * RIGHT     — Active Task panel (visible only when tasks are pending).
 *
 * zIndex 220: above the world container and world NPCs; intentionally below
 * Dialogue (300) and Battle (400) which need to overlay the HUD.
 */
export const createHud = (app: Application) => {
  let debugEnabled = false

  const hud = new Container()
  hud.zIndex = 220
  app.stage.addChild(hud)

  // ================================================================
  // TOP-LEFT: Character Stats
  // ================================================================

  // Drop shadow behind backing (rendered first → behind)
  const statsShadow = new Graphics()
  statsShadow.roundRect(HUD_LEFT - PAD_X + 4, HUD_TOP - PAD_Y + 4, PANEL_W, BACKING_H, 10)
    .fill({ color: 0x000000, alpha: 0.15 })
  hud.addChild(statsShadow)

  // Glassmorphism backing
  const statsBacking = new Graphics()
  statsBacking.roundRect(HUD_LEFT - PAD_X, HUD_TOP - PAD_Y, PANEL_W, BACKING_H, 10)
    .fill({ color: 0xffffff, alpha: 0.82 })
    .stroke({ color: 0xD1D1D6, width: 1 })
  hud.addChild(statsBacking)

  const xpLabel = new Text({
    text: 'XP: 0',
    style: { fill: '#1c1c1e', fontSize: 14, fontWeight: 'bold' },
  })
  xpLabel.position.set(HUD_LEFT, HUD_TOP)
  hud.addChild(xpLabel)

  const levelLabel = new Text({
    text: 'Lv 1',
    style: { fill: '#007AFF', fontSize: 20, fontWeight: 'bold' },
  })
  levelLabel.position.set(HUD_LEFT, HUD_TOP + 20)
  hud.addChild(levelLabel)

  // XP bar background
  const barBg = new Graphics()
  barBg.rect(HUD_LEFT, HUD_TOP + 48, BAR_WIDTH, BAR_HEIGHT).fill(0xD1D1D6)
  hud.addChild(barBg)

  // XP bar fill — redrawn each update; Roots AI brand blue
  const barFill = new Graphics()
  hud.addChild(barFill)

  // Energy bar background (caffeine yellow track)
  const energyBg = new Graphics()
  energyBg.rect(HUD_LEFT, ENERGY_BAR_Y, BAR_WIDTH, ENERGY_BAR_H).fill(0xD1D1D6)
  hud.addChild(energyBg)

  // Energy bar fill — redrawn each update; flashes red when energy < 20
  const energyFill = new Graphics()
  hud.addChild(energyFill)

  // Active fires indicator — sits just below the left backing panel
  const fireLabel = new Text({
    text: '',
    style: { fill: '#ff3b30', fontSize: 13 },
  })
  fireLabel.position.set(HUD_LEFT, HUD_TOP + BACKING_H + 4)
  hud.addChild(fireLabel)

  // ================================================================
  // TOP-RIGHT: World Stats (Clock, Coffee, Objective)
  // ================================================================

  // Right panel content is right-aligned; LEFT edge of content area:
  const RIGHT_CONTENT_LEFT = RIGHT_EDGE - BAR_WIDTH  // = 1052
  // Backing left edge = RIGHT_CONTENT_LEFT - PAD_X
  const RIGHT_BACKING_X    = RIGHT_CONTENT_LEFT - PAD_X  // = 1040

  // Drop shadow
  const worldShadow = new Graphics()
  worldShadow.roundRect(RIGHT_BACKING_X + 4, HUD_TOP - PAD_Y + 4, PANEL_W, BACKING_H, 10)
    .fill({ color: 0x000000, alpha: 0.15 })
  hud.addChild(worldShadow)

  // Glassmorphism backing
  const worldBacking = new Graphics()
  worldBacking.roundRect(RIGHT_BACKING_X, HUD_TOP - PAD_Y, PANEL_W, BACKING_H, 10)
    .fill({ color: 0xffffff, alpha: 0.82 })
    .stroke({ color: 0xD1D1D6, width: 1 })
  hud.addChild(worldBacking)

  const clockLabel = new Text({
    text: '09:00 AM',
    style: { fill: '#1c1c1e', fontSize: 15, fontWeight: 'bold' },
  })
  clockLabel.anchor.set(1, 0)
  clockLabel.position.set(RIGHT_EDGE, HUD_TOP)
  hud.addChild(clockLabel)

  const drinkLabel = new Text({
    text: '☕ x0',
    style: { fill: '#007AFF', fontSize: 14 },
  })
  drinkLabel.anchor.set(1, 0)
  drinkLabel.position.set(RIGHT_EDGE, HUD_TOP + 22)
  hud.addChild(drinkLabel)

  const objectiveLabel = new Text({
    text: 'Objective: Reach Level 10',
    style: { fill: '#8e8e93', fontSize: 10, fontStyle: 'italic' },
  })
  objectiveLabel.anchor.set(1, 0)
  objectiveLabel.position.set(RIGHT_EDGE, HUD_TOP + 44)
  hud.addChild(objectiveLabel)

  // ================================================================
  // RIGHT: Active Task Panel (below world stats, shown only with tasks)
  // ================================================================

  const TASK_PANEL_X = RIGHT_BACKING_X
  const TASK_PANEL_Y = HUD_TOP + BACKING_H + 8  // 8px gap below world stats
  const TASK_W       = PANEL_W
  const TASK_SLOTS   = 3
  const TASK_H       = 20 + TASK_SLOTS * 18 + 8

  const taskShadow = new Graphics()
  taskShadow.roundRect(TASK_PANEL_X + 4, TASK_PANEL_Y + 4, TASK_W, TASK_H, 8)
    .fill({ color: 0x000000, alpha: 0.15 })
  taskShadow.visible = false
  hud.addChild(taskShadow)

  const taskBg = new Graphics()
  taskBg.roundRect(TASK_PANEL_X, TASK_PANEL_Y, TASK_W, TASK_H, 8)
    .fill({ color: 0xffffff, alpha: 0.90 })
    .stroke({ color: 0xD1D1D6, width: 1 })
  taskBg.visible = false
  hud.addChild(taskBg)

  const taskTitle = new Text({
    text: 'Active Tasks',
    style: { fill: '#007AFF', fontSize: 11, fontWeight: 'bold' },
  })
  taskTitle.position.set(TASK_PANEL_X + 6, TASK_PANEL_Y + 5)
  taskTitle.visible = false
  hud.addChild(taskTitle)

  const taskSlots: Text[] = []
  for (let i = 0; i < TASK_SLOTS; i++) {
    const slot = new Text({ text: '', style: { fill: '#1c1c1e', fontSize: 11 } })
    slot.position.set(TASK_PANEL_X + 6, TASK_PANEL_Y + 22 + i * 18)
    hud.addChild(slot)
    taskSlots.push(slot)
  }

  // ================================================================
  // FLOW STATE indicator (left panel, below energy bar)
  // ================================================================

  const flowLabel = new Text({
    text: '',
    style: { fill: '#007AFF', fontSize: 12, fontWeight: 'bold' },
  })
  flowLabel.position.set(HUD_LEFT, ENERGY_BAR_Y + ENERGY_BAR_H + 6)
  hud.addChild(flowLabel)

  // ================================================================
  // PERK UNLOCK notification — centred on screen, fades out
  // ================================================================

  const perkNotifBg = new Graphics()
  perkNotifBg.roundRect(390, 280, 500, 56, 10)
    .fill({ color: 0x000000, alpha: 0.72 })
    .stroke({ color: 0xffd700, width: 2 })
  perkNotifBg.visible = false
  hud.addChild(perkNotifBg)

  const perkNotifLabel = new Text({
    text: '',
    style: { fill: '#ffd700', fontSize: 20, fontWeight: 'bold', align: 'center' },
  })
  perkNotifLabel.anchor.set(0.5)
  perkNotifLabel.position.set(640, 308)
  perkNotifLabel.visible = false
  hud.addChild(perkNotifLabel)

  // Ticks the notification is shown for before fading out
  const PERK_NOTIF_DURATION = 300

  // ================================================================
  // DEBUG overlay
  // ================================================================

  const debugLabel = new Text({
    text: 'DEBUG ON',
    style: { fill: '#ff3b30', fontSize: 13 },
  })
  debugLabel.position.set(HUD_LEFT, HUD_TOP + BACKING_H + 24)
  debugLabel.visible = false
  hud.addChild(debugLabel)

  const debugContainer = new Container()
  debugContainer.zIndex = 150
  debugContainer.visible = false
  app.stage.addChild(debugContainer)

  const debugCollision = new Graphics()
  for (const r of getStaticObstacles()) {
    debugCollision.rect(r.x, r.y, r.width, r.height).fill({ color: 0xff3b30, alpha: 0.3 })
  }
  debugContainer.addChild(debugCollision)

  const debugRadii = new Graphics()
  for (const npc of INITIAL_STATE.npcs) {
    debugRadii.circle(npc.position.x, npc.position.y, npc.interactionRadius)
      .stroke({ color: 0x007AFF, width: 1 })
  }
  debugContainer.addChild(debugRadii)

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Backslash') {
      debugEnabled = !debugEnabled
      debugContainer.visible = debugEnabled
      debugLabel.visible = debugEnabled
    }
  }
  window.addEventListener('keydown', onKeyDown)

  // ================================================================
  // update
  // ================================================================

  const update = (state: GameState) => {
    xpLabel.text    = `XP: ${state.player.xp}`
    levelLabel.text = `Lv ${state.player.level}`

    // XP progress bar (full range level 1–10)
    const lvl      = state.player.level
    const xpFloor  = XP_TABLE[lvl - 1] ?? 0
    const xpCeil   = XP_TABLE[lvl]     ?? XP_TABLE[XP_TABLE.length - 1]
    const progress = lvl >= XP_TABLE.length
      ? 1
      : (state.player.xp - xpFloor) / (xpCeil - xpFloor)
    const fillW = Math.max(0, Math.floor(BAR_WIDTH * progress))
    barFill.clear()
    if (fillW > 0) barFill.rect(HUD_LEFT, HUD_TOP + 48, fillW, BAR_HEIGHT).fill(0x007AFF)

    // Energy bar — flashes red below 20; pulses between red/orange each 20 ticks
    const energy      = state.player.energy
    const isLowEnergy = energy < 20
    const flashOn     = isLowEnergy && Math.floor(state.tickCount / 20) % 2 === 0
    const energyW     = Math.max(0, Math.floor(BAR_WIDTH * (energy / 100)))
    const energyColor = flashOn ? 0xff3b30 : isLowEnergy ? 0xff9500 : 0xFFCC00
    energyFill.clear()
    if (energyW > 0) energyFill.rect(HUD_LEFT, ENERGY_BAR_Y, energyW, ENERGY_BAR_H).fill(energyColor)

    // Active fires
    const pendingFires = state.tasks.filter(
      t => t.type === 'customer-fire' && t.status === 'pending',
    ).length
    fireLabel.text = pendingFires > 0
      ? `🔥 ${pendingFires} fire${pendingFires > 1 ? 's' : ''}`
      : ''

    // World stats (right panel)
    clockLabel.text        = formatTime(state.gameTime)
    const drinks = getItemQuantity(state.inventory, 'energy-drink')
    // Pulse coffee icon when energy is low and drinks are available
    const coffeePulse = isLowEnergy && drinks > 0 && flashOn
    drinkLabel.text = coffeePulse ? `⚡ ☕ x${drinks}` : `☕ x${drinks}`
    objectiveLabel.visible = state.player.level < XP_TABLE.length

    // Flow state indicator
    if (state.player.isFlowState) {
      flowLabel.text = '⚡ FLOW STATE x2 XP'
    } else if (state.player.comboCount > 0) {
      flowLabel.text = `Combo: ${state.player.comboCount}/${3}`
    } else {
      flowLabel.text = ''
    }

    // Perk notification — appears on unlock, fades out after PERK_NOTIF_DURATION ticks
    if (state.latestPerkUnlock) {
      const age = state.tickCount - state.perkUnlockedAtTick
      if (age < PERK_NOTIF_DURATION) {
        const alpha = age < 200 ? 1 : Math.max(0, 1 - (age - 200) / 100)
        perkNotifLabel.text    = `UNLOCKED: ${state.latestPerkUnlock}`
        perkNotifLabel.alpha   = alpha
        perkNotifBg.alpha      = alpha
        perkNotifLabel.visible = true
        perkNotifBg.visible    = true
      } else {
        perkNotifLabel.visible = false
        perkNotifBg.visible    = false
      }
    }

    // Task panel
    const pendingTasks = state.tasks.filter(t => t.status === 'pending').slice(0, TASK_SLOTS)
    const hasTasks     = pendingTasks.length > 0
    taskBg.visible     = hasTasks
    taskShadow.visible = hasTasks
    taskTitle.visible  = hasTasks
    taskSlots.forEach((slot, i) => {
      slot.text = pendingTasks[i] ? `• ${formatTaskType(pendingTasks[i].type)}` : ''
    })
  }

  const destroy = () => window.removeEventListener('keydown', onKeyDown)

  return { update, destroy }
}
