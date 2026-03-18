# Agent Instructions & Project Conventions

## Core Architecture
- **Paradigm**: Functional-Reactive. Strictly **no classes**. Use Factory Functions with closures for private state.
- **State Management**: The "Single Source of Truth" is the `gameMachine` (XState v5). Its context is the serializable `GameState` type.
- **Systems**: Logic (XP calculation, Inventory, NPC AI) must be pure functions that accept `state` and return a modified `state`.
- **Transitions**: **All state transitions must happen via XState events.** Never mutate context directly outside of XState `assign` actions.

## Tech Stack
- **Engine**: PixiJS (Rendering Only)
- **State Machine**: XState v5 (`setup()` API)
- **Logic**: TypeScript + Vitest (TDD)
- **Bundler**: Vite

## Project Structure
- `/src/logic`: Pure game logic (TDD enforced). No PixiJS imports here.
- `/src/machines`: XState machine definitions. No PixiJS imports here.
- `/src/view`: PixiJS rendering code.
- `/src/factories`: Factory functions for creating entities (Players, NPCs, Items).
- `.plans/`: Module-specific execution plans.

## Code Conventions
- Use `type` instead of `interface` for data shapes.
- All coordinates and physics must be calculated in the logic layer.
- Assets: All sprite paths must be defined in a central `ASSETS_CONSTANTS.ts`.

## Testing Approach
- **Logic**: 100% Unit Test coverage via Vitest.
- **Rendering**: Manual playtest verification.