import * as THREE from 'three';

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

export function randomPointInCircle(radius) {
  const angle = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * radius;
  return { x: Math.cos(angle) * r, z: Math.sin(angle) * r };
}

export function distanceSq(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

export function angle2D(from, to) {
  return Math.atan2(to.z - from.z, to.x - from.x);
}

const _raycaster = new THREE.Raycaster();
const _plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _intersection = new THREE.Vector3();

export function mouseToWorld(mouseX, mouseY, camera) {
  const ndc = new THREE.Vector2(
    (mouseX / window.innerWidth) * 2 - 1,
    -(mouseY / window.innerHeight) * 2 + 1
  );
  _raycaster.setFromCamera(ndc, camera);
  _raycaster.ray.intersectPlane(_plane, _intersection);
  return _intersection.clone();
}
