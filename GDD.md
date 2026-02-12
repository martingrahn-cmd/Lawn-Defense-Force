# Lawn Defense Force — Game Design Document

**Version:** 0.2.0
**Genre:** Isometric Twin-Stick Shooter with missions
**Platform:** Web (Desktop browsers)
**Engine:** Three.js + Vite
**Status:** Playable prototype with mission system
**Inspiration:** Zombies Ate My Neighbors, Alienation, Helldivers

---

## 1. Concept

You're a suburbanite defending your neighborhood against waves of alien invaders. Each wave comes with a mission — rescue the cat, save the neighbor, grab the package — that awards bonus points and healing if you complete it while fighting off the enemies. Inspired by classics like Zombies Ate My Neighbors, Alienation and Helldivers: combat + objectives in every wave.

## 2. Current Features (v0.2.0)

### Gameplay Mechanics
- **Movement:** WASD with sprint (Shift) and dash (Space, 0.15s, grants invincibility)
- **Aiming & shooting:** Mouse controls aim, left click fires
- **Three weapons:** Pulse Pistol (infinite ammo), Assault Rifle (30 rounds), Plasma Shotgun (6 rounds, 7 projectiles)
- **Grenades:** Thrown with G, +1 per wave
- **Weapon switching:** Scroll wheel or 1-3 keys
- **Reload:** R key

### Camera System
- Isometric camera (45° angle, perspective)
- Smooth follow with lead in movement direction
- Dynamic zoom based on nearby enemy count
- Screenshake on hits, explosions and damage

### Enemies (4 types, balanced in v0.2)
| Type | HP | Speed | Damage | Behavior |
|------|-----|-------|--------|----------|
| **Drone** | 20 | 4.0 | 10 | Swarm with flocking AI (reduced aggression), melee |
| **Spitter** | 40 | 3.0 | 15 | Ranged projectiles, strafing |
| **Brute** | 150 | 2.5 | 30 | Slow tank, charge attack, melee |
| **Bomber** | 15 | 5.0 | 30 | Kamikaze, explodes on contact (nerfed in v0.2) |

### Wave System
- Gentler difficulty scaling per wave (~50% of v0.1)
- Drones from wave 1, Spitters from wave 2, Bombers from wave 3, Brutes from wave 4
- 6 second pause between waves with healing (+30 HP) and grenades (+1)
- Slowmo effect on wave clear

### Mission System (new in v0.2)
- Each wave generates a bonus mission with score rewards
- **Mission types:**
  - Rescue the cat / dog (go there, instant pickup)
  - Save the neighbor (hold position 3s)
  - Grab the package / find the toolbox / find the keys (go there, instant pickup)
  - Defend the grill / car (hold position 4–5s)
- Objective shown as glowing marker (light pillar + spinning diamond + ground ring)
- Direction arrow follows the player and points towards the objective
- Proximity trigger: walk near the target to interact
- Awards bonus points (400–1000) and +15 HP on completion
- HUD shows mission text, distance, and progress bar for hold missions
- "MISSION COMPLETE" announcement on completion

### Scoring System
- Kill points: Drone 100, Spitter 250, Brute 500, Bomber 200
- Combo multiplier (up to 5x at 41+ combo)
- Combo resets after 2 seconds without a kill
- Rank: D → C → B → A → S (based on total score)

### Environment
- Procedurally generated suburban block
- Houses, cars, fences, mailboxes, trash cans, grills, trampolines, pools
- Destructible objects (cars, fences, mailboxes etc.)
- Collision detection (AABB + spatial grid)

### Game Feel / Juice
- Hitstop (40ms freeze on hit)
- Slowmo on wave clear
- Particle effects on hits and explosions
- Dynamic lighting with sun following the player
- HUD with score, wave, health bar, ammo, grenades, combo display, crosshair

### UI / HUD
- Score (top left)
- Wave number (top right)
- Weapon + ammo (bottom left)
- Health bar with color coding (green → orange → red)
- Grenade count (bottom right)
- Combo multiplier (right side)
- Mission panel (top center) with objective text, distance and progress
- Wave announcement (large centered text)
- Green crosshair (follows mouse)
- Floating score popups on kills
- Version number (bottom right corner)
- Controls overlay (left side, toggle with H)

---

