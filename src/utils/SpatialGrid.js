export class SpatialGrid {
  constructor(cellSize = 5) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }

  _key(x, z) {
    const cx = Math.floor(x / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    return `${cx},${cz}`;
  }

  clear() {
    this.cells.clear();
  }

  insert(entity) {
    const key = this._key(entity.position.x, entity.position.z);
    if (!this.cells.has(key)) this.cells.set(key, []);
    this.cells.get(key).push(entity);
  }

  query(x, z, radius) {
    const results = [];
    const minCX = Math.floor((x - radius) / this.cellSize);
    const maxCX = Math.floor((x + radius) / this.cellSize);
    const minCZ = Math.floor((z - radius) / this.cellSize);
    const maxCZ = Math.floor((z + radius) / this.cellSize);
    const r2 = radius * radius;

    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cz = minCZ; cz <= maxCZ; cz++) {
        const cell = this.cells.get(`${cx},${cz}`);
        if (!cell) continue;
        for (const entity of cell) {
          const dx = entity.position.x - x;
          const dz = entity.position.z - z;
          if (dx * dx + dz * dz <= r2) {
            results.push(entity);
          }
        }
      }
    }
    return results;
  }
}
