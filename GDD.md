# Lawn Defense Force — Game Design Document

**Version:** 0.2.0
**Genre:** Isometric Twin-Stick Shooter med uppdrag
**Platform:** Web (Desktop browsers)
**Engine:** Three.js + Vite
**Status:** Spelbar prototyp med uppdragssystem
**Inspiration:** Zombies Ate My Neighbors, Alienation, Helldivers

---

## 1. Koncept

Du är en förortsbo som försvarar sitt kvarter mot vågor av utomjordiska fiender. Varje wave kommer med ett uppdrag — rädda katten, hjälp grannen, hämta paketet — som ger bonuspoäng och läkning om du klarar det medan du håller fienderna borta. Inspirerat av klassiker som Zombies Ate My Neighbors, Alienation och Helldivers: strid + uppdrag i varje wave.

## 2. Nuvarande funktioner (v0.2.0)

### Spelmekanik
- **Rörelse:** WASD med sprint (Shift) och dash (Space, 0.15s, ger osynlighet)
- **Sikte & skjutning:** Musen styr sikte, vänsterklick skjuter
- **Tre vapen:** Pulse Pistol (oändlig ammo), Assault Rifle (30 skott), Plasma Shotgun (6 skott, 7 projektiler)
- **Granater:** Kastad med G, +1 per wave
- **Vapenväxling:** Scrollhjul eller 1-3 tangenter
- **Omladdning:** R-tangent

### Kamerasystem
- Isometrisk kamera (45° vinkel, perspektiv)
- Smooth follow med lead i rörelseriktningen
- Dynamisk zoom baserat på antal fiender i närheten
- Screenshake vid skott, explosioner och skada

### Fiender (4 typer, balanserade i v0.2)
| Typ | HP | Hastighet | Skada | Beteende |
|-----|-----|-----------|-------|----------|
| **Drone** | 20 | 4.0 | 10 | Svärm med flocking-AI (lägre aggression), melee |
| **Spitter** | 40 | 3.0 | 15 | Ranged projektiler |
| **Brute** | 150 | 2.5 | 30 | Långsam tank, melee |
| **Bomber** | 15 | 5.0 | 30 | Kamikaze, exploderar vid kontakt (nerfad i v0.2) |

### Wave-system
- Mjukare svårighetsökning per wave (ca hälften av v0.1)
- Drones från wave 1, Spitters från wave 2, Bombers från wave 3, Brutes från wave 4
- 6 sekunders paus mellan waves med läkning (+30 HP) och granater (+1)
- Slowmo-effekt vid wave clear

### Uppdragssystem (nytt i v0.2)
- Varje wave genererar ett valfritt uppdrag med bonuspoäng
- **Uppdragstyper:**
  - Rädda katten / hunden (gå dit, instant pickup)
  - Rädda grannen (håll position 3s)
  - Hämta paketet / verktygslådan / nycklarna (gå dit, instant pickup)
  - Försvara grillen / bilen (håll position 4–5s)
- Uppdragsmål visas som lysande markör (pelare + roterande diamant + markring) i världen
- Proximity-trigger: gå nära målet för att interagera
- Ger bonuspoäng (400–1000) och +15 HP vid klarning
- HUD visar uppdragstext, avstånd, progress-bar för hålltid
- "MISSION COMPLETE" annonsering vid klarning

### Poängsystem
- Kill-poäng: Drone 100, Spitter 250, Brute 500, Bomber 200
- Combo-multiplikator (upp till 5x vid 41+ combo)
- Combo-reset efter 2 sekunder utan kill
- Rank: D → C → B → A → S (baserat på totalpoäng)

### Miljö
- Procedurellt genererat förortskvarter
- Hus, bilar, staket, brevlådor, soptunnor, grillar, studsmatter, pooler
- Destruktibla objekt (bilar, staket, brevlådor m.m.)
- Kollisionsdetektering (AABB + spatial grid)

### Game Feel / Juice
- Hitstop (40ms frys vid träff)
- Slowmo vid wave clear
- Partikeleffekter vid träffar och explosioner
- Dynamisk belysning med sol som följer spelaren
- HUD med score, wave, hälsobar, ammo, granater, combo-display, crosshair

### UI / HUD
- Score (övre vänstra)
- Wave-nummer (övre högra)
- Vapen + ammo (nedre vänstra)
- Hälsobar med färgkodning (grön → orange → röd)
- Granatantal (nedre högra)
- Combo-multiplikator (höger sida)
- Wave-annonsering (stor centrerad text)
- Grön crosshair (följer musen)
- Flytande score-popups vid kills
- Version-nummer (nedre högra hörnet)
- Kontroll-overlay (vänster sida, toggle med H)

