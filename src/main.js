import { AssetLoader } from './world/AssetLoader.js';
import { Game } from './game/Game.js';
import { Editor } from './editor/Editor.js';

const startBtn = document.getElementById('start-btn');
const editorBtn = document.getElementById('editor-btn');
const progressBar = document.getElementById('loading-progress-bar');
const loadingText = document.getElementById('loading-text');

// Disable buttons during asset loading
startBtn.disabled = true;
startBtn.style.opacity = '0.4';
startBtn.textContent = 'LOADING...';
editorBtn.disabled = true;
editorBtn.style.opacity = '0.4';

const assets = new AssetLoader();

// Gamepad polling for menus — checks A (0) or Start (9) button
function pollGamepadForButton(callback) {
  let prevA = false;
  let prevStart = false;

  function poll() {
    const gamepads = navigator.getGamepads();
    for (const gp of gamepads) {
      if (!gp || gp.buttons.length < 2) continue;
      const aDown = gp.buttons[0].pressed;
      const startDown = gp.buttons.length > 9 && gp.buttons[9].pressed;

      // Detect rising edge (just pressed)
      if ((aDown && !prevA) || (startDown && !prevStart)) {
        prevA = aDown;
        prevStart = startDown;
        callback();
        return; // stop polling
      }
      prevA = aDown;
      prevStart = startDown;
    }
    requestAnimationFrame(poll);
  }
  requestAnimationFrame(poll);
}

function startGame(game) {
  document.getElementById('loading-screen').style.display = 'none';
  document.body.style.cursor = 'none';
  game.start();
}

function startEditor(assets) {
  document.getElementById('loading-screen').style.display = 'none';
  document.getElementById('hud').style.display = 'none';
  document.body.style.cursor = '';

  // Hide the game's canvas so the editor canvas is visible
  const gameCanvas = document.querySelector('#game-container > canvas');
  if (gameCanvas) gameCanvas.style.display = 'none';

  const container = document.getElementById('game-container');
  new Editor(container, assets);
}

assets.loadAll((loaded, total) => {
  const pct = Math.floor((loaded / total) * 100);
  if (progressBar) progressBar.style.width = `${pct}%`;
  if (loadingText) loadingText.textContent = `Loading models... ${loaded}/${total}`;
  startBtn.textContent = `LOADING ${pct}%`;
}).then(() => {
  if (loadingText) loadingText.textContent = 'Ready!';
  if (progressBar) progressBar.style.width = '100%';

  const game = new Game(assets);

  startBtn.disabled = false;
  startBtn.style.opacity = '1';
  startBtn.textContent = 'START MISSION';

  editorBtn.disabled = false;
  editorBtn.style.opacity = '1';

  // Mouse/keyboard start
  startBtn.addEventListener('click', () => startGame(game));
  editorBtn.addEventListener('click', () => startEditor(assets));

  // Gamepad start — poll for A or Start button
  pollGamepadForButton(() => {
    if (!startBtn.disabled) startGame(game);
  });
}).catch((err) => {
  console.error('Failed to load assets:', err);
  if (loadingText) loadingText.textContent = 'Load error — starting with greybox...';

  const game = new Game(null);
  startBtn.disabled = false;
  startBtn.style.opacity = '1';
  startBtn.textContent = 'START MISSION';

  editorBtn.disabled = false;
  editorBtn.style.opacity = '1';

  startBtn.addEventListener('click', () => startGame(game));
  editorBtn.addEventListener('click', () => startEditor(null));
  pollGamepadForButton(() => {
    if (!startBtn.disabled) startGame(game);
  });
});
