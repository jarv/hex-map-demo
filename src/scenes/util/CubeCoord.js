import { HEX_WIDTH, HEX_VERTICAL_OFFSET } from "./../../constants";

const directions = [
  { q: -1, r: 0, name: "West", angle: -90 },
  { q: -1, r: 1, name: "Southwest", angle: -145 },
  { q: 0, r: -1, name: "Northwest", angle: -35 },
  { q: 0, r: 1, name: "Southeast", angle: 145 },
  { q: 1, r: -1, name: "Northeast", angle: 35 },
  { q: 1, r: 0, name: "East", angle: 90 },
];

export const HEX_DIRECTIONS = directions;

export class CubeCoord {
  constructor(q, r) {
    this.q = q;
    this.r = r;
    this.key = `${this.q},${this.r}`;
  }

  s() {
    return -this.q - this.r;
  }

  static fromOffset(col, row) {
    const q = col - (row - (row & 1)) / 2;
    const r = row;
    return new CubeCoord(q, r);
  }

  getCoordPosition() {
    const pos = this.toOffset();
    const xPos = pos.col * HEX_WIDTH;
    return {
      x: pos.row % 2 === 1 ? xPos + HEX_WIDTH / 2 : xPos,
      y: pos.row * HEX_VERTICAL_OFFSET,
    };
  }

  toOffset() {
    const col = this.q + (this.r - (this.r & 1)) / 2;
    const row = this.r;
    return { col, row };
  }

  getDirection(other) {
    const dq = other.q - this.q;
    const dr = other.r - this.r;
    const ds = other.s() - this.s();
    const maxAbs = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(ds));
    if (maxAbs === 0) return null;
    const normalizedQ = Math.round(dq / maxAbs);
    const normalizedR = Math.round(dr / maxAbs);
    for (const dir of directions) {
      if (dir.q === normalizedQ && dir.r === normalizedR) {
        return dir.angle;
      }
    }
    return null;
  }

  findShortestPath(sectors, dest) {
    const queue = [];
    const cameFrom = new Map();
    const visitedInSearch = new Set();

    queue.push(this);
    visitedInSearch.add(this.key);
    cameFrom.set(this.key, null);

    while (queue.length > 0) {
      const current = queue.shift();

      if (current.q === dest.q && current.r === dest.r) {
        const path = [];
        let currentKey = current.key;
        while (currentKey !== null) {
          const currentNode = sectors.get(currentKey);
          path.unshift(currentNode);
          currentKey = cameFrom.get(currentKey);
        }
        return path;
      }

      for (const dir of directions) {
        const neighborQ = current.q + dir.q;
        const neighborR = current.r + dir.r;
        const neighbor = new CubeCoord(neighborQ, neighborR);

        if (sectors.has(neighbor.key) && !visitedInSearch.has(neighbor.key)) {
          queue.push(neighbor);
          visitedInSearch.add(neighbor.key);
          cameFrom.set(neighbor.key, current.key);
        }
      }
    }

    return null;
  }

  neighbors() {
    return directions.map((dir) => new CubeCoord(this.q + dir.q, this.r + dir.r));
  }
}
