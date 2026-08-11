import { IMG } from "./../../constants";

export const SectorType = {
  Path: 0,
  Edge: 1,
};

export const SectorVisibility = {
  Hidden: "hidden",
  Seen: "seen",
  Visited: "visited",
};

function hexTileKey(sectorType) {
  switch (sectorType) {
    case SectorType.Path:
      return IMG.hexTilePath;
    case SectorType.Edge:
      return IMG.hexTileEdge;
    default:
      throw new Error(`Invalid sector type: ${sectorType}`);
  }
}

export class Sector {
  constructor(scene, cc, sectorType) {
    this.scene = scene;
    this.cc = cc;
    this.sectorType = sectorType;
    this.visibility = SectorVisibility.Hidden;

    const pos = cc.getCoordPosition();

    this.sprite = this.scene.make.sprite({
      x: pos.x,
      y: pos.y,
      key: hexTileKey(sectorType),
      add: false,
    });

    this.sprite.cc = cc;
    this.sprite.setInteractive({ useHandCursor: true });
    this.sprite.setAlpha(0);
  }

  getSprite() {
    return this.sprite;
  }

  setHidden() {
    this.visibility = SectorVisibility.Hidden;
    this.sprite.setAlpha(0);
  }

  setSeen() {
    this.visibility = SectorVisibility.Seen;
    this.sprite.setAlpha(0.65);
  }

  setVisited() {
    this.visibility = SectorVisibility.Visited;
    this.sprite.setAlpha(0.8);
  }

  setOccupied() {
    this.visibility = SectorVisibility.Visited;
    this.sprite.setAlpha(1.0);
  }

  destroy() {
    if (this.sprite) {
      this.sprite.destroy();
      this.sprite = null;
    }
  }
}
