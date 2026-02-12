import { AssetLoader } from './world/AssetLoader.js';
import { Game } from './game/Game.js';

const startBtn = document.getElementById('start-btn');
const progressBar = document.getElementById('loading-progress-bar');
const loadingText = document.getElementById('loading-text');

// Disable start button during asset loading
startBtn.disabled = true;
startBtn.style.opacity = '0.4';
startBtn.textContent = 'LOADING...';

const assets = new AssetLoader();

assets.loadAll((loaded, total) => {
  const pct = Math.floor((loaded / total) * 100);
  if (progressBar) progressBar.style.width = `${pct}%`;
  if (loadingText) loadingText.textContent = `Loading models... ${loaded}/${total}`;
  startBtn.textContent = `LOADING ${pct}%`;
}).then(() => {
  // Assets loaded — create game
  if (loadingText) loadingText.textContent = 'Ready!';
  if (progressBar) progressBar.style.width = '100%';

  const game = new Game(assets);

  startBtn.disabled = false;
  startBtn.style.opacity = '1';
  startBtn.textContent = 'START MISSION';

  startBtn.addEventListener('click', () => {
    document.getElementById('loading-screen').style.display = 'none';
    document.body.style.cursor = 'none';
    game.start();
  });
}).catch((err) => {
  console.error('Failed to load assets:', err);
  if (loadingText) loadingText.textContent = 'Load error — starting with greybox...';

  // Fallback: start without assets
  const game = new Game(null);
  startBtn.disabled = false;
  startBtn.style.opacity = '1';
  startBtn.textContent = 'START MISSION';

  startBtn.addEventListener('click', () => {
    document.getElementById('loading-screen').style.display = 'none';
    document.body.style.cursor = 'none';
    game.start();
  });
});
