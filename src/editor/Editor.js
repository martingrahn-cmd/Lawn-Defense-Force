import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/* Default target sizes per model category (matching game scale) */
const DEFAULT_SIZES = {
  building: { dim: 'x', value: 8 },
  car:      { dim: 'x', value: 2 },
  tree:     { dim: 'y', value: 4 },
  fence:    { dim: 'x', value: 4 },
  path:     { dim: 'x', value: 2 },
  driveway: { dim: 'x', value: 3 },
  planter:  { dim: 'y', value: 0.8 },
  road:     { dim: 'x', value: 4 },
  sign:     { dim: 'y', value: 3 },
  light:    { dim: 'y', value: 4 },
  construction: { dim: 'y', value: 1.5 },
  bridge:   { dim: 'x', value: 4 },
  tile:     { dim: 'x', value: 4 },
};

export class Editor {
  constructor(container, assets) {
    this.container = container;
    this.assets = assets;
    this.placed = [];
    this.selected = null;
    this.selBox = null;
    this.activeName = null;
    this.ghost = null;
    this.ghostRotY = 0;       // rotation for next placement
    this.tool = 'place';
    this.snap = true;
    this.snapSize = 1;
    this.imported = {};
    this._id = 0;
    this._running = true;
    this._thumbnailCache = {};

    // Drag state
    this._mouseStart = { x: 0, y: 0 };
    this._dragging = false;
    this._dragObj = null;
    this._dragStartX = 0;
    this._dragStartZ = 0;
    this._dragMouseStart = null;

    // Raycasting helpers
    this.ray = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this._pt = new THREE.Vector3();

    this._initRenderer();
    this._initScene();
    this._initCamera();
    this._initControls();
    this._initLights();
    this._initGround();
    this._initPlayerRef();
    this._initThumbnailRenderer();
    this._initUI();
    this._bindEvents();
    this._loop();
  }

