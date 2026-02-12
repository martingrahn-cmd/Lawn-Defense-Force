import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class AssetLoader {
  constructor() {
    this.loader = new GLTFLoader();
    this.textureLoader = new THREE.TextureLoader();
    this.models = {};
    this.colormaps = [];  // loaded colormap variations
  }

  async loadAll(onProgress) {
    const basePath = import.meta.env.BASE_URL + 'models/';

    // Load colormap texture variations
    const colormapFiles = [
      'Textures/colormap.png',
      'Textures/variation-a.png',
      'Textures/variation-b.png',
      'Textures/variation-c.png',
    ];
    const texPromises = colormapFiles.map((file) =>
      new Promise((resolve) => {
        this.textureLoader.load(
          basePath + file,
          (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.flipY = false; // GLB textures are not flipped
            resolve(tex);
          },
          undefined,
          () => resolve(null)
        );
      })
    );
    this.colormaps = (await Promise.all(texPromises)).filter(Boolean);

    const modelList = {
      // Buildings (21 types)
      'building-a': 'building-type-a.glb',
      'building-b': 'building-type-b.glb',
      'building-c': 'building-type-c.glb',
      'building-d': 'building-type-d.glb',
      'building-e': 'building-type-e.glb',
      'building-f': 'building-type-f.glb',
      'building-g': 'building-type-g.glb',
      'building-h': 'building-type-h.glb',
      'building-i': 'building-type-i.glb',
      'building-j': 'building-type-j.glb',
      'building-k': 'building-type-k.glb',
      'building-l': 'building-type-l.glb',
      'building-m': 'building-type-m.glb',
      'building-n': 'building-type-n.glb',
      'building-o': 'building-type-o.glb',
      'building-p': 'building-type-p.glb',
      'building-q': 'building-type-q.glb',
      'building-r': 'building-type-r.glb',
      'building-s': 'building-type-s.glb',
      'building-t': 'building-type-t.glb',
      'building-u': 'building-type-u.glb',
      // Trees
      'tree-large': 'tree-large.glb',
      'tree-small': 'tree-small.glb',
      // Fences
      'fence': 'fence.glb',
      'fence-low': 'fence-low.glb',
      'fence-1x2': 'fence-1x2.glb',
      'fence-1x3': 'fence-1x3.glb',
      'fence-1x4': 'fence-1x4.glb',
      'fence-2x2': 'fence-2x2.glb',
      'fence-2x3': 'fence-2x3.glb',
      'fence-3x2': 'fence-3x2.glb',
      'fence-3x3': 'fence-3x3.glb',
      // Driveways
      'driveway-long': 'driveway-long.glb',
      'driveway-short': 'driveway-short.glb',
      // Paths
      'path-long': 'path-long.glb',
      'path-short': 'path-short.glb',
      'path-stones-long': 'path-stones-long.glb',
      'path-stones-short': 'path-stones-short.glb',
      'path-stones-messy': 'path-stones-messy.glb',
      // Props
      'planter': 'planter.glb',
      // Cars
      'car-sedan': 'cars/sedan.glb',
      'car-sedan-sports': 'cars/sedan-sports.glb',
      'car-suv': 'cars/suv.glb',
      'car-suv-luxury': 'cars/suv-luxury.glb',
      'car-hatchback': 'cars/hatchback-sports.glb',
      'car-van': 'cars/van.glb',
      'car-truck': 'cars/truck.glb',
      'car-taxi': 'cars/taxi.glb',
      'car-police': 'cars/police.glb',
    };

    const total = Object.keys(modelList).length;
    let loaded = 0;

    const promises = Object.entries(modelList).map(([name, file]) => {
      return new Promise((resolve) => {
        this.loader.load(
          basePath + file,
          (gltf) => {
            // Enable shadows on all child meshes
            gltf.scene.traverse((child) => {
              if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });

            // Compute bounding box of original model
            const box = new THREE.Box3().setFromObject(gltf.scene);
            const size = new THREE.Vector3();
            box.getSize(size);

            this.models[name] = {
              scene: gltf.scene,
              size,
              box
            };

            loaded++;
            if (onProgress) onProgress(loaded, total);
            resolve();
          },
          undefined,
          (error) => {
            console.warn(`Failed to load model ${name}:`, error);
            loaded++;
            if (onProgress) onProgress(loaded, total);
            resolve();
          }
        );
      });
    });

    await Promise.all(promises);
  }

  getModel(name) {
    const data = this.models[name];
    if (!data) return null;
    return {
      scene: data.scene.clone(),
      size: data.size.clone(),
      box: data.box.clone()
    };
  }

  getColormap(index) {
    if (this.colormaps.length === 0) return null;
    return this.colormaps[index % this.colormaps.length];
  }
}
