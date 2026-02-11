import { SpatialGrid } from '../utils/SpatialGrid.js';

export class CollisionSystem {
  constructor() {
    this.staticObjects = [];  // Buildings, parked cars etc (AABB)
    this.grid = new SpatialGrid(5);
  }

  addStatic(obj) {
    // obj: { min: {x,z}, max: {x,z}, type: string, ref: any }
    this.staticObjects.push(obj);
  }

  clearStatics() {
    this.staticObjects.length = 0;
  }

  // AABB point test
  pointInAABB(px, pz, box) {
    return px >= box.min.x && px <= box.max.x && pz >= box.min.z && pz <= box.max.z;
  }

  // Circle vs AABB
  circleAABB(cx, cz, radius, box) {
    const closestX = Math.max(box.min.x, Math.min(cx, box.max.x));
    const closestZ = Math.max(box.min.z, Math.min(cz, box.max.z));
    const dx = cx - closestX;
    const dz = cz - closestZ;
    return (dx * dx + dz * dz) <= (radius * radius);
  }

  // Resolve player against statics, returns corrected position
  resolvePlayerStatic(px, pz, radius) {
    let rx = px, rz = pz;

    for (const box of this.staticObjects) {
      if (!this.circleAABB(rx, rz, radius, box)) continue;

      // Push out of AABB
      const closestX = Math.max(box.min.x, Math.min(rx, box.max.x));
      const closestZ = Math.max(box.min.z, Math.min(rz, box.max.z));
      const dx = rx - closestX;
      const dz = rz - closestZ;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < 0.001) {
        // Inside the box — push towards nearest edge
        const dLeft = rx - box.min.x;
        const dRight = box.max.x - rx;
        const dTop = rz - box.min.z;
        const dBottom = box.max.z - rz;
        const minD = Math.min(dLeft, dRight, dTop, dBottom);
        if (minD === dLeft) rx = box.min.x - radius;
        else if (minD === dRight) rx = box.max.x + radius;
        else if (minD === dTop) rz = box.min.z - radius;
        else rz = box.max.z + radius;
      } else {
        const overlap = radius - dist;
        rx += (dx / dist) * overlap;
        rz += (dz / dist) * overlap;
      }
    }

    return { x: rx, z: rz };
  }

  // Check projectile against statics. Returns first hit or null
  projectileVsStatics(px, pz) {
    for (const box of this.staticObjects) {
      if (this.pointInAABB(px, pz, box)) {
        return box;
      }
    }
    return null;
  }

  // Circle vs circle
  circleVsCircle(x1, z1, r1, x2, z2, r2) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const dist2 = dx * dx + dz * dz;
    const rSum = r1 + r2;
    return dist2 <= rSum * rSum;
  }
}
