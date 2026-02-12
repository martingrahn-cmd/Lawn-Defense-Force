import * as THREE from 'three';

// Suburban greybox: houses, roads, cars, fences, mailboxes, props
export class SuburbanBlock {
  constructor(scene, collisionSystem) {
    this.scene = scene;
    this.collision = collisionSystem;
    this.objects = [];
    this.destructibles = [];
  }

  build() {
    this._buildGround();
    this._buildRoads();
    this._buildHouses();
    this._buildCars();
    this._buildFences();
    this._buildProps();
    this._buildTrees();
  }

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

  _buildGround() {
    // Main grass area
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

    // Grid lines for greybox feel
    const gridHelper = new THREE.GridHelper(120, 60, 0x3a7c2f, 0x3a7c2f);
    gridHelper.position.y = 0.01;
    gridHelper.material.opacity = 0.15;
    gridHelper.material.transparent = true;
    this.scene.add(gridHelper);
  }

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

  _buildHouses() {
    // House configs: [x, z, width, depth, height, color, roofColor, hasGarage]
    const housePositions = [
      // North side (z < -6.5)
      [-40, -18, 8, 6, 5, 0xeeeeee, 0x884422, true],
      [-25, -18, 7, 7, 4.5, 0xddccaa, 0x663333, false],
      [-10, -18, 9, 6, 5.5, 0xccddee, 0x444466, true],
      [10, -18, 7, 6, 4, 0xffeecc, 0x885533, false],
      [25, -18, 8, 7, 5, 0xeeddcc, 0x664422, true],
      [40, -18, 7, 6, 4.5, 0xddeedd, 0x446644, true],
      // South side (z > 6.5)
      [-40, 18, 7, 6, 4.5, 0xffeeee, 0x884444, false],
      [-25, 18, 8, 7, 5, 0xeeeeff, 0x444488, true],
      [-10, 18, 7, 6, 4, 0xeeffee, 0x448844, true],
      [10, 18, 9, 7, 5.5, 0xffffee, 0x886644, false],
      [25, 18, 7, 6, 4.5, 0xeedddd, 0x664444, true],
      [40, 18, 8, 6, 5, 0xddddee, 0x555566, false],
    ];

    for (const [x, z, w, d, h, wallColor, roofColor, hasGarage] of housePositions) {
      // Main building
      this._addBox(w, h, d, wallColor, x, 0, z);

      // Roof (triangle approximated by thin box at angle)
      const roofGeo = new THREE.BoxGeometry(w + 0.5, 0.3, d + 0.5);
      const roofMat = new THREE.MeshStandardMaterial({ color: roofColor });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.set(x, h + 0.5, z);
      roof.castShadow = true;
      this.scene.add(roof);

      // Roof peak
      const peakGeo = new THREE.BoxGeometry(w * 0.3, 1.5, d + 0.3);
      const peak = new THREE.Mesh(peakGeo, roofMat);
      peak.position.set(x, h + 1.2, z);
      peak.castShadow = true;
      this.scene.add(peak);

      // Door
      this._addBox(1.0, 2.2, 0.1, 0x664422, x, 0, z + d / 2 + 0.05, false);

      // Windows
      const winMat = new THREE.MeshStandardMaterial({
        color: 0x88bbee,
        emissive: 0x223344,
        emissiveIntensity: 0.3
      });
      const winGeo = new THREE.BoxGeometry(1.0, 1.0, 0.1);

      [-1.5, 1.5].forEach(wx => {
        const win = new THREE.Mesh(winGeo, winMat);
        win.position.set(x + wx, 2.5, z + d / 2 + 0.05);
        this.scene.add(win);
      });

      // Driveway
      const driveGeo = new THREE.PlaneGeometry(3, d / 2);
      const driveMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.9 });
      const drive = new THREE.Mesh(driveGeo, driveMat);
      drive.rotation.x = -Math.PI / 2;
      drive.position.set(x + w / 2 - 1, 0.015, z + d / 4 + (z > 0 ? -d / 2 : d / 2));
      drive.receiveShadow = true;
      this.scene.add(drive);

