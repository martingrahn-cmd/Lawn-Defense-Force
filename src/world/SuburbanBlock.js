import * as THREE from 'three';

export class SuburbanBlock {
  constructor(scene, collisionSystem, assets) {
    this.scene = scene;
    this.collision = collisionSystem;
    this.assets = assets;
    this.objects = [];
    this.destructibles = [];
  }

  build() {
    this._buildGround();
    this._buildRoads();
    this._buildHouses();
    this._buildCars();
    this._buildFences();
    this._buildTrees();
    this._buildDriveways();
    this._buildPaths();
    this._buildProps();
  }

  // --- Utility: place a greybox ---
  _addBox(w, h, d, color, x, y, z, collision = true, destructible = false) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    this.objects.push(mesh);

    if (collision) {
      const halfW = w / 2, halfD = d / 2;
      this.collision.addStatic({
        min: { x: x - halfW, z: z - halfD },
        max: { x: x + halfW, z: z + halfD },
        type: destructible ? 'destructible' : 'solid',
        ref: mesh,
        hp: destructible ? 30 : Infinity
      });
    }

    if (destructible) {
      this.destructibles.push({
        mesh,
        hp: 30,
        alive: true,
        position: new THREE.Vector3(x, y, z)
      });
    }

    return mesh;
  }

  // --- Utility: place a GLB model ---
  _placeModel(name, x, y, z, options = {}) {
    const data = this.assets ? this.assets.getModel(name) : null;
    if (!data) return null;

    const model = data.scene;

    // Determine scale factor
    let scaleFactor = options.scale || 1;
    if (options.targetWidth && data.size.x > 0) {
      scaleFactor = options.targetWidth / data.size.x;
    } else if (options.targetHeight && data.size.y > 0) {
      scaleFactor = options.targetHeight / data.size.y;
    } else if (options.targetDepth && data.size.z > 0) {
      scaleFactor = options.targetDepth / data.size.z;
    }
    model.scale.setScalar(scaleFactor);

    // Apply rotation before computing bounds
    if (options.rotationY !== undefined) {
      model.rotation.y = options.rotationY;
    }

    // Compute bounds at origin to center the model
    model.position.set(0, 0, 0);
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);

    // Center model at (x, z) with bottom at y
    const centerX = (bounds.min.x + bounds.max.x) / 2;
    const centerZ = (bounds.min.z + bounds.max.z) / 2;
    model.position.set(
      x - centerX,
      y - bounds.min.y,
      z - centerZ
    );

    this.scene.add(model);
    this.objects.push(model);

    // Collision from world-space bounding box
    if (options.collision !== false) {
      model.updateMatrixWorld(true);
      const worldBox = new THREE.Box3().setFromObject(model);
      this.collision.addStatic({
        min: { x: worldBox.min.x, z: worldBox.min.z },
        max: { x: worldBox.max.x, z: worldBox.max.z },
        type: options.destructible ? 'destructible' : 'solid',
        ref: model,
        hp: options.destructible ? 30 : Infinity
      });
    }

    if (options.destructible) {
      this.destructibles.push({
        mesh: model,
        hp: 30,
        alive: true,
        position: new THREE.Vector3(x, y, z)
      });
    }

    return model;
  }

  // ==================== GROUND ====================
  _buildGround() {
    const grassGeo = new THREE.PlaneGeometry(120, 100);
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x4a8c3f,
      roughness: 0.9
    });
    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.rotation.x = -Math.PI / 2;
    grass.receiveShadow = true;
    this.scene.add(grass);
    this.objects.push(grass);

    const gridHelper = new THREE.GridHelper(120, 60, 0x3a7c2f, 0x3a7c2f);
    gridHelper.position.y = 0.01;
    gridHelper.material.opacity = 0.15;
    gridHelper.material.transparent = true;
    this.scene.add(gridHelper);
  }

  // ==================== ROADS ====================
  _buildRoads() {
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x444444,
      roughness: 0.95
    });
    const sidewalkMat = new THREE.MeshStandardMaterial({
      color: 0x999999,
      roughness: 0.85
    });

    // Main horizontal road
    const roadGeo = new THREE.PlaneGeometry(120, 8);
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.02, 0);
    road.receiveShadow = true;
    this.scene.add(road);

    // Road markings — dashed center line
    for (let x = -55; x < 55; x += 4) {
      const lineGeo = new THREE.PlaneGeometry(2, 0.2);
      const lineMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(x, 0.03, 0);
      this.scene.add(line);
    }

    // Sidewalks
    const swGeo = new THREE.PlaneGeometry(120, 2);
    [-5.5, 5.5].forEach(z => {
      const sw = new THREE.Mesh(swGeo, sidewalkMat);
      sw.rotation.x = -Math.PI / 2;
      sw.position.set(0, 0.03, z);
      sw.receiveShadow = true;
      this.scene.add(sw);
    });

    // Vertical cross-road
    const crossRoadGeo = new THREE.PlaneGeometry(8, 100);
    const crossRoad = new THREE.Mesh(crossRoadGeo, roadMat);
    crossRoad.rotation.x = -Math.PI / 2;
    crossRoad.position.set(0, 0.02, 0);
    crossRoad.receiveShadow = true;
    this.scene.add(crossRoad);
  }

  // ==================== HOUSES (GLB with colormap texture) ====================
  _buildHouses() {
    const buildingTypes = [
      'building-a', 'building-b', 'building-c', 'building-d',
      'building-e', 'building-f', 'building-g', 'building-h',
      'building-i', 'building-j', 'building-k', 'building-l'
    ];

    // Assign colormap variations to each house (cycles through available textures)
    // 0=colormap, 1=variation-a, 2=variation-b, 3=variation-c
    const colormapIndices = [0, 1, 2, 3, 0, 2, 1, 3, 2, 0, 3, 1];

    // [x, z, targetWidth]
    const positions = [
      [-40, -18, 8], [-25, -18, 7], [-10, -18, 9],
      [10, -18, 7],  [25, -18, 8],  [40, -18, 7],
      [-40, 18, 7],  [-25, 18, 8],  [-10, 18, 7],
      [10, 18, 9],   [25, 18, 7],   [40, 18, 8],
    ];

    for (let i = 0; i < positions.length; i++) {
      const [x, z, targetWidth] = positions[i];
      const type = buildingTypes[i];
      const rotY = z > 0 ? Math.PI : 0;

      const placed = this._placeModel(type, x, 0, z, {
        targetWidth,
        rotationY: rotY,
        collision: true
      });

      if (placed) {
        // Swap colormap texture to give each house a different color variation
        const newMap = this.assets
          ? this.assets.getColormap(colormapIndices[i])
          : null;

        placed.traverse((child) => {
          if (!child.isMesh) return;

          // Clone material so each house is independent
          const swapTexture = (mat) => {
            const m = mat.clone();
            if (newMap && m.map) {
              m.map = newMap;
              m.needsUpdate = true;
            }
            return m;
          };

          if (Array.isArray(child.material)) {
            child.material = child.material.map(swapTexture);
          } else {
            child.material = swapTexture(child.material);
          }
        });
      } else {
        this._addBox(targetWidth, 5, 6, houseTints[i], x, 0, z);
      }
    }
  }

  // ==================== CARS (greybox) ====================
  _buildCars() {
    const carConfigs = [
      [-35, -7, 0, 0x3344aa, 'sedan'],
      [-20, -7, 0, 0xcc3333, 'suv'],
      [-5, 7, Math.PI, 0x333333, 'sedan'],
      [15, 7, Math.PI, 0xeeeeee, 'suv'],
      [30, -7, 0, 0x226622, 'sedan'],
      [45, 7, Math.PI, 0x664422, 'suv'],
      [-38, -12, Math.PI / 2, 0x888899, 'sedan'],
      [12, 12, Math.PI / 2, 0xaa4444, 'suv'],
      [27, -12, Math.PI / 2, 0x446688, 'sedan'],
    ];

    for (const [x, z, rot, color, type] of carConfigs) {
      const issuv = type === 'suv';
      const cw = issuv ? 2.2 : 2.0;
      const ch = issuv ? 1.8 : 1.4;
      const cd = issuv ? 4.5 : 4.0;

      const body = this._addBox(cw, ch * 0.6, cd, color, x, 0, z, true, true);
      body.rotation.y = rot;

      const cabinGeo = new THREE.BoxGeometry(cw - 0.3, ch * 0.4, cd * 0.5);
      const cabinMat = new THREE.MeshStandardMaterial({
        color: 0x88bbdd,
        transparent: true,
        opacity: 0.6
      });
      const cabin = new THREE.Mesh(cabinGeo, cabinMat);
      cabin.position.set(x, ch * 0.6 + ch * 0.2, z);
      cabin.rotation.y = rot;
      cabin.castShadow = true;
      this.scene.add(cabin);

      const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 8);
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
      const offsets = [
        [-cw / 2 - 0.1, 0.3, cd / 2 - 0.5],
        [cw / 2 + 0.1, 0.3, cd / 2 - 0.5],
        [-cw / 2 - 0.1, 0.3, -cd / 2 + 0.5],
        [cw / 2 + 0.1, 0.3, -cd / 2 + 0.5],
      ];
      for (const [wx, wy, wz] of offsets) {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x + wx, wy, z + wz);
        this.scene.add(wheel);
      }
    }
  }

  // ==================== FENCES (GLB) ====================
  _buildFences() {
    // Front fences along properties: [x, z, length]
    const frontFences = [
      // North side
      [-44, -14, 8], [-28.5, -14, 7], [-14, -14, 8],
      [6.5, -14, 7], [21.5, -14, 7], [36.5, -14, 7],
      // South side
      [-43.5, 14, 7], [-29, 14, 8], [-13.5, 14, 7],
      [6, 14, 8], [21, 14, 7], [36, 14, 8],
    ];

    for (const [x, z, len] of frontFences) {
      this._placeFenceSegment(x, z, len, 'fence-1x4', 0);
    }

    // Side fences running front-to-back for some yards: [x, z, length, rotY]
    // These create enclosed garden areas for select properties
    const sideFences = [
      // North side: left/right edges of properties (run along Z axis)
      [-44, -16, 5, Math.PI / 2],  [-36, -16, 5, Math.PI / 2],  // House 0
      [-14, -16, 5, Math.PI / 2],  [-6, -16, 5, Math.PI / 2],   // House 2
      [21, -16, 5, Math.PI / 2],   [29, -16, 5, Math.PI / 2],   // House 4
      // South side
      [-44, 16, 5, Math.PI / 2],   [-36, 16, 5, Math.PI / 2],   // House 6
      [6, 16, 5, Math.PI / 2],     [14, 16, 5, Math.PI / 2],    // House 9
      [36, 16, 5, Math.PI / 2],    [44, 16, 5, Math.PI / 2],    // House 11
    ];

    for (const [x, z, len, rotY] of sideFences) {
      this._placeFenceSegment(x, z, len, 'fence-1x3', rotY);
    }

    // Back fences (behind houses) for enclosed yards
    const backFences = [
      // North side (z = -21 ish, behind houses at z=-18)
      [-40, -21, 8, 0],   // House 0
      [-10, -21, 8, 0],   // House 2
      [25, -21, 8, 0],    // House 4
      // South side (z = 21, behind houses at z=18)
      [-40, 21, 8, 0],    // House 6
      [10, 21, 8, 0],     // House 9
      [40, 21, 8, 0],     // House 11
    ];

    for (const [x, z, len, rotY] of backFences) {
      this._placeFenceSegment(x, z, len, 'fence-1x4', rotY);
    }
  }

  _placeFenceSegment(x, z, len, modelName, rotY) {
    const placed = this._placeModel(modelName, x, 0, z, {
      targetWidth: len,
      rotationY: rotY,
      collision: true,
      destructible: true
    });

    if (!placed) {
      // Greybox fallback
      if (Math.abs(rotY - Math.PI / 2) < 0.1) {
        // Vertical fence (along Z)
        this._addBox(0.15, 1.0, len, 0xddddcc, x, 0, z, true, true);
      } else {
        // Horizontal fence (along X)
        this._addBox(len, 1.0, 0.15, 0xddddcc, x, 0, z, true, true);
      }
    }
  }

  // ==================== TREES (GLB) ====================
  _buildTrees() {
    const treePositions = [
      // Along sidewalks
      [-45, -10], [-32, -10], [-18, -10], [5, -10], [18, -10], [33, -10], [48, -10],
      [-45, 10], [-32, 10], [-18, 10], [5, 10], [18, 10], [33, 10], [48, 10],
      // Behind houses (backyards) — north side
      [-42, -22], [-38, -20], [-12, -22], [-8, -20],
      [15, -24], [23, -21], [38, -22],
      // Behind houses (backyards) — south side
      [-38, 22], [-42, 20], [-8, 24], [-12, 21],
      [12, 20], [22, 22], [38, 21], [44, 24],
      // Garden trees inside fenced yards
      [-40, -17], [-10, -17], [25, -17],  // north fenced yards
      [-40, 17], [10, 17], [40, 17],      // south fenced yards
    ];

    for (let i = 0; i < treePositions.length; i++) {
      const [x, z] = treePositions[i];
      const type = i % 2 === 0 ? 'tree-large' : 'tree-small';
      // Target height: large ~4.5, small ~3.0
      const targetHeight = type === 'tree-large' ? 4.5 : 3.0;

      const placed = this._placeModel(type, x, 0, z, {
        targetHeight,
        collision: false
      });

      // Fallback to greybox
      if (!placed) {
        const shade = 0.3 + (i % 5) * 0.06;
        const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 2, 6);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x664422 });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.set(x, 1, z);
        trunk.castShadow = true;
        this.scene.add(trunk);

        const leafGeo = new THREE.SphereGeometry(1.5, 8, 8);
        const leafMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(shade * 0.5, shade, shade * 0.3)
        });
        const leaves = new THREE.Mesh(leafGeo, leafMat);
        leaves.position.set(x, 3.0, z);
        leaves.castShadow = true;
        this.scene.add(leaves);
      }
    }
  }

  // ==================== DRIVEWAYS (GLB) ====================
  _buildDriveways() {
    // Place driveways connecting road to each house
    const drivePositions = [
      // North side: driveway goes from road (z=-6.5) toward house (z=-18)
      [-38, -11, 'long'], [-23, -11, 'short'], [-8, -11, 'long'],
      [12, -11, 'short'], [27, -11, 'long'], [42, -11, 'short'],
      // South side: driveway goes from road (z=6.5) toward house (z=18)
      [-38, 11, 'long'], [-23, 11, 'short'], [-8, 11, 'long'],
      [12, 11, 'short'], [27, 11, 'long'], [42, 11, 'short'],
    ];

    for (const [x, z, size] of drivePositions) {
      const type = size === 'long' ? 'driveway-long' : 'driveway-short';
      const targetWidth = 3;
      const rotY = z > 0 ? 0 : Math.PI;

      const placed = this._placeModel(type, x, 0.01, z, {
        targetWidth,
        rotationY: rotY,
        collision: false
      });

      // Fallback to greybox
      if (!placed) {
        const driveGeo = new THREE.PlaneGeometry(3, 5);
        const driveMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.9 });
        const drive = new THREE.Mesh(driveGeo, driveMat);
        drive.rotation.x = -Math.PI / 2;
        drive.position.set(x, 0.015, z);
        drive.receiveShadow = true;
        this.scene.add(drive);
      }
    }
  }

  // ==================== PATHS (GLB) ====================
  _buildPaths() {
    // Front walkways from road to each house
    const pathPositions = [
      // North side
      [-40, -11, 'path-stones-short'], [-25, -11, 'path-short'],
      [-10, -11, 'path-stones-long'], [10, -11, 'path-short'],
      [25, -11, 'path-stones-messy'], [40, -11, 'path-long'],
      // South side
      [-40, 11, 'path-long'], [-25, 11, 'path-stones-short'],
      [-10, 11, 'path-short'], [10, 11, 'path-stones-long'],
      [25, 11, 'path-stones-messy'], [40, 11, 'path-short'],
    ];

    for (const [x, z, type] of pathPositions) {
      this._placeModel(type, x, 0.01, z, {
        targetWidth: 1.5,
        collision: false
      });
    }
  }

  // ==================== PROPS (greybox + GLB planters) ====================
  _buildProps() {
    // Mailboxes
    const mailboxPositions = [
      [-40, -8], [-25, -8], [-10, -8], [10, -8], [25, -8], [40, -8],
      [-40, 8], [-25, 8], [-10, 8], [10, 8], [25, 8], [40, 8],
    ];
    for (const [x, z] of mailboxPositions) {
      this._addBox(0.1, 1.0, 0.1, 0x666666, x + 3, 0, z, false);
      this._addBox(0.4, 0.3, 0.25, 0x2244aa, x + 3, 1.0, z, true, true);
    }

    // Trash cans
    const trashPositions = [
      [-37, -8], [-7, -8], [28, -8],
      [-37, 8], [13, 8], [43, 8],
    ];
    for (const [x, z] of trashPositions) {
      this._addBox(0.6, 1.0, 0.6, 0x445544, x, 0, z, true, true);
      this._addBox(0.7, 0.1, 0.7, 0x556655, x, 1.0, z, false);
    }

    // Grills
    const grillPositions = [[-22, -12], [18, 16], [42, -14]];
    for (const [x, z] of grillPositions) {
      this._addBox(0.8, 0.8, 0.5, 0x222222, x, 0, z, true, true);
      const domeGeo = new THREE.SphereGeometry(0.45, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
      const domeMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
      const dome = new THREE.Mesh(domeGeo, domeMat);
      dome.position.set(x, 0.8, z);
      dome.castShadow = true;
      this.scene.add(dome);
    }

    // Planters (GLB)
    const planterPositions = [
      [-35, -15], [-15, -15], [20, -15], [38, -15],
      [-35, 15], [-15, 15], [20, 15], [38, 15],
    ];
    for (const [x, z] of planterPositions) {
      this._placeModel('planter', x, 0, z, {
        targetHeight: 0.8,
        collision: true,
        destructible: true
      });
    }

    // Trampolines
    const trampolinePositions = [[35, -14], [-15, 16]];
    for (const [x, z] of trampolinePositions) {
      const frameGeo = new THREE.TorusGeometry(1.5, 0.08, 8, 16);
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.rotation.x = Math.PI / 2;
      frame.position.set(x, 0.8, z);
      this.scene.add(frame);

      const surfGeo = new THREE.CircleGeometry(1.4, 16);
      const surfMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
      const surf = new THREE.Mesh(surfGeo, surfMat);
      surf.rotation.x = -Math.PI / 2;
      surf.position.set(x, 0.78, z);
      this.scene.add(surf);

      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        this._addBox(0.08, 0.8, 0.08, 0x666666,
          x + Math.cos(angle) * 1.4, 0, z + Math.sin(angle) * 1.4, false
        );
      }
    }

    // Pools
    const poolPositions = [[-30, -16], [20, 17]];
    for (const [x, z] of poolPositions) {
      const poolGeo = new THREE.BoxGeometry(5, 0.5, 3);
      const poolMat = new THREE.MeshStandardMaterial({ color: 0xaabbcc });
      const pool = new THREE.Mesh(poolGeo, poolMat);
      pool.position.set(x, 0.25, z);
      this.scene.add(pool);

      const waterGeo = new THREE.PlaneGeometry(4.8, 2.8);
      const waterMat = new THREE.MeshStandardMaterial({
        color: 0x4488cc,
        transparent: true,
        opacity: 0.7,
        roughness: 0.1
      });
      const water = new THREE.Mesh(waterGeo, waterMat);
      water.rotation.x = -Math.PI / 2;
      water.position.set(x, 0.45, z);
      this.scene.add(water);

      this.collision.addStatic({
        min: { x: x - 2.5, z: z - 1.5 },
        max: { x: x + 2.5, z: z + 1.5 },
        type: 'solid'
      });
    }
  }
}
