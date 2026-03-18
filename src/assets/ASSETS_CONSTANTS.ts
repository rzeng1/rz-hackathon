/**
 * Central registry for all asset paths.
 * The render layer imports from here only — never hardcodes paths inline.
 *
 * For hackathon speed: assets may not exist yet. The render layer uses
 * colored Graphics rectangles as placeholders until art is ready.
 * This file ships on day 1 regardless.
 */
export const ASSETS = {
  PLAYER: '/assets/sprites/player.png',
  NPCS: {
    ernesto: '/assets/sprites/ernesto.png',
    priya:   '/assets/sprites/priya.png',
    jake:    '/assets/sprites/jake.png',
    linda:   '/assets/sprites/linda.png',
    ceo:     '/assets/sprites/ceo.png',
  },
  ITEMS: {
    energyDrink: '/assets/sprites/energy-drink.png',
  },
  TILESET: '/assets/tiles/office-floor.png',
} as const