---

## 3. Teknisk arkitektur

```
src/
├── main.js              # Bootstrap & start-knapp
├── game/
│   ├── Game.js          # Huvudloop, state machine, systemkoordinering
│   ├── Player.js        # Spelarrörelse, hälsa, sikte
│   ├── WeaponSystem.js  # Vapensystem, projektiler, ammo
│   ├── GrenadeSystem.js # Granater
│   ├── EnemyManager.js  # Wave-spawning, fiendepool
│   ├── ScoreManager.js  # Poäng, combo, rank
│   ├── MissionSystem.js # Uppdragssystem (nytt i v0.2)
│   └── enemies/         # Drone, Spitter, Brute, Bomber
├── systems/
│   ├── InputManager.js  # Tangentbord + mus
│   ├── CameraSystem.js  # Isometrisk follow-kamera
│   ├── CollisionSystem.js # AABB-kollision + spatial grid
│   ├── LightingSystem.js  # Dynamiskt ljus
│   ├── ParticleSystem.js  # Partikeleffekter
│   ├── JuiceSystem.js     # Hitstop, slowmo, screenshake
│   └── AudioManager.js    # Ljud (Howler.js)
├── world/
│   └── SuburbanBlock.js # Procedural miljögenerering
├── ui/
│   └── HUD.js           # Score, hälsa, ammo m.m.
├── utils/               # MathUtils, ObjectPool, SpatialGrid
└── data/                # weapons.json, enemies.json
```

### State machine
`idle` → `playing` → `wavePause` → `playing` → ... → `gameOver`

### Beroenden
- **Three.js** v0.170.0 — 3D-rendering
- **Howler.js** v2.2.4 — Ljud
- **Vite** v6.0.0 — Build-system

---

## 4. Framtida planer / Roadmap

### Kort sikt (v0.2)
- [ ] Riktiga 3D-modeller (GLTF) istället för boxar
- [ ] Ljudeffekter och musik (assets/audio mappen är förberedd)
- [ ] Texturer på miljön
- [ ] Minimap
- [ ] Pausmeny (Escape)
- [ ] Bättre visuell feedback på spelarrörelse

### Medellång sikt (v0.3–0.5)
- [ ] Fler vapentyper (sniper, flamethrower, rocket launcher)
- [ ] Power-ups / pickups (hälsa, ammo, tillfälliga buffs)
- [ ] Boss-fiender var 5:e wave
- [ ] Uppgraderingssystem mellan waves
- [ ] Fler miljöer / kartlayouter
- [ ] Natt-/dag-cykel med dynamisk belysning
- [ ] Highscore-lista (localStorage)

### Lång sikt (v1.0+)
- [ ] Multiplayer (co-op)
- [ ] Kampanjläge med storyline
- [ ] Procedurell kartgenerering med variation
- [ ] Mobilstöd (touch controls)
- [ ] Steam / Electron build

---

## 5. Ändringslogg

### v0.1.0 (2026-02-12)
- Initial playable prototype
- Isometrisk twin-stick shooter med WASD + mus
- 4 fiendetyper med wave-system
- 3 vapen med ammo-system
- Förortskvarter med procedurella byggnader och props
- Poäng-, combo- och ranksystem
- Game feel: hitstop, slowmo, screenshake, partiklar
- GitHub Pages deploy

### v0.1.1 (2026-02-12)
- Fix: Kameraföljning — minskad lead-mängd så WASD tydligt rör spelaren
- Nytt: Version-nummer synligt i spelet (nedre högra hörnet)
- Nytt: Kontroll-overlay (toggle med H)
- Nytt: GDD-dokumentation

### v0.2.0 (2026-02-12)
- Nytt: **Uppdragssystem** — varje wave har ett uppdrag (rädda katten, hjälp grannen, hämta paketet etc.)
- Nytt: Uppdragsmarkörer i 3D-världen (ljuspelare, roterande diamant, markring)
- Nytt: Uppdragspanel i HUD med mål, avstånd och progress
- Nytt: "MISSION COMPLETE" annonsering med bonuspoäng
- Balans: Drone hastighet 5→4, Bomber hastighet 7→5, Bomber skada 50→30
- Balans: Drone flocking-aggression sänkt (targetWeight 3→2)
- Balans: Mjukare wave-skalning (~50% färre fiender per wave)
- Balans: Bombers från wave 3 (var 2), Brutes från wave 4 (var 3)
- Balans: Wave-paus ökad till 6s, läkning ökad till +30 HP
- Design: Inspiration från Zombies Ate My Neighbors, Alienation, Helldivers