  /* ═══════════════ SETUP ═══════════════ */

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x87ceeb);
    this.container.appendChild(this.renderer.domElement);
  }

  _initScene() {
    this.scene = new THREE.Scene();
  }

  _initCamera() {
    const a = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(45, a, 0.1, 500);
    this.camera.position.set(0, 60, 60);
    this.camera.lookAt(0, 0, 0);
  }

  _initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 200;
    this.controls.mouseButtons = {
      LEFT: null,
      MIDDLE: THREE.MOUSE.ROTATE,
      RIGHT: THREE.MOUSE.PAN
    };
    this.controls.panSpeed = 1.5;
  }

  _initLights() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(30, 50, 20);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.left = -80;
    dir.shadow.camera.right = 80;
    dir.shadow.camera.top = 80;
    dir.shadow.camera.bottom = -80;
    this.scene.add(dir);
  }

  _initGround() {
    const geo = new THREE.PlaneGeometry(200, 200);
    const mat = new THREE.MeshStandardMaterial({ color: 0x4a8c3f, roughness: 0.9 });
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = '__ground';
    this.scene.add(ground);

    const grid = new THREE.GridHelper(200, 200, 0x3a7c2f, 0x3a7c2f);
    grid.position.y = 0.02;
    grid.material.opacity = 0.3;
    grid.material.transparent = true;
    this.scene.add(grid);

    const axX = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0.1, 0), 10, 0xff0000
    );
    const axZ = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0.1, 0), 10, 0x0000ff
    );
    this.scene.add(axX);
    this.scene.add(axZ);
  }

  /* ═══════════════ PLAYER REFERENCE ═══════════════ */

  _initPlayerRef() {
    const group = new THREE.Group();
    group.name = '__playerRef';

    // Body (matches Player.js)
    const bodyGeo = new THREE.BoxGeometry(0.6, 0.9, 0.4);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x336699 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.75;
    body.castShadow = true;
    group.add(body);

    // Head
    const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffcc88 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.45;
    head.castShadow = true;
    group.add(head);

    // Gun arm
    const gunGeo = new THREE.BoxGeometry(0.15, 0.15, 0.7);
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const gun = new THREE.Mesh(gunGeo, gunMat);
    gun.position.set(0.4, 0.8, 0.2);
    group.add(gun);

    // 1-unit scale pole (red)
    const poleMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const poleGeo = new THREE.CylinderGeometry(0.02, 0.02, 1, 8);
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(1.2, 0.5, 0);
    group.add(pole);
    // Tick marks at 0 and 1 unit
    const tickGeo = new THREE.BoxGeometry(0.3, 0.02, 0.02);
    const tick0 = new THREE.Mesh(tickGeo, poleMat);
    tick0.position.set(1.2, 0, 0);
    group.add(tick0);
    const tick1 = new THREE.Mesh(tickGeo.clone(), poleMat);
    tick1.position.set(1.2, 1, 0);
    group.add(tick1);

    // "1m" label (sprite)
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ff0000';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('1 unit', 4, 22);
    const tex = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: tex });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(1.2, 0.6, 1);
    sprite.position.set(1.2, 1.3, 0);
    group.add(sprite);

    this._playerRefMesh = group;
    this._playerRefVisible = true;
    this.scene.add(group);
  }

  _togglePlayerRef() {
    this._playerRefVisible = !this._playerRefVisible;
    this._playerRefMesh.visible = this._playerRefVisible;
    const btn = document.getElementById('ed-player-ref');
    if (btn) btn.classList.toggle('active', this._playerRefVisible);
  }

  /* ═══════════════ THUMBNAIL RENDERER ═══════════════ */

  _initThumbnailRenderer() {
    this._thumbRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this._thumbRenderer.setSize(64, 64);
    this._thumbRenderer.setClearColor(0x000000, 0);

    this._thumbScene = new THREE.Scene();
    this._thumbScene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(2, 3, 2);
    this._thumbScene.add(dir);

    this._thumbCamera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
  }

  _renderThumbnail(name) {
    if (this._thumbnailCache[name]) return this._thumbnailCache[name];

    const data = this._getModel(name);
    if (!data) return null;

    const model = data.scene;

    // Compute bounds and center the model at origin
    const box = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const size = new THREE.Vector3();
    box.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim === 0) return null;

    // Normalize to fit in ~2 unit cube
    const s = 2 / maxDim;
    model.scale.multiplyScalar(s);
    model.position.set(-center.x * s, -center.y * s, -center.z * s);

    // Remove previous model from thumb scene (keep lights at index 0,1)
    while (this._thumbScene.children.length > 2) {
      this._thumbScene.remove(this._thumbScene.children[2]);
    }
    this._thumbScene.add(model);

    // Camera at isometric angle
    this._thumbCamera.position.set(2.5, 2.0, 2.5);
    this._thumbCamera.lookAt(0, 0.2, 0);

    this._thumbRenderer.render(this._thumbScene, this._thumbCamera);
    const url = this._thumbRenderer.domElement.toDataURL('image/png');

    this._thumbScene.remove(model);
    this._thumbnailCache[name] = url;
    return url;
  }

  /* ═══════════════ MODEL HELPERS ═══════════════ */

  _getModel(name) {
    if (this.assets && this.assets.models[name]) {
      return this.assets.getModel(name);
    }
    const imp = this.imported[name];
    if (!imp) return null;
    return {
      scene: imp.scene.clone(),
      size: imp.size.clone(),
      box: imp.box.clone()
    };
  }

  _defaultScale(name, data) {
    // Handle road-* prefixed names (road-road-straight, road-light-curved, etc.)
    let prefix;
    if (name.startsWith('road-road-') || name.startsWith('road-road-')) {
      prefix = 'road';
    } else if (name.startsWith('road-light-')) {
      prefix = 'light';
    } else if (name.startsWith('road-sign-')) {
      prefix = 'sign';
    } else if (name.startsWith('road-construction-')) {
      prefix = 'construction';
    } else if (name.startsWith('road-bridge-')) {
      prefix = 'bridge';
    } else if (name.startsWith('road-tile-')) {
      prefix = 'tile';
    } else {
      prefix = name.split('-')[0];
    }
    const def = DEFAULT_SIZES[prefix];
    if (!def) return 1;
    const d = data.size[def.dim];
    return d > 0 ? def.value / d : 1;
  }

  _snapVal(v) {
    return this.snap ? Math.round(v / this.snapSize) * this.snapSize : v;
  }

  /* ═══════════════ RAYCASTING ═══════════════ */

  _groundPos(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const my = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.ray.setFromCamera({ x: mx, y: my }, this.camera);
    return this.ray.ray.intersectPlane(this.groundPlane, this._pt)
      ? this._pt.clone() : null;
  }

  _pickObject(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const my = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.ray.setFromCamera({ x: mx, y: my }, this.camera);
    for (let i = this.placed.length - 1; i >= 0; i--) {
      const obj = this.placed[i];
      if (this.ray.intersectObject(obj.mesh, true).length > 0) return obj;
    }
    return null;
  }

  /* ═══════════════ UI ═══════════════ */

  _initUI() {
    this.ui = document.createElement('div');
    this.ui.id = 'editor-ui';
    this.container.appendChild(this.ui);
    this._buildToolbar();
    this._buildPalette();
    this._buildProperties();
    this._buildDropZone();
  }

  _buildToolbar() {
    const bar = document.createElement('div');
    bar.id = 'ed-toolbar';
    bar.innerHTML = `
      <div class="ed-tool-group">
        <button id="ed-tool-place" class="ed-btn active" title="Place tool (P)">Place</button>
        <button id="ed-tool-select" class="ed-btn" title="Select tool (V)">Select</button>
        <span class="ed-sep"></span>
        <button id="ed-rotate" class="ed-btn" title="Rotate 45° (R)">Rot</button>
        <button id="ed-delete" class="ed-btn" title="Delete (Del)">Del</button>
        <button id="ed-dup" class="ed-btn" title="Duplicate (Ctrl+D)">Dup</button>
        <span class="ed-sep"></span>
        <button id="ed-snap" class="ed-btn active" title="Toggle grid snap (G)">Snap: ON</button>
        <button id="ed-player-ref" class="ed-btn active" title="Toggle player scale reference (T)">Player</button>
        <span id="ed-coords" class="ed-coords">X: 0  Z: 0</span>
        <span id="ed-rot-display" class="ed-coords"></span>
      </div>
      <div class="ed-tool-group">
        <button id="ed-generate" class="ed-btn" style="color:#fa0;border-color:rgba(255,170,0,0.4);background:rgba(255,170,0,0.1)" title="Generate a suburban neighborhood">Generate</button>
        <button id="ed-clear" class="ed-btn ed-btn-red" title="Clear all objects">Clear</button>
        <span class="ed-sep"></span>
        <button id="ed-save" class="ed-btn">Save</button>
        <button id="ed-load" class="ed-btn">Load</button>
        <button id="ed-import" class="ed-btn">Import GLB</button>
        <span class="ed-sep"></span>
        <button id="ed-back" class="ed-btn ed-btn-red">Back</button>
      </div>
    `;
    this.ui.appendChild(bar);

    bar.querySelector('#ed-tool-place').onclick = () => this._setTool('place');
    bar.querySelector('#ed-tool-select').onclick = () => this._setTool('select');
    bar.querySelector('#ed-rotate').onclick = () => this._rotateAction();
    bar.querySelector('#ed-delete').onclick = () => this._deleteSel();
    bar.querySelector('#ed-dup').onclick = () => this._duplicateSel();
    bar.querySelector('#ed-snap').onclick = () => this._toggleSnap();
    bar.querySelector('#ed-player-ref').onclick = () => this._togglePlayerRef();
    bar.querySelector('#ed-generate').onclick = () => {
      if (this.placed.length > 0 && !confirm('This will replace all objects. Continue?')) return;
      this._generateWorld();
    };
    bar.querySelector('#ed-clear').onclick = () => {
      if (this.placed.length === 0) return;
      if (!confirm('Clear all placed objects?')) return;
      this._clearAll();
    };
    bar.querySelector('#ed-save').onclick = () => this._saveLevel();
    bar.querySelector('#ed-load').onclick = () => this._loadLevel();
    bar.querySelector('#ed-import').onclick = () => this._openImport();
    bar.querySelector('#ed-back').onclick = () => this._goBack();
  }

  _buildPalette() {
    const panel = document.createElement('div');
    panel.id = 'ed-palette';
    this.ui.appendChild(panel);
    this.paletteEl = panel;
    this._refreshPalette();
  }

  _refreshPalette() {
    const panel = this.paletteEl;
    panel.innerHTML = '<div class="ed-palette-title">ASSETS</div>';

    const cats = {
      'Roads - Straight': [],
      'Roads - Curves': [],
      'Roads - Intersections': [],
      'Roads - Special': [],
      'Roads - Ramps': [],
      'Traffic Lights': [],
      'Signs': [],
      'Construction': [],
      'Bridges': [],
      'Tiles': [],
      'Buildings': [],
      'Cars': [],
      'Trees': [],
      'Fences': [],
      'Paths': [],
      'Props': [],
    };

    if (this.assets) {
      for (const name of Object.keys(this.assets.models)) {
        // Road categories
        if (name.startsWith('road-road-straight') || name === 'road-road-side' || name === 'road-road-side-barrier' ||
            name === 'road-road-end' || name === 'road-road-end-barrier' || name === 'road-road-end-round' ||
            name === 'road-road-end-round-barrier' || name === 'road-road-square' || name === 'road-road-square-barrier' ||
            name === 'road-road-crossing' || name === 'road-road-driveway-single' || name === 'road-road-driveway-single-barrier' ||
            name === 'road-road-driveway-double' || name === 'road-road-driveway-double-barrier') {
          cats['Roads - Straight'].push(name);
        } else if (name.startsWith('road-road-bend') || name.startsWith('road-road-curve')) {
          cats['Roads - Curves'].push(name);
        } else if (name.startsWith('road-road-crossroad') || name.startsWith('road-road-intersection') ||
                   name.startsWith('road-road-split') || name.startsWith('road-road-roundabout') ||
                   name.startsWith('road-road-side-entry') || name.startsWith('road-road-side-exit')) {
          cats['Roads - Intersections'].push(name);
        } else if (name.startsWith('road-road-bridge')) {
          cats['Roads - Special'].push(name);
        } else if (name.startsWith('road-road-slant')) {
          cats['Roads - Ramps'].push(name);
        } else if (name.startsWith('road-light-')) {
          cats['Traffic Lights'].push(name);
        } else if (name.startsWith('road-sign-')) {
          cats['Signs'].push(name);
        } else if (name.startsWith('road-construction-')) {
          cats['Construction'].push(name);
        } else if (name.startsWith('road-bridge-')) {
          cats['Bridges'].push(name);
        } else if (name.startsWith('road-tile-')) {
          cats['Tiles'].push(name);
        }
        // Original categories
        else if (name.startsWith('building-')) cats['Buildings'].push(name);
        else if (name.startsWith('car-')) cats['Cars'].push(name);
        else if (name.startsWith('tree-')) cats['Trees'].push(name);
        else if (name.startsWith('fence')) cats['Fences'].push(name);
        else if (name.startsWith('path-') || name.startsWith('driveway-')) cats['Paths'].push(name);
        else cats['Props'].push(name);
      }
    }

    const impNames = Object.keys(this.imported);
    if (impNames.length > 0) cats['Imported'] = impNames;

    for (const [catName, items] of Object.entries(cats)) {
      if (items.length === 0) continue;

      const section = document.createElement('div');
      section.className = 'ed-cat';

      const header = document.createElement('div');
      header.className = 'ed-cat-header';
      header.textContent = `${catName} (${items.length})`;
      header.onclick = () => {
        list.style.display = list.style.display === 'none' ? 'block' : 'none';
        header.classList.toggle('collapsed');
      };
      section.appendChild(header);

      const list = document.createElement('div');
      list.className = 'ed-cat-list';

      for (const name of items.sort()) {
        const item = document.createElement('div');
        item.className = 'ed-asset-item';
        if (name === this.activeName) item.classList.add('active');

        // Thumbnail
        const thumb = this._renderThumbnail(name);
        if (thumb) {
          const img = document.createElement('img');
          img.className = 'ed-thumb';
          img.src = thumb;
          item.appendChild(img);
        }

        const label = document.createElement('span');
        label.textContent = name;
        item.appendChild(label);

        item.onclick = () => {
          this._selectAsset(name);
          panel.querySelectorAll('.ed-asset-item').forEach(el => el.classList.remove('active'));
          item.classList.add('active');
        };
        list.appendChild(item);
      }

      section.appendChild(list);
      panel.appendChild(section);
    }
  }

  _buildProperties() {
    const panel = document.createElement('div');
    panel.id = 'ed-props';
    panel.style.display = 'none';
    panel.innerHTML = `
      <div class="ed-props-title">PROPERTIES</div>
      <div class="ed-prop-row"><label>Model:</label><span id="ed-prop-name">-</span></div>
      <div class="ed-prop-row"><label>X:</label><input id="ed-prop-x" type="number" step="0.5"></div>
      <div class="ed-prop-row"><label>Z:</label><input id="ed-prop-z" type="number" step="0.5"></div>
      <div class="ed-prop-row"><label>Rot:</label><input id="ed-prop-rot" type="number" step="45"></div>
      <div class="ed-prop-row"><label>Scale:</label><input id="ed-prop-scale" type="number" step="0.1" min="0.1"></div>
    `;
    this.ui.appendChild(panel);
    this.propsEl = panel;

    const onChange = () => this._applyProps();
    panel.querySelector('#ed-prop-x').onchange = onChange;
    panel.querySelector('#ed-prop-z').onchange = onChange;
    panel.querySelector('#ed-prop-rot').onchange = onChange;
    panel.querySelector('#ed-prop-scale').onchange = onChange;
  }

  _buildDropZone() {
    const dz = document.createElement('div');
    dz.id = 'ed-dropzone';
    dz.textContent = 'Drop .glb file here to import';
    dz.style.display = 'none';
    this.ui.appendChild(dz);
    this.dropZone = dz;
  }

  /* ═══════════════ TOOL / SELECTION ═══════════════ */

  _setTool(tool) {
    this.tool = tool;
    document.getElementById('ed-tool-place').classList.toggle('active', tool === 'place');
    document.getElementById('ed-tool-select').classList.toggle('active', tool === 'select');
    if (tool === 'select') this._clearGhost();
    else if (this.activeName) this._createGhost(this.activeName);
    this._updateRotDisplay();
  }

  _toggleSnap() {
    this.snap = !this.snap;
    const btn = document.getElementById('ed-snap');
    btn.textContent = `Snap: ${this.snap ? 'ON' : 'OFF'}`;
    btn.classList.toggle('active', this.snap);
  }

  _selectAsset(name) {
    this.activeName = name;
    this.ghostRotY = 0;
    this._setTool('place');
    this._createGhost(name);
  }

  _updateRotDisplay() {
    const el = document.getElementById('ed-rot-display');
    if (!el) return;
    if (this.tool === 'place' && this.activeName) {
      el.textContent = `Rot: ${Math.round(THREE.MathUtils.radToDeg(this.ghostRotY))}°`;
    } else {
      el.textContent = '';
    }
  }

  /* ═══════════════ GHOST MESH ═══════════════ */

  _createGhost(name) {
    this._clearGhost();
    const data = this._getModel(name);
    if (!data) return;

    const mesh = data.scene;
    const scale = this._defaultScale(name, data);
    mesh.scale.setScalar(scale);
    mesh.rotation.y = this.ghostRotY;

    mesh.traverse(child => {
      if (!child.isMesh) return;
      const makeTransparent = (m) => {
        const c = m.clone();
        c.transparent = true;
        c.opacity = 0.4;
        c.depthWrite = false;
        return c;
      };
      if (Array.isArray(child.material)) {
        child.material = child.material.map(makeTransparent);
      } else {
        child.material = makeTransparent(child.material);
      }
    });

    this.ghost = { mesh, name, scale };
    mesh.visible = false;
    this.scene.add(mesh);
  }

  _clearGhost() {
    if (this.ghost) {
      this.scene.remove(this.ghost.mesh);
      this.ghost = null;
    }
  }

  _updateGhostPos(pos) {
    if (!this.ghost || !pos) return;
    const x = this._snapVal(pos.x);
    const z = this._snapVal(pos.z);
    const mesh = this.ghost.mesh;
    mesh.rotation.y = this.ghostRotY;
    mesh.position.set(0, 0, 0);
    mesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(mesh);
    const cx = (box.min.x + box.max.x) / 2;
    const cz = (box.min.z + box.max.z) / 2;
    mesh.position.set(x - cx, -box.min.y, z - cz);
    mesh.visible = true;
  }

  /* ═══════════════ OBJECT OPERATIONS ═══════════════ */

  _placeObject(name, x, z, rotY = 0, scale = null) {
    const data = this._getModel(name);
    if (!data) return null;

    const s = scale ?? this._defaultScale(name, data);
    const mesh = data.scene;
    mesh.scale.setScalar(s);
    if (rotY) mesh.rotation.y = rotY;

    mesh.position.set(0, 0, 0);
    mesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(mesh);
    const cx = (box.min.x + box.max.x) / 2;
    const cz = (box.min.z + box.max.z) / 2;
    mesh.position.set(x - cx, -box.min.y, z - cz);

    this.scene.add(mesh);
    const obj = { id: ++this._id, name, mesh, x, z, rotationY: rotY, scale: s };
    this.placed.push(obj);
    return obj;
  }

  _repositionObject(obj) {
    const mesh = obj.mesh;
    mesh.scale.setScalar(obj.scale);
    mesh.rotation.y = obj.rotationY;
    mesh.position.set(0, 0, 0);
    mesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(mesh);
    const cx = (box.min.x + box.max.x) / 2;
    const cz = (box.min.z + box.max.z) / 2;
    mesh.position.set(obj.x - cx, -box.min.y, obj.z - cz);
  }

  _select(obj) {
    this._deselect();
    this.selected = obj;
    this.selBox = new THREE.BoxHelper(obj.mesh, 0x00ff00);
    this.scene.add(this.selBox);
    this._updateProps();
    this.propsEl.style.display = 'block';
  }

  _deselect() {
    if (this.selBox) {
      this.scene.remove(this.selBox);
      this.selBox = null;
    }
    this.selected = null;
    this.propsEl.style.display = 'none';
  }

  _updateProps() {
    if (!this.selected) return;
    const o = this.selected;
    document.getElementById('ed-prop-name').textContent = o.name;
    document.getElementById('ed-prop-x').value = o.x.toFixed(1);
    document.getElementById('ed-prop-z').value = o.z.toFixed(1);
    document.getElementById('ed-prop-rot').value = Math.round(THREE.MathUtils.radToDeg(o.rotationY));
    document.getElementById('ed-prop-scale').value = o.scale.toFixed(2);
  }

  _applyProps() {
    if (!this.selected) return;
    const o = this.selected;
    o.x = parseFloat(document.getElementById('ed-prop-x').value) || 0;
    o.z = parseFloat(document.getElementById('ed-prop-z').value) || 0;
    o.rotationY = THREE.MathUtils.degToRad(
      parseFloat(document.getElementById('ed-prop-rot').value) || 0
    );
    o.scale = parseFloat(document.getElementById('ed-prop-scale').value) || 1;
    this._repositionObject(o);
    if (this.selBox) this.selBox.setFromObject(o.mesh);
  }

  /* Rotate: if selected object exists rotate it, otherwise rotate ghost */
  _rotateAction() {
    if (this.selected) {
      this.selected.rotationY += Math.PI / 4;
      this._repositionObject(this.selected);
      if (this.selBox) this.selBox.setFromObject(this.selected.mesh);
      this._updateProps();
    } else if (this.tool === 'place' && this.ghost) {
      this.ghostRotY += Math.PI / 4;
      this.ghost.mesh.rotation.y = this.ghostRotY;
      this._updateRotDisplay();
    }
  }

  _deleteSel() {
    if (!this.selected) return;
    this.scene.remove(this.selected.mesh);
    this.placed = this.placed.filter(o => o !== this.selected);
    this._deselect();
  }

  _duplicateSel() {
    if (!this.selected) return;
    const o = this.selected;
    const dup = this._placeObject(o.name, o.x + 2, o.z + 2, o.rotationY, o.scale);
    if (dup) this._select(dup);
  }

  /* ═══════════════ EVENTS ═══════════════ */

  _bindEvents() {
    this._onMouseDown = this._handleMouseDown.bind(this);
    this._onMouseMove = this._handleMouseMove.bind(this);
    this._onMouseUp = this._handleMouseUp.bind(this);
    this._onKeyDown = this._handleKeyDown.bind(this);
    this._onResize = this._handleResize.bind(this);
    this._onDragOver = this._handleDragOver.bind(this);
    this._onDragLeave = this._handleDragLeave.bind(this);
    this._onDrop = this._handleDrop.bind(this);
    this._onCtxMenu = (e) => e.preventDefault();

    const cvs = this.renderer.domElement;
    cvs.addEventListener('mousedown', this._onMouseDown);
    cvs.addEventListener('mousemove', this._onMouseMove);
    cvs.addEventListener('mouseup', this._onMouseUp);
    cvs.addEventListener('contextmenu', this._onCtxMenu);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('resize', this._onResize);
    cvs.addEventListener('dragover', this._onDragOver);
    cvs.addEventListener('dragleave', this._onDragLeave);
    cvs.addEventListener('drop', this._onDrop);
  }

  _handleMouseDown(e) {
    if (e.button !== 0) return;
    this._mouseStart.x = e.clientX;
    this._mouseStart.y = e.clientY;
    this._dragging = false;

    if (this.tool === 'select') {
      const hit = this._pickObject(e);
      if (hit) {
        this._select(hit);
        this._dragObj = hit;
        const pos = this._groundPos(e);
        if (pos) {
          this._dragStartX = hit.x;
          this._dragStartZ = hit.z;
          this._dragMouseStart = pos.clone();
        }
      } else {
        this._deselect();
        this._dragObj = null;
      }
    }
  }

  _handleMouseMove(e) {
    const pos = this._groundPos(e);

    // Ghost preview
    if (this.tool === 'place' && this.ghost) {
      this._updateGhostPos(pos);
    }

    // Drag-move selected
    if (this.tool === 'select' && this._dragObj && (e.buttons & 1)) {
      const dx = e.clientX - this._mouseStart.x;
      const dy = e.clientY - this._mouseStart.y;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) this._dragging = true;

      if (this._dragging && pos && this._dragMouseStart) {
        this._dragObj.x = this._snapVal(this._dragStartX + pos.x - this._dragMouseStart.x);
        this._dragObj.z = this._snapVal(this._dragStartZ + pos.z - this._dragMouseStart.z);
        this._repositionObject(this._dragObj);
        if (this.selBox) this.selBox.setFromObject(this._dragObj.mesh);
        this._updateProps();
      }
    }

    // Coordinates display
    if (pos) {
      const el = document.getElementById('ed-coords');
      if (el) el.textContent = `X: ${this._snapVal(pos.x).toFixed(0)}  Z: ${this._snapVal(pos.z).toFixed(0)}`;
    }
  }

  _handleMouseUp(e) {
    if (e.button !== 0) return;

    if (this.tool === 'place' && !this._dragging) {
      const pos = this._groundPos(e);
      if (pos && this.activeName) {
        const x = this._snapVal(pos.x);
        const z = this._snapVal(pos.z);
        const obj = this._placeObject(this.activeName, x, z, this.ghostRotY);
        if (obj) this._select(obj);
      }
    }

    this._dragObj = null;
  }

  _handleKeyDown(e) {
    if (e.target.tagName === 'INPUT') return;

    switch (e.key) {
      case 'p': this._setTool('place'); break;
      case 'v': this._setTool('select'); break;
      case 'r': this._rotateAction(); break;
      case 'Delete': case 'Backspace': this._deleteSel(); break;
      case 'g': this._toggleSnap(); break;
      case 't': this._togglePlayerRef(); break;
      case 'Escape':
        this._deselect();
        this._clearGhost();
        this.activeName = null;
        this.ghostRotY = 0;
        this._updateRotDisplay();
        break;
      case 'd':
        if (e.ctrlKey || e.metaKey) { e.preventDefault(); this._duplicateSel(); }
        break;
      case 's':
        if (e.ctrlKey || e.metaKey) { e.preventDefault(); this._saveLevel(); }
        break;
    }
  }

  _handleResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  /* ═══════════════ DRAG & DROP IMPORT ═══════════════ */

  _handleDragOver(e) {
    e.preventDefault();
    this.dropZone.style.display = 'flex';
  }

  _handleDragLeave(e) {
    e.preventDefault();
    this.dropZone.style.display = 'none';
  }

  async _handleDrop(e) {
    e.preventDefault();
    this.dropZone.style.display = 'none';
    for (const file of e.dataTransfer.files) {
      if (file.name.endsWith('.glb') || file.name.endsWith('.gltf')) {
        await this._importFile(file);
      }
    }
  }

  async _importFile(file) {
    const buf = await file.arrayBuffer();
    const loader = new GLTFLoader();
    return new Promise((resolve) => {
      loader.parse(buf, '', (gltf) => {
        const name = 'imp-' + file.name.replace(/\.(glb|gltf)$/i, '');

        gltf.scene.traverse(child => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        const box = new THREE.Box3().setFromObject(gltf.scene);
        const size = new THREE.Vector3();
        box.getSize(size);

        // Store rawData for embedding in save files
        this.imported[name] = { scene: gltf.scene, size, box, rawData: buf };
        this._refreshPalette();
        this._selectAsset(name);
        resolve(name);
      }, (err) => {
        console.warn('Import failed:', err);
        resolve(null);
      });
    });
  }

  /** Import a GLB from raw ArrayBuffer (used when loading embedded models) */
  async _importFromBuffer(name, buf) {
    const loader = new GLTFLoader();
    return new Promise((resolve) => {
      loader.parse(buf, '', (gltf) => {
        gltf.scene.traverse(child => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        const box = new THREE.Box3().setFromObject(gltf.scene);
        const size = new THREE.Vector3();
        box.getSize(size);

        this.imported[name] = { scene: gltf.scene, size, box, rawData: buf };
        resolve(name);
      }, (err) => {
        console.warn('Failed to parse embedded model:', name, err);
        resolve(null);
      });
    });
  }

  _openImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.glb,.gltf';
    input.multiple = true;
    input.onchange = async () => {
      for (const file of input.files) {
        await this._importFile(file);
      }
    };
    input.click();
  }

  /* ═══════════════ GENERATE WORLD ═══════════════ */

  _clearAll() {
    for (const obj of this.placed) this.scene.remove(obj.mesh);
    this.placed = [];
    this._deselect();
  }

  _applyColormap(obj, index) {
    if (!this.assets || this.assets.colormaps.length === 0) return;
    const newMap = this.assets.getColormap(index);
    if (!newMap) return;
    obj.mesh.traverse((child) => {
      if (!child.isMesh) return;
      const swap = (mat) => {
        const m = mat.clone();
        if (m.map) { m.map = newMap; m.needsUpdate = true; }
        return m;
      };
      if (Array.isArray(child.material)) {
        child.material = child.material.map(swap);
      } else {
        child.material = swap(child.material);
      }
    });
  }

  _generateWorld() {
    this._clearAll();

    const T = 4;         // road tile spacing
    const PI = Math.PI;
    const H = PI / 2;

    // Seeded PRNG for reproducible variety
    let seed = 42;
    const rng = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const pick = (arr) => arr[Math.floor(rng() * arr.length)];
    const jit = (v, a = 1) => v + (rng() - 0.5) * a;
    let cmIdx = 0; // colormap rotation index

    const bldgs = [
      'building-a','building-b','building-c','building-d','building-e','building-f',
      'building-g','building-h','building-i','building-j','building-k','building-l',
      'building-m','building-n','building-o','building-p','building-q','building-r',
      'building-s','building-t','building-u',
    ];
    const cars = [
      'car-sedan','car-suv','car-van','car-truck',
      'car-hatchback','car-sedan-sports','car-taxi','car-suv-luxury','car-police',
    ];
    const pathTypes = ['path-short','path-stones-short','path-stones-messy','path-long','path-stones-long'];
    const fenceTypes = ['fence-1x4','fence-1x3','fence-2x3','fence-1x2'];

    // Place building with colormap variation
    const placeHouse = (x, z, rot) => {
      const obj = this._placeObject(pick(bldgs), x, z, rot);
      if (obj) this._applyColormap(obj, cmIdx++);
      return obj;
    };

    // ═══════════ ROAD GRID: 3x3 (roads at x,z = -40, 0, 40) ═══════════
    const roadLines = [-40, 0, 40];
    const isects = new Set();
    for (const rx of roadLines) for (const rz of roadLines) isects.add(`${rx},${rz}`);

    // E-W roads
    for (const z of roadLines) {
      for (let x = -52; x <= 52; x += T) {
        if (isects.has(`${x},${z}`)) continue;
        this._placeObject('road-road-straight', x, z, 0);
      }
    }
    // N-S roads
    for (const x of roadLines) {
      for (let z = -52; z <= 52; z += T) {
        if (isects.has(`${x},${z}`)) continue;
        this._placeObject('road-road-straight', x, z, H);
      }
    }
    // 9 crossroad intersections
    for (const x of roadLines) {
      for (const z of roadLines) {
        this._placeObject('road-road-crossroad', x, z, 0);
      }
    }
    // End caps on all 12 road ends
    for (const z of roadLines) {
      this._placeObject('road-road-end-round', -56, z, 0);
      this._placeObject('road-road-end-round', 56, z, PI);
    }
    for (const x of roadLines) {
      this._placeObject('road-road-end-round', x, -56, H);
      this._placeObject('road-road-end-round', x, 56, -H);
    }

    // ═══════════ 4 SUBURBAN BLOCKS ═══════════
    // Block centers sit between road lines
    const blocks = [
      { cx: -20, cz: -20 },  // NW block
      { cx:  20, cz: -20 },  // NE block
      { cx: -20, cz:  20 },  // SW block
      { cx:  20, cz:  20 },  // SE block
    ];

    for (const { cx, cz } of blocks) {
      // House X offsets within a block (4 per row)
      const hx = [-14, -6, 6, 14];

      // ── HOUSES ──
      // South row (near the higher-z road, faces +Z toward it)
      for (const dx of hx) placeHouse(cx + dx, cz + 14, 0);
      // North row (near the lower-z road, faces -Z toward it)
      for (const dx of hx) placeHouse(cx + dx, cz - 14, PI);

      // ── FENCES in front of houses ──
      for (const dx of hx) {
        this._placeObject(pick(fenceTypes), cx + dx, cz + 10);
        this._placeObject(pick(fenceTypes), cx + dx, cz - 10);
      }

      // ── DRIVEWAYS ──
      for (const dx of hx) {
        this._placeObject(pick(['driveway-long', 'driveway-short']), cx + dx + 2, cz + 9, 0);
        this._placeObject(pick(['driveway-long', 'driveway-short']), cx + dx + 2, cz - 9, PI);
      }

      // ── WALKWAY PATHS ──
      for (const dx of hx) {
        this._placeObject(pick(pathTypes), cx + dx, cz + 10);
        this._placeObject(pick(pathTypes), cx + dx, cz - 10);
      }

      // ── CARS: driveways (60% chance) + street parking ──
      for (const dx of hx) {
        if (rng() > 0.4) this._placeObject(pick(cars), cx + dx + 2, cz + 9, 0);
        if (rng() > 0.4) this._placeObject(pick(cars), cx + dx + 2, cz - 9, PI);
      }
      // Random street parked cars
      for (let i = 0; i < 2; i++) {
        const px = cx + jit(0, 24);
        const side = rng() > 0.5;
        this._placeObject(pick(cars), px, cz + (side ? 19 : -19), side ? H : -H);
      }

      // ── TREES: sidewalk + backyard ──
      // Sidewalk trees near south road edge
      for (let dx = -16; dx <= 16; dx += 6) {
        this._placeObject(pick(['tree-large', 'tree-small']), cx + jit(dx, 1), cz + 6);
      }
      // Sidewalk trees near north road edge
      for (let dx = -16; dx <= 16; dx += 6) {
        this._placeObject(pick(['tree-large', 'tree-small']), cx + jit(dx, 1), cz - 6);
      }
      // Backyard trees (random scatter behind houses)
      for (let i = 0; i < 6; i++) {
        const tx = cx + jit(0, 24);
        const tz = rng() > 0.5 ? cz + jit(18, 3) : cz - jit(18, 3);
        this._placeObject(pick(['tree-large', 'tree-small']), tx, tz);
      }

      // ── PLANTERS ──
      for (const dx of [-10, 10]) {
        if (rng() > 0.3) this._placeObject('planter', cx + dx, cz + 12);
        if (rng() > 0.3) this._placeObject('planter', cx + dx, cz - 12);
      }
    }

    // ═══════════ TREES ALONG N-S ROADS ═══════════
    for (const x of roadLines) {
      for (let z = -36; z <= 36; z += 6) {
        // Skip near intersections
        if (roadLines.some(rz => Math.abs(z - rz) < 6)) continue;
        this._placeObject(pick(['tree-large', 'tree-small']), x - 5, jit(z, 1));
        this._placeObject(pick(['tree-large', 'tree-small']), x + 5, jit(z, 1));
      }
    }

    // ═══════════ TRAFFIC INFRASTRUCTURE ═══════════
    // Traffic lights at each intersection
    for (const x of roadLines) {
      for (const z of roadLines) {
        this._placeObject('road-light-square', x + 5, z - 5, 0);
        this._placeObject('road-light-square', x - 5, z + 5, PI);
      }
    }

    // Road signs at neighborhood entries
    this._placeObject('road-sign-highway', -54, -38, H);
    this._placeObject('road-sign-highway', 54, 38, -H);
    this._placeObject('road-sign-highway-detailed', -54, 2, H);
    this._placeObject('road-sign-highway-wide', 54, -2, -H);
    this._placeObject('road-sign-highway', -38, -54, 0);
    this._placeObject('road-sign-highway', 38, 54, PI);

    // ═══════════ FLAVOR: CONSTRUCTION, CONES ═══════════
    // Construction zone on west entry
    this._placeObject('road-construction-cone', -50, -38);
    this._placeObject('road-construction-cone', -50, -42);
    this._placeObject('road-construction-barrier', -52, -40, H);
    this._placeObject('road-construction-light', -52, -38);
    // A few random cones near intersections
    this._placeObject('road-construction-cone', 42, 2);
    this._placeObject('road-construction-cone', -2, 42);
  }

  /* ═══════════════ SAVE / LOAD ═══════════════ */

  /* Base64 helpers */
  _arrayBufferToBase64(buf) {
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  _base64ToArrayBuffer(b64) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }

  _saveLevel() {
    // Collect embedded GLB data for imported models that are actually used
    const embeddedModels = {};
    for (const obj of this.placed) {
      if (obj.name.startsWith('imp-') && this.imported[obj.name]) {
        if (!embeddedModels[obj.name]) {
          const raw = this.imported[obj.name].rawData;
          if (raw) embeddedModels[obj.name] = this._arrayBufferToBase64(raw);
        }
      }
    }

    const hasEmbedded = Object.keys(embeddedModels).length > 0;
    const data = {
      version: 2,
      objects: this.placed.map(o => ({
        model: o.name,
        x: Math.round(o.x * 10) / 10,
        z: Math.round(o.z * 10) / 10,
        rotationY: Math.round(o.rotationY * 1000) / 1000,
        scale: Math.round(o.scale * 100) / 100
      }))
    };
    if (hasEmbedded) data.embeddedModels = embeddedModels;

    const json = JSON.stringify(data, null, 2);
    const sizeMB = (json.length / 1024 / 1024).toFixed(1);
    console.log(`Level saved: ${data.objects.length} objects, ${Object.keys(embeddedModels).length} embedded models, ${sizeMB} MB`);

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'level.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  _loadLevel() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        await this._loadLevelData(data);
      } catch (err) {
        console.error('Failed to load level:', err);
      }
    };
    input.click();
  }

  async _loadLevelData(data) {
    for (const obj of this.placed) this.scene.remove(obj.mesh);
    this.placed = [];
    this._deselect();

    // Restore embedded GLB models first
    if (data.embeddedModels) {
      const names = Object.keys(data.embeddedModels);
      console.log(`Loading ${names.length} embedded model(s)...`);
      for (const [name, b64] of Object.entries(data.embeddedModels)) {
        if (!this.imported[name] && !(this.assets && this.assets.models[name])) {
          const buf = this._base64ToArrayBuffer(b64);
          await this._importFromBuffer(name, buf);
        }
      }
      this._refreshPalette();
    }

    if (data.objects) {
      for (const o of data.objects) {
        this._placeObject(o.model, o.x, o.z, o.rotationY || 0, o.scale || null);
      }
    }
  }

  /* ═══════════════ BACK TO MENU ═══════════════ */

  _goBack() {
    this._running = false;

    const cvs = this.renderer.domElement;
    cvs.removeEventListener('mousedown', this._onMouseDown);
    cvs.removeEventListener('mousemove', this._onMouseMove);
    cvs.removeEventListener('mouseup', this._onMouseUp);
    cvs.removeEventListener('contextmenu', this._onCtxMenu);
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('resize', this._onResize);
    cvs.removeEventListener('dragover', this._onDragOver);
    cvs.removeEventListener('dragleave', this._onDragLeave);
    cvs.removeEventListener('drop', this._onDrop);

    this.controls.dispose();
    this.renderer.dispose();
    this._thumbRenderer.dispose();
    this.container.removeChild(cvs);
    if (this.ui) this.ui.remove();

    // Restore game canvas and HUD visibility
    const gameCanvas = document.querySelector('#game-container > canvas');
    if (gameCanvas) gameCanvas.style.display = '';
    document.getElementById('hud').style.display = '';

    document.getElementById('loading-screen').style.display = 'flex';
    document.body.style.cursor = '';
  }

  /* ═══════════════ RENDER LOOP ═══════════════ */

  _loop() {
    if (!this._running) return;
    requestAnimationFrame(() => this._loop());
    this.controls.update();
    if (this.selBox && this.selected) {
      this.selBox.setFromObject(this.selected.mesh);
    }
    this.renderer.render(this.scene, this.camera);
  }
}
