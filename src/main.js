import { Game } from './game/Game.js';

const game = new Game();

document.getElementById('start-btn').addEventListener('click', () => {
  document.getElementById('loading-screen').style.display = 'none';
  document.getElementById('game-container').requestPointerLock?.();
  game.start();
});