## 3. Technical Architecture

```
src/
├── main.js              # Bootstrap & start button
├── game/
│   ├── Game.js          # Main loop, state machine, system coordination
│   ├── Player.js        # Player movement, health, aiming
│   ├── WeaponSystem.js  # Weapon system, projectiles, ammo
│   ├── GrenadeSystem.js # Grenades
│   ├── EnemyManager.js  # Wave spawning, enemy pool
│   ├── ScoreManager.js  # Score, combo, rank
│   ├── MissionSystem.js # Mission system (new in v0.2)
│   └── enemies/         # Drone, Spitter, Brute, Bomber
├── systems/
│   ├── InputManager.js  # Keyboard + mouse
│   ├── CameraSystem.js  # Isometric follow camera
│   ├── CollisionSystem.js # AABB collision + spatial grid
│   ├── LightingSystem.js  # Dynamic lighting
│   ├── ParticleSystem.js  # Particle effects
│   ├── JuiceSystem.js     # Hitstop, slowmo, screenshake
│   └── AudioManager.js    # Sound (Howler.js)
├── world/
│   └── SuburbanBlock.js # Procedural environment generation
├── ui/
│   └── HUD.js           # Score, health, ammo etc.
├── utils/               # MathUtils, ObjectPool, SpatialGrid
└── data/                # weapons.json, enemies.json
```

### State Machine
`idle` → `playing` → `wavePause` → `playing` → ... → `gameOver`

### Dependencies
- **Three.js** v0.170.0 — 3D rendering
- **Howler.js** v2.2.4 — Audio
- **Vite** v6.0.0 — Build system

---

## 4. Roadmap

### Short term (v0.3)
- [ ] Weapon pickups — find new weapons in the world during waves
- [ ] Ammo pickups — ammo crates/drops to resupply weapons
- [ ] Proper 3D models (GLTF) instead of boxes
- [ ] Sound effects and music (assets/audio folder is prepared)
- [ ] Textures on environment
- [ ] Minimap
- [ ] Pause menu (Escape)
- [ ] Better visual feedback on player movement

### Medium term (v0.4–0.5)
- [ ] More weapon types (sniper, flamethrower, rocket launcher)
- [ ] Power-ups / pickups (health, ammo, temporary buffs)
- [ ] Boss enemies every 5th wave
- [ ] Upgrade system between waves
- [ ] More environments / map layouts
- [ ] Day/night cycle with dynamic lighting
- [ ] High score list (localStorage)

### Long term (v1.0+)
- [ ] Multiplayer (co-op)
- [ ] Campaign mode with storyline
- [ ] Procedural map generation with variation
- [ ] Mobile support (touch controls)
- [ ] Steam / Electron build

---

## 5. Changelog

### v0.1.0 (2026-02-12)
- Initial playable prototype
- Isometric twin-stick shooter with WASD + mouse
- 4 enemy types with wave system
- 3 weapons with ammo system
- Suburban block with procedural buildings and props
- Score, combo, and rank system
- Game feel: hitstop, slowmo, screenshake, particles
- GitHub Pages deploy

### v0.1.1 (2026-02-12)
- Fix: Camera follow — reduced lead amount so WASD clearly moves the player
- New: Version number visible in game (bottom right corner)
- New: Controls overlay (toggle with H)
- New: GDD documentation

### v0.2.0 (2026-02-12)
- New: **Mission system** — each wave has a mission (rescue the cat, save the neighbor, grab the package etc.)
- New: Mission markers in 3D world (light pillar, spinning diamond, ground ring)
- New: Direction arrow follows player, points towards objective
- New: Mission panel in HUD with objective, distance and progress
- New: "MISSION COMPLETE" announcement with bonus points
- Balance: Drone speed 5→4, Bomber speed 7→5, Bomber damage 50→30
- Balance: Drone flocking aggression reduced (targetWeight 3→2)
- Balance: Gentler wave scaling (~50% fewer enemies per wave)
- Balance: Bombers from wave 3 (was 2), Brutes from wave 4 (was 3)
- Balance: Wave pause increased to 6s, healing increased to +30 HP
- Fix: Projectile height lowered (0.8→0.6) + hitbox buffer for more reliable hits
- Design: Inspired by Zombies Ate My Neighbors, Alienation, Helldivers
