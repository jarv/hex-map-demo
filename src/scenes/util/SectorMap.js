import Phaser from "phaser";

import {
  MAP_AREA,
  HEX_WIDTH,
  HEX_HEIGHT,
  HEX_VERTICAL_OFFSET,
  ZOOM,
  COLORS,
} from "./../../constants";

import { SectorType } from "./Sector";

export class SectorMap {
  constructor(scene, cols, rows, container) {
    this.scene = scene;
    this.rows = rows;
    this.cols = cols;
    this.sectors = new Map();
    this.edgeSectors = new Map();

    this.dragStartTime = 0;
    this.dragThreshold = {
      time: 200,
      distance: 10,
    };
    this.isDragging = false;

    this.isPinching = false;
    this.lastPinchDistance = 0;
    this.startScale = 1;
    this.currentScale = 1;

    this.startPointerPosition = { x: 0, y: 0 };

    this.currentZoom = 1;
    this.minZoom = ZOOM.Min;
    this.maxZoom = ZOOM.Max;

    this.container = container;

    this.onPlayerMove = null;

    this._downWhileActive = false;

    this.setupMask();
    this.setupDragging();
  }

  addSector(sector) {
    const cc = sector.cc;
    const sectorType = sector.sectorType;

    if (this.sectors.has(cc.key)) {
      return this.sectors.get(cc.key);
    }

    if (this.edgeSectors.has(cc.key)) {
      return this.edgeSectors.get(cc.key);
    }

    const sprite = sector.getSprite();

    switch (sectorType) {
      case SectorType.Path:
        this.sectors.set(cc.key, sector);
        break;
      case SectorType.Edge:
        this.edgeSectors.set(cc.key, sector);
        break;
      default:
        throw new Error(`Invalid sector type: ${sectorType}`);
    }

    this.container.add(sprite);
    this.container.sendToBack(sprite);

    return sector;
  }

  setupMask() {
    const mask = this.scene.make.graphics();
    mask.fillStyle(parseInt(COLORS.black.replace("#", "0x"), 16));
    mask.fillRect(MAP_AREA.x, MAP_AREA.y, MAP_AREA.width, MAP_AREA.height);
    const mapMask = mask.createGeometryMask();
    this.container.setMask(mapMask);
  }

  pinchDistance() {
    return Phaser.Math.Distance.Between(
      this.scene.input.pointer1.x,
      this.scene.input.pointer1.y,
      this.scene.input.pointer2.x,
      this.scene.input.pointer2.y,
    );
  }

  setupDragging() {
    this.scene.input.addPointer(1);
    this.container.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, this.pos().width, this.pos().height),
      Phaser.Geom.Rectangle.Contains,
    );

    this.scene.input.on("pointerdown", (pointer) => {
      this._downWhileActive = true;

      if (
        this.scene.input.pointer1.isDown &&
        this.scene.input.pointer2.isDown &&
        !this.isPinching
      ) {
        this.lastPinchDistance = this.pinchDistance();
        this.isPinching = true;
        return;
      }

      this.isDragging = false;
      this.dragStartTime = pointer.downTime;
      this.startPointerPosition.x = pointer.x;
      this.startPointerPosition.y = pointer.y;
    });

    this.scene.input.on("pointermove", (pointer) => {
      if (!pointer.isDown) return;

      if (this.isPinching) {
        const currentPinchDistance = this.pinchDistance();
        const pinchDiff = currentPinchDistance - this.lastPinchDistance;
        if (Math.abs(pinchDiff) < 0.1) return;

        if (pinchDiff > 0) {
          this.zoom(0.02);
        } else {
          this.zoom(-0.02);
        }
        this.lastPinchDistance = currentPinchDistance;
        return;
      }

      const distance = Phaser.Math.Distance.Between(
        this.startPointerPosition.x,
        this.startPointerPosition.y,
        pointer.x,
        pointer.y,
      );

      if (distance > this.dragThreshold.distance) {
        this.isDragging = true;
        const dx = pointer.x - pointer.prevPosition.x;
        const dy = pointer.y - pointer.prevPosition.y;
        this.container.x += dx;
        this.container.y += dy;
      }
    });

    this.scene.input.on("pointerup", () => {
      if (
        this.isPinching &&
        (!this.scene.input.pointer1.isDown || !this.scene.input.pointer2.isDown)
      ) {
        this.isPinching = false;
      }
      this.isDragging = false;
    });

    this.scene.input.on("wheel", (pointer, _over, _dx, dy) => {
      this.zoom(dy < 0 ? 0.02 : -0.02);
    });
  }

  pos() {
    const width = this.cols * HEX_WIDTH * this.currentZoom;
    const height =
      (this.rows * HEX_VERTICAL_OFFSET + HEX_HEIGHT * 0.25) * this.currentZoom;

    return {
      x: this.container.x,
      y: this.container.y,
      width: width,
      height: height,
    };
  }

  zoom(percentDelta) {
    const newZoom = Phaser.Math.Clamp(
      this.currentZoom + percentDelta,
      ZOOM.Min,
      ZOOM.Max,
    );

    if (newZoom === this.currentZoom) return;

    const zoomFactor = newZoom / this.currentZoom;

    const viewCenterX = MAP_AREA.width / 2;
    const viewCenterY = MAP_AREA.y + MAP_AREA.height / 2;

    const viewCenterRelativeX = viewCenterX - this.container.x;
    const viewCenterRelativeY = viewCenterY - this.container.y;

    const newX = viewCenterX - viewCenterRelativeX * zoomFactor;
    const newY = viewCenterY - viewCenterRelativeY * zoomFactor;

    this.container.setScale(newZoom);
    this.container.x = newX;
    this.container.y = newY;
    this.currentZoom = newZoom;

    this.container.input.hitArea.width = this.pos().width;
    this.container.input.hitArea.height = this.pos().height;
  }

  setupClickHandler() {
    this.scene.input.on("gameobjectup", (pointer, gameObject) => {
      if (!this._downWhileActive) return;
      if (this.isDragging || this.isPinching) return;
      if (pointer.upTime - pointer.downTime > 500) return;

      if (this.sectors.has(gameObject?.cc?.key)) {
        if (this.onPlayerMove) {
          this.onPlayerMove(gameObject.cc.q, gameObject.cc.r);
        }
      }
    });
  }
}
