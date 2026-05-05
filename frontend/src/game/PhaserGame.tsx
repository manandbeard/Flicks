import { forwardRef } from 'react';

// Placeholder types until the Phaser package is added as a dependency.
// These will be replaced with the real `Phaser.Game` / `Phaser.Scene` types.
export interface PhaserGame {
  destroy(removeCanvas: boolean, noReturn?: boolean): void;
}

export interface PhaserScene {
  scene: { key: string };
}

export interface PhaserGameRef {
  /** The Phaser Game instance, or null before it is initialised. */
  game: PhaserGame | null;
  /** The currently active Phaser Scene, or null when no scene is running. */
  scene: PhaserScene | null;
}

/**
 * PhaserGame mounts the Phaser canvas inside `#game-container` and exposes
 * the game instance and the active scene to parent components via a ref.
 *
 * Actual Phaser configuration will be added in a later phase.
 */
const PhaserGame = forwardRef<PhaserGameRef>((_, ref) => {
  // The ref is populated by the Phaser initialization logic (Phase 3+).
  // For now it satisfies the contract without instantiating a Game.
  void ref; // acknowledged – will be populated in a later phase

  return <div id="game-container" />;
});

PhaserGame.displayName = 'PhaserGame';

export default PhaserGame;
