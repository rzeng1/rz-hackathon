import { Application, Container, Graphics, Text } from 'pixi.js'
import type { GameState } from '../logic/state'
import { INITIAL_STATE } from '../logic/state'
import { getStaticObstacles, COOLER_RECT, LUNCH_ROOM_BOUNDS } from '../logic/world'
import { isInRange } from '../logic/npc'
import { hasActiveFire } from '../logic/npcBehavior'
import { VC_PENALTY_RADIUS } from '../logic/events'
import { createFloatingTextSystem } from './floatingText'

// ---- Roots AI colour palette ------------------------------------------------
const FLOOR_COLOUR    = 0xF5F5F7  // Apple-style light gray
const WALL_COLOUR     = 0xC7C7CC  // Office partition gray
const DESK_COLOUR     = 0xFFFFFF  // Modern white desk surface
const DESK_BORDER     = 0xD1D1D6  // Subtle gray desk border
const BRAND_BLUE      = 0x007AFF  // Roots AI brand blue (used as accent)

// NPC display names
const NPC_NAMES: Record<string, string> = {
  ernesto:     'Ernesto',
  matthew:     'Matthew',
  paul:        'Paul',
  rizzo:       'Rizzo',
  chaz:        'Chaz (CEO)',
  server_rack: 'Server Rack',
}

// NPC placeholder colours
const NPC_COLOURS: Record<string, number> = {
  ernesto:     0xff6b35,  // orange-red — energy drink gatekeeper
  matthew:     0x4caf50,  // green — product manager
  paul:        0x2196f3,  // blue — head of product
  rizzo:       0xff9800,  // amber — customer success
  chaz:        0xffd700,  // gold — CEO
  server_rack: 0x607d8b,  // grey-blue — hardware
}

const PLAYER_HALF = 12
const LERP_SPEED  = 0.12

// z-index layers (within world container)
// NPCs use their Y position as zIndex (up to ~640).
// All labels and UI-within-world must be above the tallest NPC Y.
const Z_OBSTACLE   = 10
const Z_COOLER     = 11
const Z_HOT_ZONE   = 12   // floor-level tint, below NPCs
const Z_VC_AURA    = 13   // floor-level tint, below NPCs
const Z_NAMETAG    = 800  // always above any NPC sprite
const Z_PROMPT     = 810
const Z_WAYPOINT   = 820
const Z_FLOW_GLOW  = 830  // pulsing ring around player when in flow state
const Z_GLOW       = 850  // level-up glow ring
const Z_HIGHLIGHT  = 900

/**
 * Creates and owns all PixiJS display objects for the game world.
 * Exposes a single update(state) method — no logic lives here.
 * NPC positions are smoothly interpolated toward their state-driven targets.
 * Animation effects (glow ring, camera shake) are driven by app.ticker.
 */