      // Garage
      if (hasGarage) {
        const gx = x + w / 2 + 1.5;
        const gz = z;
        this._addBox(3, 3, d * 0.7, 0xccccbb, gx, 0, gz);

        // Garage door
        this._addBox(2.5, 2.5, 0.1, 0x888877, gx, 0, gz + d * 0.35 + 0.05, false);
      }
    }
  }

  _buildCars() {
    const carConfigs = [
      // [x, z, rotation, color, type]
      [-35, -7, 0, 0x3344aa, 'sedan'],
      [-20, -7, 0, 0xcc3333, 'suv'],
      [-5, 7, Math.PI, 0x333333, 'sedan'],
      [15, 7, Math.PI, 0xeeeeee, 'suv'],
      [30, -7, 0, 0x226622, 'sedan'],
      [45, 7, Math.PI, 0x664422, 'suv'],
      // Parked in driveways
      [-38, -12, Math.PI / 2, 0x888899, 'sedan'],
      [12, 12, Math.PI / 2, 0xaa4444, 'suv'],
      [27, -12, Math.PI / 2, 0x446688, 'sedan'],
    ];

    for (const [x, z, rot, color, type] of carConfigs) {
      const issuv = type === 'suv';
      const cw = issuv ? 2.2 : 2.0;
      const ch = issuv ? 1.8 : 1.4;
      const cd = issuv ? 4.5 : 4.0;

      // Body
      const body = this._addBox(cw, ch * 0.6, cd, color, x, 0, z, true, true);
      body.rotation.y = rot;

      // Cabin
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

      // Wheels
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

  _buildFences() {
    const fenceColor = 0xddddcc;
    const fenceH = 1.0;

    // Fences along property lines
    const fenceSegments = [
      // North side front fences
      [-44, -14, 8, 'x'], [-28.5, -14, 7, 'x'], [-14, -14, 8, 'x'],
      [6.5, -14, 7, 'x'], [21.5, -14, 7, 'x'], [36.5, -14, 7, 'x'],
      // South side front fences
      [-43.5, 14, 7, 'x'], [-29, 14, 8, 'x'], [-13.5, 14, 7, 'x'],
      [6, 14, 8, 'x'], [21, 14, 7, 'x'], [36, 14, 8, 'x'],
    ];

    for (const [x, z, len, dir] of fenceSegments) {
      if (dir === 'x') {
        this._addBox(len, fenceH, 0.15, fenceColor, x, 0, z, true, true);
      } else {
        this._addBox(0.15, fenceH, len, fenceColor, x, 0, z, true, true);
      }

      // Fence posts
      for (let i = 0; i < len; i += 2) {
        const post = this._addBox(0.15, fenceH + 0.2, 0.15, 0xaa9977,
          dir === 'x' ? x - len / 2 + i : x,
          0,
          dir === 'x' ? z : z - len / 2 + i,
          false
        );
      }
    }
  }

  _buildProps() {
    // Mailboxes
    const mailboxPositions = [
      [-40, -8], [-25, -8], [-10, -8], [10, -8], [25, -8], [40, -8],
      [-40, 8], [-25, 8], [-10, 8], [10, 8], [25, 8], [40, 8],
    ];
    for (const [x, z] of mailboxPositions) {
      // Post
      this._addBox(0.1, 1.0, 0.1, 0x666666, x + 3, 0, z, false);
      // Box
      this._addBox(0.4, 0.3, 0.25, 0x2244aa, x + 3, 1.0, z, true, true);
    }

    // Trash cans
    const trashPositions = [
      [-37, -8], [-7, -8], [28, -8],
      [-37, 8], [13, 8], [43, 8],
    ];
    for (const [x, z] of trashPositions) {
      this._addBox(0.6, 1.0, 0.6, 0x445544, x, 0, z, true, true);
      // Lid
      this._addBox(0.7, 0.1, 0.7, 0x556655, x, 1.0, z, false);
    }

    // Grills
    const grillPositions = [[-22, -12], [18, 16], [42, -14]];
    for (const [x, z] of grillPositions) {
      this._addBox(0.8, 0.8, 0.5, 0x222222, x, 0, z, true, true);
      // Lid dome
      const domeGeo = new THREE.SphereGeometry(0.45, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
      const domeMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
      const dome = new THREE.Mesh(domeGeo, domeMat);
      dome.position.set(x, 0.8, z);
      dome.castShadow = true;
      this.scene.add(dome);
    }

    // Trampolines
    const trampolinePositions = [[35, -14], [-15, 16]];
    for (const [x, z] of trampolinePositions) {
      // Frame
      const frameGeo = new THREE.TorusGeometry(1.5, 0.08, 8, 16);
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.rotation.x = Math.PI / 2;
      frame.position.set(x, 0.8, z);
      this.scene.add(frame);

      // Surface
      const surfGeo = new THREE.CircleGeometry(1.4, 16);
      const surfMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
      const surf = new THREE.Mesh(surfGeo, surfMat);
      surf.rotation.x = -Math.PI / 2;
      surf.position.set(x, 0.78, z);
      this.scene.add(surf);

      // Legs
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const leg = this._addBox(0.08, 0.8, 0.08, 0x666666,
          x + Math.cos(angle) * 1.4, 0, z + Math.sin(angle) * 1.4, false
        );
      }
    }

    // Pools
    const poolPositions = [[-30, -16], [20, 17]];
    for (const [x, z] of poolPositions) {
      // Pool walls
      const poolGeo = new THREE.BoxGeometry(5, 0.5, 3);
      const poolMat = new THREE.MeshStandardMaterial({ color: 0xaabbcc });
      const pool = new THREE.Mesh(poolGeo, poolMat);
      pool.position.set(x, 0.25, z);
      this.scene.add(pool);

      // Water
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

      // Collision
      this.collision.addStatic({
        min: { x: x - 2.5, z: z - 1.5 },
        max: { x: x + 2.5, z: z + 1.5 },
        type: 'solid'
      });
    }
  }

  _buildTrees() {
    const treePositions = [
      [-45, -10], [-32, -10], [-18, -10], [5, -10], [18, -10], [33, -10], [48, -10],
      [-45, 10], [-32, 10], [-18, 10], [5, 10], [18, 10], [33, 10], [48, 10],
      // Backyard trees
      [-42, -22], [-12, -22], [15, -24], [38, -22],
      [-38, 22], [-8, 24], [22, 22], [44, 24],
    ];

    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 2, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x664422 });
    const leafGeo = new THREE.SphereGeometry(1.5, 8, 8);

    for (let i = 0; i < treePositions.length; i++) {
      const [x, z] = treePositions[i];
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.set(x, 1, z);
      trunk.castShadow = true;
      this.scene.add(trunk);

      // Deterministic variation based on index
      const shade = 0.3 + (i % 5) * 0.06;
      const leafMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(shade * 0.5, shade, shade * 0.3)
      });
      const leaves = new THREE.Mesh(leafGeo, leafMat);
      const yOff = (i % 3) * 0.2;
      const scaleVar = 0.8 + (i % 4) * 0.1;
      leaves.position.set(x, 3.0 + yOff, z);
      leaves.scale.set(scaleVar, scaleVar, scaleVar);
      leaves.castShadow = true;
      this.scene.add(leaves);
    }
  }
}
