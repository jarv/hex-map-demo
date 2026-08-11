import Phaser from "phaser";

import { MAP_AREA, WIDTH, HEIGHT, COLORS, IMG } from "./../constants";
import { CubeCoord } from "./util/CubeCoord";
import { Sector, SectorType, SectorVisibility } from "./util/Sector";
import { SectorMap } from "./util/SectorMap";

const START = { q: 2, r: 3 };

const MAP_DATA = {
  sectors: [
    { q: -1, r: 4, t: 0 }, { q: -1, r: 5, t: 0 }, { q: 0, r: 2, t: 0 },
    { q: 0, r: 3, t: 0 }, { q: 0, r: 4, t: 0 }, { q: 0, r: 5, t: 0 },
    { q: 1, r: 1, t: 0 }, { q: 1, r: 2, t: 0 }, { q: 1, r: 3, t: 0 },
    { q: 1, r: 4, t: 0 }, { q: 1, r: 5, t: 0 }, { q: 2, r: 1, t: 0 },
    { q: 2, r: 2, t: 0 }, { q: 2, r: 3, t: 0 }, { q: 2, r: 4, t: 0 },
    { q: 2, r: 5, t: 0 }, { q: 3, r: 1, t: 0 }, { q: 3, r: 2, t: 0 },
    { q: 3, r: 3, t: 0 }, { q: 3, r: 4, t: 0 }, { q: 3, r: 5, t: 0 },
    { q: 4, r: 1, t: 0 }, { q: 4, r: 2, t: 0 }, { q: 4, r: 3, t: 0 },
    { q: 5, r: 1, t: 0 },
    { q: -3, r: 6, t: 1 }, { q: -2, r: 4, t: 1 }, { q: -2, r: 5, t: 1 },
    { q: -2, r: 6, t: 1 }, { q: -1, r: 2, t: 1 }, { q: -1, r: 3, t: 1 },
    { q: -1, r: 6, t: 1 }, { q: 0, r: 0, t: 1 }, { q: 0, r: 1, t: 1 },
    { q: 0, r: 6, t: 1 }, { q: 1, r: 0, t: 1 }, { q: 1, r: 6, t: 1 },
    { q: 2, r: 0, t: 1 }, { q: 2, r: 6, t: 1 }, { q: 3, r: 0, t: 1 },
    { q: 3, r: 6, t: 1 }, { q: 4, r: 0, t: 1 }, { q: 4, r: 4, t: 1 },
    { q: 4, r: 5, t: 1 }, { q: 5, r: 0, t: 1 }, { q: 5, r: 2, t: 1 },
    { q: 5, r: 3, t: 1 }, { q: 6, r: 0, t: 1 }, { q: 6, r: 1, t: 1 },
  ],
};

const TRAVEL_STEP_MS = 180;

export class Game extends Phaser.Scene {
  constructor() {
    super("Game");
    this._travelQueue = [];
    this._travelTimer = null;
    this._traveling = false;
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.background);

    this.mapContainer = this.add.container(0, 0);

    this.sectorMap = new SectorMap(this, 10, 8, this.mapContainer);

    this._buildMap();

    this._playerCC = new CubeCoord(START.q, START.r);

    const startPos = this._playerCC.getCoordPosition();
    this._playerSprite = this.add.sprite(startPos.x, startPos.y, IMG.escapePodBlue);
    this._playerSprite.setScale(0.85);
    this.mapContainer.add(this._playerSprite);

    this._centerMapOnPlayer();

    this._revealAround(this._playerCC);

    this.sectorMap.setupClickHandler();
    this.sectorMap.onPlayerMove = (q, r) => this._onTapSector(q, r);

    this._buildResetButton();
  }

  _buildMap() {
    for (const sd of MAP_DATA.sectors) {
      const cc = new CubeCoord(sd.q, sd.r);
      const sectorType = sd.t === 0 ? SectorType.Path : SectorType.Edge;
      const sector = new Sector(this, cc, sectorType);
      this.sectorMap.addSector(sector);
    }
  }

  _centerMapOnPlayer() {
    const pos = this._playerCC.getCoordPosition();
    this.mapContainer.x = WIDTH / 2 - pos.x;
    this.mapContainer.y = HEIGHT / 2 - pos.y;
  }

  _revealAround(cc) {
    const current = this.sectorMap.sectors.get(cc.key);
    if (current) {
      current.setVisited();
    }

    for (const neighbor of cc.neighbors()) {
      const sector = this.sectorMap.sectors.get(neighbor.key);
      if (sector && sector.visibility === SectorVisibility.Hidden) {
        sector.setSeen();
      }
    }
  }

  _onTapSector(q, r) {
    if (this._traveling) return;

    const dest = new CubeCoord(q, r);
    if (dest.key === this._playerCC.key) return;

    const path = this._playerCC.findShortestPath(this.sectorMap.sectors, dest);
    if (!path || path.length < 2) return;

    this._travelQueue = path.slice(1);
    this._traveling = true;
    this._stepTravel();
  }

  _stepTravel() {
    if (this._travelQueue.length === 0) {
      this._traveling = false;
      return;
    }

    const next = this._travelQueue.shift();
    this._movePlayerTo(next.cc);

    this._travelTimer = this.time.delayedCall(TRAVEL_STEP_MS, () => {
      this._stepTravel();
    });
  }

  _movePlayerTo(cc) {
    this._playerCC = cc;
    const pos = cc.getCoordPosition();
    this._playerSprite.x = pos.x;
    this._playerSprite.y = pos.y;
    this.mapContainer.bringToTop(this._playerSprite);
    this._revealAround(cc);
  }

  _resetMap() {
    if (this._travelTimer) {
      this._travelTimer.remove();
      this._travelTimer = null;
    }
    this._traveling = false;
    this._travelQueue = [];

    for (const sector of this.sectorMap.sectors.values()) {
      sector.setHidden();
    }
    for (const sector of this.sectorMap.edgeSectors.values()) {
      sector.setHidden();
    }

    this._playerCC = new CubeCoord(START.q, START.r);
    const pos = this._playerCC.getCoordPosition();
    this._playerSprite.x = pos.x;
    this._playerSprite.y = pos.y;

    this._centerMapOnPlayer();
    this._revealAround(this._playerCC);
  }

  _buildResetButton() {
    const btnW = 100;
    const btnH = 36;
    const btnX = WIDTH - btnW - 12;
    const btnY = 12;

    const bg = this.add.rectangle(btnX, btnY, btnW, btnH, 0x333333, 0.85);
    bg.setOrigin(0, 0);
    bg.setDepth(100);

    const label = this.add.text(btnX + btnW / 2, btnY + btnH / 2, "Reset", {
      fontSize: "15px",
      color: COLORS.white,
      fontFamily: "monospace",
    });
    label.setOrigin(0.5, 0.5);
    label.setDepth(101);

    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerover", () => bg.setFillStyle(0x555555, 0.95));
    bg.on("pointerout", () => bg.setFillStyle(0x333333, 0.85));
    bg.on("pointerup", () => this._resetMap());
  }
}