export const createRenderer = (app: Application) => {
  // ------------------------------------------------------------------ world
  const world = new Container()
  world.sortableChildren = true
  app.stage.addChild(world)

  // Floor — Roots AI light gray
  const floor = new Graphics()
  floor.rect(0, 0, 1280, 720).fill(FLOOR_COLOUR)
  floor.zIndex = 0
  world.addChild(floor)

  // Hot zone overlay — redrawn each frame when a fire drill is active
  const hotZoneGfx = new Graphics()
  hotZoneGfx.zIndex = Z_HOT_ZONE
  world.addChild(hotZoneGfx)

  // VC Visit aura — redrawn each frame when a VC visit is active
  const vcAuraGfx = new Graphics()
  vcAuraGfx.zIndex = Z_VC_AURA
  world.addChild(vcAuraGfx)

  // Lunch Room carpet texture — procedural dots over the gathering area
  const lunchCarpet = new Graphics()
  for (let cx = LUNCH_ROOM_BOUNDS.x + 8; cx < LUNCH_ROOM_BOUNDS.x + LUNCH_ROOM_BOUNDS.width; cx += 12) {
    for (let cy = LUNCH_ROOM_BOUNDS.y + 8; cy < LUNCH_ROOM_BOUNDS.y + LUNCH_ROOM_BOUNDS.height; cy += 12) {
      lunchCarpet.circle(cx, cy, 2).fill({ color: 0xa09590, alpha: 0.45 })
    }
  }
  lunchCarpet.zIndex = 1
  world.addChild(lunchCarpet)

  // Static obstacles with Roots AI styling
  const obstacleGfx = new Graphics()
  for (const r of getStaticObstacles()) {
    if (r === COOLER_RECT) continue  // drawn separately below

    // Border walls and thin CEO partition walls → neutral gray
    const isBorderWall = r.x === 0 || r.y === 0 || r.x + r.width >= 1240 || r.y + r.height >= 680
    const isThinPartition = r.height < 20

    if (isBorderWall || isThinPartition) {
      obstacleGfx.rect(r.x, r.y, r.width, r.height).fill(WALL_COLOUR)
    } else {
      // White modern desk surface + subtle gray border
      obstacleGfx.rect(r.x, r.y, r.width, r.height)
        .fill(DESK_COLOUR)
        .stroke({ color: DESK_BORDER, width: 2 })
      // Bottom shadow strip (depth illusion — the desk has height)
      obstacleGfx.rect(r.x + 2, r.y + r.height - 5, r.width - 4, 5)
        .fill({ color: DESK_BORDER, alpha: 0.8 })
    }
  }
  obstacleGfx.zIndex = Z_OBSTACLE
  world.addChild(obstacleGfx)

  // Energy Drink Cooler — cyan with Roots AI accent highlights
  const coolerGfx = new Graphics()
  coolerGfx.rect(COOLER_RECT.x, COOLER_RECT.y, COOLER_RECT.width, COOLER_RECT.height)
    .fill(0x00bcd4)
    .stroke({ color: 0x4dd0e1, width: 2 })
  // Top highlight
  coolerGfx.rect(COOLER_RECT.x + 2, COOLER_RECT.y + 2, COOLER_RECT.width - 4, 4)
    .fill({ color: 0xffffff, alpha: 0.3 })
  // Bottom shadow
  coolerGfx.rect(COOLER_RECT.x, COOLER_RECT.y + COOLER_RECT.height - 5, COOLER_RECT.width, 5)
    .fill(0x0097a7)
  coolerGfx.zIndex = Z_COOLER
  world.addChild(coolerGfx)

  // ------------------------------------------------------------------ player
  const playerShadow = new Graphics()
  playerShadow.ellipse(0, 0, 14, 5).fill({ color: 0x000000, alpha: 0.22 })
  world.addChild(playerShadow)

  const playerGfx = new Graphics()
  playerGfx.rect(-PLAYER_HALF, -PLAYER_HALF, PLAYER_HALF * 2, PLAYER_HALF * 2)
    .fill(BRAND_BLUE)
    .stroke({ color: 0x005ecb, width: 2 })
  world.addChild(playerGfx)

  // ------------------------------------------------------------------ NPCs
  const npcGfxMap     = new Map<string, Graphics>()
  const npcShadowMap  = new Map<string, Graphics>()
  const npcDisplayPos = new Map<string, { x: number; y: number }>()
  const npcNameTags   = new Map<string, Text>()

  for (const npc of INITIAL_STATE.npcs) {
    // Foot shadow
    const shadow = new Graphics()
    const shadowYOff = npc.role === 'location' ? 28 : 11
    shadow.ellipse(0, 0, 14, 5).fill({ color: 0x000000, alpha: 0.2 })
    shadow.position.set(npc.position.x, npc.position.y + shadowYOff)
    shadow.zIndex = npc.position.y - 1
    world.addChild(shadow)
    npcShadowMap.set(npc.id, shadow)

    // Sprite
    const g = new Graphics()
    if (npc.role === 'location') {
      // Server rack: taller rect with 3D edge treatment
      g.rect(-20, -30, 40, 60)
        .fill(NPC_COLOURS[npc.id] ?? 0x607d8b)
        .stroke({ color: 0x455a64, width: 2 })
      g.rect(-20, -30, 40, 5).fill(0x78909c)   // top highlight
      g.rect(-20, 24, 40, 6).fill(0x37474f)    // bottom shadow
    } else {
      g.rect(-PLAYER_HALF, -PLAYER_HALF, PLAYER_HALF * 2, PLAYER_HALF * 2)
        .fill(NPC_COLOURS[npc.id] ?? 0x999999)
        .stroke({ color: 0x00000040, width: 1 })
    }
    g.position.set(npc.position.x, npc.position.y)
    g.zIndex = npc.position.y
    world.addChild(g)
    npcGfxMap.set(npc.id, g)
    npcDisplayPos.set(npc.id, { x: npc.position.x, y: npc.position.y })

    // Name tag — anchored at bottom-centre so it sits directly above the sprite
    const nameTag = new Text({
      text: NPC_NAMES[npc.id] ?? npc.id,
      style: { fill: '#1c1c1e', fontSize: 11, fontWeight: 'bold' },
    })
    nameTag.anchor.set(0.5, 1)  // centred horizontally, bottom edge at y
    nameTag.zIndex = Z_NAMETAG
    world.addChild(nameTag)
    npcNameTags.set(npc.id, nameTag)
  }

  // ------------------------------------------------------------------ interaction prompt
  const promptText = new Text({
    text: '',
    style: { fill: '#007AFF', fontSize: 13, fontWeight: 'bold' },
  })
  promptText.anchor.set(0.5, 1)
  promptText.visible = false
  promptText.zIndex = Z_PROMPT
  world.addChild(promptText)

  // ------------------------------------------------------------------ fire waypoint
  const waypointGfx = new Graphics()
  waypointGfx.zIndex = Z_WAYPOINT
  waypointGfx.visible = false
  world.addChild(waypointGfx)

  // ------------------------------------------------------------------ highlight ring
  const highlight = new Graphics()
  highlight.visible = false
  highlight.zIndex = Z_HIGHLIGHT
  world.addChild(highlight)

  // ------------------------------------------------------------------ flow state glow ring
  const flowGlowGfx = new Graphics()
  flowGlowGfx.zIndex = Z_FLOW_GLOW
  world.addChild(flowGlowGfx)

  // ------------------------------------------------------------------ level-up glow ring
  const glowGfx = new Graphics()
  glowGfx.zIndex = Z_GLOW
  world.addChild(glowGfx)

  // ------------------------------------------------------------------ floating XP text
  const floatingText = createFloatingTextSystem(app, world)

  // ------------------------------------------------------------------ win overlay
  const winOverlay = new Container()
  winOverlay.visible = false
  winOverlay.zIndex = 1000
  app.stage.addChild(winOverlay)

  const winBg = new Graphics()
  winBg.rect(0, 0, 1280, 720).fill({ color: 0x000000, alpha: 0.75 })
  winOverlay.addChild(winBg)

  let winTextAdded = false

  // ------------------------------------------------------------------ animation state
  let shakeIntensity         = 0
  let glowPhase              = 0   // frames remaining (30 ≈ 0.5 s at 60 fps)
  let flowGlowPhase          = 0   // continuous sine-wave phase for flow pulse
  let isFlowStateActive      = false
  let prevLevel              = 1
  let prevFireCount          = 0
  let prevCompletedTaskCount = 0
  let prevXpGainTick         = 0
  let playerPos              = { x: 0, y: 0 }

  const serverRackNpc = INITIAL_STATE.npcs.find(n => n.id === 'server_rack')
  const SERVER_POS    = serverRackNpc
    ? { x: serverRackNpc.position.x, y: serverRackNpc.position.y }
    : { x: 60, y: 640 }

  // Animation ticker — camera shake + glow ring + flow glow pulse
  app.ticker.add(() => {
    // Camera shake
    if (shakeIntensity > 0.5) {
      world.position.set(
        (Math.random() * 2 - 1) * shakeIntensity,
        (Math.random() * 2 - 1) * shakeIntensity,
      )
      shakeIntensity *= 0.82
    } else {
      shakeIntensity = 0
      world.position.set(0, 0)
    }

    // Level-up expanding glow ring
    if (glowPhase > 0) {
      const t      = (30 - glowPhase) / 30
      const radius = t * 50
      const alpha  = 1 - t
      glowGfx.clear()
      glowGfx.circle(playerPos.x, playerPos.y, radius)
        .stroke({ color: 0xffd700, width: 4, alpha })
      glowPhase--
      if (glowPhase === 0) glowGfx.clear()
    }

    // Flow state pulsing ring around player
    if (isFlowStateActive) {
      flowGlowPhase = (flowGlowPhase + 0.08) % (Math.PI * 2)
      const pulse = 0.4 + 0.35 * Math.sin(flowGlowPhase)
      flowGlowGfx.clear()
      flowGlowGfx.circle(playerPos.x, playerPos.y, PLAYER_HALF + 10)
        .stroke({ color: 0x007AFF, width: 3, alpha: pulse })
    } else {
      flowGlowGfx.clear()
    }
  })

  // ------------------------------------------------------------------ update
  const update = (state: GameState) => {
    if (state.status === 'won') {
      winOverlay.visible = true
      if (!winTextAdded) {
        import('pixi.js').then(({ Text }) => {
          const t = new Text({
            text: 'YOU ARE NOW CEO',
            style: { fill: '#ffd700', fontSize: 56, fontWeight: 'bold', align: 'center' },
          })
          t.anchor.set(0.5)
          t.position.set(640, 360)
          winOverlay.addChild(t)
          winTextAdded = true
        })
      }
      return
    }

    // Detect level-up → trigger glow ring
    if (state.player.level > prevLevel) glowPhase = 30
    prevLevel = state.player.level

    // Sync flow state for ticker
    isFlowStateActive = state.player.isFlowState

    // Detect new fire → camera shake
    const fireCount = state.tasks.filter(t => t.type === 'customer-fire' && t.status === 'pending').length
    if (fireCount > prevFireCount) shakeIntensity = 8
    prevFireCount = fireCount

    // Detect task completion → camera shake
    const completedTaskCount = state.tasks.filter(t => t.status === 'complete').length
    if (completedTaskCount > prevCompletedTaskCount) shakeIntensity = Math.max(shakeIntensity, 5)
    prevCompletedTaskCount = completedTaskCount

    // Spawn floating XP text on new XP gain
    if (state.lastXpGainTick > prevXpGainTick && state.lastXpGained > 0 && state.lastXpGainPos) {
      const suffix = state.player.isFlowState ? ' ×2!' : ''
      floatingText.spawn(`+${state.lastXpGained} XP${suffix}`, state.lastXpGainPos.x, state.lastXpGainPos.y)
    }
    prevXpGainTick = state.lastXpGainTick

    // Hot zone overlay
    hotZoneGfx.clear()
    if (state.activeHotZone) {
      const hz = state.activeHotZone
      hotZoneGfx.rect(hz.x, hz.y, hz.width, hz.height).fill({ color: 0xff3b30, alpha: 0.20 })
      hotZoneGfx.rect(hz.x, hz.y, hz.width, hz.height).stroke({ color: 0xff3b30, width: 2 })
    }

    // VC Visit aura around Chaz
    vcAuraGfx.clear()
    if (state.vcVisitActive) {
      const chaz = state.npcs.find(n => n.id === 'chaz')
      if (chaz) {
        const cx = (npcDisplayPos.get('chaz') ?? chaz.position).x
        const cy = (npcDisplayPos.get('chaz') ?? chaz.position).y
        vcAuraGfx.circle(cx, cy, VC_PENALTY_RADIUS).fill({ color: 0xff9500, alpha: 0.15 })
        vcAuraGfx.circle(cx, cy, VC_PENALTY_RADIUS).stroke({ color: 0xff9500, width: 2 })
      }
    }

    // Player
    playerPos = { x: state.player.position.x, y: state.player.position.y }
    playerGfx.position.set(playerPos.x, playerPos.y)
    playerGfx.zIndex = playerPos.y
    playerShadow.position.set(playerPos.x, playerPos.y + 11)
    playerShadow.zIndex = playerPos.y - 1

    // NPCs — lerp + update name tags + shadows
    for (const npc of state.npcs) {
      const g       = npcGfxMap.get(npc.id)
      const shadow  = npcShadowMap.get(npc.id)
      const nameTag = npcNameTags.get(npc.id)
      if (!g) continue

      if (npc.role === 'location') {
        g.position.set(npc.position.x, npc.position.y)
        g.zIndex = npc.position.y
        shadow?.position.set(npc.position.x, npc.position.y + 28)
        if (shadow) shadow.zIndex = npc.position.y - 1
        // Name tag centred directly above the sprite top
        nameTag?.position.set(npc.position.x, npc.position.y - 42)
        continue
      }

      const display = npcDisplayPos.get(npc.id) ?? { x: npc.position.x, y: npc.position.y }
      display.x += (npc.position.x - display.x) * LERP_SPEED
      display.y += (npc.position.y - display.y) * LERP_SPEED
      npcDisplayPos.set(npc.id, display)

      g.position.set(display.x, display.y)
      g.zIndex = display.y
      shadow?.position.set(display.x, display.y + 11)
      if (shadow) shadow.zIndex = display.y - 1
      // Name tag centred directly above the sprite; anchor (0.5,1) means y = sprite top
      nameTag?.position.set(display.x, display.y - PLAYER_HALF - 10)
    }

    // Interaction prompt — nearest in-range NPC while playing
    if (state.status === 'playing') {
      let nearestNpc: (typeof state.npcs)[0] | undefined
      for (const npc of state.npcs) {
        const display = npcDisplayPos.get(npc.id) ?? npc.position
        if (isInRange(playerPos, display, npc.interactionRadius)) {
          nearestNpc = npc
          break
        }
      }
      if (nearestNpc) {
        const display  = npcDisplayPos.get(nearestNpc.id) ?? nearestNpc.position
        const yOffset  = nearestNpc.role === 'location' ? -34 : -PLAYER_HALF - 22
        const isBattle = nearestNpc.id === 'chaz' && state.player.level >= 10
        promptText.text = isBattle ? '[E] BATTLE!' : '[E] Interact'
        promptText.position.set(display.x, display.y + yOffset)
        promptText.visible = true
      } else {
        promptText.visible = false
      }
    } else {
      promptText.visible = false
    }

    // Fire waypoint — downward arrow above server_rack
    const activeFireExists = hasActiveFire(state.tasks)
    waypointGfx.visible = activeFireExists && state.status === 'playing'
    if (waypointGfx.visible) {
      waypointGfx.clear()
      const sx = SERVER_POS.x
      const sy = SERVER_POS.y - 52
      waypointGfx.rect(sx - 3, sy - 14, 6, 14).fill(0xff3b30)
      waypointGfx.poly([sx - 10, sy, sx + 10, sy, sx, sy + 14]).fill(0xff3b30)
    }

    // Interaction highlight ring
    if (state.activeDialogueNpcId) {
      const npc = state.npcs.find(n => n.id === state.activeDialogueNpcId)
      if (npc) {
        highlight.clear()
        highlight.circle(npc.position.x, npc.position.y, npc.interactionRadius + 4)
          .stroke({ color: BRAND_BLUE, width: 2 })
        highlight.visible = true
      }
    } else {
      highlight.visible = false
    }
  }

  return { update }
}
