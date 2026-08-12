const SIZE = 70;
const RADIUS = 24;
const DENSITY = 0.7;
const DEAD_END_PROB = 0.4;

const DIRECTIONS = [
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: -1 },
  { q: 0, r: 1 },
  { q: 1, r: -1 },
  { q: 1, r: 0 },
];

function cubeToOffset(q, r) {
  return { col: q + (r - (r & 1)) / 2, row: r };
}

function offsetToCube(col, row) {
  return { q: col - (row - (row & 1)) / 2, r: row };
}

function offsetToPixel(col, row) {
  return {
    x: col + (row % 2 === 1 ? 0.5 : 0),
    y: row * 0.75,
  };
}

function euclideanDistance(oc1, oc2) {
  const p1 = offsetToPixel(oc1.col, oc1.row);
  const p2 = offsetToPixel(oc2.col, oc2.row);
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function hexDistance(a, b) {
  const sa = -a.q - a.r;
  const sb = -b.q - b.r;
  return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(sa - sb)) / 2;
}

function sectorKey(q, r) {
  return `${q},${r}`;
}

function neighbors(q, r) {
  return DIRECTIONS.map((d) => ({ q: q + d.q, r: r + d.r }));
}

function onGrid(q, r, isPath, midOc) {
  const inset = isPath ? 1 : 0;
  const oc = cubeToOffset(q, r);
  if (oc.row > SIZE - inset || oc.row < inset) return false;
  if (oc.col > SIZE - inset || oc.col < inset) return false;
  return euclideanDistance(midOc, oc) <= RADIUS - inset;
}

function targetToFill(midOc, midCube) {
  let count = 0;
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const cc = offsetToCube(col, row);
      if (onGrid(cc.q, cc.r, true, midOc)) count++;
    }
  }
  return Math.floor(count * DENSITY);
}

function drunkardsWalk(midCube, midOc) {
  const pathSectors = new Set();
  const deadEndNeighbors = [];

  const isUnvisited = (q, r) => {
    if (deadEndNeighbors.some((n) => n.q === q && n.r === r)) return false;
    if (!onGrid(q, r, true, midOc)) return false;
    return !pathSectors.has(sectorKey(q, r));
  };

  const getUnvisitedNeighbors = (q, r) =>
    neighbors(q, r).filter((n) => isUnvisited(n.q, n.r));

  const getValidCells = () => {
    const result = [];
    for (const k of pathSectors) {
      const [q, r] = k.split(",").map(Number);
      if (getUnvisitedNeighbors(q, r).length > 0) result.push({ q, r });
    }
    return result;
  };

  pathSectors.add(sectorKey(midCube.q, midCube.r));
  let current = { q: midCube.q, r: midCube.r };
  let filledCount = 1;
  const target = targetToFill(midOc, midCube);

  while (filledCount < target) {
    const unvisited = getUnvisitedNeighbors(current.q, current.r);

    if (unvisited.length === 0) {
      const validCells = getValidCells();

      if (validCells.length > 0) {
        validCells.sort(
          (a, b) => hexDistance(current, a) - hexDistance(current, b),
        );
        current = validCells[0];
        continue;
      }

      if (deadEndNeighbors.length > 0) {
        const idx = Math.floor(Math.random() * deadEndNeighbors.length);
        current = deadEndNeighbors.splice(idx, 1)[0];
        pathSectors.add(sectorKey(current.q, current.r));
        filledCount++;
        continue;
      }

      break;
    }

    if (unvisited.length === 5 && Math.random() < DEAD_END_PROB) {
      deadEndNeighbors.push(...unvisited);
      continue;
    }

    const next = unvisited[Math.floor(Math.random() * unvisited.length)];
    pathSectors.add(sectorKey(next.q, next.r));
    current = next;
    filledCount++;
  }

  return pathSectors;
}

function generateEdgeSectors(pathSectors, midOc) {
  const edgeSectors = new Set();
  for (const k of pathSectors) {
    const [q, r] = k.split(",").map(Number);
    for (const n of neighbors(q, r)) {
      if (!onGrid(n.q, n.r, false, midOc)) continue;
      if (pathSectors.has(sectorKey(n.q, n.r))) continue;
      edgeSectors.add(sectorKey(n.q, n.r));
    }
  }
  return edgeSectors;
}

export function generateMap() {
  const midOffset = { col: Math.floor(SIZE / 2), row: Math.floor(SIZE / 2) };
  const midOc = midOffset;
  const midCube = offsetToCube(midOffset.col, midOffset.row);

  const pathKeys = drunkardsWalk(midCube, midOc);
  const edgeKeys = generateEdgeSectors(pathKeys, midOc);

  const pathArr = [...pathKeys];
  const startKey = pathArr[Math.floor(Math.random() * pathArr.length)];
  const [sq, sr] = startKey.split(",").map(Number);

  const sectors = [];
  for (const k of pathKeys) {
    const [q, r] = k.split(",").map(Number);
    sectors.push({ q, r, t: 0 });
  }
  for (const k of edgeKeys) {
    const [q, r] = k.split(",").map(Number);
    sectors.push({ q, r, t: 1 });
  }

  return {
    start: { q: sq, r: sr },
    sectors,
  };
}
